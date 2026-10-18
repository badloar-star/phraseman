/**
 * Дневной потолок расходов на платные внешние вызовы — общий на всё приложение.
 *
 * зачем (владелец 18.10 через координатора: «чтобы никто не мог накрутить больше 20 $ в день В ПРИНЦИПЕ — со всего, не с одного
 * аккаунта»): потолки на uid и IP (caller_rate_window) режут одного нарушителя, но не сумму. Здесь — один счётчик центов на UTC-сутки:
 * каждый платный вызов (OpenAI — диалоги, перевод, объяснения, советы, разборы; TTS; картинки) ПЕРЕД вызовом прибавляет свою оценку,
 * и при сумме ≥ порога (по умолчанию 1500 ¢ = 15 $, запас до 20 $ на Firestore и функции) все платные функции отвечают «на сегодня всё».
 *
 * Дёшево: счётчик — 10 шардов (FieldValue.increment, 1 запись на вызов); сумма читается одним getAll(10) и держится в памяти инстанса
 * 45 с (+ локальный набег с последнего чтения). Конфиг spend_cap_config/global — тоже в памяти 60 с. Порог и оценки — в конфиге.
 * Флаг paidDisabled ставит аварийный выключатель по бюджету Cloud Billing (spend_cap_billing_kill_switch.ts) или админ.
 *
 * Сбои (Ревизор 3.116/3.117): пропуск (fail-open) — только при настоящей недоступности Firestore (gRPC UNAVAILABLE). Таймаут чтения
 * суммы — берём последнюю сумму дня из памяти; её нет — отказ «попробуйте ещё раз». Бюджет Cloud Billing (слой 3) OpenAI НЕ
 * прикрывает: счёт OpenAI идёт мимо Google, от него страхует только лимит расходов в кабинете OpenAI (его ставит владелец).
 * Выше 80 % порога сумма перечитывается раз в 10 с, а не 45 с: перелёт за порог ограничен 10 секундами вызовов. Журнал: [SPEND-CAP].
 */
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export const SPEND_CAP_CONFIG_COLLECTION = 'spend_cap_config';
export const SPEND_CAP_CONFIG_DOC = 'global';
export const SPEND_DAILY_SHARDS_COLLECTION = 'spend_daily_shards';
export const SPEND_SHARD_COUNT = 10;
export const DEFAULT_DAILY_LIMIT_CENTS = 1500;
const LOG = '[SPEND-CAP]';
const CONFIG_TTL_MS = 60_000;
const TOTAL_TTL_MS = 45_000;
/** Выше этой доли порога сумма перечитывается чаще — перелёт ограничен 10 с вызовов, а не 45 с. */
const NEAR_LIMIT_SHARE = 0.8;
const NEAR_LIMIT_TOTAL_TTL_MS = 10_000;
/** Потолок ожидания базы: счётчик не держит платный вызов дольше секунды. */
const DB_TIMEOUT_MS = 1_000;
/**
 * Первое обращение нового инстанса: соединение с Firestore ещё не поднято (холодный старт 2–4 с).
 * зачем (Ревизор 3.124): с 1 с первая реплика ИИ после простоя получала бы «занято».
 */
const COLD_DB_TIMEOUT_MS = 5_000;
let dbWarm = false;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutMs = dbWarm ? DB_TIMEOUT_MS : COLD_DB_TIMEOUT_MS;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`spend_cap_timeout_${label}`)), timeoutMs); });
  deadline.catch(() => undefined);
  const result = await Promise.race([promise, deadline]).finally(() => { if (timer) clearTimeout(timer); });
  dbWarm = true;
  return result;
}

/** Цены, центы за 1 млн токенов (вход / выход). Завышение безопасно; неизвестная модель считается по самой дорогой строке. */
const PRICE_CENTS_PER_M: Readonly<Record<string, readonly [number, number]>> = {
  'gpt-4.1': [200, 800],
  'gpt-4.1-mini': [40, 160],
  'gpt-4.1-nano': [10, 40],
  'gpt-4o': [250, 1000],
  'gpt-4o-mini': [15, 60],
};
const FALLBACK_PRICE: readonly [number, number] = [250, 1000];
/** Фиксированные оценки вызова, центы: речь (gpt-4o-mini-tts ≈ 1,5 ¢/мин) и картинка. */
const FLAT_CENTS = { tts: 0.5, image: 20 } as const;

export type SpendKind = 'chat' | 'tts' | 'image';

export type SpendReservation = Readonly<{ fn: string; cents: number; dateKey: string }>;

