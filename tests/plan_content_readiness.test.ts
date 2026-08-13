import {
  getBundledCompatibilityPlanContentTheoryDay,
  getReadyPlanContentDay,
  hasBundledCompatibilityPlanContentDay,
  hasBundledCompatibilityPlanContentTheoryEntry,
  resolveBundledCompatibilityPlanContentPhraseLesson,
  resolvePlanContentDayReadiness,
  resolvePlanContentPhraseLesson,
  resolvePlanContentUiState,
} from '../app/plan_content_readiness';
import { authoredPlanIntroCount, hasAuthoredPlanContent } from '../app/plan_content_registry';

describe('plan content readiness facade', () => {
  it('returns selection_required before source and target selection is confirmed', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: false,
    });

    expect(readiness).toMatchObject({
      state: 'missing',
      source: 'missing',
      reason: 'selection_required',
      pack: {
        state: 'missing',
        reason: 'selection_required',
      },
    });
    expect(readiness.day).toBeUndefined();
  });

  it('returns bundled compatibility readiness for an authored plan day', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });

    expect(readiness).toMatchObject({
      state: 'offline_fallback',
      source: 'bundled_compatibility',
      reason: 'authored_day_ready',
      pack: {
        state: 'offline_fallback',
        delivery: 'bundled_compatibility',
      },
    });
    expect(readiness.day?.planId).toBe('voyazh');
    expect(readiness.day?.dayIndex).toBe(1);
  });

  it('keeps missing days explicit instead of pretending a pack is ready', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 999,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });

    expect(readiness).toMatchObject({
      state: 'missing',
      source: 'missing',
      reason: 'authored_day_missing',
      pack: {
        state: 'offline_fallback',
        delivery: 'bundled_compatibility',
      },
    });
    expect(readiness.day).toBeUndefined();
  });

  it('returns the ready day through the narrow helper only when readiness passes', () => {
    expect(getReadyPlanContentDay({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'uk',
      selectionConfirmed: true,
    })?.dayIndex).toBe(1);

    expect(getReadyPlanContentDay({
      planId: 'voyazh',
      dayIndex: 999,
      studyTarget: 'en',
      sourceLocale: 'uk',
      selectionConfirmed: true,
    })).toBeNull();
  });

  it('keeps the transitional bundled compatibility helper in parity with registry existence', () => {
    expect(hasBundledCompatibilityPlanContentDay('voyazh', 1)).toBe(hasAuthoredPlanContent('voyazh', 1));
    expect(hasBundledCompatibilityPlanContentDay('voyazh', 999)).toBe(hasAuthoredPlanContent('voyazh', 999));
  });

  it('keeps the transitional theory-entry helper in parity with authored intro screens', () => {
    expect(hasBundledCompatibilityPlanContentTheoryEntry('voyazh', 1)).toBe(
      authoredPlanIntroCount('voyazh', 1) > 0,
    );
    expect(hasBundledCompatibilityPlanContentTheoryEntry('voyazh', 999)).toBe(
      authoredPlanIntroCount('voyazh', 999) > 0,
    );
  });

  it('returns a bundled compatibility theory day only when intro screens can render', () => {
    const day = getBundledCompatibilityPlanContentTheoryDay('voyazh', 1);

    expect(day?.planId).toBe('voyazh');
    expect(day?.dayIndex).toBe(1);
    expect(day?.intro.length).toBeGreaterThan(0);
    expect(day?.intro.length).toBe(authoredPlanIntroCount('voyazh', 1));
    expect(getBundledCompatibilityPlanContentTheoryDay('voyazh', 999)).toBeNull();
  });

  it('resolves bundled compatibility phrase lessons as authored content or allowed template fallback', () => {
    const authored = resolveBundledCompatibilityPlanContentPhraseLesson('voyazh', 1);
    const fallback = resolveBundledCompatibilityPlanContentPhraseLesson('voyazh', 999);

    expect(authored.kind).toBe('authored_day');
    if (authored.kind === 'authored_day') {
      expect(authored.day.planId).toBe('voyazh');
      expect(authored.day.dayIndex).toBe(1);
      expect(authored.uiState.canRenderAuthoredContent).toBe(true);
      expect(authored.uiState.shouldUseTemplateFallback).toBe(false);
    }

    expect(fallback).toMatchObject({
      kind: 'template_fallback',
      uiState: {
        shouldUseBundledCompatibility: true,
        shouldUseTemplateFallback: true,
        shouldBlockProgressCredit: false,
      },
    });
  });

  it('maps authored readiness into surface-specific UI decisions', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });

    expect(resolvePlanContentUiState(readiness, 'report_marker')).toMatchObject({
      contentSource: 'bundled_compatibility',
      shouldShowReportMarker: true,
      canRenderAuthoredContent: false,
      shouldUseBundledCompatibility: true,
      shouldBlockProgressCredit: false,
      copyKey: 'plan_content.offline_fallback',
    });
    expect(resolvePlanContentUiState(readiness, 'theory_entry')).toMatchObject({
      contentSource: 'bundled_compatibility',
      shouldShowTheoryEntry: true,
      canRenderAuthoredContent: true,
      shouldUseBundledCompatibility: true,
      shouldBlockProgressCredit: false,
    });
    expect(resolvePlanContentUiState(readiness, 'theory_screen')).toMatchObject({
      contentSource: 'bundled_compatibility',
      canRenderAuthoredContent: true,
      shouldShowLoading: false,
      shouldShowEmptyState: false,
      shouldUseTemplateFallback: false,
    });
  });

  it('allows the legacy phrase template fallback only for bundled compatibility missing days', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 999,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });

    expect(resolvePlanContentUiState(readiness, 'phrase_lesson')).toMatchObject({
      contentSource: 'template_fallback',
      shouldUseBundledCompatibility: true,
      shouldUseTemplateFallback: true,
      shouldBlockProgressCredit: false,
      copyKey: 'plan_content.missing',
    });
    expect(resolvePlanContentUiState(readiness, 'theory_screen')).toMatchObject({
      contentSource: 'empty_state',
      shouldShowEmptyState: true,
      shouldUseTemplateFallback: false,
      shouldBlockProgressCredit: false,
    });
  });

  it('blocks unsafe future pack states instead of silently falling back to templates', () => {
    const missing = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 999,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });

    const corrupt = {
      ...missing,
      state: 'corrupt' as const,
      pack: { ...missing.pack, state: 'corrupt' as const },
    };
    const stale = {
      ...missing,
      state: 'stale' as const,
      pack: { ...missing.pack, state: 'stale' as const },
    };
    const downloading = {
      ...missing,
      state: 'downloading' as const,
      pack: { ...missing.pack, state: 'downloading' as const },
    };

    expect(resolvePlanContentUiState(corrupt, 'phrase_lesson')).toMatchObject({
      contentSource: 'blocked_state',
      shouldUseTemplateFallback: false,
      shouldBlockProgressCredit: true,
      copyKey: 'plan_content.corrupt',
    });
    expect(resolvePlanContentUiState(stale, 'phrase_lesson')).toMatchObject({
      contentSource: 'blocked_state',
      shouldUseTemplateFallback: false,
      shouldBlockProgressCredit: true,
      copyKey: 'plan_content.stale',
    });
    expect(resolvePlanContentUiState(downloading, 'phrase_lesson')).toMatchObject({
      contentSource: 'loading_state',
      shouldShowLoading: true,
      shouldUseTemplateFallback: false,
      shouldBlockProgressCredit: true,
      copyKey: 'plan_content.downloading',
    });
    expect(resolvePlanContentPhraseLesson(corrupt)).toMatchObject({
      kind: 'blocked',
      uiState: {
        shouldUseTemplateFallback: false,
        shouldBlockProgressCredit: true,
      },
    });
    expect(resolvePlanContentPhraseLesson(downloading)).toMatchObject({
      kind: 'blocked',
      uiState: {
        shouldShowLoading: true,
        shouldUseTemplateFallback: false,
        shouldBlockProgressCredit: true,
      },
    });
  });

  it('does not expose authored content or theory entry for unsafe future pack states', () => {
    const ready = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: true,
    });
    const corrupt = {
      ...ready,
      state: 'corrupt' as const,
      pack: { ...ready.pack, state: 'corrupt' as const },
    };
    const stale = {
      ...ready,
      state: 'stale' as const,
      pack: { ...ready.pack, state: 'stale' as const },
    };

    expect(resolvePlanContentUiState(corrupt, 'theory_entry')).toMatchObject({
      contentSource: 'hidden',
      shouldShowTheoryEntry: false,
      canRenderAuthoredContent: false,
      copyKey: 'plan_content.corrupt',
    });
    expect(resolvePlanContentUiState(stale, 'theory_screen')).toMatchObject({
      contentSource: 'blocked_state',
      canRenderAuthoredContent: false,
      shouldBlockProgressCredit: true,
      copyKey: 'plan_content.stale',
    });
  });

  it('keeps selection-required state non-renderable until source and target are explicit', () => {
    const readiness = resolvePlanContentDayReadiness({
      planId: 'voyazh',
      dayIndex: 1,
      studyTarget: 'en',
      sourceLocale: 'ru',
      selectionConfirmed: false,
    });

    expect(resolvePlanContentUiState(readiness, 'report_marker')).toMatchObject({
      contentSource: 'hidden',
      shouldShowReportMarker: false,
      shouldBlockProgressCredit: false,
      copyKey: 'plan_content.selection_required',
    });
    expect(resolvePlanContentUiState(readiness, 'theory_screen')).toMatchObject({
      contentSource: 'blocked_state',
      canRenderAuthoredContent: false,
      shouldBlockProgressCredit: true,
      copyKey: 'plan_content.selection_required',
    });
  });
});
