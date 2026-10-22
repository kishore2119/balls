// Preview and export both seek the same absolute simulation timeline.
export class PlaybackClock {
 constructor(){this.reset();}
 reset(){this.last=null;this.position=0;}
 sample(timestamp,currentTime,audioTime=null){
  if(this.last===null)this.position=currentTime;
  else this.position+=Math.max(0,(timestamp-this.last)/1000);
  this.last=timestamp;
  if(audioTime!==null)this.position=audioTime;
  return this.position;
 }
}
