import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,collectEvents,STEP} from '../simulation.js';
import {createProject,sanitizeProject} from '../config.js';
import {noteEvents} from '../audio.js';
import {parseMidi} from '../midi.js';
import {PlaybackClock} from '../playback-clock.js';
import {ringColor,segmentCounts,resizePalette} from '../palette.js';

test('preview audio clock and export agree at every sampled timestamp',()=>{
 for(const fps of [30,60,144]){
  const preview=new Simulation(183,{ballSpeed:2,shrinkSpeed:2}),reference=new Simulation(183,{ballSpeed:2,shrinkSpeed:2}),clock=new PlaybackClock();
  for(let frame=0;frame<fps*8;frame++){
   const seconds=frame/fps+.0013;
   preview.seek(clock.sample(frame*1000/fps,preview.time,seconds));reference.seek(seconds);
   assert.equal(preview.tick,reference.tick);assert.deepEqual(preview.ball,reference.ball);
  }
 }
});
test('silent preview preserves time over irregular frames, pauses, and resume',()=>{
 const clock=new PlaybackClock();assert.equal(clock.sample(100,2),2);
 assert.ok(Math.abs(clock.sample(117,2)+0-2.017)<1e-10);
 assert.ok(Math.abs(clock.sample(1400,2)-3.3)<1e-10);
 clock.reset();assert.equal(clock.sample(20000,3.3),3.3);
 assert.ok(Math.abs(clock.sample(20100,3.3)-3.4)<1e-10);
});
test('solid color segments divide 50 rings into five groups of ten',()=>{
 const colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ffffff'],appearance={colors,gradient:false};
 assert.deepEqual(segmentCounts(50,5),[10,10,10,10,10]);
 for(let i=0;i<50;i++)assert.equal(ringColor(appearance,i,50),colors[Math.floor(i/10)]);
 assert.deepEqual(segmentCounts(50,3),[17,17,16]);
});
test('gradients pass through every chosen color and a single color stays solid',()=>{
 const colors=['#ff0000','#00ff00','#0000ff'];
 assert.equal(ringColor({colors,gradient:true},0,51),colors[0]);
 assert.equal(ringColor({colors,gradient:true},25,51),colors[1]);
 assert.equal(ringColor({colors,gradient:true},50,51),colors[2]);
 assert.equal(ringColor({colors:['#123456'],gradient:true},25,50),'#123456');
 assert.equal(resizePalette(colors,5).length,5);
});
test('old presets retain their colors and new palettes survive project sanitizing',()=>{
 const old=sanitizeProject({appearance:{startColor:'#ed84ff',endColor:'#14505d'}});
 assert.deepEqual(old.appearance.colors,['#ed84ff','#14505d']);assert.equal(old.appearance.gradient,true);
 const next=sanitizeProject({...old,appearance:{...old.appearance,colors:['#ff0000','#00ff00','#0000ff'],gradient:false}});
 assert.deepEqual(next.appearance.colors,['#ff0000','#00ff00','#0000ff']);assert.equal(next.appearance.gradient,false);
 assert.equal(createProject().physics.shrinkStopTime,0);
});
test('shrinking stops at the chosen time while the ball and rotation continue',()=>{
 const s=new Simulation(22,{shrinkStopTime:1.5,shrinkSpeed:1});s.seek(1.5);
 assert.ok(Math.abs(s.shrinkOffset-36)<1e-8);const ball={...s.ball},angle=s.rings.find(r=>r.alive).angle;
 s.seek(4);assert.ok(Math.abs(s.shrinkOffset-36)<1e-8);assert.notDeepEqual(s.ball,ball);
 assert.notEqual(s.rings.find(r=>r.alive).angle,angle);
 assert.deepEqual(collectEvents(22,s.settings,4).events,s.events);
});
test('a selected minimum radius is respected and narrow gaps remain playable',()=>{
 for(const settings of [{shrinkStopRadius:120,shrinkSpeed:4},{shrinkStopRadius:40,ballRadius:36,gapAngle:25}]){
  const s=new Simulation(22,settings);s.seek(20);
  assert.ok(s.rings.filter(r=>r.alive).every(r=>r.radius>=s.minRadius-1e-7));
  assert.ok(s.minRadius>=settings.shrinkStopRadius);
 }
});

test('collision event timestamps and ordering are deterministic across render rates',()=>{
 const a=new Simulation(48291),b=new Simulation(48291);
 for(let i=0;i<600;i++)a.advance(1/30);
 for(let i=0;i<1200;i++)b.advance(1/60);
 assert.deepEqual(a.events,b.events);assert.ok(a.events.some(event=>event.type==='bounce'));assert.ok(a.events.some(event=>event.type==='escape'));
 for(let i=0;i<a.events.length;i++){const event=a.events[i];assert.equal(event.id,i);assert.equal(event.time,event.tick*STEP);if(i)assert.ok(event.time>=a.events[i-1].time);}
});
test('audio event collection agrees exactly with the visual simulation',()=>{
 const settings={ballSpeed:1.8,rotationSpeed:2,shrinkSpeed:1.3,ringCount:35};const visual=new Simulation(9182,settings);visual.seek(20);const audio=collectEvents(9182,settings,20);assert.deepEqual(audio.events,visual.events);assert.equal(audio.remaining,visual.remaining);
});
test('rotation speed stops or reverses rings without changing free ball movement',()=>{
 const stopped=new Simulation(10,{rotationSpeed:0}),reverse=new Simulation(10,{rotationSpeed:2,direction:-1});const angle=stopped.rings[0].angle;stopped.step();reverse.step();assert.equal(stopped.rings[0].angle,angle);assert.ok(reverse.rings[0].angle<angle);assert.deepEqual(stopped.ball,reverse.ball);
});
test('extreme ball size and gap combinations retain a playable, finite arena',()=>{
 for(const settings of [{ballRadius:36,gapAngle:25,ringCount:100,ballSpeed:3,shrinkSpeed:4},{ballRadius:8,gapAngle:100,ringCount:10,gravity:0}]){const s=new Simulation(123,settings);s.seek(20);assert.ok(Number.isFinite(s.ball.x+s.ball.y));assert.ok(s.rings.filter(r=>r.alive).every(r=>r.radius>=s.minRadius-1e-7));}
});
test('melody notes preserve collision timestamps and selected trigger type',()=>{
 const project=createProject(),events=collectEvents(project.seed,project.physics,8).events;project.sound.trigger='escape';const notes=noteEvents(project,events);assert.ok(notes.length>0);assert.deepEqual(notes.map(n=>n.time),events.filter(e=>e.type==='escape').map(e=>e.time));project.sound.melody='none';assert.equal(noteEvents(project,events).length,0);
});
function midiFixture(){return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,0,0,0,13,0,144,60,100,131,96,128,60,0,0,255,47,0]).buffer;}
test('MIDI import reads note pitch and beat duration',()=>{const notes=parseMidi(midiFixture());assert.equal(notes.length,1);assert.equal(notes[0].midi,60);assert.ok(Math.abs(notes[0].duration-.5)<1e-9);});
test('malformed project and MIDI files fail clearly',()=>{assert.throws(()=>parseMidi(new Uint8Array([0,1,2,3]).buffer));assert.throws(()=>sanitizeProject({physics:{ringCount:1e9}}),RangeError);const p=sanitizeProject({appearance:{title:'A'.repeat(1000),background:'javascript:invalid'},sound:{master:5}});assert.equal(p.appearance.title.length,160);assert.equal(p.sound.master,1);assert.equal(p.appearance.background,'#060612');});
