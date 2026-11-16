// A small seeded generator (splitmix32): the same seed gives the same river,
// which is what makes the screenshot scenes repeatable. It also hands out
// ranges and picks, so callers never do the arithmetic themselves.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = z ^ (z >>> 15);
    return (z >>> 0) / 4294967296;
  }
  next.range = (low, high) => low + next() * (high - low);
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}
