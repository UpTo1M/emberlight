// Emberlight — the world: the ember, its flame, the braziers, the wisps,
// the fireflies and the pillars, and everything that happens between them.
// The world knows nothing about the DOM or the canvas; it only updates
// numbers, and main.js draws them.
import { WORLD, EMBER, BRAZIER, WISP, FIREFLY, SCORE } from './config.js';
import { LEVELS } from './levels.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function randomSpot(rng, margin = 60) {
  return {
    x: rng.range(margin, WORLD.width - margin),
    y: rng.range(margin, WORLD.height - margin),
  };
}

export function createWorld(rng) {
  const world = {
    rng,
    levelIndex: 0,
    level: LEVELS[0],
    score: 0,
    best: 0,
    flame: EMBER.flameMax,
    ember: { x: WORLD.width / 2, y: WORLD.height - 80, vx: 0, vy: 0, moving: false },
    braziers: [],
    wisps: [],
    fireflies: [],
    pillars: [],
    particles: [],
    comboChain: 0,
    comboTimer: 0,
    levelTime: 0,
    wispTimer: 3,
    flicker: 0,
    shake: 0,
    time: 0,
    levelClearTimer: 0,
    levelBonus: 0,
    cleared: false,
    // Set by update when the run ends; main.js reads it to change phase.
    outcome: null, // 'levelclear' | 'gameover' | 'victory' | null
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    world.levelIndex = index;
    world.level = def;
    world.braziers = def.braziers.map((b) => ({ x: b.x, y: b.y, lit: false, channel: 0 }));
    world.pillars = def.pillars.map((p) => ({ x: p.x, y: p.y, r: p.r }));
    world.wisps = [];
    world.fireflies = [];
    for (let i = 0; i < def.fireflies; i++) {
      const spot = randomSpot(rng, 80);
      world.fireflies.push({
        baseX: spot.x,
        baseY: spot.y,
        x: spot.x,
        y: spot.y,
        phase: rng.range(0, Math.PI * 2),
        taken: false,
        respawn: 0,
      });
    }
    world.particles = [];
    world.comboChain = 0;
    world.comboTimer = 0;
    world.levelTime = 0;
    world.wispTimer = 2.5;
    world.flicker = 0;
    world.cleared = false;
    world.outcome = null;
    world.levelClearTimer = 0;
    world.ember.x = WORLD.width / 2;
    world.ember.y = WORLD.height - 80;
    world.ember.vx = 0;
    world.ember.vy = 0;
  }

  function resetRun() {
    world.score = 0;
    world.flame = EMBER.flameMax;
    loadLevel(0);
  }

  function burst(x, y, color, count, speed, life = 0.7, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(speed * 0.3, speed);
      world.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.range(life * 0.5, life),
        max: life,
        size: rng.range(size * 0.6, size * 1.4),
        color,
      });
    }
  }

  function spawnWisp() {
    // Appear at an edge, far enough from the ember to be fair.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries++) {
      const edge = rng.int(0, 3);
      if (edge === 0) { x = rng.range(20, WORLD.width - 20); y = 20; }
      if (edge === 1) { x = rng.range(20, WORLD.width - 20); y = WORLD.height - 20; }
      if (edge === 2) { x = 20; y = rng.range(20, WORLD.height - 20); }
      if (edge === 3) { x = WORLD.width - 20; y = rng.range(20, WORLD.height - 20); }
      if (dist(x, y, world.ember.x, world.ember.y) > 260) break;
    }
    world.wisps.push({
      x, y,
      speed: world.level.wispSpeed * rng.range(0.9, 1.1),
      phase: rng.range(0, Math.PI * 2),
      wobble: rng.range(0.5, 0.9),
    });
  }

  function lightBrazier(brazier, sfx) {
    brazier.lit = true;
    brazier.channel = 0;
    world.flame = Math.min(EMBER.flameMax, world.flame + EMBER.brazierFlame);
    // Lighting braziers quickly in a row builds a chain worth more.
    if (world.comboTimer > 0) world.comboChain += 1;
    else world.comboChain = 1;
    world.comboTimer = SCORE.comboWindow;
    const bonus = (world.comboChain - 1) * SCORE.comboStep;
    world.score += SCORE.brazier + bonus;
    burst(brazier.x, brazier.y - 8, '#ffb347', 26, 120, 0.9, 3.5);
    burst(brazier.x, brazier.y - 8, '#ffe9a8', 12, 60, 0.6, 2.5);
    sfx.ignite();
    if (world.braziers.every((b) => b.lit)) {
      world.cleared = true;
      const timeBonus = Math.max(0, SCORE.timeBonusMax - Math.floor(world.levelTime) * SCORE.timeBonusPerSecond);
      world.levelBonus = SCORE.levelBase + Math.round(world.flame) * SCORE.flameBonus + timeBonus;
      world.score += world.levelBonus;
      world.outcome = world.levelIndex >= LEVELS.length - 1 ? 'victory' : 'levelclear';
      world.levelClearTimer = 0;
      sfx.levelClear();
      if (world.outcome === 'victory') sfx.victory();
    }
  }

  function gameOver(sfx) {
    world.flame = 0;
    world.outcome = 'gameover';
    burst(world.ember.x, world.ember.y, '#7a86c9', 30, 90, 1.1, 3);
    sfx.gameOver();
  }

  function update(dt, input, sfx) {
    world.time += dt;
    world.levelTime += dt;
    if (world.comboTimer > 0) world.comboTimer -= dt;
    if (world.flicker > 0) world.flicker -= dt;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);

    // --- the flame always burns down ---
    world.flame -= world.level.drain * dt;
    if (world.flame <= 0) {
      gameOver(sfx);
      return;
    }

    // --- move the ember ---
    const ember = world.ember;
    let mx = 0;
    let my = 0;
    const keyVec = input.keyVector();
    if (keyVec) {
      mx = keyVec.x;
      my = keyVec.y;
    } else if (input.mouseActive) {
      const dx = input.mouse.x - ember.x;
      const dy = input.mouse.y - ember.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        mx = dx / d;
        my = dy / d;
      }
    }
    ember.moving = mx !== 0 || my !== 0;
    const speed = EMBER.speed * (input.mouseActive && !keyVec ? 0.85 : 1);
    ember.x += mx * speed * dt;
    ember.y += my * speed * dt;
    // Stone pillars block the ember.
    for (const p of world.pillars) {
      const d = dist(ember.x, ember.y, p.x, p.y);
      const min = p.r + EMBER.radius;
      if (d < min && d > 0.001) {
        ember.x = p.x + ((ember.x - p.x) / d) * min;
        ember.y = p.y + ((ember.y - p.y) / d) * min;
      }
    }
    ember.x = Math.max(EMBER.radius + 4, Math.min(WORLD.width - EMBER.radius - 4, ember.x));
    ember.y = Math.max(EMBER.radius + 4, Math.min(WORLD.height - EMBER.radius - 4, ember.y));

    // A moving ember sheds a trail of sparks.
    if (ember.moving && Math.random() < 0.6) {
      world.particles.push({
        x: ember.x + (Math.random() - 0.5) * 8,
        y: ember.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 20,
        vy: 20 + Math.random() * 20,
        life: 0.5,
        max: 0.5,
        size: 2,
        color: '#ff9a3c',
      });
    }

    // --- kindle braziers ---
    if (world.flicker <= 0) {
      for (const b of world.braziers) {
        if (b.lit) continue;
        const d = dist(ember.x, ember.y, b.x, b.y);
        if (d < BRAZIER.kindleRadius) {
          b.channel += dt / BRAZIER.kindleSeconds;
          if (Math.random() < 0.5) {
            world.particles.push({
              x: b.x + (Math.random() - 0.5) * 18,
              y: b.y - 6 - Math.random() * 8,
              vx: (Math.random() - 0.5) * 12,
              vy: -30 - Math.random() * 30,
              life: 0.5,
              max: 0.5,
              size: 2,
              color: '#ffd27a',
            });
          }
          if (b.channel >= 1) lightBrazier(b, sfx);
        } else {
          b.channel = Math.max(0, b.channel - dt * 2);
        }
      }
    } else {
      for (const b of world.braziers) b.channel = Math.max(0, b.channel - dt * 2);
    }

    // --- wisps spawn and hunt ---
    world.wispTimer -= dt;
    if (world.wispTimer <= 0 && world.wisps.length < world.level.wispMax) {
      spawnWisp();
      world.wispTimer = world.level.wispInterval;
    }
    for (let i = world.wisps.length - 1; i >= 0; i--) {
      const w = world.wisps[i];
      const dx = ember.x - w.x;
      const dy = ember.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(world.time * 2 + w.phase) * w.wobble;
      const nx = dx / d;
      const ny = dy / d;
      w.x += (nx - ny * wob * 0.6) * w.speed * dt;
      w.y += (ny + nx * wob * 0.6) * w.speed * dt;
      if (d < WISP.radius + EMBER.radius - 2) {
        // A touch steals flame and snuffs the wisp.
        world.flame -= EMBER.wispHitFlame;
        world.flicker = EMBER.flickerSeconds;
        world.shake = 9;
        burst(w.x, w.y, '#5a5f8a', 22, 110, 0.8, 3);
        world.wisps.splice(i, 1);
        sfx.hit();
        if (world.flame <= 0) {
          gameOver(sfx);
          return;
        }
      }
    }

    // --- fireflies drift, get caught, and come back ---
    for (const f of world.fireflies) {
      if (f.taken) {
        f.respawn -= dt;
        if (f.respawn <= 0) {
          const spot = randomSpot(rng, 80);
          f.baseX = spot.x;
          f.baseY = spot.y;
          f.taken = false;
        }
        continue;
      }
      f.x = f.baseX + Math.sin(world.time * 0.5 + f.phase) * 14;
      f.y = f.baseY + Math.cos(world.time * 0.4 + f.phase * 1.3) * 10;
      if (dist(ember.x, ember.y, f.x, f.y) < FIREFLY.collectRadius) {
        f.taken = true;
        f.respawn = FIREFLY.respawnSeconds;
        world.flame = Math.min(EMBER.flameMax, world.flame + EMBER.fireflyFlame);
        world.score += SCORE.firefly;
        burst(f.x, f.y, '#ffe9a8', 10, 70, 0.6, 2.5);
        sfx.pickup();
      }
    }

    // --- particles ---
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) world.particles.splice(i, 1);
    }
  }

  // A gentle step for screens where the game is not being played (title,
  // level clear, victory): time passes, fireflies drift, wisps circle and
  // particles fade — but nothing drains, spawns or collides.
  function ambient(dt) {
    world.time += dt;
    for (const f of world.fireflies) {
      if (f.taken) continue;
      f.x = f.baseX + Math.sin(world.time * 0.5 + f.phase) * 14;
      f.y = f.baseY + Math.cos(world.time * 0.4 + f.phase * 1.3) * 10;
    }
    for (const w of world.wisps) {
      const dx = world.ember.x - w.x;
      const dy = world.ember.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      w.x += (dx / d) * w.speed * 0.3 * dt;
      w.y += (dy / d) * w.speed * 0.3 * dt;
    }
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) world.particles.splice(i, 1);
    }
  }

  // For the ?shot= scenes: light every brazier of the current level at
  // once, with the same bursts and score the real lighting would give.
  function lightAll(sfx) {
    for (const b of world.braziers) {
      if (!b.lit) {
        b.lit = true;
        burst(b.x, b.y - 8, '#ffb347', 20, 110, 0.9, 3.5);
      }
    }
    world.cleared = true;
    world.levelBonus = SCORE.levelBase + Math.round(world.flame) * SCORE.flameBonus + 180;
    world.score += world.braziers.length * SCORE.brazier + world.levelBonus;
    world.outcome = world.levelIndex >= LEVELS.length - 1 ? 'victory' : 'levelclear';
    world.levelClearTimer = 0;
  }

  loadLevel(0);

  // Return the live world object itself (not a copy) so update() and the
  // renderer always see the same numbers.
  world.loadLevel = loadLevel;
  world.resetRun = resetRun;
  world.update = update;
  world.ambient = ambient;
  world.lightAll = lightAll;
  world.burst = burst;
  world.levelCount = LEVELS.length;
  return world;
}
