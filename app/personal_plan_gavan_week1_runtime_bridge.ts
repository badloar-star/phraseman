import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';
import type { PlanExerciseBlock } from './personal_plan_engine_contracts';
import {
  buildPlanRuntimeBlockBundle,
  type BuildPlanRuntimeBlockBundlesResult,
  type PlanRuntimeBlockBundle,
  type PlanRuntimeBlockSpec,
} from './personal_plan_runtime_block_factory';
import {
  buildGavanWeek1CanonicalPlan,
  validateGavanWeek1CanonicalPlan,
  type GavanCanonicalDay,
  type GavanCanonicalExerciseBlock,
  type GavanCanonicalPhrase,
} from './personal_plan_gavan_week1_canonical_plan';

export type GavanWeek1RuntimeBridgeDayIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type GavanWeek1RuntimeDeferredBlock = {
  blockId: string;
  canonicalExerciseType: string;
  titleRu: string;
  titleEs: string;
  reason: 'renderer_not_built_yet' | 'media_asset_not_ready_yet';
};

export type GavanWeek1CanonicalRuntimeBridge = {
  planId: 'gavan';
  weekIndex: 1;
  dayIndex: GavanWeek1RuntimeBridgeDayIndex;
  status: 'runtime_bridge_ready_partial';
  dayTitleRu: string;
  dayTitleEs: string;
  linkedLessonBlocks: PlanExerciseBlock[];
  mediaRendererBlocks: PlanExerciseBlock[];
  bundles: PlanRuntimeBlockBundle[];
  deferredBlocks: GavanWeek1RuntimeDeferredBlock[];
};

export type GavanWeek1CanonicalRuntimeBridgeValidation = {
  valid: boolean;
  issues: string[];
};

export type BuildGavanWeek1CanonicalRuntimeBundlesInput = {
  dayIndex: GavanWeek1RuntimeBridgeDayIndex;
};

function toRuntimePhrase(phrase: GavanCanonicalPhrase): PersonalPlanPhraseDraft {
  return {
    id: phrase.id,
    english: phrase.english,
    russian: phrase.ru,
    spanish: phrase.es,
    newWords: [...phrase.newWords],
    firstSeenConstructions: [...phrase.firstSeenConstructions],
    visibleOptions: [phrase.english],
    explanations: phrase.explanationCards.map((card) => ({
      body: card.correctRu,
      covers: [...card.covers],
    })),
  };
}

function phrasesFor(day: GavanCanonicalDay): PersonalPlanPhraseDraft[] {
  return day.phrases.map(toRuntimePhrase);
}

function otherPhraseDistractors(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): string[] {
  return day.phrases
    .filter((item) => item.id !== phrase.id)
    .slice(0, 3)
    .map((item) => item.english);
}

function wordInPhrase(phrase: GavanCanonicalPhrase, word: string): boolean {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(phrase.english);
}

function missingWordFor(phrase: GavanCanonicalPhrase): string {
  return [...phrase.newWords, ...phrase.firstSeenConstructions]
    .flatMap((item) => item.split(/\s+/))
    .find((word) => wordInPhrase(phrase, word)) ?? '';
}

function missingWordsByPhraseId(day: GavanCanonicalDay): Record<string, string> {
  return Object.fromEntries(
    day.phrases
      .map((phrase) => [phrase.id, missingWordFor(phrase)])
      .filter(([, word]) => Boolean(word)),
  );
}

function missingWordDistractors(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): string[] {
  const correct = missingWordFor(phrase).toLowerCase();
  const candidates = day.phrases
    .flatMap((item) => item.newWords)
    .flatMap((item) => item.split(/\s+/))
    .filter((word) => word.trim() && word.toLowerCase() !== correct && !wordInPhrase(phrase, word));

  const unique = [...new Set(candidates)];
  return unique.length >= 2 ? unique.slice(0, 3) : ['here', 'ready'].filter((word) => word !== correct);
}

function missingDistractorsByPhraseId(day: GavanCanonicalDay): Record<string, string[]> {
  return Object.fromEntries(
    day.phrases.map((phrase) => [phrase.id, missingWordDistractors(day, phrase)]),
  );
}

function choiceDistractorsByPhraseId(day: GavanCanonicalDay): Record<string, string[]> {
  return Object.fromEntries(
    day.phrases.map((phrase) => [phrase.id, otherPhraseDistractors(day, phrase)]),
  );
}

function normalizedTargetWords(phrase: GavanCanonicalPhrase): Set<string> {
  return new Set(
    phrase.english
      .trim()
      .replace(/[.!?]+$/g, '')
      .split(/\s+/)
      .map((word) => word.toLowerCase())
      .filter(Boolean),
  );
}

