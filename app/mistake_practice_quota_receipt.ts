/**
 * Попытка дня «Моих ошибок» между тапом и стартом тренировки.
 *
 * зачем (Ревизор/координатор 15.10, хвост R48): гейт списывает суточную Free-попытку в кадре тапа (фоном), а энергия и
 * подготовка решаются уже в тренировке. Если старт так и не состоялся (гонка энергии, отказ, сбой подготовки), попытку
 * надо вернуть — ровно один раз. Гейт кладёт сюда чек, тренировка сообщает итог старта. Только память процесса.
 */
import type { AccountGenerationToken } from './account_generation';
import { refundRevenueDailyQuota } from './revenue_daily_quota';

type PendingStart = Readonly<{
  receiptId: string;
  token: AccountGenerationToken;
  /** Списание идёт фоном — возврат обязан дождаться его, иначе вернём ещё не записанный чек. */
  consume: Promise<unknown>;
  atMs: number;
  surface: string;
}>;

/** Чек старше этого — не от текущего входа в тренировку (экран не открылся вовсе). */
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

let pending: PendingStart | null = null;

export function rememberMistakeQuotaReceipt(start: PendingStart): void {
  pending = start;
  console.log('[MISTAKES-GATE] quota:pending', JSON.stringify({ receiptId: start.receiptId, surface: start.surface })); // guard-ok
}

/**
 * Итог старта тренировки. 'started' — попытка честно потрачена, чек забываем. 'not_started' — возвращаем попытку
 * (идемпотентно: повторный вызов по тому же чеку ничего не вернёт второй раз).
 */
export async function settleMistakeQuotaStart(outcome: 'started' | 'not_started', reason: string, nowMs: number = Date.now()): Promise<void> {
  const start = pending;
  pending = null;
  if (!start) {
    console.log('[MISTAKES-GATE] quota:settle — чека нет (Plus / короткий путь / возобновление)', JSON.stringify({ outcome, reason })); // guard-ok
    return;
  }
  if (outcome === 'started') {
    console.log('[MISTAKES-GATE] quota:settle started → попытка потрачена', JSON.stringify({ receiptId: start.receiptId })); // guard-ok
    return;
  }
  if (nowMs - start.atMs > PENDING_MAX_AGE_MS) {
    console.warn('[MISTAKES-GATE] quota:settle — чек устарел, не возвращаем', JSON.stringify({ receiptId: start.receiptId, ageMs: nowMs - start.atMs })); // guard-ok
    return;
  }
  try {
    await start.consume.catch(() => undefined);
    const result = await refundRevenueDailyQuota({ kind: 'mistake_practice_starts', token: start.token, receiptId: start.receiptId, reason });
    console.log('[MISTAKES-GATE] quota:refund', JSON.stringify({ receiptId: start.receiptId, reason, status: result.status })); // guard-ok
  } catch (error: unknown) {
    console.warn('[MISTAKES-GATE] quota:refund:catch — попытка не вернулась', error instanceof Error ? error.message : String(error)); // guard-ok
  }
}

export function __resetMistakeQuotaReceiptForTests(): void {
  pending = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
