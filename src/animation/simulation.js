import {physicsSettings} from '../config.js';
export const WIDTH=1080,HEIGHT=1920,STEP=1/240,GAP=.74,TAU=Math.PI*2,SHRINK_SPEED=24,MIN_INNER_RADIUS=90,BALL_SPEED=700;
export function seededRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Simulation{
 constructor(seed=48291,settings={},options={}){this.effects=options.effects!==false;this.settings=physicsSettings(settings);this.reset(seed);}
 setSettings(patch={}){const previous=this.settings;this.settings=physicsSettings({...this.settings,...patch});this.needsReplay=true;return ['ringCount','ballRadius','gapAngle'].some(key=>previous[key]!==this.settings[key]);}
 reset(seed=this.seed){
  this.seed=seed>>>0;this.random=seededRandom(this.seed);this.fxRandom=seededRandom(this.seed^0xa1b2c3d4);this.tick=0;this.time=0;this.fraction=0;this.remaining=this.settings.ringCount;this.shrinkOffset=0;this.escapedAt=null;this.needsReplay=false;this.events=[];this.bounceCount=0;
  this.gap=this.settings.gapAngle*Math.PI/180;this.minRadius=Math.max(this.settings.shrinkStopRadius,(this.settings.ballRadius+3)/Math.sin(this.gap/2)*1.15);const inner=Math.max(145,this.minRadius+45);
  this.ball={x:-20,y:-45,vx:220+this.random()*50,vy:45,radius:this.settings.ballRadius};
  this.normalizeBallSpeed();
  this.rings=Array.from({length:this.settings.ringCount},(_,index)=>({initialRadius:inner+index*27,radius:inner+index*27,angle:.5+index*.009,omega:.4+index*.0008,hue:(248+index/Math.max(1,this.settings.ringCount-1)*112)/360,lightness:(63-index/Math.max(1,this.settings.ringCount-1)*6)/100,alive:true,index}));
  this.particles=[];this.trail=[];return this;
 }
 normalizeBallSpeed(){const b=this.ball,speed=Math.hypot(b.vx,b.vy);if(speed<1e-10){b.vx=BALL_SPEED;b.vy=0;}else{b.vx*=BALL_SPEED/speed;b.vy*=BALL_SPEED/speed;}}
 emit(type,ring){this.events.push({id:this.events.length,type,time:this.time,tick:this.tick,ring:ring.index,x:this.ball.x,y:this.ball.y,speed:Math.hypot(this.ball.vx,this.ball.vy)*this.settings.ballSpeed,note:type==='bounce'?this.bounceCount++:this.settings.ringCount-this.remaining-1});}
 burst(ring){if(!this.effects)return;const random=this.fxRandom;for(let i=0;i<100;i++){const a=random()*TAU;if(Math.abs(angleDiff(a,ring.angle))<this.gap/2)continue;const v=50+random()*180;this.particles.push({x:Math.cos(a)*ring.radius,y:Math.sin(a)*ring.radius,vx:Math.cos(a)*v+(random()-.5)*80,vy:Math.sin(a)*v+(random()-.5)*80,life:.65+random()*.7,age:0,size:2+random()*4,ring:ring.index});}}
 step(){
  this.time=++this.tick*STEP;const b=this.ball,p=this.settings,first=this.rings.find(r=>r.alive);const available=first?Math.max(0,first.radius-this.minRadius):0;const activeStep=p.shrinkStopTime>0?Math.max(0,Math.min(STEP,p.shrinkStopTime-(this.time-STEP))):STEP;const shrink=Math.min(SHRINK_SPEED*p.shrinkSpeed*activeStep,available),wallSpeed=shrink/STEP;this.shrinkOffset+=shrink;
  const reverse=p.reverseOnPass&&(p.ringCount-this.remaining)%2?-1:1;
  for(const r of this.rings)if(r.alive){r.angle=(r.angle+r.omega*p.rotationSpeed*p.direction*reverse*STEP)%TAU;r.radius=r.initialRadius-this.shrinkOffset;}
  // Gravity bends the path; the speed slider alone sets the travel speed.
  const dt=STEP*p.ballSpeed;b.vy+=p.gravity*dt;this.normalizeBallSpeed();b.x+=b.vx*dt;b.y+=b.vy*dt;
  for(const r of this.rings){if(!r.alive)continue;const d=Math.hypot(b.x,b.y);if(d+b.radius<r.radius-2)break;
   const a=Math.atan2(b.y,b.x),margin=Math.asin(Math.min(1,(b.radius+3)/r.radius));
   if(Math.abs(angleDiff(a,r.angle))<this.gap/2-margin){r.alive=false;this.remaining--;this.emit('escape',r);this.burst(r);continue;}
   const nx=d?b.x/d:1,ny=d?b.y/d:0,out=b.vx*nx+b.vy*ny,v=wallSpeed/p.ballSpeed;b.x=nx*(r.radius-b.radius-3);b.y=ny*(r.radius-b.radius-3);
   if(out>-v){b.vx-=(1+p.bounciness)*(out+v)*nx;b.vy-=(1+p.bounciness)*(out+v)*ny;this.normalizeBallSpeed();this.emit('bounce',r);}break;
  }
  if(!this.remaining&&this.escapedAt===null)this.escapedAt=this.time;
  if(this.effects){this.particles=this.particles.filter(s=>{s.age+=STEP;s.x+=s.vx*STEP;s.y+=s.vy*STEP;s.vy+=80*STEP;return s.age<s.life;});if(this.tick%2===0)this.trail.push({x:b.x,y:b.y,time:this.time});while(this.trail.length&&this.time-this.trail[0].time>.18)this.trail.shift();}
 }
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');this.fraction+=seconds;const ticks=Math.floor((this.fraction+1e-10)/STEP);this.fraction-=ticks*STEP;for(let i=0;i<ticks;i++)this.step();}
 seek(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');const target=Math.round(seconds/STEP);if(this.needsReplay||target<this.tick)this.reset();while(this.tick<target)this.step();this.fraction=0;}
}
export function collectEvents(seed,settings,duration){const simulation=new Simulation(seed,settings,{effects:false});simulation.seek(duration);return {events:simulation.events,escapedAt:simulation.escapedAt,remaining:simulation.remaining};}
