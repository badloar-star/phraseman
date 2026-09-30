export type DialogQuotaObservation = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
}>;

const safeNonNegative = (value: unknown): number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
);

const positiveOr = (value: unknown, fallback: number): number => {
  const normalized = safeNonNegative(value);
  return normalized > 0 ? normalized : fallback;
};

function utcMonthKey(nowMs: number): string {
  const now = new Date(nowMs);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Converts either the current calendar-month schema or the legacy daily
 * schema into one monthly bucket. An active legacy bucket keeps only the
 * unused paid part: free usage already made today counts against the new
 * monthly allowance, while paid replies already consumed are not re-granted.
 */
function normalizeMonthlyQuota(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  nextResetAtMs: (nowMs: number) => number,
): Readonly<{
  periodKey: string;
  monthlyCount: number;
  extraCapThisMonth: number;
  resetAtMs: number;
}> {
  const periodKey = utcMonthKey(nowMs);
  const priorResetAtMs = safeNonNegative(current.resetAtMs);
  const currentMonthlyPeriod = current.quotaPeriod === 'calendar_month'
    && current.periodKey === periodKey
    && nowMs < priorResetAtMs;
  if (currentMonthlyPeriod) {
    return Object.freeze({
      periodKey,
      monthlyCount: safeNonNegative(current.monthlyCount ?? current.dailyCount),
      extraCapThisMonth: safeNonNegative(current.extraCapThisMonth ?? current.extraCapToday),
      resetAtMs: priorResetAtMs,
    });
  }

  const activeLegacyDay = current.quotaPeriod !== 'calendar_month' && nowMs < priorResetAtMs;
  if (activeLegacyDay) {
    const legacyDailyCap = positiveOr(current.dailyCap, 10);
    const legacyCount = safeNonNegative(current.dailyCount);
    const legacyExtra = safeNonNegative(current.extraCapToday);
    const paidRepliesUsed = Math.max(0, legacyCount - legacyDailyCap);
    return Object.freeze({
      periodKey,
      monthlyCount: Math.min(legacyCount, legacyDailyCap),
      extraCapThisMonth: Math.max(0, legacyExtra - paidRepliesUsed),
      resetAtMs: nextResetAtMs(nowMs),
    });
  }

  return Object.freeze({
    periodKey,
    monthlyCount: 0,
    extraCapThisMonth: 0,
    resetAtMs: nextResetAtMs(nowMs),
  });
}

export function currentDialogMonthlyQuota(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  nextResetAtMs: (nowMs: number) => number,
  monthlyCapInput = 30,
): Readonly<{
  quotaPeriod: 'calendar_month';
  periodKey: string;
  monthlyCap: number;
  monthlyCount: number;
  extraCapThisMonth: number;
  dailyCap: number;
  dailyCount: number;
  extraCapToday: number;
  resetAtMs: number;
}> {
  const normalized = normalizeMonthlyQuota(current, nowMs, nextResetAtMs);
  const storedMonthlyCap = positiveOr(current.monthlyCap, 0);
  const monthlyCap = storedMonthlyCap || safeNonNegative(monthlyCapInput);
  return Object.freeze({
    quotaPeriod: 'calendar_month' as const,
    periodKey: normalized.periodKey,
    monthlyCap,
    monthlyCount: normalized.monthlyCount,
    extraCapThisMonth: normalized.extraCapThisMonth,
    dailyCap: monthlyCap,
    dailyCount: normalized.monthlyCount,
    extraCapToday: normalized.extraCapThisMonth,
    resetAtMs: normalized.resetAtMs,
  });
}

export function nextDialogQuotaConsumption(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  monthlyCapInput: number,
  nextResetAtMs: (nowMs: number) => number,
): Readonly<{
  exhausted: boolean;
  quotaPeriod: 'calendar_month';
  periodKey: string;
  monthlyCap: number;
  monthlyCount: number;
  extraCapThisMonth: number;
  /** Rollback aliases: old servers read the same monthly values. */
  dailyCount: number;
  extraCapToday: number;
  resetAtMs: number;
  quotaVersion: number;
  observation: DialogQuotaObservation;
}> {
  const normalized = currentDialogMonthlyQuota(current, nowMs, nextResetAtMs, monthlyCapInput);
  const monthlyCap = safeNonNegative(monthlyCapInput);
  const effectiveCap = monthlyCap + normalized.extraCapThisMonth;
  const quotaVersion = safeNonNegative(current.quotaVersion) + 1;
  const exhausted = normalized.monthlyCount >= effectiveCap;
  const nextMonthlyCount = exhausted ? normalized.monthlyCount : normalized.monthlyCount + 1;
  return Object.freeze({
    exhausted,
    quotaPeriod: 'calendar_month' as const,
    periodKey: normalized.periodKey,
    monthlyCap,
    monthlyCount: nextMonthlyCount,
    extraCapThisMonth: normalized.extraCapThisMonth,
    dailyCount: nextMonthlyCount,
    extraCapToday: normalized.extraCapThisMonth,
    resetAtMs: normalized.resetAtMs,
    quotaVersion,
    observation: Object.freeze({
      remainingQuota: Math.max(0, effectiveCap - nextMonthlyCount),
      resetAtMs: normalized.resetAtMs,
      quotaVersion,
    }),
  });
}

export function nextDialogQuotaRelease(
  current: Readonly<Record<string, unknown>>,
  expectedResetAtMs: number,
): Readonly<{ monthlyCount: number; dailyCount: number; quotaVersion: number }> | null {
  const resetAtMs = safeNonNegative(current.resetAtMs);
  const monthlyCount = safeNonNegative(current.monthlyCount ?? current.dailyCount);
  if (!Number.isSafeInteger(expectedResetAtMs) || expectedResetAtMs <= 0
    || resetAtMs !== expectedResetAtMs || monthlyCount <= 0) return null;
  return Object.freeze({
    monthlyCount: monthlyCount - 1,
    dailyCount: monthlyCount - 1,
    quotaVersion: safeNonNegative(current.quotaVersion) + 1,
  });
}

/**
 * D123 (владелец 2026-09-30): безлимит Plus в Диалогах получает ТИХИЙ серверный
 * потолок — 300 ответов за UTC-сутки против злоупотреблений. На экране по-прежнему
 * «безлимит»; клиент узнаёт о потолке только по коду отказа.
 *
 * зачем именно так: счётчик живёт в ТОМ ЖЕ документе квоты (premium_dialog_quotas),
 * что и месячная квота Free, — в двух полях с ключом суток. Новых коллекций и
 * документов нет; Free-путь не делает ни одного лишнего чтения. Для Plus в старом
 * пути это одна транзакция (1 чтение + 1 запись) на ответ, в Dialogue V2 — ноль
 * лишних операций: транзакция квитанций хода там уже есть.
 */
export const PLUS_DIALOG_DAILY_REPLY_CAP = 300;
export const PLUS_DIALOG_DAILY_CAP_REASON = 'plus_daily_cap';
export const PLUS_DIALOG_DAY_KEY_FIELD = 'plusReplyDayKey';
export const PLUS_DIALOG_DAY_COUNT_FIELD = 'plusReplyDayCount';

export function utcDayKey(nowMs: number): string {
  const now = new Date(nowMs);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Следующее состояние суточного счётчика Plus. Новые сутки обнуляют счётчик;
 * исчерпанный потолок не двигает счётчик (повтор отказа ничего не пишет сверх).
 */
export function nextPlusDailyReplyConsumption(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  capInput: number = PLUS_DIALOG_DAILY_REPLY_CAP,
): Readonly<{ exhausted: boolean; dayKey: string; count: number; cap: number }> {
  const dayKey = utcDayKey(nowMs);
  const cap = safeNonNegative(capInput);
  const sameDay = current[PLUS_DIALOG_DAY_KEY_FIELD] === dayKey;
  const used = sameDay ? safeNonNegative(current[PLUS_DIALOG_DAY_COUNT_FIELD]) : 0;
  const exhausted = used >= cap;
  return Object.freeze({ exhausted, dayKey, count: exhausted ? used : used + 1, cap });
}

export const DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD = 'dialogueV2TurnQuotaReceiptsV1';
const DIALOGUE_V2_TURN_QUOTA_RECEIPT_TTL_MS = 25 * 60 * 60 * 1_000;
const DIALOGUE_V2_TURN_QUOTA_MAX_RECEIPTS = 1_600;
const V2_TURN_QUOTA_KEY_RE = /^[a-f0-9]{64}$/;

type DialogueV2TurnQuotaReceipt = Readonly<{
  key: string;
  state: 'reserved' | 'released';
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
  consumed: boolean;
  createdAtMs: number;
  expiresAtMs: number;
}>;

export type DialogueV2TurnQuotaReservation = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
  consumed: boolean;
}>;

function exactV2TurnQuotaReceipts(
  value: unknown,
  nowMs: number,
): readonly DialogueV2TurnQuotaReceipt[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > DIALOGUE_V2_TURN_QUOTA_MAX_RECEIPTS) {
    throw new Error('dialogue_v2_turn_quota_receipts_invalid');
  }
  const receipts: DialogueV2TurnQuotaReceipt[] = [];
  const keys = new Set<string>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('dialogue_v2_turn_quota_receipts_invalid');
    }
    const receipt = candidate as Record<string, unknown>;
    const receiptKeys = Object.keys(receipt);
    const expected = [
      'key', 'state', 'remainingQuota', 'resetAtMs', 'quotaVersion',
      'consumed', 'createdAtMs', 'expiresAtMs',
    ];
    if (receiptKeys.length !== expected.length
      || receiptKeys.some((key) => !expected.includes(key))
      || typeof receipt.key !== 'string'
      || !V2_TURN_QUOTA_KEY_RE.test(receipt.key)
      || keys.has(receipt.key)
      || (receipt.state !== 'reserved' && receipt.state !== 'released')
      || !Number.isSafeInteger(receipt.remainingQuota) || Number(receipt.remainingQuota) < 0
      || !Number.isSafeInteger(receipt.resetAtMs) || Number(receipt.resetAtMs) <= 0
      || !Number.isSafeInteger(receipt.quotaVersion) || Number(receipt.quotaVersion) <= 0
      || typeof receipt.consumed !== 'boolean'
      || !Number.isSafeInteger(receipt.createdAtMs) || Number(receipt.createdAtMs) <= 0
      || !Number.isSafeInteger(receipt.expiresAtMs)
      || Number(receipt.expiresAtMs) !== Number(receipt.createdAtMs)
        + DIALOGUE_V2_TURN_QUOTA_RECEIPT_TTL_MS) {
      throw new Error('dialogue_v2_turn_quota_receipts_invalid');
    }
    keys.add(receipt.key);
    if (Number(receipt.expiresAtMs) <= nowMs) continue;
    receipts.push(Object.freeze({
      key: receipt.key,
      state: receipt.state,
      remainingQuota: Number(receipt.remainingQuota),
      resetAtMs: Number(receipt.resetAtMs),
      quotaVersion: Number(receipt.quotaVersion),
      consumed: receipt.consumed,
      createdAtMs: Number(receipt.createdAtMs),
      expiresAtMs: Number(receipt.expiresAtMs),
    }));
  }
  return Object.freeze(receipts);
}

