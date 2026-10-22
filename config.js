export const PHYSICS_DEFAULTS = Object.freeze({ballSpeed:1,shrinkSpeed:1,shrinkStopTime:0,shrinkStopRadius:90,rotationSpeed:1,ringCount:50,ballRadius:17,gapAngle:42.4,gravity:170,bounciness:1,reverseOnPass:false,direction:1});
export const APPEARANCE_DEFAULTS = Object.freeze({startColor:'#7164ff',endColor:'#ff537c',colors:Object.freeze(['#7164ff','#ff537c']),gradient:true,background:'#060612',ballColor:'#ffffff',title:'WILL THE BALL ESCAPE\nTHE SHRINKING RINGS?',handle:'',showTitle:true,showCounter:true,trail:true,particles:true,glow:0.65,lineWidth:3.5});
export const SOUND_DEFAULTS = Object.freeze({enabled:true,melody:'pentatonic',instrument:'marimba',trigger:'bounce',impact:'soft',breakSound:'shimmer',master:0.7,musicVolume:0.6,impactVolume:0.25,bedVolume:0.25,reverb:0.15,impactAsset:null,bedAsset:null,midiNotes:[]});
export const EXPORT_DEFAULTS = Object.freeze({duration:45,fps:30,resolution:1080,format:'mp4'});
export const RANGES = {ballSpeed:[.25,3],shrinkSpeed:[0,4],shrinkStopTime:[0,120],shrinkStopRadius:[40,300],rotationSpeed:[0,4],ringCount:[10,100],ballRadius:[8,36],gapAngle:[25,100],gravity:[0,500],bounciness:[.85,1.08]};
export const THEMES = [
 {name:'Ultraviolet',startColor:'#7164ff',endColor:'#ff537c',background:'#060612'},
 {name:'Aurora',startColor:'#4d8dff',endColor:'#69f0ae',background:'#030e13'},
 {name:'Solar flare',startColor:'#ffbf69',endColor:'#ff476f',background:'#12070c'},
 {name:'Ice',startColor:'#c1e7ff',endColor:'#658cff',background:'#030b19'},
 {name:'Monochrome',startColor:'#ffffff',endColor:'#8c93ad',background:'#080a10'},
 {name:'Candy',startColor:'#ed84ff',endColor:'#76e8ff',background:'#10091c'},
];
export function createProject(){return {version:2,name:'Untitled escape',seed:48291,physics:{...PHYSICS_DEFAULTS},appearance:{...APPEARANCE_DEFAULTS,colors:[...APPEARANCE_DEFAULTS.colors]},sound:{...SOUND_DEFAULTS,midiNotes:[]},export:{...EXPORT_DEFAULTS}};}
export function physicsSettings(input={}){
 const p={...PHYSICS_DEFAULTS};
 for(const [key,[min,max]] of Object.entries(RANGES)){const value=input[key]??p[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} must be between ${min} and ${max}.`);p[key]=key==='ringCount'?Math.round(value):value;}
 p.reverseOnPass=Boolean(input.reverseOnPass??p.reverseOnPass);p.direction=input.direction===-1?-1:1;return Object.freeze(p);
}
export function sanitizeProject(input){
 const p=createProject();if(!input||typeof input!=='object')throw new Error('This is not an Orbit project.');
 p.name=String(input.name||p.name).slice(0,80);p.seed=Number(input.seed??p.seed)>>>0;p.physics={...physicsSettings(input.physics)};
 const a=input.appearance||{};for(const key of ['startColor','endColor','background','ballColor'])if(/^#[0-9a-f]{6}$/i.test(a[key]||''))p.appearance[key]=a[key];
 p.appearance.colors=Array.isArray(a.colors)?a.colors.filter(color=>/^#[0-9a-f]{6}$/i.test(color)).slice(0,12):[];
 if(!p.appearance.colors.length)p.appearance.colors=[p.appearance.startColor,p.appearance.endColor];
 p.appearance.startColor=p.appearance.colors[0];p.appearance.endColor=p.appearance.colors.at(-1);p.appearance.gradient=a.gradient!==false;
 for(const key of ['showTitle','showCounter','trail','particles'])if(typeof a[key]==='boolean')p.appearance[key]=a[key];
 p.appearance.title=String(a.title??p.appearance.title).slice(0,160);p.appearance.handle=String(a.handle??'').slice(0,50);
 for(const key of ['glow','lineWidth']){const value=Number(a[key]);if(Number.isFinite(value))p.appearance[key]=Math.max(key==='glow'?0:1,Math.min(key==='glow'?1:7,value));}
 const s=input.sound||{};p.sound.enabled=s.enabled!==false;
 for(const key of ['master','musicVolume','impactVolume','bedVolume','reverb'])if(Number.isFinite(s[key]))p.sound[key]=Math.max(0,Math.min(1,s[key]));
 for(const [key,values] of Object.entries({melody:['none','pentatonic','twinkle','ode','midi'],instrument:['marimba','piano','musicbox','chip'],trigger:['bounce','escape','both'],impact:['none','soft','click','wood','sample'],breakSound:['none','shimmer','pop']}))if(values.includes(s[key]))p.sound[key]=s[key];
 for(const key of ['impactAsset','bedAsset'])p.sound[key]=typeof s[key]==='string'?s[key].slice(0,100):null;
 if(Array.isArray(s.midiNotes))p.sound.midiNotes=s.midiNotes.slice(0,2000).filter(n=>Number.isFinite(n.midi)&&n.midi>=0&&n.midi<=127).map(n=>({midi:Math.round(n.midi),duration:Math.max(.05,Math.min(3,Number(n.duration)||.3))}));
 const x=input.export||{};p.export.duration=Math.max(5,Math.min(120,Math.round(Number(x.duration)||45)));p.export.fps=x.fps===60?60:30;p.export.resolution=x.resolution===720?720:1080;p.export.format=x.format==='webm'?'webm':'mp4';return p;
}
