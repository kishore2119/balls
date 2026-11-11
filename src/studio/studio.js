import {mountPrivacy} from '../privacy/controls.js';
import {abortable} from './async.js';
import {randomizePath} from './random-path.js';
import {createRosterControls} from './war-controls.js';
import {projectSimulation,projectEvents,matchedScenario,scenarioKey,endingWindow,projectTimelineKey} from '../animation/scenario.js';
import {ANIMATION_MODES,ROYALE_LIMIT,createProject,defaultRoyaleCompetitor,royaleSettings,sanitizeProject,THEMES,warSettings} from '../config.js';
import {PreviewAudio,renderSound} from './audio.js';
import {parseMidi} from './midi.js';
import {ProjectHistory} from './history.js';
import {PlaybackClock} from './playback-clock.js';
import {paletteColors,resizePalette,segmentCounts} from '../animation/palette.js';
import * as storage from './storage.js';
import {$,icon,hydrateIcons,valueLabel,timeLabel,toast,clampControlValue} from './ui.js';

const rendererLoaders={
 'circle-royale':()=>import('../animation/circle-royale-renderer.js').then(module=>module.RoyaleRenderer),
 'spike-melody':()=>import('../animation/spike-melody-renderer.js').then(module=>module.SpikeRenderer),
 'ball-multiplier':()=>import('../animation/multiplier-renderer.js').then(module=>module.MultiplierRenderer),
 'timed-escape':()=>import('../animation/timed-escape-renderer.js').then(module=>module.TimedEscapeRenderer),
 'rainbow-crash':()=>import('../animation/crash-renderer.js').then(module=>module.CrashRenderer),
 'string-wars':()=>import('../animation/string-wars-renderer.js').then(module=>module.StringWarsRenderer),
 'growing-ball':()=>import('../animation/growing-ball-renderer.js').then(module=>module.GrowingBallRenderer),
 'ring-escape':()=>import('../animation/renderer.js').then(module=>module.OrbitRenderer),
};

