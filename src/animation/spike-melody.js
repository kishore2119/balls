import {BALL_SPEED,STEP,TAU,seededRandom} from './simulation.js';
import {circleHit} from './circle-hit.js';
import {physicsSettings,spikeSettings} from '../config.js';

const MAX_TICKS=120/STEP;
const RELEASE_DELAY=.085;
const SEPARATION=.001;
const polar=(radius,angle)=>({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});

function makeSpikes(radius,depth,count,start,end){
 const span=(end-start)/count;
 return Array.from({length:count},(_,index)=>{
  const a=start+index*span;
  const vertices=[polar(radius,a),polar(radius,a+span),polar(radius-depth,a+span/2)];
  const edges=vertices.map((point,i)=>{
   const next=vertices[(i+1)%3],dx=next.x-point.x,dy=next.y-point.y,length=Math.hypot(dx,dy);
   return {...point,ux:dx/length,uy:dy/length,nx:dy/length,ny:-dx/length,length};
  });
  return {vertices,edges};
 });
}

// A disk can contact either the side of a spike or one of its vertices.
function spikeHit(spike,x,y,ux,uy,radius,limit){
 let nearest=limit;
 for(const edge of spike.edges){
  const dx=x-edge.x,dy=y-edge.y,speed=ux*edge.nx+uy*edge.ny;
  const normal=dx*edge.nx+dy*edge.ny;
  if(speed<0&&normal>=radius-SEPARATION){
   const distance=Math.max(0,(radius-normal)/speed);
   const along=(dx+ux*distance)*edge.ux+(dy+uy*distance)*edge.uy;
   if(distance<nearest&&along>=0&&along<=edge.length)nearest=distance;
  }
  nearest=Math.min(nearest,circleHit(dx,dy,ux,uy,radius));
 }
 return nearest;
}

export class SpikeSimulation {
 constructor(seed,settings,{spike,effects=true}={}){
  this.settings=physicsSettings(settings);
  this.spike=spikeSettings(spike);
  this.effects=effects;
  this.radius=this.settings.ballRadius;
  this.speed=BALL_SPEED*this.settings.ballSpeed;
  const gap=this.spike.gapPosition*Math.PI/180,halfGap=this.settings.gapAngle*Math.PI/360;
  this.arcStart=gap+halfGap;this.arcEnd=gap+TAU-halfGap;
  this.gapAxis=polar(1,gap);this.gapCos=Math.cos(halfGap);
  this.escapeRadius=this.spike.arenaRadius+this.radius+2;
  this.clearRadius=this.spike.arenaRadius-this.spike.spikeDepth-this.radius;
  this.spikes=makeSpikes(this.spike.arenaRadius,this.spike.spikeDepth,this.spike.spikeCount,this.arcStart,this.arcEnd);
  this.reset(seed);
 }

 reset(seed=this.seed){
  this.seed=seed>>>0;this.random=seededRandom(this.seed);
  this.tick=0;this.time=0;this.bounceCount=0;this.escapedAt=null;this.finishedAt=null;
  this.nextId=0;this.anchors=[];this.events=[];this.sparks=[];
  this.launch();
  return this;
 }

 get remaining(){return this.escapedAt===null?1:0;}

 launch(){
  const angle=this.random()*TAU;
  this.ball={id:this.nextId++,x:(this.random()-.5)*8,y:0,vx:this.speed*Math.cos(angle),vy:this.speed*Math.sin(angle)};
  this.trail=[];
 }

 emit(type,time,x,y,contact){
  this.events.push({id:this.events.length,type,time,tick:this.tick,ring:0,note:this.bounceCount,x,y,speed:this.speed,contact});
  if(type==='bounce')this.bounceCount++;
 }

 stick(time){
  const {id,x,y}=this.ball;
  this.anchors.push({id,x,y,litAt:time});
  this.emit('bounce',time,x,y,'spike');
  this.ball=null;this.launchAt=time+RELEASE_DELAY;this.trail=[];
 }

 escape(time){
  const {x,y}=this.ball;
  this.escapedAt=this.finishedAt=time;
  this.emit('escape',time,x,y,'gap');
  if(!this.effects)return;
  const random=seededRandom(this.seed^0xd4a78b);
  for(let i=0;i<24;i++){
   const angle=random()*TAU,speed=55+random()*210;
   this.sparks.push({...polar(speed,angle),life:.24+random()*.42,size:2+random()*4});
  }
 }

 fly(){
  const b=this.ball;
  let left=STEP;
  for(let i=0;i<8&&left>1e-8;i++){
   const ux=b.vx/this.speed,uy=b.vy/this.speed;
   let distance=this.speed*left,anchor=null,hitSpike=false;
   for(const candidate of this.anchors){
    const contact=circleHit(b.x-candidate.x,b.y-candidate.y,ux,uy,this.radius*2);
    if(contact<distance){distance=contact;anchor=candidate;}
   }
   // A segment wholly in the clear disk cannot reach a spike or the gap.
   if(Math.max(Math.hypot(b.x,b.y),Math.hypot(b.x+ux*distance,b.y+uy*distance))>=this.clearRadius){
    for(const spike of this.spikes){
     const contact=spikeHit(spike,b.x,b.y,ux,uy,this.radius,distance);
     if(contact<distance){distance=contact;hitSpike=true;}
    }
    const exit=circleHit(b.x,b.y,ux,uy,this.escapeRadius,true);
    if(exit<=distance){
     const x=b.x+ux*exit,y=b.y+uy*exit;
     if(x*this.gapAxis.x+y*this.gapAxis.y>this.gapCos*this.escapeRadius){
      b.x=x;b.y=y;this.escape(this.time-left+exit/this.speed);return;
     }
    }
   }
   b.x+=ux*distance;b.y+=uy*distance;
   left-=distance/this.speed;
   if(hitSpike){this.stick(this.time-left);return;}
   if(!anchor)return;
   const x=b.x-anchor.x,y=b.y-anchor.y,length=Math.hypot(x,y);
   const nx=length?x/length:-ux,ny=length?y/length:-uy,dot=ux*nx+uy*ny;
   b.vx=this.speed*(ux-2*dot*nx);b.vy=this.speed*(uy-2*dot*ny);
   b.x+=nx*SEPARATION;b.y+=ny*SEPARATION;
   anchor.litAt=this.time-left;
   this.emit('bounce',anchor.litAt,anchor.x,anchor.y,'ball');
  }
 }

 step(){
  if(this.tick>=MAX_TICKS)return;
  this.time=++this.tick*STEP;
  if(this.escapedAt!==null)return;
  if(!this.ball){
   if(this.time>=this.launchAt)this.launch();
   return;
  }
  const b=this.ball;
  b.vy+=this.settings.gravity*STEP;
  const speed=Math.hypot(b.vx,b.vy);
  b.vx*=this.speed/speed;b.vy*=this.speed/speed;
  this.fly();
  if(this.effects&&this.ball&&this.escapedAt===null&&this.tick%2===0){
   this.trail.push({x:b.x,y:b.y});
   if(this.trail.length>17)this.trail.shift();
  }
 }

 seek(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');
  const target=Math.min(MAX_TICKS,Math.round(seconds/STEP));
  if(target<this.tick)this.reset();
  while(this.tick<target)this.step();
 }
}
