import * as THREE from './vendor/three.module.js';
import { Simulation, WIDTH, HEIGHT, GAP, TAU } from './simulation.js';
import { recordVideo } from './recording.js';

const canvas = document.querySelector('#animation');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
// The drawing buffer stays at export resolution. CSS alone scales the preview.
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setClearColor(0x030413, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-WIDTH / 2, WIDTH / 2, HEIGHT / 2, -HEIGHT / 2, 0.1, 100);
camera.position.z = 10;
const arena = new THREE.Group();
arena.position.y = -50;
scene.add(arena);
let simulation = new Simulation();

const colors = simulation.rings.map(ring => new THREE.Color().setStyle(
  `hsl(${ring.hue * 360}, 90%, ${ring.lightness * 100}%)`
));
const ringMeshes = simulation.rings.map((ring, index) => {
  const geometry = new THREE.RingGeometry(ring.initialRadius - 1.75, ring.initialRadius + 1.75, 384, 1, GAP / 2, TAU - GAP);
  const material = new THREE.MeshBasicMaterial({ color: colors[index], depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  // Store radial directions so shrinking keeps every stroke the same width.
  const positions = geometry.getAttribute('position');
  const directions = new Float32Array(positions.count * 2);
  const offsets = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    const radius = Math.hypot(x, y);
    directions[i * 2] = x / radius;
    directions[i * 2 + 1] = y / radius;
    offsets[i] = radius < ring.initialRadius ? -1.75 : 1.75;
  }
  mesh.userData = { directions, offsets, radius: ring.initialRadius };
  mesh.renderOrder = 1;
  arena.add(mesh);
  return mesh;
});

// Trail and fragments share a single reusable GPU buffer and draw call.
const MAX_POINTS = 4096;
const positions = new Float32Array(MAX_POINTS * 3);
const pointColors = new Float32Array(MAX_POINTS * 3);
const sizes = new Float32Array(MAX_POINTS);
const alphas = new Float32Array(MAX_POINTS);
const pointGeometry = new THREE.BufferGeometry();
for (const [name, array, count] of [
  ['position', positions, 3], ['aColor', pointColors, 3],
  ['aSize', sizes, 1], ['aAlpha', alphas, 1],
]) pointGeometry.setAttribute(name, new THREE.BufferAttribute(array, count).setUsage(THREE.DynamicDrawUsage));
const pointMaterial = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false,
  vertexShader: `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aAlpha;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = aColor;
      vAlpha = aAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float radius = length(gl_PointCoord - vec2(0.5));
      float alpha = (1.0 - smoothstep(0.40, 0.5, radius)) * vAlpha;
      if (alpha < 0.002) discard;
      gl_FragColor = vec4(vColor, alpha);
      #include <colorspace_fragment>
    }
  `,
});
const points = new THREE.Points(pointGeometry, pointMaterial);
points.frustumCulled = false;
points.renderOrder = 2;
arena.add(points);

const ballGroup = new THREE.Group();
const ballFill = new THREE.Mesh(new THREE.CircleGeometry(15.5, 48), new THREE.MeshBasicMaterial({ color: 0x141a31, depthTest: false }));
const ballRim = new THREE.Mesh(new THREE.RingGeometry(15, 17, 48), new THREE.MeshBasicMaterial({ color: 0xf2f5ff, depthTest: false }));
ballFill.renderOrder = 4;
ballRim.renderOrder = 5;
ballGroup.add(ballFill, ballRim);
arena.add(ballGroup);

function canvasTexture(width, height) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  const context = surface.getContext('2d');
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { surface, context, texture };
}
function texturePlane(texture, width, height, order) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false,
  }));
  plane.renderOrder = order;
  scene.add(plane);
  return plane;
}
const glow = canvasTexture(128, 128);
const gradient = glow.context.createRadialGradient(64, 64, 15, 64, 64, 64);
gradient.addColorStop(0, '#b6c7ff55');
gradient.addColorStop(1, '#b6c7ff00');
glow.context.fillStyle = gradient;
glow.context.fillRect(0, 0, 128, 128);
glow.texture.needsUpdate = true;
const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow.texture, transparent: true, depthTest: false, depthWrite: false }));
glowSprite.scale.set(90, 90, 1);
glowSprite.renderOrder = 3;
ballGroup.add(glowSprite);

