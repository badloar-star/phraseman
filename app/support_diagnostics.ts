import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { isSupportDiagnosticsEnabled } from './remote_flags';
import {
  SUPPORT_DIAGNOSTIC_BUNDLE_VERSION,
  sanitizeSupportDiagnosticBundle,
  sanitizeSupportDiagnosticEvent,
  type SupportDiagnosticBundle,
  type SupportDiagnosticEvent,
} from './support_diagnostic_schema';
import { swallowError } from './debug-logger';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const STORAGE_PREFIX = 'support_diagnostics_v1';
export const SUPPORT_DIAGNOSTIC_TTL_MS = 24 * 60 * 60 * 1_000;
export const SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS = 200;
export const SUPPORT_DIAGNOSTIC_LOCAL_MAX_BYTES = 64 * 1024;

let mutationTail: Promise<void> = Promise.resolve();

// зачем (координатор 12.10, правило «ничего не замедлять»): раньше КАЖДОЕ событие trackActivity читало и переписывало ключ до 64 КБ под замком —
// нагрузка на каждый тап. Теперь событие кладётся в память (O(1)), а на диск уходит пачкой: таймер 30 с и уход в фон — app/support_diagnostics_flush.ts,
// перед захватом журнала для обращения — здесь. Потеря последних ≤30 с журнала при падении приложения допустима (решение координатора).
type PendingDiagnostic = { key: string; token: ReturnType<typeof captureAccountGeneration>; event: SupportDiagnosticEvent };
let pending: PendingDiagnostic[] = [];
let pendingListener: (() => void) | null = null;

/** Планировщик сброса (таймер/фон) подписывается сюда; кольцо само таймеров не держит (сторож privacy: никаких фоновых отправок). */
export function onSupportDiagnosticPending(listener: (() => void) | null): void {
  pendingListener = listener;
}

export function getPendingSupportDiagnosticCount(): number {
  return pending.length;
}

function storageKey(stableId: string, generation: number): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(stableId)}:${generation}`;
}

function bytes(value: unknown): number {
  const text = JSON.stringify(value);
  return typeof TextEncoder === 'function'
    ? new TextEncoder().encode(text).length
    : unescape(encodeURIComponent(text)).length;
}

function activeContext() {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId) return null;
  return { token, key: storageKey(token.stableId, token.generation) };
}

async function readEvents(key: string): Promise<SupportDiagnosticEvent[]> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error('support_diagnostics_invalid');
    return parsed
      .map(sanitizeSupportDiagnosticEvent)
      .filter((event): event is SupportDiagnosticEvent => event !== null);
  } catch {
    if (raw !== null) await AsyncStorage.removeItem(key).catch(swallowError('support_diagnostics:remove_corrupt_key'));
    return [];
  }
}

function trimLocal(events: SupportDiagnosticEvent[], nowMs: number): SupportDiagnosticEvent[] {
  const next = events
    .filter((event) => event.atMs <= nowMs + 5 * 60 * 1_000 && nowMs - event.atMs <= SUPPORT_DIAGNOSTIC_TTL_MS)
    .sort((left, right) => left.atMs - right.atMs)
    .slice(-SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS);
  while (next.length > 0 && bytes(next) > SUPPORT_DIAGNOSTIC_LOCAL_MAX_BYTES) next.shift();
  return next;
}

function withMutationLock(work: () => Promise<void>): Promise<void> {
  const run = mutationTail.then(work, work);
  mutationTail = run.catch(noteSwallowedAs('support_diagnostics:promise_1', undefined));
  return run;
}

export async function recordSupportDiagnostic(
  value: Omit<SupportDiagnosticEvent, 'atMs'> & { atMs?: number },
): Promise<void> {
  if (!isSupportDiagnosticsEnabled()) return;
  const event = sanitizeSupportDiagnosticEvent({ ...value, atMs: value.atMs ?? Date.now() });
  if (!event) return;
  // Capture ownership before queueing. A queued event from the retiring account
  // must never resolve activeContext() again and land in a newly-created account.
  const context = activeContext();
  if (!context) return;
  pending.push({ key: context.key, token: context.token, event });
  // Буфер не растёт без границы, даже если сброс долго не наступает: держим не больше локального лимита.
  if (pending.length > SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS * 2) pending = pending.slice(-SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS);
  try {
    pendingListener?.();
  } catch (error) {
    swallowError('support_diagnostics:pending_listener')(error);
  }
}

/**
 * Сбросить накопленные события на диск: один раз «прочитать-слить-обрезать-записать» на ключ аккаунта под замком.
 * События сменившегося поколения аккаунта отбрасываются. Возвращает, сколько событий записано.
 */
export async function flushSupportDiagnostics(reason: string): Promise<number> {
  if (pending.length === 0) return 0;
  const batch = pending;
  pending = [];
  const startedAt = Date.now();
  let written = 0;
  let dropped = 0;
  let totalBytes = 0;
  await withMutationLock(async () => {
    const byKey = new Map<string, PendingDiagnostic[]>();
    for (const item of batch) byKey.set(item.key, [...(byKey.get(item.key) ?? []), item]);
    for (const [key, items] of byKey) {
      const live = items.filter((item) => isCurrentAccountGeneration(item.token));
      dropped += items.length - live.length;
      if (live.length === 0) continue;
      const events = trimLocal([...(await readEvents(key)), ...live.map((item) => item.event)], Date.now());
      if (!isCurrentAccountGeneration(live[0].token)) { dropped += live.length; continue; }
      if (events.length === 0) await AsyncStorage.removeItem(key);
      else {
        const text = JSON.stringify(events);
        totalBytes += text.length;
        await AsyncStorage.setItem(key, text);
      }
      written += live.length;
    }
  }).catch(swallowError('support_diagnostics:flush'));
  console.log(`[SUPPORT-DIAG] сброс журнала reason=${reason} записано=${written} отброшено=${dropped} байт=${totalBytes} мс=${Date.now() - startedAt}`); // guard-ok: одна строка на пачку
  return written;
}

export async function captureSupportDiagnosticBundle(nowMs: number = Date.now()): Promise<SupportDiagnosticBundle | null> {
  if (!isSupportDiagnosticsEnabled()) return null;
  // Перед захватом — всё накопленное в памяти на диск, иначе последние ≤30 с не попали бы в обращение.
  await flushSupportDiagnostics('capture');
  const context = activeContext();
  if (!context) return null;
  const events = trimLocal(await readEvents(context.key), nowMs);
  if (!isCurrentAccountGeneration(context.token)) return null;
  return sanitizeSupportDiagnosticBundle({
    version: SUPPORT_DIAGNOSTIC_BUNDLE_VERSION,
    capturedAtMs: nowMs,
    events,
  });
}

export async function clearSupportDiagnosticsForCurrentAccount(): Promise<void> {
  const context = activeContext();
  if (!context) return;
  pending = pending.filter((item) => item.key !== context.key);
  await withMutationLock(async () => {
    if (!isCurrentAccountGeneration(context.token)) return;
    await AsyncStorage.removeItem(context.key).catch(swallowError('support_diagnostics:clear_events'));
  });
}

/** Только для тестов: очистить буфер в памяти. */
export function resetSupportDiagnosticsPendingForTests(): void {
  pending = [];
  pendingListener = null;
}
