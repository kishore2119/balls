import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, STEP, BALL_SPEED } from '../simulation.js';

const snapshot = simulation => JSON.stringify({
  tick: simulation.tick, ball: simulation.ball, rings: simulation.rings,
  remaining: simulation.remaining, particles: simulation.particles, trail: simulation.trail,
});

test('30 fps and 60 fps produce identical physics and visual events', () => {
  const a = new Simulation(), b = new Simulation();
  for (let i = 0; i < 600; i++) a.advance(1 / 30);
  for (let i = 0; i < 1200; i++) b.advance(1 / 60);
  assert.equal(a.tick, 4800);
  assert.equal(snapshot(a), snapshot(b));
});

test('seeking backward recreates the exact same frame', () => {
  const simulation = new Simulation();
  simulation.seek(10);
  const expected = snapshot(simulation);
  simulation.seek(30);
  simulation.seek(10);
  assert.equal(snapshot(simulation), expected);
});

test('a solid wall reflects the ball without destroying the ring', () => {
  const simulation = new Simulation();
  Object.assign(simulation.ball, { x: -128, y: 0, vx: -200, vy: 0 });
  simulation.step();
  assert.equal(simulation.remaining, 50);
  assert.ok(simulation.ball.vx > 0);
  assert.ok(Math.hypot(simulation.ball.x, simulation.ball.y) + simulation.ball.radius < simulation.rings[0].radius);
});

test('the gap lets the ball through and creates ring particles', () => {
  const simulation = new Simulation();
  simulation.rings[0].angle = 0;
  Object.assign(simulation.ball, { x: 128, y: 0, vx: 200, vy: 0 });
  simulation.step();
  assert.equal(simulation.remaining, 49);
  assert.equal(simulation.rings[0].alive, false);
  assert.ok(simulation.ball.vx > 0);
  assert.ok(simulation.particles.length > 50);
});

test('three seeded simulations finish with finite physics and no remaining rings', () => {
  for (const seed of [48291, 48292, 48293]) {
    const simulation = new Simulation(seed);
    for (let i = 0; i < 300 / STEP && simulation.remaining > 0; i++) simulation.step();
    assert.equal(simulation.remaining, 0, `Seed ${seed} must escape`);
    assert.ok(Number.isFinite(simulation.ball.x + simulation.ball.y));
    assert.notEqual(simulation.escapedAt, null);
  }
});

test('rings visibly contract together while preserving their spacing', () => {
  const simulation = new Simulation();
  const outerRadius = simulation.rings[49].radius;
  simulation.seek(1);
  assert.ok(Math.abs(outerRadius - simulation.rings[49].radius - 24) < 0.001);
  for (let second = 2; second <= 180; second++) {
    simulation.seek(second);
    const alive = simulation.rings.filter(ring => ring.alive);
    if (!alive.length) break;
    assert.ok(alive[0].radius >= 90 - 1e-8);
    for (let i = 1; i < alive.length; i++) {
      const expectedSpacing = (alive[i].index - alive[i - 1].index) * 27;
      assert.ok(Math.abs(alive[i].radius - alive[i - 1].radius - expectedSpacing) < 1e-8);
    }
  }
});

test('ball speed changes ball motion independently of ring motion', () => {
  const normal = new Simulation(48291, { ballSpeed: 1, shrinkSpeed: 0, gravity: 0 });
  const fast = new Simulation(48291, { ballSpeed: 2, shrinkSpeed: 0, gravity: 0 });
  const x = normal.ball.x;
  normal.step(); fast.step();
  assert.ok(Math.abs((fast.ball.x - x) - 2 * (normal.ball.x - x)) < 1e-8);
  assert.equal(normal.rings[49].radius, fast.rings[49].radius);
  assert.equal(normal.rings[49].angle, fast.rings[49].angle);
});

test('ball keeps the selected speed on every tick for the full video', () => {
  for (const settings of [
    { ballSpeed: .25, gravity: 500, bounciness: .85, shrinkSpeed: 0 },
    { ballSpeed: 1, gravity: 170, bounciness: 1, shrinkSpeed: 1, shrinkStopTime: 15 },
    { ballSpeed: 3, gravity: 500, bounciness: 1.08, shrinkSpeed: 4 },
  ]) {
    const s = new Simulation(1810087800, settings, { effects: false });
    for (let tick = 0; tick < 120 / STEP; tick++) {
      const before = { ...s.ball }, events = s.events.length;
      s.step();
      const actual = Math.hypot(s.ball.vx, s.ball.vy) * settings.ballSpeed;
      assert.ok(Math.abs(actual - BALL_SPEED * settings.ballSpeed) < 1e-8, `Speed changed at ${s.time}s`);
      if (s.events.length === events) {
        const traveled = Math.hypot(s.ball.x - before.x, s.ball.y - before.y);
        assert.ok(Math.abs(traveled - BALL_SPEED * settings.ballSpeed * STEP) < 1e-7);
      }
    }
    assert.ok(s.events.some(event => event.type === 'bounce'));
    for (const event of s.events) assert.ok(Math.abs(event.speed - BALL_SPEED * settings.ballSpeed) < 1e-8);
  }
});

test('an upward ball and an energy-losing rebound both retain constant speed', () => {
  const upward = new Simulation(48291, { gravity: 500, shrinkSpeed: 0 });
  Object.assign(upward.ball, { vx: 100, vy: -500 });
  upward.step();assert.ok(upward.ball.vy < 0);
  assert.ok(Math.abs(Math.hypot(upward.ball.vx, upward.ball.vy) - BALL_SPEED) < 1e-8);
  const rebound = new Simulation(48291, { gravity: 0, bounciness: .85, shrinkSpeed: 4 });
  Object.assign(rebound.ball, { x: -128, y: 0, vx: -BALL_SPEED, vy: 0 });
  rebound.step();assert.ok(rebound.ball.vx > 0);
  assert.ok(Math.abs(Math.hypot(rebound.ball.vx, rebound.ball.vy) - BALL_SPEED) < 1e-8);
});

test('shrink speed can stop or accelerate rings independently of ball motion', () => {
  const stopped = new Simulation(48291, { shrinkSpeed: 0 });
  const fast = new Simulation(48291, { shrinkSpeed: 2 });
  const radius = fast.rings[49].radius;
  stopped.advance(0.1); fast.advance(0.1);
  assert.equal(stopped.rings[49].radius, radius);
  assert.ok(Math.abs(radius - fast.rings[49].radius - 4.8) < 1e-8);
  assert.deepEqual(stopped.ball, fast.ball);
});

test('live edits preserve position, survive resets, and support reproducible frame seeking', () => {
  const simulation = new Simulation();
  simulation.advance(1);
  const ball = { ...simulation.ball }, tick = simulation.tick;
  simulation.setSettings({ ballSpeed: 1.5, shrinkSpeed: 2 });
  assert.deepEqual(simulation.ball, ball);
  assert.equal(simulation.tick, tick);
  simulation.seek(5);
  const reference = new Simulation(48291, { ballSpeed: 1.5, shrinkSpeed: 2 });
  reference.seek(5);
  assert.equal(snapshot(simulation), snapshot(reference));
  simulation.reset();
  assert.equal(simulation.settings.ballSpeed, 1.5);
  assert.equal(simulation.settings.shrinkSpeed, 2);
});

