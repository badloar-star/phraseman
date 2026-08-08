/**
 * Читатель источника для департамента «Безопасность».
 *
 * зачем только счётчики: департаменту нужны числа («сколько флагов висит
 * необработанными»), а не личности. `safety_flags` содержит `uid` — это PII,
 * которую план запрещает отдавать модели и в Telegram. Поэтому здесь только
 * серверные .count()-агрегации: документы не выкачиваются вовсе, UID физически
 * не может утечь дальше, и одна агрегация стоит как одно чтение вместо тысяч.
 *
 * Контракт полей (`ageBracket`, `handled`, `createdAtMs`) взят из живого
 * admin_compliance.ts и места записи ai_safety.ts — не выдуман.
 */

/** Окно для поиска всплеска. Сутки — минимальная единица, в которой всплеск виден. */
export const SAFETY_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

/** Возрастные корзины несовершеннолетних. Флаг на ребёнке — юридический риск, не статистика. */
const MINOR_BRACKETS = ['under13', 'teen_safe'] as const;

export type SafetySourceState = 'ready' | 'empty' | 'error';

export interface FetchSafetySourceResult {
  readonly state: SafetySourceState;
  /** Необработанные флаги всего. null — источник не смог доказать число. */
  readonly openFlags: number | null;
  /** Необработанные флаги на детских аккаунтах. Отдельно: это другой класс риска. */
  readonly openMinorFlags: number | null;
  /** Флаги за последние сутки — база для «всплеска». */
  readonly recentFlags: number | null;
  /** Момент замера. Счётчики не носят собственных дат — свежесть задаёт сам замер. */
  readonly observedAtMs: number;
}

export interface FetchSafetySourceInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly nowMs: number;
}

type CountableQuery = {
  where(field: string, op: FirebaseFirestore.WhereFilterOp, value: unknown): CountableQuery;
  count(): { get(): Promise<{ data(): { count?: unknown } }> };
};

async function countOf(query: CountableQuery): Promise<number> {
  // guard-ok: .count() — серверная агрегация, документы не выкачиваются.
  const snap = await query.count().get();
  const value = snap.data().count;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

/** Открытые = всего − обработанные, но обработанных не бывает больше, чем всего. */
function openOf(total: number, handled: number): number {
  return Math.max(0, total - Math.min(total, handled));
}

export async function fetchSafetySource(input: FetchSafetySourceInput): Promise<FetchSafetySourceResult> {
  const flags = input.db.collection('safety_flags') as unknown as CountableQuery;

  try {
    const minorQueries = MINOR_BRACKETS.flatMap((bracket) => {
      const scoped = flags.where('ageBracket', '==', bracket);
      return [countOf(scoped), countOf(scoped.where('handled', '==', true))];
    });

    const [total, handled, recent, ...minorCounts] = await Promise.all([
      countOf(flags),
      countOf(flags.where('handled', '==', true)),
      countOf(flags.where('createdAtMs', '>=', input.nowMs - SAFETY_LOOKBACK_MS)),
      ...minorQueries,
    ]);

    let openMinorFlags = 0;
    for (let i = 0; i < minorCounts.length; i += 2) {
      openMinorFlags += openOf(minorCounts[i], minorCounts[i + 1]);
    }

    const openFlags = openOf(total, handled);
    return Object.freeze({
      state: total === 0 ? ('empty' as const) : ('ready' as const),
      openFlags,
      openMinorFlags,
      recentFlags: recent,
      observedAtMs: input.nowMs,
    });
  } catch {
    // зачем fail-closed: молчаливый ноль здесь читался бы как «всё чисто»,
    // то есть недоступный Firestore выглядел бы как безопасность.
    return Object.freeze({
      state: 'error' as const,
      openFlags: null,
      openMinorFlags: null,
      recentFlags: null,
      observedAtMs: input.nowMs,
    });
  }
}
