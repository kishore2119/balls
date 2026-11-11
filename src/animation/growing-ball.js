import {STEP,BALL_SPEED,TAU,seededRandom,PARTICLE_GRAVITY} from './simulation.js';
import {physicsSettings,growthSettings} from '../config.js';

export class GrowingBallSimulation{
 constructor(seed=48291,settings={},options={}){this.settings=physicsSettings(settings);this.growth=growthSettings(options.growth);this.effects=options.effects!==false;this.growthRate=options.growthRate??this.growth.perBounce;if(!Number.isFinite(this.growthRate)||this.growthRate<=0||this.growthRate>480)throw new RangeError('Choose a valid growth rate.');this.reset(seed);}
 reset(seed=this.seed){
  this.seed=seed>>>0;const random=seededRandom(this.seed);this.tick=0;this.time=0;this.fraction=0;this.remaining=1;this.escapedAt=null;this.filledAt=null;this.bounceCount=0;this.shrinkOffset=0;this.events=[];this.trail=[];this.particles=[];this.hits=[];
  const angle=random()*TAU;this.ball={x:-110,y:-135,vx:Math.cos(angle)*BALL_SPEED,vy:Math.sin(angle)*BALL_SPEED,radius:this.settings.ballRadius};
  return this;
 }
 normalize(){const speed=Math.hypot(this.ball.vx,this.ball.vy)||1;this.ball.vx*=BALL_SPEED/speed;this.ball.vy*=BALL_SPEED/speed;}
 step(){
  this.time=++this.tick*STEP;const b=this.ball,p=this.settings,radius=this.growth.arenaRadius,dt=STEP*p.ballSpeed;
  if(this.filledAt===null){
   b.vy+=p.gravity*dt;this.normalize();b.x+=b.vx*dt;b.y+=b.vy*dt;
   const distance=Math.hypot(b.x,b.y),limit=radius-b.radius;
   if(distance>=limit){
    const nx=distance?b.x/distance:1,ny=distance?b.y/distance:0,out=b.vx*nx+b.vy*ny;
    b.x=nx*Math.max(0,limit-1);b.y=ny*Math.max(0,limit-1);
    if(out>0){
     b.vx-=(1+p.bounciness)*out*nx;b.vy-=(1+p.bounciness)*out*ny;this.normalize();
     const hit={x:nx*radius,y:ny*radius,time:this.time};this.hits.push(hit);if(this.hits.length>this.growth.rayCount)this.hits.shift();
     this.events.push({id:this.events.length,type:'bounce',time:this.time,tick:this.tick,ring:this.bounceCount,note:this.bounceCount,x:hit.x,y:hit.y,speed:BALL_SPEED*p.ballSpeed});this.bounceCount++;
     b.radius=Math.min(radius,b.radius+this.growthRate);
     if(b.radius>=radius*.985){b.radius=radius;b.x=0;b.y=0;this.filledAt=this.escapedAt=this.time;this.remaining=0;}
     else{const safe=radius-b.radius-1;b.x=nx*safe;b.y=ny*safe;}
     if(this.effects)for(let i=0;i<7;i++)this.particles.push({x:hit.x,y:hit.y,vx:-nx*(35+i*9)+ny*(i-3)*18,vy:-ny*(35+i*9)-nx*(i-3)*18,age:0,life:.55,size:3+i%3});
    }
   }
   if(this.effects&&this.tick%2===0)this.trail.push({x:b.x,y:b.y,radius:b.radius,time:this.time});
  }
  if(this.effects){while(this.trail.length&&this.time-this.trail[0].time>.32)this.trail.shift();this.particles=this.particles.filter(s=>{s.age+=STEP;s.x+=s.vx*STEP;s.y+=s.vy*STEP;s.vy+=PARTICLE_GRAVITY*STEP;return s.age<s.life;});}
 }
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');this.fraction+=seconds;const ticks=Math.floor((this.fraction+1e-10)/STEP);this.fraction-=ticks*STEP;for(let i=0;i<ticks;i++)this.step();}
 seek(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');const target=Math.round(seconds/STEP);if(target<this.tick)this.reset();while(this.tick<target)this.step();this.fraction=0;}
}

export function planGrowth({seed,physics,growth,duration},onProgress=()=>{}){
 if(!Number.isFinite(duration)||duration<5||duration>120)throw new RangeError('Choose a duration between 5 and 120 seconds.');
 const target=duration-Math.min(1,Math.max(.2,duration*.025)),tolerance=Math.max(.45,Math.min(1.5,duration*.035));
 let low=.001,high=growthSettings(growth).arenaRadius,best=null;
 const evaluate=rate=>{const s=new GrowingBallSimulation(seed,physics,{effects:false,growth,growthRate:rate});while(s.filledAt===null&&s.time<duration+5)s.step();if(s.filledAt!==null&&s.filledAt<=target&&(!best||s.filledAt>best.escapedAt))best={seed,growthRate:rate,escapedAt:s.filledAt};return s.filledAt;};
 for(let i=0;i<32;i++){const rate=(low+high)/2,time=evaluate(rate);if(time===null||time>target)low=rate;else high=rate;onProgress((i+1)/40);if(best&&target-best.escapedAt<.1)break;}
 if(best&&target-best.escapedAt>tolerance)for(let i=0;i<32;i++){evaluate(best.growthRate*(.8+i*.4/31));onProgress(.8+(i+1)/160);}
 if(!best||target-best.escapedAt>tolerance)throw new Error('Could not fill the circle near this duration. Try a different scenario, speed, or duration.');
 onProgress(1);return best;
}
