import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const GAVAN_WEEK1_EXPANSION_STANDARDS_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-days2-7-expansion-standards.json',
);

const REQUIRED_FORBIDDEN_ANCHORS = [
  'exact_name',
  'phone_number',
  'email_address',
  'apartment_viewing',
  'rent_documents',
  'doctor_appointment',
  'bank_card_problem',
] as const;

const ALLOWED_PREREQUISITE_SOURCES = [
  'lesson_1_to_be_intro',
  'gavan_day1_certified_basics',
] as const;

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1ExpansionExerciseType =
  | 'phrase_build'
  | 'missing_word'
  | 'natural_choice'
  | 'active_recall'
  | 'listening_choice'
  | 'pronunciation_shadow'
  | 'micro_dialogue'
  | 'error_repair';

export type GavanWeek1ExpansionExerciseSlot = {
  id: string;
  exerciseType: GavanWeek1ExpansionExerciseType;
  purpose: string;
  finalCopyAllowed: false;
};

export type GavanWeek1ExpansionLoad = {
  targetMinutes: number;
  slotCount: number;
  reinforcementRequired: boolean;
};

export type GavanWeek1ExpansionDayStandards = {
  dayId: `gavan-week1-day${number}`;
  dayIndex: 2 | 3 | 4 | 5 | 6 | 7;
  dailyRole: string;
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  allowedSituationFamily: string[];
  exerciseSlots: GavanWeek1ExpansionExerciseSlot[];
  loadByMinutes: {
    5: GavanWeek1ExpansionLoad;
    10: GavanWeek1ExpansionLoad;
    15: GavanWeek1ExpansionLoad;
    20: GavanWeek1ExpansionLoad;
  };
  explanationPolicy: {
    requiredForEveryNewWord: true;
    requiredForEveryFirstSeenConstruction: true;
    mustNotExplainUnknownWrongOptions: true;
    tone: 'plain_supportive_human';
  };
  audioPolicy: {
    required: true;
    assetStatus: 'not_generated';
    mustUseGeneratedHumanAudioLater: true;
  };
  pronunciationPolicy: {
    required: true;
    scoringStatus: 'not_built';
    mustNotClaimFinalScoring: true;
  };
  prerequisitePolicy: {
    mustReferenceKnownLessonBeforeNewConstruction: true;
    allowedPrerequisiteSource: typeof ALLOWED_PREREQUISITE_SOURCES[number][];
  };
};

export type GavanWeek1ExpansionStandards = {
  kind: 'gavan_week1_expansion_standards';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  liveIntegration: false;
  contentStatus: 'standards_only_not_final_exercises';
  days: GavanWeek1ExpansionDayStandards[];
};

export type GavanWeek1ExpansionStandardsOptions = {
  generatedAt: string;
};

export type GavanWeek1ExpansionStandardsWriteOptions =
  GavanWeek1ExpansionStandardsOptions & {
    targetPath: string;
  };

export type GavanWeek1ExpansionStandardsIssueCode =
  | 'wrong_day_count'
  | 'missing_forbidden_anchor'
  | 'exercise_variety_too_low'
  | 'invalid_minute_choices'
  | 'audio_marked_generated'
  | 'pronunciation_claims_final_scoring'
  | 'final_copy_written'
  | 'explanation_policy_missing'
  | 'target_path_not_allowed';

export type GavanWeek1ExpansionStandardsIssue = {
  code: GavanWeek1ExpansionStandardsIssueCode;
  dayId?: string;
  detail: string;
};

export type GavanWeek1ExpansionStandardsValidationResult = {
  valid: boolean;
  issues: GavanWeek1ExpansionStandardsIssue[];
};

export type GavanWeek1ExpansionStandardsWriteResult = {
  valid: boolean;
  issues: GavanWeek1ExpansionStandardsIssue[];
  targetPath?: string;
  bytesWritten?: number;
  standards?: GavanWeek1ExpansionStandards;
};

function issue(
  code: GavanWeek1ExpansionStandardsIssueCode,
  detail: string,
  dayId?: string,
): GavanWeek1ExpansionStandardsIssue {
  return { code, detail, dayId };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1ExpansionStandardsTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function slot(
  dayIndex: number,
  index: number,
  exerciseType: GavanWeek1ExpansionExerciseType,
  purpose: string,
): GavanWeek1ExpansionExerciseSlot {
  return {
    id: `gavan-week1-day${dayIndex}:standard-slot-${index}`,
    exerciseType,
    purpose,
    finalCopyAllowed: false,
  };
}

function loadByMinutes(): GavanWeek1ExpansionDayStandards['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, slotCount: 1, reinforcementRequired: false },
    10: { targetMinutes: 9, slotCount: 2, reinforcementRequired: true },
    15: { targetMinutes: 14, slotCount: 3, reinforcementRequired: true },
    20: { targetMinutes: 18, slotCount: 4, reinforcementRequired: true },
  };
}

