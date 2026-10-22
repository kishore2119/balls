import {Simulation} from './simulation.js';
import {OrbitRenderer} from './renderer.js';
import {createProject,THEMES} from './config.js';
export function startDemo(canvas,onStatus){
 canvas.hidden=false;
 const project=createProject(),simulation=new Simulation(project.seed,{...project.physics,ringCount:28,ballRadius:28,ballSpeed:.65,shrinkSpeed:1.5}),renderer=new OrbitRenderer(canvas);
 renderer.arena.scale.setScalar(.55);
 let appearance={...project.appearance,title:'',showTitle:false,handle:'',lineWidth:6,glow:.7},playing=!matchMedia('(prefers-reduced-motion:reduce)').matches,visible=true,last=null,frameId=0,disposed=false;
 renderer.setAppearance(appearance);simulation.seek(1.6);renderer.draw(simulation);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=null;});observer.observe(canvas);
 const visibility=()=>{last=null;};document.addEventListener('visibilitychange',visibility);
 function frame(timestamp){
  if(disposed)return;
  if(visible&&!document.hidden){if(playing&&last!==null){simulation.advance(Math.min(.1,(timestamp-last)/1000));if(simulation.time>6||simulation.remaining===0)simulation.reset();}renderer.draw(simulation);onStatus(`${simulation.remaining} rings · live preview`);last=timestamp;}else last=null;
  frameId=requestAnimationFrame(frame);
 }
 frameId=requestAnimationFrame(frame);
 return {
  get playing(){return playing;},
  toggle(){playing=!playing;last=null;return playing;},
  setTheme(index){const theme=THEMES[index]||THEMES[0];appearance={...appearance,startColor:theme.startColor,endColor:theme.endColor,colors:[theme.startColor,theme.endColor],background:theme.background};renderer.setAppearance(appearance);renderer.draw(simulation);},
  dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.resizeObserver.disconnect();renderer.renderer.dispose();},
 };
}
