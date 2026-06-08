import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../components/LangContext';
import { bumpStatsDaily } from './stats_daily_breakdown';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { registerXP } from './xp_manager';
import { bumpPlanXpLedger } from './personal_plan_xp_ledger';

/**
 * XP awarded for completing one personal-plan task. Kept modest and flat so plan
 * activity counts toward streak/daily-goal/leaderboard without inflating the economy
 * relative to lessons/quizzes. Multipliers (club/streak/comeback) still apply because
 * 'plan_task_complete' is registered as earned XP in xp_manager.
 */
export const PLAN_TASK_XP = 6;

export type AwardPlanTaskParams = {
  /** Source-locale for leaderboard display name fallback. */
  lang: Lang;
  /** Study target so lifetime charts land in the correct per-target bucket. */
  studyTarget?: RuntimeStudyTarget;
  /** How many learnable phrases this task practiced (for the lifetime "phrases" chart). */
  phrasesPracticed?: number;
  /** Plan instance, so the per-plan XP ledger can attribute this task's XP. */
  planInstanceId?: string;
};

/**
 * Make a completed plan task visible to ALL stats systems:
 *  - registerXP -> leaderboard, week_leaderboard, daily_stats, streak chain
 *  - bumpStatsDaily -> "Весь путь" lifetime phrase chart
 *
 * Previously plan completion only wrote a local completion flag, so a learner who used
 * only Personal Plans appeared inactive everywhere (no streak, no XP, no leaderboard).
 *
 * Errors are swallowed: stats must never block the learner's progress through a task.
 */
export async function awardPlanTaskCompletion(params: AwardPlanTaskParams): Promise<void> {
  const { lang, studyTarget, phrasesPracticed = 1, planInstanceId } = params;
  const learned = Math.max(0, Math.floor(phrasesPracticed));

  try {
    const userName = (await AsyncStorage.getItem('user_name')) ?? '';
    await registerXP(PLAN_TASK_XP, 'plan_task_complete', userName, lang);
  } catch {
    // ignore — XP/streak update is best-effort
  }

  try {
    if (learned > 0) {
      await bumpStatsDaily('phrases_learned', learned, studyTarget);
    }
  } catch {
    // ignore — lifetime chart update is best-effort
  }

  if (planInstanceId) {
    await bumpPlanXpLedger(planInstanceId, PLAN_TASK_XP, learned);
  }
}
