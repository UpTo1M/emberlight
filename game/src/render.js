// Emberlight — everything the eye sees, drawn on one canvas. The world is
// a dark indigo night; the only light comes from the ember, the lit
// braziers and the fireflies, punched as holes through a darkness overlay.
import { WORLD, EMBER, BRAZIER, WISP, LIGHT } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;

  const dark = document.createElement('canvas');
  dark.width = WORLD.width;
  dark.height = WORLD.height;
  const dctx = dark.getContext('2d');

  // Fixed stars, placed once so the night sky never shimmers.
  const stars = [];
  {
    let seed = 1234567;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 90; i++) {
      stars.push({ x: next() * WORLD.width, y: next() * WORLD.height, r: next() * 1.3 + 0.4, a: next() * 0.5 + 0.15 });
    }
  }

  function radial(x, y, r, inner, outer) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    return g;
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(0.55, '#080d20');
    g.addColorStop(1, '#04050e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Stars, twinkling almost too slowly to notice.
    for (const s of stars) {
      const tw = 0.6 + 0.4 * Math.sin(time * 0.7 + s.x * 0.05);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#cdd7ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint ground motes drifting in the dark.
    ctx.fillStyle = '#1a2145';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137.5) % WORLD.width + time * 3 * (i % 3 + 1)) % WORLD.width;
      const y = (i * 89.3) % WORLD.height;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPillars(world) {
    for (const p of world.pillars) {
      ctx.fillStyle = '#12172e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a3358';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#3d4a7a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.62, 0.3, 2.2);
      ctx.stroke();
      // A cold rim catches a little of the night.
      ctx.fillStyle = 'rgba(120, 140, 220, 0.10)';
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBrazier(b, time) {
    // Stone bowl.
    ctx.fillStyle = '#1c2342';
    ctx.beginPath();
    ctx.moveTo(b.x - 20, b.y - 4);
    ctx.lineTo(b.x + 20, b.y - 4);
    ctx.lineTo(b.x + 13, b.y + 12);
    ctx.lineTo(b.x - 13, b.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#39437a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Stone foot.
    ctx.fillStyle = '#161c38';
    ctx.fillRect(b.x - 4, b.y + 12, 8, 10);
    if (b.lit) {
      // A living flame, flickering.
      const fl = 1 + Math.sin(time * 9 + b.x * 0.13) * 0.12 + Math.sin(time * 23 + b.y) * 0.06;
      const h = 26 * fl;
      const grad = ctx.createLinearGradient(b.x, b.y - 4, b.x, b.y - 4 - h);
      grad.addColorStop(0, '#ff7a1a');
      grad.addColorStop(0.55, '#ffb347');
      grad.addColorStop(1, '#ffe9a8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y - 4);
      ctx.quadraticCurveTo(b.x - 11, b.y - 16, b.x, b.y - 4 - h);
      ctx.quadraticCurveTo(b.x + 11, b.y - 16, b.x + 9, b.y - 4);
      ctx.closePath();
      ctx.fill();
      // Warm halo around a lit brazier.
      ctx.fillStyle = radial(b.x, b.y - 10, 64, 'rgba(255, 170, 60, 0.20)', 'rgba(255, 170, 60, 0)');
      ctx.beginPath();
      ctx.arc(b.x, b.y - 10, 64, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cold and waiting: a faint cool shimmer so it can be found in the
      // dark, and a curl of smoke.
      ctx.fillStyle = radial(b.x, b.y - 4, 46, 'rgba(120, 140, 220, 0.16)', 'rgba(120, 140, 220, 0)');
      ctx.beginPath();
      ctx.arc(b.x, b.y - 4, 46, 0, Math.PI * 2);
      ctx.fill();
      const sway = Math.sin(time * 1.4 + b.x * 0.05) * 4;
      ctx.strokeStyle = 'rgba(150, 160, 200, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 4);
      ctx.quadraticCurveTo(b.x + sway, b.y - 18, b.x - sway * 0.5, b.y - 30);
      ctx.stroke();
      // A dim ember of hope inside the bowl.
      ctx.fillStyle = 'rgba(255, 120, 40, 0.25)';
      ctx.beginPath();
      ctx.arc(b.x, b.y - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Kindling progress ring while the ember stands close.
      if (b.channel > 0) {
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y - 6, 26, -Math.PI / 2, -Math.PI / 2 + b.channel * Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 179, 71, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y - 6, 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawFirefly(f, time) {
    if (f.taken) return;
    const pulse = 0.55 + 0.45 * Math.sin(time * 3 + f.phase * 2);
    ctx.fillStyle = radial(f.x, f.y, 14, `rgba(255, 233, 168, ${0.5 * pulse})`, 'rgba(255, 233, 168, 0)');
    ctx.beginPath();
    ctx.arc(f.x, f.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffedb0';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWisp(w, time) {
    const wob = Math.sin(time * 3 + w.phase) * 2;
    // A violet halo so the shadow reads as a threat, not a void.
    ctx.fillStyle = radial(w.x, w.y + wob, 48, 'rgba(150, 130, 235, 0.50)', 'rgba(150, 130, 235, 0)');
    ctx.beginPath();
    ctx.arc(w.x, w.y + wob, 48, 0, Math.PI * 2);
    ctx.fill();
    const grad = radial(w.x, w.y + wob, 26, 'rgba(42, 38, 80, 0.95)', 'rgba(42, 38, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(w.x, w.y + wob, 26, 0, Math.PI * 2);
    ctx.fill();
    // Two pale eyes in the smoke.
    ctx.fillStyle = '#f2f5ff';
    ctx.beginPath();
    ctx.arc(w.x - 5, w.y + wob - 2, 3.2, 0, Math.PI * 2);
    ctx.arc(w.x + 5, w.y + wob - 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1430';
    ctx.beginPath();
    ctx.arc(w.x - 5, w.y + wob - 2, 1.3, 0, Math.PI * 2);
    ctx.arc(w.x + 5, w.y + wob - 2, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEmber(world, time) {
    const e = world.ember;
    const flick = world.flicker > 0 ? 0.55 + 0.45 * Math.sin(time * 40) : 1;
    const flameGlow = 0.5 + (world.flame / EMBER.flameMax) * 0.5;
    // Outer glow.
    ctx.globalAlpha = flick;
    ctx.fillStyle = radial(e.x, e.y, 64 * flameGlow + 20, 'rgba(255, 150, 50, 0.35)', 'rgba(255, 150, 50, 0)');
    ctx.beginPath();
    ctx.arc(e.x, e.y, 64 * flameGlow + 20, 0, Math.PI * 2);
    ctx.fill();
    // Core.
    const core = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, EMBER.radius + 4);
    core.addColorStop(0, '#fff6d8');
    core.addColorStop(0.45, '#ffd27a');
    core.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(e.x, e.y, EMBER.radius + 2 * Math.sin(time * 6) * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function punchHole(x, y, r, strength) {
    const g = dctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    g.addColorStop(0.6, `rgba(0, 0, 0, ${strength * 0.7})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dctx.fillStyle = g;
    dctx.beginPath();
    dctx.arc(x, y, r, 0, Math.PI * 2);
    dctx.fill();
  }

  function drawDarkness(world) {
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, WORLD.width, WORLD.height);
    dctx.fillStyle = 'rgba(3, 5, 14, 0.80)';
    dctx.fillRect(0, 0, WORLD.width, WORLD.height);
    dctx.globalCompositeOperation = 'destination-out';
    const e = world.ember;
    punchHole(e.x, e.y, LIGHT.emberRadius, 1);
    for (const b of world.braziers) {
      if (b.lit) punchHole(b.x, b.y - 8, BRAZIER.glowRadius, 0.95);
    }
    for (const f of world.fireflies) {
      if (!f.taken) punchHole(f.x, f.y, LIGHT.fireflyRadius, 0.8);
    }
    ctx.drawImage(dark, 0, 0);
    // Vignette to hold the frame together.
    const v = ctx.createRadialGradient(
      WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.42,
      WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.85,
    );
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  function drawBanner(text, sub, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '600 34px Georgia, serif';
    ctx.fillText(text, WORLD.width / 2, 118);
    ctx.fillStyle = 'rgba(205, 215, 255, 0.85)';
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText(sub, WORLD.width / 2, 146);
    ctx.globalAlpha = 1;
  }

  return {
    draw(world, phase, banner) {
      const time = world.time;
      ctx.save();
      if (world.shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
      }
      drawBackground(time);
      drawPillars(world);
      for (const b of world.braziers) drawBrazier(b, time);
      for (const f of world.fireflies) drawFirefly(f, time);
      drawParticles(world);
      if (phase !== 'title') drawEmber(world, time);
      drawDarkness(world);
      // Wisps are drawn after the darkness: they are creatures of the
      // dark, and their violet halo and pale eyes must stay visible so
      // the player can read the threat.
      for (const w of world.wisps) drawWisp(w, time);
      if (phase === 'title') drawEmber(world, time);
      if (banner) drawBanner(banner.text, banner.sub, banner.alpha);
      ctx.restore();
    },
  };
}
