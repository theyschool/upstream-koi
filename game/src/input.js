// Keyboard and pointer input for a swimmer, not a paddle. Held keys give a
// steering vector; the pointer gives a target to swim toward; one-shot
// presses (start, dash, pause, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_GIFT_1 = 16;
export const ACTION_GIFT_2 = 32;
export const ACTION_GIFT_3 = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const GIFT = { Digit1: ACTION_GIFT_1, Digit2: ACTION_GIFT_2, Digit3: ACTION_GIFT_3 };

export function createInput(target) {
  const keys = { up: false, down: false, left: false, right: false };
  const pointer = { x: 0.5, y: 0.5, active: false, movedAt: 0 };
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH | ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (GIFT[event.code]) {
      if (!event.repeat) actions |= GIFT[event.code];
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = false;
  });

  function trackPointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width);
    pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height);
    pointer.active = true;
    pointer.movedAt = performance.now();
  }
  target.addEventListener('pointermove', trackPointer);
  target.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    actions |= ACTION_DASH | ACTION_CONFIRM;
  });

  return {
    /** Steering vector from the held keys, normalised, or null. */
    keyVector() {
      const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Pointer target in canvas fractions, or null when it has gone stale. */
    pointerTarget() {
      if (!pointer.active) return null;
      if (performance.now() - pointer.movedAt > 4000) return null;
      return { x: pointer.x, y: pointer.y };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
