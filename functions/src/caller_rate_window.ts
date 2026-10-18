/**
 * Потолок вызовов дорогой функции на uid и на IP — одним окном, одной транзакцией.
 *
 * зачем (координатор 18.10, «защита от накрутки счёта»): у функций, которые платят OpenAI или создают/связывают аккаунт,
 * потолок был только на uid (а у хода свободного разговора и разбора итога — никакого). Ферма анонимных аккаунтов с одного
 * адреса обходила его целиком: каждый новый uid — новый бесплатный лимит. Окно на IP закрывает эту дыру дёшево: два документа
 * в той же транзакции, без лишних чтений. Тот же способ определения IP, что у восстановления входа (auth_recovery.ts).
 *
 * Приватность: ни IP, ни uid не хранятся — только sha256 от «scope:значение», счётчик и начало окна (+ expiresAt для TTL).
 * Коллекция закрыта правилами для клиента. App Check не используется (пломба владельца).
 *
 * Сбой Firestore — пропуск с журналом (fail-open): лимит не должен ронять честный вызов; без Firestore функция и так не работает.
 */
import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export const CALLER_RATE_WINDOW_COLLECTION = 'callable_rate_windows';
const LOG = '[ABUSE-LIMIT]';
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
/** Счётчик не держит дорогой вызов дольше 1,5 с: дольше — пропуск с журналом (fail-open). */
const DB_TIMEOUT_MS = 1_500;

/** IP вызывающего: первый адрес из x-forwarded-for, иначе rawRequest.ip; нет — пусто (тогда только uid). */
export function callerIpFromRawRequest(rawRequest: unknown): string {
  const req = (rawRequest ?? {}) as { headers?: Record<string, unknown>; ip?: unknown };
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? String(forwarded[0] ?? '') : String(forwarded ?? '')).split(',')[0]!.trim();
  const ip = first || (typeof req.ip === 'string' ? req.ip.trim() : '');
  return ip.slice(0, 64);
}

const hashKey = (scope: string, kind: 'u' | 'ip', value: string): string =>
  `${scope}_${kind}_${createHash('sha256').update(`${scope}:${value}`, 'utf8').digest('hex').slice(0, 40)}`;

export type CallerRateWindowInput = Readonly<{
  /** Короткое имя функции/действия: dlg_turn, ff_turn, ensure_link… — часть ключа и текста отказа. */
  scope: string;
  authUid: string | null | undefined;
  rawRequest: unknown;
  /** 0 — uid не ограничиваем (у функции уже есть свой потолок на uid). */
  maxPerUid: number;
  maxPerIp: number;
  windowMs?: number;
  nowMs?: number;
  db?: FirebaseFirestore.Firestore;
}>;

/** Бросает HttpsError('resource-exhausted', `${scope}_rate_limited`) при превышении; иначе засчитывает вызов. */
export async function enforceCallerRateWindow(input: CallerRateWindowInput): Promise<void> {
  // зачем: в модульных тестах функций Firestore поднят без эмулятора — окно там не участвует, если тест не передал свою базу.
  if (!input.db && typeof process !== 'undefined' && process.env.JEST_WORKER_ID) return;
  const windowMs = input.windowMs ?? DEFAULT_WINDOW_MS;
  const now = input.nowMs ?? Date.now();
  const ip = callerIpFromRawRequest(input.rawRequest);
  const checks: { kind: 'u' | 'ip'; key: string; max: number }[] = [];
  if (input.maxPerUid > 0 && input.authUid) checks.push({ kind: 'u', key: hashKey(input.scope, 'u', input.authUid), max: input.maxPerUid });
  if (input.maxPerIp > 0 && ip) checks.push({ kind: 'ip', key: hashKey(input.scope, 'ip', ip), max: input.maxPerIp });
  if (checks.length === 0) {
    console.log(LOG, JSON.stringify({ scope: input.scope, decision: 'skip', reason: !ip ? 'no_ip_and_no_uid_limit' : 'no_checks' })); // guard-ok: ранний выход называет причину
    return;
  }
  let db: FirebaseFirestore.Firestore;
  try {
    db = input.db ?? admin.firestore();
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'fail_open', reason: 'firestore_unavailable', detail: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    return;
  }
  let refused: { kind: 'u' | 'ip'; count: number; max: number } | null = null;
  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('caller_rate_window_timeout')), DB_TIMEOUT_MS); });
    deadline.catch(() => undefined); // зачем: синхронный сбой транзакции не должен оставить таймер без обработчика
    await Promise.race([deadline, db.runTransaction(async (tx) => {
      const refs = checks.map((check) => db.collection(CALLER_RATE_WINDOW_COLLECTION).doc(check.key));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      const states = snaps.map((snap) => {
        const data = (snap.data() ?? {}) as { windowStartMs?: unknown; count?: unknown };
        const windowStartMs = Number(data.windowStartMs ?? 0);
        const sameWindow = now - windowStartMs < windowMs;
        return { windowStartMs: sameWindow ? windowStartMs : now, count: sameWindow ? Number(data.count ?? 0) : 0 };
      });
      refused = null;
      checks.forEach((check, index) => {
        if (!refused && states[index]!.count >= check.max) refused = { kind: check.kind, count: states[index]!.count, max: check.max };
      });
      if (refused) return;
      refs.forEach((ref, index) => {
        tx.set(ref, {
          scope: input.scope,
          kind: checks[index]!.kind,
          windowStartMs: states[index]!.windowStartMs,
          count: states[index]!.count + 1,
          updatedAtMs: now,
          expiresAt: admin.firestore.Timestamp.fromMillis(states[index]!.windowStartMs + windowMs * 2),
        });
      });
    })]).finally(() => { if (timer) clearTimeout(timer); });
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'fail_open', reason: 'transaction_failed', detail: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    return;
  }
  if (refused) {
    const r = refused as { kind: 'u' | 'ip'; count: number; max: number };
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'refused', by: r.kind, count: r.count, max: r.max, windowMs }));
    throw new HttpsError('resource-exhausted', `${input.scope}_rate_limited`);
  }
}