function day(
  dayIndex: 2 | 3 | 4 | 5 | 6 | 7,
  dailyRole: string,
  allowedSituationFamily: string[],
  slots: Array<[GavanWeek1ExpansionExerciseType, string]>,
): GavanWeek1ExpansionDayStandards {
  return {
    dayId: `gavan-week1-day${dayIndex}`,
    dayIndex,
    dailyRole,
    socialSafety: 'universal_public_everyday',
    mustAvoidPersonalIdentityData: true,
    finalExerciseCopyWritten: false,
    forbiddenAnchors: [...REQUIRED_FORBIDDEN_ANCHORS],
    allowedSituationFamily,
    exerciseSlots: slots.map(([exerciseType, purpose], index) =>
      slot(dayIndex, index + 1, exerciseType, purpose),
    ),
    loadByMinutes: loadByMinutes(),
    explanationPolicy: {
      requiredForEveryNewWord: true,
      requiredForEveryFirstSeenConstruction: true,
      mustNotExplainUnknownWrongOptions: true,
      tone: 'plain_supportive_human',
    },
    audioPolicy: {
      required: true,
      assetStatus: 'not_generated',
      mustUseGeneratedHumanAudioLater: true,
    },
    pronunciationPolicy: {
      required: true,
      scoringStatus: 'not_built',
      mustNotClaimFinalScoring: true,
    },
    prerequisitePolicy: {
      mustReferenceKnownLessonBeforeNewConstruction: true,
      allowedPrerequisiteSource: [...ALLOWED_PREREQUISITE_SOURCES],
    },
  };
}

export function buildGavanWeek1ExpansionStandards(
  options: GavanWeek1ExpansionStandardsOptions,
): GavanWeek1ExpansionStandards {
  return {
    kind: 'gavan_week1_expansion_standards',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    liveIntegration: false,
    contentStatus: 'standards_only_not_final_exercises',
    days: [
      day(2, 'Ask for repetition and keep the conversation moving.', [
        'public_everyday_request',
        'repeat_and_confirm',
      ], [
        ['natural_choice', 'Choose a simple phrase for asking someone to repeat.'],
        ['listening_choice', 'Recognize a short repeated phrase by ear.'],
        ['phrase_build', 'Build one short request using known words.'],
      ]),
      day(3, 'Say that you did not catch something and ask for slower speech.', [
        'understanding_check',
        'pace_control',
      ], [
        ['missing_word', 'Fill one missing word in a short understanding phrase.'],
        ['micro_dialogue', 'Pick the next polite reply in a tiny public dialogue.'],
        ['listening_choice', 'Hear the difference between fast and slower speech cues.'],
      ]),
      day(4, 'Ask for help with something visible without oversharing.', [
        'simple_help',
        'pointing_context',
      ], [
        ['phrase_build', 'Build a help request without personal details.'],
        ['natural_choice', 'Choose the version that sounds calm and normal.'],
        ['pronunciation_shadow', 'Shadow a short help request after audio exists.'],
      ]),
      day(5, 'Check direction, next step, or whether something is correct.', [
        'direction_check',
        'next_step_check',
      ], [
        ['micro_dialogue', 'Choose a short next-step response.'],
        ['missing_word', 'Complete a check phrase with one known word.'],
        ['active_recall', 'Recall a useful short confirmation phrase.'],
      ]),
      day(6, 'Pause, agree, or say you are not sure yet.', [
        'short_answer',
        'decision_pause',
      ], [
        ['active_recall', 'Recall a phrase that buys time politely.'],
        ['error_repair', 'Repair a common short-answer mistake.'],
        ['pronunciation_shadow', 'Practice rhythm later without claiming scoring.'],
      ]),
      day(7, 'Review the week and handle one simple next action.', [
        'week_review',
        'next_action',
      ], [
        ['active_recall', 'Recall the strongest short phrases from the week.'],
        ['listening_choice', 'Choose what a short everyday line means.'],
        ['natural_choice', 'Pick the most natural public-safe answer.'],
      ]),
    ],
  };
}

