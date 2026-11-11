import {MULTIPLIER_RANGES,ROYALE_RANGES,SPIKE_RANGES,TIMED_ESCAPE_RANGES} from '../config.js';

export const $=selector=>document.querySelector(selector);
const paths={
 undo:'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',redo:'m15 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12',download:'M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4',upload:'M12 16V4m-4 4 4-4 4 4M5 16v4h14v-4',bookmark:'M6 3h12v18l-6-4-6 4V3Z',help:'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',music:'M9 18V5l11-2v13M9 5l11-2M9 17c0 2-6 4-6 1s6-4 6-1Zm11-2c0 2-6 4-6 1s6-4 6-1Z',video:'M3 5h18v14H3V5Zm4 0v14m10-14v14',film:'M3 4h18v16H3V4Zm4 0v16m10-16v16M3 8h4m10 0h4M3 16h4m10 0h4',check:'m5 12 4 4L19 6',play:'m8 5 11 7-11 7V5Z',pause:'M8 5v14M16 5v14',replay:'M4 10a8 8 0 1 1 0 5M4 4v6h6',volume:'m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',camera:'M3 7h4l2-3h6l2 3h4v13H3V7Zm13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',shuffle:'M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 3M3 19h3c2 0 3-2 4-4m4-6c2-3 2-4 4-4h3m-4-3 4 3-4 4',close:'m6 6 12 12M18 6 6 18',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.help}"/></svg>`;}
