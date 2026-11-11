import {BALL_SPEED,STEP,TAU,seededRandom} from './simulation.js';
import {circleHit} from './circle-hit.js';
import {physicsSettings,royaleSettings} from '../config.js';

const MAX_TICKS=120/STEP;
const SEPARATION=.002;
const GATE_SPEED=1.42;
// Prevent tiny floating-point differences from accumulating into different matches.
const snap=value=>Math.round(value*1e5)/1e5;

export class RoyaleSimulation {
 constructor(seed,settings,{royale,effects=true}={}){
  this.settings=physicsSettings(settings);this.royale=royaleSettings(royale);this.effects=effects;
  this.speed=BALL_SPEED*this.settings.ballSpeed;
  this.halfGap=this.settings.gapAngle*Math.PI/360;this.gapCos=Math.cos(this.halfGap);
  this.padding=this.royale.ballRadius+4;
  this.inner=this.royale.arenaRadius-this.padding;this.outer=this.royale.arenaRadius+this.padding;
  this.reset(seed);
 }

 reset(seed=this.seed){
  this.seed=seed>>>0;this.random=seededRandom(this.seed);this.fxRandom=seededRandom(this.seed^0xe0c40d);
  this.tick=0;this.time=0;this.winner=null;this.finishedAt=null;this.escapedAt=null;
  this.events=[];this.eliminations=[];this.particles=[];this.bounceCount=0;this.contacts=[];
  const count=this.royale.competitors.length,R=this.royale.arenaRadius,radius=this.royale.ballRadius;
  const startAngle=this.random()*TAU;
  const spacing=Math.max(R*.43,(radius+3)/Math.sin(Math.PI/count));
  this.balls=Array.from({length:count},(_,id)=>{
   const angle=startAngle+id/count*TAU;
   const distance=Math.min(this.inner-8,spacing+this.random()*R*.13);
   const heading=this.random()*TAU;
   return {id,x:snap(Math.cos(angle)*distance),y:snap(Math.sin(angle)*distance),radius,
    vx:snap(Math.cos(heading)*this.speed),vy:snap(Math.sin(heading)*this.speed),alive:true,eliminatedAt:null,trail:[]};
  });
  this.ball=this.balls[0];this.remaining=count;this.gate=this.gateAt(0);
  return this;
 }

 gateAt(time){
  const {gateCycle,openPercent,arenaRadius}=this.royale;
  const angle=-2.1+time*GATE_SPEED*this.settings.rotationSpeed*this.settings.direction;
  const opensAt=gateCycle*(1-openPercent/100);
  const open=time%gateCycle>=opensAt;
  const ends=open?[-this.halfGap,this.halfGap].map(offset=>({
   x:snap(arenaRadius*Math.cos(angle+offset)),y:snap(arenaRadius*Math.sin(angle+offset)),
  })):[];
  return {angle,open,ends,axisX:Math.cos(angle),axisY:Math.sin(angle)};
 }

 inGap(x,y){
  const {open,axisX,axisY}=this.gate;
  return open&&x*axisX+y*axisY>this.gapCos*Math.hypot(x,y);
 }

 normalize(ball){
  const speed=Math.hypot(ball.vx,ball.vy);
  if(speed<1e-8){ball.vx=this.speed;ball.vy=0;return;}
  ball.vx*=this.speed/speed;ball.vy*=this.speed/speed;
 }

 queue(type,ball,time,x=ball.x,y=ball.y){
  this.contacts.push({type,ball,time,x,y});
 }

 reflect(ball,nx,ny,wall){
  const dot=ball.vx*nx+ball.vy*ny;
  if(wall){
   const tangent=Math.max(-.99,Math.min(.99,(-ny*ball.vx+nx*ball.vy)/this.speed+(this.random()-.5)*.095));
   const inward=Math.sqrt(1-tangent*tangent);
   ball.vx=this.speed*(-nx*inward-ny*tangent);ball.vy=this.speed*(-ny*inward+nx*tangent);
  }else{
   ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;
  }
 }

