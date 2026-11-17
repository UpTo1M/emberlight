// Emberlight — every sound is synthesized live with WebAudio. No audio
// files, no network. A quiet drone and fire crackle run under the game;
// short tones mark lighting, catching, being hit, and clearing a level.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let droneNodes = null;
  let crackleTimer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      startDrone();
      startCrackle();
      return true;
    } catch {
      return false;
    }
  }

  function startDrone() {
    // Two detuned low sines, barely there — the hum of the dark.
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(master);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.6;
    o1.connect(gain);
    o2.connect(gain);
    o1.start();
    o2.start();
    droneNodes = { gain, o1, o2 };
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function startCrackle() {
    // A soft random pop every now and then, like a distant fire.
    crackleTimer = window.setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      if (Math.random() > 0.45) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400 + Math.random() * 1800;
      filter.Q.value = 2;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.05 + Math.random() * 0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(t + 0.07);
    }, 320);
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function thud() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + 0.26);
    tone(90, 0.3, 'sine', 0.4, 0, 45);
  }

  return {
    // Call from the first user gesture so the browser allows sound.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    // A brazier catches: a warm rising chime.
    ignite() {
      tone(523.25, 0.18, 'triangle', 0.22);
      tone(659.25, 0.18, 'triangle', 0.2, 0.07);
      tone(783.99, 0.32, 'triangle', 0.2, 0.14);
    },
    // A firefly is caught: a bright blip.
    pickup() {
      tone(880, 0.12, 'sine', 0.16, 0, 1318.5);
    },
    // A wisp touches the ember: a cold thud.
    hit() {
      thud();
      tone(220, 0.35, 'sawtooth', 0.08, 0, 110);
    },
    // A level is cleared: a warm chord.
    levelClear() {
      tone(261.63, 0.7, 'triangle', 0.18);
      tone(329.63, 0.7, 'triangle', 0.16, 0.05);
      tone(392.0, 0.9, 'triangle', 0.16, 0.1);
    },
    // The flame dies: a slow fall.
    gameOver() {
      tone(392.0, 0.5, 'triangle', 0.18, 0, 196);
      tone(311.13, 0.7, 'triangle', 0.16, 0.35, 155.56);
    },
    // All eight levels are done: a rising dawn.
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, 'triangle', 0.18, i * 0.12));
    },
    destroy() {
      if (crackleTimer) window.clearInterval(crackleTimer);
      if (droneNodes) {
        try { droneNodes.o1.stop(); droneNodes.o2.stop(); } catch { /* already stopped */ }
      }
      if (ctx) ctx.close();
      ctx = null;
    },
  };
}
