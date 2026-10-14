// font_weights.ts — какие начертания Inter зарегистрированы и во что превращается каждый заказанный fontWeight.
//
// зачем (координатор 14.10, типографика): интерфейс просит веса 500/600/700/800/900, а в семействе «Inter» (app.json → expo-font) на Android зарегистрированы ТОЛЬКО 400, 600, 700, 900.
// Android берёт ближайшее начертание семейства; при ничьей (800 — ровно между 700 и 900; 500 — между 400 и 600) выигрывает первое в порядке семейства, то есть нижнее: 800 рисуется как 700, 500 — как 400.
// Это правило — предположение до кадра-доказательства (Сверка), поэтому и план, и счётчики пишутся в журнал `[FONT-WEIGHT]`. Модуль чистый: без React Native, проверяется тестом против app.json.

/** Начертания, зарегистрированные в нативном семействе Inter (держать равным app.json → expo-font → android.fonts[0].fontDefinitions[].weight). */
export const REGISTERED_INTER_WEIGHTS: readonly number[] = [400, 600, 700, 900];

const NAMED: Readonly<Record<string, number>> = { normal: 400, bold: 700 };

/** fontWeight из стиля → число 100…900; нет значения → 400 (обычный). */
export function normalizeFontWeight(weight: string | number | undefined | null): number {
  if (weight === undefined || weight === null) return 400;
  if (typeof weight === 'number') return Number.isFinite(weight) ? Math.min(900, Math.max(100, Math.round(weight / 100) * 100)) : 400;
  const named = NAMED[weight];
  if (named !== undefined) return named;
  const n = Number(weight);
  return Number.isFinite(n) ? Math.min(900, Math.max(100, Math.round(n / 100) * 100)) : 400;
}

/** Какой из зарегистрированных весов реально нарисуется: ближайший, при ничьей — нижний. */
export function resolveRenderedInterWeight(weight: string | number | undefined | null, registered: readonly number[] = REGISTERED_INTER_WEIGHTS): number {
  const wanted = normalizeFontWeight(weight);
  let best = registered[0]!;
  for (const w of registered) {
    if (Math.abs(w - wanted) < Math.abs(best - wanted)) best = w; // строго «<»: при ничьей остаётся нижний
  }
  return best;
}

/** Заказанные веса, которые рисуются НЕ тем, что заказано. */
export function mismatchedWeights(registered: readonly number[] = REGISTERED_INTER_WEIGHTS): ReadonlyArray<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (const wanted of [400, 500, 600, 700, 800, 900]) {
    const got = resolveRenderedInterWeight(wanted, registered);
    if (got !== wanted) out.push([wanted, got] as const);
  }
  return out;
}

/** Строка плана для журнала: «400→400 500→400 600→600 700→700 800→700 900→900». */
export function fontWeightPlanLine(registered: readonly number[] = REGISTERED_INTER_WEIGHTS): string {
  return [400, 500, 600, 700, 800, 900].map((w) => `${w}→${resolveRenderedInterWeight(w, registered)}`).join(' ');
}

// ── счётчики заказанных весов (только dev: в релизе console.log вырезается, а счёт на горячем пути не нужен) ──
const requested = new Map<number, number>();
let summaryTimer: ReturnType<typeof setTimeout> | null = null;
export const FONT_WEIGHT_SUMMARY_DELAY_MS = 20_000;

export function noteRequestedFontWeight(weight: string | number | undefined | null): void {
  const w = normalizeFontWeight(weight);
  requested.set(w, (requested.get(w) ?? 0) + 1);
  if (summaryTimer === null) {
    summaryTimer = setTimeout(() => {
      const total = [...requested.values()].reduce((a, b) => a + b, 0);
      const parts = [...requested.entries()].sort((a, b) => a[0] - b[0]).map(([w2, n]) => `${w2}→${resolveRenderedInterWeight(w2)}: ${n}`);
      console.log(`[FONT-WEIGHT] сводка отрисовок за ${FONT_WEIGHT_SUMMARY_DELAY_MS / 1000} с: всего ${total}; заказано→рисуется: ${parts.join(', ')}`); // guard-ok: диагностика типографики
    }, FONT_WEIGHT_SUMMARY_DELAY_MS);
  }
}

export function requestedFontWeightsSnapshot(): ReadonlyMap<number, number> {
  return new Map(requested);
}

/** Только для тестов. */
export function resetFontWeightCountersForTests(): void {
  requested.clear();
  if (summaryTimer !== null) clearTimeout(summaryTimer);
  summaryTimer = null;
}
