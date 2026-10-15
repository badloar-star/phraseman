/**
 * Попытка дня «Моих ошибок» между тапом и стартом тренировки.
 *
 * зачем (Ревизор/координатор 15.10, хвост R48): гейт списывает суточную Free-попытку в кадре тапа (фоном), а энергия и
 * подготовка решаются уже в тренировке. Если старт так и не состоялся (гонка энергии, отказ, сбой подготовки), попытку
 * надо вернуть — ровно один раз.
 * Чек хранится ПО СВОЕМУ id, а id едет в параметрах маршрута (quotaReceipt): раньше был один общий слот, и неначатая
 * тренировка А, оставшаяся в стеке под новой Б, при уходе уже не находила свой чек — попытка терялась (против пользователя).
 * Только память процесса. Лог [QUOTA-REFUND] на каждой ветке.
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

const pending = new Map<string, PendingStart>();

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[QUOTA-REFUND] ${event}`, JSON.stringify(data)); // guard-ok: каждая ветка возврата попытки
}

export function rememberMistakeQuotaReceipt(start: PendingStart, nowMs: number = Date.now()): void {
  for (const [id, item] of pending) {
    if (nowMs - item.atMs > PENDING_MAX_AGE_MS) {
      pending.delete(id);
      log('pending:expired', { receiptId: id, ageMs: nowMs - item.atMs });
    }
  }
  pending.set(start.receiptId, start); // guard-ok: Map в памяти процесса, не запись на диск/в сеть
  log('pending:add', { receiptId: start.receiptId, surface: start.surface, open: pending.size });
}

/**
 * Итог старта тренировки, по чеку СВОЕГО экрана (receiptId из параметров маршрута). 'started' — попытка честно потрачена,
 * чек забываем. 'not_started' — возвращаем попытку (идемпотентно: повторный вызов по тому же чеку ничего не вернёт второй раз).
 */
export async function settleMistakeQuotaStart(
  outcome: 'started' | 'not_started',
  reason: string,
  receiptId: string | null | undefined,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!receiptId) {
    log('settle:no_receipt', { outcome, reason, why: 'вход без чека (Plus / бесплатный путь / возобновление / старая ссылка)' });
    return;
  }
  const start = pending.get(receiptId);
  pending.delete(receiptId);
  if (!start) {
    log('settle:unknown_receipt', { outcome, reason, receiptId, why: 'уже закрыт или процесс перезапускался' });
    return;
  }
  if (outcome === 'started') {
    log('settle:started', { receiptId });
    return;
  }
  if (nowMs - start.atMs > PENDING_MAX_AGE_MS) {
    log('settle:stale', { receiptId, ageMs: nowMs - start.atMs });
    return;
  }
  try {
    await start.consume.catch((error: unknown) => {
      log('consume:failed_before_refund', { receiptId, error: error instanceof Error ? error.message : String(error) });
    });
    const result = await refundRevenueDailyQuota({ kind: 'mistake_practice_starts', token: start.token, receiptId, reason });
    log('refund', { receiptId, reason, status: result.status });
  } catch (error: unknown) {
    log('refund:catch', { receiptId, reason, error: error instanceof Error ? error.message : String(error) });
  }
}

export function __resetMistakeQuotaReceiptForTests(): void {
  pending.clear();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
