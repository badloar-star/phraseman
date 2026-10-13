// ─── «Умное» время ежедневного напоминания — чистый расчёт (Этап 1) ───────────────────────────────────────────
// зачем (владелец 13.10, план docs/phraseman-2.0/SMART_REMINDER_TIME_DESIGN_2026-10-13.md, решение координатора):
// телефон сам видит, во сколько человек обычно начинает урок/сессию, и ставит напоминание за 45 мин до пика привычки.
// Только расчёт: без хранилища, сети и часов устройства — всё на входе, поэтому функции детерминированы и тестируемы.
// Данные никуда не уходят (политика §12). Ручное время человека сюда не попадает — его решает вызывающий код.

export type SmartReminderEventKind = 'lesson' | 'session' | 'push_open';

export interface SmartReminderEvent {
  /** Момент события, мс с эпохи. */
  readonly atMs: number;
  /** Минута суток по местному времени в момент события (0…1439). */
  readonly minute: number;
  /** Смещение пояса в момент события, минуты к востоку от UTC (Москва +180). */
  readonly tzOffsetMin: number;
  readonly kind: SmartReminderEventKind;
}

export type SmartReminderReason =
  | 'smart'
  | 'insufficient_data'
  | 'low_confidence'
  | 'morning_peak';

export interface SmartReminderDecision {
  readonly source: 'smart' | 'fallback';
  /** Минута суток напоминания (0…1439). */
  readonly minute: number;
  readonly reason: SmartReminderReason;
  readonly distinctDays: number;
  readonly events: number;
  readonly peakMinute: number | null;
  /** Доля веса в пике и соседних корзинах (0…1). */
  readonly confidence: number | null;
  /** Какое ограничение сработало после «пик − 45 мин». */
  readonly clamp: 'none' | 'late_cap' | 'night_cap' | 'early_floor';
}

export const SMART_REMINDER = Object.freeze({
  WINDOW_DAYS: 28,
  TZ_SHIFT_WINDOW_DAYS: 7,
  TZ_SHIFT_MIN: 120,
  MIN_DISTINCT_DAYS: 5,
  MIN_EVENTS: 7,
  HALF_LIFE_DAYS: 10,
  BIN_MIN: 30,
  LEAD_MIN: 45,
  EARLIEST_MIN: 9 * 60,
  LATEST_MIN: 19 * 60 + 45,
  MORNING_PEAK_FROM_MIN: 4 * 60,
  MORNING_PEAK_BEFORE_MIN: 9 * 60 + 45,
  CONFIDENCE_MIN: 0.25,
  // зачем (решение координатора 13.10): фолбэк для новых — 20:00, как в образце настроек.
  FALLBACK_MIN: 20 * 60,
  ROUND_MIN: 5,
  HYSTERESIS_MIN_DELTA: 30,
  HYSTERESIS_MIN_DAYS: 3,
  MAX_STEP_MIN: 60,
});

const DAY_MS = 24 * 60 * 60 * 1000;
const BINS = (24 * 60) / SMART_REMINDER.BIN_MIN;
const KIND_WEIGHT: Readonly<Record<SmartReminderEventKind, number>> = { lesson: 2, session: 1, push_open: 0 };

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const roundTo = (minute: number, step: number): number => mod(Math.round(minute / step) * step, 24 * 60);

/** День события по местному времени — для подсчёта «разных дней». */
function localDay(e: SmartReminderEvent): number {
  return Math.floor((e.atMs + e.tzOffsetMin * 60_000) / DAY_MS);
}

/** Взвешенное круговое среднее минут (23:50 и 00:10 → около полуночи, а не полдень). */
function circularMeanMinute(items: ReadonlyArray<{ minute: number; w: number }>): number {
  let x = 0;
  let y = 0;
  for (const it of items) {
    const a = (it.minute / (24 * 60)) * 2 * Math.PI;
    x += Math.cos(a) * it.w;
    y += Math.sin(a) * it.w;
  }
  const ang = Math.atan2(y, x);
  return mod(Math.round((ang / (2 * Math.PI)) * 24 * 60), 24 * 60);
}

function fallback(reason: SmartReminderReason, distinctDays: number, events: number, peak: number | null, conf: number | null): SmartReminderDecision {
  return { source: 'fallback', minute: SMART_REMINDER.FALLBACK_MIN, reason, distinctDays, events, peakMinute: peak, confidence: conf, clamp: 'none' };
}

