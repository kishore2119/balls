import {STEP,TAU} from './simulation.js';
import {CanvasSceneRenderer,CX,CY} from './canvas-scene-renderer.js';

const circle=(ctx,x,y,radius)=>{ctx.beginPath();ctx.arc(x,y,radius,0,TAU);};

export class TimedEscapeRenderer extends CanvasSceneRenderer {
 draw(sim){
  const {context:c,appearance:a,colors}=this;
  const {time,timedEscape,escapedAt,ball,attempt}=sim;
  const radius=timedEscape.arenaRadius;
  const hue=(escapedAt??time)*23%360;
  const boundary=timedEscape.rainbow?`hsl(${hue} 93% 61%)`:timedEscape.ringColor;
  this.clear();
  if(escapedAt===null){
   c.beginPath();c.arc(CX,CY,radius,sim.gapAngle+sim.halfGap,sim.gapAngle-sim.halfGap+TAU);
   c.lineWidth=a.lineWidth;c.lineCap='round';c.strokeStyle=boundary;
   c.shadowColor=boundary;c.shadowBlur=a.glow*15;c.stroke();c.shadowBlur=0;
   sim.frozen.forEach((frozen,index)=>{
    circle(c,CX+frozen.x,CY+frozen.y,frozen.radius);
    c.fillStyle=colors[index%colors.length];c.fill();
   });
   if(ball){
    const color=colors[attempt%colors.length];
    if(a.trail){
     c.fillStyle=color;
     sim.trail.forEach(({x,y},index)=>{
      const phase=(index+1)/sim.trail.length;
      c.globalAlpha=.2*phase;
      circle(c,CX+x,CY+y,ball.radius*(.25+.65*phase));c.fill();
     });
     c.globalAlpha=1;
    }
    circle(c,CX+ball.x,CY+ball.y,ball.radius);c.fillStyle=color;c.fill();
   }
  }else if(a.particles){
   const age=Math.max(0,time-escapedAt);
   sim.particles.forEach((particle,index)=>{
    if(age>=particle.life)return;
    c.globalAlpha=(1-age/particle.life)**1.5;
    c.fillStyle=index%4?'#f0edff':boundary;
    c.fillRect(CX+particle.x+particle.vx*age,CY+particle.y+particle.vy*age+145*age*age,particle.size,particle.size);
   });
   c.globalAlpha=1;
  }

  const seconds=Number(timedEscape.attemptSeconds.toFixed(2));
  const timeLabel=`${seconds} ${seconds===1?'SECOND':'SECONDS'}`;
  const remaining=(sim.attemptTicks-(sim.tick%sim.attemptTicks))*STEP;
  const counter=escapedAt===null&&ball?`BALL ${attempt+1}  ·  ${remaining.toFixed(1)}s`:null;
  this.labels(a.title.replaceAll('{time}',timeLabel),counter,CY+radius+75);
 }
}
