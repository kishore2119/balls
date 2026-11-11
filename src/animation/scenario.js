import {RoyaleSimulation} from './circle-royale.js?v=2';
import {SpikeSimulation} from './spike-melody.js';
import {MultiplierSimulation} from './multiplier.js';
import {TimedEscapeSimulation} from './timed-escape.js';
import {CrashSimulation} from './crash.js';
import {StringWarsSimulation} from './string-wars.js';
import {GrowingBallSimulation,planGrowth} from './growing-ball.js';
import {Simulation,STEP,BALL_SPEED,TAU,SHRINK_SPEED,seededRandom} from './simulation.js';

export const endingWindow=duration=>({target:duration-Math.min(1,Math.max(.2,duration*.025)),tolerance:Math.max(.45,Math.min(1.5,duration*.035))});
export const scenarioKey=project=>{
 if(project.animation==='circle-royale'){const {arenaRadius,ballRadius,gateCycle,openPercent,competitors}=project.royale;return JSON.stringify([2,'circle-royale',project.seed,project.physics,arenaRadius,ballRadius,gateCycle,openPercent,competitors.length,project.export.duration]);}
 if(project.animation==='spike-melody'){const {ringColor,...spike}=project.spike;return JSON.stringify([2,'spike-melody',project.seed,project.physics,spike,project.export.duration]);}
 if(project.animation==='ball-multiplier'){const {arenaRadius,children,maxBalls}=project.multiplier;return JSON.stringify([2,'ball-multiplier',project.seed,project.physics,arenaRadius,children,maxBalls,project.export.duration]);}
 if(project.animation==='timed-escape'){const {arenaRadius,attemptSeconds,gapPosition}=project.timedEscape;return JSON.stringify([2,'timed-escape',project.seed,project.physics,arenaRadius,attemptSeconds,gapPosition,project.export.duration]);}
 if(project.animation==='rainbow-crash'){const {arenaRadius,growth,acceleration}=project.crash;return JSON.stringify([2,'rainbow-crash',project.seed,project.physics,arenaRadius,growth,acceleration,project.export.duration]);}
 if(project.animation==='string-wars'){const {stringOpacity,competitors,...war}=project.war;return JSON.stringify([2,'string-wars',project.seed,project.physics,war,competitors.length,project.export.duration,project.export.matchDuration]);}
 if(project.animation==='growing-ball')return JSON.stringify([2,'growing-ball',project.seed,project.physics,{perBounce:project.growth.perBounce,arenaRadius:project.growth.arenaRadius},project.export.duration]);
 return JSON.stringify([2,project.seed,project.physics,project.export.duration]);
};
export const projectTimelineKey=project=>JSON.stringify([scenarioKey(project),project.export.matchDuration,matchedScenario(project)]);
export function matchedScenario(project){const plan=project.scenario;if(project.export.matchDuration===false||plan?.key!==scenarioKey(project))return null;return project.animation==='growing-ball'?(Number.isFinite(plan.growthRate)?plan:null):(plan.ballPlan&&Number.isFinite(plan.ballPlan.launchAngle)&&Array.isArray(plan.ballPlan.bounces)?plan:null);}
export function projectSimulation(project,options={}){if(project.animation==='circle-royale')return new RoyaleSimulation(project.seed,project.physics,{...options,royale:project.royale});if(project.animation==='spike-melody')return new SpikeSimulation(project.seed,project.physics,{...options,spike:project.spike});if(project.animation==='ball-multiplier')return new MultiplierSimulation(project.seed,project.physics,{...options,multiplier:project.multiplier});if(project.animation==='timed-escape')return new TimedEscapeSimulation(project.seed,project.physics,{...options,timedEscape:project.timedEscape});if(project.animation==='rainbow-crash')return new CrashSimulation(project.seed,project.physics,{...options,crash:project.crash});if(project.animation==='string-wars')return new StringWarsSimulation(project.seed,project.physics,{...options,war:project.war,duration:project.export.duration,timed:project.export.matchDuration});return project.animation==='growing-ball'?new GrowingBallSimulation(project.seed,project.physics,{...options,growth:project.growth,growthRate:matchedScenario(project)?.growthRate}):new Simulation(project.seed,project.physics,{...options,ballPlan:matchedScenario(project)?.ballPlan});}
export function projectEvents(project){const simulation=projectSimulation(project,{effects:false});simulation.seek(project.export.duration);return {events:simulation.events,escapedAt:simulation.escapedAt,remaining:simulation.remaining};}

