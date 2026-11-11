/**
 * Ускорение разбора ошибки на сервере (владелец 11.11: «разбор готовится очень долго» → «Да, все четыре правки»).
 *
 * зачем: замер на прогретом инстансе (журнал `[EXPLAIN-MISTAKE] timing`, 18:44 и 18:45) показал, что время съедает
 * не ИИ, а подготовка к нему: опознание аккаунта 3,8–4,2 с (цепочка чтений; база в Европе, функция в США),
 * лимиты 1,7–3,0 с. А первый запрос на свежем инстансе упал по 5-секундному таймауту и ушёл на повтор (22 с).
 *
 * Здесь три независимые части — отдельным файлом, чтобы не делить большой модуль разбора с соседними правками:
 *  1. память опознания аккаунта на несколько минут внутри инстанса;
 *  2. прогрев: соединение с базой и опознание заранее, пока ученик ещё собирает ответ;
 *  3. дневной кап и окно частоты одновременно, с возвратом капа, если окно отказало.
 */
import type * as admin from 'firebase-admin';
import { resolveStableUidForAuth } from './auth_identity';

/**
 * Сколько инстанс помнит, чей это аккаунт.
 * зачем именно 5 минут: хватает на серию ошибок в одном уроке; проверка «аккаунт в очереди на удаление» для разбора
 * может запоздать не больше чем на этот срок — разбор не меняет данные аккаунта, а капы и учёт привязаны к нему же.
 */
export const MISTAKE_IDENTITY_MEMO_TTL_MS = 5 * 60 * 1000;
/** Потолок записей в памяти инстанса — защита от роста при большом числе разных учеников. */
const MISTAKE_IDENTITY_MEMO_MAX = 2000;
/** Сколько прогрев ждёт каждое своё действие: он необязателен и не должен держать инстанс. */
const WARM_STEP_TIMEOUT_MS = 9000;

type IdentityMemoEntry = Readonly<{ stableUid: string; expiresAtMs: number }>;
export type MistakeIdentitySource = 'memory' | 'in_flight' | 'database';

const identityMemo = new Map<string, IdentityMemoEntry>();
const identityInFlight = new Map<string, Promise<string>>();

export function __resetMistakeExplainSpeedForTests(): void {
  identityMemo.clear();
  identityInFlight.clear();
}

/**
 * Опознание аккаунта с памятью в инстансе. Параллельные вызовы (прогрев и настоящий запрос) делят ОДНО чтение.
 * Ошибка опознания не запоминается и уходит вызывающему как есть — отказ остаётся отказом.
 */
export async function resolveMistakeStableUid(
  db: admin.firestore.Firestore,
  authUid: string,
  nowMs: number = Date.now(),
): Promise<Readonly<{ stableUid: string; source: MistakeIdentitySource }>> {
  const remembered = identityMemo.get(authUid);
  if (remembered && remembered.expiresAtMs > nowMs) {
    return { stableUid: remembered.stableUid, source: 'memory' };
  }
  const pending = identityInFlight.get(authUid);
  if (pending) return { stableUid: await pending, source: 'in_flight' };

  const lookup = resolveStableUidForAuth(db, authUid)
    .then((stableUid) => {
      if (identityMemo.size >= MISTAKE_IDENTITY_MEMO_MAX) identityMemo.clear();
      identityMemo.set(authUid, { stableUid, expiresAtMs: Date.now() + MISTAKE_IDENTITY_MEMO_TTL_MS });
      return stableUid;
    })
    .finally(() => {
      identityInFlight.delete(authUid);
    });
  identityInFlight.set(authUid, lookup);
  return { stableUid: await lookup, source: 'database' };
}

type WarmStepResult = Readonly<{ outcome: string; ms: number }>;

async function timedWarmStep(work: () => Promise<unknown>): Promise<WarmStepResult> {
  const startedAtMs = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const outcome = await Promise.race([
      work().then(() => 'ok'),
      new Promise<string>((resolve) => { timer = setTimeout(() => resolve('timeout'), WARM_STEP_TIMEOUT_MS); }),
    ]);
    return { outcome, ms: Date.now() - startedAtMs };
  } catch (error) {
    // Прогрев необязателен: ошибка дальше не идёт, но причина остаётся в журнале.
    const reason = String((error as { code?: unknown })?.code ?? (error as Error)?.name ?? 'unknown').slice(0, 60);
    console.warn('[EXPLAIN-MISTAKE] warm:step_failed', JSON.stringify({ reason }));
    return { outcome: `failed:${reason}`, ms: Date.now() - startedAtMs };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Прогрев перед разбором. Никогда не бросает.
 *
 * Что делает и сколько стоит: опознаёт аккаунт заранее и кладёт в память инстанса — ЭТО ЧТЕНИЯ (решение владельца
 * 11.11, кнопкой «Да, все четыре правки»): несколько чтений на открытие урока у согласившихся на ИИ-разбор, не чаще
 * раза в 9 минут. Заодно эти же чтения открывают соединение с базой — первый настоящий запрос на свежем инстансе
 * больше не упирается в 5-секундный таймаут окна адреса (журнал 18:44: отказ и повтор, 22 с).
 * Чего здесь нет и быть не должно: записей, дневных капов, обращения к ИИ.
 */
export async function warmMistakeExplainRuntime(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<void> {
  const identity = await timedWarmStep(() => resolveMistakeStableUid(db, authUid));
  console.log('[EXPLAIN-MISTAKE] warm', JSON.stringify({ identity }));
}

/**
 * Дневной кап и окно частоты — одновременно, а не по очереди (каждый шаг — транзакция через океан).
 *
 * Смысл прежний: отказ любого из двух останавливает вызов до платной генерации. Отличие от очереди одно —
 * если кап зарезервирован, а окно частоты отказало, кап возвращается здесь же, и вызывающему его возвращать не нужно.
 */
export async function reserveCapAndRateTogether<Reservation>(input: Readonly<{
  reserveCap: () => Promise<Reservation>;
  enforceRate: () => Promise<void>;
  refundCap: (reservation: Reservation) => Promise<void>;
}>): Promise<Reservation> {
  const [cap, rate] = await Promise.allSettled([input.reserveCap(), input.enforceRate()]);
  if (cap.status === 'rejected') throw cap.reason;
  if (rate.status === 'rejected') {
    await input.refundCap(cap.value).catch((refundError: unknown) => {
      console.error('[EXPLAIN-MISTAKE] cap_refund_failed', JSON.stringify({
        reason: String((refundError as Error)?.name ?? 'unknown').slice(0, 60),
      }));
    });
    throw rate.reason;
  }
  return cap.value;
}
