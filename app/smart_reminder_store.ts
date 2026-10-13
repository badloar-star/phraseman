// ─── «Умное» напоминание — локальная история и состояние (Этап 1) ──────────────────────────────────────────────
// зачем (владелец 13.10, план SMART_REMINDER_TIME_DESIGN): минуты начала уроков и сессий копятся ТОЛЬКО на телефоне
// (политика §12), не синхронизируются и не уходят в Firestore. Один ключ истории (≤ 60 записей) и один ключ состояния.
// Журнал [SMART-REMINDER]: каждый ранний выход и каждый catch пишет причину (правило владельца).
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  applySmartReminderHysteresis,
  computeSmartReminderTime,
  formatReminderMinute,
  type ScheduledSmartTime,
  type SmartReminderEvent,
  type SmartReminderEventKind,
} from './smart_reminder_time';

export const SMART_REMINDER_ACTIVITY_KEY = 'smart_reminder_activity_v1';
export const SMART_REMINDER_STATE_KEY = 'smart_reminder_state_v1';

const MAX_EVENTS = 60;
const DEDUPE_MS = 30 * 60 * 1000;
const PUSH_OPEN_SESSION_WINDOW_MS = 2 * 60 * 1000;
const KEEP_MS = 28 * 24 * 60 * 60 * 1000;

let lastPushOpenAt = 0;
let writeChain: Promise<void> = Promise.resolve();

function localNow(nowMs: number): { minute: number; tzOffsetMin: number } {
  const d = new Date(nowMs);
  return { minute: d.getHours() * 60 + d.getMinutes(), tzOffsetMin: -d.getTimezoneOffset() };
}

function isEvent(v: unknown): v is SmartReminderEvent {
  const e = v as SmartReminderEvent;
  return !!e && typeof e.atMs === 'number' && typeof e.minute === 'number' && typeof e.tzOffsetMin === 'number'
    && (e.kind === 'lesson' || e.kind === 'session' || e.kind === 'push_open');
}

export async function readSmartReminderHistory(): Promise<SmartReminderEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(SMART_REMINDER_ACTIVITY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEvent) : [];
  } catch (e) {
    console.warn('[SMART-REMINDER] history:read_failed', e instanceof Error ? e.message : String(e));
    return [];
  }
}

/** Записать событие привычки. Открытия по нашему пушу помечаются, чтобы алгоритм не «закреплял» своё же время. */
export function recordSmartReminderEvent(kind: SmartReminderEventKind, nowMs: number = Date.now()): Promise<void> {
  // зачем: последовательная запись — урок и сессия могут прийти в один кадр, иначе одна затрёт другую.
  writeChain = writeChain.then(async () => {
    const started = Date.now();
    try {
      if (kind === 'push_open') lastPushOpenAt = nowMs;
      const history = await readSmartReminderHistory();
      let next = history.filter((e) => nowMs - e.atMs <= KEEP_MS && e.atMs <= nowMs + 60_000);
      if (kind === 'push_open') {
        // зачем: сессия, начатая нажатием на наш пуш, уже могла записаться раньше ответа — превращаем её в push_open.
        next = next.filter((e) => !(e.kind === 'session' && nowMs - e.atMs <= PUSH_OPEN_SESSION_WINDOW_MS));
      }
      if (kind === 'session' && nowMs - lastPushOpenAt <= PUSH_OPEN_SESSION_WINDOW_MS) {
        console.log(`[SMART-REMINDER] record:skip kind=session reason=opened_by_our_push ageMs=${nowMs - lastPushOpenAt}`);
        return;
      }
      const last = [...next].reverse().find((e) => e.kind === kind);
      if (last && nowMs - last.atMs < DEDUPE_MS && nowMs >= last.atMs) {
        console.log(`[SMART-REMINDER] record:skip kind=${kind} reason=dedupe_30min sinceMs=${nowMs - last.atMs}`);
        return;
      }
      const { minute, tzOffsetMin } = localNow(nowMs);
      next.push({ atMs: nowMs, minute, tzOffsetMin, kind });
      if (next.length > MAX_EVENTS) next = next.slice(next.length - MAX_EVENTS);
      await AsyncStorage.setItem(SMART_REMINDER_ACTIVITY_KEY, JSON.stringify(next));
      console.log(`[SMART-REMINDER] record kind=${kind} at=${formatReminderMinute(minute)} tz=${tzOffsetMin} stored=${next.length} tookMs=${Date.now() - started}`);
    } catch (e) {
      console.warn('[SMART-REMINDER] record:failed', kind, e instanceof Error ? e.message : String(e));
    }
  });
  return writeChain;
}

async function readState(): Promise<ScheduledSmartTime | null> {
  try {
    const raw = await AsyncStorage.getItem(SMART_REMINDER_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ScheduledSmartTime;
    return typeof s?.minute === 'number' && (s.source === 'smart' || s.source === 'fallback') && typeof s.changedAtMs === 'number' ? s : null;
  } catch (e) {
    console.warn('[SMART-REMINDER] state:read_failed', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Время для дней расписания в режиме «авто»: расчёт по истории + устойчивость. Считается при запуске (миллисекунды,
 * ≤ 60 записей). Состояние пишется только при смене — перепланировка тоже только при смене (решает вызывающий код).
 */
export async function resolveAutoReminderTime(nowMs: number = Date.now()): Promise<{ hour: number; minute: number; source: 'smart' | 'fallback'; changed: boolean }> {
  const started = Date.now();
  const history = await readSmartReminderHistory();
  const { tzOffsetMin } = localNow(nowMs);
  const decision = computeSmartReminderTime(history, nowMs, tzOffsetMin);
  console.log(
    `[SMART-REMINDER] compute events=${decision.events} days=${decision.distinctDays} tz=${tzOffsetMin}`
    + ` peak=${decision.peakMinute == null ? '-' : formatReminderMinute(decision.peakMinute)}`
    + ` confidence=${decision.confidence == null ? '-' : decision.confidence.toFixed(2)}`
    + ` → ${decision.source}:${decision.reason} ${formatReminderMinute(decision.minute)} clamp=${decision.clamp}`,
  );
  const prev = await readState();
  const step = applySmartReminderHysteresis(prev, decision, nowMs);
  if (step.changed) {
    try {
      await AsyncStorage.setItem(SMART_REMINDER_STATE_KEY, JSON.stringify({ minute: step.minute, source: step.source, changedAtMs: nowMs }));
    } catch (e) {
      console.warn('[SMART-REMINDER] state:write_failed', e instanceof Error ? e.message : String(e));
    }
  }
  console.log(
    `[SMART-REMINDER] decision prev=${prev ? `${prev.source}:${formatReminderMinute(prev.minute)}` : 'none'}`
    + ` next=${step.source}:${formatReminderMinute(step.minute)} step=${step.step} changed=${String(step.changed)} tookMs=${Date.now() - started}`,
  );
  return { hour: Math.floor(step.minute / 60), minute: step.minute % 60, source: step.source, changed: step.changed };
}