function phraseBuildDistractors(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): string[] {
  const targetWords = normalizedTargetWords(phrase);
  const candidates = [
    ...day.phrases.flatMap((item) => item.newWords),
    ...day.phrases.flatMap((item) => item.firstSeenConstructions),
    'ready',
    'okay',
    'now',
    'please',
  ]
    .flatMap((item) => item.split(/\s+/))
    .map((word) => word.trim().replace(/[.!?]+$/g, ''))
    .filter((word) => word && !targetWords.has(word.toLowerCase()));

  return [...new Set(candidates)].slice(0, 3);
}

function phraseBuildDistractorsByPhraseId(day: GavanCanonicalDay): Record<string, string[]> {
  return Object.fromEntries(
    day.phrases.map((phrase) => [phrase.id, phraseBuildDistractors(day, phrase)]),
  );
}

function allMinuteChoices(): Array<5 | 10 | 15 | 20> {
  return [5, 10, 15, 20];
}

const GAVAN_DAY_TITLE_ES: Record<GavanWeek1RuntimeBridgeDayIndex, string> = {
  1: 'Inicio sin bloqueo',
  2: 'Pedir que repitan',
  3: 'Decir qué necesitas',
  4: 'Comprobar que entendiste',
  5: 'Pedirlo más simple',
  6: 'Responder brevemente',
  7: 'Armar una conversación',
};

const GAVAN_EXERCISE_TITLE_ES: Record<GavanCanonicalExerciseBlock['exerciseType'], string> = {
  lesson_bridge: 'Base antes de practicar',
  phrase_build: 'Construye la frase',
  missing_word: 'Completa la palabra clave',
  natural_choice: 'Elige la opción natural',
  listening_choice: 'Reconoce de oído',
  phrase_recall: 'Recuerda sin pistas',
  quick_reply: 'Respuesta rápida',
  mistake_repair: 'Corrige el orden',
  micro_dialogue: 'Microdiálogo',
  pronunciation_shadow: 'Repite en voz alta',
};

function gavanExerciseTitleEs(block: GavanCanonicalExerciseBlock): string {
  return GAVAN_EXERCISE_TITLE_ES[block.exerciseType];
}

function canonicalBridgeSpec(day: GavanCanonicalDay): PlanRuntimeBlockSpec {
  return {
    id: `gavan-week1-day${day.dayIndex}:canonical-bridge`,
    type: 'plan_choose_natural_phrase',
    title: 'База дня',
    titleEs: 'Base del día',
    phraseIds: day.phrases.slice(0, 2).map((phrase) => phrase.id),
    estimatedMinutes: 4,
    requiredFor: allMinuteChoices(),
    prerequisiteLessonIds: [1],
    distractorsByPhraseId: choiceDistractorsByPhraseId(day),
  };
}

function specForSupportedBlock(
  day: GavanCanonicalDay,
  block: GavanCanonicalExerciseBlock,
): PlanRuntimeBlockSpec | null {
  if (block.exerciseType === 'natural_choice') {
    return {
      id: block.id,
      type: 'plan_choose_natural_phrase',
      title: block.titleRu,
      titleEs: gavanExerciseTitleEs(block),
      phraseIds: [...block.phraseIds],
      estimatedMinutes: block.estimatedMinutes,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [...block.prerequisiteLessonIds],
      distractorsByPhraseId: choiceDistractorsByPhraseId(day),
    };
  }

  if (block.exerciseType === 'quick_reply' || block.exerciseType === 'micro_dialogue') {
    return {
      id: block.id,
      type: 'plan_choose_natural_phrase',
      title: block.titleRu,
      titleEs: gavanExerciseTitleEs(block),
      phraseIds: [...block.phraseIds],
      estimatedMinutes: block.estimatedMinutes,
      requiredFor: block.exerciseType === 'micro_dialogue' ? [15, 20] : [10, 15, 20],
      prerequisiteLessonIds: [...block.prerequisiteLessonIds],
      distractorsByPhraseId: choiceDistractorsByPhraseId(day),
    };
  }

  if (block.exerciseType === 'phrase_build') {
    return {
      id: block.id,
      type: 'plan_phrase_build',
      title: block.titleRu,
      titleEs: gavanExerciseTitleEs(block),
      phraseIds: [...block.phraseIds],
      estimatedMinutes: block.estimatedMinutes,
      requiredFor: allMinuteChoices(),
      prerequisiteLessonIds: [...block.prerequisiteLessonIds],
      distractorsByPhraseId: phraseBuildDistractorsByPhraseId(day),
    };
  }

  if (block.exerciseType === 'missing_word') {
    return {
      id: block.id,
      type: 'plan_missing_word',
      title: block.titleRu,
      titleEs: gavanExerciseTitleEs(block),
      phraseIds: [...block.phraseIds],
      estimatedMinutes: block.estimatedMinutes,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [...block.prerequisiteLessonIds],
      missingWordsByPhraseId: missingWordsByPhraseId(day),
      distractorsByPhraseId: missingDistractorsByPhraseId(day),
    };
  }

  if (block.exerciseType === 'phrase_recall') {
    return {
      id: block.id,
      type: 'plan_phrase_recall',
      title: block.titleRu,
      titleEs: gavanExerciseTitleEs(block),
      phraseIds: [...block.phraseIds].reverse(),
      estimatedMinutes: block.estimatedMinutes,
      requiredFor: [15, 20],
      prerequisiteLessonIds: [...block.prerequisiteLessonIds],
    };
  }

  return null;
}

