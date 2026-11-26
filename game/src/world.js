// Langit Biru — Island Hopper: the world. Pulau Merpati archipelago terrain,
// the runway, the ring course and the clouds, all placed by hand (no copied
// map, no real place). groundHeight is the single source of truth for terrain
// collisions, the renderer and the landing check.
import { CONFIG, RINGS, RUNWAY, mulberry32 } from './config.js';

// Islands: centre, radii, peak height. Merpati holds the runway; the others
// are landmarks the pilot steers by (Kakatua's twin peaks, Elang's cone).
export const ISLANDS = [
  { name: 'Pulau Merpati', cx: 0, cz: 0, rx: 950, rz: 800, peak: 150, hue: 96 },
  { name: 'Pulau Kakatua', cx: -1350, cz: -750, rx: 520, rz: 430, peak: 110, hue: 105 },
  { name: 'Pulau Elang', cx: 1350, cz: -850, rx: 480, rz: 420, peak: 140, hue: 88 },
  { name: 'Nusa Kecil', cx: -900, cz: 1100, rx: 320, rz: 280, peak: 60, hue: 110 },
  { name: 'Karang Biru', cx: 1100, cz: 1050, rx: 260, rz: 240, peak: 45, hue: 100 },
  { name: 'Batu Apung', cx: 150, cz: -1650, rx: 200, rz: 170, peak: 35, hue: 112 },
];

function smoothstep(a, b, t) {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

// Height of the land at (x, z); 0 is open sea. Islands rise as smooth domes
// and the ground around the runway is graded flat to the strip's height.
export function groundHeight(x, z) {
  let h = 0;
  for (const isle of ISLANDS) {
    const dx = (x - isle.cx) / isle.rx;
    const dz = (z - isle.cz) / isle.rz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1) {
      const dome = Math.pow(Math.cos((d * Math.PI) / 2), 1.4);
      h = Math.max(h, isle.peak * dome);
    }
  }
  // Grade the runway apron flat: full flat within 180 m of the strip centre,
  // blending back to the natural dome by 420 m out.
  const rdx = x - RUNWAY.cx;
  const rdz = z - RUNWAY.cz;
  const rd = Math.sqrt(rdx * rdx + rdz * rdz);
  if (rd < 420) {
    const flat = 1 - smoothstep(180, 420, rd);
    h = h * (1 - flat) + RUNWAY.height * flat;
  }
  return h;
}

// True when (x, z) is on the paved strip itself.
export function onRunway(x, z) {
  const halfL = RUNWAY.length / 2;
  const halfW = RUNWAY.width / 2;
  return (
    Math.abs(x - RUNWAY.cx) <= halfL &&
    Math.abs(z - RUNWAY.cz) <= halfW
  );
}

// Ring course, in order, with a taken flag the flight state owns.
export function freshRings() {
  return RINGS.map((r) => ({ ...r, taken: false }));
}

// Clouds: fixed, seeded positions so every run paints the same sky.
export function makeClouds(seed) {
  const rand = mulberry32(seed);
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 900 + rand() * 2600;
    clouds.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      y: 260 + rand() * 160,
      r: 90 + rand() * 130,
      puffs: 3 + Math.floor(rand() * 3),
    });
  }
  return clouds;
}

// Palm clusters on the islands, seeded, for the renderer to dot the grass.
export function makePalms(seed) {
  const rand = mulberry32(seed + 77);
  const palms = [];
  for (const isle of ISLANDS) {
    const count = Math.floor(isle.rx / 90);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const d = 0.35 + rand() * 0.55;
      const x = isle.cx + Math.cos(angle) * isle.rx * d;
      const z = isle.cz + Math.sin(angle) * isle.rz * d;
      if (onRunway(x, z)) continue;
      palms.push({ x, z, s: 0.7 + rand() * 0.7 });
    }
  }
  return palms;
}

export { CONFIG };
