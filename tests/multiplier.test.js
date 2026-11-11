import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject} from '../src/config.js';
import {projectEvents,projectSimulation,projectTimelineKey} from '../src/animation/scenario.js';

const radial=(sim,angle,distance)=>({
 x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,
 vx:Math.cos(angle)*sim.speed,vy:Math.sin(angle)*sim.speed,
});

test('One ball clearing the gap launches three new balls and keeps its outgoing motion',()=>{
 const project=createProject('ball-multiplier');
 Object.assign(project.physics,{rotationSpeed:0,gravity:0});
 const sim=projectSimulation(project);
 Object.assign(sim.balls[0],radial(sim,sim.angle,sim.outer-1));
 sim.step();
 assert.equal(sim.escapeCount,1);
 assert.equal(sim.remaining,3);
 assert.deepEqual(sim.balls.map(ball=>ball.id),[1,2,3]);
 assert.equal(sim.outside[0].id,0);
 assert.equal(sim.events[0].type,'escape');
 assert.ok(Math.abs(sim.escapedAt-1/sim.speed)<1e-9);
 assert.ok(sim.balls.every(ball=>Math.hypot(ball.x,ball.y)<100));
});

test('The solid part of the ring reflects a fast ball without creating offspring',()=>{
 const project=createProject('ball-multiplier');
 Object.assign(project.physics,{rotationSpeed:0,gravity:0,ballSpeed:3});
 const sim=projectSimulation(project);
 const angle=sim.angle+Math.PI;
 Object.assign(sim.balls[0],radial(sim,angle,sim.inner-2));
 sim.step();
 const ball=sim.balls[0];
 assert.equal(sim.remaining,1);
 assert.equal(sim.escapeCount,0);
 assert.equal(sim.events[0].type,'bounce');
 assert.ok(Math.abs(sim.events[0].time-2/sim.speed)<1e-9);
 assert.ok(ball.x*ball.vx+ball.y*ball.vy<0);
});

test('The default clip fills the ring and replay, frame rates, and audio agree',()=>{
 const project=createProject('ball-multiplier'),a=projectSimulation(project),b=projectSimulation(project);
 a.seek(10);assert.equal(a.remaining,1);
 a.seek(15);assert.equal(a.remaining,3);
 for(let frame=451;frame<=1500;frame++)a.seek(frame/30);
 for(let frame=1;frame<=3000;frame++)b.seek(frame/60);
 assert.equal(a.remaining,project.multiplier.maxBalls);
 assert.ok(a.escapeCount>100);
 assert.ok(a.outside.length>0&&a.outside.length<=280);
 assert.deepEqual(a.balls,b.balls);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(a.events,projectEvents(project).events);
 assert.ok(a.events.every((event,index)=>index===0||event.time>=a.events[index-1].time-1e-12));
 a.seek(8);a.seek(50);
 assert.deepEqual(a.balls,b.balls);
});

test('Large balls lower the capacity and offspring cannot exceed the limit',()=>{
 const project=createProject('ball-multiplier');
 Object.assign(project.physics,{ballRadius:36,ballSpeed:3,rotationSpeed:4,gapAngle:100});
 Object.assign(project.multiplier,{maxBalls:1000,arenaRadius:300,children:8});
 const sim=projectSimulation(project,{effects:false});
 assert.ok(sim.populationLimit<100);
 for(let second=1;second<=50;second++){
  sim.seek(second);
  assert.ok(sim.balls.length<=sim.populationLimit);
  assert.ok(sim.balls.every(ball=>Math.hypot(ball.x,ball.y)<=sim.outer+sim.radius));
 }
 assert.ok(sim.escapeCount>50);
});

test('Multiplier settings survive project imports and visual edits retain the audio key',()=>{
 const project=createProject('ball-multiplier'),key=projectTimelineKey(project);
 Object.assign(project.multiplier,{rainbow:false,ringColor:'#e18744'});
 assert.equal(projectTimelineKey(project),key);
 project.multiplier.children=5;
 assert.notEqual(projectTimelineKey(project),key);
 assert.deepEqual(sanitizeProject(JSON.parse(JSON.stringify(project))),project);
 assert.throws(()=>sanitizeProject({...project,multiplier:{children:9}}),RangeError);
});
