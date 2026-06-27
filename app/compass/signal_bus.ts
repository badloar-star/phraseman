/**
 * Компас — шина сигналов (Signal Bus). ФУНДАМЕНТ, Волна 1.2.
 *
 * Единая точка, через которую Компас ЧИТАЕТ весь путь ученика по уже готовым
 * системам приложения. НИЧЕГО не пишет и не считает заново — только собирает
 * один снимок `CompassSnapshot` из существующих ридеров.
 *
 * ИЗОЛЯЦИЯ (главное правило):
 *  - если Компас выключен (`compassOn() === false`) — `collectCompassSnapshot`
 *    немедленно возвращает `null`, НИ ОДНОГО чтения не происходит, основное
 *    приложение не затрагивается;
 *  - каждый ридер обёрнут в безопасный `safe(...)`: сбой одного источника даёт
 *    дефолт для этого поля, а не падение всего снимка;
 *  - модуль не импортируется основным приложением — только другими модулями
 *    `app/compass/`.
 *
 * Источники (читаем как есть, не трогаем):
 *  - ошибки:      mistake_log (getTopMistakePhraseDetails, getMistakeCountByLesson)
 *  - повторения:  trainer_store (getTrainerDashboard)
 *  - мастерство:  pos_workout_engine (getPosMasterySnapshot)
 *  - план:        personal_plan_state (readPersonalPlanSnapshot)
 *  - пройдено:    plan_day_lesson_recommendation (readPassedLessonIds)
 */
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { PhraseMistakeCategoryStat } from '../mistake_log';
import type { TrainerDashboard } from '../trainer_store';
import type { PosMasteryEntry } from '../pos_workout_engine';
import type { PersonalPlanHomeSnapshot } from '../personal_plan_state';
import type { WordCategory, WordCategoryStat } from '../phrase_analytics';

import { compassOn } from './compass_flags';
import { getTopMistakePhraseDetails, getMistakeCountByLesson } from '../mistake_log';
import { getTrainerDashboard } from '../trainer_store';
import { getPosMasterySnapshot } from '../pos_workout_engine';
import { readPersonalPlanSnapshot } from '../personal_plan_state';
import { readPassedLessonIds } from '../plan_day_lesson_recommendation';
import { computePhraseAnalytics } from '../phrase_analytics';
import { loadResolvedPersonalTrainings } from '../diagnosis_training_progress';
import { chooseAvailableDiagnosisForCategory } from '../personal_practice_lesson_router';

export interface CompassMistakeRepairTarget {
  microDiagnosisId: string;
  category: WordCategory;
  topWords: string[];
  priorityScore: number;
}

/** Снимок всего пути ученика. Всё — из готовых систем, ничего нового не считается. */
export interface CompassSnapshot {
  /** Частые фразы-ошибки за окно аналитики (где спотыкается). */
  mistakes: PhraseMistakeCategoryStat[];
  /** Счётчик ошибок по урокам (какая сессия «болит»). */
  mistakesByLesson: Record<number, number>;
  /** Дашборд тренажёра: что пора повторить, слабые очереди/категории. */
  trainer: TrainerDashboard | null;
  /** Мастерство по 15 грамматическим темам (сила тем). */
  posMastery: PosMasteryEntry[];
  /** Снимок дня плана (где ученик в плане), либо null если плана нет. */
  planDay: PersonalPlanHomeSnapshot | null;
  /** Пройденные сессии (id), чтобы не звать туда, где ученик уже силён. */
  passedLessons: number[];
  mistakeRepairTargets?: CompassMistakeRepairTarget[];
  /** Когда снят (мс), для воспроизводимости/кэша. */
  collectedAtMs: number;
}

/** Безопасное чтение: при сбое источника возвращаем дефолт, не валим снимок. */
async function safe<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

function isWeakCategory(stat: WordCategoryStat): boolean {
  const priority = stat.priorityScore ?? stat.weaknessScore;
  const recovery = stat.recoveryScore ?? 0;
  return priority >= 55 || (stat.pct >= 15 && recovery < 25);
}

async function collectMistakeRepairTargets(
  studyTarget: RuntimeStudyTarget,
): Promise<CompassMistakeRepairTarget[]> {
  if (storageStudyTarget(studyTarget) !== 'en') return [];

  const [analytics, resolved] = await Promise.all([
    computePhraseAnalytics(),
    loadResolvedPersonalTrainings({ studyTarget }),
  ]);
  const seen = new Set<string>();
  const targets: CompassMistakeRepairTarget[] = [];

  for (const stat of analytics.categoryStats.filter(isWeakCategory)) {
    const microDiagnosisId = chooseAvailableDiagnosisForCategory(
      { category: stat.category, topWords: stat.topWords },
      resolved,
      studyTarget,
    );
    if (!microDiagnosisId || seen.has(microDiagnosisId)) continue;
    seen.add(microDiagnosisId);
    targets.push({
      microDiagnosisId,
      category: stat.category,
      topWords: stat.topWords.slice(0, 3),
      priorityScore: stat.priorityScore ?? stat.weaknessScore,
    });
    if (targets.length >= 3) break;
  }

  return targets;
}

/**
 * Собрать снимок пути ученика. Возвращает `null`, если Компас выключен —
 * тогда вообще ни одно чтение не выполняется (нулевая стоимость при off).
 *
 * `nowMs` передаётся снаружи (а не Date.now() внутри) для тестируемости и кэша.
 */
export async function collectCompassSnapshot(
  studyTarget: RuntimeStudyTarget,
  nowMs: number,
): Promise<CompassSnapshot | null> {
  if (!compassOn()) return null;

  const [mistakes, mistakesByLesson, trainer, posMastery, planDay, passedLessons, mistakeRepairTargets] =
    await Promise.all([
      safe(() => getTopMistakePhraseDetails(20, 1, studyTarget), [] as PhraseMistakeCategoryStat[]),
      safe(() => getMistakeCountByLesson(studyTarget), {} as Record<number, number>),
      safe(() => getTrainerDashboard(studyTarget), null as TrainerDashboard | null),
      safe(() => getPosMasterySnapshot(studyTarget), [] as PosMasteryEntry[]),
      safe(() => readPersonalPlanSnapshot(), null as PersonalPlanHomeSnapshot | null),
      safe(() => readPassedLessonIds(studyTarget), [] as number[]),
      safe(() => collectMistakeRepairTargets(studyTarget), [] as CompassMistakeRepairTarget[]),
    ]);

  return {
    mistakes,
    mistakesByLesson,
    trainer,
    posMastery,
    planDay,
    passedLessons,
    mistakeRepairTargets,
    collectedAtMs: nowMs,
  };
}