const requestedMode=new URLSearchParams(location.search).get('animation'),activeMode=ANIMATION_MODES.includes(requestedMode)?requestedMode:'ring-escape',isGrowing=activeMode==='growing-ball',isWars=activeMode==='string-wars',isCrash=activeMode==='rainbow-crash',isTimed=activeMode==='timed-escape',isMultiplier=activeMode==='ball-multiplier',isSpike=activeMode==='spike-melody',isRoyale=activeMode==='circle-royale',usesPlanner=isGrowing||activeMode==='ring-escape';
hydrateIcons();
let project=storage.loadCurrent(activeMode);
if(!project){
 project=createProject(activeMode);
}
randomizePath(project);
const history=new ProjectHistory(project);let restoringHistory=false;
let simulation=projectSimulation(project);
const Renderer=await rendererLoaders[activeMode]();
const canvas=$('#animation'),renderer=new Renderer(canvas),audio=new PreviewAudio(),clock=new PlaybackClock();
let playing=!matchMedia('(prefers-reduced-motion:reduce)').matches,monitor=false,exporting=false,soundRevision=0,soundCache=null,saveTimer,syncTimer,fitController=null,fitPromise=null,fitTimer=null,fitError=null,exportController=null;
let rosterControls=null;
let saveDirty=false;
const decodedAssets=new Map(),exports=[];
function endingStatus(message,state='pending'){const label=$('#ending-status');label.textContent=message;label.dataset.state=state;$('#find-ending').innerHTML=icon('replay')+(isCrash||isTimed||isMultiplier||isSpike?'New run':isWars||isRoyale?'New match':isGrowing?'Fit growth':'Fit ending');}
function cancelSearch(){clearTimeout(fitTimer);fitTimer=null;fitController?.abort();fitController=null;fitPromise=null;}
function requestPlan(snapshot,{signal,onProgress=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Planning cancelled.','AbortError'));return;}
  const worker=new Worker(new URL('../animation/scenario.worker.js',import.meta.url),{type:'module'});
  const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
  const abort=()=>{cleanup();reject(new DOMException('Planning cancelled.','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data.progress);else if(data.type==='done'){cleanup();resolve(data);}else if(data.type==='error'){cleanup();reject(new Error(data.message));}};
  worker.onerror=()=>{cleanup();reject(new Error('Could not prepare the ending. Try again.'));};
  worker.postMessage({seed:snapshot.seed,physics:snapshot.physics,growth:snapshot.growth,animation:snapshot.animation,duration:snapshot.export.duration});
 });
}
async function fitSnapshot(snapshot,options={}){
 if(!usesPlanner||!snapshot.export.matchDuration)return snapshot;
 const existing=matchedScenario(snapshot),window=endingWindow(snapshot.export.duration);
 if(existing){const check=projectEvents(snapshot);if(!check.remaining&&check.escapedAt<=window.target&&window.target-check.escapedAt<=window.tolerance)return snapshot;}
 const plan=await requestPlan(snapshot,options);snapshot.seed=plan.seed;snapshot.scenario={key:scenarioKey(snapshot),...(snapshot.animation==='growing-ball'?{growthRate:plan.growthRate}:{ballPlan:plan.ballPlan}),escapedAt:plan.escapedAt};return snapshot;
}
function ensureEnding(){
 clearTimeout(fitTimer);fitTimer=null;
 if(isMultiplier){endingStatus(`Each escape spawns ${project.multiplier.children} balls, up to ${simulation.populationLimit} inside the ring.`,'ready');return Promise.resolve(true);}
 if(isRoyale){const {escapedAt}=projectEvents(project);endingStatus(escapedAt===null?'Multiple balls are still in play at the end of this clip.':`One ball remains at ${escapedAt.toFixed(1)}s.`,'ready');return Promise.resolve(true);}
 if(isSpike){const {escapedAt}=projectEvents(project);endingStatus(escapedAt===null?'The balls keep playing until this clip ends.':`A ball escapes at ${escapedAt.toFixed(1)}s.`,'ready');return Promise.resolve(true);}
 if(isTimed){const {escapedAt}=projectEvents(project);endingStatus(escapedAt===null?'No ball escapes in this clip. Try another scenario or change the time per ball or gap width.':`A ball escapes at ${escapedAt.toFixed(1)}s.`,'ready');return Promise.resolve(true);}
 if(isCrash){const {escapedAt}=projectEvents(project);endingStatus(escapedAt===null?'The ball keeps bouncing until the clip ends. Increase growth or speed gain for an earlier finish.':`The ball fills the arena at ${escapedAt.toFixed(1)}s.`,'ready');return Promise.resolve(true);}
 if(isWars){endingStatus(project.export.matchDuration?'Timed showdown stops new strings and trims the weakest balls until one winner remains.':'Natural match · no deadline; a winner may take longer than the video.',project.export.matchDuration?'ready':'off');return Promise.resolve(true);}
 if(!project.export.matchDuration){endingStatus((isGrowing?'Manual growth · the circle may fill before or after the video ends.':'Free play · the ending is not tied to the duration.'),'off');return Promise.resolve(true);}
 if(fitPromise)return fitPromise;
 const controller=new AbortController();fitController=controller;const key=scenarioKey(project),snapshot=structuredClone(project);
 stopSound();fitError=null;endingStatus((isGrowing?'Fitting growth to your duration…':'Planning the ball’s path…'));$('#find-ending').textContent='Planning…';
 fitPromise=(async()=>{try{
  await fitSnapshot(snapshot,{signal:controller.signal,onProgress:value=>{if(fitController===controller)endingStatus(`Planning ball movement · ${Math.round(value*100)}%`);}});
  if(controller.signal.aborted||key!==scenarioKey(project))return false;
  project.seed=snapshot.seed;project.scenario=snapshot.scenario;simulation=projectSimulation(project);clock.reset();syncFields();persist(null,{derived:true});renderer.draw(simulation);
  endingStatus(endingSummary(project),'ready');return true;
 }catch(error){if(error.name==='AbortError')return false;fitError=error;endingStatus(error.message,'error');return false;
 }finally{if(fitController===controller){fitController=null;fitPromise=null;$('#find-ending').innerHTML=icon('replay')+(isCrash||isTimed||isMultiplier||isSpike?'New run':isWars||isRoyale?'New match':isGrowing?'Fit growth':'Fit ending');if(playing)syncSound();}}})();
 return fitPromise;
}
function scheduleEnding(delay=220){cancelSearch();fitError=null;if(!usesPlanner){ensureEnding();return;}if(!project.export.matchDuration){delete project.scenario;endingStatus((isGrowing?'Manual growth · the circle may fill before or after the video ends.':'Free play · the ending is not tied to the duration.'),'off');return;}endingStatus('Updating the ending…');stopSound();fitTimer=setTimeout(()=>{fitTimer=null;ensureEnding();},delay);}
function endingSummary(snapshot){return `${isGrowing?'Circle fills':'Final ring clears'} at ${snapshot.scenario.escapedAt.toFixed(1)}s of ${snapshot.export.duration}s.`;}
function mountRoster(root,section,normalize,options={}){
 return createRosterControls(root,{...options,getRoster:()=>project[section].competitors,isBusy:()=>exporting,onError:toast,
  onChange:(competitors,restart=false,group=null)=>{
   project[section]=normalize({...project[section],competitors});
   if(restart){simulation=projectSimulation(project);clock.reset();scheduleSound();scheduleEnding();}
   else simulation[section].competitors=project[section].competitors;
   renderer.prepareIcons(project[section].competitors);
   syncFields();persist(group);renderer.draw(simulation);
  },
 });
}
function configureModeUI(){
 if(isRoyale){
  document.title='Circle Royale Editor | Orbit Studio';
  $('.mode-card h1').textContent='Circle Royale';$('.mode-card .eyebrow').textContent='ANIMATION 08';
  $('.mode-number').textContent='08';$('.mode-card p').textContent='Last ball inside the circle wins.';
  $('.mode-art').classList.add('royale');$('#animation').setAttribute('aria-label','Live Circle Royale animation');
  $('#match-duration').closest('label').hidden=true;$('#find-ending').title='Start a match with a new random path';
  $('#shrink-ranges').closest('details').hidden=true;$('#motion-toggles').hidden=true;$('.notice').hidden=true;
  document.querySelector('[for="direction"]').textContent='Gate direction';
  for(const selector of ['#theme-grid','.palette-count','#palette-colors','.palette-gradient','#palette-description'])$(selector).hidden=true;
  $('#theme-grid').previousElementSibling.hidden=true;
  document.querySelector('[data-setting="appearance.ballColor"]').closest('label').innerHTML='Ring<input type="color" data-setting="royale.ringColor" aria-label="Ring color">';
  const gate=document.createElement('label');gate.innerHTML='Gate<input type="color" data-setting="royale.gateColor" aria-label="Gate color">';$('.color-row').append(gate);
  const players=document.createElement('details');players.className='settings-group';players.id='royale-roster';
  players.innerHTML='<summary>Players<span>Names, colors, and icons</span></summary><div class="details-body"></div>';
  $('.color-row').before(players);
  rosterControls=mountRoster(players.lastElementChild,'royale',royaleSettings,{limit:ROYALE_LIMIT,makeDefault:defaultRoyaleCompetitor,intro:'Give each ball a name and color, or upload a custom icon.'});
  $('#advanced-ranges').closest('details').querySelector('summary span').textContent='Arena, ball size, and direction';
  $('#scene-toggles').closest('details').querySelector('summary span').textContent='Trails, glow, and confetti';
  document.querySelector('[data-panel="motion"] .panel-intro').textContent='The colored arc marks the gate before it opens. Balls that pass through are eliminated. Adjust how often the gate opens and how long it stays open.';
  document.querySelector('[for="break-sound"]').textContent='Elimination sound';
  $('#trigger').querySelector('[value="escape"]').textContent='Eliminations';
  $('#help-dialog .guide-list li p').textContent='Add 2–12 players and customize their names, colors, and icons. The colored gate rotates and opens on a repeating cycle. The last ball inside wins. Select New path to try another round.';
  return;
 }
 if(isSpike){
  document.title='Spike Melody Editor | Orbit Studio';
  $('.mode-card h1').textContent='Spike Melody';$('.mode-card .eyebrow').textContent='ANIMATION 07';
  $('.mode-number').textContent='07';$('.mode-card p').textContent='Stuck balls become musical bumpers.';
  $('.mode-art').classList.add('spike');$('#animation').setAttribute('aria-label','Live Spike Melody animation');
  $('#match-duration').closest('label').hidden=true;$('#find-ending').title='Start a new random path';
  $('#shrink-ranges').closest('details').hidden=true;
  $('#direction').hidden=true;document.querySelector('[for="direction"]').hidden=true;
  $('#motion-toggles').hidden=true;$('.notice').hidden=true;
  $('#theme-grid').hidden=true;$('#theme-grid').previousElementSibling.querySelector('span').textContent='Ball colors';
  $('.palette-gradient').hidden=true;
  document.querySelector('[data-setting="appearance.ballColor"]').closest('label').innerHTML='Spikes<input type="color" data-setting="spike.ringColor" aria-label="Spike color">';
  $('#advanced-ranges').closest('details').querySelector('summary span').textContent='Spike depth, gap position, and gravity';
  $('#scene-toggles').closest('details').querySelector('summary span').textContent='Motion trail, glow, and escape sparks';
  document.querySelector('[data-panel="motion"] .panel-intro').textContent='Balls stick to the spikes and become bumpers. Each collision can play the next note. The run ends when a ball makes it through the gap.';
  document.querySelector('[for="break-sound"]').textContent='Escape sound';
  $('#help-dialog .guide-list li p').textContent='Each ball that touches the spikes sticks in place and launches the next ball. Bounces off the stuck balls play notes. Choose a built-in melody or import MIDI in Audio. Select New path for another run.';
  return;
 }
 if(isTimed||isMultiplier){
  const name=isMultiplier?'Ball Multiplier':'Timed Escape',number=isMultiplier?'06':'05';
  const description=isMultiplier?'Every escape spawns a new batch.':'One ball at a time. One gap to escape.';
  const section=isMultiplier?'multiplier':'timedEscape';
  document.title=`${name} Editor | Orbit Studio`;
  $('.mode-card h1').textContent=name;$('.mode-card .eyebrow').textContent=`ANIMATION ${number}`;
  $('.mode-number').textContent=number;$('.mode-card p').textContent=description;
  $('.mode-art').classList.add(isMultiplier?'multiplier':'timed');
  $('#animation').setAttribute('aria-label',`Live ${name} animation`);
  $('#match-duration').closest('label').hidden=true;$('#find-ending').title='Start a new random path';
  $('#shrink-ranges').closest('details').hidden=true;
  if(isTimed){$('#direction').hidden=true;document.querySelector('[for="direction"]').hidden=true;}
  $('#motion-toggles').hidden=true;$('.notice').hidden=true;
  $('#theme-grid').hidden=true;
  $('#theme-grid').previousElementSibling.querySelector('span').textContent=isMultiplier?'Ball colors':'One color per attempt';
  $('.palette-gradient').hidden=true;
  document.querySelector('[data-setting="appearance.ballColor"]').closest('label').innerHTML=`Ring<input type="color" data-setting="${section}.ringColor" aria-label="Ring color">`;
  const rainbow=document.querySelector(`[for="setting-${section}-rainbow"]`);
  if(isMultiplier)$('.palette-count').before(rainbow);else $('.color-row').before(rainbow);
  $('#advanced-ranges').closest('details').querySelector('summary span').textContent=isMultiplier?'Ring size, direction, and ball limit':'Ring size, gap position, and gravity';
  $('#scene-toggles').closest('details').querySelector('summary span').textContent=isMultiplier?'Ring thickness and glow':'Motion trail, glow, and escape particles';
  document.querySelector('[data-panel="motion"] .panel-intro').textContent=isMultiplier
   ?'Every ball that clears the rotating gap spawns a fresh batch near the center. Larger balls may lower the population limit so they fit inside the ring.'
   :'When time runs out, the ball freezes in place. The next ball can bounce off it while looking for the gap.';
  const titleHint=document.createElement('p');titleHint.className='setting-hint';
  titleHint.textContent=isMultiplier?'Use {count} in the title to show the current number of new balls per escape.':'Use {time} in the title to show the current time limit.';
  $('#video-title').after(titleHint);
  document.querySelector('[for="break-sound"]').textContent='Escape sound';
  $('#help-dialog .guide-list li p').textContent=isMultiplier
   ?'Start with one ball. Every ball that clears the gap spawns new balls inside the ring, up to the ball limit. Change the gap, rotation, or number spawned, or use New path for a different launch.'
   :'Set the time per ball and the size and position of the gap. A ball that runs out of time freezes in place. The first ball to escape bursts the ring. Use New path to try another set of launches.';
  return;
 }
 if(isCrash){
  document.title='Rainbow Crash Editor | Orbit Studio';$('.mode-card h1').textContent='Rainbow Crash';
  $('.mode-card .eyebrow').textContent='ANIMATION 04';$('.mode-number').textContent='04';
  $('.mode-card p').textContent='Each bounce adds speed and size.';$('.mode-art').classList.add('crash');
  $('#animation').setAttribute('aria-label','Live Rainbow Crash animation');
  $('#match-duration').closest('label').hidden=true;$('#find-ending').title='Start a new random path';
  $('#shrink-ranges').closest('details').hidden=true;
  $('#direction').hidden=true;document.querySelector('[for="direction"]').hidden=true;
  $('#motion-toggles').hidden=true;$('.notice').hidden=true;
  const themeGrid=$('#theme-grid'),paletteHeading=themeGrid.previousElementSibling;
  paletteHeading.before(document.querySelector('[for="setting-crash-rainbow"]'));
  themeGrid.hidden=true;paletteHeading.hidden=true;
  const colors=$('.color-row'),arena=document.createElement('label');
  arena.innerHTML='Arena<input type="color" data-setting="crash.arenaColor" aria-label="Arena color">';
  colors.append(arena);
  $('#advanced-ranges').closest('details').querySelector('summary span').textContent='Starting size, gravity, and arena';
  $('#scene-toggles').closest('details').querySelector('summary span').textContent='Trail and blackout finish';
  document.querySelector('[data-panel="motion"] .panel-intro').textContent='Every bounce grows the ball and adds speed. Adjust the gains to change when the arena fills.';
  $('#trigger').querySelector('[value="escape"]').remove();$('#trigger').querySelector('[value="both"]').remove();
  $('#break-sound').hidden=true;document.querySelector('[for="break-sound"]').hidden=true;
  $('#help-dialog .guide-list li p').textContent='The ball gets larger and faster on every bounce, leaving a trail that stays in the arena. When the ball nearly fills the circle, the optional blackout ends the run. Change growth, speed gain, or clip length to adjust the timing.';
  return;
 }
 if(isWars){
  document.title='String Wars Editor | Orbit Studio';$('.mode-card h1').textContent='String Wars';$('.mode-card .eyebrow').textContent='ANIMATION 03';$('.mode-number').textContent='03';$('.mode-card p').textContent='Last ball with strings wins.';$('.mode-art').classList.add('wars');document.body.classList.add('string-wars');$('#animation').setAttribute('aria-label','Live string wars animation');$('#match-duration').parentElement.querySelector('span').textContent='Finish match by duration';$('#find-ending').title='Start a match with a new random path';
  const panel=document.querySelector('[data-panel="scene"]'),roster=document.createElement('div');roster.id='war-roster';panel.prepend(roster);rosterControls=mountRoster(roster,'war',warSettings);
  for(const selector of ['#theme-grid','.palette-count','#palette-colors','.palette-gradient','#palette-description'])$(selector).hidden=true;$('#theme-grid').previousElementSibling.hidden=true;document.querySelector('[data-setting="appearance.ballColor"]').parentElement.hidden=true;
  $('#shrink-ranges').closest('details').hidden=true;$('#direction').hidden=true;document.querySelector('[for="direction"]').hidden=true;$('.notice').hidden=true;document.querySelector('[for="setting-physics-reverseOnPass"]').hidden=true;
  $('#advanced-ranges').closest('details').querySelector('summary span').textContent='Circle size, strings, and gravity';$('#scene-toggles').closest('details').querySelector('summary span').textContent='Trails and string-cut particles';document.querySelector('[data-panel="motion"] .panel-intro').textContent='Bounces add strings until the showdown. During the showdown, new strings stop and the weakest competitors lose strings until one remains. Turn off Finish match by duration for natural play.';
  const reference=document.createElement('button');reference.id='reference-motion';reference.className='button secondary full';reference.textContent='Use reference motion';reference.addEventListener('click',()=>{if(exporting)return;const next=structuredClone(project);Object.assign(next.physics,{ballSpeed:1.1,ballRadius:30,gravity:0});Object.assign(next.war,{initialStrings:6,stringsPerBounce:3,ballCollisions:false,showdownSpeed:1,stringOpacity:.75});next.appearance.trail=true;next.export.fps=60;loadProject(next,{notify:false});toast('Reference motion applied. Your ball names, colors, and icons are kept.');});$('#motion-ranges').before(reference);const referenceHint=document.createElement('p');referenceHint.className='setting-hint';referenceHint.textContent='Resets speed, size, gravity, starting strings, collisions, and trails for clean cross-arena flights. Sets video export to 60 fps.';reference.after(referenceHint);
  document.querySelector('[for="break-sound"]').textContent='String cut sound';$('#trigger').querySelector('[value="escape"]').textContent='String cuts';$('#help-dialog .guide-list li p').textContent='Add 2–8 balls, name them, and upload custom icons. Opponents cut your strings; lose them all and you’re eliminated. Timed showdown stops new strings and trims weak competitors to produce one winner by your chosen duration. Switch it off for a natural match.';return;
 }
 if(!isGrowing)return;
 document.title='Growing Ball Editor | Orbit Studio';$('.mode-card h1').textContent='Growing Ball';$('.mode-card .eyebrow').textContent='ANIMATION 02';$('.mode-number').textContent='02';$('.mode-card p').textContent='The ball grows on every wall bounce.';$('.mode-art').classList.add('growing');
 $('#animation').setAttribute('aria-label','Live growing ball animation');$('#match-duration').parentElement.querySelector('span').textContent='Fill circle by the end';$('#find-ending').title='Fit the ball’s growth to the selected duration';
 const rainbow=document.querySelector('[for="setting-growth-rainbow"]');if(rainbow)$('#theme-grid').before(rainbow);
 $('#advanced-ranges').closest('details').querySelector('summary span').textContent='Circle, ball, and gravity';$('#scene-toggles').closest('details').querySelector('summary span').textContent='Trails, impact lines, and sparks';
 $('#shrink-ranges').closest('details').hidden=true;$('#direction').hidden=true;document.querySelector('[for="direction"]').hidden=true;$('#motion-toggles').hidden=true;$('.notice').hidden=true;
 const intro=document.querySelector('[data-panel="motion"] .panel-intro');if(intro)intro.textContent='Set the pace and starting size. Automatic growth fills the circle near the end.';
 const note=document.createElement('p');note.id='growth-rate-note';note.className='setting-hint';$('#motion-ranges').after(note);
 $('#trigger').querySelector('[value="escape"]').remove();$('#trigger').querySelector('[value="both"]').remove();$('#break-sound').hidden=true;document.querySelector('[for="break-sound"]').hidden=true;
 $('#help-dialog .guide-list li p').textContent='The ball grows after each wall bounce. Fill circle by the end finds a growth rate for your duration; turn it off to set manual growth. Adjust colors, impact lines, trails, and collision sounds.';
}
configureModeUI();renderer.setAppearance(project.appearance);
const numericPaths=new Set(['physics.direction','export.duration','export.fps','export.resolution']);
function persist(group=null,{derived=false}={}){if(derived)history.amend(project);else if(!restoringHistory)history.record(project,{group});syncHistory();saveDirty=true;clearTimeout(saveTimer);$('#save-state').textContent='Saving…';saveTimer=setTimeout(()=>{try{storage.saveCurrent(project);saveDirty=false;$('#save-state').innerHTML='<i></i> Saved on this device';}catch{toast('Browser storage is full. Download your project JSON to keep these settings.');$('#save-state').textContent='Not saved';}},350);}
function syncFields(){
 for(const field of document.querySelectorAll('[data-setting]')){const [section,key]=field.dataset.setting.split('.'),value=project[section][key];if(field.type==='checkbox')field.checked=value;else field.value=String(value);if(field.type==='range'){const label=valueLabel(value,field.dataset.display);document.querySelector(`[data-output="${field.dataset.setting}"]`).textContent=label;field.setAttribute('aria-valuetext',label);field.style.setProperty('--range-progress',`${(value-Number(field.min))/(Number(field.max)-Number(field.min))*100}%`);}}
 for(const field of document.querySelectorAll('[data-number]')){const [section,key]=field.dataset.number.split('.');if(document.activeElement!==field)field.value=Number((project[section][key]*Number(field.dataset.scale)).toFixed(6));}
 $('#export-recipe-title').textContent=`${project.export.duration}s · ${project.export.resolution}p · ${project.export.fps} fps`;
 if(isTimed||isMultiplier)document.querySelector('[aria-label="Ring color"]').disabled=(isMultiplier?project.multiplier:project.timedEscape).rainbow;
 if(isGrowing){const rate=matchedScenario(project)?.growthRate;$('#growth-rate-note').textContent=project.export.matchDuration?(rate?`Automatic growth: ${rate.toFixed(2)} px per bounce. Turn off Fill circle by the end to set manual growth.`:'Finding the automatic growth rate…'):'Manual growth adds the selected amount on every bounce.';for(const field of document.querySelectorAll('[data-setting="growth.perBounce"],[data-number="growth.perBounce"]'))field.disabled=project.export.matchDuration;document.querySelector('[data-setting="appearance.ballColor"]').disabled=project.growth.rainbow;}
 rosterControls?.render();syncPalette();const fitRadius=Math.ceil(Math.max(project.physics.shrinkStopRadius,(project.physics.ballRadius+3)/Math.sin(project.physics.gapAngle*Math.PI/360)*1.15));$('#shrink-hint').textContent=`${project.physics.shrinkStopTime?`Shrinking ends at ${project.physics.shrinkStopTime}s.`:'No time limit.'} At ${fitRadius} px, shrinking pauses until the ball leaves the innermost ring, then continues.`;
 for(const id of ['#project-name','#project-name-mobile'])if(document.activeElement!==$(id))$(id).value=project.name;$('#seed-label').textContent=`SCENARIO #${project.seed}`;$('#timeline').max=project.export.duration;$('#duration-label').textContent=timeLabel(project.export.duration);$('#export-pixels').textContent=`${project.export.resolution} × ${project.export.resolution*16/9}`;$('#audio-summary').textContent=project.sound.enabled?'Synchronized audio included':'Silent video';
 $('#midi-name').textContent=project.sound.midiNotes.length?`${project.sound.midiNotes.length} imported MIDI notes · one per collision`:'Each collision plays the next note.';
 for(const button of document.querySelectorAll('.theme-swatch')){const theme=THEMES[Number(button.dataset.theme)];button.setAttribute('aria-pressed',String(theme.startColor===project.appearance.startColor&&theme.endColor===project.appearance.endColor));}
}
function syncPalette(){
 if(isWars||isRoyale)return;
 const colors=paletteColors(project.appearance),container=$('#palette-colors'),counts=segmentCounts(project.physics.ringCount,colors.length),isBallPalette=isGrowing||isCrash||isTimed||isMultiplier||isSpike;
 if(isMultiplier)for(const selector of ['.palette-count','#palette-colors'])$(selector).hidden=project.multiplier.rainbow;
 if(isCrash)for(const selector of ['.palette-count','#palette-colors','.palette-gradient'])$(selector).hidden=project.crash.rainbow;
 $('#color-count').value=colors.length;$('#color-count-label').textContent=colors.length;$('#palette-gradient').checked=project.appearance.gradient;
 if(container.children.length!==colors.length){container.replaceChildren();colors.forEach((color,index)=>{const label=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input');input.type='color';input.dataset.color=index;input.setAttribute('aria-label',`${isBallPalette?'Palette':'Ring'} color ${index+1}`);input.addEventListener('input',()=>{if(exporting)return;project.appearance.colors[index]=input.value;updatePalette();});label.append(caption,input);container.append(label);});}
 [...container.children].forEach((label,index)=>{label.firstChild.textContent=`Color ${index+1}`;label.lastChild.value=colors[index];label.title=isBallPalette?`Palette color ${index+1}`:`${counts[index]} rings in solid mode`;});
 $('#palette-description').textContent=isSpike?'Each new ball uses the next color in your palette.':isMultiplier?(project.multiplier.rainbow?'Turn off Rainbow ring and balls to choose your own colors.':'New balls cycle through your palette.'):isTimed?'Balls cycle through the palette in launch order.':isCrash?(project.crash.rainbow?'Rainbow trail is on. Turn it off to use your custom palette.':'Your palette repeats along the trail.'):isGrowing?(project.growth.rainbow?'Rainbow cycle is on. Turn it off to use your custom palette.':'Your palette colors the boundary, trails, and impact lines.'):project.appearance.gradient?'Colors blend from the innermost ring to the outermost.':counts.every(n=>n===counts[0])?`${counts[0]} rings per color · inner to outer`:`Rings per color: ${counts.join(' / ')} · inner to outer`;
}
function syncHistory(){$('#undo-change').disabled=exporting||!history.canUndo;$('#redo-change').disabled=exporting||!history.canRedo;}
function restoreHistory(direction){if(exporting)return;const next=history[direction]();if(!next)return;restoringHistory=true;try{loadProject(next,{notify:false});}finally{restoringHistory=false;}syncHistory();$('#history-status').textContent=direction==='undo'?'Change undone':'Change redone';}
$('#undo-change').addEventListener('click',()=>restoreHistory('undo'));$('#redo-change').addEventListener('click',()=>restoreHistory('redo'));
function updatePalette(){project.appearance.startColor=project.appearance.colors[0];project.appearance.endColor=project.appearance.colors.at(-1);renderer.setAppearance(project.appearance);syncFields();persist('palette');renderer.draw(simulation);}
$('#color-count').addEventListener('input',()=>{if(exporting)return;project.appearance.colors=resizePalette(paletteColors(project.appearance),Number($('#color-count').value));updatePalette();});
$('#palette-gradient').addEventListener('input',()=>{if(exporting)return;project.appearance.gradient=$('#palette-gradient').checked;updatePalette();});
function previewButtons(){const button=$('#play-preview');button.setAttribute('aria-label',playing?'Pause preview':'Play preview');button.innerHTML=icon(playing?'pause':'play');$('#monitor-label').textContent=monitor?'Audio on':'Enable audio';$('#monitor').classList.toggle('active',monitor);}
function stopSound(){soundRevision++;audio.stop();$('#loading-overlay').hidden=true;}
async function decode(id){if(!id)return null;if(decodedAssets.has(id))return decodedAssets.get(id);const asset=await storage.getAsset(id);if(!asset)throw new Error('An uploaded sound is missing on this device. Upload it again or choose a built-in sound.');const buffer=await audio.decode(asset.blob);decodedAssets.set(id,buffer);return buffer;}
async function soundFor(snapshot){
 if(!snapshot.sound.enabled)return {buffer:null,events:[]};
 const key=JSON.stringify([projectTimelineKey(snapshot),snapshot.sound]);
 if(soundCache?.key===key)return soundCache.promise;
 const promise=(async()=>{const assets={};if(snapshot.sound.impact==='sample'&&snapshot.sound.impactAsset)assets.impact=await decode(snapshot.sound.impactAsset);if(snapshot.sound.bedAsset)assets.bed=await decode(snapshot.sound.bedAsset);const timeline=projectEvents(snapshot);return {buffer:await renderSound(snapshot,timeline.events,assets),events:timeline.events};})();
 soundCache={key,promise};promise.catch(()=>{if(soundCache?.key===key)soundCache=null;});return promise;
}
async function syncSound(){
 clearTimeout(syncTimer);stopSound();if(!monitor||!playing||exporting||fitController||fitTimer)return;const revision=soundRevision;$('#loading-overlay').hidden=false;
 try{const previewProject=structuredClone(project);previewProject.sound.enabled=true;const {buffer}=await soundFor(previewProject);if(revision!==soundRevision||!monitor||!playing||exporting)return;await audio.play(buffer,simulation.time%project.export.duration);}catch(error){if(revision===soundRevision){monitor=false;previewButtons();toast(error.message);}}finally{if(revision===soundRevision)$('#loading-overlay').hidden=true;}
}
function scheduleSound(){stopSound();clearTimeout(syncTimer);if(monitor)syncTimer=setTimeout(syncSound,180);}
function apply(section,key,value){
 if(exporting||project[section][key]===value)return;
 const previous=project[section][key];project[section][key]=value;if(isWars&&section==='war'&&['initialStrings','maxStrings'].includes(key)){project.war.initialStrings=Math.min(project.war.initialStrings,project.war.maxStrings);}
 try{
  if(section==='growth'&&['rainbow','showRays','hueSpeed','rayCount'].includes(key)){simulation.growth[key]=value;if(key==='rayCount')simulation.hits=simulation.hits.slice(-value);}
  else if(section==='crash'&&['rainbow','fadeOut','arenaColor','colorCycle'].includes(key)){simulation.crash[key]=value;}
  else if((['timedEscape','multiplier'].includes(section)&&['rainbow','ringColor'].includes(key))||(section==='spike'&&key==='ringColor')){simulation[section][key]=value;}
  else if(section==='royale'&&['showNames','showEliminations','ringColor','gateColor'].includes(key)){simulation.royale[key]=value;}
  else if(section==='physics'||section==='growth'||section==='war'||section==='crash'||section==='timedEscape'||section==='multiplier'||section==='spike'||section==='royale'){cancelSearch();delete project.scenario;if((section==='physics'&&key==='ballSpeed')||(section==='war'&&key==='showdownSpeed'))randomizePath(project);simulation=projectSimulation(project);clock.reset();scheduleSound();scheduleEnding();}
  if(section==='appearance')renderer.setAppearance(project.appearance);
  if(section==='sound')scheduleSound();
  if(section==='export'&&['duration','matchDuration'].includes(key)){cancelSearch();delete project.scenario;simulation=projectSimulation(project);clock.reset();scheduleSound();scheduleEnding();}
  syncFields();persist(`${section}.${key}`);renderer.draw(simulation);
 }catch(error){project[section][key]=previous;syncFields();toast(error.message);}
}
for(const field of document.querySelectorAll('[data-setting]'))field.addEventListener('input',event=>{const [section,key]=field.dataset.setting.split('.');const value=field.type==='checkbox'?field.checked:field.type==='range'||numericPaths.has(field.dataset.setting)?Number(field.value):field.value;apply(section,key,value);});
function commitNumber(field){
 const [section,key]=field.dataset.number.split('.'),scale=Number(field.dataset.scale);
 if(!exporting){const value=clampControlValue(field.value,Number(field.min),Number(field.max),Number(field.step));if(value!==null&&value/scale!==project[section][key])apply(section,key,value/scale);}
 field.value=Number((project[section][key]*scale).toFixed(6));
}
for(const field of document.querySelectorAll('[data-number]')){field.addEventListener('change',()=>commitNumber(field));field.addEventListener('blur',()=>commitNumber(field));field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commitNumber(field);field.blur();}});}
for(const [index,theme]of THEMES.entries()){const button=document.createElement('button');button.className='theme-swatch';button.dataset.theme=index;button.title=theme.name;button.setAttribute('aria-label',`${theme.name} color theme`);button.innerHTML=`<span class="theme-preview" style="background:linear-gradient(90deg,${theme.startColor} 50%,${theme.endColor} 50%)"></span><span>${theme.name}</span><span class="theme-check">${icon('check')}</span>`;button.addEventListener('click',()=>{Object.assign(project.appearance,{startColor:theme.startColor,endColor:theme.endColor,colors:resizePalette([theme.startColor,theme.endColor],project.appearance.colors.length),background:theme.background});renderer.setAppearance(project.appearance);syncFields();persist();});$('#theme-grid').append(button);}
function setPlaying(value){playing=value;clock.reset();if(!playing)stopSound();else syncSound();previewButtons();}
$('#play-preview').addEventListener('click',()=>setPlaying(!playing));
function restart({automatic=false}={}){
 if(exporting)return;
 cancelSearch();stopSound();randomizePath(project);
 simulation=projectSimulation(project);clock.reset();playing=true;
 previewButtons();syncFields();persist(null,{derived:automatic});renderer.draw(simulation);
 scheduleEnding(0);if(playing)syncSound();
}
$('#replay').addEventListener('click',()=>restart());
$('#new-scenario').addEventListener('click',()=>restart());
$('#monitor').addEventListener('click',async()=>{if(monitor){monitor=false;stopSound();previewButtons();return;}try{await audio.ensure();monitor=true;previewButtons();await syncSound();}catch(error){toast(error.message);}});
$('#timeline').addEventListener('input',()=>{stopSound();simulation.seek(Number($('#timeline').value));renderer.draw(simulation);clock.reset();$('#time-label').textContent=timeLabel(simulation.time);});
$('#timeline').addEventListener('change',()=>{if(playing)syncSound();});
$('#audio-audition').addEventListener('click',()=>{if(!playing)setPlaying(true);if(!monitor)$('#monitor').click();});
$('#safe-toggle').addEventListener('change',()=>{$('#safe-guide').hidden=!$('#safe-toggle').checked;});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#artboard').requestFullscreen();}catch{toast('Fullscreen is not available here.');}});
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
const fileName=()=>project.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'orbit-escape';
$('#snapshot').addEventListener('click',()=>{if(exporting)return;renderer.beginCapture();renderer.draw(simulation);canvas.toBlob(blob=>{renderer.endCapture();renderer.draw(simulation);if(blob)download(blob,`${fileName()}.png`);},'image/png');});
for(const id of ['#project-name','#project-name-mobile']){
 const field=$(id);
 field.addEventListener('input',()=>{
  project.name=field.value.slice(0,80)||`Untitled ${activeMode.replaceAll('-',' ')}`;
  for(const other of ['#project-name','#project-name-mobile'])if(other!==id)$(other).value=project.name;
  persist('project-name');
 });
 field.addEventListener('blur',()=>{field.value=project.name;});
}
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>document.getElementById(button.dataset.close).close());
$('#result-dialog').addEventListener('close',()=>$('#result-video').pause());
$('#save-button').addEventListener('click',()=>{$('#preset-name').value=project.name;$('#save-dialog').showModal();});
$('#save-form').addEventListener('submit',event=>{if(event.submitter?.value!=='save')return;event.preventDefault();try{const name=$('#preset-name').value.trim();if(!name)return;storage.savePreset(project,name);$('#save-dialog').close();renderPresets();toast('Preset saved on this device.');}catch{toast('Could not save this preset. Download the project JSON instead.');}});
function presetArt(appearance){const art=document.createElement('div');art.className='preset-art';art.style.background=`repeating-radial-gradient(circle,transparent 0 3px,${appearance.startColor} 3px 4px,transparent 4px 6px),${appearance.background}`;return art;}
function renderPresets(){const list=$('#preset-list');list.replaceChildren();const presets=storage.presets().filter(entry=>(entry.project.animation||'ring-escape')===activeMode);if(!presets.length){const empty=document.createElement('div');empty.className='empty-state';empty.innerHTML=icon('bookmark')+'<p>No saved presets.</p><small>Save the current settings to reuse them.</small>';list.append(empty);return;}for(const entry of presets){const card=document.createElement('div');card.className='preset-card';card.append(presetArt(entry.project.appearance));const load=document.createElement('button');load.className='load';const name=document.createElement('strong'),detail=document.createElement('small');name.textContent=entry.name;detail.textContent=`${isRoyale?'Circle Royale':isSpike?'Spike Melody':isMultiplier?'Ball Multiplier':isTimed?'Timed Escape':isCrash?'Rainbow Crash':isWars?'String Wars':isGrowing?'Growing Ball':entry.project.physics.ringCount+' rings'} · ${entry.project.export.duration}s`;load.append(name,detail);load.addEventListener('click',()=>loadProject(entry.project));const remove=document.createElement('button');remove.className='icon-button';remove.setAttribute('aria-label',`Delete preset ${entry.name}`);remove.innerHTML=icon('trash');remove.addEventListener('click',()=>{storage.deletePreset(entry.id);renderPresets();});card.append(load,remove);list.append(card);}}
async function assetCaptions(){for(const [key,label,fallback]of [['impactAsset','impact-name','MP3, WAV, OGG or M4A · up to 20 MB'],['bedAsset','bed-name','Starts with your video and loops to fit.']]){const asset=await storage.getAsset(project.sound[key]).catch(()=>null);$('#'+label).textContent=asset?asset.name:fallback;}$('#remove-bed').hidden=!project.sound.bedAsset;}
function loadProject(input,{notify=true}={}){try{const next=sanitizeProject(input);if(next.animation!==activeMode){storage.saveCurrent(next);location.href=`./studio.html?animation=${next.animation}`;return;}cancelSearch();stopSound();project=next;simulation=projectSimulation(project);renderer.setAppearance(project.appearance);syncFields();clock.reset();persist();assetCaptions();syncSound();scheduleEnding(0);if(notify)toast('Project loaded.');}catch(error){toast(error.message);}}
$('#download-project').addEventListener('click',()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${fileName()}.orbit.json`));
for(const [button,input]of [['import-project','project-file'],['import-midi','midi-file'],['import-impact','impact-file'],['import-bed','bed-file']])$('#'+button).addEventListener('click',()=>$('#'+input).click());
$('#project-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2e6)throw new Error('Choose an Orbit project smaller than 2 MB.');loadProject(JSON.parse(await file.text()));}catch(error){toast('Could not open project: '+error.message);}});
$('#midi-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2e6)throw new Error('Choose a MIDI file smaller than 2 MB.');project.sound.midiNotes=parseMidi(await file.arrayBuffer());apply('sound','melody','midi');toast(`Imported ${project.sound.midiNotes.length} MIDI notes.`);}catch(error){toast(error.message);}});
for(const [input,kind,key]of [['impact-file','impact','impactAsset'],['bed-file','bed','bedAsset']])$('#'+input).addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>20e6)throw new Error('Choose an audio file smaller than 20 MB.');toast('Reading your sound…');const buffer=await audio.decode(file);if(buffer.duration>600)throw new Error('Choose an audio file shorter than 10 minutes.');const asset=await storage.putAsset(file,kind);decodedAssets.set(asset.id,buffer);project.sound[key]=asset.id;if(kind==='impact')project.sound.impact='sample';syncFields();persist();await assetCaptions();scheduleSound();toast(kind==='impact'?'Bounce sound uploaded.':'Background track uploaded.');}catch(error){toast('Could not import audio: '+error.message);}});
$('#remove-bed').addEventListener('click',()=>{apply('sound','bedAsset',null);assetCaptions();});
$('#find-ending').addEventListener('click',()=>{if(exporting)return;if(!usesPlanner){restart();return;}cancelSearch();delete project.scenario;if(!project.export.matchDuration){project.export.matchDuration=true;syncFields();persist();}ensureEnding();});
const outputPanel=$('#output-panel'),narrow=matchMedia('(max-width:1050px)');
function layout(){if(narrow.matches)$('#mobile-export-body').append(outputPanel);else{$('.workspace').append(outputPanel);$('#export-settings-dialog').close();}}
narrow.addEventListener('change',layout);layout();
$('#header-export').addEventListener('click',()=>{
 if(narrow.matches)$('#export-settings-dialog').showModal();
 else $('#output-panel').scrollTop=0;
 $('#duration').focus();
});
$('#render-button').addEventListener('click',()=>startExport());
$('#cancel-render').addEventListener('click',()=>exportController?.abort());
$('#render-dialog').addEventListener('cancel',event=>{event.preventDefault();exportController?.abort();});
function showResult(entry){$('#result-video').src=entry.url;$('#result-download').href=entry.url;$('#result-download').download=entry.name;$('#result-details').textContent=`${entry.width} × ${entry.height} · ${entry.duration}s · ${(entry.blob.size/1e6).toFixed(1)} MB`;$('#result-dialog').showModal();}
function renderExports(){const list=$('#export-list');list.replaceChildren();for(const entry of exports){const card=document.createElement('div');card.className='export-card';card.append(presetArt(entry.appearance));const open=document.createElement('button');open.className='load';const name=document.createElement('strong'),details=document.createElement('small');name.textContent=entry.name;details.textContent=`${entry.duration}s · ${entry.fps} fps · ${(entry.blob.size/1e6).toFixed(1)} MB`;open.append(name,details);open.addEventListener('click',()=>showResult(entry));const link=document.createElement('a');link.className='icon-button';link.href=entry.url;link.download=entry.name;link.setAttribute('aria-label',`Download ${entry.name}`);link.innerHTML=icon('download');card.append(open,link);list.append(card);}}
async function exportVideo(options={}){
 if(exporting)throw new Error('An export is already running.');
 cancelSearch();const snapshot=sanitizeProject({...project,export:{...project.export,...options}}),saved=simulation,savedKey=scenarioKey(project),wasPlaying=playing;exporting=true;playing=false;stopSound();clock.reset();exportController=new AbortController();const external=options.signal;const abort=()=>exportController.abort();external?.addEventListener('abort',abort,{once:true});if(external?.aborted)abort();
 const started=performance.now();$('#export-settings-dialog').close();$('#render-progress').value=0;$('#render-percent').textContent='0%';$('#render-stage').textContent='Preparing synchronized audio…';$('#render-dialog').showModal();
 const progress=(value,label)=>{$('#render-progress').value=value;$('#render-percent').textContent=`${Math.round(value*100)}%`;$('#render-stage').textContent=label;$('#render-elapsed').textContent=timeLabel((performance.now()-started)/1000);};
 try{
  await fitSnapshot(snapshot,{signal:exportController.signal,onProgress:value=>progress(value*.08,'Planning an ending near your selected duration…')});
  if(usesPlanner&&snapshot.export.matchDuration&&savedKey===scenarioKey(project)&&snapshot.export.duration===project.export.duration){project.seed=snapshot.seed;project.scenario=snapshot.scenario;syncFields();persist(null,{derived:true});endingStatus(endingSummary(snapshot),'ready');}
  progress(.08,'Preparing synchronized audio…');const {encodeVideo}=await import('./exporter.js');const {buffer}=await abortable(soundFor(snapshot),exportController.signal);if(exportController.signal.aborted)throw new DOMException('Export cancelled.','AbortError');simulation=projectSimulation(snapshot);if(isWars||isRoyale)await abortable(renderer.prepareIcons((isRoyale?snapshot.royale:snapshot.war).competitors),exportController.signal);renderer.setAppearance(snapshot.appearance);renderer.beginCapture(snapshot.export.resolution,snapshot.export.resolution*16/9);
  const result=await encodeVideo({canvas,renderAt:time=>{simulation.seek(time);renderer.draw(simulation);},audio:buffer,...snapshot.export,signal:exportController.signal,onProgress:progress});
  const entry={...result,duration:snapshot.export.duration,fps:snapshot.export.fps,appearance:snapshot.appearance,url:URL.createObjectURL(result.blob),name:`${fileName()}-${snapshot.seed}.${result.format}`};exports.unshift(entry);if(exports.length>4)URL.revokeObjectURL(exports.pop().url);renderExports();return entry;
 }finally{external?.removeEventListener('abort',abort);simulation=matchedScenario(project)&&(isGrowing?saved.growthRate!==project.scenario.growthRate:JSON.stringify(saved.ballPlan)!==JSON.stringify(project.scenario.ballPlan))?projectSimulation(project):saved;renderer.endCapture();renderer.setAppearance(project.appearance);renderer.draw(simulation);exporting=false;exportController=null;playing=wasPlaying;clock.reset();$('#render-dialog').close();previewButtons();syncHistory();if(usesPlanner&&project.export.matchDuration&&!matchedScenario(project))scheduleEnding(0);else if(playing)syncSound();}
}
async function startExport(){try{const entry=await exportVideo();showResult(entry);}catch(error){if(error.name!=='AbortError')console.error('Video export failed:',error);toast(error.name==='AbortError'?'Export cancelled.':error.message);}}
let lastUI=0;
function frame(timestamp){
 if(!exporting){if(playing&&!document.hidden&&!fitController&&!fitTimer){const target=clock.sample(timestamp,simulation.time,audio.time());simulation.seek(Math.min(target,project.export.duration));if(target>=project.export.duration)restart({automatic:true});}else clock.reset();renderer.draw(simulation);if(timestamp-lastUI>100){$('#time-label').textContent=timeLabel(simulation.time);if(document.activeElement!==$('#timeline'))$('#timeline').value=simulation.time;$('#timeline').style.setProperty('--range-progress',`${simulation.time/project.export.duration*100}%`);lastUI=timestamp;}}
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{clock.reset();if(document.hidden){if(monitor)stopSound();}else if(monitor)syncSound();});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.target.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=color]),[contenteditable=true]')){const key=event.key.toLowerCase();if(key==='z'||key==='y'){event.preventDefault();restoreHistory(key==='y'||event.shiftKey?'redo':'undo');return;}}if(event.code==='Space'&&!event.target.matches('input,textarea,select,button')&&!document.querySelector('dialog[open]')){event.preventDefault();setPlaying(!playing);}});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setPlaying(false);toast('The graphics connection was interrupted. Reload the studio to continue.');});
window.addEventListener('beforeunload',()=>{try{if(saveDirty)storage.saveCurrent(project);}catch{}cancelSearch();exportController?.abort();audio.stop();renderer.dispose();for(const entry of exports)URL.revokeObjectURL(entry.url);});
window.orbit=Object.freeze({
 exportVideo,play:()=>setPlaying(true),pause:()=>setPlaying(false),
 configure:patch=>{if(exporting)throw new Error('Wait for the export to finish.');const next=sanitizeProject({...project,physics:{...project.physics,...patch}});loadProject(next);},
 renderFrame:(frame,fps=60)=>{if(exporting)throw new Error('An export is running.');if(!Number.isInteger(frame)||frame<0||![30,60].includes(fps))throw new RangeError('Provide a non-negative frame at 30 or 60 fps.');setPlaying(false);simulation.seek(frame/fps);renderer.draw(simulation);return canvas;},
 fitEnding:()=>ensureEnding(),
 getState:()=>({animation:activeMode,winner:simulation.winner??null,balls:simulation.balls?.map(({trail,strings,...ball})=>({...ball,...(strings?{stringCount:strings.length}:{})})),bounceCount:simulation.bounceCount,filledAt:simulation.filledAt??null,finishedAt:simulation.finishedAt??null,renderer:isCrash||isTimed||isMultiplier||isSpike||isRoyale?'Canvas 2D':'Three.js',attempt:isTimed?simulation.attempt+1:undefined,frozenCount:isTimed?simulation.frozen.length:undefined,escapeCount:isMultiplier?simulation.escapeCount:undefined,stuckCount:isSpike?simulation.anchors.length:undefined,seed:project.seed,time:simulation.time,ball:{...simulation.ball},shrinkOffset:simulation.shrinkOffset,remaining:simulation.remaining,settings:{...project.physics},playing,recording:exporting,audioPreview:monitor,ending:{state:isCrash||isTimed||isMultiplier||isSpike||isRoyale?'ready':isWars?(project.export.matchDuration?'ready':'off'):fitController||fitTimer?'planning':fitError?'error':matchedScenario(project)?'ready':project.export.matchDuration?'pending':'off',escapedAt:isTimed||isMultiplier||isSpike||isRoyale?simulation.escapedAt:matchedScenario(project)?.escapedAt??null,message:fitError?.message??null},project:structuredClone(project)}),
});
syncFields();syncHistory();previewButtons();assetCaptions();renderPresets();persist(null,{derived:true});renderer.draw(simulation);document.body.classList.remove('studio-loading');document.body.setAttribute('aria-busy','false');$('#studio-boot').hidden=true;requestAnimationFrame(frame);window.dispatchEvent(new Event('orbitready'));scheduleEnding(0);mountPrivacy();
