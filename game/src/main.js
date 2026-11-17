// Emberlight — bootstrap, the phase machine, the HUD and the main loop.
// Phases: title → playing ⇄ paused → levelclear → playing … → victory,
// and playing → gameover → playing. The world does the numbers; this file
// owns the screens, the buttons and the frame.
import { BEST_KEY } from './config.js';
import { makeRng } from './rng.js';
import { LEVELS } from './levels.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { getShotParams, buildShotScene } from './shots.js';

const canvas = document.getElementById('game');
const el = (id) => document.getElementById(id);
const hud = {
  flameFill: el('flame-fill'),
  flameBar: el('flame-bar'),
  flameNum: el('flame-num'),
  braziers: el('braziers'),
  levelLabel: el('level-label'),
  score: el('score'),
  best: el('best'),
  titleBest: el('title-best'),
};
const overlays = {
  title: el('overlay-title'),
  pause: el('overlay-pause'),
  help: el('overlay-help'),
  clear: el('overlay-clear'),
  over: el('overlay-over'),
  win: el('overlay-win'),
};

const game = {
  phase: 'title',
  world: null,
  renderer: null,
  audio: null,
  input: null,
  best: 0,
  banner: null,
  bannerTimer: 0,
  levelClearTimer: 0,
  helpFrom: 'title',
  shotMode: false,
};

function showOverlay(name) {
  for (const key of Object.keys(overlays)) {
    overlays[key].classList.toggle('hidden', key !== name);
  }
}

function hideOverlays() {
  for (const key of Object.keys(overlays)) overlays[key].classList.add('hidden');
}

function loadBest() {
  try {
    game.best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
  } catch {
    game.best = 0;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(game.best));
  } catch { /* storage unavailable; the best score just does not persist */ }
}

function setBanner(text, sub) {
  game.banner = { text, sub, alpha: 1 };
  game.bannerTimer = 2.6;
}

function startRun() {
  game.audio.unlock();
  game.world.resetRun();
  game.phase = 'playing';
  hideOverlays();
  setBanner(`Level 1 — ${LEVELS[0].name}`, LEVELS[0].hint);
  updateHud();
}

function advanceLevel() {
  const next = game.world.levelIndex + 1;
  game.world.loadLevel(next);
  game.phase = 'playing';
  hideOverlays();
  setBanner(`Level ${next + 1} — ${LEVELS[next].name}`, LEVELS[next].hint);
  updateHud();
}

function pauseGame() {
  if (game.phase !== 'playing') return;
  game.phase = 'paused';
  showOverlay('pause');
}

function resumeGame() {
  if (game.phase !== 'paused') return;
  game.phase = 'playing';
  hideOverlays();
}

function openHelp(from) {
  game.helpFrom = from;
  if (game.phase === 'playing') game.phase = 'paused';
  showOverlay('help');
}

function closeHelp() {
  if (game.helpFrom === 'playing' && game.phase === 'paused') {
    game.phase = 'playing';
    hideOverlays();
  } else if (game.helpFrom === 'title') {
    game.phase = 'title';
    showOverlay('title');
  } else {
    showOverlay('pause');
  }
}

function toggleMute() {
  const muted = game.audio.toggleMute();
  el('btn-mute').textContent = muted ? '✕' : '♪';
}

function updateHud() {
  const w = game.world;
  const flame = Math.max(0, Math.round(w.flame));
  hud.flameFill.style.width = `${flame}%`;
  hud.flameBar.classList.toggle('low', flame < 25);
  hud.flameNum.textContent = String(flame);
  hud.braziers.textContent = w.braziers.map((b) => (b.lit ? '●' : '○')).join(' ');
  hud.levelLabel.textContent = `Level ${w.levelIndex + 1} · ${w.level.name}`;
  hud.score.textContent = `Score ${w.score}`;
  hud.best.textContent = `Best ${Math.max(game.best, w.score)}`;
  hud.titleBest.textContent = String(Math.max(game.best, w.score));
}

function handleOutcome() {
  const w = game.world;
  const outcome = w.outcome;
  w.outcome = null;
  if (outcome === 'levelclear') {
    game.phase = 'levelclear';
    game.levelClearTimer = 0;
    el('clear-title').textContent = `Level ${w.levelIndex + 1} clear!`;
    el('clear-detail').textContent = `Bonus +${w.levelBonus} · Flame ${Math.max(0, Math.round(w.flame))} · Score ${w.score}`;
    showOverlay('clear');
  } else if (outcome === 'gameover') {
    game.phase = 'gameover';
    if (w.score > game.best) {
      game.best = w.score;
      saveBest();
    }
    el('over-detail').textContent = `You reached level ${w.levelIndex + 1} — ${w.level.name}. ${w.braziers.filter((b) => b.lit).length} of ${w.braziers.length} braziers lit.`;
    el('over-score').textContent = String(w.score);
    el('over-best').textContent = String(game.best);
    showOverlay('over');
  } else if (outcome === 'victory') {
    game.phase = 'victory';
    if (w.score > game.best) {
      game.best = w.score;
      saveBest();
    }
    el('win-score').textContent = String(w.score);
    el('win-best').textContent = String(game.best);
    showOverlay('win');
  }
  updateHud();
}

