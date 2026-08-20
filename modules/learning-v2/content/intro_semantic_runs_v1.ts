import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from './generator_course_contract';

export const LEARNING_V2_INTRO_RUN_SEMANTICS_V1 = Object.freeze([
  'explanation',
  'targetCorrect',
  'targetWrong',
  'nativeGloss',
] as const);

export type LearningV2IntroRunSemanticV1 =
  (typeof LEARNING_V2_INTRO_RUN_SEMANTICS_V1)[number];

export type LearningV2IntroTextRunV1 = Readonly<{
  text: string;
  semantic: LearningV2IntroRunSemanticV1;
}>;

export type LearningV2IntroRunsByLocaleV1 = LearningV2Localized<
  readonly LearningV2IntroTextRunV1[]
>;

export function introRunsPlainTextV1(
  runs: readonly LearningV2IntroTextRunV1[],
): string {
  return runs.map((run) => run.text).join('');
}

export function validateLearningV2IntroRunsByLocaleV1(
  input: unknown,
): LearningV2IntroRunsByLocaleV1 {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('learning_v2_generator_intro_runs_locales_invalid');
  }
  const expectedLocales = [...LEARNING_V2_INTERFACE_LOCALES].sort();
  const actualLocales = Object.keys(input).sort();
  if (
    actualLocales.length !== expectedLocales.length ||
    expectedLocales.some((locale, index) => actualLocales[index] !== locale)
  ) {
    throw new Error('learning_v2_generator_intro_runs_locales_invalid');
  }
  const localizedRuns = input as Record<string, unknown>;
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const runs = localizedRuns[locale];
    if (!Array.isArray(runs) || runs.length < 1 || runs.length > 64)
      throw new Error('learning_v2_intro_runs_invalid');
    for (const run of runs) {
      const runKeys =
        typeof run === 'object' && run !== null && !Array.isArray(run)
          ? Object.keys(run).sort()
          : [];
      if (
        typeof run !== 'object' ||
        run === null ||
        Array.isArray(run) ||
        runKeys.length !== 2 ||
        runKeys[0] !== 'semantic' ||
        runKeys[1] !== 'text' ||
        typeof run.text !== 'string' ||
        run.text.length < 1 ||
        run.text.length > 1_000 ||
        !LEARNING_V2_INTRO_RUN_SEMANTICS_V1.some(
          (semantic) => semantic === run.semantic,
        )
      ) {
        throw new Error('learning_v2_intro_run_invalid');
      }
    }
  }
  return input as LearningV2IntroRunsByLocaleV1;
}
