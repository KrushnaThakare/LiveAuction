/**
 * Lightweight Web Audio cues for overlay cinematics (no external assets).
 * Uses a shared AudioContext resumed on first user gesture when possible.
 */

let sharedCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function tone({ freq = 80, duration = 0.35, type = 'sine', gain = 0.22, attack = 0.01, decay = 0.3 }) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function noiseBurst({ duration = 0.18, gain = 0.08 }) {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.buffer = buffer;
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
}

export function playBassHit() {
  tone({ freq: 52, type: 'sine', gain: 0.35, attack: 0.008, decay: 0.45, duration: 0.5 });
  tone({ freq: 104, type: 'triangle', gain: 0.12, attack: 0.01, decay: 0.25, duration: 0.3 });
  noiseBurst({ duration: 0.12, gain: 0.05 });
}

export function playCountdownPulse() {
  tone({ freq: 140, type: 'square', gain: 0.1, attack: 0.005, decay: 0.12, duration: 0.15 });
  playBassHit();
}

export function playCelebration() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.08, 0.16, 0.28].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 + i * 55, now + offset);
    g.gain.setValueAtTime(0.0001, now + offset);
    g.gain.exponentialRampToValueAtTime(0.06, now + offset + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.4);
  });
  noiseBurst({ duration: 0.55, gain: 0.12 });
}

export function playGoExplosion() {
  playCelebration();
  tone({ freq: 72, type: 'sine', gain: 0.4, attack: 0.01, decay: 0.7, duration: 0.8 });
}

export function playCountdownAmbience() {
  tone({ freq: 196, type: 'sine', gain: 0.04, attack: 0.4, decay: 2.5, duration: 2.6 });
}
