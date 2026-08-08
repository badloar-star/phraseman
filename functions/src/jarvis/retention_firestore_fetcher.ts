/**
 * Читатель источника для департамента «Удержание».
 *
 * зачем счётчиками: удержание — это доли, а не список людей. Два .count()
 * («заходили за неделю» и «за месяц») дают всё нужное, стоят как два чтения вместо
 * выкачивания базы пользователей, и uid при этом физически не покидает
 * Firestore.
 *
 * Поле last_active_at — то же самое, по которому считается тир приложения
 * (app_tier_reader.ts). Один контракт, одно место правды.
 */

export const RETENTION_WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
export const RETENTION_MONTH_MS = 30 * 24 * 60 * 60 * 1_000;

export type RetentionSourceState = 'ready' | 'empty' | 'error';

export interface FetchRetentionSourceResult {
  readonly state: RetentionSourceState;
  /** Заходили за последнюю неделю. null — источник не смог доказать число. */
  readonly activeWeek: number | null;
  /** Заходили за последний месяц. Неделя — подмножество месяца. */
  readonly activeMonth: number | null;
  readonly observedAtMs: number;
}

export interface FetchRetentionSourceInput {
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

async function countSince(
  collection: FirebaseFirestore.CollectionReference,
  sinceMs: number,
  nowMs: number,
): Promise<number> {
  // guard-ok: .count() — серверная агрегация, документы не выкачиваются.
  const snap = await collection
    .where('last_active_at', '>=', sinceMs)
    .where('last_active_at', '<=', nowMs)
    .count()
    .get();
  const value = snap.data().count;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Jarvis retention: aggregate count is invalid');
  }
  return Math.trunc(value);
}

export async function fetchRetentionSource(
  input: FetchRetentionSourceInput,
): Promise<FetchRetentionSourceResult> {
  try {
    const [week, month] = await Promise.all([
      countSince(input.collection, input.nowMs - RETENTION_WEEK_MS, input.nowMs),
      countSince(input.collection, input.nowMs - RETENTION_MONTH_MS, input.nowMs),
    ]);

    // зачем зажимать: неделя входит в месяц по определению. Если счётчик
    // выдал недельных больше месячных, данные противоречивы — доля вышла бы
    // больше единицы и департамент отрапортовал бы небывалую лояльность.
    if (week > month) {
      throw new Error('Jarvis retention: weekly active count exceeds monthly active count');
    }

    return Object.freeze({
      state: month === 0 ? ('empty' as const) : ('ready' as const),
      activeWeek: week,
      activeMonth: month,
      observedAtMs: input.nowMs,
    });
  } catch {
    // Недоступная база — «неизвестно», а не «все разбежались».
    return Object.freeze({
      state: 'error' as const,
      activeWeek: null,
      activeMonth: null,
      observedAtMs: input.nowMs,
    });
  }
}
