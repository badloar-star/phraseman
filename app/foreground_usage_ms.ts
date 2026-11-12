import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { recordSmartReminderEvent } from './smart_reminder_store';
import { getLocalDayKey } from './local_date';

const STORAGE_KEY = 'phraseman_foreground_usage_ms_v1';
/**
 * Местный календарный день устройства → миллисекунды только в foreground (активное окно).
 * зачем (координатор 12.11, обход экранов): раньше день брался по UTC, а экран серии и строки недели ищут дни по местному
 * календарю (app/local_date.ts) — у поясов UTC+N время после местной полуночи уходило во «вчера», у UTC−N вечер — в «завтра».
 * Формат ключа тот же (YYYY-MM-DD): старые записи читаются как есть, уже накопленное по старым дням не перераскладывается.
 */
const DAILY_STORAGE_KEY = 'phraseman_foreground_daily_ms_v1';
const LOG = '[WEEK-TIME]';
const FLUSH_INTERVAL_MS = 5 * 60_000;
/** Не начислять больше за один интервал (защита от скачков часов). */
const MAX_CHUNK_MS = FLUSH_INTERVAL_MS + 5_000;
const MAX_DAILY_KEYS = 500;

let activeSince: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastFlushAt: number | null = null;

async function readTotal(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return Math.max(0, parseInt(v || '0', 10) || 0);
  } catch (e) {
    DebugLogger.warn(LOG, `общее время не прочитано — считаем 0: ${e instanceof Error ? e.message : String(e)}`);
    return 0;
  }
}

/**
 * Конец куска [start, endTs), лежащего в одном местном дне. Граница суток ищется той же функцией дня (getLocalDayKey), что пишет ключ, —
 * один календарь для ключа и разреза, переходы на летнее время учтены сами. Обычный кусок (≤ 5 мин) полночь не пересекает — поиска нет.
 */
function localDayChunkEnd(start: number, endTs: number): number {
  const key = getLocalDayKey(new Date(start));
  if (getLocalDayKey(new Date(endTs - 1)) === key) return endTs;
  let lo = start;
  let hi = endTs - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (getLocalDayKey(new Date(mid)) === key) lo = mid;
    else hi = mid;
  }
  return hi;
}

async function readDailyMap(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(n) && n > 0) out[k] = Math.min(n, 24 * 60 * 60 * 1000);
    }
    return out;
  } catch (e) {
    DebugLogger.warn(LOG, `время по дням не прочитано — пустая карта: ${e instanceof Error ? e.message : String(e)}`);
    return {};
  }
}

function pruneDailyMap(map: Record<string, number>): Record<string, number> {
  const keys = Object.keys(map).sort();
  if (keys.length <= MAX_DAILY_KEYS) return map;
  const drop = keys.length - MAX_DAILY_KEYS;
  const next: Record<string, number> = {};
  for (let i = drop; i < keys.length; i++) {
    const k = keys[i]!;
    next[k] = map[k]!;
  }
  return next;
}

/** Раскладывает интервал [rangeStart, rangeStart + deltaMs) по местным календарным дням устройства. */
async function mergeDeltaIntoDailyBuckets(deltaMs: number, rangeStart: number): Promise<void> {
  if (deltaMs < 1000) return;
  const capped = Math.min(deltaMs, 48 * 60 * 60 * 1000);
  const endTs = rangeStart + capped;
  const map = await readDailyMap();
  let t = rangeStart;
  while (t < endTs) {
    const dayKey = getLocalDayKey(new Date(t));
    const chunkEnd = localDayChunkEnd(t, endTs);
    const chunk = chunkEnd - t;
    if (chunk > 0) {
      map[dayKey] = Math.max(0, map[dayKey] ?? 0) + chunk;
    }
    t = chunkEnd;
  }
  const pruned = pruneDailyMap(map);
  try {
    await AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(pruned));
  } catch (e) {
      // 
      DebugLogger.error('foreground_usage_ms:pruned', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function addDelta(delta: number, rangeStart: number): Promise<number> {
  if (delta <= 0) return readTotal();
  const capped = Math.min(delta, 48 * 60 * 60 * 1000);
  const cur = await readTotal();
  const next = cur + capped;
  let persisted = false;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
    persisted = true;
  } catch (e) {
      // 
      DebugLogger.error('foreground_usage_ms:persisted', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  await mergeDeltaIntoDailyBuckets(capped, rangeStart);
  if (persisted) emitAppEvent('foreground_usage_changed', { totalMs: next });
  return next;
}

function flushOpenSession(): void {
  if (activeSince == null) return;
  const now = Date.now();
  const base = lastFlushAt ?? activeSince;
  const delta = Math.min(now - base, MAX_CHUNK_MS);
  if (delta >= 1000) {
    void addDelta(delta, base);
  }
  lastFlushAt = now;
}

function onAppState(state: AppStateStatus): void {
  if (state === 'active') {
    const now = Date.now();
    // зачем (умное напоминание, владелец 13.10): начало сессии — сигнал привычки (вес 1); повтор в 30 мин и открытие по нашему
    // пушу хранилище отбрасывает само. Только локально, без сети.
    void recordSmartReminderEvent('session', now);
    activeSince = now;
    lastFlushAt = now;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(flushOpenSession, FLUSH_INTERVAL_MS);
    return;
  }
  if (state === 'background' || state === 'inactive') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    flushOpenSession();
    activeSince = null;
    lastFlushAt = null;
  }
}

/** Суммарное время в foreground (мс), для подсказок и аналитики. */
export async function getForegroundUsageMs(): Promise<number> {
  return readTotal();
}

/** Посуточное время в foreground (мс), ключ — местный календарный день `YYYY-MM-DD` (записи до 12.11.2026 — по UTC-дню). */
export async function getForegroundDailyMsMap(): Promise<Record<string, number>> {
  return readDailyMap();
}

/**
 * Один раз на старте приложения: учитываем время пока приложение открыто
 * (интервал + сброс при уходе в фон).
 */
export function installForegroundUsageMsTracker(): () => void {
  const sub = AppState.addEventListener('change', onAppState);
  if (AppState.currentState === 'active') {
    onAppState('active');
  }
  return () => {
    sub.remove();
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    flushOpenSession();
    activeSince = null;
    lastFlushAt = null;
  };
}