function onKeyDown(event) {
  const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (game.shotMode) return;
  if (k === 'Enter' || k === ' ') {
    event.preventDefault();
    if (game.phase === 'title') startRun();
    else if (game.phase === 'levelclear') advanceLevel();
    else if (game.phase === 'gameover' || game.phase === 'victory') startRun();
  } else if (k === 'p' || k === 'Escape') {
    if (game.phase === 'playing') pauseGame();
    else if (game.phase === 'paused' && overlays.help.classList.contains('hidden')) resumeGame();
    else if (!overlays.help.classList.contains('hidden')) closeHelp();
  } else if (k === 'h') {
    if (!overlays.help.classList.contains('hidden')) closeHelp();
    else if (game.phase === 'playing' || game.phase === 'paused' || game.phase === 'title') {
      openHelp(game.phase === 'paused' ? 'paused' : game.phase);
    }
  } else if (k === 'm') {
    toggleMute();
  } else if (k === 'r') {
    if (game.phase === 'gameover' || game.phase === 'victory' || game.phase === 'playing') {
      startRun();
    }
  }
}

function bindButtons() {
  el('btn-start').addEventListener('click', startRun);
  el('btn-resume').addEventListener('click', resumeGame);
  el('btn-restart-run').addEventListener('click', startRun);
  el('btn-pause-help').addEventListener('click', () => openHelp('paused'));
  el('btn-close-help').addEventListener('click', closeHelp);
  el('btn-continue').addEventListener('click', advanceLevel);
  el('btn-retry').addEventListener('click', startRun);
  el('btn-again').addEventListener('click', startRun);
  el('btn-pause').addEventListener('click', () => {
    if (game.phase === 'playing') pauseGame();
    else if (game.phase === 'paused') resumeGame();
  });
  el('btn-help').addEventListener('click', () => {
    if (!overlays.help.classList.contains('hidden')) closeHelp();
    else if (game.phase === 'playing' || game.phase === 'paused' || game.phase === 'title') {
      openHelp(game.phase === 'paused' ? 'paused' : game.phase);
    }
  });
  el('btn-mute').addEventListener('click', toggleMute);
  canvas.addEventListener('mousedown', () => game.audio.unlock());
  window.addEventListener('keydown', onKeyDown);
}

let last = 0;
function frame(now) {
  const dt = Math.min(0.033, Math.max(0.0001, (now - last) / 1000));
  last = now;
  const w = game.world;

  if (game.phase === 'playing') {
    w.update(dt, game.input, game.audio);
    if (w.outcome) handleOutcome();
  } else if (game.phase === 'title' || game.phase === 'levelclear' || game.phase === 'victory') {
    w.ambient(dt);
    if (game.phase === 'levelclear') {
      game.levelClearTimer += dt;
      if (game.levelClearTimer > 1.8) advanceLevel();
    }
  }

  if (game.banner) {
    game.bannerTimer -= dt;
    game.banner.alpha = Math.max(0, Math.min(1, game.bannerTimer / 0.8));
    if (game.bannerTimer <= 0) game.banner = null;
  }

  game.renderer.draw(w, game.phase, game.banner);
  updateHud();
  requestAnimationFrame(frame);
}

function init() {
  const seed = (Date.now() % 2147483647) || 1;
  const rng = makeRng(seed);
  game.world = createWorld(rng);
  game.renderer = createRenderer(canvas);
  game.audio = createAudio();
  game.input = createInput(canvas);
  loadBest();
  bindButtons();

  const shot = getShotParams();
  if (shot) {
    // Deterministic screenshot scene: build it through the game's own
    // code, render once, and tell the screenshot tool it is ready.
    game.shotMode = true;
    const scene = buildShotScene(shot.shot, shot.seed);
    if (scene) {
      game.world = scene.world;
      game.phase = scene.phase;
      if (scene.phase === 'levelclear') {
        el('clear-title').textContent = `Level ${scene.world.levelIndex + 1} clear!`;
        el('clear-detail').textContent = `Bonus +${scene.world.levelBonus} · Flame ${Math.max(0, Math.round(scene.world.flame))} · Score ${scene.world.score}`;
        showOverlay('clear');
      } else if (scene.phase === 'victory') {
        el('win-score').textContent = String(scene.world.score);
        el('win-best').textContent = String(Math.max(game.best, scene.world.score));
        showOverlay('win');
      } else if (scene.phase === 'title') {
        showOverlay('title');
      } else {
        hideOverlays();
      }
      updateHud();
      game.renderer.draw(game.world, game.phase, null);
      // One more frame so the overlay and HUD settle before the shot.
      requestAnimationFrame(() => {
        game.renderer.draw(game.world, game.phase, null);
        window.__shotReady = true;
      });
    }
    window.__emberlight = { game, world: game.world };
    return;
  }

  game.phase = 'title';
  showOverlay('title');
  updateHud();
  window.__emberlight = { game, world: game.world };
  requestAnimationFrame((now) => {
    last = now;
    requestAnimationFrame(frame);
  });
}

init();
