import {pathStringContact,positionOnPath} from './string-contact.js';
import {STEP,BALL_SPEED,seededRandom} from './simulation.js';
import {physicsSettings,warSettings} from '../config.js';

export function distanceToString(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}

export class StringWarsSimulation{
 constructor(seed=48291,settings={},options={}){this.settings=physicsSettings(settings);this.war=warSettings(options.war);this.duration=options.duration??45;this.timed=options.timed!==false;this.effects=options.effects!==false;this.reset(seed);}
 reset(seed=this.seed){
  this.seed=seed>>>0;this.random=seededRandom(this.seed);this.fxRandom=seededRandom(this.seed^0x7f01a);this.tick=0;this.time=0;this.fraction=0;this.events=[];this.particles=[];this.bounceCount=0;this.winner=null;this.escapedAt=null;this.shrinkOffset=0;this.nextPressure=0;this.pressureStarted=false;this.stringId=0;this.renderAlpha=1;this.brokenStrings=[];this.motionRandom=[];this.motionPaths=[];
  const n=this.war.competitors.length,r=this.war.arenaRadius;
  this.balls=this.war.competitors.map((entry,index)=>{const random=this.motionRandom[index]=seededRandom((this.seed^Math.imul(index+1,0x9e3779b9)^0x4d6f746e)>>>0),a=Math.PI+(index+(random()-.5)*.15)/n*Math.PI*2,distance=r*(.46+random()*.14),heading=random()*Math.PI*2,ball={id:index,x:Math.cos(a)*distance,y:Math.sin(a)*distance,vx:Math.cos(heading)*BALL_SPEED,vy:Math.sin(heading)*BALL_SPEED,radius:this.settings.ballRadius,alive:true,eliminatedAt:null,strings:[],trail:[]};for(let i=0;i<this.war.initialStrings;i++){const angle=a+(this.war.initialStrings===1?0:(i/(this.war.initialStrings-1)-.5)*1.05);ball.strings.push({id:this.stringId++,x:Math.cos(angle)*r,y:Math.sin(angle)*r,born:0,bornTick:0,bornFraction:0});}ball.px=ball.x;ball.py=ball.y;return ball;});this.ball=this.balls[0];this.remaining=n;return this;
 }
 get showdownAt(){return this.timed?this.duration*this.war.showdownPercent/100:Infinity;}
 get speedMultiplier(){return this.time>=this.showdownAt?this.war.showdownSpeed:1;}
 normalize(b){const speed=Math.hypot(b.vx,b.vy)||1;b.vx*=BALL_SPEED/speed;b.vy*=BALL_SPEED/speed;}
 emit(type,b,x=b.x,y=b.y,extra={}){this.events.push({id:this.events.length,type,time:this.time,tick:this.tick,ring:b.id,note:this.bounceCount,x,y,...extra});}
 burst(x,y,owner,count=12){if(!this.effects)return;for(let i=0;i<count;i++){const a=this.fxRandom()*Math.PI*2,s=35+this.fxRandom()*170;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:.35+this.fxRandom()*.5,size:2+this.fxRandom()*4,owner});}if(this.particles.length>2200)this.particles.splice(0,this.particles.length-2200);}
 cut(b,index,x,y,cause='contact',contact=null){if(!b.alive||!b.strings[index]||this.winner!==null)return;const string=b.strings.splice(index,1)[0];if(this.effects)this.brokenStrings.push({owner:b.id,ax:contact?.ownerX??b.x,ay:contact?.ownerY??b.y,bx:string.x,by:string.y,x,y,cutRadius:contact?.radius??0,age:0,life:.24});this.emit('escape',b,x,y,{cause,stringId:string.id});this.burst(x,y,b.id);if(!b.strings.length)this.eliminate(b);}
 eliminate(b){if(!b.alive||this.winner!==null)return;b.alive=false;b.eliminatedAt=this.time;this.remaining--;this.emit('eliminate',b);this.burst(b.x,b.y,b.id,65);if(this.remaining===1){this.winner=this.balls.find(ball=>ball.alive).id;this.escapedAt=this.time;const champion=this.balls[this.winner];this.emit('winner',champion);this.burst(champion.x,champion.y,champion.id,40);}}
 step(){
  this.time=++this.tick*STEP;const p=this.settings,r=this.war.arenaRadius,dt=STEP*p.ballSpeed*this.speedMultiplier;
  this.renderAlpha=1;
  for(const b of this.balls){if(!b.alive)continue;b.px=b.x;b.py=b.y;this.motionPaths[b.id]=[{t:0,x:b.x,y:b.y},{t:1,x:b.x,y:b.y}];if(this.winner===null){b.vy+=p.gravity*dt;this.normalize(b);this.fly(b,dt);}if(this.effects&&this.tick%2===0)b.trail.push({x:b.x,y:b.y,time:this.time});}
  if(this.winner===null){
   if(this.war.ballCollisions)for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){const a=this.balls[i],b=this.balls[j];if(!a.alive||!b.alive)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),overlap=a.radius+b.radius-d;if(overlap<=0)continue;const nx=d?dx/d:1,ny=d?dy/d:0,relative=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(relative>0){a.vx-=relative*nx;a.vy-=relative*ny;b.vx+=relative*nx;b.vy+=relative*ny;this.normalize(a);this.normalize(b);}const shift=overlap/2+.1;a.x-=nx*shift;a.y-=ny*shift;b.x+=nx*shift;b.y+=ny*shift;for(const ball of [a,b]){const len=Math.hypot(ball.x,ball.y),limit=r-ball.radius-.1;if(len>limit){ball.x*=limit/len;ball.y*=limit/len;}}}
   for(const ball of this.balls)if(ball.alive){const endpoint=this.motionPaths[ball.id].at(-1);endpoint.x=ball.x;endpoint.y=ball.y;}
   this.resolveStringContacts();
   if(this.timed&&this.time>=this.showdownAt&&this.winner===null){if(!this.pressureStarted){this.pressureStarted=true;this.schedulePressure();}if(this.time>=this.nextPressure){const alive=this.balls.filter(b=>b.alive),minimum=Math.min(...alive.map(b=>b.strings.length)),weak=alive.filter(b=>b.strings.length===minimum),target=weak[Math.floor(this.random()*weak.length)];this.cut(target,0,(target.x+target.strings[0].x)/2,(target.y+target.strings[0].y)/2,'showdown');this.schedulePressure();}if(this.time>=this.duration*.95&&this.winner===null){const ranked=this.balls.filter(b=>b.alive).sort((a,b)=>b.strings.length-a.strings.length||a.id-b.id);for(const loser of ranked.slice(1))while(loser.alive&&this.winner===null)this.cut(loser,0,loser.x,loser.y,'showdown');}}
  }
  if(this.effects){this.brokenStrings=this.brokenStrings.filter(s=>(s.age+=STEP)<s.life).slice(-300);for(const b of this.balls)while(b.trail.length&&this.time-b.trail[0].time>.085)b.trail.shift();this.particles=this.particles.filter(s=>{s.age+=STEP;s.x+=s.vx*STEP;s.y+=s.vy*STEP;s.vy+=260*STEP;return s.age<s.life;});}
 }
 fly(b,seconds){
  const radius=this.war.arenaRadius,limit=radius-b.radius,total=seconds;let elapsed=0;
  const path=this.motionPaths[b.id]=[{t:0,x:b.x,y:b.y}];
  const travel=duration=>{b.x+=b.vx*duration;b.y+=b.vy*duration;elapsed+=duration;path.push({t:Math.min(1,elapsed/total),x:b.x,y:b.y});};
  // Retain both sides of every rebound, so cutting never tests a chord through the arena.
  for(let impacts=0;seconds>1e-10&&impacts<8;impacts++){
   const vv=b.vx*b.vx+b.vy*b.vy,dot=b.x*b.vx+b.y*b.vy,c=b.x*b.x+b.y*b.y-limit*limit;
   const hit=(-dot+Math.sqrt(Math.max(0,dot*dot-vv*c)))/vv;
   if(hit>seconds||hit<-.000001){travel(seconds);seconds=0;break;}
   const duration=Math.max(0,hit);travel(duration);seconds-=duration;
   const nx=b.x/limit,ny=b.y/limit,out=b.vx*nx+b.vy*ny;
   if(out<=0){travel(seconds);seconds=0;break;}
   const angle=(this.motionRandom[b.id]()-.5)*2.35,inward=Math.cos(angle),tangent=Math.sin(angle);
   b.vx=BALL_SPEED*(-nx*inward-ny*tangent);b.vy=BALL_SPEED*(-ny*inward+nx*tangent);
   this.bounceCount++;this.emit('bounce',b,nx*radius,ny*radius);this.burst(nx*radius,ny*radius,b.id,5);
   if(this.time<this.showdownAt)for(let i=0;i<this.war.stringsPerBounce;i++){const angle=Math.atan2(ny,nx)+(i-(this.war.stringsPerBounce-1)/2)*.018;b.strings.push({id:this.stringId++,x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,born:this.time,bornTick:this.tick,bornFraction:elapsed/total});if(b.strings.length>this.war.maxStrings)b.strings.shift();}
   b.x=nx*(limit-1e-7);b.y=ny*(limit-1e-7);
  }
  if(path.at(-1).t<1)path.push({t:1,x:b.x,y:b.y});
 }
 resolveStringContacts(){
  const contacts=[],pathFor=ball=>this.motionPaths[ball.id]??[{t:0,x:ball.px??ball.x,y:ball.py??ball.y},{t:1,x:ball.x,y:ball.y}];
  for(const cutter of this.balls){if(!cutter.alive)continue;for(const owner of this.balls){if(owner===cutter||!owner.alive)continue;for(const anchor of owner.strings){
   const birth=anchor.bornTick===this.tick?(anchor.bornFraction??0):0;
   const hit=pathStringContact(pathFor(cutter),pathFor(owner),anchor,cutter.radius+.5,birth);
   if(hit)contacts.push({...hit,owner:owner.id,cutter:cutter.id,stringId:anchor.id});
  }}}
  // Resolve real contacts in time order. Every contacted strand can cut in the same step.
  contacts.sort((a,b)=>a.t-b.t||a.stringId-b.stringId||a.cutter-b.cutter);
  for(const hit of contacts){if(this.winner!==null)break;const owner=this.balls[hit.owner],cutter=this.balls[hit.cutter];if(!owner.alive||!cutter.alive)continue;const index=owner.strings.findIndex(strand=>strand.id===hit.stringId);if(index!==-1)this.cut(owner,index,hit.x,hit.y,'contact',{...hit,radius:cutter.radius});}
 }
 sampleBall(b){if(this.motionPaths[b.id])return positionOnPath(this.motionPaths[b.id],this.renderAlpha);const t=this.renderAlpha;return {x:(b.px??b.x)+(b.x-(b.px??b.x))*t,y:(b.py??b.y)+(b.y-(b.py??b.y))*t};}
 schedulePressure(){const alive=this.balls.filter(b=>b.alive),total=alive.reduce((sum,b)=>sum+b.strings.length,0),strongest=Math.max(0,...alive.map(b=>b.strings.length));this.nextPressure=this.time+Math.max(STEP,(this.duration*.95-this.time)/Math.max(1,total-strongest));}
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');this.fraction+=seconds;const count=Math.floor((this.fraction+1e-10)/STEP);this.fraction-=count*STEP;for(let i=0;i<count;i++)this.step();}
 seek(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Time must be non-negative.');const exact=seconds/STEP,target=Math.ceil(exact-1e-9);if(target<this.tick)this.reset();while(this.tick<target)this.step();this.renderAlpha=target?Math.max(0,Math.min(1,1-(target-exact))):1;this.fraction=0;}
}