export type SpendCapConfig = Readonly<{
  enabled: boolean;
  dailyLimitCents: number;
  paidDisabled: boolean;
  paidDisabledReason: string | null;
  /** Переопределение оценки по имени функции, центы. */
  estimateCentsByFn: Readonly<Record<string, number>>;
}>;

const DEFAULT_CONFIG: SpendCapConfig = Object.freeze({
  enabled: true, dailyLimitCents: DEFAULT_DAILY_LIMIT_CENTS, paidDisabled: false, paidDisabledReason: null, estimateCentsByFn: Object.freeze({}),
});

export function utcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Оценка стоимости одного вызова в центах. */
export function estimateSpendCents(input: Readonly<{ kind: SpendKind; model?: string; inTokens?: number; outTokens?: number }>): number {
  if (input.kind === 'tts') return FLAT_CENTS.tts;
  if (input.kind === 'image') return FLAT_CENTS.image;
  const model = String(input.model ?? '').toLowerCase();
  const key = Object.keys(PRICE_CENTS_PER_M).sort((a, b) => b.length - a.length).find((name) => model.startsWith(name));
  const [inPrice, outPrice] = key ? PRICE_CENTS_PER_M[key]! : FALLBACK_PRICE;
  const inTokens = Math.max(0, input.inTokens ?? 3000);
  const outTokens = Math.max(0, input.outTokens ?? 600);
  return (inTokens * inPrice + outTokens * outPrice) / 1_000_000;
}

function readConfig(data: unknown): SpendCapConfig {
  const d = (data ?? {}) as Record<string, unknown>;
  const limit = Number(d.dailyLimitCents);
  const estimates = (d.estimateCentsByFn && typeof d.estimateCentsByFn === 'object') ? d.estimateCentsByFn as Record<string, unknown> : {};
  return Object.freeze({
    enabled: d.enabled !== false,
    dailyLimitCents: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_DAILY_LIMIT_CENTS,
    paidDisabled: d.paidDisabled === true,
    paidDisabledReason: typeof d.paidDisabledReason === 'string' ? d.paidDisabledReason.slice(0, 120) : null,
    estimateCentsByFn: Object.freeze(Object.fromEntries(Object.entries(estimates).filter(([, v]) => Number.isFinite(Number(v)) && Number(v) >= 0).map(([k, v]) => [k, Number(v)]))),
  });
}

type State = { config: SpendCapConfig; configAtMs: number; totalCents: number; totalAtMs: number; totalDateKey: string; localSinceRead: number };
const state: State = { config: DEFAULT_CONFIG, configAtMs: 0, totalCents: 0, totalAtMs: 0, totalDateKey: '', localSinceRead: 0 };

/** Только для тестов: сброс кэша инстанса. */
export function resetSpendCapStateForTest(): void {
  Object.assign(state, { config: DEFAULT_CONFIG, configAtMs: 0, totalCents: 0, totalAtMs: 0, totalDateKey: '', localSinceRead: 0 });
  dbWarm = false;
}

async function loadConfig(db: FirebaseFirestore.Firestore, nowMs: number): Promise<SpendCapConfig> {
  if (nowMs - state.configAtMs < CONFIG_TTL_MS) return state.config;
  try {
    const snap = await withTimeout(db.collection(SPEND_CAP_CONFIG_COLLECTION).doc(SPEND_CAP_CONFIG_DOC).get(), 'config');
    state.config = readConfig(snap.data());
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ step: 'config', decision: 'keep_cached', reason: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
  }
  state.configAtMs = nowMs;
  return state.config;
}

/** Настоящая недоступность Firestore (gRPC UNAVAILABLE) — единственный случай пропуска. */
function isFirestoreUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 14 || code === 'unavailable' || code === 'firestore/unavailable';
}

async function loadTotal(db: FirebaseFirestore.Firestore, dateKey: string, nowMs: number, limitCents: number): Promise<number> {
  const cached = state.totalCents + state.localSinceRead;
  // зачем (Ревизор 3.117): у порога кэш 45 с давал перелёт на 45 с вызовов всех инстансов — у края читаем раз в 10 с.
  const ttl = cached >= limitCents * NEAR_LIMIT_SHARE ? NEAR_LIMIT_TOTAL_TTL_MS : TOTAL_TTL_MS;
  if (state.totalDateKey === dateKey && nowMs - state.totalAtMs < ttl) return cached;
  const refs = Array.from({ length: SPEND_SHARD_COUNT }, (_, i) => db.collection(SPEND_DAILY_SHARDS_COLLECTION).doc(`${dateKey}_${i}`));
  const snaps = await withTimeout(db.getAll(...refs), 'total');
  state.totalCents = snaps.reduce((sum, snap) => sum + Number((snap.data() as { cents?: unknown } | undefined)?.cents ?? 0), 0);
  state.totalAtMs = nowMs;
  state.totalDateKey = dateKey;
  state.localSinceRead = 0;
  return state.totalCents;
}