function minuteKeys(dayValue: unknown): string[] {
  const loadByMinutes = (dayValue as { loadByMinutes?: Record<string, unknown> }).loadByMinutes;
  return Object.keys(loadByMinutes ?? {});
}

function exerciseTypes(dayValue: unknown): string[] {
  const slots = (dayValue as { exerciseSlots?: Array<{ exerciseType?: string }> }).exerciseSlots;
  return (slots ?? []).map((slotValue) => slotValue.exerciseType ?? '');
}

export function validateGavanWeek1ExpansionStandards(
  input: unknown,
): GavanWeek1ExpansionStandardsValidationResult {
  const standards = input as GavanWeek1ExpansionStandards;
  const issues: GavanWeek1ExpansionStandardsIssue[] = [];

  if (!Array.isArray(standards.days) || standards.days.length !== 6) {
    issues.push(issue('wrong_day_count', 'Gavan week 1 expansion standards must cover days 2-7.'));
  }

  (standards.days ?? []).forEach((dayValue) => {
    const dayId = (dayValue as { dayId?: string }).dayId;
    const forbiddenAnchors = (dayValue as { forbiddenAnchors?: string[] }).forbiddenAnchors ?? [];
    const missingAnchors = REQUIRED_FORBIDDEN_ANCHORS.filter((anchor) =>
      !forbiddenAnchors.includes(anchor),
    );
    if (missingAnchors.length > 0) {
      issues.push(issue(
        'missing_forbidden_anchor',
        `Missing forbidden anchors: ${missingAnchors.join(', ')}`,
        dayId,
      ));
    }

    const uniqueTypes = new Set(exerciseTypes(dayValue));
    if (uniqueTypes.size < 3) {
      issues.push(issue(
        'exercise_variety_too_low',
        'Each standards day must define at least three exercise formats.',
        dayId,
      ));
    }

    if (minuteKeys(dayValue).join(',') !== '5,10,15,20') {
      issues.push(issue(
        'invalid_minute_choices',
        'Only the four onboarding minute choices are allowed: 5, 10, 15, 20.',
        dayId,
      ));
    }

    const audioStatus = (dayValue as {
      audioPolicy?: { assetStatus?: string };
    }).audioPolicy?.assetStatus;
    if (audioStatus !== 'not_generated') {
      issues.push(issue(
        'audio_marked_generated',
        'Audio must stay marked not_generated until real assets exist.',
        dayId,
      ));
    }

    const pronunciation = (dayValue as {
      pronunciationPolicy?: {
        scoringStatus?: string;
        mustNotClaimFinalScoring?: boolean;
      };
    }).pronunciationPolicy;
    if (
      pronunciation?.scoringStatus !== 'not_built' ||
      pronunciation?.mustNotClaimFinalScoring !== true
    ) {
      issues.push(issue(
        'pronunciation_claims_final_scoring',
        'Pronunciation must not claim final scoring in standards mode.',
        dayId,
      ));
    }

    if ((dayValue as { finalExerciseCopyWritten?: boolean }).finalExerciseCopyWritten !== false) {
      issues.push(issue(
        'final_copy_written',
        'Expansion standards must not contain final exercise copy yet.',
        dayId,
      ));
    }

    const explanation = (dayValue as {
      explanationPolicy?: {
        requiredForEveryNewWord?: boolean;
        requiredForEveryFirstSeenConstruction?: boolean;
        mustNotExplainUnknownWrongOptions?: boolean;
      };
    }).explanationPolicy;
    if (
      explanation?.requiredForEveryNewWord !== true ||
      explanation?.requiredForEveryFirstSeenConstruction !== true ||
      explanation?.mustNotExplainUnknownWrongOptions !== true
    ) {
      issues.push(issue(
        'explanation_policy_missing',
        'Every new word and first-seen construction needs a plain explanation card.',
        dayId,
      ));
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1ExpansionStandards(
  standards: GavanWeek1ExpansionStandards,
): string {
  return `${JSON.stringify(standards, null, 2)}\n`;
}

export function writeGavanWeek1ExpansionStandards(
  options: GavanWeek1ExpansionStandardsWriteOptions,
): GavanWeek1ExpansionStandardsWriteResult {
  const standards = buildGavanWeek1ExpansionStandards(options);
  const validation = validateGavanWeek1ExpansionStandards(standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1ExpansionStandardsTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 expansion standards can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1ExpansionStandards(standards);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    standards,
  };
}
