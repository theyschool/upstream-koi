// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens:
// title, play, paused, reach complete, game over and victory.
//
// ?seed=N fixes the river's pattern. ?shot=start|play|reach|victory (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, HEARTS, REACHES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_DASH, EVENT_HIT, EVENT_LOTUS, EVENT_NEAR, EVENT_OVER,
  EVENT_PEARL, EVENT_REACH, EVENT_SCALE, EVENT_VICTORY,
} from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_GIFT_1, ACTION_GIFT_2, ACTION_GIFT_3, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, giftCardRects, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_REACH, SCREEN_TITLE, SCREEN_VICTORY,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false, true);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let newBest = false;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${HEARTS} hearts. Swim upstream.`);
  }

  /** Take the offered gift at `index`, then swim the next reach. */
  function chooseGift(index) {
    const offered = world.state.offered;
    const gift = offered[Math.min(index, offered.length - 1)];
    if (gift) {
      world.applyGift(gift.id);
      announce(`${gift.name}. ${gift.blurb}.`);
    }
    world.nextReach();
    screen = SCREEN_PLAY;
    announce(`Reach ${world.state.reachIndex + 1}: ${REACHES[world.state.reachIndex].name}.`);
  }

  function finishRun(won) {
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    newBest = world.state.score > best && world.state.score > 0;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Home at last. Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  /** Where the koi wants to swim this frame: keys first, then the pointer. */
  function steering() {
    const keys = input.keyVector();
    if (keys) return keys;
    const pointer = input.pointerTarget();
    if (!pointer) return null;
    const target = renderer.toField(pointer.x, pointer.y);
    const dx = target.x - world.state.koi.x;
    const dy = target.y - world.state.koi.y;
    const len = Math.hypot(dx, dy);
    if (len < 26) return null;
    return { x: dx / len, y: dy / len };
  }

  /** The title screen's backdrop: the koi drifts in a slow circle. */
  function demoSteering() {
    const t = world.state.elapsed;
    const tx = 640 + Math.cos(t * 0.45) * 320;
    const ty = 360 + Math.sin(t * 0.7) * 170;
    const dx = tx - world.state.koi.x;
    const dy = ty - world.state.koi.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions === 0) return;
    audio.unlock();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMuted();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_OVER || screen === SCREEN_VICTORY)) startGame();
    else if (actions & ACTION_GIFT_1 && screen === SCREEN_REACH) chooseGift(0);
    else if (actions & ACTION_GIFT_2 && screen === SCREEN_REACH) chooseGift(1);
    else if (actions & ACTION_GIFT_3 && screen === SCREEN_REACH) chooseGift(2);
    else if (actions & ACTION_CONFIRM && screen === SCREEN_REACH) chooseGift(0);
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function playSounds(events) {
    if (events & EVENT_PEARL) audio.pluck(world.state.combo);
    if (events & EVENT_SCALE) audio.golden();
    if (events & EVENT_LOTUS) audio.lotus();
    if (events & EVENT_HIT) audio.thud();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_NEAR) audio.near();
    if (events & (EVENT_REACH | EVENT_VICTORY)) audio.chime();
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, demoSteering(), false, true);
      return;
    }
    const dash = Boolean(actions & ACTION_DASH);
    const events = world.step(STEP, steering(), dash, false);
    playSounds(events);
    if (events & EVENT_VICTORY) finishRun(true);
    else if (events & EVENT_REACH) {
      screen = SCREEN_REACH;
      announce(`${REACHES[world.state.reachIndex].name} complete. Score ${world.state.score}.`);
    } else if (events & EVENT_OVER) finishRun(false);
    else if (events & EVENT_HIT) {
      announce(world.state.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.hearts} hearts left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions() || 0;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted(), newBest);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: false });
  // Clicking a gift card on the reach screen takes that gift.
  canvas.addEventListener('pointerdown', (event) => {
    if (screen !== SCREEN_REACH) return;
    const rect = canvas.getBoundingClientRect();
    const field = renderer.toField(
      (event.clientX - rect.left) / Math.max(1, rect.width),
      (event.clientY - rect.top) / Math.max(1, rect.height),
    );
    const rects = giftCardRects();
    const at = rects.findIndex((r) =>
      field.x >= r.x && field.x <= r.x + r.w && field.y >= r.y && field.y <= r.y + r.h);
    if (at >= 0) chooseGift(at);
  });

  announce('Upstream. A koi’s journey home. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
