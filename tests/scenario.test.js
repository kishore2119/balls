import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject,PHYSICS_DEFAULTS} from '../src/config.js';
import {Simulation,BALL_SPEED,STEP} from '../src/animation/simulation.js';
import {planScenario,endingWindow,scenarioKey,matchedScenario,projectSimulation,projectEvents} from '../src/animation/scenario.js';

function timed(duration,physics={}){
 const project=createProject();project.seed=1810087800;project.export.duration=duration;Object.assign(project.physics,physics);
 const plan=planScenario({seed:project.seed,physics:project.physics,duration});project.seed=plan.seed;project.scenario={key:scenarioKey(project),ballPlan:plan.ballPlan,escapedAt:plan.escapedAt};return project;
}
test('every standard duration has a verified ending near its final frame',()=>{
 for(const duration of [5,15,30,45,60,75,120]){
  const project=timed(duration),result=projectEvents(project),window=endingWindow(duration);
  assert.equal(result.remaining,0);assert.ok(result.escapedAt<=window.target);assert.ok(window.target-result.escapedAt<=window.tolerance);
  assert.equal(result.escapedAt,project.scenario.escapedAt);
  const escapes=result.events.filter(event=>event.type==='escape');assert.equal(escapes.length,50);assert.equal(new Set(escapes.map(e=>e.ring)).size,50);
 }
});
test('guided rebounds preserve selected speed, rotation, shrinking, and real gap collisions',()=>{
 for(const physics of [{ballSpeed:.25},{rotationSpeed:0,gravity:0,shrinkSpeed:0},{reverseOnPass:true,direction:-1,shrinkStopTime:2}]){
  const project=timed(60,physics),simulation=projectSimulation(project,{effects:false});
  for(let tick=0;tick<project.export.duration/STEP;tick++){
   simulation.step();assert.ok(Math.abs(Math.hypot(simulation.ball.vx,simulation.ball.vy)-BALL_SPEED)<1e-8);
  }
  assert.equal(simulation.remaining,0);assert.deepEqual(simulation.settings,{...PHYSICS_DEFAULTS,...physics});assert.equal(simulation.contactPolicy,undefined);
 }
});
test('preview frames, collision audio, and 30/60 fps exports share the planned path',()=>{
 const project=timed(5,{ringCount:10}),a=projectSimulation(project),b=projectSimulation(project);
 for(let frame=0;frame<150;frame++)a.seek(frame/30);for(let frame=0;frame<300;frame++)b.seek(frame/60);
 a.seek(5);b.seek(5);assert.deepEqual(a.ball,b.ball);assert.deepEqual(a.events,b.events);assert.deepEqual(a.events,projectEvents(project).events);
 const before={...a.ball};a.seek(0);a.seek(5);assert.deepEqual(a.ball,before);
});
test('plans survive saving and are invalidated by duration, seed, and motion edits',()=>{
 const project=timed(5,{ringCount:10}),loaded=sanitizeProject(JSON.parse(JSON.stringify(project)));
 assert.ok(matchedScenario(loaded));assert.deepEqual(projectEvents(loaded),projectEvents(project));
 for(const change of [p=>p.export.duration=15,p=>p.seed++,p=>p.physics.ballSpeed=2,p=>p.physics.rotationSpeed=2]){const edited=structuredClone(project);change(edited);assert.equal(matchedScenario(edited),null);}
 loaded.export.matchDuration=false;assert.equal(matchedScenario(loaded),null);const plain=new Simulation(loaded.seed,loaded.physics);assert.deepEqual(projectSimulation(loaded).rings,plain.rings);
});
test('impossible short videos fail instead of silently exporting uncleared rings',()=>{
 assert.throws(()=>timed(5,{ballSpeed:.25,ringCount:100,shrinkSpeed:0}),/too short/);
});
test('scenario generation is deterministic and does not edit the supplied controls',()=>{
 const input={seed:812,physics:{...PHYSICS_DEFAULTS,ringCount:10},duration:5},before=structuredClone(input);
 assert.deepEqual(planScenario(input),planScenario(input));assert.deepEqual(input,before);
});

test('timed paths keep the original ring starting positions and rotation on every tick',()=>{
 const project=timed(5,{ringCount:10}),simulation=projectSimulation(project,{effects:false}),original=new Simulation(project.seed,project.physics,{effects:false});
 assert.deepEqual(simulation.rings,original.rings);assert.equal(simulation.ringAngles,undefined);
 for(let tick=0;tick<5/STEP;tick++){
  const before=simulation.rings.map(r=>({...r})),count=simulation.events.length;
  simulation.step();
  for(const [index,ring]of simulation.rings.entries())if(before[index].alive){const expected=(before[index].angle+ring.omega*project.physics.rotationSpeed*project.physics.direction*STEP)%(Math.PI*2);assert.ok(Math.abs(ring.angle-expected)<1e-12);}
  for(const event of simulation.events.slice(count).filter(e=>e.type==='escape')){
   const ring=simulation.rings[event.ring],angle=Math.atan2(event.y,event.x),difference=Math.atan2(Math.sin(angle-ring.angle),Math.cos(angle-ring.angle)),margin=Math.asin((simulation.ball.radius+3)/ring.radius);
   assert.ok(Math.abs(difference)<simulation.gap/2-margin,'A ring must clear through its visible gap');
  }
 }
});
test('only real wall bounces apply planned direction changes; free flight stays continuous',()=>{
 const project=timed(5,{ringCount:10}),simulation=projectSimulation(project,{effects:false});let guided=0;
 for(let tick=0;tick<5/STEP;tick++){
  const before={...simulation.ball},count=simulation.bounceCount;
  simulation.step();
  if(count===simulation.bounceCount){const vy=before.vy+project.physics.gravity*STEP*project.physics.ballSpeed,length=Math.hypot(before.vx,vy);assert.ok(Math.abs(simulation.ball.vx-before.vx/length*BALL_SPEED)<1e-8);assert.ok(Math.abs(simulation.ball.vy-vy/length*BALL_SPEED)<1e-8);}
  else{const turn=project.scenario.ballPlan.bounces[count];assert.equal(turn.tick,simulation.tick);assert.ok(Math.abs(simulation.ball.vx-Math.cos(turn.angle)*BALL_SPEED)<1e-8);assert.ok(Math.abs(simulation.ball.vy-Math.sin(turn.angle)*BALL_SPEED)<1e-8);guided++;}
 }
 assert.equal(guided,project.scenario.ballPlan.bounces.length);assert.ok(guided>0);
});
test('old ring-position plans are dropped and different seeds create different ball paths',()=>{
 const original=createProject();original.scenario={key:'old',angles:Array(50).fill(1),escapedAt:44};assert.equal(sanitizeProject(original).scenario,undefined);
 const a=planScenario({seed:123,physics:{...PHYSICS_DEFAULTS,ringCount:10},duration:5}),b=planScenario({seed:812,physics:{...PHYSICS_DEFAULTS,ringCount:10},duration:5});assert.notDeepEqual(a.ballPlan,b.ballPlan);
});
