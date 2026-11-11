import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,sanitizeProject} from '../src/config.js';
import {projectEvents,projectSimulation,projectTimelineKey} from '../src/animation/scenario.js';
import {STEP} from '../src/animation/simulation.js';

test('Timed Escape freezes balls at the deadline and launches a different attempt',()=>{
 const sim=projectSimulation(createProject('timed-escape'));
 sim.seek(4-STEP);
 assert.equal(sim.frozen.length,0);
 const previous={...sim.ball};
 sim.seek(4);
 assert.equal(sim.frozen.length,1);
 const [frozen]=sim.frozen;
 assert.ok(Math.hypot(frozen.x-previous.x,frozen.y-previous.y)<3);
 assert.ok(Math.hypot(frozen.x-sim.ball.x,frozen.y-sim.ball.y)>2*sim.ball.radius);
 sim.seek(8);
 assert.equal(sim.frozen.length,2);
 assert.deepEqual(sim.frozen[0],frozen);
});

test('A fast ball hits frozen obstacles and clips the ends of the opening',()=>{
 const project=createProject('timed-escape');
 Object.assign(project.physics,{ballSpeed:3,ballRadius:36,gravity:0});
 const sim=projectSimulation(project,{effects:false});
 sim.frozen.push({x:0,y:0,radius:36});
 Object.assign(sim.ball,{x:-80,y:0,vx:sim.speed,vy:0});
 sim.step();
 assert.equal(sim.bounceCount,1);
 assert.ok(Math.abs(sim.events[0].time-8/sim.speed)<1e-10);
 assert.ok(sim.ball.x< -72 && sim.ball.vx<0);
 assert.equal(Math.hypot(sim.ball.vx,sim.ball.vy),sim.speed);

 sim.reset();
 const angle=sim.gapAngle+sim.halfGap-.02;
 const radius=project.timedEscape.arenaRadius-sim.wallClearance-2;
 Object.assign(sim.ball,{x:radius*Math.cos(angle),y:radius*Math.sin(angle),vx:sim.speed*Math.cos(angle),vy:sim.speed*Math.sin(angle)});
 sim.step();
 assert.equal(sim.bounceCount,1);
 assert.equal(sim.escapedAt,null);
});

test('Only a ball that completely clears the opening can burst the ring',()=>{
 const project=createProject('timed-escape');
 project.physics.gravity=0;
 const sim=projectSimulation(project);
 const angle=sim.gapAngle;
 Object.assign(sim.ball,{x:0,y:0,vx:sim.speed*Math.cos(angle),vy:sim.speed*Math.sin(angle)});
 sim.seek(project.timedEscape.arenaRadius/sim.speed);
 assert.equal(sim.escapedAt,null);
 sim.seek(1);
 assert.equal(sim.remaining,0);
 assert.equal(sim.events.length,1);
 assert.equal(sim.events[0].type,'escape');
 assert.ok(Math.abs(sim.escapedAt-(project.timedEscape.arenaRadius+sim.wallClearance)/sim.speed)<1e-8);
 assert.ok(sim.particles.length>0);
});

test('The default clip escapes after several attempts and shares exact events with audio and replay',()=>{
 const project=createProject('timed-escape'),preview=projectSimulation(project),exported=projectSimulation(project);
 for(let frame=0;frame<=project.export.duration*30;frame++)preview.seek(frame/30);
 for(let frame=0;frame<=project.export.duration*60;frame++)exported.seek(frame/60);
 assert.ok(preview.escapedAt>32&&preview.escapedAt<34);
 assert.ok(preview.frozen.length>=7);
 assert.deepEqual(preview.events,projectEvents(project).events);
 assert.deepEqual(preview.events,exported.events);
 assert.deepEqual(preview.particles,exported.particles);
 preview.seek(2);preview.seek(35);
 assert.deepEqual(preview.events,exported.events);
 const alternate=projectSimulation({...project,seed:project.seed+1});
 assert.notDeepEqual(projectSimulation(project).ball,alternate.ball);
 alternate.seek(35);
 assert.notDeepEqual(preview.events,alternate.events);
});

test('Timed Escape settings round trip and only physical settings change the audio timeline key',()=>{
 const project=createProject('timed-escape'),key=projectTimelineKey(project);
 Object.assign(project.timedEscape,{rainbow:false,ringColor:'#ff0011'});
 assert.equal(projectTimelineKey(project),key);
 project.timedEscape.attemptSeconds=3.25;
 assert.notEqual(projectTimelineKey(project),key);
 assert.deepEqual(sanitizeProject(JSON.parse(JSON.stringify(project))),project);
 assert.throws(()=>sanitizeProject({...project,timedEscape:{attemptSeconds:0}}),RangeError);
});