/**
 * Резерв перед платным вызовом. Бросает HttpsError('resource-exhausted', 'daily_spend_cap'), если сегодня уже потрачено
 * ≥ порога или платное выключено; иначе прибавляет оценку к счётчику дня.
 */
export async function reserveDailySpend(input: Readonly<{
  fn: string;
  kind: SpendKind;
  model?: string;
  inTokens?: number;
  outTokens?: number;
  nowMs?: number;
  db?: FirebaseFirestore.Firestore;
}>): Promise<SpendReservation | null> {
  const nowMs = input.nowMs ?? Date.now();
  const dateKey = utcDateKey(nowMs);
  // зачем: в модульных тестах функций Firestore поднят без эмулятора — счётчик там не участвует, если тест не передал свою базу.
  if (!input.db && typeof process !== 'undefined' && process.env.JEST_WORKER_ID) return null;
  let db: FirebaseFirestore.Firestore;
  try {
    db = input.db ?? admin.firestore();
  } catch (error: unknown) {
    console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'fail_open', reason: 'firestore_unavailable', detail: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    return null;
  }
  const config = await loadConfig(db, nowMs);
  if (!config.enabled) return null;
  if (config.paidDisabled) {
    console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'refused', reason: 'paid_disabled', by: config.paidDisabledReason }));
    throw new HttpsError('resource-exhausted', 'daily_spend_cap');
  }
  const cents = config.estimateCentsByFn[input.fn] ?? estimateSpendCents(input);
  let total: number;
  try {
    total = await loadTotal(db, dateKey, nowMs, config.dailyLimitCents);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message.slice(0, 120) : String(error);
    if (isFirestoreUnavailable(error)) {
      console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'fail_open', reason: 'firestore_unavailable', detail }));
      return null;
    }
    if (state.totalDateKey !== dateKey) {
      // зачем: таймаут — не повод пропускать платный вызов вслепую; суммы дня в памяти нет — отказ «попробуйте ещё раз».
      console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'refused_busy', reason: 'total_read_failed_no_cache', detail }));
      throw new HttpsError('unavailable', 'spend_cap_busy');
    }
    total = state.totalCents + state.localSinceRead;
    console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'use_cached_total', reason: 'total_read_failed', detail, cents: Math.round(total * 100) / 100, ageMs: nowMs - state.totalAtMs }));
  }
  if (total + cents > config.dailyLimitCents) {
    console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'refused', reason: 'daily_limit', cents: Math.round(total * 100) / 100, limit: config.dailyLimitCents, date: dateKey }));
    throw new HttpsError('resource-exhausted', 'daily_spend_cap');
  }
  const shard = Math.floor(Math.random() * SPEND_SHARD_COUNT);
  try {
    await withTimeout(db.collection(SPEND_DAILY_SHARDS_COLLECTION).doc(`${dateKey}_${shard}`).set({
      date: dateKey,
      cents: admin.firestore.FieldValue.increment(cents),
      updatedAtMs: nowMs,
      expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + 40 * 24 * 60 * 60 * 1000),
    }, { merge: true }), 'increment');
    state.localSinceRead += cents;
  } catch (error: unknown) {
    // Порог уже проверен; не записали только счёт. Учитываем вызов в памяти инстанса, чтобы набег не потерялся совсем.
    state.localSinceRead += cents;
    console.warn(LOG, JSON.stringify({ fn: input.fn, decision: 'allowed_unrecorded', reason: 'increment_failed', cents, detail: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    return null;
  }
  return Object.freeze({ fn: input.fn, cents, dateKey });
}

/** Для выключателя и админки: поставить/снять «платное выключено». */
export async function setPaidDisabled(db: FirebaseFirestore.Firestore, disabled: boolean, reason: string, nowMs = Date.now()): Promise<void> {
  await db.collection(SPEND_CAP_CONFIG_COLLECTION).doc(SPEND_CAP_CONFIG_DOC).set({
    paidDisabled: disabled,
    paidDisabledReason: reason.slice(0, 120),
    paidDisabledAtMs: nowMs,
  }, { merge: true });
  state.configAtMs = 0;
  console.warn(LOG, JSON.stringify({ step: 'paid_disabled', value: disabled, reason }));
}
