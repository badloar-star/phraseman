// ═══════════════════════════════════════════════════════════════════════════
// scene_star_paths.ts — статичные звёзды сцены: вместо одного Circle на звезду — один Path на ступень прозрачности.
//
// зачем (координатор 04.11, дамп Главной: 58 % дерева — SVG, Circle 312): в react-native-svg на Android каждый элемент — отдельный View. Звёзды с близкой
// прозрачностью рисуются одним Path (окружность = две дуги в `d`). Прозрачность округляется до ≤ STAR_ALPHA_STEPS ступеней: сдвиг не больше половины шага (≈0,035),
// слово координатора — «да» при ≤5 ступенях и неразличимости на кадре. Положение, радиус и порядок не меняются; мерцающие звёзды (каждая N-я) сюда не попадают.
// ═══════════════════════════════════════════════════════════════════════════
export const STAR_ALPHA_STEPS = 5;

export type SceneStar = Readonly<{ x: number; y: number; r: number; a: number }>;
export type StarPathGroup = Readonly<{ a: number; d: string; count: number }>;

const n2 = (v: number): string => String(Math.round(v * 100) / 100);

/** Окружность двумя дугами: M cx-r,cy a r,r 0 1,0 2r,0 a r,r 0 1,0 -2r,0 */
const circlePath = (cx: number, cy: number, r: number): string => `M${n2(cx - r)} ${n2(cy)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0z`;

/** Звёзды (кроме каждой `skipEvery`-й — они мерцают отдельным слоем) → не более STAR_ALPHA_STEPS групп по ступени прозрачности. */
export function groupStarsByAlpha(stars: ReadonlyArray<SceneStar>, W: number, H: number, skipEvery: number, steps: number = STAR_ALPHA_STEPS): ReadonlyArray<StarPathGroup> {
  const kept = stars.filter((_, i) => i % skipEvery !== 0);
  if (kept.length === 0) return [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of kept) { if (s.a < lo) lo = s.a; if (s.a > hi) hi = s.a; }
  const levels = steps <= 1 || hi - lo < 1e-6 ? [(lo + hi) / 2] : Array.from({ length: steps }, (_, k) => lo + ((hi - lo) * (k + 0.5)) / steps);
  const pieces: string[][] = levels.map(() => []);
  for (const s of kept) {
    let best = 0;
    for (let k = 1; k < levels.length; k += 1) if (Math.abs(levels[k]! - s.a) < Math.abs(levels[best]! - s.a)) best = k;
    pieces[best]!.push(circlePath(s.x * W, s.y * H, s.r));
  }
  const out: StarPathGroup[] = [];
  levels.forEach((a, k) => { if (pieces[k]!.length > 0) out.push({ a: Math.round(a * 1000) / 1000, d: pieces[k]!.join(''), count: pieces[k]!.length }); });
  return out;
}
