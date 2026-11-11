import {Simulation} from '../animation/simulation.js';
import {OrbitRenderer} from '../animation/renderer.js';
import {createProject} from '../config.js';
import {randomizePath} from '../studio/random-path.js';
export function startDemo(canvas,onStatus){
 canvas.hidden=false;
 const project=createProject();randomizePath(project);
 const simulation=new Simulation(project.seed,{...project.physics,ringCount:28,ballRadius:28,ballSpeed:.65,shrinkSpeed:1.5}),renderer=new OrbitRenderer(canvas);
 renderer.arena.scale.setScalar(.55);
 const palettes=[['#e0c59c','#c99161','#b95d38'],['#eee9d9','#b7b9ab','#7c8478'],['#b8d5c5','#76aaa0','#487b73']];
 let appearance={...project.appearance,title:'',showTitle:false,handle:'',lineWidth:6,glow:0,background:'#111514',gradient:false},playing=!matchMedia('(prefers-reduced-motion:reduce)').matches,visible=true,last=null,frameId=0,disposed=false;
 renderer.setAppearance(appearance);simulation.seek(1.6);renderer.draw(simulation);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=null;});observer.observe(canvas);
 const visibility=()=>{last=null;};document.addEventListener('visibilitychange',visibility);
 function frame(timestamp){
  if(disposed)return;
  if(visible&&!document.hidden){if(playing&&last!==null){simulation.advance(Math.min(.1,(timestamp-last)/1000));if(simulation.time>6||simulation.remaining===0){randomizePath(project);simulation.reset(project.seed);}}renderer.draw(simulation);onStatus(`${simulation.remaining} rings remaining`);last=timestamp;}else last=null;
  frameId=requestAnimationFrame(frame);
 }
 frameId=requestAnimationFrame(frame);
 return {
  get playing(){return playing;},
  toggle(){playing=!playing;last=null;return playing;},
  setTheme(index){const colors=palettes[index]||palettes[0];appearance={...appearance,startColor:colors[0],endColor:colors.at(-1),colors};renderer.setAppearance(appearance);renderer.draw(simulation);},
  dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.dispose();},
 };
}
