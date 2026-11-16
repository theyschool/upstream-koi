// The screenshot scenes behind ?shot=start|play|reach|victory. Each one plays
// the real rules forward from a fresh world, steered by a simple autopilot
// that swims toward the nearest pearl above it and veers away from anything
// dangerous, so the frame is what a real game looks like and the same seed
// always gives the same frame.
import { FIELD, STEP } from './config.js';
import {
  EVENT_OVER, EVENT_REACH, EVENT_VICTORY, KIND_EEL, KIND_NET,
  KIND_PEARL, KIND_ROCK, KIND_SCALE, KIND_WHIRL,
} from './world.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_REACH, SCREEN_TITLE, SCREEN_VICTORY,
} from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const LIMIT_SECONDS = 600;

/** A steering vector toward (tx, ty), with hazards pushing it away. */
function autopilot(state) {
  const koi = state.koi;
  let tx = FIELD.width / 2;
  let ty = koi.y - 260;
  let bestD = Infinity;
  for (const e of state.entities) {
    if (!e.active) continue;
    if (e.kind !== KIND_PEARL && e.kind !== KIND_SCALE) continue;
    if (e.y > koi.y + 40) continue;
    const d = Math.hypot(e.x - koi.x, e.y - koi.y);
    if (d < bestD) { bestD = d; tx = e.x; ty = e.y; }
  }
  let sx = tx - koi.x;
  let sy = ty - koi.y;
  // Flee anything close: rocks, nets, eels, whirlpools and heron warnings.
  // Whirlpools pull the koi in, so they get the widest berth of all.
  let dangerClose = false;
  let escape = false;
  for (const e of state.entities) {
    if (!e.active) continue;
    if (e.kind !== KIND_ROCK && e.kind !== KIND_NET && e.kind !== KIND_EEL && e.kind !== KIND_WHIRL) continue;
    const dx = koi.x - e.x;
    const dy = koi.y - e.y;
    const d = Math.hypot(dx, dy);
    const radius = e.kind === KIND_WHIRL ? 210 : e.kind === KIND_NET ? 170 : 150;
    if (d < radius && d > 1) {
      const push = (radius - d) * 3;
      sx += (dx / d) * push;
      sy += (dy / d) * push;
      if (d < radius * 0.5) dangerClose = true;
      if (d < 150) escape = true;
    }
  }
  for (const s of state.strikes) {
    if (!s.active) continue;
    const dx = koi.x - s.x;
    if (Math.abs(dx) < 90) sx += (dx >= 0 ? 1 : -1) * 220;
  }
  const len = Math.hypot(sx, sy) || 1;
  // Close to a hazard, survival beats pearls and the dash is for escape.
  if (dangerClose) return { steer: { x: sx / len, y: sy / len }, dash: true };
  const dash = escape || (bestD > 320 && Math.abs(sy) > 200);
  return { steer: { x: sx / len, y: sy / len }, dash };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any name other than play, reach or victory is
 * the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'reach' && name !== 'victory') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      const pilot = autopilot(world.state);
      world.step(STEP, pilot.steer, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const wantVictory = name === 'victory';
  const wantReach = name === 'reach';
  const limit = name === 'play' ? PLAY_SECONDS : LIMIT_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    const pilot = autopilot(world.state);
    const events = world.step(STEP, pilot.steer, pilot.dash, false);
    if (events & EVENT_OVER) break;
    if (wantReach && (events & EVENT_REACH)) {
      return { screen: SCREEN_REACH, best: world.state.score };
    }
    if (wantVictory && (events & EVENT_REACH)) {
      // A reach is done but the journey is not: start the next one and
      // keep swimming, exactly as the game itself does on Enter.
      world.nextReach();
      continue;
    }
    if (wantVictory && (events & EVENT_VICTORY)) {
      return { screen: SCREEN_VICTORY, best: world.state.score };
    }
    if (!wantVictory && !wantReach && (events & (EVENT_REACH | EVENT_VICTORY))) break;
  }
  const over = world.state.hearts === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
