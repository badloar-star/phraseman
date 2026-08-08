export const PRODUCT_ANALYTICS_SCHEMA_VERSION = 1;
export const MAX_PRODUCT_SCREEN_DURATION_MS = 24 * 60 * 60 * 1000;

export type ProductRuntimeEventName =
  | 'product_session_start'
  | 'product_session_resume'
  | 'product_session_background'
  | 'product_screen_view'
  | 'product_screen_leave';

export type ProductScreenLeaveReason =
  | 'route_change'
  | 'background'
  | 'consent_revoked';

export interface ProductRuntimeEventInput {
  eventId: string;
  eventName: ProductRuntimeEventName;
  sessionId: string;
  screenId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber: string;
  studyTarget: string;
  occurredAtMs: number;
  leaveReason?: ProductScreenLeaveReason;
  durationMs?: number;
}

export interface ProductRuntimeEvent extends ProductRuntimeEventInput {
  schemaVersion: number;
}

function boundedDuration(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.min(MAX_PRODUCT_SCREEN_DURATION_MS, Math.max(0, Math.round(value)));
}

export function buildProductRuntimeEvent(input: ProductRuntimeEventInput): ProductRuntimeEvent {
  const event: ProductRuntimeEvent = {
    schemaVersion: PRODUCT_ANALYTICS_SCHEMA_VERSION,
    eventId: String(input.eventId).slice(0, 80),
    eventName: input.eventName,
    sessionId: String(input.sessionId).slice(0, 80),
    screenId: String(input.screenId).slice(0, 60),
    platform: input.platform,
    appVersion: String(input.appVersion).slice(0, 40),
    buildNumber: String(input.buildNumber).slice(0, 40),
    studyTarget: String(input.studyTarget).slice(0, 12),
    occurredAtMs: Math.max(0, Math.round(input.occurredAtMs)),
  };
  const durationMs = boundedDuration(input.durationMs);
  if (durationMs != null) event.durationMs = durationMs;
  if (input.leaveReason) event.leaveReason = input.leaveReason;
  return event;
}

export default function __RouteShim() { return null; }
