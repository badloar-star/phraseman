import type { CoursePackCacheState } from './course_pack_manifest';
import { resolveCoursePackReadiness, type CoursePackReadiness } from './course_pack_loader';
import type { PlanContentDay } from './plan_content_schema';
import { getAuthoredPlanContentDay } from './plan_content_registry';
import type { SourceLocale } from './source_locales';
import type { StudyTarget } from './study_target';

const BUNDLED_COMPATIBILITY_CONTEXT = {
  studyTarget: 'en',
  sourceLocale: 'ru',
  selectionConfirmed: true,
} as const satisfies Pick<PlanContentReadinessRequest, 'studyTarget' | 'sourceLocale' | 'selectionConfirmed'>;

export type PlanContentReadinessRequest = {
  planId: string;
  dayIndex: number;
  studyTarget: StudyTarget;
  sourceLocale: SourceLocale;
  selectionConfirmed: boolean;
};

export type PlanContentReadiness = {
  state: CoursePackCacheState;
  pack: CoursePackReadiness;
  source: 'bundled_compatibility' | 'downloaded_pack' | 'missing';
  day?: PlanContentDay;
  reason:
    | 'selection_required'
    | 'authored_day_ready'
    | 'authored_day_missing';
};

export const PLAN_CONTENT_UI_SURFACES = [
  'report_marker',
  'theory_entry',
  'theory_screen',
  'phrase_lesson',
] as const;

export type PlanContentUiSurface = (typeof PLAN_CONTENT_UI_SURFACES)[number];

export type PlanContentUiContentSource =
  | 'bundled_compatibility'
  | 'downloaded_pack'
  | 'template_fallback'
  | 'empty_state'
  | 'loading_state'
  | 'hidden'
  | 'blocked_state';

export type PlanContentUiCopyKey =
  | 'plan_content.ready'
  | 'plan_content.selection_required'
  | 'plan_content.missing'
  | 'plan_content.downloading'
  | 'plan_content.corrupt'
  | 'plan_content.stale'
  | 'plan_content.offline_fallback';

export type PlanContentUiState = {
  surface: PlanContentUiSurface;
  readinessState: CoursePackCacheState;
  reason: PlanContentReadiness['reason'];
  contentSource: PlanContentUiContentSource;
  canRenderAuthoredContent: boolean;
  shouldShowReportMarker: boolean;
  shouldShowTheoryEntry: boolean;
  shouldUseBundledCompatibility: boolean;
  shouldUseTemplateFallback: boolean;
  shouldShowLoading: boolean;
  shouldShowEmptyState: boolean;
  shouldBlockProgressCredit: boolean;
  copyKey: PlanContentUiCopyKey;
};

export type PlanContentPhraseLessonResolution =
  | {
      kind: 'authored_day';
      day: PlanContentDay;
      uiState: PlanContentUiState;
    }
  | {
      kind: 'template_fallback';
      uiState: PlanContentUiState;
    }
  | {
      kind: 'blocked';
      uiState: PlanContentUiState;
    };

export function resolvePlanContentDayReadiness(
  request: PlanContentReadinessRequest,
): PlanContentReadiness {
  const pack = resolveCoursePackReadiness({
    studyTarget: request.studyTarget,
    sourceLocale: request.sourceLocale,
    surface: 'plan_content',
    selectionConfirmed: request.selectionConfirmed,
  });

  if (!request.selectionConfirmed) {
    return {
      state: pack.state,
      pack,
      source: 'missing',
      reason: 'selection_required',
    };
  }

  const day = getAuthoredPlanContentDay(request.planId, request.dayIndex);
  if (!day) {
    return {
      state: 'missing',
      pack,
      source: 'missing',
      reason: 'authored_day_missing',
    };
  }

  return {
    state: pack.state,
    pack,
    source: 'bundled_compatibility',
    day,
    reason: 'authored_day_ready',
  };
}

export function resolvePlanContentUiState(
  readiness: PlanContentReadiness,
  surface: PlanContentUiSurface,
): PlanContentUiState {
  const authoredReady =
    readiness.reason === 'authored_day_ready' &&
    Boolean(readiness.day) &&
    isRenderableContentState(readiness.state);
  const base = makeBaseUiState(readiness, surface);

  if (authoredReady) {
    return {
      ...base,
      contentSource: readyContentSource(readiness),
      canRenderAuthoredContent: surface !== 'report_marker',
      shouldShowReportMarker: surface === 'report_marker',
      shouldShowTheoryEntry: surface === 'theory_entry',
      shouldUseBundledCompatibility: readiness.source === 'bundled_compatibility',
      shouldBlockProgressCredit: false,
    };
  }

  if (surface === 'report_marker' || surface === 'theory_entry') {
    return {
      ...base,
      contentSource: 'hidden',
    };
  }

  if (readiness.state === 'downloading') {
    return {
      ...base,
      contentSource: 'loading_state',
      shouldShowLoading: true,
      shouldBlockProgressCredit: true,
    };
  }

  if (readiness.state === 'corrupt' || readiness.state === 'stale') {
    return {
      ...base,
      contentSource: 'blocked_state',
      shouldBlockProgressCredit: true,
    };
  }

  if (readiness.reason === 'selection_required') {
    return {
      ...base,
      contentSource: 'blocked_state',
      shouldBlockProgressCredit: true,
    };
  }

  if (surface === 'phrase_lesson' && readiness.pack.delivery === 'bundled_compatibility') {
    return {
      ...base,
      contentSource: 'template_fallback',
      shouldUseBundledCompatibility: true,
      shouldUseTemplateFallback: true,
    };
  }

  return {
    ...base,
    contentSource: 'empty_state',
    shouldShowEmptyState: true,
    shouldBlockProgressCredit: surface === 'phrase_lesson',
  };
}

