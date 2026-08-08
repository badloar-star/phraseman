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

import {
  SAFETY_FLAG_AGE_CONTRACT,
  type SafetyAgeEvidence,
} from '../safety_flag_age_contract';

export const JARVIS_SAFETY_FLAG_AGE_CONTRACT = SAFETY_FLAG_AGE_CONTRACT;

export type SafetySourceState = 'ready' | 'empty' | 'error';

export interface FetchSafetySourceResult {
  readonly state: SafetySourceState;
  /** Необработанные флаги всего. null — источник не смог доказать число. */
  readonly openFlags: number | null;
  /** Необработанные флаги на детских аккаунтах. Отдельно: это другой класс риска. */
  readonly openMinorFlags: number | null;
  readonly openAgeUnverifiedFlags: number | null;
  readonly openAgeUnavailableFlags: number | null;
  readonly ageEvidence: SafetyAgeEvidence;
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
    const confirmedAdultFlags = flags.where('ageEvidence', '==', 'confirmed_adult');
    const unavailableAgeFlags = flags.where('ageEvidence', '==', 'unavailable');
    const [
      total,
      handled,
      recent,
      confirmedAdultTotal,
      confirmedAdultHandled,
      unavailableAgeTotal,
      unavailableAgeHandled,
    ] = await Promise.all([
      countOf(flags),
      countOf(flags.where('handled', '==', true)),
      countOf(flags.where('createdAtMs', '>=', input.nowMs - SAFETY_LOOKBACK_MS)),
      countOf(confirmedAdultFlags),
      countOf(confirmedAdultFlags.where('handled', '==', true)),
      countOf(unavailableAgeFlags),
      countOf(unavailableAgeFlags.where('handled', '==', true)),
    ]);

    const openFlags = openOf(total, handled);
    const openConfirmedAdultFlags = Math.min(
      openFlags,
      openOf(confirmedAdultTotal, confirmedAdultHandled),
    );
    const openAgeUnavailableFlags = Math.min(
      openFlags - openConfirmedAdultFlags,
      openOf(unavailableAgeTotal, unavailableAgeHandled),
    );
    const openAgeUnverifiedFlags = Math.max(
      0,
      openFlags - openConfirmedAdultFlags - openAgeUnavailableFlags,
    );
    return Object.freeze({
      state: total === 0 ? ('empty' as const) : ('ready' as const),
      openFlags,
      openMinorFlags: null,
      openAgeUnverifiedFlags,
      openAgeUnavailableFlags,
      ageEvidence: openAgeUnverifiedFlags > 0
        ? ('age_unverified' as const)
        : openAgeUnavailableFlags > 0
          ? ('unavailable' as const)
          : ('confirmed_adult' as const),
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
      openAgeUnverifiedFlags: null,
      openAgeUnavailableFlags: null,
      ageEvidence: 'unavailable' as const,
      recentFlags: null,
      observedAtMs: input.nowMs,
    });
  }
}