function receiptReservation(
  receipt: DialogueV2TurnQuotaReceipt,
): DialogueV2TurnQuotaReservation {
  return Object.freeze({
    remainingQuota: receipt.remainingQuota,
    resetAtMs: receipt.resetAtMs,
    quotaVersion: receipt.quotaVersion,
    consumed: receipt.consumed,
  });
}

export function nextDialogueV2TurnQuotaReservation(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  monthlyCap: number,
  isPremium: boolean,
  turnKey: string,
  nextResetAtMs: (nowMs: number) => number,
  plusDailyCap: number = PLUS_DIALOG_DAILY_REPLY_CAP,
): Readonly<{
  exhausted: boolean;
  /** D123: отказ из-за суточного потолка Plus, а не месячной квоты Free. */
  plusDailyCapReached: boolean;
  replayed: boolean;
  reservation: DialogueV2TurnQuotaReservation;
  document: Readonly<Record<string, unknown>>;
}> {
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0
    || !V2_TURN_QUOTA_KEY_RE.test(turnKey)) {
    throw new Error('dialogue_v2_turn_quota_input_invalid');
  }
  const parsed = exactV2TurnQuotaReceipts(
    current[DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD],
    nowMs,
  );
  const existing = parsed.find((receipt) => receipt.key === turnKey);
  if (existing?.state === 'reserved') {
    return Object.freeze({
      exhausted: false,
      plusDailyCapReached: false,
      replayed: true,
      reservation: receiptReservation(existing),
      document: Object.freeze({
        ...current,
        [DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD]: parsed,
      }),
    });
  }
  const retained = parsed.filter((receipt) => receipt.key !== turnKey);
  if (retained.length >= DIALOGUE_V2_TURN_QUOTA_MAX_RECEIPTS) {
    throw new Error('dialogue_v2_turn_quota_receipts_full');
  }

  const quota = isPremium
    ? null
    : nextDialogQuotaConsumption(current, nowMs, monthlyCap, nextResetAtMs);
  const reservation: DialogueV2TurnQuotaReservation = quota
    ? Object.freeze({ ...quota.observation, consumed: !quota.exhausted })
    : Object.freeze({
      remainingQuota: 0,
      resetAtMs: nextResetAtMs(nowMs),
      quotaVersion: Math.max(1, safeNonNegative(current.quotaVersion)),
      consumed: false,
    });
  // зачем (D123): повтор того же хода (replay выше) потолок не тратит — считаем
  // только новый ход Plus.
  const plus = isPremium ? nextPlusDailyReplyConsumption(current, nowMs, plusDailyCap) : null;
  const plusDailyCapReached = plus?.exhausted === true;
  const exhausted = quota?.exhausted === true || plusDailyCapReached;
  const receipt = Object.freeze({
    key: turnKey,
    state: 'reserved' as const,
    ...reservation,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + DIALOGUE_V2_TURN_QUOTA_RECEIPT_TTL_MS,
  });
  const document = Object.freeze({
    ...current,
    ...(quota ? {
      quotaPeriod: quota.quotaPeriod,
      periodKey: quota.periodKey,
      monthlyCap: quota.monthlyCap,
      monthlyCount: quota.monthlyCount,
      extraCapThisMonth: quota.extraCapThisMonth,
      dailyCap: quota.monthlyCap,
      dailyCount: quota.dailyCount,
      extraCapToday: quota.extraCapToday,
      resetAtMs: quota.resetAtMs,
      quotaVersion: quota.quotaVersion,
    } : {}),
    ...(plus && !plus.exhausted ? {
      [PLUS_DIALOG_DAY_KEY_FIELD]: plus.dayKey,
      [PLUS_DIALOG_DAY_COUNT_FIELD]: plus.count,
    } : {}),
    [DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD]: exhausted
      ? retained
      : [...retained, receipt],
  });
  return Object.freeze({ exhausted, plusDailyCapReached, replayed: false, reservation, document });
}

