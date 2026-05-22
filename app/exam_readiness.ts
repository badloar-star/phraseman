/**
 * Оценка готовности к экзамену (экран диагностики и др.).
 * Учитывает: текущий урок (порог как у плашки 32/32), прогресс по фразам,
 * штраф за ячейки «wrong» в индикаторе урока.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lessonProgressKey, type RuntimeStudyTarget } from './target_storage_keys';

const PHRASE_SLOTS = 50;
/** Как в diagnostic_test / главной: урок «сдан» для экзамена. */
export const EXAM_LESSON_DONE_THRESHOLD = 45;
const LESSON_COUNT = 32;
/** Вклад одной ошибки в снижение % (до лимита ниже). */
const WRONG_WEIGHT = 0.32;
const WRONG_PENALTY_CAP = 28;

export type ExamReadinessSnapshot = {
  /** Итог 0–100 */
  percent: number;
  /** Первый урок (1…32), где ещё нет порога; если все сданы — 32 */
  currentLesson: number;
  /** Сумма «выученных» ячеек correct + replay_correct по всем 32 урокам */
  phrasesLearnedTotal: number;
  /** Сумма wrong по урокам 1…currentLesson */
  wrongInActiveScope: number;
};

function normalizeProgress(val: string | null): string[] {
  if (!val) return Array(PHRASE_SLOTS).fill('empty');
  try {
    const p = JSON.parse(val) as unknown;
    if (!Array.isArray(p)) return Array(PHRASE_SLOTS).fill('empty');
    const slice = p.slice(0, PHRASE_SLOTS);
    while (slice.length < PHRASE_SLOTS) slice.push('empty');
    return slice.map(x => (typeof x === 'string' ? x : 'empty'));
  } catch {
    return Array(PHRASE_SLOTS).fill('empty');
  }
}

/**
 * Эффективные «единицы» по урокам до текущего: каждый урок даёт до 1,
 * пропорционально correct/45. Уроки после current не входят в числитель —
 * пользователь их ещё не «должен» закрывать. Делитель всегда 32.
 * Штраф: сумма wrong только в уроках 1…currentLesson.
 */
export async function loadExamReadinessSnapshot(studyTarget?: RuntimeStudyTarget): Promise<ExamReadinessSnapshot> {
  const keys = Array.from({ length: LESSON_COUNT }, (_, i) => lessonProgressKey(i + 1, studyTarget));
  const rows = await AsyncStorage.multiGet(keys);
  const progresses = rows.map(([, v]) => normalizeProgress(v));

  let phrasesLearnedTotal = 0;
  const correctPerLesson: number[] = [];
  const wrongPerLesson: number[] = [];

  for (const arr of progresses) {
    let c = 0;
    let w = 0;
    for (const x of arr) {
      if (x === 'correct' || x === 'replay_correct') c++;
      else if (x === 'wrong') w++;
    }
    correctPerLesson.push(c);
    wrongPerLesson.push(w);
    phrasesLearnedTotal += c;
  }

  let currentLesson = LESSON_COUNT;
  for (let i = 0; i < LESSON_COUNT; i++) {
    if (correctPerLesson[i] < EXAM_LESSON_DONE_THRESHOLD) {
      currentLesson = i + 1;
      break;
    }
  }

  let effectiveUnits = 0;
  let wrongInActiveScope = 0;
  for (let i = 0; i < currentLesson; i++) {
    const c = correctPerLesson[i];
    effectiveUnits += Math.min(1, c / EXAM_LESSON_DONE_THRESHOLD);
    wrongInActiveScope += wrongPerLesson[i];
  }

  const base = (effectiveUnits / LESSON_COUNT) * 100;
  const wrongPenalty = Math.min(WRONG_PENALTY_CAP, wrongInActiveScope * WRONG_WEIGHT);
  const percent = Math.max(0, Math.min(100, Math.round(base - wrongPenalty)));

  return {
    percent,
    currentLesson,
    phrasesLearnedTotal,
    wrongInActiveScope,
  };
}