export function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(element=>{element.innerHTML=icon(element.dataset.icon);});}
export const timeLabel=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function toast(message){const element=$('#toast');element.textContent=message;element.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{element.hidden=true;},4500);}
export const rangeDefinitions=[
 ['scene-ranges','appearance.glow','Glow intensity',0,1,.05,'percent'],['scene-ranges','appearance.lineWidth','Ring thickness',1,7,.5,'px'],
 ['motion-ranges','physics.ballSpeed','Ball speed',.25,3,.05,'times'],['motion-ranges','physics.rotationSpeed','Ring rotation speed',0,4,.05,'times'],['motion-ranges','physics.shrinkSpeed','Ring shrink speed',0,4,.05,'times'],['shrink-ranges','physics.shrinkStopTime','Stop shrinking after',0,120,.5,'stop-time'],['shrink-ranges','physics.shrinkStopRadius','Minimum inner radius',40,300,1,'px'],['motion-ranges','physics.ringCount','Number of rings',10,100,1,'number'],['advanced-ranges','physics.ballRadius','Ball size',8,36,1,'px'],['advanced-ranges','physics.gapAngle','Gap width',25,100,.1,'degrees'],['advanced-ranges','physics.gravity','Gravity',0,500,10,'number'],['advanced-ranges','physics.bounciness','Bounce response',.85,1.08,.01,'times'],
 ['audio-ranges','sound.master','Master volume',0,1,.05,'percent'],['audio-ranges','sound.musicVolume','Melody volume',0,1,.05,'percent'],['audio-ranges','sound.impactVolume','Impact volume',0,1,.05,'percent'],['audio-ranges','sound.bedVolume','Background volume',0,1,.05,'percent'],['audio-ranges','sound.reverb','Reverb',0,1,.05,'percent'],
];
export function valueLabel(value,type){return type==='seconds'?`${value} s`:type==='stop-time'?(value===0?'No time limit':`${value} s`):type==='percent-value'?`${value}%`:type==='percent'?`${Math.round(value*100)}%`:type==='times'?(value===0?'Stopped':`${value.toFixed(2)}×`):type==='degrees-per-second'?`${value}°/s`:type==='degrees'?`${Number(value.toFixed(1))}°`:type==='px'?`${value} px`:String(value);}
export function clampControlValue(raw,min,max,step){
 if(String(raw).trim()===''||!Number.isFinite(Number(raw)))return null;
 const value=Math.max(min,Math.min(max,Number(raw))),snapped=min+Math.round((value-min)/step)*step;
 return Number(Math.max(min,Math.min(max,snapped)).toFixed(8));
}
export function controlDefinitions(mode='ring-escape'){
 const growing=mode==='growing-ball',wars=mode==='string-wars',crash=mode==='rainbow-crash',timed=mode==='timed-escape',multiplier=mode==='ball-multiplier',spike=mode==='spike-melody',royale=mode==='circle-royale';
 const crashControls=[
  ['motion-ranges','physics.ballSpeed','Starting speed',.25,3,.05,'times'],
  ['motion-ranges','crash.growth','Growth per bounce',1,20,.5,'px'],
  ['motion-ranges','crash.acceleration','Speed gain per bounce',0,20,.5,'percent-value'],
  ['advanced-ranges','physics.ballRadius','Starting ball size',8,36,1,'px'],
  ['advanced-ranges','physics.gravity','Gravity',0,500,10,'number'],
  ['advanced-ranges','crash.arenaRadius','Arena radius',300,490,5,'px'],
  ['scene-ranges','crash.colorCycle','Trail color cycle',.1,2,.05,'number'],
  ['scene-ranges','appearance.lineWidth','Trail line width',1,7,.5,'px'],
  ...rangeDefinitions.filter(def=>def[0]==='audio-ranges'),
 ];
 const timedControls=[
  ['motion-ranges','timedEscape.attemptSeconds','Time per ball',...TIMED_ESCAPE_RANGES.attemptSeconds,.25,'seconds'],
  ...rangeDefinitions.filter(d=>['physics.ballSpeed','physics.ballRadius','physics.gravity','appearance.glow','appearance.lineWidth'].includes(d[1])||d[1].startsWith('sound.')),
  ['motion-ranges','physics.gapAngle','Gap width',25,100,1,'degrees'],
  ['advanced-ranges','timedEscape.gapPosition','Gap position',...TIMED_ESCAPE_RANGES.gapPosition,1,'degrees'],
  ['advanced-ranges','timedEscape.arenaRadius','Ring radius',...TIMED_ESCAPE_RANGES.arenaRadius,5,'px'],
 ];
 const multiplierControls=[
  ['motion-ranges','multiplier.children','New balls per escape',...MULTIPLIER_RANGES.children,1,'number'],
  ...rangeDefinitions.filter(d=>['physics.ballSpeed','physics.ballRadius','physics.gravity','physics.rotationSpeed','physics.gapAngle','appearance.glow','appearance.lineWidth'].includes(d[1])||d[1].startsWith('sound.')),
  ['advanced-ranges','multiplier.arenaRadius','Ring radius',...MULTIPLIER_RANGES.arenaRadius,5,'px'],
  ['advanced-ranges','multiplier.maxBalls','Maximum balls inside',...MULTIPLIER_RANGES.maxBalls,1,'number'],
 ];
 const spikeControls=[
  ...rangeDefinitions.filter(d=>['physics.ballSpeed','physics.ballRadius','physics.gravity','appearance.glow','appearance.lineWidth'].includes(d[1])||d[1].startsWith('sound.')),
  ['motion-ranges','physics.gapAngle','Gap width',25,100,.1,'degrees'],
  ['motion-ranges','spike.spikeCount','Number of spikes',...SPIKE_RANGES.spikeCount,1,'number'],
  ['advanced-ranges','spike.spikeDepth','Spike depth',...SPIKE_RANGES.spikeDepth,1,'px'],
  ['advanced-ranges','spike.gapPosition','Gap position',...SPIKE_RANGES.gapPosition,1,'degrees'],
  ['advanced-ranges','spike.arenaRadius','Ring radius',...SPIKE_RANGES.arenaRadius,5,'px'],
 ];
 const royaleControls=[
  ...rangeDefinitions.filter(d=>['physics.ballSpeed','physics.gravity','appearance.glow','appearance.lineWidth'].includes(d[1])||d[1].startsWith('sound.')),
  ['motion-ranges','physics.rotationSpeed','Gate rotation speed',0,4,.05,'times'],
  ['motion-ranges','physics.gapAngle','Gate width',25,100,.1,'degrees'],
  ['motion-ranges','royale.gateCycle','Gate cycle',...ROYALE_RANGES.gateCycle,.1,'seconds'],
  ['motion-ranges','royale.openPercent','Gate open time',...ROYALE_RANGES.openPercent,1,'percent-value'],
  ['advanced-ranges','royale.arenaRadius','Arena radius',...ROYALE_RANGES.arenaRadius,5,'px'],
  ['advanced-ranges','royale.ballRadius','Ball size',...ROYALE_RANGES.ballRadius,1,'px'],
 ];
 const definitions=royale?royaleControls:spike?spikeControls:multiplier?multiplierControls:timed?timedControls:crash?crashControls:wars?[...rangeDefinitions.filter(d=>['physics.ballSpeed','physics.ballRadius','physics.gravity','appearance.lineWidth'].includes(d[1])||d[1].startsWith('sound.')).map(d=>d[1]==='appearance.lineWidth'?[d[0],d[1],'Boundary thickness',...d.slice(3)]:d),['motion-ranges','war.initialStrings','Starting strings per ball',1,40,1,'number'],['motion-ranges','war.stringsPerBounce','Strings per bounce',1,6,1,'number'],['advanced-ranges','war.maxStrings','Maximum strings per ball',5,60,1,'number'],['advanced-ranges','war.arenaRadius','Circle size',280,480,10,'px'],['motion-ranges','war.showdownPercent','Showdown starts at',20,90,1,'percent-value'],['motion-ranges','war.showdownSpeed','Showdown speed boost',1,3,.1,'times'],['scene-ranges','war.stringOpacity','String visibility',.1,1,.05,'percent']]:growing?[...rangeDefinitions.filter(d=>!['physics.rotationSpeed','physics.shrinkSpeed','physics.shrinkStopTime','physics.shrinkStopRadius','physics.ringCount','physics.gapAngle','appearance.glow'].includes(d[1])).map(d=>d[1]==='appearance.lineWidth'?[d[0],d[1],'Boundary thickness',...d.slice(3)]:d[1]==='physics.ballRadius'?[d[0],d[1],'Starting ball size',...d.slice(3)]:d),['motion-ranges','growth.perBounce','Manual growth per bounce',.1,50,.1,'px'],['advanced-ranges','growth.arenaRadius','Circle size',280,480,10,'px'],['scene-ranges','growth.hueSpeed','Color cycle speed',0,120,1,'degrees-per-second'],['advanced-ranges','growth.rayCount','Maximum impact lines',20,400,10,'number']]:rangeDefinitions;
 const toggles=[
  ['text-toggles','appearance.showTitle','Show title'],
  ['text-toggles','appearance.showCounter',royale?'Show survivor count':spike?'Show stuck ball count':multiplier?'Show ball count':timed?'Show countdown':(growing||crash)?'Show bounce counter':'Show ring counter'],
  ['scene-toggles','appearance.trail','Motion trail'],
  ['scene-toggles','appearance.particles',royale?'Elimination and winner particles':(spike||timed)?'Escape sparks':wars?'String-cut particles':growing?'Bounce sparks':'Ring particles'],
  ['motion-toggles','physics.reverseOnPass','Reverse rotation after each escape'],
  ['audio-toggles','sound.enabled','Include audio in export'],
 ];
 const hidden=new Set();
 if(multiplier)for(const path of ['appearance.particles','appearance.trail','physics.reverseOnPass'])hidden.add(path);
 if(timed||spike||royale)hidden.add('physics.reverseOnPass');
 if(wars)hidden.add('appearance.showCounter');
 if(crash){hidden.add('appearance.particles');hidden.add('physics.reverseOnPass');}
 if(royale)toggles.push(['text-toggles','royale.showNames','Show ball names'],['text-toggles','royale.showEliminations','Show recent eliminations']);
 if(crash)toggles.push(['scene-toggles','crash.rainbow','Rainbow trail'],['scene-toggles','crash.fadeOut','Blackout finish']);
 if(multiplier)toggles.push(['scene-toggles','multiplier.rainbow','Rainbow ring and balls']);
 if(timed)toggles.push(['scene-toggles','timedEscape.rainbow','Rainbow ring']);
 if(wars)toggles.push(['motion-toggles','war.ballCollisions','Balls collide with each other']);
 if(growing)toggles.push(['scene-toggles','growth.rainbow','Rainbow color cycle'],['scene-toggles','growth.showRays','Impact lines']);
 return {ranges:definitions,toggles:toggles.filter(([,path])=>!hidden.has(path))};
}