export function nextDialogueV2TurnQuotaRelease(
  current: Readonly<Record<string, unknown>>,
  turnKey: string,
  expectedResetAtMs: number,
): Readonly<{ document: Readonly<Record<string, unknown>> }> | null {
  if (!V2_TURN_QUOTA_KEY_RE.test(turnKey)) return null;
  const receipts = exactV2TurnQuotaReceipts(
    current[DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD],
    1,
  );
  const receipt = receipts.find((candidate) => candidate.key === turnKey);
  if (!receipt || receipt.state !== 'reserved'
    || receipt.resetAtMs !== expectedResetAtMs) return null;
  const quotaRelease = receipt.consumed
    ? nextDialogQuotaRelease(current, expectedResetAtMs)
    : Object.freeze({
      monthlyCount: safeNonNegative(current.monthlyCount ?? current.dailyCount),
      dailyCount: safeNonNegative(current.monthlyCount ?? current.dailyCount),
      quotaVersion: safeNonNegative(current.quotaVersion),
    });
  if (!quotaRelease) return null;
  const nextReceipts = receipts.map((candidate) => (
    candidate.key === turnKey
      ? Object.freeze({ ...candidate, state: 'released' as const })
      : candidate
  ));
  return Object.freeze({
    document: Object.freeze({
      ...current,
      monthlyCount: quotaRelease.monthlyCount,
      dailyCount: quotaRelease.dailyCount,
      quotaVersion: quotaRelease.quotaVersion,
      [DIALOGUE_V2_TURN_QUOTA_RECEIPTS_FIELD]: nextReceipts,
    }),
  });
}
