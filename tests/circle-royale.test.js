import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,defaultRoyaleCompetitor,sanitizeProject,warSettings} from '../src/config.js';
import {projectEvents,projectSimulation,projectTimelineKey} from '../src/animation/scenario.js';

const radial=(sim,angle,distance)=>({
 x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,
 vx:Math.cos(angle)*sim.speed,vy:Math.sin(angle)*sim.speed,
});

test('The warning arc reflects balls until its gate opens',()=>{
 const project=createProject('circle-royale');
 Object.assign(project.physics,{ballSpeed:3,rotationSpeed:0,gravity:0});
 Object.assign(project.royale,{gateCycle:1,openPercent:70});
 const sim=projectSimulation(project);
 Object.assign(sim.balls[0],radial(sim,sim.gate.angle,sim.inner-2));
 sim.step();
 assert.equal(sim.gate.open,false);
 assert.equal(sim.remaining,10);
 assert.equal(sim.events[0].type,'bounce');
 assert.ok(sim.balls[0].x*sim.balls[0].vx+sim.balls[0].y*sim.balls[0].vy<0);
 sim.seek(.4);
 Object.assign(sim.balls[0],radial(sim,sim.gate.angle,sim.outer-2));
 sim.step();
 assert.equal(sim.gate.open,true);
 assert.equal(sim.balls[0].alive,false);
 assert.equal(sim.remaining,9);
 assert.equal(sim.eliminations[0].id,0);
});

test('Two balls reaching an open gap in the same tick still leave one winner',()=>{
 const project=createProject('circle-royale');
 Object.assign(project.physics,{ballSpeed:3,rotationSpeed:0,gravity:0});
 Object.assign(project.royale,{gateCycle:1,openPercent:80,competitors:project.royale.competitors.slice(0,2)});
 const sim=projectSimulation(project);
 sim.seek(.3);
 Object.assign(sim.balls[0],radial(sim,sim.gate.angle-.12,sim.outer-6));
 Object.assign(sim.balls[1],radial(sim,sim.gate.angle+.12,sim.outer-1));
 sim.step();
 assert.equal(sim.remaining,1);
 assert.equal(sim.winner,0);
 assert.deepEqual(sim.eliminations.map(item=>item.id),[1]);
 assert.equal(sim.balls[0].alive,true);
 assert.ok(Math.hypot(sim.balls[0].x,sim.balls[0].y)<=sim.inner+1e-8);
 assert.ok(Math.abs(sim.finishedAt-(.3+1/sim.speed))<1e-8);
});

test('Competitors collide while preserving the selected speed',()=>{
 const project=createProject('circle-royale');
 project.royale.competitors=project.royale.competitors.slice(0,2);
 const sim=projectSimulation(project);
 const [a,b]=sim.balls;
 Object.assign(a,{x:-a.radius-1,y:0,vx:sim.speed,vy:0});
 Object.assign(b,{x:b.radius+1,y:0,vx:-sim.speed,vy:0});
 sim.step();
 assert.ok(a.vx<0&&b.vx>0);
 assert.ok(Math.abs(Math.hypot(a.vx,a.vy)-sim.speed)<1e-5);
 assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-sim.speed)<1e-5);
 assert.equal(sim.events[0].type,'bounce');
});

test('The default ten-player match reaches a winner and keeps audio, replay, and frames in sync',()=>{
 const project=createProject('circle-royale'),a=projectSimulation(project),b=projectSimulation(project);
 assert.equal(a.remaining,10);
 for(let frame=0;frame<=1260;frame++)a.seek(frame/30);
 for(let frame=0;frame<=2520;frame++)b.seek(frame/60);
 assert.ok(a.finishedAt>37&&a.finishedAt<40);
 assert.equal(a.eliminations.length,9);
 assert.equal(a.balls.filter(ball=>ball.alive).length,1);
 assert.equal(new Set(a.eliminations.map(ball=>ball.id)).size,9);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(a.events,projectEvents(project).events);
 assert.deepEqual(a.particles,b.particles);
 assert.ok(a.events.every((event,i)=>i===0||event.time>=a.events[i-1].time-1e-12));
 a.seek(3);a.seek(42);
 assert.equal(a.winner,b.winner);
 assert.deepEqual(a.balls,b.balls);
 const other=projectSimulation({...project,seed:project.seed+1});
 other.seek(42);
 assert.notDeepEqual(a.eliminations,other.eliminations);
});

test('Royale rosters and settings round-trip, while only motion changes invalidate audio',()=>{
 const project=createProject('circle-royale'),key=projectTimelineKey(project);
 project.royale.competitors[0].name='Custom player';
 project.royale.gateColor='#4433aa';project.royale.showNames=false;
 assert.equal(projectTimelineKey(project),key);
 project.royale.competitors.push(defaultRoyaleCompetitor(10),defaultRoyaleCompetitor(11));
 assert.notEqual(projectTimelineKey(project),key);
 assert.deepEqual(sanitizeProject(JSON.parse(JSON.stringify(project))),project);
 assert.throws(()=>warSettings({competitors:project.royale.competitors}),RangeError);
 project.royale.competitors.push(defaultRoyaleCompetitor(0));
 assert.throws(()=>sanitizeProject(project),RangeError);
});
