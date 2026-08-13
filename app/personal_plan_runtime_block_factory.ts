import type { PlanMinutesChoice, PersonalPlanId } from './personal_plan_catalog';
import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';
import {
  validatePlanExerciseBlockContract,
  type PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  buildPlanRuntimeItem,
  validatePlanRuntimeItem,
  type PlanRuntimeExerciseType,
  type PlanRuntimeItem,
} from './personal_plan_exercise_runtime';
import {
  buildGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';

export type PlanRuntimeBlockSpec = {
  id: string;
  type: PlanRuntimeExerciseType;
  title: string;
  titleEs?: string;
  phraseIds: string[];
  estimatedMinutes: number;
  requiredFor: PlanMinutesChoice[];
  prerequisiteLessonIds: number[];
  missingWordsByPhraseId?: Record<string, string>;
  distractorsByPhraseId?: Record<string, string[]>;
};

export type PlanRuntimeBlockBundle = {
  block: PlanExerciseBlock;
  items: PlanRuntimeItem[];
};

export type BuildPlanRuntimeBlockBundleInput = {
  planId: PersonalPlanId;
  dayIndex: number;
  phrases: PersonalPlanPhraseDraft[];
  spec: PlanRuntimeBlockSpec;
  lang?: string;
};

export type BuildPlanRuntimeBlockBundleResult =
  | {
    status: 'ready';
    bundle: PlanRuntimeBlockBundle;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

export type BuildPlanRuntimeBlockBundlesResult =
  | {
    status: 'ready';
    bundles: PlanRuntimeBlockBundle[];
  }
  | {
    status: 'blocked';
    issues: string[];
  };

const TECHNICAL_COPY_RE = /\b(?:dev|debug|draft|placeholder|renderer|route|sourcePhraseId|contentUnit)\b/i;
const CORRUPTED_COPY_RE = /[ÐÑÃÂâ]/;

function compact(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function phraseById(phrases: PersonalPlanPhraseDraft[]): Map<string, PersonalPlanPhraseDraft> {
  return new Map(phrases.map((phrase) => [phrase.id, phrase]));
}

function wordExistsInPhrase(phrase: PersonalPlanPhraseDraft, word: string): boolean {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(phrase.english);
}

function bundleCopy(bundle: PlanRuntimeBlockBundle): string {
  return [
    bundle.block.title,
    ...bundle.items.flatMap((item) => [
      item.promptRu,
      item.targetRu,
      item.displayEnglish,
      item.correctAnswer,
      ...item.choices.map((choice) => choice.text),
    ]),
  ].join(' ');
}

function validateSpecAgainstPhrases(
  spec: PlanRuntimeBlockSpec,
  phrases: PersonalPlanPhraseDraft[],
): string[] {
  const issues: string[] = [];
  const lookup = phraseById(phrases);
  const phraseIds = compact(spec.phraseIds);

  if (phraseIds.length !== spec.phraseIds.length) {
    issues.push('duplicate_or_empty_phrase_id');
  }

  for (const phraseId of phraseIds) {
    const phrase = lookup.get(phraseId);
    if (!phrase) {
      issues.push(`missing_phrase:${phraseId}`);
      continue;
    }

    if (spec.type === 'plan_missing_word') {
      const missingWord = spec.missingWordsByPhraseId?.[phraseId]?.trim();
      if (!missingWord) {
        issues.push(`missing_word:${phraseId}`);
      } else if (!wordExistsInPhrase(phrase, missingWord)) {
        issues.push(`missing_word_not_in_phrase:${phraseId}`);
      }
    }
  }

  return issues;
}

function makeBlock(
  input: BuildPlanRuntimeBlockBundleInput,
  phraseIds: string[],
): PlanExerciseBlock {
  const { planId, dayIndex, spec } = input;

  return {
    id: spec.id,
    planId,
    dayIndex,
    type: spec.type,
    title: spec.title,
    ...(spec.titleEs ? { titleEs: spec.titleEs } : {}),
    contentUnitIds: phraseIds,
    estimatedMinutes: spec.estimatedMinutes,
    requiredFor: [...spec.requiredFor],
    prerequisiteLessonIds: [...spec.prerequisiteLessonIds],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
  };
}

export function buildPlanRuntimeBlockBundle(
  input: BuildPlanRuntimeBlockBundleInput,
): BuildPlanRuntimeBlockBundleResult {
  const phraseIds = compact(input.spec.phraseIds);
  const specIssues = validateSpecAgainstPhrases(input.spec, input.phrases);
  if (specIssues.length > 0) {
    return {
      status: 'blocked',
      issues: specIssues,
    };
  }

  const lookup = phraseById(input.phrases);
  const block = makeBlock(input, phraseIds);
  const items = phraseIds.map((phraseId) => {
    const phrase = lookup.get(phraseId)!;

    return buildPlanRuntimeItem({
      block,
      phrase,
      exerciseType: input.spec.type,
      missingWord: input.spec.missingWordsByPhraseId?.[phraseId],
      distractors: input.spec.distractorsByPhraseId?.[phraseId],
      lang: input.lang,
    });
  });
  const bundle = { block, items };
  const issues = validatePlanRuntimeBlockBundle(bundle);

  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues,
    };
  }

  return {
    status: 'ready',
    bundle,
  };
}

export function validatePlanRuntimeBlockBundle(bundle: PlanRuntimeBlockBundle): string[] {
  const issues: string[] = [];

  for (const issue of validatePlanExerciseBlockContract(bundle.block)) {
    issues.push(`block:${issue}`);
  }

  if (bundle.items.length !== bundle.block.contentUnitIds.length) {
    issues.push('item_count_mismatch');
  }

  const itemPhraseIds = bundle.items.map((item) => item.phraseId);
  if (itemPhraseIds.join('|') !== bundle.block.contentUnitIds.join('|')) {
    issues.push('item_order_mismatch');
  }

  for (const item of bundle.items) {
    for (const issue of validatePlanRuntimeItem(item, bundle.block)) {
      issues.push(`item:${item.phraseId}:${issue}`);
    }
  }

  const copy = bundleCopy(bundle);
  if (TECHNICAL_COPY_RE.test(copy)) issues.push('technical_copy');
  if (CORRUPTED_COPY_RE.test(copy)) issues.push('corrupted_copy');

  return compact(issues);
}

const GAVAN_DAY1_MISSING_WORDS: Record<string, string> = {
  'gavan-day1-final-p1': 'here',
  'gavan-day1-final-p2': 'need',
  'gavan-day1-final-p3': 'repeat',
  'gavan-day1-final-p4': 'yet',
  'gavan-day1-final-p5': 'help',
};

const GAVAN_DAY1_CHOICE_DISTRACTORS: Record<string, string[]> = {
  'gavan-day1-final-p1': ['I here.', "I'm at here."],
  'gavan-day1-final-p2': ['I help a minute.', 'I repeat a minute.'],
  'gavan-day1-final-p3': ['Could repeat that?', 'Can you repeat me?'],
  'gavan-day1-final-p4': ["I don't understand now.", 'I no understand yet.'],
  'gavan-day1-final-p5': ['Can help me?', 'Can you repeat me?'],
};

const GAVAN_DAY1_MISSING_DISTRACTORS: Record<string, string[]> = {
  'gavan-day1-final-p1': ['help', 'repeat'],
  'gavan-day1-final-p2': ['help', 'wait'],
  'gavan-day1-final-p3': ['help', 'understand'],
  'gavan-day1-final-p4': ['now', 'here'],
  'gavan-day1-final-p5': ['repeat', 'understand'],
};

function gavanDay1Specs(phraseIds: string[]): PlanRuntimeBlockSpec[] {
  return [
    {
      id: 'gavan-week1-day1:choose-natural',
      type: 'plan_choose_natural_phrase',
      title: 'Выбрать фразу',
      phraseIds,
      estimatedMinutes: 5,
      requiredFor: [5, 10, 15, 20],
      prerequisiteLessonIds: [1],
      distractorsByPhraseId: GAVAN_DAY1_CHOICE_DISTRACTORS,
    },
    {
      id: 'gavan-week1-day1:missing-word',
      type: 'plan_missing_word',
      title: 'Вставить слово',
      phraseIds,
      estimatedMinutes: 5,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [1],
      missingWordsByPhraseId: GAVAN_DAY1_MISSING_WORDS,
      distractorsByPhraseId: GAVAN_DAY1_MISSING_DISTRACTORS,
    },
    {
      id: 'gavan-week1-day1:phrase-recall',
      type: 'plan_phrase_recall',
      title: 'Вспомнить без подсказок',
      phraseIds,
      estimatedMinutes: 4,
      requiredFor: [15, 20],
      prerequisiteLessonIds: [1],
    },
  ];
}

export function buildGavanDay1RuntimeBlockBundles(
  candidate: GavanDay1ContentCandidate = buildGavanDay1ContentCandidate(),
): BuildPlanRuntimeBlockBundlesResult {
  const phraseIds = candidate.phrases.map((phrase) => phrase.id);
  const bundles: PlanRuntimeBlockBundle[] = [];
  const issues: string[] = [];

  for (const spec of gavanDay1Specs(phraseIds)) {
    const result = buildPlanRuntimeBlockBundle({
      planId: 'gavan',
      dayIndex: 1,
      phrases: candidate.phrases,
      spec,
    });

    if (result.status === 'ready') {
      bundles.push(result.bundle);
    } else {
      issues.push(...result.issues.map((issue) => `${spec.id}:${issue}`));
    }
  }

  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues: compact(issues),
    };
  }

  return {
    status: 'ready',
    bundles,
  };
}
