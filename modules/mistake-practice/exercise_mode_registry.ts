import type { ArenaTaskMode } from '../arena/contract';
import type { MistakeFacet } from './contracts';

export type LessonMistakeExerciseMode =
  | 'lesson_choice'
  | 'lesson_fill_gap'
  | 'lesson_ordered_tokens'
  | 'lesson_typing'
  | 'lesson_listening'
  | 'lesson_scripted_speech';

export type ArenaMistakeExerciseMode = `arena_${ArenaTaskMode}`;
export type MistakeExerciseMode =
  | LessonMistakeExerciseMode
  | ArenaMistakeExerciseMode;
export type MistakeExerciseSupport = 'recognition' | 'guided' | 'production';

export interface MistakeExerciseCapabilities {
  readonly hasMeaningDistractors: boolean;
  readonly hasTokenDistractors: boolean;
  readonly hasOddityCandidates: boolean;
  readonly supportsTyping: boolean;
  readonly hasAudio: boolean;
  readonly supportsSpeech: boolean;
  readonly tokenCount: number;
}

export interface MistakeExerciseModeDefinition {
  readonly facets: readonly MistakeFacet[];
  readonly support: MistakeExerciseSupport;
  readonly countsAsIndependentProduction: boolean;
  readonly priority: number;
  readonly compatible: (capabilities: MistakeExerciseCapabilities) => boolean;
}

const hasMeaningChoices = (caps: MistakeExerciseCapabilities): boolean =>
  caps.hasMeaningDistractors;
const hasGapMaterial = (caps: MistakeExerciseCapabilities): boolean =>
  caps.hasTokenDistractors && caps.tokenCount > 0;
const hasBuilderMaterial = (caps: MistakeExerciseCapabilities): boolean =>
  caps.tokenCount > 1;
const modeDefinition = (
  definition: MistakeExerciseModeDefinition,
): MistakeExerciseModeDefinition => Object.freeze(definition);

export const MISTAKE_EXERCISE_MODE_REGISTRY: Readonly<
  Record<MistakeExerciseMode, MistakeExerciseModeDefinition>
> = Object.freeze({
  lesson_choice: modeDefinition({
    facets: ['meaning', 'form', 'listening'],
    support: 'recognition',
    countsAsIndependentProduction: false,
    priority: 40,
    compatible: hasMeaningChoices,
  }),
  lesson_fill_gap: modeDefinition({
    facets: ['form', 'missing_token'],
    support: 'guided',
    countsAsIndependentProduction: false,
    priority: 20,
    compatible: hasGapMaterial,
  }),
  lesson_ordered_tokens: modeDefinition({
    facets: ['form', 'word_order', 'missing_token'],
    support: 'guided',
    countsAsIndependentProduction: false,
    priority: 10,
    compatible: hasBuilderMaterial,
  }),
  lesson_typing: modeDefinition({
    facets: [
      'meaning',
      'form',
      'word_order',
      'missing_token',
      'listening',
      'pronunciation',
    ],
    support: 'production',
    countsAsIndependentProduction: true,
    priority: 5,
    compatible: (caps) => caps.supportsTyping,
  }),
  lesson_listening: modeDefinition({
    facets: ['meaning', 'form', 'listening'],
    support: 'guided',
    countsAsIndependentProduction: false,
    priority: 30,
    compatible: (caps) => caps.hasAudio && caps.hasMeaningDistractors,
  }),
  lesson_scripted_speech: modeDefinition({
    facets: ['form', 'word_order', 'pronunciation'],
    support: 'production',
    countsAsIndependentProduction: true,
    priority: 4,
    compatible: (caps) => caps.supportsSpeech,
  }),
  arena_guess_phrase: modeDefinition({
    facets: ['meaning', 'form'],
    support: 'recognition',
    countsAsIndependentProduction: false,
    priority: 50,
    compatible: hasMeaningChoices,
  }),
  arena_fill_gap: modeDefinition({
    facets: ['form', 'missing_token'],
    support: 'guided',
    countsAsIndependentProduction: false,
    priority: 25,
    compatible: hasGapMaterial,
  }),
  arena_find_oddity: modeDefinition({
    facets: ['meaning', 'form', 'missing_token'],
    support: 'recognition',
    countsAsIndependentProduction: false,
    priority: 55,
    compatible: (caps) => caps.hasOddityCandidates,
  }),
  arena_translate_build: modeDefinition({
    facets: ['meaning', 'form', 'word_order', 'missing_token'],
    support: 'guided',
    countsAsIndependentProduction: false,
    priority: 15,
    compatible: hasBuilderMaterial,
  }),
  arena_speed_match: modeDefinition({
    facets: ['meaning', 'form', 'listening'],
    support: 'recognition',
    countsAsIndependentProduction: false,
    priority: 60,
    // A single mistake contains no real phrase-to-meaning pair set. Keep the
    // registered Arena mechanic unavailable until such a set is supplied.
    compatible: () => false,
  }),
} satisfies Record<MistakeExerciseMode, MistakeExerciseModeDefinition>);

const supportRank: Readonly<Record<MistakeExerciseSupport, number>> = {
  recognition: 0,
  guided: 1,
  production: 2,
};

export function compatibleMistakeExerciseModes(input: {
  readonly facet: MistakeFacet;
  readonly capabilities: MistakeExerciseCapabilities;
  readonly stage: MistakeExerciseSupport;
}): readonly MistakeExerciseMode[] {
  return (Object.entries(MISTAKE_EXERCISE_MODE_REGISTRY) as [
    MistakeExerciseMode,
    MistakeExerciseModeDefinition,
  ][])
    .filter(([, definition]) =>
      definition.facets.includes(input.facet)
      && definition.compatible(input.capabilities)
      && supportRank[definition.support] === supportRank[input.stage],
    )
    .sort((left, right) =>
      left[1].priority - right[1].priority || left[0].localeCompare(right[0]),
    )
    .map(([mode]) => mode);
}

export function chooseMistakeExerciseMode(input: {
  readonly facet: MistakeFacet;
  readonly capabilities: MistakeExerciseCapabilities;
  readonly stage: MistakeExerciseSupport;
  readonly recentModes: readonly MistakeExerciseMode[];
}): MistakeExerciseMode {
  const fallbackStages: readonly MistakeExerciseSupport[] = input.stage === 'recognition'
    ? ['recognition', 'guided', 'production']
    : input.stage === 'guided'
      ? ['guided', 'recognition', 'production']
      : ['production', 'guided', 'recognition'];
  let compatible: readonly MistakeExerciseMode[] = [];
  for (const stage of fallbackStages) {
    compatible = compatibleMistakeExerciseModes({ ...input, stage });
    if (compatible.length > 0) break;
  }
  if (compatible.length === 0) {
    throw new Error('mistake_practice_no_compatible_exercise_mode');
  }
  const previous = input.recentModes[input.recentModes.length - 1];
  return compatible.find((mode) => mode !== previous) ?? compatible[0];
}