// Text is baked into Three.js textures, so it is included in captured video.
const header = canvasTexture(WIDTH, 370);
const h = header.context;
const headerFade = h.createLinearGradient(0, 0, 0, 370);
headerFade.addColorStop(0, '#030413f5');
headerFade.addColorStop(0.75, '#030413d0');
headerFade.addColorStop(1, '#03041300');
h.fillStyle = headerFade;
h.fillRect(0, 0, WIDTH, 370);
h.textAlign = 'center';
h.textBaseline = 'middle';
h.fillStyle = '#ffffff';
h.font = '900 61px system-ui, sans-serif';
h.strokeStyle = '#030413';
h.lineWidth = 12;
h.lineJoin = 'round';
for (const [text, y] of [['WILL THE BALL ESCAPE', 170], ['THE SHRINKING RINGS?', 247]]) {
  h.strokeText(text, WIDTH / 2, y);
  h.fillText(text, WIDTH / 2, y);
}
header.texture.needsUpdate = true;
const headerPlane = texturePlane(header.texture, WIDTH, 370, 10);
headerPlane.position.y = HEIGHT / 2 - 185;
const counter = canvasTexture(192, 100);
const counterPlane = texturePlane(counter.texture, 192, 100, 6);
counterPlane.position.y = arena.position.y;
let previousCount = -1;
const ending = canvasTexture(WIDTH, 320);
const e = ending.context;
e.fillStyle = '#030413d0';
e.fillRect(0, 0, WIDTH, 320);
e.textAlign = 'center';
e.fillStyle = '#e2e8ff';
e.font = '900 68px system-ui, sans-serif';
e.fillText('FREEDOM.', WIDTH / 2, 140);
e.fillStyle = '#a8b4d1';
e.font = '28px system-ui, sans-serif';
e.fillText('Every ring has a way out.', WIDTH / 2, 210);
ending.texture.needsUpdate = true;
const endingPlane = texturePlane(ending.texture, WIDTH, 320, 11);
endingPlane.position.y = 30;

function draw() {
  for (let i = 0; i < ringMeshes.length; i++) {
    const ring = simulation.rings[i], mesh = ringMeshes[i];
    mesh.visible = ring.alive;
    mesh.rotation.z = -ring.angle;
    if (ring.alive && mesh.userData.radius !== ring.radius) {
      const positions = mesh.geometry.getAttribute('position');
      const { directions, offsets } = mesh.userData;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const radius = ring.radius + offsets[vertex];
        positions.setXY(vertex, directions[vertex * 2] * radius, directions[vertex * 2 + 1] * radius);
      }
      positions.needsUpdate = true;
      mesh.userData.radius = ring.radius;
    }
  }
  ballGroup.position.set(simulation.ball.x, -simulation.ball.y, 0);
  let count = 0;
  const addPoint = (x, y, size, alpha, color) => {
    if (count >= MAX_POINTS) return;
    const offset = count * 3;
    positions[offset] = x;
    positions[offset + 1] = -y;
    positions[offset + 2] = 0;
    pointColors[offset] = color.r;
    pointColors[offset + 1] = color.g;
    pointColors[offset + 2] = color.b;
    sizes[count] = size;
    alphas[count++] = Math.max(0, alpha);
  };
  const trailColor = ballRim.material.color;
  for (const sample of simulation.trail) {
    const fade = 1 - (simulation.time - sample.time) / 0.18;
    addPoint(sample.x, sample.y, 34 * (0.4 + 0.6 * fade), fade * 0.17, trailColor);
  }
  for (const particle of simulation.particles) {
    addPoint(particle.x, particle.y, particle.size, (1 - particle.age / particle.life) * 0.9, colors[particle.ring]);
  }
  pointGeometry.setDrawRange(0, count);
  for (const attribute of Object.values(pointGeometry.attributes)) attribute.needsUpdate = true;
  if (simulation.remaining !== previousCount) {
    const c = counter.context;
    c.clearRect(0, 0, 192, 100);
    c.fillStyle = '#f0f3ff';
    c.font = '400 38px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(simulation.remaining), 96, 50);
    counter.texture.needsUpdate = true;
    previousCount = simulation.remaining;
  }
  endingPlane.visible = simulation.escapedAt !== null;
  renderer.render(scene, camera);
}

