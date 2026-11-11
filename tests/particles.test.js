import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,STEP,TAU,PARTICLE_LIMIT} from '../src/animation/simulation.js';
import {planScenario} from '../src/animation/scenario.js';

test('fragments cover the visible ring evenly and leave its gap empty',()=>{
 const simulation=new Simulation(101),ring=simulation.rings[0];simulation.burst(ring);
 assert.ok(simulation.particles.length>=96);
 const sectors=new Set();
 for(const particle of simulation.particles){
  assert.ok(Math.abs(Math.hypot(particle.x,particle.y)-ring.radius)<1e-8);
  const angle=Math.atan2(particle.y,particle.x),difference=Math.atan2(Math.sin(angle-ring.angle),Math.cos(angle-ring.angle));
  assert.ok(Math.abs(difference)>simulation.gap/2);
  sectors.add(Math.floor(((angle+TAU)%TAU)/TAU*36));assert.equal(particle.ring,ring.index);
 }
 assert.ok(sectors.size>=31,'The effect must break up the whole visible arc');
});
test('ring fragments accelerate downward, linger, and then expire cleanly',()=>{
 const simulation=new Simulation(101);simulation.burst(simulation.rings[0]);
 const fragments=simulation.particles.map(p=>({particle:p,y:p.y,vy:p.vy,vx:p.vx}));
 for(let tick=0;tick<1/STEP;tick++)simulation.updateParticles();
 assert.equal(simulation.particles.length,fragments.length);
 for(const {particle,y,vy,vx}of fragments){assert.ok(particle.y-y>100,'Fragments must visibly fall');assert.ok(particle.vy-vy>500);assert.ok(Math.abs(particle.vx)<=Math.abs(vx));}
 for(let tick=0;tick<2/STEP;tick++)simulation.updateParticles();assert.equal(simulation.particles.length,0);
});
test('particle animation is identical at 30 and 60 fps and after seeking backward',()=>{
 const settings=new Simulation(812,{ringCount:10}).settings,plan=planScenario({seed:812,physics:settings,duration:5});
 const a=new Simulation(plan.seed,settings,{ballPlan:plan.ballPlan}),b=new Simulation(plan.seed,settings,{ballPlan:plan.ballPlan});
 for(let frame=0;frame<150;frame++)a.advance(1/30);for(let frame=0;frame<300;frame++)b.advance(1/60);
 assert.deepEqual(a.particles,b.particles);assert.ok(a.particles.length>0);assert.ok(a.rings.some(r=>Number.isFinite(r.brokenAt)));
 const expected=structuredClone(a.particles);a.seek(1);a.seek(5);assert.deepEqual(a.particles,expected);
});
test('fragment storage stays bounded when many rings clear at once',()=>{
 const simulation=new Simulation(101,{ringCount:100});for(const ring of simulation.rings)simulation.burst(ring);
 assert.ok(simulation.particles.length<=PARTICLE_LIMIT);assert.ok(simulation.particles.some(p=>p.ring===99));
 for(let tick=0;tick<3/STEP;tick++)simulation.updateParticles();assert.equal(simulation.particles.length,0);
});
test('the falling effect does not change the ball path or its timed ending',()=>{
 const settings=new Simulation(812,{ringCount:10}).settings,plan=planScenario({seed:812,physics:settings,duration:5});
 const visual=new Simulation(plan.seed,settings,{ballPlan:plan.ballPlan}),physics=new Simulation(plan.seed,settings,{effects:false,ballPlan:plan.ballPlan});
 for(let frame=0;frame<=300;frame++){visual.seek(frame/60);physics.seek(frame/60);assert.deepEqual(visual.ball,physics.ball);assert.equal(visual.remaining,physics.remaining);}
 assert.deepEqual(visual.events,physics.events);assert.equal(visual.escapedAt,plan.escapedAt);assert.equal(visual.remaining,0);
});
