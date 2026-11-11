import * as THREE from '../../vendor/three.module.js';
import {OrbitRenderer} from './renderer.js';
import {ringColor} from './palette.js';

export class GrowingBallRenderer extends OrbitRenderer{
 constructor(canvas){
  super(canvas,{pointLimit:1000});this.arena.position.y=0;this.fill.geometry.dispose();this.fill.geometry=new THREE.CircleGeometry(1,96);this.rim.geometry.dispose();this.rim.geometry=new THREE.RingGeometry(.985,1,96);
  // Keep the solid ball above translucent rays and trails in Three's transparent pass.
  for(const mesh of [this.fill,this.rim]){mesh.material.transparent=true;mesh.material.depthWrite=false;}
  this.boundary=new THREE.Mesh(new THREE.RingGeometry(.992,1,512),new THREE.MeshBasicMaterial({depthTest:false}));this.boundary.renderOrder=1;this.arena.add(this.boundary);
  this.rayPositions=new Float32Array(400*6);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.rayPositions,3).setUsage(THREE.DynamicDrawUsage));
  this.rays=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({transparent:true,opacity:.36,depthTest:false,depthWrite:false}));this.rays.frustumCulled=false;this.rays.renderOrder=1;this.arena.add(this.rays);
  this.ghosts=Array.from({length:40},()=>{const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,opacity:0}));mesh.renderOrder=2;this.arena.add(mesh);return mesh;});this.growthColor=new THREE.Color();this.highlight=new THREE.Color('#ffffff');this.customBallColor=new THREE.Color();
 }
 draw(simulation){
  const a=this.appearance,g=simulation.growth,b=simulation.ball,hue=(65+simulation.time*g.hueSpeed)%360;
  if(g.rainbow)this.growthColor.setHSL(hue/360,1,.5);else this.growthColor.set(ringColor(a,Math.floor((hue/360)*999),1000));
  const color=this.growthColor;this.boundary.material.color.copy(color);const outlineKey=`${g.arenaRadius}/${a.lineWidth}`;if(this.outlineKey!==outlineKey){this.boundary.geometry.dispose();this.boundary.geometry=new THREE.RingGeometry(g.arenaRadius-a.lineWidth/2,g.arenaRadius+a.lineWidth/2,512);this.outlineKey=outlineKey;}
  this.ball.position.set(b.x,-b.y,0);this.ball.scale.setScalar(b.radius);const ballColor=g.rainbow?color:this.customBallColor.set(a.ballColor);this.fill.material.color.copy(ballColor);this.rim.material.color.copy(ballColor).lerp(this.highlight,.25);this.glow.visible=false;
  this.rays.visible=g.showRays;this.rays.material.color.copy(color);let count=0;for(const hit of simulation.hits){const i=count++*6;this.rayPositions.set([hit.x,-hit.y,0,b.x,-b.y,0],i);}this.rays.geometry.setDrawRange(0,count*2);this.rays.geometry.getAttribute('position').needsUpdate=true;
  for(let i=0;i<this.ghosts.length;i++){const mesh=this.ghosts[i],point=simulation.trail[i];mesh.visible=Boolean(a.trail&&point);if(!mesh.visible)continue;const fade=Math.max(0,1-(simulation.time-point.time)/.32);mesh.position.set(point.x,-point.y,0);mesh.scale.setScalar(point.radius);mesh.material.color.copy(color);mesh.material.opacity=fade*fade*.16;}
  let points=0;if(a.particles)for(const p of simulation.particles){const i=points*3;this.positions.set([p.x,-p.y,0],i);this.pointColors.set([color.r,color.g,color.b],i);this.sizes[points]=p.size;this.alphas[points++]=(1-p.age/p.life)*.8;}this.pointsGeometry.setDrawRange(0,points);for(const attr of Object.values(this.pointsGeometry.attributes))attr.needsUpdate=true;
  this.counterPlane.position.y=-(g.arenaRadius+70);if(this.count!==simulation.bounceCount){const c=this.counter.context;c.clearRect(0,0,192,100);c.fillStyle='#ffffff';c.font='600 27px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(`Bounces: ${simulation.bounceCount}`,96,50);this.counter.map.needsUpdate=true;this.count=simulation.bounceCount;}
  this.renderer.render(this.scene,this.camera);
 }
}