let frameRequest = 0, last = null, playing = false, recording = false;
function loop(timestamp) {
  if (!playing) return;
  if (last !== null) simulation.advance(Math.min((timestamp - last) / 1000, 0.1));
  last = timestamp;
  // Let the ending breathe, then automatically start the same animation again.
  if (simulation.escapedAt !== null && simulation.time - simulation.escapedAt > 3) simulation.reset();
  draw();
  frameRequest = requestAnimationFrame(loop);
}
function pause() {
  playing = false;
  cancelAnimationFrame(frameRequest);
  last = null;
}
function play() {
  if (playing || recording) return;
  playing = true;
  last = null;
  frameRequest = requestAnimationFrame(loop);
}
function renderFrame(frame, fps = 60) {
  if (recording) throw new Error('An export is already running.');
  if (!Number.isInteger(frame) || frame < 0 || !Number.isFinite(fps) || fps <= 0 || fps > 240) {
    throw new RangeError('Provide a non-negative frame and a frame rate between 0 and 240.');
  }
  pause();
  simulation.seek(frame / fps);
  draw();
  return canvas;
}
async function exportVideo(options = {}) {
  if (recording) throw new Error('An export is already running.');
  const wasPlaying = playing;
  const savedSimulation = simulation;
  const sliders = [...document.querySelectorAll('.settings input')];
  sliders.forEach(slider => { slider.disabled = true; });
  pause();
  recording = true;
  try {
    simulation = new Simulation(savedSimulation.seed, savedSimulation.settings);
    draw();
    return await recordVideo(canvas, seconds => { simulation.seek(seconds); draw(); }, options);
  } finally {
    simulation = savedSimulation;
    draw();
    sliders.forEach(slider => { slider.disabled = false; });
    recording = false;
    if (wasPlaying) play();
  }
}
function configure(settings) {
  if (recording) throw new Error('Wait for the current export to finish before changing speeds.');
  simulation.setSettings(settings);
  const fields = [['ball-speed', 'ballSpeed'], ['shrink-speed', 'shrinkSpeed']];
  for (const [id, key] of fields) {
    const slider = document.getElementById(id);
    const value = simulation.settings[key];
    slider.value = String(value);
    slider.setAttribute('aria-valuetext', value === 0 ? 'Stopped' : `${value.toFixed(2)} times normal speed`);
    document.getElementById(`${id}-value`).textContent = value === 0 ? 'Stopped' : `${value.toFixed(2)}×`;
  }
}
for (const [id, key] of [['ball-speed', 'ballSpeed'], ['shrink-speed', 'shrinkSpeed']]) {
  document.getElementById(id).addEventListener('input', event => configure({ [key]: Number(event.target.value) }));
}
window.orbit = Object.freeze({
  renderFrame, exportVideo, play, configure,
  getState: () => ({
    renderer: `Three.js r${THREE.REVISION}`, width: WIDTH, height: HEIGHT,
    seed: simulation.seed, time: simulation.time, remaining: simulation.remaining,
    playing, recording, settings: { ...simulation.settings },
  }),
});
document.addEventListener('visibilitychange', () => { last = null; });
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  pause();
  const message = document.querySelector('#error');
  message.textContent = 'The graphics connection was interrupted. Reload to restart the animation.';
  message.hidden = false;
});
draw();
play();
window.dispatchEvent(new Event('orbitready'));


