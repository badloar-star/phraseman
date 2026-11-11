import type { ExpandedExercise, ExpandedFormat } from '../modules/expanded-formats/types';
import type { CourseLevel } from './course_levels';
import type { SourceLocale } from './source_locales';

export type LevelExamLevel = CourseLevel;

// зачем (владелец 11.11.2026): версия 5 — в экзамен пришли двенадцать новых механик Пика, набор заданий зависит от уровня.
// Версии 3 и 4 остаются поддержанными: начатая до обновления попытка восстанавливается своим набором.
export const CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION = 5 as const;
export const SUPPORTED_LEVEL_EXAM_BLUEPRINT_VERSIONS = [3, 4, CURRENT_LEVEL_EXAM_BLUEPRINT_VERSION] as const;
export type LevelExamBlueprintVersion = (typeof SUPPORTED_LEVEL_EXAM_BLUEPRINT_VERSIONS)[number];

export type LevelExamClassicFormat =
  | 'guess_phrase'
  | 'fill_gap'
  | 'find_oddity'
  | 'translate_build'
  | 'speed_match';

export type LevelExamFormat = LevelExamClassicFormat | ExpandedFormat;

/**
 * зачем (владелец 11.11.2026, «перевести на новые механики»): экзамен уровня работает для всех пяти курсов. Язык курса идёт
 * в набор заданий, в сохранённую попытку и в ключи прогресса — раньше движок считал язык английским, и прогресс остальных
 * курсов писался бы под английскими ключами.
 */
export const LEVEL_EXAM_STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
export type LevelExamStudyTarget = (typeof LEVEL_EXAM_STUDY_TARGETS)[number];

export function isLevelExamStudyTarget(value: unknown): value is LevelExamStudyTarget {
  return typeof value === 'string' && (LEVEL_EXAM_STUDY_TARGETS as readonly string[]).includes(value);
}

/**
 * зачем (владелец 11.11.2026, «растущий порог»): с версии 5 порог сдачи растёт с уровнем — A1 и A2 21, B1 22, B2 23 из 30.
 * Попытка, начатая на версии 3 или 4, досдаётся по прежнему порогу 21: правила посреди попытки не меняются.
 */
export type LevelExamPassScore = 21 | 22 | 23;
export const LEVEL_EXAM_LEGACY_PASS_SCORE = 21 as const;
export const LEVEL_EXAM_PASS_SCORE: Readonly<Record<LevelExamLevel, LevelExamPassScore>> = { A1: 21, A2: 21, B1: 22, B2: 23 };

export function levelExamPassScore(level: LevelExamLevel, blueprintVersion: number): LevelExamPassScore {
  return blueprintVersion >= 5 ? LEVEL_EXAM_PASS_SCORE[level] : LEVEL_EXAM_LEGACY_PASS_SCORE;
}

export type LevelExamOption = {
  id: string;
  text: string;
};

export type LevelExamToken = {
  id: string;
  text: string;
  isDistractor?: boolean;
};

type LevelExamSingleScoreTaskBase = {
  id: string;
  scoreUnitId: string;
  lessonId: number;
  phraseId: string;
  prompt: string;
  explanation: string;
};

export type LevelExamChoiceTask = LevelExamSingleScoreTaskBase & {
  format: 'guess_phrase' | 'fill_gap' | 'find_oddity';
  options: readonly LevelExamOption[];
  correctOptionId: string;
  acceptedOptionIds?: readonly string[];
};

export type LevelExamPhraseBuilderTask = LevelExamSingleScoreTaskBase & {
  format: 'translate_build';
  tokens: readonly LevelExamToken[];
  correctTokenIds: readonly string[];
};

export type LevelExamSpeedMatchPair = {
  scoreUnitId: string;
  lessonId: number;
  phraseId: string;
  source: string;
  target: string;
};

export type LevelExamSpeedMatchTask = {
  id: string;
  format: 'speed_match';
  pairs: readonly LevelExamSpeedMatchPair[];
};

/** Задание одной из двенадцати новых механик: собрано из фраз уроков (app/level_exam_expanded_builder.ts). */
export type LevelExamExpandedTask = LevelExamSingleScoreTaskBase & {
  format: ExpandedFormat;
  /** Что сделать — подпись над заданием на языке ученика. */
  instruction: string;
  /** Условие под фразой; может быть пустым. */
  context: string;
  exercise: ExpandedExercise;
};

export type LevelExamTask =
  | LevelExamChoiceTask
  | LevelExamPhraseBuilderTask
  | LevelExamSpeedMatchTask
  | LevelExamExpandedTask;

export type LevelExamBlueprint = {
  version: LevelExamBlueprintVersion;
  level: LevelExamLevel;
  studyTarget: LevelExamStudyTarget;
  sourceLocale: SourceLocale;
  seed: string;
  tasks: readonly LevelExamTask[];
  scoredUnitIds: readonly string[];
  durationMs: number;
  passScore: LevelExamPassScore;
};

export type BuildLevelExamBlueprintInput = {
  level: LevelExamLevel;
  studyTarget: LevelExamStudyTarget;
  sourceLocale: SourceLocale;
  seed: string;
  blueprintVersion?: LevelExamBlueprintVersion;
  /**
   * Интерфейс на английском. зачем (прогон на эмуляторе 11.11): среди языков перевода фраз английского нет, и английскому
   * интерфейсу подставлялся русский — ученик испанского с английским интерфейсом видел задание по-русски. У курсов, кроме
   * английского, перевод фразы на английский есть; подписи заданий на английском тоже есть. У английского курса перевод
   * остаётся прежним: «перевод» на английский был бы самой фразой.
   */
  englishInterface?: boolean;
};
