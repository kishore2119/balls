import {TAU} from './simulation.js';
import {blendColor} from './palette.js';
import {CanvasSceneRenderer,CX,CY} from './canvas-scene-renderer.js';

const disk=(c,x,y,radius)=>{c.beginPath();c.arc(CX+x,CY+y,radius,0,TAU);c.fill();};

export class SpikeRenderer extends CanvasSceneRenderer {
 draw(sim){
  const c=this.context,a=this.appearance,{spike,spikes,arcStart,arcEnd,radius,time,ball,escapedAt}=sim;
  const colors=this.colors;
  const ballColor=id=>colors[id%colors.length];
  this.clear();
  c.fillStyle=spike.ringColor;c.strokeStyle=spike.ringColor;
  c.shadowColor=spike.ringColor;c.shadowBlur=a.glow*15;
  c.beginPath();
  for(const {vertices:[first,second,tip]} of spikes){
   c.moveTo(CX+first.x,CY+first.y);
   c.lineTo(CX+second.x,CY+second.y);c.lineTo(CX+tip.x,CY+tip.y);c.closePath();
  }
  c.fill();c.shadowBlur=0;
  c.beginPath();c.arc(CX,CY,spike.arenaRadius,arcStart,arcEnd);c.lineWidth=a.lineWidth;c.stroke();

  for(const anchor of sim.anchors){
   const color=ballColor(anchor.id),pulse=Math.max(0,1-(time-anchor.litAt)/.14);
   c.fillStyle=pulse>0?blendColor([color,'#ffffff'],pulse):color;
   disk(c,anchor.x,anchor.y,radius);
  }
  if(ball){
   const color=ballColor(ball.id),age=escapedAt===null?0:Math.max(0,time-escapedAt);
   if(age<.8){
    c.fillStyle=color;
    if(a.trail){
     sim.trail.forEach(({x,y},index)=>{
      const tail=(index+1)/sim.trail.length;
      c.globalAlpha=tail*.30*Math.max(0,1-age*5);
      disk(c,x,y,radius*(.10+.66*tail));
     });
    }
    c.globalAlpha=Math.min(1,Math.max(0,1.75-age*2.1));
    disk(c,ball.x+ball.vx*age,ball.y+ball.vy*age,radius);
    c.globalAlpha=1;
   }
   if(a.particles&&escapedAt!==null&&age<.7){
    c.strokeStyle=color;c.lineWidth=2.5;c.globalAlpha=Math.max(0,1-age/.55)*.65;
    c.beginPath();c.arc(CX+ball.x,CY+ball.y,radius+age*200,0,TAU);c.stroke();
    c.fillStyle=color;
    for(const spark of sim.sparks){
     if(age>=spark.life)continue;
     c.globalAlpha=1-age/spark.life;
     disk(c,ball.x+spark.x*age,ball.y+spark.y*age+85*age*age,spark.size);
    }
    c.globalAlpha=1;
   }
  }
  const count=sim.anchors.length;
  this.labels(a.title,`${count} ${count===1?'BALL':'BALLS'} STUCK`,CY+spike.arenaRadius+75);
 }
}
