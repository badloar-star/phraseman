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
import type { RuntimeStudyTarget } from '../target_storage_keys';
import type { PhraseMistakeCategoryStat } from '../mistake_log';
import type { TrainerDashboard } from '../trainer_store';
import type { PosMasteryEntry } from '../pos_workout_engine';
import type { PersonalPlanHomeSnapshot } from '../personal_plan_state';

import { compassOn } from './compass_flags';
import { getTopMistakePhraseDetails, getMistakeCountByLesson } from '../mistake_log';
import { getTrainerDashboard } from '../trainer_store';
import { getPosMasterySnapshot } from '../pos_workout_engine';
import { readPersonalPlanSnapshot } from '../personal_plan_state';
import { readPassedLessonIds } from '../plan_day_lesson_recommendation';

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

  const [mistakes, mistakesByLesson, trainer, posMastery, planDay, passedLessons] =
    await Promise.all([
      safe(() => getTopMistakePhraseDetails(20, 1, studyTarget), [] as PhraseMistakeCategoryStat[]),
      safe(() => getMistakeCountByLesson(studyTarget), {} as Record<number, number>),
      safe(() => getTrainerDashboard(studyTarget), null as TrainerDashboard | null),
      safe(() => getPosMasterySnapshot(studyTarget), [] as PosMasteryEntry[]),
      safe(() => readPersonalPlanSnapshot(), null as PersonalPlanHomeSnapshot | null),
      safe(() => readPassedLessonIds(studyTarget), [] as number[]),
    ]);

  return {
    mistakes,
    mistakesByLesson,
    trainer,
    posMastery,
    planDay,
    passedLessons,
    collectedAtMs: nowMs,
  };
}
