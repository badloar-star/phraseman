// Governance-ID: TG-E138CC4DF370
import { DebugLogger } from './debug-logger';

/**
 * Единый журнал цепочки «монеты после урока» (владелец 05.11, №80/№72: на итоге 0 монет и ожидание 10 с).
 * зачем: сперва логи, потом починка. Префикс `[LESSON-COINS]` — вся цепочка одним поиском. Релизная сборка вырезает console.log
 * (кроме warn/error), поэтому запись дублируется в DebugLogger, который переживает релиз. Сам журнал никогда не бросает.
 * В полях нет идентификатора пользователя: только урок, номера, суммы и миллисекунды.
 */
export const LESSON_COINS_TAG = '[LESSON-COINS]';

export function lessonCoinsLog(step: string, fields: Record<string, unknown> = {}): void {
  try {
    const line = JSON.stringify({ step, ...fields });
    console.log(LESSON_COINS_TAG, line);
    DebugLogger.info(LESSON_COINS_TAG, line);
  } catch (error) {
    // зачем: журнал не должен ронять начисление; причина сама попадает в warn
    console.warn(LESSON_COINS_TAG, 'log_failed', error instanceof Error ? error.message : String(error));
  }
}

/** Ключ сессии без хвоста пользователя: оставляем первые 40 символов (например `lesson3_runes_en`). */
export function lessonCoinsShortKey(sessionKey: string): string {
  return String(sessionKey ?? '').slice(0, 40);
}
