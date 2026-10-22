import {Simulation,collectEvents} from './simulation.js';
import {OrbitRenderer} from './renderer.js';
import {createProject,sanitizeProject,THEMES} from './config.js';
import {PreviewAudio,renderSound} from './audio.js';
import {parseMidi} from './midi.js';
import {PlaybackClock} from './playback-clock.js';
import {paletteColors,resizePalette,segmentCounts} from './palette.js';
import * as storage from './storage.js';
import {$,icon,hydrateIcons,buildControls,valueLabel,timeLabel,toast} from './ui.js';

buildControls();hydrateIcons();
let project=storage.loadCurrent()||createProject();
let simulation=new Simulation(project.seed,project.physics);
const canvas=$('#animation'),renderer=new OrbitRenderer(canvas),audio=new PreviewAudio(),clock=new PlaybackClock();
let playing=true,monitor=false,exporting=false,soundRevision=0,soundCache=null,saveTimer,syncTimer,worker=null,exportController=null;
let saveDirty=false;const decodedAssets=new Map(),exports=[];
function cancelSearch(){if(worker){worker.terminate();worker=null;document.querySelector('#find-ending').innerHTML=icon('sparkles')+'Find an ending';}}
renderer.setAppearance(project.appearance);
const numericPaths=new Set(['physics.direction','export.duration','export.fps','export.resolution']);
function persist(){saveDirty=true;clearTimeout(saveTimer);$('#save-state').textContent='Saving…';saveTimer=setTimeout(()=>{try{storage.saveCurrent(project);saveDirty=false;$('#save-state').innerHTML='<i></i> Saved on this device';}catch{toast('Browser storage is full. Download your project JSON to keep these settings.');$('#save-state').textContent='Not saved';}},350);}
function syncFields(){
 for(const field of document.querySelectorAll('[data-setting]')){const [section,key]=field.dataset.setting.split('.'),value=project[section][key];if(field.type==='checkbox')field.checked=value;else field.value=String(value);if(field.type==='range'){const label=valueLabel(value,field.dataset.display);document.querySelector(`[data-output="${field.dataset.setting}"]`).textContent=label;field.setAttribute('aria-valuetext',label);}}
 syncPalette();const fitRadius=Math.ceil(Math.max(project.physics.shrinkStopRadius,(project.physics.ballRadius+3)/Math.sin(project.physics.gapAngle*Math.PI/360)*1.15));$('#shrink-hint').textContent=`${project.physics.shrinkStopTime?`Shrinking ends at ${project.physics.shrinkStopTime}s.`:'No time limit.'} At ${fitRadius} px, shrinking pauses until the ball leaves the innermost ring, then continues.`;
 $('#project-name').value=project.name;$('#seed-label').textContent=`SCENARIO #${project.seed}`;$('#timeline').max=project.export.duration;$('#duration-label').textContent=timeLabel(project.export.duration);$('#export-pixels').textContent=`${project.export.resolution} × ${project.export.resolution*16/9}`;$('#audio-summary').textContent=project.sound.enabled?'Synchronized audio included':'Silent video';
 $('#midi-name').textContent=project.sound.midiNotes.length?`${project.sound.midiNotes.length} imported MIDI notes · one per collision`:'Each collision plays the next note.';
 for(const button of document.querySelectorAll('.theme-swatch')){const theme=THEMES[Number(button.dataset.theme)];button.setAttribute('aria-pressed',String(theme.startColor===project.appearance.startColor&&theme.endColor===project.appearance.endColor));}
}
function syncPalette(){
 const colors=paletteColors(project.appearance),container=$('#palette-colors'),counts=segmentCounts(project.physics.ringCount,colors.length);
 $('#color-count').value=colors.length;$('#color-count-label').textContent=colors.length;$('#palette-gradient').checked=project.appearance.gradient;
 if(container.children.length!==colors.length){container.replaceChildren();colors.forEach((color,index)=>{const label=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input');input.type='color';input.dataset.color=index;input.setAttribute('aria-label',`Ring color ${index+1}`);input.addEventListener('input',()=>{if(exporting)return;project.appearance.colors[index]=input.value;updatePalette();});label.append(caption,input);container.append(label);});}
 [...container.children].forEach((label,index)=>{label.firstChild.textContent=`Color ${index+1}`;label.lastChild.value=colors[index];label.title=`${counts[index]} rings in solid mode`;});
 $('#palette-description').textContent=project.appearance.gradient?'Colors blend from the innermost ring to the outermost.':counts.every(n=>n===counts[0])?`${counts[0]} rings per color · inner to outer`:`Rings per color: ${counts.join(' / ')} · inner to outer`;
}
function updatePalette(){project.appearance.startColor=project.appearance.colors[0];project.appearance.endColor=project.appearance.colors.at(-1);renderer.setAppearance(project.appearance);syncFields();persist();renderer.draw(simulation);}
$('#color-count').addEventListener('input',()=>{if(exporting)return;project.appearance.colors=resizePalette(paletteColors(project.appearance),Number($('#color-count').value));updatePalette();});
$('#palette-gradient').addEventListener('input',()=>{if(exporting)return;project.appearance.gradient=$('#palette-gradient').checked;updatePalette();});
function previewButtons(){const button=$('#play-preview');button.setAttribute('aria-label',playing?'Pause preview':'Play preview');button.innerHTML=icon(playing?'pause':'play');$('#monitor-label').textContent=monitor?'Audio on':'Enable audio';$('#monitor').classList.toggle('active',monitor);}
function stopSound(){soundRevision++;audio.stop();$('#loading-overlay').hidden=true;}
async function decode(id){if(!id)return null;if(decodedAssets.has(id))return decodedAssets.get(id);const asset=await storage.getAsset(id);if(!asset)throw new Error('An uploaded sound is missing on this device. Upload it again or choose a built-in sound.');const buffer=await audio.decode(asset.blob);decodedAssets.set(id,buffer);return buffer;}
async function soundFor(snapshot){
 if(!snapshot.sound.enabled)return {buffer:null,events:[]};
 const key=JSON.stringify([snapshot.seed,snapshot.physics,snapshot.sound,snapshot.export.duration]);
 if(soundCache?.key===key)return soundCache.promise;
 const promise=(async()=>{const assets={};if(snapshot.sound.impact==='sample'&&snapshot.sound.impactAsset)assets.impact=await decode(snapshot.sound.impactAsset);if(snapshot.sound.bedAsset)assets.bed=await decode(snapshot.sound.bedAsset);const timeline=collectEvents(snapshot.seed,snapshot.physics,snapshot.export.duration);return {buffer:await renderSound(snapshot,timeline.events,assets),events:timeline.events};})();
 soundCache={key,promise};promise.catch(()=>{if(soundCache?.key===key)soundCache=null;});return promise;
}
async function syncSound(){
 clearTimeout(syncTimer);stopSound();if(!monitor||!playing||exporting)return;const revision=soundRevision;$('#loading-overlay').hidden=false;
 try{const previewProject=structuredClone(project);previewProject.sound.enabled=true;const {buffer}=await soundFor(previewProject);if(revision!==soundRevision||!monitor||!playing||exporting)return;await audio.play(buffer,simulation.time%project.export.duration);}catch(error){if(revision===soundRevision){monitor=false;previewButtons();toast(error.message);}}finally{if(revision===soundRevision)$('#loading-overlay').hidden=true;}
}
function scheduleSound(){stopSound();clearTimeout(syncTimer);if(monitor)syncTimer=setTimeout(syncSound,180);}
function apply(section,key,value){
 if(exporting)return;
 const previous=project[section][key];project[section][key]=value;
 try{
  if(section==='physics'){cancelSearch();simulation.setSettings(project.physics);simulation.reset(project.seed);clock.reset();scheduleSound();}
  if(section==='appearance')renderer.setAppearance(project.appearance);
  if(section==='sound')scheduleSound();
  if(section==='export'&&key==='duration'){cancelSearch();simulation.reset(project.seed);clock.reset();scheduleSound();}
  syncFields();persist();renderer.draw(simulation);
 }catch(error){project[section][key]=previous;syncFields();toast(error.message);}
}
for(const field of document.querySelectorAll('[data-setting]'))field.addEventListener('input',event=>{const [section,key]=field.dataset.setting.split('.');const value=field.type==='checkbox'?field.checked:field.type==='range'||numericPaths.has(field.dataset.setting)?Number(field.value):field.value;apply(section,key,value);});
for(const [index,theme]of THEMES.entries()){const button=document.createElement('button');button.className='theme-swatch';button.dataset.theme=index;button.title=theme.name;button.setAttribute('aria-label',`${theme.name} color theme`);button.style.background=`linear-gradient(135deg,${theme.startColor},${theme.endColor})`;button.addEventListener('click',()=>{Object.assign(project.appearance,{startColor:theme.startColor,endColor:theme.endColor,colors:resizePalette([theme.startColor,theme.endColor],project.appearance.colors.length),background:theme.background});renderer.setAppearance(project.appearance);syncFields();persist();});$('#theme-grid').append(button);}
function showTab(name){for(const button of document.querySelectorAll('[data-tab]')){const active=button.dataset.tab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}for(const panel of document.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==name;$('.panel-scroll').scrollTop=0;if(name==='saved')renderPresets();}
for(const tab of document.querySelectorAll('[data-tab]')){tab.addEventListener('click',()=>showTab(tab.dataset.tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],index=tabs.indexOf(tab),next=tabs[(index+(event.key==='ArrowRight'?1:3))%4];showTab(next.dataset.tab);next.focus();});}
function setPlaying(value){playing=value;clock.reset();if(!playing)stopSound();else syncSound();previewButtons();}
$('#play-preview').addEventListener('click',()=>setPlaying(!playing));
function replay(){stopSound();simulation.reset(project.seed);clock.reset();playing=true;previewButtons();syncSound();}
$('#replay').addEventListener('click',replay);
$('#new-scenario').addEventListener('click',()=>{cancelSearch();project.seed=crypto.getRandomValues(new Uint32Array(1))[0];replay();syncFields();persist();});
$('#monitor').addEventListener('click',async()=>{if(monitor){monitor=false;stopSound();previewButtons();return;}try{await audio.ensure();monitor=true;previewButtons();await syncSound();}catch(error){toast(error.message);}});
$('#timeline').addEventListener('input',()=>{stopSound();simulation.seek(Number($('#timeline').value));renderer.draw(simulation);clock.reset();$('#time-label').textContent=timeLabel(simulation.time);});
$('#timeline').addEventListener('change',()=>{if(playing)syncSound();});
$('#safe-toggle').addEventListener('change',()=>{$('#safe-guide').hidden=!$('#safe-toggle').checked;});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#artboard').requestFullscreen();}catch{toast('Fullscreen is not available here.');}});
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
const fileName=()=>project.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'orbit-escape';
$('#snapshot').addEventListener('click',()=>{if(exporting)return;renderer.beginCapture();renderer.draw(simulation);canvas.toBlob(blob=>{renderer.endCapture();renderer.draw(simulation);if(blob)download(blob,`${fileName()}.png`);},'image/png');});
$('#project-name').addEventListener('input',()=>{project.name=$('#project-name').value.slice(0,80)||'Untitled escape';persist();});
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>document.getElementById(button.dataset.close).close());
$('#result-dialog').addEventListener('close',()=>$('#result-video').pause());
$('#save-button').addEventListener('click',()=>{$('#preset-name').value=project.name;$('#save-dialog').showModal();});
$('#save-form').addEventListener('submit',event=>{if(event.submitter?.value!=='save')return;event.preventDefault();try{const name=$('#preset-name').value.trim();if(!name)return;storage.savePreset(project,name);$('#save-dialog').close();renderPresets();toast('Preset saved on this device.');}catch{toast('Could not save this preset. Download the project JSON instead.');}});
function presetArt(appearance){const art=document.createElement('div');art.className='preset-art';art.style.background=`repeating-radial-gradient(circle,transparent 0 3px,${appearance.startColor} 3px 4px,transparent 4px 6px),${appearance.background}`;return art;}
function renderPresets(){const list=$('#preset-list');list.replaceChildren();const presets=storage.presets();if(!presets.length){const empty=document.createElement('div');empty.className='empty-state';empty.innerHTML=icon('bookmark')+'<p>Your next great idea belongs here.</p><small>Use Save preset to keep a favorite setup.</small>';list.append(empty);return;}for(const entry of presets){const card=document.createElement('div');card.className='preset-card';card.append(presetArt(entry.project.appearance));const load=document.createElement('button');load.className='load';const name=document.createElement('strong'),detail=document.createElement('small');name.textContent=entry.name;detail.textContent=`${entry.project.physics.ringCount} rings · ${entry.project.export.duration}s`;load.append(name,detail);load.addEventListener('click',()=>loadProject(entry.project));const remove=document.createElement('button');remove.className='icon-button';remove.setAttribute('aria-label',`Delete preset ${entry.name}`);remove.innerHTML=icon('trash');remove.addEventListener('click',()=>{storage.deletePreset(entry.id);renderPresets();});card.append(load,remove);list.append(card);}}
async function assetCaptions(){for(const [key,label,fallback]of [['impactAsset','impact-name','MP3, WAV, OGG or M4A · up to 20 MB'],['bedAsset','bed-name','Starts with your video and loops to fit.']]){const asset=await storage.getAsset(project.sound[key]).catch(()=>null);$('#'+label).textContent=asset?asset.name:fallback;}$('#remove-bed').hidden=!project.sound.bedAsset;}
function loadProject(input){try{const next=sanitizeProject(input);cancelSearch();stopSound();project=next;simulation=new Simulation(project.seed,project.physics);renderer.setAppearance(project.appearance);syncFields();clock.reset();persist();assetCaptions();syncSound();toast('Project loaded.');}catch(error){toast(error.message);}}
$('#download-project').addEventListener('click',()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${fileName()}.orbit.json`));
for(const [button,input]of [['import-project','project-file'],['import-midi','midi-file'],['import-impact','impact-file'],['import-bed','bed-file']])$('#'+button).addEventListener('click',()=>$('#'+input).click());
$('#project-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2e6)throw new Error('Choose an Orbit project smaller than 2 MB.');loadProject(JSON.parse(await file.text()));}catch(error){toast('Could not open project: '+error.message);}});
$('#midi-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2e6)throw new Error('Choose a MIDI file smaller than 2 MB.');project.sound.midiNotes=parseMidi(await file.arrayBuffer());apply('sound','melody','midi');toast(`Imported ${project.sound.midiNotes.length} MIDI notes.`);}catch(error){toast(error.message);}});
for(const [input,kind,key]of [['impact-file','impact','impactAsset'],['bed-file','bed','bedAsset']])$('#'+input).addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>20e6)throw new Error('Choose an audio file smaller than 20 MB.');toast('Reading your sound…');const buffer=await audio.decode(file);if(buffer.duration>600)throw new Error('Choose an audio file shorter than 10 minutes.');const asset=await storage.putAsset(file,kind);decodedAssets.set(asset.id,buffer);project.sound[key]=asset.id;if(kind==='impact')project.sound.impact='sample';syncFields();persist();await assetCaptions();scheduleSound();toast(kind==='impact'?'Bounce sound uploaded.':'Background track uploaded.');}catch(error){toast('Could not import audio: '+error.message);}});
$('#remove-bed').addEventListener('click',()=>{apply('sound','bedAsset',null);assetCaptions();});
$('#find-ending').addEventListener('click',()=>{if(worker){worker.terminate();worker=null;$('#find-ending').innerHTML=icon('sparkles')+'Find an ending';return;}worker=new Worker('./scenario.worker.js',{type:'module'});const button=$('#find-ending');button.textContent='Searching… click to cancel';worker.onmessage=({data})=>{if(data.type==='progress')button.textContent=`Searching ${Math.round(data.progress*100)}% · cancel`;if(data.type==='done'){project.seed=data.seed;replay();syncFields();persist();toast(data.escapedAt?(data.escapedAt<=project.export.duration?`Found an escape at ${data.escapedAt.toFixed(1)}s.`:`Closest escape is ${data.escapedAt.toFixed(1)}s. Increase the duration or ball speed.`):`Best match has ${data.remaining} rings left. Try a faster ball or fewer rings.`);worker.terminate();worker=null;button.innerHTML=icon('sparkles')+'Find an ending';}if(data.type==='error'){toast(data.message);worker.terminate();worker=null;button.innerHTML=icon('sparkles')+'Find an ending';}};worker.onerror=()=>{toast('Scenario search failed. Try a new scenario instead.');worker?.terminate();worker=null;button.innerHTML=icon('sparkles')+'Find an ending';};worker.postMessage({seed:project.seed,physics:project.physics,duration:project.export.duration});});
const outputPanel=$('#output-panel'),narrow=matchMedia('(max-width:1050px)');
function layout(){if(narrow.matches)$('#mobile-export-body').append(outputPanel);else{$('.workspace').append(outputPanel);$('#export-settings-dialog').close();}}
narrow.addEventListener('change',layout);layout();
$('#header-export').addEventListener('click',()=>{if(narrow.matches)$('#export-settings-dialog').showModal();else startExport();});
$('#render-button').addEventListener('click',()=>startExport());
$('#cancel-render').addEventListener('click',()=>exportController?.abort());
$('#render-dialog').addEventListener('cancel',event=>{event.preventDefault();exportController?.abort();});
function showResult(entry){$('#result-video').src=entry.url;$('#result-download').href=entry.url;$('#result-download').download=entry.name;$('#result-details').textContent=`${entry.width} × ${entry.height} · ${entry.duration}s · ${(entry.blob.size/1e6).toFixed(1)} MB`;$('#result-dialog').showModal();}
function renderExports(){const list=$('#export-list');list.replaceChildren();for(const entry of exports){const card=document.createElement('div');card.className='export-card';card.append(presetArt(entry.appearance));const open=document.createElement('button');open.className='load';const name=document.createElement('strong'),details=document.createElement('small');name.textContent=entry.name;details.textContent=`${entry.duration}s · ${entry.fps} fps · ${(entry.blob.size/1e6).toFixed(1)} MB`;open.append(name,details);open.addEventListener('click',()=>showResult(entry));const link=document.createElement('a');link.className='icon-button';link.href=entry.url;link.download=entry.name;link.setAttribute('aria-label',`Download ${entry.name}`);link.innerHTML=icon('download');card.append(open,link);list.append(card);}}
async function exportVideo(options={}){
 if(exporting)throw new Error('An export is already running.');
 cancelSearch();const snapshot=sanitizeProject({...project,export:{...project.export,...options}}),saved=simulation,wasPlaying=playing;exporting=true;playing=false;stopSound();clock.reset();exportController=new AbortController();const external=options.signal;const abort=()=>exportController.abort();external?.addEventListener('abort',abort,{once:true});if(external?.aborted)abort();
 const started=performance.now();$('#export-settings-dialog').close();$('#render-progress').value=0;$('#render-percent').textContent='0%';$('#render-stage').textContent='Preparing synchronized audio…';$('#render-dialog').showModal();
 const progress=(value,label)=>{$('#render-progress').value=value;$('#render-percent').textContent=`${Math.round(value*100)}%`;$('#render-stage').textContent=label;$('#render-elapsed').textContent=timeLabel((performance.now()-started)/1000);};
 try{
  const {encodeVideo}=await import('./exporter.js');const {buffer}=await soundFor(snapshot);if(exportController.signal.aborted)throw new DOMException('Export cancelled.','AbortError');simulation=new Simulation(snapshot.seed,snapshot.physics);renderer.setAppearance(snapshot.appearance);renderer.beginCapture(snapshot.export.resolution,snapshot.export.resolution*16/9);
  const result=await encodeVideo({canvas,renderAt:time=>{simulation.seek(time);renderer.draw(simulation);},audio:buffer,...snapshot.export,signal:exportController.signal,onProgress:progress});
  const entry={...result,duration:snapshot.export.duration,fps:snapshot.export.fps,appearance:snapshot.appearance,url:URL.createObjectURL(result.blob),name:`${fileName()}-${snapshot.seed}.${result.format}`};exports.unshift(entry);if(exports.length>4)URL.revokeObjectURL(exports.pop().url);renderExports();return entry;
 }finally{external?.removeEventListener('abort',abort);simulation=saved;renderer.endCapture();renderer.setAppearance(project.appearance);renderer.draw(simulation);exporting=false;exportController=null;playing=wasPlaying;clock.reset();$('#render-dialog').close();previewButtons();if(playing)syncSound();}
}
async function startExport(){try{const entry=await exportVideo();showResult(entry);}catch(error){if(error.name!=='AbortError')console.error('Video export failed:',error);toast(error.name==='AbortError'?'Export cancelled.':error.message);}}
let lastUI=0;
function frame(timestamp){
 if(!exporting){if(playing&&!document.hidden){const target=clock.sample(timestamp,simulation.time,audio.time());simulation.seek(Math.min(target,project.export.duration));if(target>=project.export.duration){simulation.reset(project.seed);clock.reset();syncSound();}}else clock.reset();renderer.draw(simulation);if(timestamp-lastUI>100){$('#time-label').textContent=timeLabel(simulation.time);if(document.activeElement!==$('#timeline'))$('#timeline').value=simulation.time;lastUI=timestamp;}}
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{clock.reset();if(document.hidden){if(monitor)stopSound();}else if(monitor)syncSound();});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!event.target.matches('input,textarea,select,button')&&!document.querySelector('dialog[open]')){event.preventDefault();setPlaying(!playing);}});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setPlaying(false);toast('The graphics connection was interrupted. Reload the studio to continue.');});
window.addEventListener('beforeunload',()=>{try{if(saveDirty)storage.saveCurrent(project);}catch{}worker?.terminate();audio.stop();for(const entry of exports)URL.revokeObjectURL(entry.url);});
window.orbit=Object.freeze({
 exportVideo,play:()=>setPlaying(true),pause:()=>setPlaying(false),
 configure:patch=>{if(exporting)throw new Error('Wait for the export to finish.');const next=sanitizeProject({...project,physics:{...project.physics,...patch}});loadProject(next);},
 renderFrame:(frame,fps=60)=>{if(exporting)throw new Error('An export is running.');if(!Number.isInteger(frame)||frame<0||![30,60].includes(fps))throw new RangeError('Provide a non-negative frame at 30 or 60 fps.');setPlaying(false);simulation.seek(frame/fps);renderer.draw(simulation);return canvas;},
 getState:()=>({renderer:'Three.js',seed:project.seed,time:simulation.time,ball:{...simulation.ball},shrinkOffset:simulation.shrinkOffset,remaining:simulation.remaining,settings:{...project.physics},playing,recording:exporting,audioPreview:monitor,project:structuredClone(project)}),
});
syncFields();previewButtons();assetCaptions();renderPresets();renderer.draw(simulation);requestAnimationFrame(frame);window.dispatchEvent(new Event('orbitready'));