 fly(ball){
  const b=ball,innerSquared=this.inner**2;
  const currentSquared=b.x*b.x+b.y*b.y;
  const nextX=b.x+b.vx*STEP,nextY=b.y+b.vy*STEP;
  if(currentSquared<=innerSquared&&nextX*nextX+nextY*nextY<=innerSquared){
   b.x=nextX;b.y=nextY;return;
  }
  if(currentSquared>innerSquared){
   const length=Math.sqrt(currentSquared),nx=b.x/length,ny=b.y/length;
   if(!this.inGap(b.x,b.y)){
    // A ball partly in the doorway when it closes stays in the arena.
    b.x=nx*(this.inner-SEPARATION);b.y=ny*(this.inner-SEPARATION);
    if(b.vx*nx+b.vy*ny>0){
     this.reflect(b,nx,ny,true);this.queue('bounce',b,this.time-STEP);
    }
   }else if(length>=this.outer){
    b.x=nx*this.outer;b.y=ny*this.outer;
    this.queue('escape',b,this.time-STEP);return;
   }
  }
  let left=STEP;
  for(let contact=0;contact<6&&left>1e-8;contact++){
   const ux=b.vx/this.speed,uy=b.vy/this.speed;
   let distance=this.speed*left,hit=null;
   const wall=circleHit(b.x,b.y,ux,uy,this.inner,true);
   if(wall<=distance&&!this.inGap(b.x+ux*wall,b.y+uy*wall)){
    distance=wall;hit={x:0,y:0,wall:true};
   }
   for(const end of this.gate.ends){
    const entry=circleHit(b.x-end.x,b.y-end.y,ux,uy,this.padding);
    if(entry<distance){distance=entry;hit=end;}
   }
   if(this.gate.open){
    const exit=circleHit(b.x,b.y,ux,uy,this.outer,true);
    if(exit<=distance&&this.inGap(b.x+ux*exit,b.y+uy*exit)){
     b.x+=ux*exit;b.y+=uy*exit;
     this.queue('escape',b,this.time-left+exit/this.speed);return;
    }
   }
   b.x+=ux*distance;b.y+=uy*distance;
   if(!hit)return;
   left-=distance/this.speed;
   const x=b.x-hit.x,y=b.y-hit.y,length=Math.hypot(x,y);
   const nx=length?x/length:-ux,ny=length?y/length:-uy;
   this.reflect(b,nx,ny,hit.wall);
   const offset=hit.wall?-SEPARATION:SEPARATION;
   b.x+=nx*offset;b.y+=ny*offset;
   this.queue('bounce',b,this.time-left);
  }
 }

 collide(){
  const balls=this.balls;
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
   const a=balls[i],b=balls[j];
   if(!a.alive||!b.alive)continue;
   const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),overlap=a.radius+b.radius-distance;
   if(overlap<=0)continue;
   const nx=distance?dx/distance:1,ny=distance?dy/distance:0;
   const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
   if(approach>0){
    a.vx-=approach*nx;a.vy-=approach*ny;b.vx+=approach*nx;b.vy+=approach*ny;
    this.normalize(a);this.normalize(b);
    this.emit('bounce',a,this.time,(a.x+b.x)/2,(a.y+b.y)/2);
   }
   const shift=overlap/2+SEPARATION;
   a.x-=shift*nx;a.y-=shift*ny;b.x+=shift*nx;b.y+=shift*ny;
   for(const ball of [a,b]){
    const length=Math.hypot(ball.x,ball.y);
    const limit=this.inGap(ball.x,ball.y)?this.outer-SEPARATION:this.inner-SEPARATION;
    if(length>limit){ball.x*=limit/length;ball.y*=limit/length;}
   }
  }
 }

 emit(type,ball,time,x=ball.x,y=ball.y){
  this.events.push({id:this.events.length,type,time,tick:this.tick,ring:ball.id,note:this.bounceCount,x,y,speed:this.speed});
  if(type==='bounce')this.bounceCount++;
 }

 burst(x,y,owner,time,count,celebration=false){
  if(!this.effects)return;
  for(let i=0;i<count;i++){
   const angle=this.fxRandom()*TAU,speed=celebration?120+this.fxRandom()*510:45+this.fxRandom()*255;
   this.particles.push({x,y,owner,time,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-(celebration?220:0),
    life:(celebration?1.3:.38)+this.fxRandom()*(celebration?1.7:.45),size:3+this.fxRandom()*8,angle});
  }
 }

 eliminate(ball,time,x,y){
  ball.alive=false;ball.eliminatedAt=time;this.remaining--;
  this.eliminations.push({id:ball.id,time});
  this.emit('escape',ball,time,x,y);
  this.burst(x,y,ball.id,time,30);
  if(this.remaining!==1)return;
  const champion=this.balls.find(candidate=>candidate.alive);
  this.winner=champion.id;this.finishedAt=this.escapedAt=time;
  const length=Math.hypot(champion.x,champion.y);
  if(length>this.inner){champion.x*=this.inner/length;champion.y*=this.inner/length;}
  this.burst(0,-100,champion.id,time,100,true);
 }

 step(){
  if(this.tick>=MAX_TICKS)return;
  this.time=++this.tick*STEP;
  if(this.winner!==null)return;
  this.gate=this.gateAt(this.time-STEP/2);
  this.contacts.length=0;
  for(const ball of this.balls){
   if(!ball.alive)continue;
   ball.vy+=this.settings.gravity*STEP;this.normalize(ball);this.fly(ball);
  }
  // Resolve simultaneous exits in contact order so one ball always remains.
  this.contacts.sort((a,b)=>a.time-b.time||a.ball.id-b.ball.id);
  for(const {type,ball,time,x,y} of this.contacts){
   if(type==='escape')this.eliminate(ball,time,x,y);
   else this.emit(type,ball,time,x,y);
   if(this.winner!==null)return;
  }
  this.collide();
  for(const ball of this.balls)if(ball.alive){
   ball.x=snap(ball.x);ball.y=snap(ball.y);ball.vx=snap(ball.vx);ball.vy=snap(ball.vy);
  }
  if(this.effects&&this.tick%3===0)for(const ball of this.balls){
   if(!ball.alive)continue;
   ball.trail.push({x:ball.x,y:ball.y});
   if(ball.trail.length>10)ball.trail.shift();
  }
 }

 seek(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  const target=Math.min(MAX_TICKS,Math.round(seconds/STEP));
  if(target<this.tick)this.reset();
  while(this.tick<target)this.step();
 }
}
