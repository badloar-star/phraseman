// ═══════════════════════════════════════════════════════════════════════════
// spire_coins_zones.ts — зоны повышения/понижения комнаты Пика в режиме «по монетам недели» (D190).
//
// зачем (владелец 14.10, D190; решения координатора (в1)–(в3)): вниз уходят k ПОСЛЕДНИХ живых по монетам недели, а не
// «нижние 15% и все с нулём»; вверх — k лучших с монетами > 0; группы вверх/вниз не пересекаются; нули сверх k НЕ спускаются;
// поздно вошедшие не понижаются. Одна функция и для сервера (functions/src/spire_finalize_core.ts — итог недели), и для
// экрана «Все участники» (components/spire/SpireAllMembers.tsx) — иначе экран показал бы одну зону, а итог дал другую.
// Режим «по ступеням» эта функция не трогает.
//
// Чистый модуль: ни сети, ни Firestore, ни времени.
// ═══════════════════════════════════════════════════════════════════════════

export type SpireCoinsZone = 'up' | 'stay' | 'down';

/** k для N живых: N ≥ 15 → 5, иначе max(1, floor(N/3)); 0 живых → 0. */
export function spireCoinsZoneK(liveCount: number): number {
  const n = Math.max(0, Math.trunc(liveCount) || 0);
  if (n < 1) return 0;
  return n >= 15 ? 5 : Math.max(1, Math.floor(n / 3));
}

/** Сколько мест в зоне понижения: не больше k и не залезая на зону повышения (N=1 → 0, N=2 → 1). */
export function spireCoinsDownK(liveCount: number): number {
  const n = Math.max(0, Math.trunc(liveCount) || 0);
  const k = spireCoinsZoneK(n);
  return Math.max(0, Math.min(k, n - k));
}

/**
 * Зоны для живых, отсортированных от лучшего к худшему тем же сравнением, что и итог (монеты → ступени → время).
 * - вверх: место (competition rank) ≤ k и монеты > 0 — ничья на верхней границе в пользу игрока, как раньше;
 * - вниз: только если ВСЯ группа равных (полная ничья по сравнению) помещается в downK последних — ничья на нижней
 *   границе в пользу игрока (никого из неразличимых не спускаем наугад); не вверх; не защищён (поздний вход);
 *   в комнате хоть кто-то заработал монеты (тихая комната никого не понижает).
 */
export function spireCoinsZonesFor<T>(
  sortedBestFirst: readonly T[],
  compare: (a: T, b: T) => number,
  scored: (t: T) => boolean,
  protectedFromDown: (t: T) => boolean = () => false,
): SpireCoinsZone[] {
  const n = sortedBestFirst.length;
  const k = spireCoinsZoneK(n);
  const downK = spireCoinsDownK(n);
  const anyScored = sortedBestFirst.some(scored);
  return sortedBestFirst.map((me) => {
    let strictlyBetter = 0;
    let strictlyWorse = 0;
    let tied = 0;
    for (const other of sortedBestFirst) {
      const c = compare(other, me);
      if (c < 0) strictlyBetter += 1;
      else if (c > 0) strictlyWorse += 1;
      else tied += 1;
    }
    const up = scored(me) && k > 0 && strictlyBetter + 1 <= k;
    if (up) return 'up';
    const down = anyScored && downK > 0 && !protectedFromDown(me) && strictlyWorse + tied <= downK;
    return down ? 'down' : 'stay';
  });
}
