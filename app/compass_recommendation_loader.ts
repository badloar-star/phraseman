import type { Lang } from '../constants/i18n';
import { peekHomeScreenHydration, type HomeScreenHydration } from './home_screen_hydration';
import { buildWeeklyReviewBriefing, type WeeklyReviewBriefingBuildResult } from './weekly_review_briefing';
import { getTrainerDashboard, type TrainerDashboard } from './trainer_store';
import type { RuntimeSourceLocale, RuntimeStudyTarget } from './target_storage_keys';
import { loadCompassAiExplanation } from './compass_ai_explanation';
import {
  selectCompassRecommendation,
  type CompassRecommendation,
  type CompassRecommendationResult,
  type CompassSource,
  type CompassTrainerSignals,
} from './compass_recommendation';
import {
  homeLessonCompassSource,
  trainerCompassSource,
  unavailableCompassSource,
  weeklyBriefingCompassSource,
} from './compass_recommendation_adapters';

export type LoadCompassRecommendationOptions = {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  sourceLocale?: RuntimeSourceLocale;
  deps?: LoadCompassRecommendationDependencies;
};

export type LoadCompassRecommendationDependencies = {
  loadTrainer: (
    studyTarget?: RuntimeStudyTarget,
    sourceLocale?: RuntimeSourceLocale,
  ) => Promise<TrainerDashboard>;
  loadWeeklyReview: (input: {
    lang: Lang;
    studyTarget?: RuntimeStudyTarget;
  }) => Promise<WeeklyReviewBriefingBuildResult>;
  peekHome: (studyTarget?: RuntimeStudyTarget) => HomeScreenHydration | null;
  loadExplanation?: (input: {
    recommendation: CompassRecommendation;
    lang: Lang;
    studyTarget?: RuntimeStudyTarget;
  }) => ReturnType<typeof loadCompassAiExplanation>;
};

export type LoadedCompassRecommendationResult =
  | (Extract<CompassRecommendationResult, { status: 'ready' }> & { whyNow: string })
  | Extract<CompassRecommendationResult, { status: 'insufficient' }>;

const DEFAULT_DEPS: LoadCompassRecommendationDependencies = {
  loadTrainer: (studyTarget, sourceLocale) => getTrainerDashboard(studyTarget, sourceLocale),
  loadWeeklyReview: ({ lang, studyTarget }) => buildWeeklyReviewBriefing({
    lang,
    studyTarget,
    // Aggregate content is tier-independent; Compass never invokes the review LLM.
    isPremium: false,
  }),
  peekHome: (studyTarget) => peekHomeScreenHydration(studyTarget === 'fr' ? 'fr' : 'en'),
  loadExplanation: loadCompassAiExplanation,
};

function weeklySource(
  result: PromiseSettledResult<WeeklyReviewBriefingBuildResult>,
): ReturnType<typeof weeklyBriefingCompassSource> | CompassSource<null> {
  if (result.status === 'rejected' || result.value.status === 'error') {
    return unavailableCompassSource('error');
  }
  if (result.value.status === 'insufficient') return weeklyBriefingCompassSource(null);
  return weeklyBriefingCompassSource(result.value.briefing);
}

/**
 * Reads aggregate snapshots, chooses one action deterministically, then asks
 * the bounded explanation pipeline for `whyNow`. A recommendation becomes
 * UI-ready only after both parts pass validation. No navigation, reward, or
 * Daily Tasks contract is involved.
 */
export async function loadCompassRecommendation(
  options: LoadCompassRecommendationOptions,
): Promise<LoadedCompassRecommendationResult> {
  const deps = options.deps ?? DEFAULT_DEPS;
  const home = deps.peekHome(options.studyTarget);
  const [trainerSettled, weeklySettled] = await Promise.allSettled([
    deps.loadTrainer(options.studyTarget, options.sourceLocale),
    deps.loadWeeklyReview({ lang: options.lang, studyTarget: options.studyTarget }),
  ]);

  const trainer = trainerSettled.status === 'fulfilled'
    ? trainerCompassSource(trainerSettled.value)
    : unavailableCompassSource<CompassTrainerSignals>('error');
  const selected = selectCompassRecommendation({
    trainer,
    lessonProgress: home
      ? homeLessonCompassSource(home)
      : unavailableCompassSource('unavailable'),
    weeklyReview: weeklySource(weeklySettled),
  });
  if (selected.status !== 'ready') return selected;
  const explanation = await (deps.loadExplanation ?? loadCompassAiExplanation)({
    recommendation: selected.recommendation,
    lang: options.lang,
    studyTarget: options.studyTarget,
  });
  if (explanation.status !== 'ready') {
    return {
      status: 'insufficient',
      reason: 'sources_not_ready',
      missingSources: selected.missingSources,
    };
  }
  return { ...selected, whyNow: explanation.whyNow };
}

export default function __RouteShim() { return null; }
