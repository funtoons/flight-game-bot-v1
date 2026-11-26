// Langit Biru — Island Hopper: the flight model. An arcade model with real
// trade-offs: throttle sets speed, bank turns the plane, pitch trades speed
// for height, slow flight sinks, and fuel always runs down.
import { CONFIG, START } from './config.js';
import { groundHeight, onRunway, freshRings } from './world.js';

const DEG = Math.PI / 180;

export function newFlight() {
  return {
    state: 'menu', // menu | flying | landed | crashed
    x: START.x, z: START.z, y: START.y,
    heading: START.headingDeg * DEG,
    pitch: 0, bank: 0,
    speed: START.speed,
    throttle: START.throttle,
    fuel: 100, damage: 0,
    vs: 0, // vertical speed, m/s
    score: 0, ringsTaken: 0, time: 0,
    rings: freshRings(),
    message: '', messageUntil: 0,
    endReason: '',
    // Smoothed control inputs, -1..1.
    pitchIn: 0, bankIn: 0,
  };
}

export function resetFlight(f) {
  const fresh = newFlight();
  Object.assign(f, fresh, { state: 'flying' });
}

// One fixed step (dt seconds). input: { pitch, bank, throttle, brake } with
// pitch/bank in -1..1 and throttle 0..1 (or null to hold the current value).
export function stepFlight(f, input, dt) {
  if (f.state !== 'flying') return;
  f.time += dt;

  // Throttle: fuel feeds the engine; an empty tank means a glide.
  if (f.fuel <= 0) {
    f.throttle = 0;
  } else if (input.throttle !== null && input.throttle !== undefined) {
    f.throttle = input.throttle;
  }
  f.fuel = Math.max(0, f.fuel - dt * CONFIG.fuelDrain * (0.3 + 0.7 * f.throttle));

  // Speed chases the throttle target.
  const target = CONFIG.minSpeed + f.throttle * (CONFIG.maxSpeed - CONFIG.minSpeed);
  const rate = CONFIG.accel * dt;
  f.speed += Math.max(-rate, Math.min(rate, target - f.speed));

  // Controls ease towards the stick, slower when stalled.
  const stalled = f.speed < CONFIG.stallSpeed;
  const authority = stalled ? 0.4 : 1;
  const ease = 1 - Math.exp(-dt * 4 * authority);
  f.pitchIn += (input.pitch - f.pitchIn) * ease;
  f.bankIn += (input.bank - f.bankIn) * ease;
  f.pitch = f.pitchIn * CONFIG.maxPitchDeg * DEG;
  f.bank = f.bankIn * CONFIG.maxBankDeg * DEG;

  // Bank turns the plane; pitch sets the climb. Slow flight sinks.
  const turn = (9.81 * Math.tan(f.bank)) / Math.max(f.speed, 20);
  f.heading += turn * dt * 1.25;
  let vs = f.speed * Math.sin(f.pitch);
  if (stalled) vs -= (CONFIG.stallSpeed - f.speed) * 0.35;
  vs = Math.max(-14, Math.min(13, vs));
  f.vs = vs;
  f.y += vs * dt;
  f.x += Math.sin(f.heading) * f.speed * Math.cos(f.pitch) * dt;
  f.z += Math.cos(f.heading) * f.speed * Math.cos(f.pitch) * dt;

  // Rings: fly close to a centre to take it.
  for (const ring of f.rings) {
    if (ring.taken) continue;
    const dx = f.x - ring.x;
    const dy = f.y - ring.y;
    const dz = f.z - ring.z;
    if (dx * dx + dy * dy + dz * dz < CONFIG.ringRadius * CONFIG.ringRadius) {
      ring.taken = true;
      f.ringsTaken += 1;
      f.score += CONFIG.ringScore;
      f.message = `RING ${f.ringsTaken} / ${CONFIG.ringCount}  +${CONFIG.ringScore}`;
      f.messageUntil = f.time + 2.2;
    }
  }

  // Ground and water.
  const gh = groundHeight(f.x, f.z);
  if (f.y <= gh + 1.5) {
    f.y = gh + 1.5;
    const aligned = Math.abs(wrapAngle(f.heading - (90 * DEG))) < 30 * DEG;
    const gentle = f.vs > -5 && f.speed >= 22 && f.speed <= 70;
    if (onRunway(f.x, f.z) && aligned && gentle) {
      landPlane(f);
    } else if (onRunway(f.x, f.z) && f.speed < 24 && f.vs > -3) {
      landPlane(f); // rolled out slow on the strip: still a landing
    } else {
      crashPlane(f, gh <= 0.5 ? 'Ditched in the sea' : 'Hit the terrain');
    }
  }
  if (f.y < 2 && gh <= 0.5) {
    crashPlane(f, 'Ditched in the sea');
  }
}

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function landPlane(f) {
  f.state = 'landed';
  const fuelBonus = Math.round(f.fuel * 2);
  const timeBonus = Math.max(0, Math.round(240 - f.time) * 2);
  const ringBonus = f.ringsTaken * CONFIG.ringScore;
  f.score = ringBonus + CONFIG.landingScore + fuelBonus + timeBonus;
  f.endReason =
    f.ringsTaken === CONFIG.ringCount
      ? 'PERFECT RUN — all rings, clean landing'
      : `Landed with ${f.ringsTaken}/${CONFIG.ringCount} rings`;
}

function crashPlane(f, reason) {
  f.state = 'crashed';
  f.damage = 100;
  f.endReason = reason;
}

// Heading in degrees, 0 = north, 90 = east, compass style.
export function headingDeg(f) {
  return ((f.heading / DEG) % 360 + 360) % 360;
}
