/**
 * revenue_daily_limits.ts — единый источник чисел дневных лимитов обычного аккаунта.
 *
 * зачем (владелец, 2026-09-13): лимиты жили россыпью (3 старта карточек в
 * revenue_quota_access.ts, 10 реплик диалога на сервере), а тексты пейволов
 * обещали «только в Plus». Числа собраны здесь, чтобы copy, гейты и DEV Hub
 * говорили одно и то же. Plus/VIP лимитов не имеет; «Фри»-флаг Пульта
 * (`gate_<feature>_premium=false`) снимает лимит для всех — прецедент Epic 2A.
 *
 * Это НЕ master-флаг модели: каждая фича по-прежнему решает доступ своим
 * remote-флагом и entitlement, здесь только константы.
 */

/** Calendar-month limits. Kept separate so daily surfaces cannot silently
 * reinterpret a monthly allowance as a per-day entitlement. */
export const REVENUE_MONTHLY_LIMITS = Object.freeze({
  /** Free AI dialogue replies per UTC calendar month. Server owns enforcement. */
  ai_dialog_replies: 30,
} as const);

export type RevenueMonthlyLimitKey = keyof typeof REVENUE_MONTHLY_LIMITS;

export const REVENUE_DAILY_LIMITS = Object.freeze({
  /** Старты карточных тренировок (Swipe/Blitz/Recall/Speaking) в сутки. */
  flashcard_training_starts: 3,
  /** Голосовые попытки (устно в уроке, hold-to-talk, голосовой ввод в диалоге) в сутки. */
  speaking_attempts: 3,
  /*
   * зачем (владелец 2026-09-18): дневного лимита Арены БОЛЬШЕ НЕТ —
   * «не должно быть никаких дневных попыток, арена неограничена. только
   * энергия ограничение если не хватает».
   *
   * Ключ `arena_match_starts` удалён целиком, а не выставлен в 0 или в
   * большое число: пока ключ существует, любая новая кнопка снова начнёт
   * его читать и «случайно» вернёт лимит. Единственная плата за матч —
   * энергия (modules/economy, arena_match), и она уже показана человеку
   * ценой на экране поиска.
   *
   * Возвращать лимит только по прямой команде владельца.
   */
  /** @deprecated Compatibility for callers migrating to REVENUE_MONTHLY_LIMITS. */
  ai_dialog_replies: REVENUE_MONTHLY_LIMITS.ai_dialog_replies,
  /**
   * Сессии «Работы над ошибками» в сутки у обычного аккаунта.
   * зачем (владелец 2026-09-14): раздел перестал быть «только Plus» - одна
   * сессия в день бесплатно, дальше пейвол `mistake_practice`. Считается
   * по факту старта новой сессии (возобновление сохранённой не тратит).
   */
  mistake_practice_starts: 1,
} as const);

export type RevenueDailyLimitKey = keyof typeof REVENUE_DAILY_LIMITS;

/** Сколько даёт один «дневной пропуск» за жемчужины сверх лимита. */
export const REVENUE_DAY_PASS_EXTRA = Object.freeze({
  flashcard_training_starts: 3,
  speaking_attempts: 3,
} as const);

// зачем: D70/D78 — покупка дневного пропуска за жемчуг (quota_day_pass.ts) и его цена
// удалены. Уже купленные пропуска читает revenue_daily_quota.ts по ключу периода.
/**
 * @deprecated D70/D78: мёртвая константа, НЕ использовать. Оставлена только потому,
 * что удаление quota_day_pass.ts ещё не закоммичено, а закоммиченный HEAD его
 * импортирует (коммит D111 не должен ломать сборку HEAD). Удалить вместе с
 * коммитом удаления app/quota_day_pass.ts.
 */
export const REVENUE_DAY_PASS_PRICE_PEARLS = Object.freeze({
  flashcard_training_starts: 15,
  speaking_attempts: 20,
} as const);

export type RevenueDayPassKind = keyof typeof REVENUE_DAY_PASS_EXTRA;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
