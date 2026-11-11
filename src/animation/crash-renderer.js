import {WIDTH,HEIGHT,TAU} from './simulation.js';
import {blendColor,paletteColors} from './palette.js';

const CX=WIDTH/2,CY=HEIGHT/2;
const circle=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,TAU);};
const clamp=x=>Math.max(0,Math.min(1,x));

export class CrashRenderer {
 constructor(canvas){
  this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});
  this.layer=document.createElement('canvas');this.ink=this.layer.getContext('2d',{alpha:false});
  this.capture=false;this.stamped=0;this.source=null;
  this.observer=new ResizeObserver(()=>this.resizePreview());this.observer.observe(canvas);
  this.resizePreview();
 }
 setSize(width,height){
  if(this.layer.width===width&&this.layer.height===height)return;
  this.canvas.width=this.layer.width=width;this.canvas.height=this.layer.height=height;
  this.source=null;
 }
 resizePreview(){
  if(this.capture)return;
  const scale=Math.min(2,window.devicePixelRatio||1),rect=this.canvas.getBoundingClientRect();
  const width=Math.min(WIDTH,Math.max(9,Math.round((rect.width||540)*scale)));
  this.setSize(width,Math.round(width*HEIGHT/WIDTH));
 }
 beginCapture(width=WIDTH,height=HEIGHT){this.capture=true;this.setSize(width,height);}
 endCapture(){this.capture=false;this.resizePreview();}
 dispose(){this.observer.disconnect();this.layer.width=this.layer.height=1;}
 setAppearance(appearance){
  this.appearance={...appearance};this.source=null;
  const colors=paletteColors(appearance);
  this.palette=Array.from({length:360},(_,i)=>appearance.gradient?blendColor(colors,i/359):colors[Math.floor(i/360*colors.length)]);
  this.rainbow=Array.from({length:360},(_,i)=>`hsl(${i} 100% 53%)`);
 }
 transform(ctx){ctx.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);}
 draw(sim){
  const {context:c,ink,appearance:a}=this,{crash}=sim;
  const R=crash.arenaRadius,styleKey=[R,crash.arenaColor,crash.rainbow,crash.colorCycle,a.trail].join('/');
  const colors=crash.rainbow?this.rainbow:this.palette;
  if(this.source!==sim.trail||this.styleKey!==styleKey){
   this.transform(ink);ink.fillStyle=a.background;ink.fillRect(0,0,WIDTH,HEIGHT);
   circle(ink,CX,CY,R);ink.fillStyle=crash.arenaColor;ink.fill();
   this.source=sim.trail;this.styleKey=styleKey;this.stamped=0;
  }
  if(a.trail&&this.stamped<sim.trail.length){
   this.transform(ink);ink.save();circle(ink,CX,CY,R);ink.clip();ink.lineWidth=a.lineWidth;
   for(;this.stamped<sim.trail.length;this.stamped++){
    const point=sim.trail[this.stamped];
    const hue=Math.floor((point.distance*crash.colorCycle+point.time*18)%360);
    circle(ink,CX+point.x,CY+point.y,point.radius);
    ink.fillStyle='#05050820';ink.fill();ink.strokeStyle=colors[hue];ink.stroke();
   }
   ink.restore();
  }
  this.transform(c);
  c.drawImage(this.layer,0,0,WIDTH,HEIGHT);
  const phase=sim.finishedAt===null?0:clamp((sim.time-sim.finishedAt)/.62);
  const expand=crash.fadeOut?phase*phase*(3-2*phase):0;
  if(expand<1){
   const {x,y,radius}=sim.ball;
   circle(c,CX+x*(1-expand),CY+y*(1-expand),radius+(R-radius)*expand);
   c.fillStyle=a.ballColor;c.fill();
   if(crash.fadeOut&&phase>.6){
    c.globalAlpha=clamp((phase-.6)/.4);c.fillStyle=a.background;c.fillRect(0,CY-R-2,WIDTH,R*2+4);c.globalAlpha=1;
   }
  }else{c.fillStyle=a.background;c.fillRect(0,CY-R-2,WIDTH,R*2+4);}
  c.fillStyle='#fff';c.strokeStyle='#000';c.lineJoin='round';c.lineWidth=7;c.textAlign='center';c.textBaseline='middle';
  const text=(value,y,size,weight='800')=>{c.font=`${weight} ${size}px system-ui`;c.strokeText(value,CX,y,WIDTH-100);c.fillText(value,CX,y,WIDTH-100);};
  if(a.showTitle)a.title.split('\n').slice(0,3).forEach((line,i)=>text(line,276+i*65,55));
  if(a.showCounter)text(`${sim.bounceCount} bounces`,CY+R+88,38,'650');
  if(a.handle)text(a.handle,HEIGHT-114,30,'500');
 }
}

