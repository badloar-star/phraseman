import type { SourceLocale } from './source_locales';
import type { StudyTarget } from './study_target';
import type { CoursePackCacheState, CoursePackSurface } from './course_pack_manifest';
import { buildCoursePackCacheKey } from './course_pack_manifest';
import { findEmbeddedCoursePackIndexEntry, type CoursePackDeliveryMode } from './course_pack_index';

export const COURSE_PACK_REMOTE_LOADING_ENABLED = false as const;

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
