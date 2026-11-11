import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_MODES,createProject} from '../src/config.js';
import {projectSimulation,projectTimelineKey} from '../src/animation/scenario.js';
import {randomizePath} from '../src/studio/random-path.js';

test('Starting a new path changes each mode seed and invalidates any saved plan',()=>{
 for(const mode of ANIMATION_MODES){
  const project=createProject(mode);
  for(let i=0;i<8;i++){
   project.scenario={key:'old plan'};
   const previous=project.seed,key=projectTimelineKey(project);
   randomizePath(project);
   assert.notEqual(project.seed,previous,mode);
   assert.equal(project.scenario,undefined);
   assert.notEqual(projectTimelineKey(project),key);
  }
 }
});

test('Every animation can launch its first ball in all four quadrants',()=>{
 for(const mode of ANIMATION_MODES){
  const quadrants=new Set();
  for(let seed=0;seed<24;seed++){
   const project=createProject(mode);
   project.seed=seed;project.export.matchDuration=false;project.physics.gravity=0;
   const sim=projectSimulation(project,{effects:false});
   const ball=sim.ball??sim.balls[0];
   quadrants.add([Math.sign(ball.vx),Math.sign(ball.vy)].join());
  }
  assert.equal(quadrants.size,4,mode);
 }
});

test('An individual run reproduces its movement after scrubbing and in its export simulation',()=>{
 for(const mode of ANIMATION_MODES){
  const project=createProject(mode);project.export.matchDuration=false;
  randomizePath(project);
  const preview=projectSimulation(project),exported=projectSimulation(project,{effects:false});
  preview.seek(6);exported.seek(6);
  assert.deepEqual(preview.events,exported.events,mode);
  preview.seek(1);preview.seek(6);
  assert.deepEqual(preview.events,exported.events,mode);
 }
});