export function getReadyPlanContentDay(
  request: PlanContentReadinessRequest,
): PlanContentDay | null {
  const readiness = resolvePlanContentDayReadiness(request);
  return readiness.reason === 'authored_day_ready' ? readiness.day ?? null : null;
}

export function hasBundledCompatibilityPlanContentDay(planId: string, dayIndex: number): boolean {
  const readiness = resolvePlanContentDayReadiness({
    ...BUNDLED_COMPATIBILITY_CONTEXT,
    planId,
    dayIndex,
  });
  return readiness.reason === 'authored_day_ready' && readiness.source === 'bundled_compatibility';
}

export function hasBundledCompatibilityPlanContentTheoryEntry(
  planId: string,
  dayIndex: number,
): boolean {
  const readiness = resolvePlanContentDayReadiness({
    ...BUNDLED_COMPATIBILITY_CONTEXT,
    planId,
    dayIndex,
  });
  const uiState = resolvePlanContentUiState(readiness, 'theory_entry');
  return uiState.shouldShowTheoryEntry && (readiness.day?.intro.length ?? 0) > 0;
}

export function getBundledCompatibilityPlanContentTheoryDay(
  planId: string,
  dayIndex: number,
): PlanContentDay | null {
  const readiness = resolvePlanContentDayReadiness({
    ...BUNDLED_COMPATIBILITY_CONTEXT,
    planId,
    dayIndex,
  });
  const uiState = resolvePlanContentUiState(readiness, 'theory_screen');
  if (
    !uiState.canRenderAuthoredContent ||
    readiness.source !== 'bundled_compatibility' ||
    !readiness.day ||
    readiness.day.intro.length === 0
  ) {
    return null;
  }
  return readiness.day;
}

export function resolvePlanContentPhraseLesson(
  readiness: PlanContentReadiness,
): PlanContentPhraseLessonResolution {
  const uiState = resolvePlanContentUiState(readiness, 'phrase_lesson');
  if (uiState.canRenderAuthoredContent && readiness.day) {
    return {
      kind: 'authored_day',
      day: readiness.day,
      uiState,
    };
  }

  if (uiState.shouldUseTemplateFallback) {
    return {
      kind: 'template_fallback',
      uiState,
    };
  }

  return {
    kind: 'blocked',
    uiState,
  };
}

export function resolveBundledCompatibilityPlanContentPhraseLesson(
  planId: string,
  dayIndex: number,
): PlanContentPhraseLessonResolution {
  return resolvePlanContentPhraseLesson(resolvePlanContentDayReadiness({
    ...BUNDLED_COMPATIBILITY_CONTEXT,
    planId,
    dayIndex,
  }));
}

function makeBaseUiState(
  readiness: PlanContentReadiness,
  surface: PlanContentUiSurface,
): PlanContentUiState {
  return {
    surface,
    readinessState: readiness.state,
    reason: readiness.reason,
    contentSource: 'hidden',
    canRenderAuthoredContent: false,
    shouldShowReportMarker: false,
    shouldShowTheoryEntry: false,
    shouldUseBundledCompatibility: false,
    shouldUseTemplateFallback: false,
    shouldShowLoading: false,
    shouldShowEmptyState: false,
    shouldBlockProgressCredit: false,
    copyKey: planContentUiCopyKey(readiness),
  };
}

function readyContentSource(readiness: PlanContentReadiness): PlanContentUiContentSource {
  return readiness.source === 'bundled_compatibility' ? 'bundled_compatibility' : 'downloaded_pack';
}

function isRenderableContentState(state: CoursePackCacheState): boolean {
  return state === 'ready' || state === 'offline_fallback';
}

function planContentUiCopyKey(readiness: PlanContentReadiness): PlanContentUiCopyKey {
  if (readiness.reason === 'selection_required') return 'plan_content.selection_required';

  switch (readiness.state) {
    case 'ready':
      return 'plan_content.ready';
    case 'downloading':
      return 'plan_content.downloading';
    case 'corrupt':
      return 'plan_content.corrupt';
    case 'stale':
      return 'plan_content.stale';
    case 'offline_fallback':
      return 'plan_content.offline_fallback';
    case 'missing':
    default:
      return 'plan_content.missing';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PlanContentReadinessRouteShim() {
  return null;
}
