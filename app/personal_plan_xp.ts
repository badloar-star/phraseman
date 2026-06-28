import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../components/LangContext';
import { bumpStatsDaily } from './stats_daily_breakdown';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { registerXP } from './xp_manager';
import { bumpPlanXpLedger } from './personal_plan_xp_ledger';
import { markPhrasesCounted } from './personal_plan_counted_phrases';

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
  /**
   * Ids фраз (contentUnitId), отработанных в этом задании. Предпочтительный вход:
   * lifetime-метрика phrases_learned прибавляется только на число фраз, ещё НЕ
   * зачтённых в этом экземпляре плана (дедупликация по id внутри плана). Так одна
   * и та же фраза дня, встречающаяся в нескольких заданиях/бонус-заданиях, не
   * раздувает «выучено». Если не передан — fallback на phrasesPracticed (без
   * дедупликации, поведение как раньше).
   */
  practicedPhraseIds?: readonly string[];
  /** How many learnable phrases this task practiced (legacy fallback when ids unavailable). */
  phrasesPracticed?: number;
  /** Plan instance, so the per-plan XP ledger can attribute this task's XP. */
  planInstanceId?: string;
  /** Task id, so server-side progress XP can be idempotent per completed task. */
  planTaskId?: string;
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
  const { lang, studyTarget, phrasesPracticed = 1, practicedPhraseIds, planInstanceId, planTaskId } = params;

  // Сколько НОВЫХ фраз засчитать в lifetime-статистику. Если переданы id фраз и
  // известен экземпляр плана — дедуплицируем по id внутри плана (одна фраза дня,
  // встречающаяся в нескольких заданиях, считается один раз). Иначе — legacy
  // fallback на сырой счётчик практикованных фраз.
  let learned: number;
  if (practicedPhraseIds && practicedPhraseIds.length > 0 && planInstanceId) {
    learned = await markPhrasesCounted(planInstanceId, practicedPhraseIds);
  } else {
    learned = Math.max(0, Math.floor(phrasesPracticed));
  }

  // XP-леджер ведём по числу практикованных фраз задания (а не уникальных) и
  // делаем идемпотентным по planTaskId — повторное завершение того же задания
  // не начисляет XP дважды. Сам факт записи (ledgerRecorded) гейтит начисление
  // XP, но НЕ начисление phrases_learned: для метрики важна дедупликация фраз,
  // которая уже сделана выше через markPhrasesCounted.
  const ledgerPhrases = practicedPhraseIds && practicedPhraseIds.length > 0
    ? practicedPhraseIds.length
    : Math.max(0, Math.floor(phrasesPracticed));
  let ledgerRecorded = true;
  if (planInstanceId) {
    ledgerRecorded = await bumpPlanXpLedger(planInstanceId, PLAN_TASK_XP, ledgerPhrases, planTaskId);
  }

  try {
    const userName = (await AsyncStorage.getItem('user_name')) ?? '';
    const eventTaskId = String(planTaskId || planInstanceId || 'task');
    await registerXP(PLAN_TASK_XP, 'plan_task_complete', userName, lang, undefined, {
      eventId: [
        'plan',
        String(studyTarget || 'na').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 40) || 'na',
        String(planInstanceId || 'instance').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 36) || 'instance',
        String(eventTaskId).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 36) || 'task',
        'complete',
      ].join(':'),
      payload: {
        studyTarget: studyTarget ?? null,
        planInstanceId: planInstanceId ?? null,
        planTaskId: planTaskId ?? null,
        phrasesPracticed: learned,
      },
    });
  } catch {
    // ignore — XP/streak update is best-effort
  }

  // phrases_learned начисляем на число НОВЫХ фраз. markPhrasesCounted уже
  // дедуплицировал глобально по плану (повтор → 0), поэтому здесь НЕ гейтим по
  // ledgerRecorded (иначе при повторном проходе с реально новыми фразами их бы
  // не засчитали). При legacy-пути (без id) ledgerRecorded ещё защищает от
  // двойного счёта при повторе того же задания.
  const guardLegacyDup = practicedPhraseIds && practicedPhraseIds.length > 0 ? true : ledgerRecorded;
  try {
    if (learned > 0 && guardLegacyDup) {
      await bumpStatsDaily('phrases_learned', learned, studyTarget);
    }
  } catch {
    // ignore — lifetime chart update is best-effort
  }
}
