import { getLessonData } from './lesson_data_all';
import type { LessonPhrase } from './lesson_data_types';
import { getExamMedalTier, type MedalTier } from './medal_utils';
import type { LevelExamFinishReason, PersistedLevelExamAnswer } from './level_exam_attempt_state';
import type { LevelExamBlueprint, LevelExamFormat } from './level_exam_types';

export type LevelExamAnswers = Record<string, PersistedLevelExamAnswer>;

export type LevelExamScoreResult = {
  score: number;
  total: 30;
  pct: number;
  passed: boolean;
  neededForPass: number;
  finishReason: LevelExamFinishReason;
  byFormat: Record<LevelExamFormat, { correct: number; total: number }>;
  byLesson: { lessonId: number; correct: number; total: number }[];
  weakLessons: { lessonId: number; title: string; correct: number; total: number }[];
  medal: MedalTier;
  baseXp: number;
};

type ScoredUnit = {
  scoreUnitId: string;
  format: LevelExamFormat;
  lessonId: number;
  correct: boolean;
};

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function lessonTitle(phrase: LessonPhrase | undefined, lessonId: number, sourceLocale: string): string {
  if (!phrase) return `Lesson ${lessonId}`;
  if (sourceLocale === 'ru') return phrase.lessonTitleRU || `Урок ${lessonId}`;
  if (sourceLocale === 'uk') return phrase.lessonTitleUK || phrase.lessonTitleRU || `Урок ${lessonId}`;
  if (sourceLocale === 'es') return phrase.lessonTitleES || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  if (sourceLocale === 'pt-BR') return phrase.lessonTitlePtBr || phrase.lessonTitleES || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  if (sourceLocale === 'vi') return phrase.lessonTitleVi || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  if (sourceLocale === 'id') return phrase.lessonTitleId || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  if (sourceLocale === 'tr') return phrase.lessonTitleTr || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  if (sourceLocale === 'pl') return phrase.lessonTitlePl || phrase.lessonTitleRU || `Lesson ${lessonId}`;
  return phrase.lessonTitleRU || `Lesson ${lessonId}`;
}

export function scoreLevelExam(
  blueprint: LevelExamBlueprint,
  answers: LevelExamAnswers,
  finishReason: LevelExamFinishReason,
): LevelExamScoreResult {
  if (blueprint.scoredUnitIds.length !== 30 || new Set(blueprint.scoredUnitIds).size !== 30) {
    throw new Error('level_exam_scoring_blueprint_invalid');
  }

  const units: ScoredUnit[] = [];
  for (const task of blueprint.tasks) {
    if (task.format === 'speed_match') {
      for (const pair of task.pairs) {
        const answer = answers[pair.scoreUnitId];
        units.push({
          scoreUnitId: pair.scoreUnitId,
          format: task.format,
          lessonId: pair.lessonId,
          correct: answer?.kind === 'speed_match' && answer.targetScoreUnitId === pair.scoreUnitId,
        });
      }
    } else if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
      const answer = answers[task.scoreUnitId];
      units.push({
        scoreUnitId: task.scoreUnitId,
        format: task.format,
        lessonId: task.lessonId,
        correct: answer?.kind === 'choice' && answer.optionId === task.correctOptionId,
      });
    } else if (task.format === 'translate_build') {
      const answer = answers[task.scoreUnitId];
      units.push({
        scoreUnitId: task.scoreUnitId,
        format: task.format,
        lessonId: task.lessonId,
        correct: answer?.kind === 'translate_build' && sameStrings(answer.tokenIds, task.correctTokenIds),
      });
    }
  }

  if (units.length !== 30
    || new Set(units.map((unit) => unit.scoreUnitId)).size !== 30
    || blueprint.scoredUnitIds.some((scoreUnitId) => !units.some((unit) => unit.scoreUnitId === scoreUnitId))) {
    throw new Error('level_exam_scoring_units_invalid');
  }

  const byFormat = {
    guess_phrase: { correct: 0, total: 0 },
    fill_gap: { correct: 0, total: 0 },
    find_oddity: { correct: 0, total: 0 },
    translate_build: { correct: 0, total: 0 },
    speed_match: { correct: 0, total: 0 },
  } satisfies Record<LevelExamFormat, { correct: number; total: number }>;
  const lessonTotals = new Map<number, { correct: number; total: number }>();
  for (const unit of units) {
    byFormat[unit.format].total += 1;
    if (unit.correct) byFormat[unit.format].correct += 1;
    const lesson = lessonTotals.get(unit.lessonId) ?? { correct: 0, total: 0 };
    lesson.total += 1;
    if (unit.correct) lesson.correct += 1;
    lessonTotals.set(unit.lessonId, lesson);
  }

  const byLesson = [...lessonTotals.entries()]
    .map(([lessonId, counts]) => ({ lessonId, ...counts }))
    .sort((left, right) => left.lessonId - right.lessonId);
  const weakLessons = byLesson
    .filter((lesson) => lesson.correct < lesson.total)
    .sort((left, right) => {
      const accuracy = left.correct / left.total - right.correct / right.total;
      return accuracy || right.total - left.total || left.lessonId - right.lessonId;
    })
    .slice(0, 3)
    .map((lesson) => ({
      ...lesson,
      title: lessonTitle(getLessonData(lesson.lessonId)[0], lesson.lessonId, blueprint.sourceLocale),
    }));

  const score = units.filter((unit) => unit.correct).length;
  const pct = Math.round((score / 30) * 100);
  const passed = score >= blueprint.passScore;
  return {
    score,
    total: 30,
    pct,
    passed,
    neededForPass: Math.max(0, blueprint.passScore - score),
    finishReason,
    byFormat,
    byLesson,
    weakLessons,
    medal: getExamMedalTier(pct),
    baseXp: passed ? 50 + Math.round(pct / 2) : Math.max(10, Math.round(pct / 4)),
  };
}
