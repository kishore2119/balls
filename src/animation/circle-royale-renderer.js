import {TAU} from './simulation.js';
import {CanvasSceneRenderer,CX,CY} from './canvas-scene-renderer.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const CONFETTI=['#ffc950','#79d6ff','#ff6d99','#96ed9a','#b28afb','#f4f3ec'];

function pathCircle(c,x,y,radius){
 c.beginPath();c.arc(x,y,radius,0,TAU);
}

function text(c,value,x,y,size,{weight=800,color='#ffffff',width=960,align='center',outline=0}={}){
 c.font=`${weight} ${size}px system-ui`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;
 if(outline){
  c.strokeStyle='#090b0e';c.lineWidth=outline;c.lineJoin='round';c.strokeText(value,x,y,width);
 }
 c.fillText(value,x,y,width);
}

export class RoyaleRenderer extends CanvasSceneRenderer {
 constructor(canvas){super(canvas);this.icons=new Map();}

 async prepareIcons(roster){
  this.roster=roster;
  const sources=new Set(roster.map(({icon})=>icon).filter(Boolean));
  for(const source of this.icons.keys())if(!sources.has(source))this.icons.delete(source);
  for(const source of sources){
   if(this.icons.has(source))continue;
   const image=new Image();
   image.src=source;
   const asset={image,ready:false,task:image.decode().then(()=>{asset.ready=true;}).catch(()=>{})};
   this.icons.set(source,asset);
  }
  await Promise.all([...sources].map(source=>this.icons.get(source).task));
 }

 paintBall(entry,x,y,radius,showName){
  const c=this.context;
  const fill=c.createRadialGradient(x-radius*.38,y-radius*.50,radius*.06,x,y,radius*1.14);
  fill.addColorStop(0,entry.color+'dd');fill.addColorStop(.60,entry.color);fill.addColorStop(1,entry.color+'9a');
  pathCircle(c,x,y,radius);
  c.fillStyle=entry.color;c.fill();c.fillStyle=fill;c.fill();
  const asset=this.icons.get(entry.icon);
  if(asset?.ready){
   c.save();pathCircle(c,x,y,radius-2);c.clip();
   c.drawImage(asset.image,x-radius,y-radius,radius*2,radius*2);c.restore();
  }else{
   c.fillStyle='#ffffff28';c.beginPath();c.ellipse(x-radius*.18,y-radius*.43,radius*.49,radius*.19,-.25,0,TAU);c.fill();
  }
  pathCircle(c,x,y,radius-1);c.strokeStyle='#ffffff64';c.lineWidth=2;c.stroke();
  if(showName)text(c,entry.name,x,y+(asset?.ready?radius*.46:2),Math.max(14,radius*.45),{width:radius*1.72,outline:4});
 }

 crown(x,y,radius){
  const c=this.context,scale=radius*.46;
  c.fillStyle='#ffcf57';c.beginPath();
  c.moveTo(x-scale,y);c.lineTo(x-scale*1.15,y-scale*.72);c.lineTo(x-scale*.42,y-scale*.39);
  c.lineTo(x,y-scale);c.lineTo(x+scale*.42,y-scale*.39);c.lineTo(x+scale*1.15,y-scale*.72);
  c.lineTo(x+scale,y);c.closePath();c.fill();
 }

 draw(sim){
  const c=this.context,a=this.appearance,{royale,gate,halfGap,time,winner,finishedAt}=sim;
  const {arenaRadius,competitors,ringColor,gateColor,showNames,showEliminations}=royale;
  if(this.roster!==competitors)this.prepareIcons(competitors);
  this.clear();
  c.strokeStyle=ringColor;c.lineWidth=a.lineWidth;c.lineCap='round';
  c.shadowColor=ringColor;c.shadowBlur=a.glow*10;
  c.beginPath();
  if(gate.open&&winner===null)c.arc(CX,CY,arenaRadius,gate.angle+halfGap,gate.angle+TAU-halfGap);
  else c.arc(CX,CY,arenaRadius,0,TAU);
  c.stroke();c.shadowBlur=0;
  if(!gate.open||winner!==null){
   c.beginPath();c.arc(CX,CY,arenaRadius,gate.angle-halfGap,gate.angle+halfGap);
   c.strokeStyle=gateColor;c.stroke();
  }

  for(const ball of sim.balls){
   const entry=competitors[ball.id],age=ball.alive?0:time-ball.eliminatedAt;
   if(age>.42)continue;
   let x=CX+ball.x+ball.vx*age,y=CY+ball.y+ball.vy*age,radius=ball.radius;
   if(a.trail&&ball.alive&&winner===null){
    for(const [index,point] of ball.trail.entries()){
     const phase=(index+1)/ball.trail.length;
     c.globalAlpha=.14*phase;c.fillStyle=entry.color;
     pathCircle(c,CX+point.x,CY+point.y,radius*.7);c.fill();
    }
   }
   c.globalAlpha=clamp(1-age/.42);
   if(winner===ball.id){
    const progress=clamp((time-finishedAt)/.95),ease=progress*progress*(3-2*progress);
    x+=(CX-x)*ease;y+=(CY-y)*ease;radius*=1+.46*ease;
   }
   this.paintBall(entry,x,y,radius,showNames);
   if(winner===ball.id)this.crown(x,y-radius-8,radius);
   c.globalAlpha=1;
  }

  if(a.particles)for(const [index,p] of sim.particles.entries()){
   const age=time-p.time;
   if(age>=p.life)continue;
   const x=CX+p.x+p.vx*age,y=CY+p.y+p.vy*age+165*age*age;
   c.save();c.translate(x,y);c.rotate(p.angle+age*3);
   c.globalAlpha=clamp((p.life-age)*3);c.fillStyle=p.life>1?CONFETTI[index%CONFETTI.length]:competitors[p.owner].color;
   c.fillRect(-p.size/2,-p.size/3,p.size,p.size*.64);c.restore();
  }

  this.labels(a.title,null,0);
  const hudY=a.showTitle&&a.title.split('\n').length>2?472:424;
  if(winner!==null){
   const entry=competitors[winner];
   text(c,`${entry.name.toUpperCase()} WINS!`,CX,hudY+5,76,{color:entry.color,outline:7});
  }else{
   if(a.showCounter){
    text(c,String(sim.remaining),CX,hudY,72);
    text(c,'LEFT',CX,hudY+52,22,{weight:650,color:'#bcc1c6'});
   }
   if(showEliminations)sim.eliminations.slice(-2).reverse().forEach((out,index)=>{
    if(time-out.time>2.9)return;
    const entry=competitors[out.id];
    c.globalAlpha=clamp((2.9-(time-out.time))*2);
    text(c,`×  ${entry.name}`,58,510+index*36,26,{align:'left',color:entry.color,width:250,outline:4});
    c.globalAlpha=1;
   });
   if(a.showTitle&&time<1.22){
    c.globalAlpha=clamp((1.22-time)*3);
    text(c,`${competitors.length} PLAYERS`,CX,CY-8,78,{outline:10});
    c.globalAlpha=1;
   }
  }
 }
}
