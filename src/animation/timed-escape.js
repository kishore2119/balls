import {circleHit} from './circle-hit.js';
import {BALL_SPEED,STEP,TAU,seededRandom} from './simulation.js';
import {physicsSettings,timedEscapeSettings} from '../config.js';

const EPSILON=.0001;
const MAX_TICKS=120/STEP;
const WALL_PADDING=4;

export class TimedEscapeSimulation {
 constructor(seed,settings,{timedEscape,effects=true}={}){
  this.settings=physicsSettings(settings);
  this.timedEscape=timedEscapeSettings(timedEscape);
  this.effects=effects;
  this.speed=BALL_SPEED*this.settings.ballSpeed;
  this.ballRadius=this.settings.ballRadius;
  this.wallClearance=this.ballRadius+WALL_PADDING;
  this.gapAngle=this.timedEscape.gapPosition*Math.PI/180;
  this.halfGap=this.settings.gapAngle*Math.PI/360;
  const R=this.timedEscape.arenaRadius;
  this.endpoints=[this.gapAngle-this.halfGap,this.gapAngle+this.halfGap]
   .map(angle=>({x:R*Math.cos(angle),y:R*Math.sin(angle)}));
  this.attemptTicks=Math.round(this.timedEscape.attemptSeconds/STEP);
  this.reset(seed);
 }

 reset(seed=this.seed){
  this.seed=seed>>>0;
  this.random=seededRandom(this.seed);
  this.tick=0;this.time=0;this.attempt=0;this.bounceCount=0;
  this.remaining=1;this.escapedAt=null;this.finishedAt=null;
  this.frozen=[];this.events=[];this.trail=[];this.particles=[];
  this.launch();
  return this;
 }

 launch(){
  this.trail=[];
  const R=this.timedEscape.arenaRadius-this.wallClearance;
  const space=this.ballRadius*2+1;
  const free=(x,y)=>this.frozen.every(ball=>(ball.x-x)**2+(ball.y-y)**2>=space*space);
  let position=null;
  for(let i=0;i<64;i++){
   const angle=this.random()*TAU;
   const distance=Math.sqrt(this.random())*R*(i<16?.28:.85);
   const x=Math.cos(angle)*distance,y=Math.sin(angle)*distance;
   if(free(x,y)){position={x,y};break;}
  }
  // A long clip with short attempts can crowd the center. Check the full arena.
  if(!position){
   for(let y=-R+space/2;y<R&&!position;y+=space){
    for(let x=-R+space/2;x<R;x+=space){
     if(x*x+y*y<R*R&&free(x,y)){position={x,y};break;}
    }
   }
  }
  if(!position){this.ball=null;this.finishedAt=this.time;return;}
  const angle=this.random()*TAU;
  this.ball={...position,radius:this.ballRadius,vx:Math.cos(angle)*this.speed,vy:Math.sin(angle)*this.speed};
 }

 withinGap(x,y){
  const angle=Math.atan2(y,x)-this.gapAngle;
  return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<this.halfGap;
 }

 emit(type,time,x,y){
  this.events.push({id:this.events.length,type,time,tick:this.tick,ring:this.attempt,note:this.bounceCount,x,y,speed:this.speed});
 }

 escape(time){
  const {x,y}=this.ball;
  this.emit('escape',time,x,y);
  this.escapedAt=this.finishedAt=time;
  this.remaining=0;
  if(!this.effects)return;
  const random=seededRandom(this.seed^0xeabb25),R=this.timedEscape.arenaRadius;
  for(let i=0;i<640;i++){
   const angle=this.gapAngle+this.halfGap+(i+random())/640*(TAU-2*this.halfGap);
   const nx=Math.cos(angle),ny=Math.sin(angle),speed=30+random()*160;
   this.particles.push({x:nx*R,y:ny*R,vx:nx*speed+(random()-.5)*40,
    vy:ny*speed+(random()-.5)*42,size:1.2+random()*3.5,life:.65+random()*1.25});
  }
 }

 fly(){
  const b=this.ball,R=this.timedEscape.arenaRadius,padding=this.wallClearance;
  const inner=R-padding,outer=R+padding;
  let left=STEP;
  for(let contact=0;contact<12&&left>1e-8;contact++){
   const ux=b.vx/this.speed,uy=b.vy/this.speed;
   let travel=this.speed*left,hit=null;
   const wall=circleHit(b.x,b.y,ux,uy,inner,true);
   if(wall<=travel&&!this.withinGap(b.x+ux*wall,b.y+uy*wall)){
    travel=wall;hit={x:0,y:0,inside:true};
   }
   for(const endpoint of this.endpoints){
    const distance=circleHit(b.x-endpoint.x,b.y-endpoint.y,ux,uy,padding);
    if(distance<travel){travel=distance;hit=endpoint;}
   }
   for(const obstacle of this.frozen){
    const distance=circleHit(b.x-obstacle.x,b.y-obstacle.y,ux,uy,this.ballRadius*2);
    if(distance<travel){travel=distance;hit=obstacle;}
   }
   const exit=circleHit(b.x,b.y,ux,uy,outer,true);
   if(exit<=travel&&this.withinGap(b.x+ux*exit,b.y+uy*exit)){
    b.x+=ux*exit;b.y+=uy*exit;
    this.escape(this.time-left+exit/this.speed);
    return;
   }
   b.x+=ux*travel;b.y+=uy*travel;
   if(!hit)return;
   left-=travel/this.speed;
   const x=b.x-hit.x,y=b.y-hit.y;
   const length=Math.hypot(x,y),nx=x/length,ny=y/length;
   const normal=ux*nx+uy*ny;
   b.vx=(ux-2*normal*nx)*this.speed;b.vy=(uy-2*normal*ny)*this.speed;
   const offset=hit.inside?-EPSILON:EPSILON;
   b.x+=nx*offset;b.y+=ny*offset;
   this.bounceCount++;
   this.emit('bounce',this.time-left,b.x,b.y);
  }
 }

 step(){
  if(this.tick>=MAX_TICKS)return;
  this.time=++this.tick*STEP;
  if(this.finishedAt!==null)return;
  const b=this.ball;
  b.vy+=this.settings.gravity*STEP;
  const magnitude=Math.hypot(b.vx,b.vy);
  b.vx*=this.speed/magnitude;b.vy*=this.speed/magnitude;
  this.fly();
  if(this.escapedAt!==null)return;
  if(this.tick%this.attemptTicks===0){
   this.frozen.push({x:b.x,y:b.y,radius:b.radius});
   this.attempt++;
   this.launch();
  }else if(this.effects&&this.tick%2===0){
   this.trail.push({x:b.x,y:b.y});
   if(this.trail.length>18)this.trail.shift();
  }
 }

 seek(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  const target=Math.min(MAX_TICKS,Math.round(seconds/STEP));
  if(target<this.tick)this.reset();
  while(this.tick<target)this.step();
 }
}
