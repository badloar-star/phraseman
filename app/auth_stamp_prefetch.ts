/*
 * [LOGIN-STAMP] Предвыборка метки владения анонимным аккаунтом (authStampAnonOwnership) на время окна выбора Google.
 *
 * зачем (координатор 15.10, замер входа №7): после окна выбора вход шёл 9,7 с, из них метка — 1,96 с строго
 * последовательно перед signInWithCredential. Запрос метки уходит сразу на тапе, пока человек выбирает аккаунт,
 * а ответ принимается ТОЛЬКО в той точке, где раньше стоял последовательный stamp, и только если совпали
 * попытка, stableId, анонимный uid и возраст. Иначе — прежний последовательный stamp (промах = нынешнее поведение).
 *
 * Правила (контракт nonce M-1, account_authority_anon_merge_nonce.ts):
 *   - модуль НЕ кладёт nonce в хранилище сам: ответ живёт в замыкании своей попытки и отдаётся вызывающему на hit;
 *     поэтому поздний ответ отменённого входа физически не может попасть в хранилище;
 *   - промис попытки никогда не отклоняется — ошибка → null + лог с кодом;
 *   - в лог не идут ни секрет, ни stableId, ни uid — только исход, номер попытки и миллисекунды.
 */

/**
 * Ответ старше этого — не принимаем. У nonce TTL 10 мин от выдачи сервером, а клиент считает срок от приёма (тело stamp не меняется —
 * сторож AA S2b): 3 мин запаса на ответ + сам вход (секунды) держат клиентский срок внутри серверного.
 */
export const STAMP_PREFETCH_MAX_AGE_MS = 3 * 60_000;

export type StampIdentity = Readonly<{ stableId: string; authUid: string }>;

export type StampPrefetchResult = Readonly<{
  stableId: string;
  authUid: string;
  response: unknown;
  /** Момент ответа сервера — от него считается срок nonce, а не от момента приёма. */
  receivedAtMs: number;
}>;

export type StampPrefetch = Readonly<{
  attempt: number;
  startedAtMs: number;
  result: Promise<StampPrefetchResult | null>;
}>;

export type StampPrefetchDeps = Readonly<{
  /** Анонимная личность после ensureAnonUser; null — не аноним / нет stableId (предвыборка не нужна). */
  resolveIdentity: () => Promise<StampIdentity | null>;
  /** Сам вызов authStampAnonOwnership (с nonceRequested). Может отклониться — модуль поймает. */
  request: (stableId: string) => Promise<unknown>;
  now?: () => number;
  log?: (line: string) => void;
}>;

export type StampConsumeOutcome =
  | 'hit'
  | 'miss_none'
  | 'miss_failed'
  | 'stale_attempt'
  | 'stale_id'
  | 'stale_uid'
  | 'stale_age';

export type StampConsumeResult = Readonly<{ outcome: StampConsumeOutcome; hit: StampPrefetchResult | null }>;

/**
 * Итог попытки на конце входа — для счёта доли впустую потраченных вызовов.
 * зачем (координатор 15.10): «>80% впустую — запуск только при признаке «Google уже занят»».
 */
export type StampSettleOutcome =
  | 'used'
  | 'wasted_no_conflict'
  | 'wasted_cancel'
  | 'wasted_error'
  | `wasted_${Exclude<StampConsumeOutcome, 'hit'>}`
  | 'not_sent'
  | 'none';

type AttemptState = Readonly<{ attempt: number; sent: boolean; consumed: StampConsumeOutcome | null }>;

let attemptSeq = 0;
/** Учёт текущей попытки (без секрета): ушёл ли запрос и чем кончился приём. Заменяется целиком, не мутируется. */
let current: AttemptState | null = null;
/**
 * Сама текущая предвыборка — её берёт stampAnonOwnershipBeforeSignIn в точке метки.
 * зачем (ревью 15.10): вызов stamp в ветке конфликта и тело функции метки остаются прежними (сторожа AA S2b и порядка
 * «stamp раньше credential»), предвыборка не протаскивается параметрами через весь вход.
 */
let currentPrefetch: StampPrefetch | null = null;

/** Предвыборка текущего входа или null (не запускалась / вход уже закончен). */
export function currentStampPrefetch(): StampPrefetch | null {
  return currentPrefetch;
}

function markCurrent(attempt: number, patch: Partial<Pick<AttemptState, 'sent' | 'consumed'>>): void {
  if (current && current.attempt === attempt) current = Object.freeze({ ...current, ...patch });
}

function defaultLog(line: string): void {
  console.log(line);
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code.slice(0, 60);
    const name = (error as { name?: unknown }).name;
    if (typeof name === 'string' && name.length > 0) return name.slice(0, 60);
  }
  return 'unknown';
}

