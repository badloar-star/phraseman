import type { SourceLocale } from './source_locales';
import type { StudyTarget } from './study_target';
import type { CoursePackCacheState, CoursePackSurface } from './course_pack_manifest';
import { buildCoursePackCacheKey } from './course_pack_manifest';
import { findEmbeddedCoursePackIndexEntry, type CoursePackDeliveryMode } from './course_pack_index';

export const COURSE_PACK_REMOTE_LOADING_ENABLED = false as const;

// Dedicated switch for the NEW plan_content remote runtime (download + disk-cache
// + per-day sha256 verification, with bundled fallback). Intentionally SEPARATE
// from the legacy COURSE_PACK_REMOTE_LOADING_ENABLED above so the new path can be
// enabled without disturbing the legacy disabled-runtime-contract evidence gates,
// which continue to certify that the OLD path stays inert.
//
// ENABLED: in the NEXT build the app prefers the verified server day and falls
// back to the bundled copy on any miss/corruption/offline. Compile-time, so
// currently-running users are unaffected. Bundled content is retained as the
// fallback and removed only in a later, separately-approved release.
export const PLAN_CONTENT_REMOTE_ENABLED: boolean = true;

export type CoursePackReadinessRequest = {
  studyTarget: StudyTarget;
  sourceLocale: SourceLocale;
  surface: CoursePackSurface;
  selectionConfirmed: boolean;
};

export type CoursePackReadiness = {
  state: CoursePackCacheState;
  delivery?: CoursePackDeliveryMode;
  cacheKey?: string;
  reason:
    | 'selection_required'
    | 'bundled_compatibility_until_pack_extraction'
    | 'no_index_entry'
    | 'manifest_missing'
    | 'remote_loader_disabled';
};

export function resolveCoursePackReadiness(request: CoursePackReadinessRequest): CoursePackReadiness {
  if (!request.selectionConfirmed) {
    return { state: 'missing', reason: 'selection_required' };
  }

  const indexEntry = findEmbeddedCoursePackIndexEntry(request);
  if (!indexEntry) {
    return { state: 'missing', reason: 'no_index_entry' };
  }

  if (indexEntry.delivery === 'bundled_compatibility') {
    return {
      state: 'offline_fallback',
      delivery: 'bundled_compatibility',
      reason: 'bundled_compatibility_until_pack_extraction',
    };
  }

  if (!indexEntry.manifest) {
    return {
      state: 'missing',
      delivery: 'downloadable',
      reason: 'manifest_missing',
    };
  }

  return {
    state: 'missing',
    delivery: 'downloadable',
    cacheKey: buildCoursePackCacheKey(indexEntry.manifest),
    reason: 'remote_loader_disabled',
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackLoaderRouteShim() {
  return null;
}
