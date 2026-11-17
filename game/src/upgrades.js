// River gifts: the choice at the end of each reach. Finishing a reach
// offers three gifts and the koi takes one, so no two journeys play the
// same: a heart for safety, speed or a magnet for greed, a longer combo
// or a quicker dash for style, golden scales for score. Each gift has
// one clear job, and the world applies it in applyGift.

export const GIFTS = [
  { id: 'heart', name: 'Strong Heart', icon: '♥', blurb: '+1 max heart, heal 1 now' },
  { id: 'swift', name: 'Swift Fins', icon: '≫', blurb: 'Swim 12% faster' },
  { id: 'magnet', name: 'Pearl Magnet', icon: '◎', blurb: 'Pearls drift toward you' },
  { id: 'combo', name: 'Patient Combo', icon: '✦', blurb: 'Combos last 5 seconds' },
  { id: 'dash', name: 'Quick Dash', icon: '➤', blurb: 'Dash recharges twice as fast' },
  { id: 'gold', name: 'Golden Touch', icon: '✪', blurb: 'All points worth 25% more' },
];

/**
 * Three gifts to offer, drawn from the ones not yet taken. The heart may
 * come back while the koi can still grow a bigger heart; anything else is
 * once a run. `random` is the world's own generator, so a seeded run
 * offers the same gifts.
 */
export function chooseGifts(random, owned, maxHearts) {
  const pool = GIFTS.filter((gift) =>
    gift.id === 'heart' ? maxHearts < 5 : !owned.includes(gift.id));
  const picked = [];
  while (pool.length > 0 && picked.length < 3) {
    const at = Math.floor(random() * pool.length);
    picked.push(pool.splice(at, 1)[0]);
  }
  // A short pool (a long run of hearts) is topped up from the whole set.
  for (const gift of GIFTS) {
    if (picked.length >= 3) break;
    if (!picked.includes(gift)) picked.push(gift);
  }
  return picked;
}
