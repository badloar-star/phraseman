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
  /** adminParseVideoPhraseDocument: timeoutSeconds 120, одна попытка. */
  adminVideoPhrases: 100_000,
  /** adminAssetStudio (images/generations): timeoutSeconds 120, одна попытка. */
  adminAssetStudio: 100_000,
});

/** true, если fetch оборвал наш тайм-аут или явный abort (обрыв клиента). */
export function isPaidAiFetchAbort(error: unknown): boolean {
  const name = String((error as { name?: unknown } | null)?.name ?? '');
  return name === 'TimeoutError' || name === 'AbortError';
}

export type PaidAiAbortReason = 'timeout' | 'client_closed';

export interface PaidAiAbortScope {
  readonly signal: AbortSignal;
  /** Почему оборвали: тайм-аут, уход клиента или null (не обрывали). */
  abortReason(): PaidAiAbortReason | null;
  /** Клиент закрыл соединение — upstream больше не нужен, токены жечь незачем. */
  abortClientClosed(): void;
  /** Снять таймер после завершения работы (успех или ошибка). */
  dispose(): void;
}

/**
 * PM-231: один сигнал на весь стрим (все попытки + чтение тела): общий дедлайн
 * и обрыв при уходе клиента. Первая причина фиксируется и больше не меняется.
 */
export function createPaidAiAbortScope(timeoutMs: number): PaidAiAbortScope {
  const controller = new AbortController();
  let reason: PaidAiAbortReason | null = null;
  const abortWith = (next: PaidAiAbortReason): void => {
    if (reason) return;
    reason = next;
    controller.abort(new DOMException(
      next === 'timeout' ? 'paid_ai_timeout' : 'paid_ai_client_closed',
      next === 'timeout' ? 'TimeoutError' : 'AbortError',
    ));
  };
  const timer = setTimeout(() => abortWith('timeout'), timeoutMs);
  (timer as { unref?: () => void }).unref?.();
  return {
    signal: controller.signal,
    abortReason: () => reason,
    abortClientClosed: () => abortWith('client_closed'),
    dispose: () => clearTimeout(timer),
  };
}

/** Стабильная причина для логов: 'timeout' | 'aborted' | 'provider_exception'. */
export function paidAiFetchFailureReason(error: unknown): 'timeout' | 'aborted' | 'provider_exception' {
  const name = String((error as { name?: unknown } | null)?.name ?? '');
  if (name === 'TimeoutError') return 'timeout';
  if (name === 'AbortError') return 'aborted';
  return 'provider_exception';
}
