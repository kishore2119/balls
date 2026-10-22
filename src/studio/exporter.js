import {Output,BufferTarget,CanvasSource,AudioBufferSource,Mp4OutputFormat,WebMOutputFormat,Quality,canEncodeVideo,canEncodeAudio} from '../../vendor/mediabunny/mediabunny.min.mjs';
let aacReady;
async function ensureAac(){if(await canEncodeAudio('aac'))return;aacReady??=import('../../vendor/aac-encoder/mediabunny-aac-encoder.min.mjs').then(module=>module.registerAacEncoder());await aacReady;}
const abortError=()=>new DOMException('Export cancelled.','AbortError');
export async function encodeVideo({canvas,renderAt,audio,format='mp4',fps=30,duration=45,resolution=1080,signal,onProgress=()=>{}}){
 if(![30,60].includes(fps)||!Number.isFinite(duration)||duration<=0||duration>120)throw new Error('Choose 30 or 60 fps and a duration up to 120 seconds.');
 const width=resolution===720?720:1080,height=width*16/9;let videoCodec;
 if(format==='mp4'){
  if(await canEncodeVideo('avc',{width,height}))videoCodec='avc';else throw new Error('H.264 encoding is unavailable in this browser. Choose WebM or open Orbit in Chrome or Edge.');
  if(audio)await ensureAac();
 }else{for(const codec of ['vp9','vp8'])if(await canEncodeVideo(codec,{width,height})){videoCodec=codec;break;}if(!videoCodec)throw new Error('Video encoding is unavailable in this browser. Try Chrome or Edge.');}
 if(signal?.aborted)throw abortError();
 const surface=document.createElement('canvas');surface.width=width;surface.height=height;const context=surface.getContext('2d',{alpha:false});
 const target=new BufferTarget(),output=new Output({format:format==='mp4'?new Mp4OutputFormat({fastStart:'in-memory'}):new WebMOutputFormat(),target});
 const video=new CanvasSource(surface,{codec:videoCodec,quality:new Quality('high'),keyFrameInterval:2});output.addVideoTrack(video,{frameRate:fps});
 let sound;if(audio){sound=new AudioBufferSource({codec:format==='mp4'?'aac':'opus',quality:new Quality('high')});output.addAudioTrack(sound);}
 const cancel=()=>{output.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 try{
  await output.start();if(audio){onProgress(.02,'Encoding synchronized audio');await sound.add(audio);sound.close();}
  const count=Math.round(duration*fps);let lastYield=performance.now();
  for(let frame=0;frame<count;frame++){
   if(signal?.aborted)throw abortError();renderAt(frame/fps);context.drawImage(canvas,0,0,width,height);await video.add(frame/fps,1/fps);onProgress(.05+(frame+1)/count*.91,`Rendering frame ${frame+1} of ${count}`);
   if(performance.now()-lastYield>18){await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
  }
  video.close();onProgress(.98,'Finalizing your video');await output.finalize();if(signal?.aborted)throw abortError();const blob=new Blob([target.buffer],{type:format==='mp4'?'video/mp4':'video/webm'});if(!blob.size)throw new Error('The browser returned an empty video.');onProgress(1,'Ready to download');return {blob,frames:count,width,height,format};
 }catch(error){try{await output.cancel();}catch{}if(signal?.aborted)throw abortError();throw error;}finally{signal?.removeEventListener('abort',cancel);}
}