function deferredReason(block: GavanCanonicalExerciseBlock): GavanWeek1RuntimeDeferredBlock['reason'] {
  if (block.exerciseType === 'listening_choice' || block.exerciseType === 'pronunciation_shadow') {
    return 'media_asset_not_ready_yet';
  }
  return 'renderer_not_built_yet';
}

function linkedLessonSliceBlock(
  day: GavanCanonicalDay,
  block: GavanCanonicalExerciseBlock,
): PlanExerciseBlock {
  const lessonId = block.prerequisiteLessonIds[0] ?? 1;
  const requiredPhrases = Math.max(1, Math.min(6, block.phraseIds.length));

  return {
    id: block.id,
    planId: 'gavan',
    dayIndex: day.dayIndex,
    type: 'linked_lesson_slice',
    title: block.titleRu,
    titleEs: gavanExerciseTitleEs(block),
    contentUnitIds: [...block.phraseIds],
    estimatedMinutes: block.estimatedMinutes,
    requiredFor: allMinuteChoices(),
    prerequisiteLessonIds: [...block.prerequisiteLessonIds],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    destination: {
      type: 'lesson',
      lessonId,
      requiredPhrases,
      requiredPhraseIds: [...block.phraseIds],
    },
  };
}

function mediaRendererBlock(
  day: GavanCanonicalDay,
  block: GavanCanonicalExerciseBlock,
): PlanExerciseBlock | null {
  if (block.exerciseType !== 'listening_choice' && block.exerciseType !== 'pronunciation_shadow') {
    return null;
  }

  const exerciseType = block.exerciseType === 'listening_choice'
    ? 'plan_listen_choose'
    : 'plan_pronunciation_repeat';
  const requiredCorrect = Math.max(1, Math.min(3, block.phraseIds.length));

  return {
    id: block.id,
    planId: 'gavan',
    dayIndex: day.dayIndex,
    type: exerciseType,
    title: block.titleRu,
    titleEs: gavanExerciseTitleEs(block),
    contentUnitIds: [...block.phraseIds],
    estimatedMinutes: block.estimatedMinutes,
    requiredFor: [15, 20],
    prerequisiteLessonIds: [...block.prerequisiteLessonIds],
    progressPolicy: exerciseType === 'plan_pronunciation_repeat' ? 'completion_only' : 'correct_only',
    recoveryPolicy: exerciseType === 'plan_pronunciation_repeat'
      ? 'return_wrong_to_trainer'
      : 'return_wrong_to_recall_and_trainer',
    destination: {
      type: 'plan_exercise',
      exerciseType,
      lessonId: `gavan_week1_day${day.dayIndex}_canonical_media`,
      contentUnitIds: [...block.phraseIds],
      requiredCorrect,
    },
  };
}

function deferredBlock(block: GavanCanonicalExerciseBlock): GavanWeek1RuntimeDeferredBlock {
  return {
    blockId: block.id,
    canonicalExerciseType: block.exerciseType,
    titleRu: block.titleRu,
    titleEs: gavanExerciseTitleEs(block),
    reason: deferredReason(block),
  };
}

function buildBundle(day: GavanCanonicalDay, spec: PlanRuntimeBlockSpec): BuildPlanRuntimeBlockBundlesResult {
  const result = buildPlanRuntimeBlockBundle({
    planId: 'gavan',
    dayIndex: day.dayIndex,
    phrases: phrasesFor(day),
    spec,
  });

  if (result.status !== 'ready') {
    return {
      status: 'blocked',
      issues: result.issues,
    };
  }

  return {
    status: 'ready',
    bundles: [result.bundle],
  };
}

function findDay(dayIndex: GavanWeek1RuntimeBridgeDayIndex): GavanCanonicalDay | undefined {
  return buildGavanWeek1CanonicalPlan().days.find((day) => day.dayIndex === dayIndex);
}

