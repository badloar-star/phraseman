// ════════════════════════════════════════════════════════════════════════════
// plan_content_remote_readiness.ts — async bridge from the remote pack loader to
// a plan-content day, with a guaranteed synchronous bundled fallback.
//
// This is the ONLY place that mixes remote (async, server-downloaded) content
// with bundled (sync) content. It is DISABLED-SAFE: while
// COURSE_PACK_REMOTE_LOADING_ENABLED is false, every path returns the bundled
// day, so screens behave exactly as today. When remote loading is enabled, it:
//   - returns the verified server day if it is cached and its sha256 matches,
//   - evicts and falls back to bundled on corruption,
//   - falls back to bundled while the pack is still downloading or unavailable.
//
// The existing synchronous resolvePlanContentDayReadiness() is left untouched so
// nothing in the current render path changes.
// ════════════════════════════════════════════════════════════════════════════
import { PLAN_CONTENT_REMOTE_ENABLED } from './course_pack_loader';
import {
  ensureCachedCoursePackRow,
  evictCachedCoursePack,
  readVerifiedCoursePackDay,
  type RowUrlBuilder,
} from './course_pack_remote_loader';
import { getAuthoredPlanContentDay } from './plan_content_registry';
import type { PlanContentDay } from './plan_content_schema';

export type PlanContentRemoteSource = 'downloaded_pack' | 'bundled_compatibility' | 'missing';

export type PlanContentRemoteDay = {
  day: PlanContentDay | null;
  source: PlanContentRemoteSource;
  /** True when a server copy existed but failed integrity and was evicted. */
  recoveredFromCorruption: boolean;
};

function remoteLoadingEnabled(): boolean {
  return Boolean(PLAN_CONTENT_REMOTE_ENABLED);
}

function rowPathFor(planId: string, dayIndex: number): string {
  return `plans/${planId}/day-${String(dayIndex).padStart(3, '0')}.json`;
}

function bundled(planId: string, dayIndex: number): PlanContentDay | null {
  return getAuthoredPlanContentDay(planId, dayIndex) ?? null;
}

/**
 * Resolve a plan-content day, preferring a verified server copy when remote
 * loading is enabled, otherwise the bundled copy. NEVER returns unverified
 * server content; NEVER throws.
 *
 * @param cacheKey the pack cache key (from buildCoursePackCacheKey); when omitted
 *                 or while disabled, the bundled day is returned directly.
 */
export async function resolveRemoteOrBundledPlanContentDay(
  planId: string,
  dayIndex: number,
  cacheKey?: string,
  rowUrl?: RowUrlBuilder,
): Promise<PlanContentRemoteDay> {
  // Disabled, or no pack context: bundled is the only source.
  if (!remoteLoadingEnabled() || !cacheKey) {
    const day = bundled(planId, dayIndex);
    return { day, source: day ? 'bundled_compatibility' : 'missing', recoveredFromCorruption: false };
  }

  let verified: PlanContentDay | null | { corrupt: true } = null;
  const rowPath = rowPathFor(planId, dayIndex);
  try {
    verified = await readVerifiedCoursePackDay<PlanContentDay>(cacheKey, rowPath);
    if (!verified && rowUrl) {
      const rowCached = await ensureCachedCoursePackRow(cacheKey, rowPath, rowUrl);
      if (rowCached) {
        verified = await readVerifiedCoursePackDay<PlanContentDay>(cacheKey, rowPath);
      }
    }
  } catch {
    verified = null;
  }

  // Corrupt server copy: evict so the next ensureRemoteCoursePack re-downloads it,
  // and serve bundled this time so the learner is never blocked.
  if (verified && typeof verified === 'object' && 'corrupt' in verified) {
    try {
      await evictCachedCoursePack(cacheKey);
    } catch {
      // best-effort
    }
    const day = bundled(planId, dayIndex);
    return {
      day,
      source: day ? 'bundled_compatibility' : 'missing',
      recoveredFromCorruption: true,
    };
  }

  if (verified) {
    return { day: verified, source: 'downloaded_pack', recoveredFromCorruption: false };
  }

  // Not cached yet (still downloading or never fetched): bundled fallback.
  const day = bundled(planId, dayIndex);
  return { day, source: day ? 'bundled_compatibility' : 'missing', recoveredFromCorruption: false };
}

/* expo-router route shim: keeps this utility module from warning when discovered as a route. */
export default function __PlanContentRemoteReadinessRouteShim() {
  return null;
}
