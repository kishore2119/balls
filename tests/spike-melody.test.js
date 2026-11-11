import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject} from '../src/config.js';
import {projectEvents,projectSimulation,projectTimelineKey} from '../src/animation/scenario.js';
import {noteEvents} from '../src/studio/audio.js';

const radial=(sim,angle,distance)=>({
 x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,
 vx:Math.cos(angle)*sim.speed,vy:Math.sin(angle)*sim.speed,
});

test('Contact with a spike tip sticks the ball and launches the next color',()=>{
 const project=createProject('spike-melody');
 Object.assign(project.physics,{ballSpeed:3,gravity:0});
 const sim=projectSimulation(project);
 const tip=sim.spikes[12].vertices[2],angle=Math.atan2(tip.y,tip.x);
 Object.assign(sim.ball,radial(sim,angle,sim.clearRadius-2));
 sim.step();
 assert.equal(sim.ball,null);
 assert.equal(sim.anchors[0].id,0);
 assert.equal(sim.events[0].contact,'spike');
 assert.ok(Math.abs(sim.events[0].time-2/sim.speed)<1e-9);
 assert.ok(Math.abs(Math.hypot(sim.anchors[0].x,sim.anchors[0].y)-sim.clearRadius)<1e-8);
 sim.seek(.1);
 assert.equal(sim.ball.id,1);
 assert.equal(sim.anchors.length,1);
});

test('A fast collision with a stuck ball reflects at the exact time and flashes the bumper',()=>{
 const project=createProject('spike-melody');
 Object.assign(project.physics,{ballSpeed:3,gravity:0});
 const sim=projectSimulation(project);
 sim.anchors.push({id:3,x:0,y:100,litAt:-1});
 Object.assign(sim.ball,{x:0,y:100-2*sim.radius-4,vx:0,vy:sim.speed});
 sim.step();
 assert.ok(sim.ball.vy<0);
 assert.equal(sim.events[0].contact,'ball');
 assert.equal(sim.anchors[0].litAt,sim.events[0].time);
 assert.ok(Math.abs(sim.events[0].time-4/sim.speed)<1e-9);
 assert.equal(sim.anchors.length,1);
});

test('A ball must clear the gap completely before the escape burst',()=>{
 const project=createProject('spike-melody');
 project.physics.gravity=0;
 const sim=projectSimulation(project),angle=project.spike.gapPosition*Math.PI/180;
 Object.assign(sim.ball,radial(sim,angle,0));
 sim.seek(project.spike.arenaRadius/sim.speed);
 assert.equal(sim.escapedAt,null);
 sim.seek(1);
 assert.ok(Math.abs(sim.escapedAt-sim.escapeRadius/sim.speed)<1e-9);
 assert.equal(sim.remaining,0);
 assert.equal(sim.events[0].contact,'gap');
 assert.equal(sim.anchors.length,0);
 assert.ok(sim.sparks.length>0);
});

test('Random Spike Melody runs share exact note timing across playback and replay',()=>{
 const project=createProject('spike-melody'),a=projectSimulation(project),b=projectSimulation(project);
 for(let frame=0;frame<=750;frame++)a.seek(frame/30);
 for(let frame=0;frame<=1500;frame++)b.seek(frame/60);
 assert.ok(a.escapedAt===null||a.escapedAt<=25);
 assert.ok(a.anchors.length>0);
 assert.equal(a.anchors.length,b.anchors.length);
 assert.deepEqual(a.events,b.events);
 const timeline=projectEvents(project);
 assert.deepEqual(a.events,timeline.events);
 assert.deepEqual(noteEvents(project,timeline.events).map(note=>note.time),a.events.filter(event=>event.type==='bounce').map(event=>event.time));
 a.seek(2);a.seek(25);
 assert.deepEqual(a.anchors,b.anchors);
 assert.deepEqual(a.sparks,b.sparks);
 const other=projectSimulation({...project,seed:project.seed+1});
 other.seek(25);
 assert.notDeepEqual(a.events,other.events);
});

test('Spike geometry round-trips, while color edits preserve the audio timeline key',()=>{
 const project=createProject('spike-melody'),key=projectTimelineKey(project);
 project.spike.ringColor='#eeddee';
 assert.equal(projectTimelineKey(project),key);
 project.spike.spikeDepth=52;
 assert.notEqual(projectTimelineKey(project),key);
 assert.deepEqual(sanitizeProject(JSON.parse(JSON.stringify(project))),project);
 assert.throws(()=>sanitizeProject({...project,spike:{spikeCount:3}}),RangeError);
});
