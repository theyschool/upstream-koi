// Upstream — every tuning number, colour and reach in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const KOI = {
  radius: 22,
  length: 56,
  speed: 330,
  accel: 2400,
  dashSpeed: 760,
  dashTime: 0.22,
  dashCooldown: 1.1,
  invulnerable: 1.5,
};

export const HEARTS = 3;

/** Upstream distance, in pixels, each reach asks the koi to swim. */
export const REACHES = [
  { name: 'Willow Bend', distance: 2600, current: 26, bonus: 200, palette: 'willow', tagline: 'Gentle water. Mind the rocks.' },
  { name: 'Heron Hollow', distance: 3000, current: 44, bonus: 250, palette: 'heron', tagline: 'The heron hunts here. Faster water.' },
  { name: 'The Spawning Pool', distance: 3400, current: 62, bonus: 300, palette: 'pool', tagline: 'The last swim home. Golden water.' },
];

/**
 * One look per reach: the river changes as the koi swims home — green
 * willows, then dusk violet where the heron hunts, then golden dawn at
 * the spawning pool. `drift` is what floats on the surface there.
 */
export const REACH_PALETTES = {
  willow: {
    surface: '#2fa8a0', water: '#0a4a56', deep: '#04222e',
    sand: '#c9a86a', sandDark: '#8a6f3f', reed: '#3f7d5a', reedDark: '#2c5a41',
    drift: '#cfe8a8',
  },
  heron: {
    surface: '#5b7fb8', water: '#233a63', deep: '#0b1226',
    sand: '#8d7ba3', sandDark: '#63547a', reed: '#6a5a9e', reedDark: '#4a3e70',
    drift: '#c9b8f0',
  },
  pool: {
    surface: '#d9a441', water: '#2e6b4f', deep: '#07271f',
    sand: '#e0c078', sandDark: '#a8894a', reed: '#7da05a', reedDark: '#57703e',
    drift: '#ffd9a0',
  },
};

export const PEARL = { radius: 11, points: 10, interval: 1.6, arc: 3 };
export const MOON = { radius: 16, points: 100, interval: 18 };
export const SCALE = { radius: 13, points: 50, interval: 7 };
export const LOTUS = { radius: 14, points: 25, interval: 11 };
export const BUBBLE = { radius: 10, points: 5, interval: 3.5 };

export const ROCK = { minRadius: 22, maxRadius: 40, interval: 1.5 };
export const NET = { width: 150, height: 46, interval: 6.5 };
export const EEL = { radius: 16, interval: 7, speed: 150 };
export const HERON = { interval: 7.5, warn: 0.7, strike: 0.35 };
export const WHIRL = { radius: 70, interval: 9, pull: 190 };

export const COMBO_WINDOW = 3;
export const POOL_SIZE = 96;

/** A hazard that rushes past without touching the koi pays for the scare. */
export const NEAR_MISS = { distance: 26, points: 25 };

export const PALETTE = {
  deep: '#04222e',
  water: '#0a4a56',
  surface: '#2fa8a0',
  sand: '#c9a86a',
  sandDark: '#8a6f3f',
  reed: '#3f7d5a',
  reedDark: '#2c5a41',
  koiOrange: '#f4842b',
  koiCream: '#fff3d6',
  koiSpot: '#2b2b2b',
  pearl: '#f4feff',
  gold: '#ffd166',
  lotus: '#ff8fb1',
  rock: '#5d6b73',
  net: '#a9713f',
  eel: '#274d3d',
  heron: '#e8e4d8',
  text: '#f2fbf7',
  muted: '#b8d8cf',
  panel: '#062e3acc',
  danger: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'upstream.best';
