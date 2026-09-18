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
  /**
   * Реплики ИИ-диалога в сутки. Сервер — источник истины
   * (functions/src/openai_dialog_model_config.ts: DIALOG_FREE_DAILY_REPLIES_DEFAULT),
   * клиент держит зеркало для входа без сети и текста пейвола.
   */
  ai_dialog_replies: 10,
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

/** Цена дневного пропуска в жемчужинах (стартовая гипотеза из аудита 7.5). */
export const REVENUE_DAY_PASS_PRICE_PEARLS = Object.freeze({
  flashcard_training_starts: 15,
  speaking_attempts: 20,
} as const);

export type RevenueDayPassKind = keyof typeof REVENUE_DAY_PASS_EXTRA;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
