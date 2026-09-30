/**
 * PM-231: сетевые тайм-ауты платных OpenAI-запросов.
 *
 * зачем: голый `fetch` без сигнала висел до `timeoutSeconds` функции. Рантайм
 * убивал инстанс посреди запроса — ветка отката квоты НЕ выполнялась, а токены
 * OpenAI всё равно списывались. Свой тайм-аут ниже потолка функции гарантирует,
 * что сработает обычный путь ошибки (откат квоты + лог причины).
 *
 * Каждое значение подобрано ПОД потолок своей функции с учётом числа попыток.
 */

export const PAID_AI_FETCH_TIMEOUT_MS = Object.freeze({
  /** premiumDialogSend: timeoutSeconds 30, до 2 попыток (repeat guard) → 2×12 = 24с. */
  dialogSend: 12_000,
  /** premiumDialogTranslate: timeoutSeconds 20, одна попытка. */
  dialogTranslate: 14_000,
  /** premiumDialogStream: timeoutSeconds 60, весь стрим (подключение + чтение). */
  dialogStream: 50_000,
  /** premiumDialogReview: timeoutSeconds 30, одна попытка. */
  dialogReview: 22_000,
  /** explainMistake: timeoutSeconds 120, до 3 попыток → 3×35 = 105с. */
  mistakeExplain: 35_000,
  /** mistakeHubAdvice: timeoutSeconds 30, одна попытка. */
  mistakeHubAdvice: 20_000,
  /** Админские длинные генерации (video_phrases, asset studio) — под их 300–540с. */
  adminVideoPhrases: 240_000,
  adminAssetStudio: 150_000,
});

/** true, если fetch оборвал наш тайм-аут или явный abort (обрыв клиента). */
export function isPaidAiFetchAbort(error: unknown): boolean {
  const name = String((error as { name?: unknown } | null)?.name ?? '');
  return name === 'TimeoutError' || name === 'AbortError';
}

/** Стабильная причина для логов: 'timeout' | 'aborted' | 'provider_exception'. */
export function paidAiFetchFailureReason(error: unknown): 'timeout' | 'aborted' | 'provider_exception' {
  const name = String((error as { name?: unknown } | null)?.name ?? '');
  if (name === 'TimeoutError') return 'timeout';
  if (name === 'AbortError') return 'aborted';
  return 'provider_exception';
}
