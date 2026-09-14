export type RevenueQuotaWindowObservation = Readonly<{
  period: string;
  timeZone: string;
  resetAt: number;
  observedAtMs: number;
}>;

export type RevenueQuotaDailyWindow = RevenueQuotaWindowObservation & Readonly<{
  effectiveNowMs: number;
}>;

type LocalDate = Readonly<{ year: number; month: number; day: number }>;

export function canonicalizeRevenueQuotaTimeZone(value: string): string {
  const candidate = value.trim();
  try {
    if (!candidate) throw new Error('empty');
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    throw new Error('revenue_quota_timezone_invalid');
  }
}

function localDateAt(epochMs: number, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    if (!Number.isSafeInteger(value)) throw new Error('revenue_quota_calendar_invalid');
    return value;
  };
  return Object.freeze({ year: read('year'), month: read('month'), day: read('day') });
}

function dateKey(value: LocalDate): number {
  return value.year * 10_000 + value.month * 100 + value.day;
}

function periodFor(value: LocalDate, timeZone: string): string {
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}@${timeZone}`;
}

export function nextLocalMidnightMs(nowMs: number, rawTimeZone: string): number {
  if (!Number.isFinite(nowMs)) throw new Error('revenue_quota_time_invalid');
  const timeZone = canonicalizeRevenueQuotaTimeZone(rawTimeZone);
  const current = localDateAt(nowMs, timeZone);
  const nextUtcDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const target: LocalDate = Object.freeze({
    year: nextUtcDate.getUTCFullYear(),
    month: nextUtcDate.getUTCMonth() + 1,
    day: nextUtcDate.getUTCDate(),
  });
  const targetKey = dateKey(target);

  // Time-zone offsets and DST make a fixed +24h wrong. Find the first epoch
  // whose formatted local calendar date is the target date.
  let low = Math.floor(nowMs) + 1;
  let high = Math.floor(nowMs) + 48 * 60 * 60 * 1000;
  if (dateKey(localDateAt(high, timeZone)) < targetKey) {
    throw new Error('revenue_quota_midnight_not_found');
  }
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (dateKey(localDateAt(middle, timeZone)) >= targetKey) high = middle;
    else low = middle + 1;
  }
  return low;
}

function isValidObservation(value: RevenueQuotaWindowObservation): boolean {
  return typeof value.period === 'string' && value.period.length > 0
    && typeof value.timeZone === 'string' && value.timeZone.length > 0
    && Number.isFinite(value.resetAt) && value.resetAt > 0
    && Number.isFinite(value.observedAtMs) && value.observedAtMs >= 0;
}

export function resolveRevenueQuotaDailyWindow(input: Readonly<{
  nowMs: number;
  requestedTimeZone: string;
  observations: readonly RevenueQuotaWindowObservation[];
}>): RevenueQuotaDailyWindow {
  if (!Number.isFinite(input.nowMs)) throw new Error('revenue_quota_time_invalid');
  const valid = input.observations.filter(isValidObservation);
  const effectiveNowMs = Math.max(input.nowMs, ...valid.map((item) => item.observedAtMs));
  const active = [...valid]
    .filter((item) => effectiveNowMs < item.resetAt)
    .sort((left, right) => right.observedAtMs - left.observedAtMs)[0];
  if (active) return Object.freeze({ ...active, effectiveNowMs });

  const timeZone = canonicalizeRevenueQuotaTimeZone(input.requestedTimeZone);
  const localDate = localDateAt(effectiveNowMs, timeZone);
  return Object.freeze({
    period: periodFor(localDate, timeZone),
    timeZone,
    resetAt: nextLocalMidnightMs(effectiveNowMs, timeZone),
    observedAtMs: effectiveNowMs,
    effectiveNowMs,
  });
}

export default function __RouteShim() {
  return null;
}
