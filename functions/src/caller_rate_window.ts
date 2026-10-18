/**
 * Потолок вызовов дорогой функции на uid и на IP — одним окном, одной транзакцией.
 *
 * зачем (координатор 18.10, «защита от накрутки счёта»): у функций, которые платят OpenAI или создают/связывают аккаунт,
 * потолок был только на uid (а у хода свободного разговора и разбора итога — никакого). Ферма анонимных аккаунтов с одного
 * адреса обходила его целиком: каждый новый uid — новый бесплатный лимит. Окно на IP закрывает эту дыру дёшево: два документа
 * в той же транзакции, без лишних чтений. Тот же способ определения IP — у восстановления входа (auth_recovery.ts) и ника.
 *
 * Приватность: ни IP, ни uid не хранятся — только sha256 от «scope:значение», счётчик и начало окна (+ expiresAt для TTL).
 * Коллекция закрыта правилами для клиента. App Check не используется (пломба владельца).
 *
 * Сбои (Ревизор 3.116 к f53ea8375): пропуск (fail-open) — ТОЛЬКО при настоящей недоступности Firestore. Таймаут и конфликт
 * транзакции — отказ: иначе шквал параллельных вызовов на один ключ сам открывал себе дверь. Перед транзакцией — предфильтр
 * в памяти инстанса: ключ, уже упёршийся в потолок, отбивается без чтения базы.
 */
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export const CALLER_RATE_WINDOW_COLLECTION = 'callable_rate_windows';
const LOG = '[ABUSE-LIMIT]';
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
/** Счётчик не держит дорогой вызов дольше 2 с: дольше — отказ «попробуйте ещё раз». */
const DB_TIMEOUT_MS = 2_000;
/** Предфильтр в памяти: больше ключей — сбрасываем целиком (дешёвый первый барьер, не источник правды). */
const LOCAL_MAX_KEYS = 5_000;

export type CallerIpInfo = Readonly<{ ip: string; chainLength: number; source: 'forwarded' | 'request_ip' | 'none' }>;

/** Внутренние адреса и прокси Google: их дописывает инфраструктура, это не клиент. */
function isInfrastructureAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
      // Прокси балансировщика Google (35.191.0.0/16, 130.211.0.0/22).
      || (a === 35 && b === 191) || (a === 130 && b === 211 && Number(ip.split('.')[2]) <= 3);
  }
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

/** Адрес из записи цепочки: без скобок и порта, ::ffff:a.b.c.d → IPv4. Не адрес — пусто. */
function cleanAddress(raw: string): string {
  let value = raw.trim();
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracket) value = bracket[1]!;
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.replace(/:\d+$/, '');
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  if (mapped) value = mapped[1]!;
  return isIP(value) ? value : '';
}