/** Старт на тапе входа. Каждая новая попытка вытесняет прежние (их ответы больше не принимаются). */
export function startStampPrefetch(deps: StampPrefetchDeps): StampPrefetch {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? defaultLog;
  attemptSeq += 1;
  const attempt = attemptSeq;
  const startedAtMs = now();
  current = Object.freeze({ attempt, sent: false, consumed: null });
  log(`[LOGIN-STAMP] prefetch_start attempt=${attempt}`);
  const result = (async (): Promise<StampPrefetchResult | null> => {
    let identity: StampIdentity | null;
    try {
      identity = await deps.resolveIdentity();
    } catch (error) {
      log(`[LOGIN-STAMP] prefetch_skipped attempt=${attempt} reason=identity_failed code=${errorCode(error)}`);
      return null;
    }
    if (!identity || !identity.stableId || !identity.authUid) {
      log(`[LOGIN-STAMP] prefetch_skipped attempt=${attempt} reason=${identity ? 'identity_incomplete' : 'not_anonymous'}`);
      return null;
    }
    try {
      markCurrent(attempt, { sent: true });
      const response = await deps.request(identity.stableId);
      const receivedAtMs = now();
      const late = attempt !== attemptSeq;
      log(`[LOGIN-STAMP] prefetch_${late ? 'late_ignored' : 'done'} attempt=${attempt} current=${attemptSeq} ms=${receivedAtMs - startedAtMs}`);
      if (late) return null;
      return Object.freeze({ stableId: identity.stableId, authUid: identity.authUid, response, receivedAtMs });
    } catch (error) {
      log(`[LOGIN-STAMP] prefetch_failed attempt=${attempt} ms=${now() - startedAtMs} code=${errorCode(error)}`);
      return null;
    }
  })();
  const prefetch: StampPrefetch = Object.freeze({ attempt, startedAtMs, result });
  currentPrefetch = prefetch;
  return prefetch;
}

/**
 * Конец входа любым исходом (finally входа): ответы этой и прежних попыток больше не принимаются,
 * и в лог уходит итог `[LOGIN-STAMP] outcome=…`. signInResult — поле result итога входа, null — вход бросил исключение.
 * В лог не идёт текст ошибки входа (в нём бывает почта) — только вид итога.
 */
export function settleStampPrefetch(signInResult: string | null, log: (line: string) => void = defaultLog): StampSettleOutcome {
  const state = current;
  current = null;
  currentPrefetch = null;
  attemptSeq += 1;
  const outcome = settleOutcome(state, signInResult);
  if (state) log(`[LOGIN-STAMP] outcome=${outcome} attempt=${state.attempt} signIn=${signInResult ?? 'threw'}`);
  return outcome;
}

function settleOutcome(state: AttemptState | null, signInResult: string | null): StampSettleOutcome {
  if (!state) return 'none';
  if (!state.sent) return 'not_sent';
  if (state.consumed === 'hit') return 'used';
  if (state.consumed !== null) return `wasted_${state.consumed}`;
  if (signInResult === 'cancelled') return 'wasted_cancel';
  if (signInResult === null || signInResult === 'error') return 'wasted_error';
  return 'wasted_no_conflict';
}

/**
 * Приём в точке последовательного stamp. hit — вызывающий кладёт nonce (acceptAnonMergeStampResponse с ответом предвыборки).
 * Любой другой исход — вызывающий делает stamp заново, как раньше.
 */
export async function consumeStampPrefetch(
  prefetch: StampPrefetch | null,
  expected: StampIdentity,
  options: Readonly<{ now?: () => number; log?: (line: string) => void; maxAgeMs?: number }> = {},
): Promise<StampConsumeResult> {
  const now = options.now ?? Date.now;
  const log = options.log ?? defaultLog;
  const maxAgeMs = options.maxAgeMs ?? STAMP_PREFETCH_MAX_AGE_MS;
  if (!prefetch) {
    log('[LOGIN-STAMP] consume outcome=miss_none reason=no_prefetch');
    return Object.freeze({ outcome: 'miss_none', hit: null });
  }
  const waitStartedAtMs = now();
  const value = await prefetch.result;
  const waitMs = now() - waitStartedAtMs;
  const outcome = classify(prefetch, value, expected, now(), maxAgeMs);
  markCurrent(prefetch.attempt, { consumed: outcome });
  log(`[LOGIN-STAMP] consume outcome=${outcome} attempt=${prefetch.attempt} current=${attemptSeq} waitMs=${waitMs} sinceStartMs=${now() - prefetch.startedAtMs}`);
  return Object.freeze({ outcome, hit: outcome === 'hit' ? value : null });
}

function classify(
  prefetch: StampPrefetch,
  value: StampPrefetchResult | null,
  expected: StampIdentity,
  nowMs: number,
  maxAgeMs: number,
): StampConsumeOutcome {
  if (prefetch.attempt !== attemptSeq) return 'stale_attempt';
  if (!value) return 'miss_failed';
  if (!expected.stableId || value.stableId !== expected.stableId) return 'stale_id';
  if (!expected.authUid || value.authUid !== expected.authUid) return 'stale_uid';
  const age = nowMs - value.receivedAtMs;
  if (age < 0 || age > maxAgeMs) return 'stale_age';
  return 'hit';
}

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __RouteShim() { return null; }
