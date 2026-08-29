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

const STORAGE_PREFIX = 'support_diagnostics_v1';
export const SUPPORT_DIAGNOSTIC_TTL_MS = 24 * 60 * 60 * 1_000;
export const SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS = 200;
export const SUPPORT_DIAGNOSTIC_LOCAL_MAX_BYTES = 64 * 1024;

let mutationTail: Promise<void> = Promise.resolve();

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
    if (raw !== null) await AsyncStorage.removeItem(key).catch(() => undefined);
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
  mutationTail = run.catch(() => undefined);
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
  await withMutationLock(async () => {
    if (!isCurrentAccountGeneration(context.token)) return;
    const events = trimLocal([...(await readEvents(context.key)), event], Date.now());
    if (!isCurrentAccountGeneration(context.token)) return;
    if (events.length === 0) await AsyncStorage.removeItem(context.key);
    else await AsyncStorage.setItem(context.key, JSON.stringify(events));
  }).catch(() => undefined);
}

export async function captureSupportDiagnosticBundle(nowMs: number = Date.now()): Promise<SupportDiagnosticBundle | null> {
  if (!isSupportDiagnosticsEnabled()) return null;
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
  await withMutationLock(async () => {
    if (!isCurrentAccountGeneration(context.token)) return;
    await AsyncStorage.removeItem(context.key).catch(() => undefined);
  });
}
