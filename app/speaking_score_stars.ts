// Pure star-tier mapping for Speaking Mode's result display. Kept free of any
// React/native/icon imports so it stays unit-testable under jest (the view
// component imports this; the test imports this, not the component).
//
// Stars replace the old percent ring. The mapping is anchored on the phrase's
// pass bar so the visual stays coherent with the pass rule:
//   • 0 stars — no real attempt (score ≤ 0);
//   • 1 star  — a real attempt below the pass bar;
//   • 2 stars — score ≥ passThreshold (this is a pass);
//   • 3 stars — score ≥ the "great" bar (midpoint between pass and 100, min 90).

export const STAR_COUNT = 3;
export const INLINE_STAR_COUNT = 5;

/** Map a 0..100 score to 0..3 earned stars using the pass bar as the anchor. */
export function starsForScore(score: number, passThreshold: number): number {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 0) return 0;
  const pass = Math.max(1, Math.min(100, Math.round(passThreshold)));
  // "Great" bar: halfway between pass and perfect, but never below 90.
  const great = Math.max(90, Math.round((pass + 100) / 2));
  if (s >= great) return 3;
  if (s >= pass) return 2;
  return 1;
}

/**
 * Five-star mapping for the compact inline result card. Unlike the legacy
 * three-star modal scale, every approved semantic band owns a distinct tier.
 */
export function inlineStarsForScore(score: number): number {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  if (value <= 0) return 0;
  if (value < 25) return 1;
  if (value < 50) return 2;
  if (value < 75) return 3;
  if (value < 90) return 4;
  return INLINE_STAR_COUNT;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
