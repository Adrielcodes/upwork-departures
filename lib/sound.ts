"use client";

/**
 * Synthesized split-flap clatter. No audio files — each "clack" is a few
 * milliseconds of filtered noise. Off by default; the visitor opts in.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;
let lastClack = 0;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn() {
  return enabled;
}

export function setSound(on: boolean) {
  enabled = on;
  if (on && !ctx) {
    ctx = new AudioContext();
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  if (on) void ctx?.resume();
  try {
    localStorage.setItem("departures:sound", on ? "1" : "0");
  } catch {
    // storage blocked — preference just won't persist
  }
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clack() {
  if (!enabled || !ctx || !noise) return;
  const now = ctx.currentTime;
  // Hundreds of flaps move at once; cap it to a believable rattle
  if (now - lastClack < 0.022) return;
  lastClack = now;

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.5;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1800 + Math.random() * 1400;
  band.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.value = 0.18 + Math.random() * 0.1;

  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(now);
}
