import {STEP,BALL_SPEED,TAU,seededRandom} from './simulation.js';
import {physicsSettings,crashSettings} from '../config.js';

const MAX_TICKS=120*240;
const MAX_SPEED=4200;
const MAX_CONTACTS=8;

export class CrashSimulation {
 constructor(seed,settings,options={}){
  this.settings=physicsSettings(settings);
  this.crash=crashSettings(options.crash);
  this.effects=options.effects!==false;
  this.reset(seed);
 }
 reset(seed=this.seed){
  this.seed=seed>>>0;this.random=seededRandom(this.seed);
  const angle=this.random()*TAU;
  const speed=BALL_SPEED*this.settings.ballSpeed;
  this.ball={x:0,y:0,radius:this.settings.ballRadius,vx:speed*Math.cos(angle),vy:speed*Math.sin(angle)};
  this.tick=0;this.time=0;this.fraction=0;this.bounceCount=0;this.remaining=1;
  this.finishedAt=null;this.escapedAt=null;this.events=[];this.trail=[];this.distance=0;
  this.stamp(0);
  return this;
 }
 stamp(time){
  if(this.effects)this.trail.push({x:this.ball.x,y:this.ball.y,radius:this.ball.radius,time,distance:this.distance});
 }
 step(){
  if(this.tick>=MAX_TICKS)return;
  const start=this.time;this.time=++this.tick*STEP;
  if(this.finishedAt!==null)return;
  const b=this.ball,c=this.crash,R=c.arenaRadius;
  b.vy+=this.settings.gravity*STEP;
  const speed=Math.hypot(b.vx,b.vy);
  if(speed>MAX_SPEED){b.vx*=MAX_SPEED/speed;b.vy*=MAX_SPEED/speed;}
  let left=STEP;
  for(let n=0;n<MAX_CONTACTS&&left>1e-8;n++){
   const limit=R-b.radius, dx=b.vx*left,dy=b.vy*left;
   if(Math.hypot(b.x+dx,b.y+dy)<=limit){b.x+=dx;b.y+=dy;this.distance+=Math.hypot(dx,dy);break;}
   // Solve the exit intersection so the growing ball cannot tunnel through the arena.
   const a=dx*dx+dy*dy,dot=b.x*dx+b.y*dy;
   const offset=b.x*b.x+b.y*b.y-limit*limit;
   const t=Math.max(0,Math.min(1,(-dot+Math.sqrt(Math.max(0,dot*dot-a*offset)))/a));
   b.x+=dx*t;b.y+=dy*t;this.distance+=Math.hypot(dx,dy)*t;left*=1-t;
   const length=Math.hypot(b.x,b.y),nx=b.x/length,ny=b.y/length;
   const impactSpeed=Math.hypot(b.vx,b.vy),time=start+STEP-left;
   this.stamp(time);
   this.events.push({id:this.bounceCount,type:'bounce',time,tick:this.tick,ring:this.bounceCount,note:this.bounceCount,x:nx*R,y:ny*R,speed:impactSpeed});
   this.bounceCount++;
   b.radius=Math.min(R*.97,b.radius+c.growth);
   const clearance=R-b.radius-.001;
   b.x=nx*clearance;b.y=ny*clearance;
   if(b.radius>=R*.97){b.vx=0;b.vy=0;this.finishedAt=this.escapedAt=time;this.remaining=0;this.stamp(time);return;}
   const nextSpeed=Math.min(MAX_SPEED,impactSpeed*(1+c.acceleration/100));
   // Vary the reflected heading at each impact while keeping the ball moving inward.
   const reflected=Math.asin(Math.max(-1,Math.min(1,(-ny*b.vx+nx*b.vy)/impactSpeed)));
   const rebound=Math.max(-1,Math.min(1,reflected+(this.random()-.5)*.85));
   const inward=Math.cos(rebound),tangent=Math.sin(rebound);
   b.vx=nextSpeed*(-nx*inward-ny*tangent);
   b.vy=nextSpeed*(-ny*inward+nx*tangent);
   this.stamp(time);
  }
  this.stamp(this.time);
 }
 advance(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  this.fraction+=seconds;const ticks=Math.min(MAX_TICKS-this.tick,Math.floor((this.fraction+1e-10)/STEP));
  this.fraction=Math.min(STEP,Math.max(0,this.fraction-ticks*STEP));
  for(let i=0;i<ticks;i++)this.step();
 }
 seek(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  const tick=Math.min(MAX_TICKS,Math.round(seconds/STEP));
  if(tick<this.tick)this.reset();
  while(this.tick<tick)this.step();
  this.fraction=0;
 }
}