// Each search branch chooses a launch or inward rebound direction. All flight,
// rotation, shrinking and gap-crossing checks run through the actual simulation.
// The saved plan contains ball turns only; rings have no planner overrides.
function fork(s){return Object.assign(Object.create(Simulation.prototype),s,{ball:{...s.ball},rings:s.rings.map(r=>({...r})),events:[],particles:[],trail:[]});}
function attempt(seed,physics,duration,onProgress){
 const {target:end,tolerance:tol}=endingWindow(duration),initial=new Simulation(seed,physics,{effects:false});
 const launchOffset=seededRandom(seed^0x492ac37)()*TAU/32;
 let beam=[{s:initial,launchAngle:0,bounces:[]}];let furthest=0;
 for(let depth=0;depth<1600;depth++){
  const nodes=[];let winner=null;
  for(const node of beam){
   const s=node.s,normal=Math.atan2(s.ball.y,s.ball.x)+Math.PI;
   const angles=depth===0?Array.from({length:32},(_,i)=>launchOffset+i/32*TAU):Array.from({length:19},(_,i)=>normal+(i/18-.5)*2.7);
   if(depth){
    angles.push(Math.atan2(s.ball.vy,s.ball.vx));
    const ring=s.rings.find(r=>r.alive),reverse=physics.reverseOnPass&&(physics.ringCount-s.remaining)%2?-1:1,omega=ring.omega*physics.rotationSpeed*physics.direction*reverse;
    for(let i=1;i<=12;i++){
     const flight=2*ring.radius/(BALL_SPEED*physics.ballSpeed)*i/12,a=ring.angle+omega*flight,r=Math.max(10,ring.radius-s.ball.radius-3-24*physics.shrinkSpeed*flight);
     const angle=Math.atan2(r*Math.sin(a)-s.ball.y-.5*physics.gravity*(flight*physics.ballSpeed)**2,r*Math.cos(a)-s.ball.x);
     if(Math.cos(angle-normal)>.1)angles.push(angle);
    }
   }
   for(const angle of angles){
    const t=fork(s);t.steer(angle);const bounces=depth?[...node.bounces,{tick:s.tick,angle}]:[],launchAngle=depth?node.launchAngle:angle;
    const count=t.bounceCount;while(t.bounceCount===count&&t.remaining&&t.time<end)t.step();
    if(!t.remaining){if(end-t.escapedAt>=0&&end-t.escapedAt<=tol&&(!winner||t.escapedAt>winner.escapedAt))winner={seed,launchAngle,bounces,escapedAt:t.escapedAt,depth};continue;}
    if(t.time>=end)continue;
    const outer=t.rings.at(-1),distance=Math.max(0,outer.radius-Math.hypot(t.ball.x,t.ball.y)-t.ball.radius),min=distance/(BALL_SPEED*physics.ballSpeed+24*physics.shrinkSpeed);
    if(t.time+min>end)continue;
    const progress=physics.ringCount-t.remaining;
    const score=Math.max(0,Math.abs(progress-physics.ringCount*t.time/end)-1.25)-t.time*.025+.05/(t.time-s.time+.01);
    nodes.push({s:t,launchAngle,bounces,score});
   }
  }
  if(winner)return winner;
  nodes.sort((a,b)=>a.score-b.score);beam=[];const bins=new Set();
  for(const node of nodes){const key=`${node.s.remaining}/${Math.round(node.s.time*6)}/${Math.round(Math.atan2(node.s.ball.y,node.s.ball.x)*4)}`;if(bins.has(key))continue;bins.add(key);beam.push(node);if(beam.length===12)break;}
  if(!beam.length)break;
  furthest=Math.max(furthest,...beam.map(node=>node.s.time));if(depth%8===0)onProgress(Math.min(.97,furthest/end));
 }
 return null;
}


export function planScenario({seed,physics,duration,animation='ring-escape',growth},onProgress=()=>{}){
 if(animation==='growing-ball')return planGrowth({seed,physics,growth,duration},onProgress);
 if(!Number.isFinite(duration)||duration<5||duration>120)throw new RangeError('Choose a duration between 5 and 120 seconds.');
 const initial=new Simulation(seed,physics,{effects:false}),window=endingWindow(duration);physics=initial.settings;
 const shrinkTime=physics.shrinkStopTime>0?Math.min(window.target,physics.shrinkStopTime):window.target;
 const possibleShrink=SHRINK_SPEED*physics.shrinkSpeed*shrinkTime;
 const distance=Math.max(0,initial.rings.at(-1).radius-possibleShrink-Math.hypot(initial.ball.x,initial.ball.y)-initial.ball.radius);
 if(distance>BALL_SPEED*physics.ballSpeed*window.target)throw new Error('This duration is too short at the selected ball speed. Choose a longer duration, fewer rings, or faster shrinking.');
 const attempts=4;let bestProgress=0;
 for(let i=0;i<attempts;i++){
  const candidateSeed=(seed+Math.imul(i,2654435761))>>>0;
  const result=attempt(candidateSeed,physics,duration,value=>{bestProgress=Math.max(bestProgress,(i+value)/attempts);onProgress(bestProgress);});
  if(!result)continue;
  const ballPlan={launchAngle:result.launchAngle,bounces:result.bounces};
  const check=new Simulation(candidateSeed,physics,{effects:false,ballPlan});check.seek(duration);
  if(check.remaining||Math.abs(check.escapedAt-result.escapedAt)>STEP||check.escapedAt>window.target||window.target-check.escapedAt>window.tolerance)continue;
  onProgress(1);return {seed:candidateSeed,ballPlan,escapedAt:check.escapedAt};
 }
 throw new Error('Could not fit the ball path near this duration with these settings. Try a new scenario, a longer duration, or fewer rings.');
}
