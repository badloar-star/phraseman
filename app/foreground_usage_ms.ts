import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

const STORAGE_KEY = 'phraseman_foreground_usage_ms_v1';
/** UTC-календарный день → миллисекунды только в foreground (активное окно). */
const DAILY_STORAGE_KEY = 'phraseman_foreground_daily_ms_v1';
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
  } catch {
    return 0;
  }
}

function utcDateKeyFromTs(ts: number): string {
  return new Date(ts).toISOString().split('T')[0]!;
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
  } catch {
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

/** Раскладывает интервал [rangeStart, rangeStart + deltaMs) по UTC-дням. */
async function mergeDeltaIntoDailyBuckets(deltaMs: number, rangeStart: number): Promise<void> {
  if (deltaMs < 1000) return;
  const capped = Math.min(deltaMs, 48 * 60 * 60 * 1000);
  const endTs = rangeStart + capped;
  const map = await readDailyMap();
  let t = rangeStart;
  while (t < endTs) {
    const dayKey = utcDateKeyFromTs(t);
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const da = d.getUTCDate();
    const nextMidnight = Date.UTC(y, mo, da + 1);
    const chunkEnd = Math.min(endTs, nextMidnight);
    const chunk = chunkEnd - t;
    if (chunk > 0) {
      map[dayKey] = Math.max(0, map[dayKey] ?? 0) + chunk;
    }
    t = chunkEnd;
  }
  const pruned = pruneDailyMap(map);
  try {
    await AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(pruned));
  } catch { /* */ }
}

async function addDelta(delta: number, rangeStart: number): Promise<number> {
  if (delta <= 0) return readTotal();
  const capped = Math.min(delta, 48 * 60 * 60 * 1000);
  const cur = await readTotal();
  const next = cur + capped;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  } catch { /* */ }
  await mergeDeltaIntoDailyBuckets(capped, rangeStart);
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

/** Посуточное время в foreground (мс), ключ даты `YYYY-MM-DD` (UTC, как в daily_stats). */
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
