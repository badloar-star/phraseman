import type { CourseLevel } from './course_levels';
import type { SourceLocale } from './source_locales';

export type LevelExamLevel = CourseLevel;

export type LevelExamFormat =
  | 'context_choice'
  | 'phrase_builder'
  | 'meaning_choice'
  | 'speed_match';

export type LevelExamOption = {
  id: string;
  text: string;
};

export type LevelExamToken = {
  id: string;
  text: string;
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
  format: 'context_choice' | 'meaning_choice';
  options: readonly LevelExamOption[];
  correctOptionId: string;
};

export type LevelExamPhraseBuilderTask = LevelExamSingleScoreTaskBase & {
  format: 'phrase_builder';
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
  version: 2;
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