/** Время напоминания по истории событий. Текущее смещение пояса нужно, чтобы после переезда учитывать только свежие дни. */
export function computeSmartReminderTime(
  history: ReadonlyArray<SmartReminderEvent>,
  nowMs: number,
  nowTzOffsetMin: number,
): SmartReminderDecision {
  const C = SMART_REMINDER;
  const inWindow = history.filter((e) => e.atMs <= nowMs + 60_000 && nowMs - e.atMs <= C.WINDOW_DAYS * DAY_MS && KIND_WEIGHT[e.kind] > 0);
  // зачем: сменился пояс на 2+ часа — старая привычка была «в другом времени суток», берём только последние 7 дней.
  const tzShifted = inWindow.some((e) => Math.abs(e.tzOffsetMin - nowTzOffsetMin) >= C.TZ_SHIFT_MIN);
  const used = tzShifted ? inWindow.filter((e) => nowMs - e.atMs <= C.TZ_SHIFT_WINDOW_DAYS * DAY_MS) : inWindow;
  const distinctDays = new Set(used.map(localDay)).size;
  if (distinctDays < C.MIN_DISTINCT_DAYS || used.length < C.MIN_EVENTS) return fallback('insufficient_data', distinctDays, used.length, null, null);

  const weighted = used.map((e) => ({
    minute: mod(e.minute, 24 * 60),
    w: KIND_WEIGHT[e.kind] * Math.pow(0.5, Math.max(0, nowMs - e.atMs) / DAY_MS / C.HALF_LIFE_DAYS),
  }));
  const bins = new Array<number>(BINS).fill(0);
  for (const it of weighted) bins[Math.floor(it.minute / C.BIN_MIN) % BINS] += it.w;
  const total = bins.reduce((a, b) => a + b, 0);
  const smooth = bins.map((v, i) => v + 0.5 * (bins[mod(i - 1, BINS)] + bins[mod(i + 1, BINS)]));
  let peakBin = 0;
  for (let i = 1; i < BINS; i++) if (smooth[i] > smooth[peakBin]) peakBin = i;
  const near = new Set([mod(peakBin - 1, BINS), peakBin, mod(peakBin + 1, BINS)]);
  const confidence = total > 0 ? [...near].reduce((a, i) => a + bins[i], 0) / total : 0;
  const peakMinute = circularMeanMinute(weighted.filter((it) => near.has(Math.floor(it.minute / C.BIN_MIN) % BINS)));
  if (confidence < C.CONFIDENCE_MIN) return fallback('low_confidence', distinctDays, used.length, peakMinute, confidence);
  // зачем: утренний человек — утро уже занято «Фразой дня» 07:00, раньше 09:00 слать нельзя (тихие часы).
  if (peakMinute >= C.MORNING_PEAK_FROM_MIN && peakMinute < C.MORNING_PEAK_BEFORE_MIN) {
    return fallback('morning_peak', distinctDays, used.length, peakMinute, confidence);
  }

  const raw = mod(peakMinute - C.LEAD_MIN, 24 * 60);
  let target = raw;
  let clamp: SmartReminderDecision['clamp'] = 'none';
  // зачем: позже 19:45 нельзя — пуши 20:10/20:20 и «серия под угрозой» 21:00; ночной пик (после полуночи) — тоже вечерняя граница.
  if (raw > C.LATEST_MIN) { target = C.LATEST_MIN; clamp = 'late_cap'; }
  else if (raw < C.MORNING_PEAK_FROM_MIN) { target = C.LATEST_MIN; clamp = 'night_cap'; }
  else if (raw < C.EARLIEST_MIN) { target = C.EARLIEST_MIN; clamp = 'early_floor'; }
  target = Math.min(C.LATEST_MIN, Math.max(C.EARLIEST_MIN, roundTo(target, C.ROUND_MIN)));
  return { source: 'smart', minute: target, reason: 'smart', distinctDays, events: used.length, peakMinute, confidence, clamp };
}

export interface ScheduledSmartTime {
  readonly minute: number;
  readonly source: 'smart' | 'fallback';
  readonly changedAtMs: number;
}

export type SmartReminderStep = 'first' | 'unchanged' | 'below_threshold' | 'too_soon' | 'changed' | 'step_limited' | 'from_fallback' | 'to_fallback_kept';

/** Устойчивость: время не «прыгает» — порог 30 мин, не чаще раза в 3 дня, шаг ≤ 60 мин. Из фолбэка в умное — сразу. */
export function applySmartReminderHysteresis(
  prev: ScheduledSmartTime | null,
  next: SmartReminderDecision,
  nowMs: number,
): { readonly minute: number; readonly source: 'smart' | 'fallback'; readonly step: SmartReminderStep; readonly changed: boolean } {
  const C = SMART_REMINDER;
  if (!prev) return { minute: next.minute, source: next.source, step: 'first', changed: true };
  if (prev.minute === next.minute && prev.source === next.source) return { minute: prev.minute, source: prev.source, step: 'unchanged', changed: false };
  // зачем: данные «устарели» (окно 28 дней опустело) — умное время не сбрасываем на фолбэк, человек к нему привык.
  if (next.source === 'fallback' && prev.source === 'smart') return { minute: prev.minute, source: prev.source, step: 'to_fallback_kept', changed: false };
  if (prev.source === 'fallback' && next.source === 'smart') return { minute: next.minute, source: 'smart', step: 'from_fallback', changed: true };
  const delta = next.minute - prev.minute;
  if (Math.abs(delta) < C.HYSTERESIS_MIN_DELTA) return { minute: prev.minute, source: prev.source, step: 'below_threshold', changed: false };
  if (nowMs - prev.changedAtMs < C.HYSTERESIS_MIN_DAYS * DAY_MS) return { minute: prev.minute, source: prev.source, step: 'too_soon', changed: false };
  if (Math.abs(delta) > C.MAX_STEP_MIN) {
    return { minute: prev.minute + Math.sign(delta) * C.MAX_STEP_MIN, source: 'smart', step: 'step_limited', changed: true };
  }
  return { minute: next.minute, source: next.source, step: 'changed', changed: true };
}

export const formatReminderMinute = (minute: number): string =>
  `${String(Math.floor(mod(minute, 1440) / 60)).padStart(2, '0')}:${String(mod(minute, 60)).padStart(2, '0')}`;
