// Langit Biru — Island Hopper: deterministic screenshot staging. A tiny
// autopilot flies the plane towards a target point, and each shot preset
// places the plane, runs the autopilot for a fixed number of 1/60 s steps
// and leaves one frozen frame for the screenshot. Same seed, same frame.
import { CONFIG, RINGS, RUNWAY } from './config.js';
import { resetFlight } from './physics.js';

const DEG = Math.PI / 180;

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Steer towards (tx, tz) at altitude ty: bank by heading error, pitch by
// height error, and slow down for a tight turn or a close target, so the
// plane can actually thread a ring instead of circling past it.
// Returns { pitch, bank, throttle } in -1..1 / 0..1.
export function autopilot(flight, tx, ty, tz, throttle) {
  const targetHeading = Math.atan2(tx - flight.x, tz - flight.z);
  const headingErr = wrapAngle(targetHeading - flight.heading);
  const bank = Math.max(-1, Math.min(1, headingErr * 2.0));
  const altErr = ty - flight.y;
  const pitch = Math.max(-1, Math.min(1, altErr * 0.03 + 0.05));
  const dist = Math.hypot(tx - flight.x, tz - flight.z);
  let thr = throttle;
  if (Math.abs(headingErr) > 1.0) thr = Math.min(thr, 0.4);
  if (dist < 350) thr = Math.min(thr, 0.55);
  return { pitch, bank, throttle: thr };
}

function flyToRing(flight, index) {
  const ring = RINGS[index];
  return autopilot(flight, ring.x, ring.y, ring.z, 0.78);
}

// Final approach: chase a carrot 320 m ahead on the extended centreline,
// so the path converges onto the strip instead of crossing it diagonally;
// on a gentle slope that ends at touchdown height. If the plane overshoots
// the far end, the carrot jumps back west for a go-around.
export function approachRunway(flight) {
  const thresholdX = RUNWAY.cx - RUNWAY.length / 2;
  const farX = RUNWAY.cx + RUNWAY.length / 2;
  const distThr = Math.hypot(thresholdX - flight.x, RUNWAY.cz - flight.z);
  const overshot = flight.x > farX + 80;
  const aimX = overshot ? thresholdX - 200 : flight.x + 240;
  // Glide slope keyed on signed distance west of the threshold: it falls
  // towards touchdown height and stays there past the numbers, instead of
  // rising again once the threshold is behind the plane.
  const distWest = thresholdX - flight.x;
  let targetAlt = RUNWAY.height + (distWest > 0
    ? Math.max(2, Math.min(120, distWest * 0.055))
    : 2);
  // Stay high until lined up with the centreline: descending while still
  // offset puts the plane into the apron beside the strip.
  if (Math.abs(flight.z - RUNWAY.cz) > 25) {
    targetAlt = Math.max(targetAlt, 58);
  }
  const stick = autopilot(flight, aimX, targetAlt, RUNWAY.cz, 0.35);
  stick.pitch = Math.max(-0.2, Math.min(0.2, stick.pitch));
  if (distThr < 500) stick.throttle = 0.22;
  // Flare: once past the numbers, lined up and low, push the nose down
  // gently — the slope target alone leaves the plane floating 2 m up.
  const pastThreshold = flight.x > thresholdX;
  const linedUp = Math.abs(flight.z - RUNWAY.cz) < 25;
  if (pastThreshold && linedUp && flight.y < 50) {
    stick.pitch = -0.18;
    stick.throttle = 0.2;
  }
  return stick;
}

// Shot presets. Each returns { steps, steer } where steer(flight) gives the
// stick for a step. The caller runs `steps` fixed steps, then renders once.
export function shotPreset(name, flight) {
  if (name === 'start') {
    // Menu over the live scene: plane parked at the start line, nose slowly
    // sweeping across the archipelago.
    flight.state = 'menu';
    flight.heading = 35 * DEG;
    return { steps: 0, steer: null };
  }
  if (name === 'play') {
    resetFlight(flight);
    flight.throttle = 0.8;
    return {
      steps: 300,
      steer: (f) => {
        const next = f.rings.find((r) => !r.taken) || RINGS[0];
        return autopilot(f, next.x, next.y, next.z, 0.8);
      },
    };
  }
  if (name === 'rings') {
    // Mid-course: three rings banked, diving on ring 4 past Pulau Elang.
    resetFlight(flight);
    flight.x = 800; flight.z = -900; flight.y = 175;
    flight.heading = Math.atan2(1100 - 800, -600 + 900);
    flight.speed = 62; flight.throttle = 0.78; flight.fuel = 88;
    flight.score = 3 * CONFIG.ringScore;
    flight.ringsTaken = 3;
    flight.rings[0].taken = true;
    flight.rings[1].taken = true;
    flight.rings[2].taken = true;
    return { steps: 150, steer: (f) => flyToRing(f, 3) };
  }
  if (name === 'landing') {
    // Final approach: just past ring 8 and nearly on the slope, so the
    // strip reads ahead with sky and sea around it and the plane is level,
    // not diving at -14 m/s.
    resetFlight(flight);
    flight.x = -350; flight.z = 650; flight.y = 70;
    flight.heading = RUNWAY.headingDeg * DEG;
    flight.speed = 48; flight.throttle = 0.42; flight.fuel = 41;
    flight.score = 8 * CONFIG.ringScore;
    flight.ringsTaken = 8;
    for (const r of flight.rings) r.taken = true;
    return {
      steps: 60,
      steer: (f) => autopilot(f, RUNWAY.cx, RUNWAY.height + 18, RUNWAY.cz, 0.42),
    };
  }
  return { steps: 0, steer: null };
}
