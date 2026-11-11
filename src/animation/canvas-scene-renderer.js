import {WIDTH,HEIGHT} from './simulation.js';
import {paletteColors} from './palette.js';

export const CX=WIDTH/2,CY=HEIGHT/2;

export class CanvasSceneRenderer {
 constructor(canvas){
  this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});
  this.capturing=false;
  this.observer=new ResizeObserver(()=>this.resizePreview());
  this.observer.observe(canvas);
  this.resizePreview();
 }

 resizePreview(){
  if(this.capturing)return;
  const {width}=this.canvas.getBoundingClientRect();
  const pixels=Math.min(WIDTH,Math.max(9,Math.round((width||540)*Math.min(2,window.devicePixelRatio||1))));
  this.setSize(pixels,Math.round(pixels*HEIGHT/WIDTH));
 }
 setSize(width,height){
  if(this.canvas.width!==width||this.canvas.height!==height){
   this.canvas.width=width;this.canvas.height=height;
  }
 }
 beginCapture(width,height){this.capturing=true;this.setSize(width,height);}
 endCapture(){this.capturing=false;this.resizePreview();}
 dispose(){this.observer.disconnect();}
 setAppearance(appearance){this.appearance=appearance;this.colors=paletteColors(appearance);}

 clear(){
  const c=this.context;
  c.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);
  c.fillStyle=this.appearance.background;c.fillRect(0,0,WIDTH,HEIGHT);
 }
 labels(title,counter,counterY){
  const c=this.context,a=this.appearance;
  c.fillStyle='#fff';c.strokeStyle='#000';c.lineJoin='round';c.lineWidth=6;
  c.textAlign='center';c.textBaseline='middle';
  const text=(value,y,size,weight='800')=>{
   c.font=`${weight} ${size}px system-ui`;c.strokeText(value,CX,y,WIDTH-120);c.fillText(value,CX,y,WIDTH-120);
  };
  if(a.showTitle)title.split('\n').slice(0,3).forEach((line,index)=>text(line,277+index*65,55));
  if(a.showCounter&&counter)text(counter,counterY,35,'650');
  if(a.handle)text(a.handle,HEIGHT-114,30,'500');
 }
}
