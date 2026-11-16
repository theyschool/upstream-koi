// The river's rules and state, with no drawing and no browser in it: the
// koi, the pearls and hazards it meets, the current that pushes it back,
// the three reaches, the combo, the score and the hearts. step() advances
// one fixed step and returns what happened as bit flags, so the caller can
// react (sound, announcements, screen changes) without the world knowing
// about screens or sound.

import {
  BUBBLE, COMBO_WINDOW, EEL, FIELD, HEARTS, HERON, KOI, LOTUS, NET,
  PEARL, POOL_SIZE, REACHES, ROCK, SCALE, WHIRL,
} from './config.js';

export const KIND_PEARL = 0;
export const KIND_SCALE = 1;
export const KIND_LOTUS = 2;
export const KIND_BUBBLE = 3;
export const KIND_ROCK = 4;
export const KIND_NET = 5;
export const KIND_EEL = 6;
export const KIND_WHIRL = 7;

export const EVENT_HIT = 1;
export const EVENT_PEARL = 2;
export const EVENT_OVER = 4;
export const EVENT_REACH = 8;
export const EVENT_VICTORY = 16;
export const EVENT_SCALE = 32;
export const EVENT_LOTUS = 64;
export const EVENT_DASH = 128;
export const EVENT_BUBBLE = 256;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random) {
  const koi = {
    x: FIELD.width / 2, y: FIELD.height * 0.72, vx: 0, vy: 0,
    angle: -Math.PI / 2, tail: 0, dashX: 0, dashY: -1,
    dashTime: 0, dashCooldown: 0, invulnerable: 0,
  };
  const entities = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    entities.push({ active: false, kind: KIND_PEARL, x: 0, y: 0, vx: 0, vy: 0, radius: 10, phase: 0, seed: 0 });
  }
  const particles = [];
  for (let i = 0; i < 64; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#ffffff' });
  }
  const floaters = [];
  for (let i = 0; i < 12; i += 1) {
    floaters.push({ active: false, x: 0, y: 0, text: '', life: 0 });
  }
  const strikes = [];
  for (let i = 0; i < 4; i += 1) {
    strikes.push({ active: false, x: 0, y: 0, phase: 'warn', timer: 0 });
  }

  const state = {
    koi, entities, particles, floaters, strikes,
    score: 0, pearls: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    hearts: HEARTS, reachIndex: 0, progress: 0, elapsed: 0,
    reachDone: false, shake: 0,
    timers: { pearl: 0, scale: 0, lotus: 0, bubble: 0, rock: 0, net: 0, eel: 0, heron: 0, whirl: 0 },
  };

  function reach() {
    return REACHES[state.reachIndex];
  }

  function resetTimers() {
    const t = state.timers;
    t.pearl = 0.4; t.scale = SCALE.interval; t.lotus = LOTUS.interval;
    t.bubble = BUBBLE.interval; t.rock = ROCK.interval; t.net = NET.interval;
    t.eel = EEL.interval; t.heron = HERON.interval; t.whirl = WHIRL.interval;
  }

  function reset() {
    koi.x = FIELD.width / 2;
    koi.y = FIELD.height * 0.72;
    koi.vx = 0; koi.vy = 0;
    koi.angle = -Math.PI / 2; koi.tail = 0;
    koi.dashTime = 0; koi.dashCooldown = 0; koi.invulnerable = 0;
    for (const e of entities) e.active = false;
    for (const p of particles) p.active = false;
    for (const f of floaters) f.active = false;
    for (const s of strikes) s.active = false;
    state.score = 0; state.pearls = 0; state.combo = 0; state.comboTimer = 0;
    state.bestCombo = 0; state.hearts = HEARTS; state.reachIndex = 0;
    state.progress = 0; state.elapsed = 0; state.reachDone = false; state.shake = 0;
    resetTimers();
  }

  function nextReach() {
    state.reachIndex += 1;
    state.progress = 0;
    state.reachDone = false;
    for (const e of entities) e.active = false;
    for (const s of strikes) s.active = false;
    koi.x = FIELD.width / 2;
    koi.y = FIELD.height * 0.72;
    koi.vx = 0; koi.vy = 0;
    koi.invulnerable = 1;
    resetTimers();
  }

  function freeEntity() {
    for (const e of entities) if (!e.active) return e;
    return null;
  }

  function freeParticle() {
    for (const p of particles) if (!p.active) return p;
    return particles[0];
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = freeParticle();
      const a = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 30;
      p.life = p.max = 0.5 + random() * 0.4;
      p.size = 2 + random() * 3;
      p.color = color;
    }
  }

  function floater(x, y, text) {
    for (const f of floaters) {
      if (f.active) continue;
      f.active = true; f.x = x; f.y = y; f.text = text; f.life = 0.9;
      return;
    }
  }

  function spawnPearlArc() {
    const cx = 120 + random() * (FIELD.width - 240);
    const cy = -20;
    for (let i = 0; i < PEARL.arc; i += 1) {
      const e = freeEntity();
      if (!e) return;
      e.active = true; e.kind = KIND_PEARL;
      e.x = cx + (i - (PEARL.arc - 1) / 2) * 46;
      e.y = cy - Math.abs(i - (PEARL.arc - 1) / 2) * -18 - i * 8;
      e.vx = 0; e.vy = 0; e.radius = PEARL.radius;
      e.phase = random() * Math.PI * 2; e.seed = random();
    }
  }

  function spawnOne(kind, radius, y) {
    const e = freeEntity();
    if (!e) return;
    e.active = true; e.kind = kind;
    e.x = 80 + random() * (FIELD.width - 160);
    e.y = y ?? -30;
    e.vx = 0; e.vy = 0; e.radius = radius;
    e.phase = random() * Math.PI * 2; e.seed = random();
  }

  function spawnRock() {
    spawnOne(KIND_ROCK, ROCK.minRadius + random() * (ROCK.maxRadius - ROCK.minRadius), -50);
  }

  function spawnNet() {
    const e = freeEntity();
    if (!e) return;
    e.active = true; e.kind = KIND_NET;
    e.x = 100 + random() * (FIELD.width - 200 - NET.width);
    e.y = -NET.height; e.vx = 0; e.vy = 0;
    e.radius = NET.width / 2; e.phase = 0; e.seed = random();
  }

  function spawnEel() {
    const e = freeEntity();
    if (!e) return;
    const fromLeft = random() < 0.5;
    e.active = true; e.kind = KIND_EEL;
    e.x = fromLeft ? -40 : FIELD.width + 40;
    e.y = 140 + random() * (FIELD.height - 280);
    e.vx = (fromLeft ? 1 : -1) * EEL.speed;
    e.vy = 0; e.radius = EEL.radius; e.phase = random() * Math.PI * 2; e.seed = random();
  }

  function spawnWhirl() {
    spawnOne(KIND_WHIRL, WHIRL.radius, 120 + random() * 300);
  }

  function hurt() {
    if (koi.invulnerable > 0) return 0;
    state.hearts -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    koi.invulnerable = KOI.invulnerable;
    koi.vy += 260;
    state.shake = 0.35;
    burst(koi.x, koi.y, '#ff6b5e', 14, 180);
    if (state.hearts <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  function collect(e) {
    e.active = false;
    if (e.kind === KIND_PEARL) {
      state.combo += 1;
      state.comboTimer = COMBO_WINDOW;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const gained = PEARL.points * Math.min(state.combo, 8);
      state.score += gained;
      state.pearls += 1;
      burst(e.x, e.y, '#bff6ff', 8, 120);
      floater(e.x, e.y - 14, `+${gained}`);
      return EVENT_PEARL;
    }
    if (e.kind === KIND_SCALE) {
      state.combo += 2;
      state.comboTimer = COMBO_WINDOW;
      const gained = SCALE.points * Math.max(1, Math.min(state.combo, 8));
      state.score += gained;
      burst(e.x, e.y, '#ffd166', 12, 160);
      floater(e.x, e.y - 14, `Golden scale +${gained}`);
      return EVENT_SCALE;
    }
    if (e.kind === KIND_LOTUS) {
      state.hearts = Math.min(HEARTS, state.hearts + 1);
      state.score += LOTUS.points;
      burst(e.x, e.y, '#ff8fb1', 12, 140);
      floater(e.x, e.y - 14, `Lotus +1 heart`);
      return EVENT_LOTUS;
    }
    state.score += BUBBLE.points;
    koi.dashCooldown = 0;
    burst(e.x, e.y, '#9fe8ff', 6, 100);
    floater(e.x, e.y - 14, 'Dash ready');
    return EVENT_BUBBLE;
  }

  /**
   * One fixed step. `steer` is a normalised {x, y} vector or null (drift).
   * With `harmless` set (the title screen's backdrop) things drift and
   * sparkle but nothing scores, nothing hurts and no reach completes.
   */
  function step(dt, steer, dashRequested, harmless) {
    let events = 0;
    state.elapsed += dt;
    const current = reach().current;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (koi.dashCooldown > 0) koi.dashCooldown = Math.max(0, koi.dashCooldown - dt);
    if (koi.invulnerable > 0) koi.invulnerable = Math.max(0, koi.invulnerable - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    if (dashRequested && koi.dashCooldown <= 0 && koi.dashTime <= 0) {
      const dx = steer ? steer.x : Math.sin(koi.angle);
      const dy = steer ? steer.y : Math.cos(koi.angle);
      const len = Math.hypot(dx, dy) || 1;
      koi.dashX = dx / len;
      koi.dashY = dy / len;
      koi.dashTime = KOI.dashTime;
      koi.dashCooldown = KOI.dashCooldown;
      koi.invulnerable = Math.max(koi.invulnerable, 0.35);
      burst(koi.x, koi.y, '#9fe8ff', 10, 140);
      events |= EVENT_DASH;
    }

    let wantX = 0;
    let wantY = current;
    if (steer) {
      wantX = steer.x * KOI.speed;
      wantY = steer.y * KOI.speed + current;
    }
    if (koi.dashTime > 0) {
      koi.dashTime -= dt;
      koi.vx = koi.dashX * KOI.dashSpeed;
      koi.vy = koi.dashY * KOI.dashSpeed;
    } else {
      const blend = Math.min(1, (KOI.accel * dt) / KOI.speed);
      koi.vx += (wantX - koi.vx) * blend;
      koi.vy += (wantY - koi.vy) * blend;
    }

    // Whirlpools drag the koi toward their middle and around it.
    for (const e of entities) {
      if (!e.active || e.kind !== KIND_WHIRL) continue;
      const d = dist(koi.x, koi.y, e.x, e.y);
      if (d < e.radius + 60 && d > 8) {
        const pull = WHIRL.pull * (1 - d / (e.radius + 60));
        koi.vx += ((e.x - koi.x) / d) * pull * dt;
        koi.vy += ((e.y - koi.y) / d) * pull * dt + 40 * dt;
      }
    }

    koi.x += koi.vx * dt;
    koi.y += koi.vy * dt;
    koi.x = Math.min(FIELD.width - 40, Math.max(40, koi.x));
    koi.y = Math.min(FIELD.height - 50, Math.max(56, koi.y));
    const speed = Math.hypot(koi.vx, koi.vy);
    if (speed > 40) koi.angle = Math.atan2(koi.vy, koi.vx);
    koi.tail += dt * (5 + speed / 55);

    if (!harmless && !state.reachDone && koi.vy < -30) {
      state.progress += -koi.vy * dt * 0.85;
      if (state.progress >= reach().distance) {
        state.progress = reach().distance;
        state.reachDone = true;
        state.score += reach().bonus;
        burst(koi.x, koi.y - 30, '#ffd166', 22, 220);
        events |= state.reachIndex >= REACHES.length - 1 ? EVENT_VICTORY : EVENT_REACH;
      }
    }

    // Spawning. Hazards wait until the koi has settled into the reach.
    const t = state.timers;
    const hazardOn = state.elapsed > 2;
    t.pearl -= dt;
    if (t.pearl <= 0) { spawnPearlArc(); t.pearl = PEARL.interval + random() * 0.5; }
    t.scale -= dt;
    if (t.scale <= 0) { spawnOne(KIND_SCALE, SCALE.radius); t.scale = SCALE.interval + random() * 3; }
    t.lotus -= dt;
    if (t.lotus <= 0) { spawnOne(KIND_LOTUS, LOTUS.radius); t.lotus = LOTUS.interval + random() * 4; }
    t.bubble -= dt;
    if (t.bubble <= 0) { spawnOne(KIND_BUBBLE, BUBBLE.radius); t.bubble = BUBBLE.interval + random() * 2; }
    if (hazardOn) {
      t.rock -= dt;
      if (t.rock <= 0) { spawnRock(); t.rock = ROCK.interval + random() * 0.7; }
      t.net -= dt;
      if (t.net <= 0 && state.reachIndex >= 1) { spawnNet(); t.net = NET.interval + random() * 2; }
      t.eel -= dt;
      if (t.eel <= 0 && state.reachIndex >= 1) { spawnEel(); t.eel = EEL.interval + random() * 2; }
      t.heron -= dt;
      if (t.heron <= 0 && state.reachIndex >= 2) {
        for (const s of strikes) {
          if (s.active) continue;
          s.active = true; s.phase = 'warn'; s.timer = HERON.warn;
          s.x = koi.x + (random() - 0.5) * 60; s.y = koi.y;
          break;
        }
        t.heron = HERON.interval + random() * 2;
      }
      t.whirl -= dt;
      if (t.whirl <= 0 && state.reachIndex >= 1) { spawnWhirl(); t.whirl = WHIRL.interval + random() * 3; }
    }

    // Heron strikes: a warning ripple, then the beak plunges.
    for (const s of strikes) {
      if (!s.active) continue;
      s.timer -= dt;
      if (s.phase === 'warn' && s.timer <= 0) {
        s.phase = 'strike'; s.timer = HERON.strike;
      } else if (s.phase === 'strike' && s.timer <= 0) {
        s.active = false;
      } else if (s.phase === 'strike' && !harmless) {
        if (Math.abs(koi.x - s.x) < 30 && koi.y > s.y - 170 && koi.y < s.y + 30) {
          events |= hurt();
          s.active = false;
          if (events & EVENT_OVER) return events;
        }
      }
    }

    for (const e of entities) {
      if (!e.active) continue;
      const drift = current * 0.9;
      if (e.kind === KIND_EEL) {
        e.x += e.vx * dt;
        e.y += Math.sin(state.elapsed * 3 + e.phase) * 40 * dt + drift * 0.4 * dt;
        if (e.x < -80 || e.x > FIELD.width + 80) e.active = false;
      } else if (e.kind === KIND_WHIRL) {
        e.y += drift * 0.55 * dt;
        e.phase += dt;
        if (e.y > FIELD.height + 90) e.active = false;
      } else if (e.kind === KIND_NET) {
        e.y += drift * 0.7 * dt;
        e.x += Math.sin(state.elapsed + e.phase) * 12 * dt;
        if (e.y > FIELD.height + 60) e.active = false;
      } else {
        e.y += (drift + 12) * dt;
        e.phase += dt * 2;
        if (e.y > FIELD.height + 40) { e.active = false; continue; }
      }
      if (harmless) continue;
      const d = dist(koi.x, koi.y, e.x, e.y);
      if (e.kind === KIND_PEARL || e.kind === KIND_SCALE || e.kind === KIND_LOTUS || e.kind === KIND_BUBBLE) {
        if (d < e.radius + KOI.radius - 2) events |= collect(e);
      } else if (e.kind === KIND_NET) {
        const inX = Math.abs(koi.x - e.x) < NET.width / 2 + KOI.radius - 6;
        const inY = Math.abs(koi.y - e.y) < NET.height / 2 + KOI.radius - 6;
        if (inX && inY) {
          e.active = false;
          events |= hurt();
          if (events & EVENT_OVER) return events;
        }
      } else if (d < e.radius + KOI.radius - 6) {
        e.active = false;
        events |= hurt();
        if (events & EVENT_OVER) return events;
      }
    }

    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 26 * dt;
    }
    for (const f of floaters) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) f.active = false;
    }
    return events;
  }

  reset();
  return { state, reset, step, nextReach, reach };
}
