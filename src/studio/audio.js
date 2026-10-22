import {seededRandom} from '../animation/simulation.js';
export const MELODIES={
 pentatonic:{name:'Orbit steps',notes:[60,64,67,69,72,69,67,64,62,65,69,72,74,72,69,65]},
 twinkle:{name:'Twinkle, Twinkle',notes:[60,60,67,67,69,69,67,65,65,64,64,62,62,60]},
 ode:{name:'Ode to Joy',notes:[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]},
};
export const frequency=midi=>440*Math.pow(2,(midi-69)/12);
export function noteEvents(project,events){let index=0;const s=project.sound;const list=s.melody==='midi'?s.midiNotes:(MELODIES[s.melody]?.notes||[]).map(midi=>({midi,duration:.35}));if(!list.length)return[];return events.filter(event=>s.trigger==='both'||event.type===s.trigger).map(event=>({...event,...list[index++%list.length]}));}
function pan(context,bus,x){const p=context.createStereoPanner();p.pan.value=Math.max(-.65,Math.min(.65,x/540*.65));p.connect(bus);return p;}
function synth(context,bus,time,midi,instrument,volume,duration,x){
 const freq=frequency(midi),voice=context.createGain(),destination=pan(context,bus,x);voice.connect(destination);
 const length=Math.min(1.5,Math.max(.12,duration));voice.gain.setValueAtTime(0,time);voice.gain.linearRampToValueAtTime(volume,time+.004);voice.gain.exponentialRampToValueAtTime(.0001,time+length);
 const tones=instrument==='musicbox'?[[1,.7],[2,.2],[3,.1]]:instrument==='piano'?[[1,.65],[2,.22],[3,.09]]:instrument==='marimba'?[[1,.8],[4,.12]]:[[1,.65]];
 for(const [multiple,gain]of tones){const oscillator=context.createOscillator(),level=context.createGain();oscillator.type=instrument==='chip'?'triangle':'sine';oscillator.frequency.setValueAtTime(freq*multiple,time);level.gain.value=gain;oscillator.connect(level);level.connect(voice);oscillator.start(time);oscillator.stop(time+length+.01);}
}
function sample(context,bus,buffer,time,volume,x,maxDuration=2){if(!buffer||volume<=0)return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;const length=Math.min(maxDuration,buffer.duration);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.003);gain.gain.setValueAtTime(volume,time+Math.max(.004,length-.025));gain.gain.linearRampToValueAtTime(0,time+length);source.connect(gain);gain.connect(pan(context,bus,x));source.start(time,0,length);}
function noise(context,seed,seconds){const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*seconds),context.sampleRate),data=buffer.getChannelData(0),random=seededRandom(seed);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*Math.pow(1-i/data.length,2);return buffer;}
export async function renderSound(project,events,assets={}){
 if(!project.sound.enabled)return null;
 const duration=project.export.duration,s=project.sound,context=new OfflineAudioContext(2,Math.ceil(duration*48000),48000),master=context.createGain(),bus=context.createGain(),compressor=context.createDynamicsCompressor();
 compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=6;compressor.attack.value=.003;compressor.release.value=.12;
 bus.connect(compressor);compressor.connect(master);master.gain.setValueAtTime(s.master,0);master.gain.setValueAtTime(s.master,Math.max(0,duration-.03));master.gain.linearRampToValueAtTime(0,duration);master.connect(context.destination);
 if(s.reverb>0){const convolution=context.createConvolver(),wet=context.createGain();convolution.buffer=noise(context,project.seed^31337,.85);wet.gain.value=s.reverb*.3;bus.connect(convolution);convolution.connect(wet);wet.connect(compressor);}
 for(const event of noteEvents(project,events))if(event.time<duration-.01)synth(context,bus,event.time,event.midi,s.instrument,s.musicVolume*.32,event.duration,event.x);
 const impactNoise=noise(context,project.seed^9834,.08),breakNoise=noise(context,project.seed^3425,.25);
 for(const event of events){const time=event.time;if(time>=duration-.01)continue;
  if(event.type==='bounce'&&s.impact!=='none'){
   if(s.impact==='sample')sample(context,bus,assets.impact,time,s.impactVolume,event.x,2);
   else if(s.impact==='click')sample(context,bus,impactNoise,time,s.impactVolume*.35,event.x,.05);
   else synth(context,bus,time,s.impact==='wood'?43:76,'marimba',s.impactVolume*.22,s.impact==='wood'?.09:.045,event.x);
  }
  if(event.type==='escape'&&s.breakSound!=='none'){
   if(s.breakSound==='pop')sample(context,bus,breakNoise,time,s.impactVolume*.3,event.x,.14);
   else synth(context,bus,time,84+(event.ring%5)*2,'musicbox',s.impactVolume*.18,.35,event.x);
  }
 }
 if(assets.bed&&s.bedVolume>0){const source=context.createBufferSource(),gain=context.createGain();source.buffer=assets.bed;source.loop=true;gain.gain.value=s.bedVolume;source.connect(gain);gain.connect(bus);source.start(0);source.stop(duration);}
 return context.startRendering();
}
export class PreviewAudio{
 context=null;source=null;anchor=0;offset=0;buffer=null;
 async ensure(){if(!this.context||this.context.state==='closed')this.context=new AudioContext({latencyHint:'interactive'});await this.context.resume();return this.context;}
 async play(buffer,offset=0){await this.ensure();this.stop();if(!buffer)return;this.buffer=buffer;this.offset=Math.min(Math.max(0,offset),Math.max(0,buffer.duration-.01));const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);this.anchor=this.context.currentTime+.04;this.source=source;source.onended=()=>{if(this.source===source)this.source=null;};source.start(this.anchor,this.offset);}
 time(){return this.source?this.offset+Math.max(0,this.context.currentTime-this.anchor):null;}
 stop(){if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}}
 async decode(blob){const context=new OfflineAudioContext(2,1,48000);return context.decodeAudioData(await blob.arrayBuffer());}
}

