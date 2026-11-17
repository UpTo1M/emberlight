// Emberlight — deterministic ?shot= scenes for screenshots. Each scene
// builds its state through the game's own world code (real level loading,
// real updates with a scripted autopilot, real lighting) at a fixed seed
// and fixed simulated time, then renders one frame. The screenshots are
// real renders of the game's own code, never edited or composited.
import { makeRng } from './rng.js';
import { createWorld } from './world.js';

const NOOP_SFX = {
  ignite() {},
  pickup() {},
  hit() {},
  levelClear() {},
  gameOver() {},
  victory() {},
};

export function getShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  const seed = Number(q.get('seed') || '1') || 1;
  return { shot, seed };
}

// Steers the ember at the nearest unlit brazier and stands still to kindle.
function autopilotInput(world) {
  return {
    keyVector() {
      const target = world.braziers.find((b) => !b.lit);
      if (!target) return null;
      const dx = target.x - world.ember.x;
      const dy = target.y - world.ember.y;
      const d = Math.hypot(dx, dy);
      if (d < 30) return null;
      return { x: dx / d, y: dy / d };
    },
    mouseActive: false,
    mouse: { x: 0, y: 0 },
  };
}

function simulate(world, input, seconds, stopWhen) {
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (world.outcome) break;
    if (stopWhen && stopWhen(world)) break;
    world.update(dt, input, NOOP_SFX);
  }
}

function litCount(world) {
  return world.braziers.filter((b) => b.lit).length;
}

export function buildShotScene(shot, seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);

  if (shot === 'start') {
    // Title screen over a half-lit world: two braziers burning, the ember
    // waiting at the centre, wisps watching from the dark.
    world.loadLevel(0);
    world.braziers[0].lit = true;
    world.braziers[1].lit = true;
    world.ember.x = 480;
    world.ember.y = 300;
    world.wisps.push({ x: 150, y: 420, speed: 55, phase: 0.5, wobble: 0.7 });
    world.wisps.push({ x: 820, y: 430, speed: 55, phase: 2.1, wobble: 0.6 });
    world.time = 2;
    return { world, phase: 'title', banner: null };
  }

  if (shot === 'play') {
    // Mid-game on level 3: two braziers lit, the ember on its way to the
    // third, wisps closing in, flame about two thirds full.
    world.loadLevel(2);
    const input = autopilotInput(world);
    simulate(world, input, 16, (w) => litCount(w) >= 2);
    return { world, phase: 'playing', banner: null };
  }

  if (shot === 'win') {
    // Level 2 cleared: every brazier burning, the level-clear overlay up.
    world.loadLevel(1);
    const input = autopilotInput(world);
    simulate(world, input, 45);
    if (!world.cleared) {
      // The autopilot should finish level 2; if it did not, light the
      // rest through the game's own lighting path.
      world.lightAll(NOOP_SFX);
    }
    world.levelClearTimer = 0.4;
    return { world, phase: 'levelclear', banner: null };
  }

  if (shot === 'end') {
    // Victory: the last dawn, all six braziers of level 8 burning.
    world.loadLevel(7);
    world.score = 3200;
    world.flame = 64;
    world.lightAll(NOOP_SFX);
    world.time = 3;
    return { world, phase: 'victory', banner: null };
  }

  return null;
}
