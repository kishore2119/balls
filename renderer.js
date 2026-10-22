import * as THREE from './vendor/three.module.js';
import {WIDTH,HEIGHT,TAU} from './simulation.js';
import {ringColor} from './palette.js';
function texture(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;return {canvas,context:canvas.getContext('2d'),map};}
export class OrbitRenderer{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.setSize(WIDTH,HEIGHT,false);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-540,540,960,-960,.1,100);this.camera.position.z=10;this.arena=new THREE.Group();this.arena.position.y=-50;this.scene.add(this.arena);this.rings=[];this.colors=[];this.signature='';
  this.maxPoints=4096;this.positions=new Float32Array(this.maxPoints*3);this.pointColors=new Float32Array(this.maxPoints*3);this.sizes=new Float32Array(this.maxPoints);this.alphas=new Float32Array(this.maxPoints);this.pointsGeometry=new THREE.BufferGeometry();
  for(const[name,array,count]of[['position',this.positions,3],['aColor',this.pointColors,3],['aSize',this.sizes,1],['aAlpha',this.alphas,1]])this.pointsGeometry.setAttribute(name,new THREE.BufferAttribute(array,count).setUsage(THREE.DynamicDrawUsage));
  this.pointsMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{pixelScale:{value:1}},vertexShader:'uniform float pixelScale; attribute vec3 aColor; attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vAlpha; void main(){vColor=aColor;vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*pixelScale;}',fragmentShader:'varying vec3 vColor; varying float vAlpha; void main(){float a=(1.-smoothstep(.4,.5,length(gl_PointCoord-vec2(.5))))*vAlpha;if(a<.002)discard;gl_FragColor=vec4(vColor,a);\n#include <colorspace_fragment>\n}'});
  this.points=new THREE.Points(this.pointsGeometry,this.pointsMaterial);this.points.frustumCulled=false;this.points.renderOrder=2;this.arena.add(this.points);
  this.ball=new THREE.Group();this.fill=new THREE.Mesh(new THREE.CircleGeometry(.88,48),new THREE.MeshBasicMaterial({color:0x111322,depthTest:false}));this.rim=new THREE.Mesh(new THREE.RingGeometry(.88,1,48),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));this.fill.renderOrder=4;this.rim.renderOrder=5;this.ball.add(this.fill,this.rim);this.arena.add(this.ball);
  const glow=texture(128,128),gradient=glow.context.createRadialGradient(64,64,10,64,64,64);gradient.addColorStop(0,'#c8ceff66');gradient.addColorStop(1,'#c8ceff00');glow.context.fillStyle=gradient;glow.context.fillRect(0,0,128,128);glow.map.needsUpdate=true;
  this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.map,transparent:true,depthTest:false,depthWrite:false}));this.glow.scale.set(5.5,5.5,1);this.glow.renderOrder=3;this.ball.add(this.glow);
  this.heading=texture(WIDTH*2,HEIGHT*2);this.heading.context.scale(2,2);this.headingPlane=this.plane(this.heading.map,WIDTH,HEIGHT,10);this.counter=texture(384,200);this.counter.context.scale(2,2);this.counterPlane=this.plane(this.counter.map,192,100,6);this.counterPlane.position.y=-50;
  this.captureSize=null;
  this.resizeObserver=new ResizeObserver(()=>{if(!this.captureSize)this.resizePreview();});this.resizeObserver.observe(canvas);
  this.resizePreview();
 }
 setSize(width,height){if(this.canvas.width!==width||this.canvas.height!==height)this.renderer.setSize(width,height,false);this.pointsMaterial.uniforms.pixelScale.value=height/HEIGHT;}
 resizePreview(){if(this.captureSize)return;const rect=this.canvas.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1)*2;this.setSize(Math.max(1,Math.round(rect.width*scale)),Math.max(1,Math.round(rect.height*scale)));}
 beginCapture(width=WIDTH,height=HEIGHT){this.captureSize={width,height};this.setSize(width,height);}
 endCapture(){this.captureSize=null;this.resizePreview();}
 plane(map,width,height,order){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map,transparent:true,depthTest:false,depthWrite:false}));mesh.renderOrder=order;this.scene.add(mesh);return mesh;}
 setAppearance(appearance){this.appearance={...appearance};this.appearanceDirty=true;this.renderer.setClearColor(appearance.background,1);this.rim.material.color.set(appearance.ballColor);this.glow.material.opacity=appearance.glow;this.glow.visible=appearance.glow>0;this.counterPlane.visible=appearance.showCounter;this.heading.context.clearRect(0,0,WIDTH,HEIGHT);const h=this.heading.context;
  if(appearance.showTitle){const gradient=h.createLinearGradient(0,0,0,360);gradient.addColorStop(0,appearance.background+'f5');gradient.addColorStop(.72,appearance.background+'cc');gradient.addColorStop(1,appearance.background+'00');h.fillStyle=gradient;h.fillRect(0,0,WIDTH,360);h.textAlign='center';h.textBaseline='middle';h.strokeStyle=appearance.background;h.lineJoin='round';h.lineWidth=12;h.fillStyle='#ffffff';const lines=appearance.title.split('\n').slice(0,3);let size=61;while(size>28){h.font=`900 ${size}px system-ui`;if(lines.every(line=>h.measureText(line).width<960))break;size-=2;}lines.forEach((line,i)=>{h.strokeText(line,540,170+i*(size+14));h.fillText(line,540,170+i*(size+14));});}
  if(appearance.handle){h.textAlign='center';h.font='500 30px system-ui';h.fillStyle='#ffffffbb';h.fillText(appearance.handle,540,1805);}
  this.heading.map.needsUpdate=true;
 }
 rebuild(simulation){
  for(const mesh of this.rings){this.arena.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  this.rings=simulation.rings.map(ring=>{const geometry=new THREE.RingGeometry(ring.initialRadius-1,ring.initialRadius+1,1024,1,simulation.gap/2,TAU-simulation.gap),position=geometry.getAttribute('position'),directions=new Float32Array(position.count*2),sides=new Float32Array(position.count);
   for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),radius=Math.hypot(x,y);directions[i*2]=x/radius;directions[i*2+1]=y/radius;sides[i]=radius<ring.initialRadius?-1:1;}
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false}));mesh.renderOrder=1;mesh.userData={directions,sides,radius:-1};this.arena.add(mesh);return mesh;
  });this.appearanceDirty=true;
 }
 draw(simulation){
  const signature=`${simulation.rings.length}/${simulation.gap}/${simulation.rings[0].initialRadius}`;if(signature!==this.signature){this.signature=signature;this.rebuild(simulation);}const a=this.appearance;
  if(this.appearanceDirty){this.colors=this.rings.map((mesh,i)=>{const color=new THREE.Color(ringColor(a,i,this.rings.length));mesh.material.color.copy(color);mesh.userData.radius=-1;return color;});}
  for(let i=0;i<this.rings.length;i++){const mesh=this.rings[i],ring=simulation.rings[i];mesh.visible=ring.alive;mesh.rotation.z=-ring.angle;if(ring.alive&&mesh.userData.radius!==ring.radius){const position=mesh.geometry.getAttribute('position'),{directions,sides}=mesh.userData;for(let j=0;j<position.count;j++){const radius=ring.radius+sides[j]*a.lineWidth/2;position.setXY(j,directions[j*2]*radius,directions[j*2+1]*radius);}position.needsUpdate=true;mesh.userData.radius=ring.radius;}}
  this.ball.position.set(simulation.ball.x,-simulation.ball.y,0);this.ball.scale.setScalar(simulation.ball.radius);let count=0;
  const add=(x,y,size,alpha,color)=>{if(count>=this.maxPoints)return;const i=count*3;this.positions[i]=x;this.positions[i+1]=-y;this.positions[i+2]=0;this.pointColors[i]=color.r;this.pointColors[i+1]=color.g;this.pointColors[i+2]=color.b;this.sizes[count]=size;this.alphas[count++]=Math.max(0,alpha);};
  if(a.trail)for(const point of simulation.trail){const fade=1-(simulation.time-point.time)/.18;add(point.x,point.y,simulation.ball.radius*2*(.4+.6*fade),fade*.17,this.rim.material.color);}
  if(a.particles)for(const point of simulation.particles)add(point.x,point.y,point.size,(1-point.age/point.life)*.9,this.colors[point.ring]);this.pointsGeometry.setDrawRange(0,count);for(const attribute of Object.values(this.pointsGeometry.attributes))attribute.needsUpdate=true;
  if(this.count!==simulation.remaining){const c=this.counter.context;c.clearRect(0,0,192,100);c.fillStyle='#f0f3ff';c.font='400 38px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(String(simulation.remaining),96,50);this.counter.map.needsUpdate=true;this.count=simulation.remaining;}
 this.appearanceDirty=false;this.renderer.render(this.scene,this.camera);
 }
}
