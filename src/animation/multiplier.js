import {BALL_SPEED,STEP,TAU,seededRandom} from './simulation.js';
import {circleHit} from './circle-hit.js';
import {physicsSettings,multiplierSettings} from '../config.js';

const MAX_TICKS=120/STEP;
const RING_SPEED=1.16;
const EPSILON=.001;
const MAX_OUTSIDE=280;
export const OUTSIDE_LIFE=1.35;

export class MultiplierSimulation {
 constructor(seed,settings,{multiplier,effects=true}={}){
  this.settings=physicsSettings(settings);
  this.multiplier=multiplierSettings(multiplier);
  this.effects=effects;
  this.radius=this.settings.ballRadius;
  this.populationLimit=Math.min(this.multiplier.maxBalls,Math.floor((this.multiplier.arenaRadius/this.radius)**2));
  this.speed=this.settings.ballSpeed*BALL_SPEED;
  this.wallPadding=this.radius+4;
  this.inner=this.multiplier.arenaRadius-this.wallPadding;
  this.outer=this.multiplier.arenaRadius+this.wallPadding;
  this.halfGap=this.settings.gapAngle*Math.PI/360;
  this.gapLimit=Math.cos(this.halfGap);
  this.spin=RING_SPEED*this.settings.rotationSpeed*this.settings.direction;
  this.diameter=this.radius*2;
  this.gridOffset=this.outer+2*this.diameter;
  this.gridWidth=Math.ceil(2*this.gridOffset/this.diameter)+2;
  this.grid=new Int32Array(this.gridWidth**2);
  this.next=new Int32Array(this.populationLimit);
  this.ends=[{x:0,y:0},{x:0,y:0}];
  this.reset(seed);
 }

 reset(seed=this.seed){
  this.seed=seed>>>0;
  this.random=seededRandom(this.seed);
  this.tick=0;this.time=0;this.angle=2.9;
  this.balls=[];this.outside=[];this.events=[];
  this.lastSound={bounce:-Infinity,escape:-Infinity};
  this.pendingBounce=null;this.pendingEscape=null;
  this.nextId=0;this.bounceCount=0;this.escapeCount=0;this.escapedAt=null;
  this.updateGap(this.angle);
  this.spawn(1);
  return this;
 }

 get remaining(){return this.balls.length;}

 updateGap(angle){
  const radius=this.multiplier.arenaRadius;
  this.gapX=Math.cos(angle);this.gapY=Math.sin(angle);
  for(let i=0;i<2;i++){
   const edge=angle+(i===0?-this.halfGap:this.halfGap);
   this.ends[i].x=radius*Math.cos(edge);this.ends[i].y=radius*Math.sin(edge);
  }
 }

 inGap(x,y){
  return x*this.gapX+y*this.gapY>this.gapLimit*Math.hypot(x,y);
 }

 spawn(count){
  const room=Math.min(count,this.populationLimit-this.balls.length);
  for(let i=0;i<room;i++){
   const heading=this.random()*TAU;
   const distance=this.radius*(1+Math.sqrt(this.random())*4);
   const spread=heading+(this.random()-.5)*1.6;
   this.balls.push({id:this.nextId++,x:Math.cos(spread)*distance,y:Math.sin(spread)*distance,
    vx:Math.cos(heading)*this.speed,vy:Math.sin(heading)*this.speed});
  }
 }

 queueSound(type,time,x,y){
  if(time-this.lastSound[type]<(type==='bounce'?.055:.07))return;
  const pending=type==='bounce'?'pendingBounce':'pendingEscape';
  if(!this[pending]||time<this[pending].time)this[pending]={type,time,x,y};
 }

 flushSounds(){
  if(this.pendingBounce&&this.pendingEscape&&this.pendingEscape.time<this.pendingBounce.time){
   this.emit(this.pendingEscape);this.emit(this.pendingBounce);
  }else{
   if(this.pendingBounce)this.emit(this.pendingBounce);
   if(this.pendingEscape)this.emit(this.pendingEscape);
  }
  this.pendingBounce=this.pendingEscape=null;
 }

 emit(event){
  this.lastSound[event.type]=event.time;
  this.events.push({...event,id:this.events.length,tick:this.tick,ring:0,note:this.events.length,speed:this.speed});
 }

