// Standard MIDI File parser: PPQ timing, tempo changes, running status, and note on/off.
export function parseMidi(arrayBuffer){
 const bytes=new Uint8Array(arrayBuffer),view=new DataView(arrayBuffer);let p=0;
 const text=n=>String.fromCharCode(...bytes.subarray(p,p+=n));
 const read16=()=>{const value=view.getUint16(p);p+=2;return value;},read32=()=>{const value=view.getUint32(p);p+=4;return value;};
 const variable=()=>{let value=0;for(let i=0;i<4;i++){if(p>=bytes.length)throw new Error('Truncated MIDI file.');const b=bytes[p++];value=value*128+(b&127);if(!(b&128))return value;}throw new Error('Invalid MIDI timing.');};
 if(text(4)!=='MThd')throw new Error('Choose a standard .mid or .midi file.');const header=read32();if(header<6)throw new Error('Invalid MIDI header.');const format=read16(),tracks=read16(),division=read16();if(format>1||division&32768||!division)throw new Error('Use a format 0 or 1 MIDI file with musical beat timing.');p=8+header;
 const notes=[],tempos=[{tick:0,value:500000}];
 for(let track=0;track<tracks;track++){
  if(p+8>bytes.length||text(4)!=='MTrk')throw new Error('Invalid MIDI track.');const length=read32(),end=p+length;if(end>bytes.length)throw new Error('Truncated MIDI track.');let tick=0,running=0;const active=new Map();
  while(p<end){tick+=variable();let status=bytes[p++];if(status<128){if(!running)throw new Error('Invalid MIDI running status.');p--;status=running;}else if(status<240)running=status;
   if(status===255){const type=bytes[p++],count=variable();if(type===81&&count===3)tempos.push({tick,value:(bytes[p]<<16)|(bytes[p+1]<<8)|bytes[p+2]});p+=count;}
   else if(status===240||status===247){const count=variable();p+=count;}
   else{const kind=status>>4,channel=status&15,a=bytes[p++],b=kind===12||kind===13?0:bytes[p++],key=channel+':'+a;
    if(kind===9&&b>0){if(!active.has(key))active.set(key,[]);active.get(key).push({tick,midi:a,velocity:b});}
    if(kind===8||(kind===9&&b===0)){const note=active.get(key)?.shift();if(note)notes.push({...note,end:tick});}
   }
   if(p>end)throw new Error('Invalid MIDI event length.');
  }
  for(const group of active.values())for(const note of group)notes.push({...note,end:Math.max(tick,note.tick+division/2)});
 }
 tempos.sort((a,b)=>a.tick-b.tick);
 const seconds=tick=>{let previous=0,time=0,tempo=500000;for(const event of tempos){if(event.tick>tick)break;time+=(event.tick-previous)/division*tempo/1e6;previous=event.tick;tempo=event.value;}return time+(tick-previous)/division*tempo/1e6;};
 const result=notes.filter(note=>note.velocity>0).sort((a,b)=>a.tick-b.tick||a.midi-b.midi).slice(0,2000).map(note=>({midi:note.midi,duration:Math.max(.08,Math.min(2,seconds(note.end)-seconds(note.tick)))}));
 if(!result.length)throw new Error('No musical notes were found in this MIDI file.');return result;
}

