import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject} from '../src/config.js';
import {projectSimulation,projectEvents,projectTimelineKey} from '../src/animation/scenario.js';

test('Rainbow Crash builds from a small falling ball to a bounded finish in the default clip',()=>{
 const project=createProject('rainbow-crash'),sim=projectSimulation(project);
 sim.seek(20);
 assert.ok(sim.ball.radius>=55 && sim.ball.radius<=80);
 assert.ok(sim.trail.length>4000 && sim.remaining===1);
 sim.seek(project.export.duration);
 assert.ok(sim.finishedAt>54&&sim.finishedAt<59);
 assert.equal(sim.remaining,0);
 assert.ok(sim.trail.length<16000);
 assert.ok(sim.ball.radius<=project.crash.arenaRadius);
});
test('New Crash seeds vary the launch and rebounds independently',()=>{
 const project=createProject('rainbow-crash');
 project.physics.gravity=0;
 const launchQuadrants=new Set(),firstTurnAngles=new Set();
 for(let seed=0;seed<16;seed++){
  project.seed=seed;
  const sim=projectSimulation(project,{effects:false});
  launchQuadrants.add([Math.sign(sim.ball.vx),Math.sign(sim.ball.vy)].join());
  sim.seek(12);
  assert.ok(sim.events.length>=2);
  const [first,second]=sim.events;
  const turn=Math.atan2(first.x*second.y-first.y*second.x,first.x*second.x+first.y*second.y);
  firstTurnAngles.add(Math.round(turn*10));
 }
 assert.equal(launchQuadrants.size,4);
 assert.ok(firstTurnAngles.size>=8);
});

test('Crash contacts are continuous and stable across frame rates, replay, and audio-only processing',()=>{
 const project=createProject('rainbow-crash'),a=projectSimulation(project),b=projectSimulation(project);
 for(let i=1;i<=1800;i++)a.seek(i/30);
 for(let i=1;i<=3600;i++)b.seek(i/60);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(a.trail,b.trail);
 assert.deepEqual(a.events,projectEvents(project).events);
 for(const [i,e]of a.events.entries()){
  assert.equal(e.type,'bounce');
  assert.ok(Math.abs(Math.hypot(e.x,e.y)-project.crash.arenaRadius)<1e-6);
  assert.ok(!i || e.time>a.events[i-1].time);
 }
 const end=a.ball;a.seek(12);a.seek(60);assert.deepEqual(a.ball,end);
});
test('Growth and speed gain change physical contacts, while color settings do not invalidate audio',()=>{
 const project=createProject('rainbow-crash'),first=projectTimelineKey(project);
 project.crash.rainbow=false;project.crash.arenaColor='#eeddcc';project.crash.colorCycle=1.5;
 assert.equal(projectTimelineKey(project),first);
 const before=projectEvents(project).escapedAt;
 project.crash.growth=11;project.crash.acceleration=5;
 assert.notEqual(projectTimelineKey(project),first);
 assert.ok(projectEvents(project).escapedAt<before);
 const sim=projectSimulation(project);
 for(let i=0;i<7200;i++){
  sim.step();const {x,y,radius,vx,vy}=sim.ball;
  assert.ok(Math.hypot(x,y)+radius<=project.crash.arenaRadius+1e-6);
  assert.ok(Math.hypot(vx,vy)<=4200.000001);
 }
});
test('The fastest settings stay within the arena and imported Crash settings round trip',()=>{
 const project=createProject('rainbow-crash');
 Object.assign(project.physics,{ballSpeed:3,ballRadius:36,gravity:500});
 Object.assign(project.crash,{arenaRadius:300,growth:20,acceleration:20,fadeOut:false});
 assert.deepEqual(sanitizeProject(JSON.parse(JSON.stringify(project))),project);
 const sim=projectSimulation(project);
 for(let i=0;i<1200;i++){
  sim.step();
  assert.ok(Math.hypot(sim.ball.x,sim.ball.y)+sim.ball.radius<=300.000001);
 }
 assert.ok(sim.finishedAt!==null);
 assert.throws(()=>sanitizeProject({...project,crash:{growth:21}}),RangeError);
});

