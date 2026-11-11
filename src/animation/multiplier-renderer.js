import {TAU} from './simulation.js';
import {CanvasSceneRenderer,CX,CY} from './canvas-scene-renderer.js';
import {OUTSIDE_LIFE} from './multiplier.js';

const RAINBOW=Array.from({length:32},(_,i)=>`hsl(${(96+i*360/32)%360} 87% 65%)`);

export class MultiplierRenderer extends CanvasSceneRenderer {
 draw(sim){
  const c=this.context,a=this.appearance;
  const {time,multiplier,radius,angle,halfGap}=sim;
  const arena=multiplier.arenaRadius;
  const colors=multiplier.rainbow?RAINBOW:this.colors;
  const ring=multiplier.rainbow?`hsl(${(time*27+26)%360} 95% 62%)`:multiplier.ringColor;
  this.clear();

  c.beginPath();c.arc(CX,CY,arena,angle+halfGap,angle-halfGap+TAU);
  c.lineWidth=a.lineWidth;c.lineCap='round';c.strokeStyle=ring;
  c.shadowColor=ring;c.shadowBlur=a.glow*16;c.stroke();c.shadowBlur=0;

  const batches=Array.from({length:colors.length},()=>[]);
  const colorIndex=id=>(id*(multiplier.rainbow?13:1))%colors.length;
  for(const ball of sim.balls)batches[colorIndex(ball.id)].push(ball);
  for(const ball of sim.outside)batches[colorIndex(ball.id)].push(ball);
  for(const [index,batch] of batches.entries()){
   if(!batch.length)continue;
   c.beginPath();
   for(const ball of batch){
    const age=ball.time===undefined?0:time-ball.time;
    const x=CX+ball.x+ball.vx*age,y=CY+ball.y+ball.vy*age+150*age*age;
    const size=radius*(1-.45*age/OUTSIDE_LIFE);
    c.moveTo(x+size,y);c.arc(x,y,size,0,TAU);
   }
   c.fillStyle=colors[index];c.fill();
  }
  const total=sim.balls.length;
  const counter=`${total} ${total===1?'BALL':'BALLS'} INSIDE`;
  this.labels(a.title.replaceAll('{count}',String(multiplier.children)),counter,CY+arena+75);
 }
}
