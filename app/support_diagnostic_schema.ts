export const SUPPORT_DIAGNOSTIC_BUNDLE_VERSION = 1 as const;
export const SUPPORT_DIAGNOSTIC_BUNDLE_MAX_EVENTS = 200;
export const SUPPORT_DIAGNOSTIC_BUNDLE_MAX_BYTES = 32 * 1024;

const EVENT_NAMES = [
  'navigation',
  'app_state',
  'support_report',
  'customization_purchase',
  'customization_apply',
  'account_delete',
  'auth_transition',
  'feature_action',
] as const;
const RESULTS = ['start', 'success', 'blocked', 'error', 'info'] as const;
const SUBJECTS = ['avatar', 'aura', 'account', 'report', 'app'] as const;
const REASONS = [
  'account_changed',
  'insufficient_currency',
  'transaction_failed',
  'selection_failed',
  'locally_cleared',
  'server_enqueued',
  'quarantine_retained',
  'queued',
  'direct_fallback',
  'foreground',
  'background',
  'inactive',
] as const;

export type SupportDiagnosticEventName = typeof EVENT_NAMES[number];
export type SupportDiagnosticResult = typeof RESULTS[number];
export type SupportDiagnosticSubject = typeof SUBJECTS[number];
export type SupportDiagnosticReason = typeof REASONS[number];

export interface SupportDiagnosticEvent {
  atMs: number;
  event: SupportDiagnosticEventName;
  screen?: string;
  result?: SupportDiagnosticResult;
  reason?: SupportDiagnosticReason;
  subject?: SupportDiagnosticSubject;
  durationMs?: number;
  action?: string;
}

export interface SupportDiagnosticBundle {
  version: typeof SUPPORT_DIAGNOSTIC_BUNDLE_VERSION;
  capturedAtMs: number;
  events: SupportDiagnosticEvent[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined;
}

function safeScreen(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 96);
  if (!trimmed || !/^[/a-zA-Z0-9_().\-[\]]+$/.test(trimmed)) return undefined;
  if (/(?:^|\/)[A-Za-z0-9]{20,}(?:\/|$)/.test(trimmed)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function safeAction(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 80);
  if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(trimmed)) return undefined;
  if (/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(trimmed)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function positiveInteger(value: unknown): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.min(Math.round(number), 24 * 60 * 60 * 1_000);
}

function serializedBytes(value: unknown): number {
  const text = JSON.stringify(value);
  return typeof TextEncoder === 'function'
    ? new TextEncoder().encode(text).length
    : unescape(encodeURIComponent(text)).length;
}

export function sanitizeSupportDiagnosticEvent(value: unknown): SupportDiagnosticEvent | null {
  const source = record(value);
  const atMs = Number(source.atMs);
  const event = enumValue(source.event, EVENT_NAMES);
  if (!Number.isSafeInteger(atMs) || atMs <= 0 || !event) return null;

  const screen = safeScreen(source.screen);
  const result = enumValue(source.result, RESULTS);
  const reason = enumValue(source.reason, REASONS);
  const subject = enumValue(source.subject, SUBJECTS);
  const durationMs = positiveInteger(source.durationMs);
  const action = safeAction(source.action);

  return {
    atMs,
    event,
    ...(screen ? { screen } : {}),
    ...(result ? { result } : {}),
    ...(reason ? { reason } : {}),
    ...(subject ? { subject } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(action ? { action } : {}),
  };
}

export function sanitizeSupportDiagnosticBundle(value: unknown): SupportDiagnosticBundle | null {
  const source = record(value);
  const capturedAtMs = Number(source.capturedAtMs);
  if (source.version !== SUPPORT_DIAGNOSTIC_BUNDLE_VERSION || !Number.isSafeInteger(capturedAtMs) || capturedAtMs <= 0) {
    return null;
  }
  const rawEvents = Array.isArray(source.events) ? source.events : [];
  const events = rawEvents
    .map(sanitizeSupportDiagnosticEvent)
    .filter((event): event is SupportDiagnosticEvent => event !== null)
    .sort((left, right) => left.atMs - right.atMs)
    .slice(-SUPPORT_DIAGNOSTIC_BUNDLE_MAX_EVENTS);
  if (events.length === 0) return null;

  const bundle: SupportDiagnosticBundle = {
    version: SUPPORT_DIAGNOSTIC_BUNDLE_VERSION,
    capturedAtMs,
    events,
  };
  while (bundle.events.length > 0 && serializedBytes(bundle) > SUPPORT_DIAGNOSTIC_BUNDLE_MAX_BYTES) {
    bundle.events.shift();
  }
  return bundle.events.length > 0 ? bundle : null;
}
