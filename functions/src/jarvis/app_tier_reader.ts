/**
 * Дешёвый читатель общего числа активных пользователей для классификации
 * тира приложения.
 *
 * зачем: Firestore .count() — серверная агрегация, тарифицируется как одно
 * чтение независимо от числа документов (тот же паттерн, что уже используют
 * admin_compliance.ts/admin_referrals.ts/admin_tournament_tasks.ts) — не
 * выкачивание коллекции users, которая самая «толстая» в базе.
 *
 * «Активный» = last_active_at в пределах 30 дней — стандартное окно MAU
 * (Monthly Active Users), в проекте нет отдельного зафиксированного
 * определения активности, кроме reengage-порогов (3-14 дней неактивности,
 * см. re_engage_push.ts) — те заточены под пуши, не под общий масштаб бизнеса.
 *
 * зачем where по last_active_at ОСТАВЛЕН как есть, а не переделан на
 * .select()+фильтр в памяти (как growth_firestore_fetcher.ts): last_active_at
 * пишется тем же клиентским cloud_sync.ts, что и users.created_at, и в
 * принципе может страдать той же болезнью смешанных типов (number/string/
 * Timestamp) — где по числу теоретически недосчитает документы старого
 * формата. Но полная постраничная прогонка ВСЕЙ users для точного счёта
 * активных была бы кратно дороже одного .count()-чтения и растёт вместе
 * с базой, а тир приложения — грубая классификация (Seed/Growth/Scale/
 * Mature), не точный факт: решение владельца 2026-08-03 — оставить
 * недосчёт здесь, а не платить за полную точность второстепенного числа.
 */

export const ACTIVE_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;

export type ActiveUserCountState = 'ready' | 'empty' | 'error';

export interface FetchActiveUserCountInput {
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchActiveUserCountResult {
  readonly state: ActiveUserCountState;
  readonly count: number | null;
  readonly observedAtMs: number;
}

function isSafeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export async function fetchActiveUserCount(input: FetchActiveUserCountInput): Promise<FetchActiveUserCountResult> {
  const sinceMs = input.nowMs - ACTIVE_USER_WINDOW_MS;
  try {
    const snapshot = await input.collection.where('last_active_at', '>=', sinceMs).count().get();
    const count = snapshot.data().count;
    if (!isSafeCount(count)) {
      return Object.freeze({ state: 'error' as const, count: null, observedAtMs: input.nowMs });
    }
    return Object.freeze({ state: count === 0 ? ('empty' as const) : ('ready' as const), count, observedAtMs: input.nowMs });
  } catch {
    return Object.freeze({ state: 'error' as const, count: null, observedAtMs: input.nowMs });
  }
}