export function buildGavanWeek1CanonicalRuntimeBridge(
  input: BuildGavanWeek1CanonicalRuntimeBundlesInput,
): GavanWeek1CanonicalRuntimeBridge {
  const day = findDay(input.dayIndex);
  if (!day) {
    throw new Error(`Missing canonical Gavan day ${input.dayIndex}.`);
  }

  const bundles: PlanRuntimeBlockBundle[] = [];
  const bridgeBundle = buildBundle(day, canonicalBridgeSpec(day));
  if (bridgeBundle.status === 'ready') bundles.push(...bridgeBundle.bundles);

  const linkedLessonBlocks: PlanExerciseBlock[] = [];
  const mediaRendererBlocks: PlanExerciseBlock[] = [];
  const deferredBlocks: GavanWeek1RuntimeDeferredBlock[] = [];
  for (const block of day.exerciseBlocks) {
    if (block.exerciseType === 'lesson_bridge') {
      linkedLessonBlocks.push(linkedLessonSliceBlock(day, block));
      continue;
    }

    const mediaBlock = mediaRendererBlock(day, block);
    if (mediaBlock) {
      mediaRendererBlocks.push(mediaBlock);
      continue;
    }

    const spec = specForSupportedBlock(day, block);
    if (!spec) {
      deferredBlocks.push(deferredBlock(block));
      continue;
    }

    const result = buildBundle(day, spec);
    if (result.status === 'ready') {
      bundles.push(...result.bundles);
    } else {
      deferredBlocks.push({
        ...deferredBlock(block),
        reason: 'renderer_not_built_yet',
      });
    }
  }

  return {
    planId: 'gavan',
    weekIndex: 1,
    dayIndex: input.dayIndex,
    status: 'runtime_bridge_ready_partial',
    dayTitleRu: day.titleRu,
    dayTitleEs: GAVAN_DAY_TITLE_ES[day.dayIndex],
    linkedLessonBlocks,
    mediaRendererBlocks,
    bundles,
    deferredBlocks,
  };
}

export function buildGavanWeek1CanonicalRuntimeBundles(
  input: BuildGavanWeek1CanonicalRuntimeBundlesInput,
): BuildPlanRuntimeBlockBundlesResult {
  const day = findDay(input.dayIndex);
  if (!day) {
    return {
      status: 'blocked',
      issues: [`missing_canonical_day:${input.dayIndex}`],
    };
  }

  const bridge = buildGavanWeek1CanonicalRuntimeBridge(input);
  const validation = validateGavanWeek1CanonicalRuntimeBridge(bridge);
  if (!validation.valid) {
    return {
      status: 'blocked',
      issues: validation.issues,
    };
  }

  return {
    status: 'ready',
    bundles: bridge.bundles,
  };
}

export function validateGavanWeek1CanonicalRuntimeBridge(
  bridge: GavanWeek1CanonicalRuntimeBridge,
): GavanWeek1CanonicalRuntimeBridgeValidation {
  const issues: string[] = [];
  const canonical = buildGavanWeek1CanonicalPlan();
  const canonicalValidation = validateGavanWeek1CanonicalPlan(canonical);

  if (!canonicalValidation.valid) {
    issues.push(...canonicalValidation.issues.map((issue) => `canonical:${issue.code}:${issue.target}`));
  }
  if (bridge.bundles.length === 0 && bridge.linkedLessonBlocks.length === 0 && bridge.mediaRendererBlocks.length === 0) {
    issues.push('no_runtime_or_lesson_shell_blocks');
  }
  for (const bundle of bridge.bundles) {
    if (!['plan_choose_natural_phrase', 'plan_phrase_build', 'plan_missing_word', 'plan_phrase_recall'].includes(bundle.block.type)) {
      issues.push(`unsupported_runtime_type:${bundle.block.type}`);
    }
  }
  for (const block of bridge.linkedLessonBlocks) {
    if (block.type !== 'linked_lesson_slice') {
      issues.push(`unsupported_lesson_shell_type:${block.type}`);
    }
    if (block.progressPolicy !== 'correct_only') {
      issues.push(`lesson_shell_not_correct_only:${block.id}`);
    }
    if (block.destination?.type !== 'lesson') {
      issues.push(`lesson_shell_missing_lesson_destination:${block.id}`);
    }
  }
  for (const block of bridge.mediaRendererBlocks) {
    if (block.type !== 'plan_listen_choose' && block.type !== 'plan_pronunciation_repeat') {
      issues.push(`unsupported_media_renderer_type:${block.type}`);
    }
    if (block.destination?.type !== 'plan_exercise') {
      issues.push(`media_renderer_missing_plan_exercise_destination:${block.id}`);
    }
    if (block.destination?.type === 'plan_exercise' && block.destination.exerciseType !== block.type) {
      issues.push(`media_renderer_destination_type_mismatch:${block.id}`);
    }
    if (block.contentUnitIds.length === 0) {
      issues.push(`media_renderer_missing_content_units:${block.id}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)],
  };
}
