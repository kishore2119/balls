import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject,growthSettings} from '../src/config.js';
import {GrowingBallSimulation,planGrowth} from '../src/animation/growing-ball.js';
import {projectSimulation,projectEvents,scenarioKey,matchedScenario,endingWindow} from '../src/animation/scenario.js';
import {noteEvents} from '../src/studio/audio.js';
import {BALL_SPEED} from '../src/animation/simulation.js';

const state=s=>JSON.stringify({ball:s.ball,time:s.time,events:s.events,hits:s.hits,trail:s.trail,particles:s.particles});
function project(duration=15,physics={}){const p=createProject('growing-ball');p.export.duration=duration;Object.assign(p.physics,physics);const plan=planGrowth({seed:p.seed,physics:p.physics,growth:p.growth,duration});p.scenario={key:scenarioKey(p),growthRate:plan.growthRate,escapedAt:plan.escapedAt};return p;}
test('Growing Ball has its own defaults and legacy projects remain Ring Escape',()=>{
 assert.equal(createProject().animation,'ring-escape');assert.equal(sanitizeProject({}).animation,'ring-escape');const p=createProject('growing-ball');assert.equal(p.animation,'growing-ball');assert.equal(p.growth.rainbow,true);assert.equal(p.sound.trigger,'bounce');assert.equal(p.export.duration,60);
});
test('the ball grows only on wall contacts and stays within the circle at constant speed',()=>{
 const p=createProject('growing-ball'),s=new GrowingBallSimulation(p.seed,p.physics,{growth:p.growth});
 for(let tick=0;tick<60*240;tick++){const before=s.ball.radius,count=s.bounceCount;s.step();assert.ok(Math.hypot(s.ball.x,s.ball.y)+s.ball.radius<=s.growth.arenaRadius+1e-7);assert.ok(Math.abs(Math.hypot(s.ball.vx,s.ball.vy)-BALL_SPEED)<1e-8);if(count===s.bounceCount)assert.equal(s.ball.radius,before);else assert.ok(s.ball.radius>before);}
 assert.ok(s.bounceCount>50);
});
test('30 and 60 fps and backward seeking reproduce the same growing ball animation',()=>{
 const p=project(5),a=projectSimulation(p),b=projectSimulation(p);for(let i=0;i<150;i++)a.advance(1/30);for(let i=0;i<300;i++)b.advance(1/60);assert.equal(state(a),state(b));const expected=state(a);a.seek(1);a.seek(5);assert.equal(state(a),expected);
});
test('automatic growth fills the circle near every offered duration',()=>{
 for(const duration of [5,15,30,45,60,75,120]){const p=project(duration),s=projectSimulation(p,{effects:false});s.seek(duration);const window=endingWindow(duration);assert.equal(s.remaining,0);assert.ok(s.filledAt<=window.target);assert.ok(window.target-s.filledAt<=window.tolerance);assert.equal(s.ball.radius,p.growth.arenaRadius);assert.equal(s.ball.x,0);assert.equal(s.ball.y,0);}
});
test('growth fitting supports slow motion, no gravity, and fast bounces',()=>{
 for(const physics of [{ballSpeed:.25,gravity:0},{ballSpeed:3,gravity:500},{ballRadius:36,bounciness:.85}]){const p=project(30,physics),s=projectSimulation(p,{effects:false});s.seek(30);assert.equal(s.remaining,0);}
});
test('growing ball plans and settings round-trip and invalidate when motion changes',()=>{
 const p=project(),loaded=sanitizeProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(loaded,p);assert.ok(matchedScenario(loaded));loaded.growth.perBounce=2;assert.equal(matchedScenario(loaded),null);assert.throws(()=>growthSettings({arenaRadius:1}),RangeError);assert.throws(()=>growthSettings({perBounce:NaN}),RangeError);
});
test('bounce music uses the exact collision timestamps and histories stay bounded',()=>{
 const p=project(60),s=projectSimulation(p);s.seek(60);const notes=noteEvents(p,s.events);assert.deepEqual(notes.map(n=>n.time),s.events.map(e=>e.time));assert.deepEqual(projectEvents(p).events,s.events);assert.ok(s.hits.length<=p.growth.rayCount);assert.ok(s.trail.length<=40);assert.ok(s.particles.length<4000);assert.equal(s.bounceCount,s.events.length);
});
test('browser saves keep Growing Ball and Ring Escape projects separate',async()=>{
 const previous=globalThis.localStorage,items=new Map();globalThis.localStorage={getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};
 try{const storage=await import('../src/studio/storage.js');const rings=createProject(),growing=createProject('growing-ball');rings.name='My rings';growing.name='My growing ball';storage.saveCurrent(rings);storage.saveCurrent(growing);assert.equal(storage.loadCurrent('ring-escape').name,'My rings');assert.equal(storage.loadCurrent('growing-ball').name,'My growing ball');assert.equal(storage.lastAnimation(),'growing-ball');}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
