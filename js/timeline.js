import { PHASES, CUTS, CUT_COST, CAMERA } from './sequence-config.js';

const cuts = new Set(CUTS);
const totalWeight = PHASES.reduce((s, p) => s + p.weight, 0);

// Biaya kumulatif per langkah frame di tiap fase, untuk pemetaan non-linear.
const phases = PHASES.map((p) => {
  const costs = [0];
  for (let i = p.from; i < p.to; i++) costs.push(costs.at(-1) + (cuts.has(i) ? CUT_COST : 1));
  return { ...p, costs, total: costs.at(-1) };
});

let acc = 0;
for (const p of phases) {
  p.start = acc / totalWeight;
  acc += p.weight;
  p.end = acc / totalWeight;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Progress scroll (0–1) → { frame (float), phase } */
export function progressToFrame(progress) {
  const pr = clamp(progress);
  const p = phases.find((ph) => pr <= ph.end) ?? phases.at(-1);
  if (p.total === 0) return { frame: p.from, phase: p.id };
  const target = ((pr - p.start) / (p.end - p.start)) * p.total;
  let s = 0;
  while (s < p.costs.length - 2 && p.costs[s + 1] < target) s++;
  const frac = clamp((target - p.costs[s]) / (p.costs[s + 1] - p.costs[s]));
  return { frame: p.from + s + frac, phase: p.id };
}

/** Indeks frame → progress scroll (untuk navigasi). */
export function frameToProgress(frame) {
  const p = phases.find((ph) => ph.total > 0 && frame >= ph.from && frame <= ph.to);
  if (!p) return 0;
  const target = p.costs[Math.round(frame) - p.from];
  return p.start + (target / p.total) * (p.end - p.start);
}

/** Zoom kamera untuk frame (float). */
export function cameraAt(frame) {
  for (let i = 0; i < CAMERA.length - 1; i++) {
    const [f0, z0] = CAMERA[i];
    const [f1, z1] = CAMERA[i + 1];
    if (frame <= f1) {
      const t = clamp((frame - f0) / (f1 - f0));
      const e = t * t * (3 - 2 * t);
      return z0 + (z1 - z0) * e;
    }
  }
  return CAMERA.at(-1)[1];
}

/** Opasitas elemen dari rentang "in0,in1,out0,out1" berdasarkan frame. */
export function rangeOpacity(frame, [a, b, c, d]) {
  if (frame < a || frame > d) return 0;
  if (frame < b) return (frame - a) / (b - a);
  if (frame > c) return 1 - (frame - c) / (d - c);
  return 1;
}
