import type { CourseLevel } from './course_levels';
import type { SourceLocale } from './source_locales';

export type LevelExamLevel = CourseLevel;

export type LevelExamFormat =
  | 'guess_phrase'
  | 'fill_gap'
  | 'find_oddity'
  | 'translate_build'
  | 'speed_match';

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

export type LevelExamTask =
  | LevelExamChoiceTask
  | LevelExamPhraseBuilderTask
  | LevelExamSpeedMatchTask;

export type LevelExamBlueprint = {
  version: 3;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  seed: string;
  tasks: readonly LevelExamTask[];
  scoredUnitIds: readonly string[];
  durationMs: number;
  passScore: 21;
};

export type BuildLevelExamBlueprintInput = {
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  seed: string;
};
