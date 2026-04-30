/** Fisher–Yates shuffle with stable seed (same algorithm as legacy lesson_prepositions builder). */
export function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Dedupe, ensure ≥4 options, shuffle order for buttons. */
export function shufflePrepOptions(
  itemId: string,
  template: string,
  correct: string,
  distractors: string[],
): string[] {
  const merged = [correct, ...distractors.map(d => String(d).trim()).filter(Boolean)];
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const raw of merged) {
    const key = raw.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniq.push(raw);
  }
  while (uniq.length < 4) {
    uniq.push('con');
  }
  return deterministicShuffle(uniq, `${itemId}|${template}|${correct}`);
}