/** IPv6 → префикс /64: у одного абонента их миллиарды, иначе окно на IP обходится сменой адреса. */
export function ipRateKey(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  const [head = '', tail = ''] = ip.toLowerCase().split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const parts = ip.includes('::') ? [...headParts, ...Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill('0'), ...tailParts] : headParts;
  return `${parts.slice(0, 4).map((p) => (p || '0').replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/**
 * IP вызывающего. Берём ПРАВЫЙ адрес x-forwarded-for, пропуская адреса инфраструктуры: фронт Google дописывает реальный
 * адрес клиента в конец, а всё, что левее, клиент может прислать сам (Ревизор 3.116 — первый адрес подделывался).
 * Нет цепочки — rawRequest.ip; нет и его — пусто (тогда только uid).
 */
export function callerIpInfoFromRawRequest(rawRequest: unknown): CallerIpInfo {
  const req = (rawRequest ?? {}) as { headers?: Record<string, unknown>; ip?: unknown };
  const forwarded = req.headers?.['x-forwarded-for'];
  const chain = (Array.isArray(forwarded) ? forwarded.join(',') : String(forwarded ?? ''))
    .split(',').map((part) => part.trim()).filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const ip = cleanAddress(chain[i]!);
    if (ip && !isInfrastructureAddress(ip)) return Object.freeze({ ip, chainLength: chain.length, source: 'forwarded' });
  }
  const direct = typeof req.ip === 'string' ? cleanAddress(req.ip) : '';
  if (direct) return Object.freeze({ ip: direct, chainLength: chain.length, source: 'request_ip' });
  return Object.freeze({ ip: '', chainLength: chain.length, source: 'none' });
}

export function callerIpFromRawRequest(rawRequest: unknown): string {
  return callerIpInfoFromRawRequest(rawRequest).ip;
}

const hashKey = (scope: string, kind: 'u' | 'ip', value: string): string =>
  `${scope}_${kind}_${createHash('sha256').update(`${scope}:${value}`, 'utf8').digest('hex').slice(0, 40)}`;

type LocalWindow = { windowStartMs: number; count: number; refusedUntilMs: number };
const localWindows = new Map<string, LocalWindow>();

/** Только для тестов: сброс предфильтра инстанса. */
export function resetCallerRateWindowStateForTest(): void {
  localWindows.clear();
}

function rememberLocal(key: string, entry: LocalWindow): void {
  if (!localWindows.has(key) && localWindows.size >= LOCAL_MAX_KEYS) localWindows.clear();
  localWindows.set(key, entry);
}

/** Настоящая недоступность Firestore (gRPC UNAVAILABLE) — единственный случай пропуска. */
function isFirestoreUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 14 || code === 'unavailable' || code === 'firestore/unavailable';
}

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

/**
 * Бросает HttpsError('resource-exhausted', `${scope}_rate_limited`) при превышении, HttpsError('unavailable',
 * 'rate_window_busy') при таймауте/конфликте; иначе засчитывает вызов.
 */
export async function enforceCallerRateWindow(input: CallerRateWindowInput): Promise<void> {
  // зачем: в модульных тестах функций Firestore поднят без эмулятора — окно там не участвует, если тест не передал свою базу.
  if (!input.db && typeof process !== 'undefined' && process.env.JEST_WORKER_ID) return;
  const windowMs = input.windowMs ?? DEFAULT_WINDOW_MS;
  const now = input.nowMs ?? Date.now();
  const ipInfo = callerIpInfoFromRawRequest(input.rawRequest);
  const ip = ipInfo.ip ? ipRateKey(ipInfo.ip) : '';
  const checks: { kind: 'u' | 'ip'; key: string; max: number }[] = [];
  if (input.maxPerUid > 0 && input.authUid) checks.push({ kind: 'u', key: hashKey(input.scope, 'u', input.authUid), max: input.maxPerUid });
  if (input.maxPerIp > 0 && ip) checks.push({ kind: 'ip', key: hashKey(input.scope, 'ip', ip), max: input.maxPerIp });
  if (checks.length === 0) {
    console.log(LOG, JSON.stringify({ scope: input.scope, decision: 'skip', reason: !ip ? 'no_ip_and_no_uid_limit' : 'no_checks', forwardedChainLength: ipInfo.chainLength, ipSource: ipInfo.source })); // guard-ok: ранний выход называет причину
    return;
  }
  // Предфильтр: ключ уже упёрся в потолок в этом окне на этом инстансе — отказ без чтения базы.
  for (const check of checks) {
    const local = localWindows.get(check.key);
    if (!local) continue;
    const sameWindow = now - local.windowStartMs < windowMs;
    if (now < local.refusedUntilMs || (sameWindow && local.count >= check.max)) {
      console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'refused', by: check.kind, source: 'local_prefilter', count: local.count, max: check.max, windowMs }));
      throw new HttpsError('resource-exhausted', `${input.scope}_rate_limited`);
    }
  }
  let db: FirebaseFirestore.Firestore;
  try {
    db = input.db ?? admin.firestore();
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'fail_open', reason: 'firestore_unavailable', detail: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    return;
  }
  let refused: { index: number; count: number; windowStartMs: number } | null = null;
  let committed: { windowStartMs: number; count: number }[] = [];
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
      committed = [];
      const at = checks.findIndex((check, index) => states[index]!.count >= check.max);
      if (at >= 0) {
        refused = { index: at, count: states[at]!.count, windowStartMs: states[at]!.windowStartMs };
        return;
      }
      committed = states.map((state) => ({ windowStartMs: state.windowStartMs, count: state.count + 1 }));
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
    const detail = error instanceof Error ? error.message.slice(0, 120) : String(error);
    if (isFirestoreUnavailable(error)) {
      console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'fail_open', reason: 'firestore_unavailable', detail }));
      return;
    }
    // зачем: таймаут и конфликт (aborted после повторов) вызывает именно шквал на один ключ — пропуск открыл бы дверь атаке.
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'refused_busy', reason: detail === 'caller_rate_window_timeout' ? 'timeout' : 'transaction_failed', code: (error as { code?: unknown } | null)?.code ?? null, detail, forwardedChainLength: ipInfo.chainLength }));
    throw new HttpsError('unavailable', 'rate_window_busy');
  }
  if (refused) {
    const r = refused as { index: number; count: number; windowStartMs: number };
    const check = checks[r.index]!;
    rememberLocal(check.key, { windowStartMs: r.windowStartMs, count: r.count, refusedUntilMs: r.windowStartMs + windowMs });
    console.warn(LOG, JSON.stringify({ scope: input.scope, decision: 'refused', by: check.kind, source: 'firestore', count: r.count, max: check.max, windowMs, forwardedChainLength: ipInfo.chainLength, ipSource: ipInfo.source }));
    throw new HttpsError('resource-exhausted', `${input.scope}_rate_limited`);
  }
  committed.forEach((state, index) => rememberLocal(checks[index]!.key, { ...state, refusedUntilMs: 0 }));
  console.log(LOG, JSON.stringify({ scope: input.scope, decision: 'ok', forwardedChainLength: ipInfo.chainLength, ipSource: ipInfo.source }));
}
