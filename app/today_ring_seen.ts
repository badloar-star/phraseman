// ═══════════════════════════════════════════════════════════════════════════
// today_ring_seen.ts — «что кольцо дня уже показало» для экрана «Сегодня» (/today_tasks).
//
// зачем (владелец 17.10, координатор: кольца ушли с Главной на экран по «Смотреть все»): кольцо заполняется «до → после» —
// от того, что человек видел при прошлом открытии экрана, до текущего прогресса; первое открытие за день — от нуля.
// Хранится только на устройстве (память + AsyncStorage), на сервер не уходит и ничего не начисляет: это вид, не данные.
// Смена аккаунта сбрасывает память (чужой прогресс не станет «до» для другого владельца). Журнал — [TODAY-RING].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from './account_owner_change';

export const TODAY_RING_SEEN_KEY = 'today_ring_seen_v1';
/** Потолок ожидания диска: дольше — кольцо рисуется от нуля, экран не ждёт. */
export const TODAY_RING_SEEN_READ_CEILING_MS = 300;

export type TodayRingProgress = readonly [number, number, number];
export type TodayRingSeen = Readonly<{ dayKey: string; progress: TodayRingProgress }>;
export type TodayRingFromSource = 'memory' | 'disk' | 'none' | 'other_day' | 'timeout' | 'read_failed' | 'broken';

const ZERO: TodayRingProgress = [0, 0, 0];
let memory: TodayRingSeen | null = null;
onAccountOwnerChanged('today_ring_seen', () => { memory = null; });

function isProgress(value: unknown): value is TodayRingProgress {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);
}

/** Чистое правило: с какого прогресса начинать заполнение. Другой день или нет записи — от нуля. */
export function todayRingFrom(seen: TodayRingSeen | null, dayKey: string): TodayRingProgress {
  return seen && seen.dayKey === dayKey ? seen.progress : ZERO;
}

/** Прогресс «до» для экрана: память → диск (с потолком) → ноль. Источник всегда в журнале. */
export async function readTodayRingFrom(dayKey: string): Promise<Readonly<{ from: TodayRingProgress; source: TodayRingFromSource }>> {
  if (memory) {
    const source: TodayRingFromSource = memory.dayKey === dayKey ? 'memory' : 'other_day';
    return { from: todayRingFrom(memory, dayKey), source };
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const raw = await Promise.race([
      AsyncStorage.getItem(TODAY_RING_SEEN_KEY),
      new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), TODAY_RING_SEEN_READ_CEILING_MS); }),
    ]);
    if (raw === 'timeout') {
      console.warn(`[TODAY-RING] seen:read_timeout ${TODAY_RING_SEEN_READ_CEILING_MS}мс — кольцо от нуля`); // guard-ok: ранний выход
      return { from: ZERO, source: 'timeout' };
    }
    if (!raw) return { from: ZERO, source: 'none' };
    const parsed: unknown = JSON.parse(raw);
    const seen = parsed as Partial<TodayRingSeen> | null;
    if (!seen || typeof seen.dayKey !== 'string' || !isProgress(seen.progress)) {
      console.warn('[TODAY-RING] seen:broken запись не разобралась — кольцо от нуля'); // guard-ok: ранний выход
      return { from: ZERO, source: 'broken' };
    }
    memory = { dayKey: seen.dayKey, progress: seen.progress };
    return { from: todayRingFrom(memory, dayKey), source: seen.dayKey === dayKey ? 'disk' : 'other_day' };
  } catch (error: unknown) {
    console.warn('[TODAY-RING] seen:read_failed — кольцо от нуля', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return { from: ZERO, source: 'read_failed' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Экран показал этот прогресс: следующее открытие начнёт с него. Память сразу, диск фоном. */
export function rememberTodayRingSeen(dayKey: string, progress: TodayRingProgress): void {
  memory = { dayKey, progress };
  AsyncStorage.setItem(TODAY_RING_SEEN_KEY, JSON.stringify(memory)).catch((error: unknown) => {
    console.warn('[TODAY-RING] seen:write_failed — в памяти записано, диск нет', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
  });
}

/** Только для тестов. */
export function __resetTodayRingSeenForTests(): void {
  memory = null;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