 fly(ball){
  const b=ball;
  b.vy+=this.settings.gravity*STEP;
  const magnitude=Math.hypot(b.vx,b.vy);
  if(magnitude<1e-8){b.vx=this.speed;b.vy=0;}
  else{b.vx*=this.speed/magnitude;b.vy*=this.speed/magnitude;}
  const innerSquared=this.inner**2;
  const nextX=b.x+b.vx*STEP,nextY=b.y+b.vy*STEP;
  const currentSquared=b.x*b.x+b.y*b.y;
  if(currentSquared<=innerSquared&&nextX*nextX+nextY*nextY<=innerSquared){
   b.x=nextX;b.y=nextY;return null;
  }

  // Resolve a center moved past the boundary by the rotating gap or another ball.
  if(currentSquared>innerSquared){
   const inGap=this.inGap(b.x,b.y);
   if(!inGap||currentSquared>=this.outer**2){
    const scale=(inGap?this.outer:this.inner-EPSILON)/Math.sqrt(currentSquared);
    b.x*=scale;b.y*=scale;
    if(inGap)return this.time-STEP;
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
   for(const end of this.ends){
    const entry=circleHit(b.x-end.x,b.y-end.y,ux,uy,this.wallPadding);
    if(entry<distance){distance=entry;hit=end;}
   }
   const exit=circleHit(b.x,b.y,ux,uy,this.outer,true);
   if(exit<=distance&&this.inGap(b.x+ux*exit,b.y+uy*exit)){
    b.x+=ux*exit;b.y+=uy*exit;
    return this.time-left+exit/this.speed;
   }
   b.x+=ux*distance;b.y+=uy*distance;
   if(!hit)break;
   left-=distance/this.speed;
   const x=b.x-hit.x,y=b.y-hit.y,length=Math.hypot(x,y);
   const nx=length?x/length:ux,ny=length?y/length:uy;
   const dot=ux*nx+uy*ny;
   if(hit.wall){
    const tangent=Math.max(-.985,Math.min(.985,-ny*ux+nx*uy+(this.random()-.5)*.13));
    const inward=Math.sqrt(1-tangent*tangent);
    b.vx=this.speed*(-nx*inward-ny*tangent);b.vy=this.speed*(-ny*inward+nx*tangent);
   }else{
    b.vx=this.speed*(ux-2*dot*nx);b.vy=this.speed*(uy-2*dot*ny);
   }
   const offset=hit.wall?-EPSILON:EPSILON;
   b.x+=nx*offset;b.y+=ny*offset;
   this.bounceCount++;
   this.queueSound('bounce',this.time-left,b.x,b.y);
  }
  return null;
 }

 collide(){
  if(this.balls.length<2)return;
  const {grid,gridWidth,next,diameter,gridOffset,balls}=this;
  const diameterSquared=diameter*diameter;
  grid.fill(-1);
  for(let i=0;i<balls.length;i++){
   const a=balls[i];
   const x=Math.floor((a.x+gridOffset)/diameter),y=Math.floor((a.y+gridOffset)/diameter);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const cell=(y+dy)*gridWidth+x+dx;
    for(let j=grid[cell];j>=0;j=next[j]){
     const b=balls[j],separationX=b.x-a.x,separationY=b.y-a.y;
     const squared=separationX*separationX+separationY*separationY;
     if(squared>=diameterSquared)continue;
     const distance=Math.sqrt(squared);
     const nx=distance?separationX/distance:1,ny=distance?separationY/distance:0;
     const shift=(diameter-distance)*.43;
     a.x-=nx*shift;a.y-=ny*shift;b.x+=nx*shift;b.y+=ny*shift;
     const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
     if(approach>0){
      a.vx-=approach*nx;a.vy-=approach*ny;b.vx+=approach*nx;b.vy+=approach*ny;
     }
    }
   }
   const cell=y*gridWidth+x;
   next[i]=grid[cell];grid[cell]=i;
  }
 }

 step(){
  if(this.tick>=MAX_TICKS)return;
  this.time=++this.tick*STEP;
  this.angle=2.9+this.spin*this.time;
  this.updateGap(this.angle-this.spin*STEP/2);
  let alive=0,births=0;
  for(const ball of this.balls){
   const escaped=this.fly(ball);
   if(escaped===null){
    this.balls[alive++]=ball;continue;
   }
   this.escapeCount++;
   this.escapedAt=this.escapedAt===null?escaped:Math.min(escaped,this.escapedAt);
   this.queueSound('escape',escaped,ball.x,ball.y);
   births+=this.multiplier.children;
   if(this.effects){
    if(this.outside.length>=MAX_OUTSIDE)this.outside.shift();
    this.outside.push({...ball,time:escaped});
   }
  }
  this.balls.length=alive;
  this.collide();
  this.spawn(births);
  if(this.effects&&this.outside.length){
   let visible=0;
   for(const ball of this.outside)if(this.time-ball.time<OUTSIDE_LIFE)this.outside[visible++]=ball;
   this.outside.length=visible;
  }
  this.flushSounds();
 }

 seek(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  const target=Math.min(MAX_TICKS,Math.round(seconds/STEP));
  if(target<this.tick)this.reset();
  while(this.tick<target)this.step();
 }
}
