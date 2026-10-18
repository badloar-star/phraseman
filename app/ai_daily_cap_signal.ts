/**
 * Распознаёт отказ сервера «ИИ на сегодня всё»: общий дневной потолок расходов или дневное окно на uid/IP.
 *
 * зачем (координатор 18.10): сервер режет платные вызовы общим потолком расходов (functions/src/spend_cap.ts →
 * resource-exhausted 'daily_spend_cap') и дневными окнами (functions/src/caller_rate_window.ts → `${scope}_rate_limited`).
 * Без распознавания клиент показывал «слишком много сообщений подряд, попробуй ещё раз» — человек жал «Повторить»
 * до завтра. Здесь один распознаватель: экраны превращают его в свой спокойный «на сегодня всё, продолжим завтра»,
 * без кнопки Plus (это не личный лимит) и без повтора.
 *
 * Часовые окна (dlg_turn, ff_turn, dlg_start, ff_start, dlg_complete) сюда НЕ входят: они правда открываются через час,
 * для них остаётся «подожди немного». Короткий сбой счётчика ('rate_window_busy', 'spend_cap_busy', код unavailable) —
 * обычное «попробуйте ещё раз».
 */

export const AI_DAILY_SPEND_CAP_CODE = 'daily_spend_cap';

/** Дневные окна сервера (windowMs = сутки). Держать в паре с вызовами enforceCallerRateWindow в functions/src. */
export const AI_DAILY_WINDOW_SCOPES = Object.freeze([
  'dlg_free_ip',
  'dlg_tr_free',
  'explain_phrase_ip',
  'explain_choice_ip',
  'mistake_explain_ip',
  'hub_advice_ip',
] as const);

function errorText(error: unknown): string {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
  return `${String(row.code ?? '')} ${String(row.message ?? (typeof error === 'string' ? error : ''))}`.toLowerCase();
}

/** true — сервер сказал «на сегодня всё»: общий дневной потолок ИИ или дневное окно uid/IP. */
export function isAiDailyCapError(error: unknown): boolean {
  const text = errorText(error);
  if (text.includes(AI_DAILY_SPEND_CAP_CODE)) return true;
  return AI_DAILY_WINDOW_SCOPES.some((scope) => text.includes(`${scope}_rate_limited`));
}
