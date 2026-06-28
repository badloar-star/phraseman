// ════════════════════════════════════════════════════════════════════════════
// plan_content_remote_telemetry.ts — counts which source served each plan-content
// day at runtime (verified server pack vs bundled fallback) and why, so the
// admin "FULL" dashboard can show fallback frequency, situations, and trends.
//
// Pure telemetry: never throws, never affects content delivery. Just an
// observer.
// ════════════════════════════════════════════════════════════════════════════
import { trackEvent } from './analytics';
import type { PlanContentRemoteDay } from './plan_content_remote_readiness';

/** Why the bundled fallback was used (or '' when we served the server day). */
export type PlanContentFallbackReason =
  | ''
  | 'remote_disabled'
  | 'no_pack_registration'
  | 'pack_not_cached'
  | 'integrity_failure'
  | 'network_unavailable'
  | 'no_bundled_day'
  | 'unknown';

export type PlanContentTelemetrySurface = 'theory' | 'phrase_lesson' | 'exercise' | 'report_marker';

export type PlanContentTelemetryRecord = {
  planId: string;
  dayIndex: number;
  surface: PlanContentTelemetrySurface;
  /** What actually fed the screen this time. */
  source: 'downloaded_pack' | 'bundled_compatibility' | 'missing';
  /** Empty when source==='downloaded_pack'; otherwise the situation that drove the fallback. */
  reason: PlanContentFallbackReason;
  /** True when a corrupt server copy was evicted on the way to this fallback. */
  recoveredFromCorruption: boolean;
};

// Dedup window: avoid one screen re-rendering 5x in a second producing 5 events
// for the same exact decision. Real situation changes (source flip, new reason)
// always emit a fresh event.
const DEDUP_MS = 30_000;
const recentlySeen = new Map<string, number>();
function dedupKey(rec: PlanContentTelemetryRecord): string {
  return `${rec.surface}|${rec.planId}|${rec.dayIndex}|${rec.source}|${rec.reason}|${rec.recoveredFromCorruption ? '1' : '0'}`;
}

/**
 * Record a plan-content source decision for one screen render. Emits one
 * `plan_content_source` event always, and a `plan_content_fallback` event when
 * the bundled fallback was used. Never throws.
 */
export function recordPlanContentSource(record: PlanContentTelemetryRecord): void {
  try {
    const key = dedupKey(record);
    const now = Date.now();
    const last = recentlySeen.get(key) ?? 0;
    if (now - last < DEDUP_MS) return;
    recentlySeen.set(key, now);

    const baseProps: Record<string, unknown> = {
      planId: record.planId,
      dayIndex: record.dayIndex,
      surface: record.surface,
      source: record.source,
    };
    void trackEvent('plan_content_source', baseProps);

    if (record.source !== 'downloaded_pack') {
      void trackEvent('plan_content_fallback', {
        ...baseProps,
        reason: record.reason || 'unknown',
        recoveredFromCorruption: record.recoveredFromCorruption,
      });
    }
    // Also write a compact, queryable document to Firestore so the admin "FULL"
    // dashboard can show fallback frequency, situations, and trends over time
    // without going through BigQuery. Fire-and-forget, never blocks.
    void writePlanContentTelemetryDoc(record).catch(() => { /* swallow */ });
  } catch {
    // telemetry must never break the app
  }
}

/**
 * Compact Firestore write so the admin dashboard can read fallback history.
 * Documents live under plan_content_telemetry_events/<dayKey>/events/<docId>;
 * day-keyed parent doc enables cheap "events from 2026-06-30" queries by id.
 */
async function writePlanContentTelemetryDoc(record: PlanContentTelemetryRecord): Promise<void> {
  try {
    // Lazy require so this module stays test-friendly (Firestore is mocked or
    // simply unused under jest) and Firebase isn't imported on cold startup.
    const firestore = (await import('@react-native-firebase/firestore')).default;
    const now = new Date();
    const dayKey = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
    await firestore()
      .collection('plan_content_telemetry_events')
      .doc(dayKey)
      .collection('events')
      .add({
        planId: record.planId,
        dayIndex: record.dayIndex,
        surface: record.surface,
        source: record.source,
        reason: record.reason || 'unknown',
        recoveredFromCorruption: record.recoveredFromCorruption,
        // Server timestamp so admin queries never depend on client clock.
        at: firestore.FieldValue.serverTimestamp(),
      });
  } catch {
    // swallow: never break content delivery for telemetry
  }
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

/**
 * Convenience: derive the telemetry record from the remote bridge's result.
 * `extraReason` lets callers pass a more specific situation (e.g. when the
 * bridge had no cacheKey because remote loading is disabled or the registration
 * is missing).
 */
export function telemetryFromRemoteDay(
  planId: string,
  dayIndex: number,
  surface: PlanContentTelemetrySurface,
  result: PlanContentRemoteDay,
  extraReason: PlanContentFallbackReason = '',
): PlanContentTelemetryRecord {
  let reason: PlanContentFallbackReason = '';
  if (result.source === 'downloaded_pack') {
    reason = '';
  } else if (result.recoveredFromCorruption) {
    reason = 'integrity_failure';
  } else if (result.source === 'missing') {
    reason = 'no_bundled_day';
  } else if (extraReason) {
    reason = extraReason;
  } else {
    reason = 'pack_not_cached';
  }
  return {
    planId,
    dayIndex,
    surface,
    source: result.source,
    reason,
    recoveredFromCorruption: result.recoveredFromCorruption,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentRemoteTelemetryRouteShim() {
  return null;
}
