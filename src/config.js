export const PHYSICS_DEFAULTS = Object.freeze({ballSpeed:1,shrinkSpeed:1,shrinkStopTime:0,shrinkStopRadius:90,rotationSpeed:1,ringCount:50,ballRadius:17,gapAngle:42.4,gravity:170,bounciness:1,reverseOnPass:false,direction:1});
export const APPEARANCE_DEFAULTS = Object.freeze({startColor:'#7164ff',endColor:'#ff537c',colors:Object.freeze(['#7164ff','#ff537c']),gradient:true,background:'#060612',ballColor:'#ffffff',title:'WILL THE BALL ESCAPE\nTHE SHRINKING RINGS?',handle:'',showTitle:true,showCounter:true,trail:true,particles:true,glow:0.65,lineWidth:3.5});
export const SOUND_DEFAULTS = Object.freeze({enabled:true,melody:'pentatonic',instrument:'marimba',trigger:'bounce',impact:'soft',breakSound:'shimmer',master:0.7,musicVolume:0.6,impactVolume:0.25,bedVolume:0.25,reverb:0.15,impactAsset:null,bedAsset:null,midiNotes:[]});
export const EXPORT_DEFAULTS = Object.freeze({duration:45,fps:30,resolution:1080,format:'mp4',matchDuration:true});
export const RANGES = {ballSpeed:[.25,3],shrinkSpeed:[0,4],shrinkStopTime:[0,120],shrinkStopRadius:[40,300],rotationSpeed:[0,4],ringCount:[10,100],ballRadius:[8,36],gapAngle:[25,100],gravity:[0,500],bounciness:[.85,1.08]};
export const THEMES = [
 {name:'Ultraviolet',startColor:'#7164ff',endColor:'#ff537c',background:'#060612'},
 {name:'Aurora',startColor:'#4d8dff',endColor:'#69f0ae',background:'#030e13'},
 {name:'Solar flare',startColor:'#ffbf69',endColor:'#ff476f',background:'#12070c'},
 {name:'Ice',startColor:'#c1e7ff',endColor:'#658cff',background:'#030b19'},
 {name:'Monochrome',startColor:'#ffffff',endColor:'#8c93ad',background:'#080a10'},
 {name:'Candy',startColor:'#ed84ff',endColor:'#76e8ff',background:'#10091c'},
];
export const GROWTH_DEFAULTS=Object.freeze({perBounce:1.5,arenaRadius:430,hueSpeed:42,rainbow:true,showRays:true,rayCount:240});
export function growthSettings(input={}){const g={...GROWTH_DEFAULTS};for(const [key,min,max]of [['perBounce',.1,50],['arenaRadius',280,480],['hueSpeed',0,120],['rayCount',20,400]]){const value=input[key]??g[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);g[key]=key==='rayCount'?Math.round(value):value;}g.rainbow=input.rainbow!==false;g.showRays=input.showRays!==false;return g;}
export const CRASH_DEFAULTS=Object.freeze({arenaRadius:475,growth:7,acceleration:1.5,colorCycle:.68,arenaColor:'#ffffff',rainbow:true,fadeOut:true});
export const CRASH_RANGES=Object.freeze({arenaRadius:[300,490],growth:[1,20],acceleration:[0,20],colorCycle:[.1,2]});
export function crashSettings(input={}){
 const settings={...CRASH_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(CRASH_RANGES)){
  const value=input[key]??settings[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);
  settings[key]=value;
 }
 if(/^#[0-9a-f]{6}$/i.test(input.arenaColor||''))settings.arenaColor=input.arenaColor;
 settings.rainbow=input.rainbow!==false;settings.fadeOut=input.fadeOut!==false;
 return settings;
}
export const ANIMATION_MODES=Object.freeze(['ring-escape','growing-ball','string-wars','rainbow-crash','timed-escape','ball-multiplier','spike-melody','circle-royale']);
export const SPIKE_DEFAULTS=Object.freeze({arenaRadius:420,spikeCount:56,spikeDepth:42,gapPosition:224,ringColor:'#5bb4f3'});
export const SPIKE_RANGES=Object.freeze({arenaRadius:[300,475],spikeCount:[24,96],spikeDepth:[15,75],gapPosition:[0,360]});
export function spikeSettings(input={}){
 const settings={...SPIKE_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(SPIKE_RANGES)){
  const value=input?.[key]??settings[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);
  settings[key]=key==='spikeCount'?Math.round(value):value;
 }
 if(/^#[0-9a-f]{6}$/i.test(input?.ringColor||''))settings.ringColor=input.ringColor;
 return settings;
}
export const MULTIPLIER_DEFAULTS=Object.freeze({children:3,maxBalls:820,arenaRadius:405,ringColor:'#7aef9c',rainbow:true});
export const MULTIPLIER_RANGES=Object.freeze({children:[2,8],maxBalls:[100,1000],arenaRadius:[300,475]});
export function multiplierSettings(input={}){
 const settings={...MULTIPLIER_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(MULTIPLIER_RANGES)){
  const value=input?.[key]??settings[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);
  settings[key]=key==='arenaRadius'?value:Math.round(value);
 }
 if(/^#[0-9a-f]{6}$/i.test(input?.ringColor||''))settings.ringColor=input.ringColor;
 settings.rainbow=input?.rainbow!==false;
 return settings;
}
export const TIMED_ESCAPE_DEFAULTS=Object.freeze({arenaRadius:428,attemptSeconds:4,gapPosition:176,ringColor:'#ff604f',rainbow:true});
export const TIMED_ESCAPE_RANGES=Object.freeze({arenaRadius:[300,475],attemptSeconds:[1,12],gapPosition:[0,360]});
export function timedEscapeSettings(input={}){
 const settings={...TIMED_ESCAPE_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(TIMED_ESCAPE_RANGES)){
  const value=input?.[key]??settings[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);
  settings[key]=value;
 }
 if(/^#[0-9a-f]{6}$/i.test(input?.ringColor||''))settings.ringColor=input.ringColor;
 settings.rainbow=input?.rainbow!==false;
 return settings;
}
export const WAR_COLORS=['#33dbe8','#46e978','#ff6587','#ffe14a','#a58bff','#ffab5c','#e77bff','#a7efff'];
export const WAR_DEFAULTS=Object.freeze({arenaRadius:430,initialStrings:6,stringsPerBounce:3,maxStrings:40,showdownPercent:90,showdownSpeed:1,stringOpacity:.75,ballCollisions:false});
export const defaultCompetitor=index=>({name:['Cyan','Green','Rose','Gold','Violet','Amber','Pink','Ice'][index],color:WAR_COLORS[index],icon:null});
export function warSettings(input={}){const w={...WAR_DEFAULTS};for(const [key,min,max]of [['arenaRadius',280,480],['initialStrings',1,40],['stringsPerBounce',1,6],['maxStrings',5,60],['showdownPercent',20,90],['showdownSpeed',1,3],['stringOpacity',.1,1]]){const value=input[key]??w[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);w[key]=['initialStrings','stringsPerBounce','maxStrings','showdownPercent'].includes(key)?Math.round(value):value;}w.initialStrings=Math.min(w.initialStrings,w.maxStrings);w.ballCollisions=typeof input.ballCollisions==='boolean'?input.ballCollisions:w.ballCollisions;w.competitors=competitorRoster(input.competitors,4,8,defaultCompetitor);return w;}
function competitorRoster(input,count,limit,makeDefault){
 const roster=input??Array.from({length:count},(_,i)=>makeDefault(i));
 if(!Array.isArray(roster)||roster.length<2||roster.length>limit)throw new RangeError(`Choose between 2 and ${limit} balls.`);
 return roster.map((entry,index)=>{
  const fallback=makeDefault(index);
  return {name:String(entry?.name||fallback.name).slice(0,18),
   color:/^#[0-9a-f]{6}$/i.test(entry?.color||'')?entry.color:fallback.color,
   icon:typeof entry?.icon==='string'&&entry.icon.length<100000&&/^data:image\/png;base64,[a-zA-Z0-9+/]+=*$/.test(entry.icon)?entry.icon:null};
 });
}
export const ROYALE_LIMIT=12;
const ROYALE_NAMES=['Ava','Kai','Mia','Leo','Zoe','Ivy','Max','Sam','Nova','Finn','Jade','Rio'];
const ROYALE_COLORS=['#ef547c','#5294f3','#ae61ee','#ff974c','#a1d838','#43d6bb','#e7539f','#55cf79','#f4ca3f','#71b3ee','#a682ff','#e96d55'];
export const defaultRoyaleCompetitor=index=>({name:ROYALE_NAMES[index],color:ROYALE_COLORS[index],icon:null});
export const ROYALE_DEFAULTS=Object.freeze({arenaRadius:450,ballRadius:53,gateCycle:3,openPercent:37,gateColor:'#ff4c82',ringColor:'#f3f4f5',showNames:true,showEliminations:true});
export const ROYALE_RANGES=Object.freeze({arenaRadius:[330,475],ballRadius:[24,56],gateCycle:[1,8],openPercent:[15,80]});
export function royaleSettings(input={}){
 const settings={...ROYALE_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(ROYALE_RANGES)){
  const value=input?.[key]??settings[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);
  settings[key]=value;
 }
 for(const key of ['gateColor','ringColor'])if(/^#[0-9a-f]{6}$/i.test(input?.[key]||''))settings[key]=input[key];
 for(const key of ['showNames','showEliminations'])settings[key]=input?.[key]!==false;
 settings.competitors=competitorRoster(input?.competitors,10,ROYALE_LIMIT,defaultRoyaleCompetitor);
 return settings;
}
export function createProject(animation='ring-escape'){const p={version:2,animation:ANIMATION_MODES.includes(animation)?animation:'ring-escape',name:'Untitled escape',seed:48291,physics:{...PHYSICS_DEFAULTS},appearance:{...APPEARANCE_DEFAULTS,colors:[...APPEARANCE_DEFAULTS.colors]},sound:{...SOUND_DEFAULTS,midiNotes:[]},export:{...EXPORT_DEFAULTS}};if(p.animation==='growing-ball'){p.name='Untitled growing ball';p.growth={...GROWTH_DEFAULTS};Object.assign(p.physics,{ballSpeed:1.75,ballRadius:8,gravity:170});Object.assign(p.appearance,{background:'#000000',title:'THE BALL GROWS\nWITH EVERY BOUNCE',particles:false});Object.assign(p.sound,{instrument:'piano',impact:'none',breakSound:'none'});p.export.duration=60;}if(p.animation==='string-wars'){p.name='Untitled string wars';p.seed=84;p.export.fps=60;p.war=warSettings();Object.assign(p.physics,{ballSpeed:1.1,ballRadius:30,gravity:0});Object.assign(p.appearance,{background:'#080a0c',title:'STRING WARS',lineWidth:3});Object.assign(p.sound,{melody:'none',impact:'click',breakSound:'pop',impactVolume:.18,reverb:0});}if(p.animation==='rainbow-crash'){p.name='Untitled rainbow crash';p.seed=84;p.crash=crashSettings();Object.assign(p.physics,{ballSpeed:.35,ballRadius:8,gravity:330});Object.assign(p.appearance,{background:'#000000',ballColor:'#020202',title:'BIGGER AND FASTER\nAFTER EVERY BOUNCE',lineWidth:1,showCounter:false,particles:false});Object.assign(p.sound,{melody:'none',impact:'click',impactVolume:.20,reverb:0});Object.assign(p.export,{duration:60,fps:60,matchDuration:false});}
 if(p.animation==='timed-escape'){
  p.name='Untitled timed escape';p.seed=1;p.timedEscape=timedEscapeSettings();
  Object.assign(p.physics,{ballSpeed:.92,ballRadius:25,gapAngle:25,gravity:125});
  const colors=['#9bf77b','#b9f7cf','#aea6f5','#ed7edb','#f98591','#ffe2ab','#66f1be','#7daeff'];
  Object.assign(p.appearance,{colors,startColor:colors[0],endColor:colors.at(-1),gradient:false,background:'#060613',title:'EACH BALL HAS ONLY\n{time} TO ESCAPE',lineWidth:5,glow:.18,showCounter:false,trail:false});
  Object.assign(p.sound,{melody:'none',trigger:'both',impact:'click',breakSound:'shimmer',impactVolume:.24,reverb:.08});
  Object.assign(p.export,{duration:35,fps:60,matchDuration:false});
 }
 if(p.animation==='ball-multiplier'){
  p.name='Untitled ball multiplier';p.seed=13;p.multiplier=multiplierSettings();
  Object.assign(p.physics,{ballSpeed:.75,ballRadius:14,gapAngle:36,rotationSpeed:1,gravity:190,direction:-1});
  const colors=['#9df377','#6ee5dc','#c3a0ff','#f884ad','#ffce79','#7fb6ff'];
  Object.assign(p.appearance,{colors,startColor:colors[0],endColor:colors.at(-1),gradient:false,background:'#060612',title:'EVERY ESCAPE SPAWNS\n{count} NEW BALLS',lineWidth:5,glow:.15,showCounter:false,trail:false,particles:false});
  Object.assign(p.sound,{melody:'none',trigger:'both',impact:'click',breakSound:'pop',impactVolume:.24,reverb:.08});
  Object.assign(p.export,{duration:50,fps:60,matchDuration:false});
 }
 if(p.animation==='spike-melody'){
  p.name='Untitled spike melody';p.seed=187;p.spike=spikeSettings();
  Object.assign(p.physics,{ballSpeed:.95,ballRadius:27,gapAngle:38,gravity:70});
  const colors=['#9867ff','#ff6d80','#71ed87','#ffdf55','#75c4fb','#ff9b55','#f881be'];
  Object.assign(p.appearance,{colors,startColor:colors[0],endColor:colors.at(-1),gradient:false,background:'#080a0c',title:'GUESS THE SONG',lineWidth:2,glow:.15,showCounter:false});
  Object.assign(p.sound,{melody:'twinkle',instrument:'musicbox',impact:'none',breakSound:'shimmer',impactVolume:.18,reverb:.18});
  Object.assign(p.export,{duration:25,fps:60,matchDuration:false});
 }
 if(p.animation==='circle-royale'){
  p.name='Untitled circle royale';p.seed=183;p.royale=royaleSettings();
  Object.assign(p.physics,{ballSpeed:1.1,gapAngle:53,rotationSpeed:1,gravity:0});
  Object.assign(p.appearance,{background:'#080b0d',title:'LAST BALL IN THE CIRCLE WINS',lineWidth:6,glow:.15,trail:false});
  Object.assign(p.sound,{melody:'none',trigger:'both',impact:'soft',breakSound:'pop',impactVolume:.18,reverb:.08});
  Object.assign(p.export,{duration:42,fps:60,matchDuration:false});
 }
 return p;
}
export function physicsSettings(input={}){
 const p={...PHYSICS_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(RANGES)){const value=input[key]??p[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);p[key]=key==='ringCount'?Math.round(value):value;}
 p.reverseOnPass=Boolean(input.reverseOnPass??p.reverseOnPass);p.direction=input.direction===-1?-1:1;return Object.freeze(p);
}
export function sanitizeProject(input){
 const p=createProject(input?.animation);if(!input||typeof input!=='object')throw new Error('This is not an Orbit project.');
 p.name=String(input.name||p.name).slice(0,80);p.seed=Number(input.seed??p.seed)>>>0;p.physics={...physicsSettings({...p.physics,...input.physics})};
 const a=input.appearance||{};for(const key of ['startColor','endColor','background','ballColor'])if(/^#[0-9a-f]{6}$/i.test(a[key]||''))p.appearance[key]=a[key];
 p.appearance.colors=Array.isArray(a.colors)?a.colors.filter(color=>/^#[0-9a-f]{6}$/i.test(color)).slice(0,12):[];
 if(!p.appearance.colors.length)p.appearance.colors=[p.appearance.startColor,p.appearance.endColor];
 p.appearance.startColor=p.appearance.colors[0];p.appearance.endColor=p.appearance.colors.at(-1);p.appearance.gradient=typeof a.gradient==='boolean'?a.gradient:p.appearance.gradient;
 for(const key of ['showTitle','showCounter','trail','particles'])if(typeof a[key]==='boolean')p.appearance[key]=a[key];
 p.appearance.title=String(a.title??p.appearance.title).slice(0,160);p.appearance.handle=String(a.handle??'').slice(0,50);
 for(const key of ['glow','lineWidth']){const value=Number(a[key]);if(Number.isFinite(value))p.appearance[key]=Math.max(key==='glow'?0:1,Math.min(key==='glow'?1:7,value));}
 const s=input.sound||{};p.sound.enabled=s.enabled!==false;
 for(const key of ['master','musicVolume','impactVolume','bedVolume','reverb'])if(Number.isFinite(s[key]))p.sound[key]=Math.max(0,Math.min(1,s[key]));
 for(const [key,values] of Object.entries({melody:['none','pentatonic','twinkle','ode','midi'],instrument:['marimba','piano','musicbox','chip'],trigger:['bounce','escape','both'],impact:['none','soft','click','wood','sample'],breakSound:['none','shimmer','pop']}))if(values.includes(s[key]))p.sound[key]=s[key];
 for(const key of ['impactAsset','bedAsset'])p.sound[key]=typeof s[key]==='string'?s[key].slice(0,100):null;
 if(Array.isArray(s.midiNotes))p.sound.midiNotes=s.midiNotes.slice(0,2000).filter(n=>Number.isFinite(n.midi)&&n.midi>=0&&n.midi<=127).map(n=>({midi:Math.round(n.midi),duration:Math.max(.05,Math.min(3,Number(n.duration)||.3))}));
 const x=input.export||{};p.export.duration=Math.max(5,Math.min(120,Math.round(Number(x.duration)||p.export.duration)));p.export.fps=[30,60].includes(x.fps)?x.fps:p.export.fps;p.export.resolution=x.resolution===720?720:1080;p.export.format=x.format==='webm'?'webm':'mp4';p.export.matchDuration=x.matchDuration!==false;
 if(p.animation==='growing-ball'){p.growth=growthSettings(input.growth);if(p.sound.trigger==='escape')p.sound.trigger='bounce';}
 if(p.animation==='string-wars'){p.war=warSettings(input.war);return p;}
 if(p.animation==='rainbow-crash'){p.crash=crashSettings(input.crash);p.sound.trigger='bounce';p.export.matchDuration=false;return p;}
 if(p.animation==='circle-royale'){p.royale=royaleSettings(input.royale);p.export.matchDuration=false;return p;}
 if(p.animation==='spike-melody'){p.spike=spikeSettings(input.spike);p.export.matchDuration=false;return p;}
 if(p.animation==='ball-multiplier'){p.multiplier=multiplierSettings(input.multiplier);p.export.matchDuration=false;return p;}
 if(p.animation==='timed-escape'){p.timedEscape=timedEscapeSettings(input.timedEscape);p.export.matchDuration=false;return p;}
 const scenario=input.scenario,plan=scenario?.ballPlan;
 if(scenario&&typeof scenario.key==='string'&&scenario.key.length<3000&&Number.isFinite(scenario.escapedAt)&&scenario.escapedAt>0&&scenario.escapedAt<p.export.duration&&plan&&Number.isFinite(plan.launchAngle)&&Math.abs(plan.launchAngle)<100&&Array.isArray(plan.bounces)&&plan.bounces.length<=2000&&plan.bounces.every((turn,index)=>Number.isInteger(turn.tick)&&turn.tick>0&&turn.tick<=p.export.duration*240&&Number.isFinite(turn.angle)&&Math.abs(turn.angle)<100&&(!index||turn.tick>plan.bounces[index-1].tick)))p.scenario={key:scenario.key,escapedAt:scenario.escapedAt,ballPlan:{launchAngle:plan.launchAngle,bounces:plan.bounces.map(turn=>({tick:turn.tick,angle:turn.angle}))}};if(p.animation==='growing-ball'){delete p.scenario;if(scenario&&typeof scenario.key==='string'&&scenario.key.length<3000&&Number.isFinite(scenario.growthRate)&&scenario.growthRate>0&&scenario.growthRate<=480&&Number.isFinite(scenario.escapedAt)&&scenario.escapedAt>0&&scenario.escapedAt<p.export.duration)p.scenario={key:scenario.key,growthRate:scenario.growthRate,escapedAt:scenario.escapedAt};}return p;
}
