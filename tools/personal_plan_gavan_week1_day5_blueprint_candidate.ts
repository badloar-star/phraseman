import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY5_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day5-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'micro_dialogue',
  'missing_word',
  'active_recall',
  'natural_choice',
] as const;

const FORBIDDEN_CONTENT_PATTERNS = [
  /phone/i,
  /email/i,
  /apartment/i,
  /rent/i,
  /document/i,
  /doctor/i,
  /bank/i,
  /087/,
  /@/,
  /\balex\b/i,
  /beta8958/i,
  /[\u00d0\u00d1\u00c2\u00e2\ufffd]/,
];

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day5ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day5ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day5ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day5ExerciseBlueprint = {
  id: string;
  exerciseType: GavanWeek1ExpansionExerciseType;
  purpose: string;
  sourceContentUnitIds: string[];
  finalExerciseBuilt: false;
  wrongAnswerPolicy: {
    mustReferenceOnlyPresentedOptions: true;
    mustNotInventUnseenOptions: true;
  };
};

export type GavanWeek1Day5Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day5BlueprintCandidate = {
  kind: 'gavan_week1_day5_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day5';
  dayIndex: 5;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day5ContentUnit[];
  exerciseBlueprints: GavanWeek1Day5ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day5Load;
    10: GavanWeek1Day5Load;
    15: GavanWeek1Day5Load;
    20: GavanWeek1Day5Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day5BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day5BlueprintCandidateWriteOptions =
  GavanWeek1Day5BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day5BlueprintCandidateIssueCode =
  | 'wrong_day_id'
  | 'standards_day_missing'
  | 'live_integration_enabled'
  | 'forbidden_anchor_present'
  | 'missing_required_exercise_type'
  | 'missing_explanation_coverage'
  | 'wrong_answer_policy_broken'
  | 'invalid_minute_choices'
  | 'fake_final_audio_claim'
  | 'fake_final_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day5BlueprintCandidateIssue = {
  code: GavanWeek1Day5BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day5BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day5BlueprintCandidateIssue[];
};

export type GavanWeek1Day5BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day5BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day5BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day5BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day5BlueprintCandidateIssue {
  return { code, detail, target };
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

export function isGavanWeek1Day5BlueprintCandidateTargetAllowed(
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

function day5Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day5');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day5ExplanationCard {
  return {
    id: `${unitId}:explanation-${index}`,
    covers,
    body,
    tone: 'plain_supportive_human',
    wrongAnswerSafe: true,
  };
}

function unit(
  id: string,
  english: string,
  meaningRu: string,
  newWords: string[],
  firstSeenConstructions: string[],
  explanationBodies: Array<{ covers: string[]; body: string }>,
): GavanWeek1Day5ContentUnit {
  return {
    id,
    english,
    meaningRu,
    newWords,
    firstSeenConstructions,
    explanationCards: explanationBodies.map((item, index) =>
      explanation(id, index + 1, item.covers, item.body),
    ),
    finalCopyApproved: false,
  };
}

function exercise(
  id: string,
  exerciseType: GavanWeek1ExpansionExerciseType,
  purpose: string,
  sourceContentUnitIds: string[],
): GavanWeek1Day5ExerciseBlueprint {
  return {
    id,
    exerciseType,
    purpose,
    sourceContentUnitIds,
    finalExerciseBuilt: false,
    wrongAnswerPolicy: {
      mustReferenceOnlyPresentedOptions: true,
      mustNotInventUnseenOptions: true,
    },
  };
}

function loadByMinutes(): GavanWeek1Day5BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day5ContentUnit[] {
  return [
    unit(
      'gavan-w1-d5-candidate-p1',
      'Is this the right way?',
      '\u042d\u0442\u043e \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043f\u0443\u0442\u044c?',
      ['right', 'way', 'this'],
      ['is this', 'the right way'],
      [
        {
          covers: ['is this', 'this'],
          body: 'Is this asks about the thing, place, or direction you are checking right now.',
        },
        {
          covers: ['right', 'way', 'the right way'],
          body: 'The right way means the correct direction or method. It is useful when you want a quick check.',
        },
      ],
    ),
    unit(
      'gavan-w1-d5-candidate-p2',
      'What should I do next?',
      '\u0427\u0442\u043e \u043c\u043d\u0435 \u0434\u0435\u043b\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435?',
      ['should', 'do', 'next'],
      ['what should I do', 'do next'],
      [
        {
          covers: ['should', 'what should I do'],
          body: 'Should asks for advice or the best next action. It sounds natural when you need guidance.',
        },
        {
          covers: ['do', 'next', 'do next'],
          body: 'Do next means the action after this moment. It keeps the question short and clear.',
        },
      ],
    ),
    unit(
      'gavan-w1-d5-candidate-p3',
      'Do I need to wait here?',
      '\u041c\u043d\u0435 \u043d\u0443\u0436\u043d\u043e \u0436\u0434\u0430\u0442\u044c \u0437\u0434\u0435\u0441\u044c?',
      ['need', 'wait', 'here'],
      ['do I need to', 'wait here'],
      [
        {
          covers: ['do I need to', 'need'],
          body: 'Do I need to asks if something is necessary. It is softer than guessing.',
        },
        {
          covers: ['wait', 'here', 'wait here'],
          body: 'Wait here means stay in this place for now. It is practical in lines, desks, and public places.',
        },
      ],
    ),
    unit(
      'gavan-w1-d5-candidate-p4',
      'Is it okay like this?',
      '\u0422\u0430\u043a \u043d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u043e?',
      ['okay', 'like', 'this'],
      ['is it okay', 'like this'],
      [
        {
          covers: ['is it okay', 'okay'],
          body: 'Is it okay asks if something is acceptable or correct enough.',
        },
        {
          covers: ['like', 'this', 'like this'],
          body: 'Like this means in this way. You can point, show, or refer to what you are doing.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day5BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day5BlueprintCandidateOptions,
): GavanWeek1Day5BlueprintCandidate {
  const dayStandards = day5Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day5_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day5',
    dayIndex: 5,
    basedOnStandardsGeneratedAt: standards.generatedAt,
    liveIntegration: false,
    candidateStatus: 'blueprint_candidate_not_final_exercises',
    socialSafety: 'universal_public_everyday',
    mustAvoidPersonalIdentityData: true,
    finalExerciseCopyWritten: false,
    forbiddenAnchors: [...(dayStandards?.forbiddenAnchors ?? [])],
    contentUnits: units,
    exerciseBlueprints: [
      exercise(
        'gavan-week1-day5:exercise-micro-dialogue',
        'micro_dialogue',
        'Choose a short next-step reply in a tiny public dialogue.',
        [units[1].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day5:exercise-missing-word',
        'missing_word',
        'Complete a direction or correctness check with one known word.',
        [units[0].id, units[3].id],
      ),
      exercise(
        'gavan-week1-day5:exercise-active-recall',
        'active_recall',
        'Recall one phrase for direction, waiting, or the next step without hints.',
        [units[0].id, units[1].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day5:exercise-natural-choice',
        'natural_choice',
        'Pick the most natural quick check without oversharing.',
        [units[2].id, units[3].id],
      ),
    ],
    loadByMinutes: loadByMinutes(),
    mediaClaims: {
      audioAssetStatus: 'not_generated',
      pronunciationScoringStatus: 'not_built',
      finalAudioReady: false,
      finalPronunciationScoringReady: false,
    },
  };
}

function contentText(candidate: unknown): string {
  const contentUnitsValue = (candidate as { contentUnits?: unknown }).contentUnits;
  return JSON.stringify(contentUnitsValue ?? '').toLowerCase();
}

function minuteKeys(candidate: unknown): string[] {
  const load = (candidate as { loadByMinutes?: Record<string, unknown> }).loadByMinutes;
  return Object.keys(load ?? {});
}

function exerciseTypes(candidate: unknown): string[] {
  const exercises = (candidate as {
    exerciseBlueprints?: Array<{ exerciseType?: string }>;
  }).exerciseBlueprints;
  return (exercises ?? []).map((item) => item.exerciseType ?? '');
}

function explanationCoverageMissing(candidate: unknown): string[] {
  const units = (candidate as {
    contentUnits?: Array<{
      id?: string;
      newWords?: string[];
      firstSeenConstructions?: string[];
      explanationCards?: Array<{ covers?: string[] }>;
    }>;
  }).contentUnits ?? [];

  return units.flatMap((item) => {
    const covered = new Set((item.explanationCards ?? []).flatMap((card) => card.covers ?? []));
    return [...(item.newWords ?? []), ...(item.firstSeenConstructions ?? [])]
      .filter((target) => !covered.has(target))
      .map((target) => `${item.id ?? 'unknown'}:${target}`);
  });
}

export function validateGavanWeek1Day5BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day5BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day5BlueprintCandidate;
  const issues: GavanWeek1Day5BlueprintCandidateIssue[] = [];

  if (!day5Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 5 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day5' || value.dayIndex !== 5) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 5 candidate must describe day 5 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 5 candidate must stay non-live.'));
  }

  const matchedForbidden = FORBIDDEN_CONTENT_PATTERNS
    .filter((pattern) => pattern.test(contentText(candidate)))
    .map((pattern) => pattern.source);
  if (matchedForbidden.length > 0) {
    issues.push(issue(
      'forbidden_anchor_present',
      `Candidate content contains forbidden anchors: ${matchedForbidden.join(', ')}`,
    ));
  }

  const typeSet = new Set(exerciseTypes(candidate));
  REQUIRED_EXERCISE_TYPES.forEach((exerciseType) => {
    if (!typeSet.has(exerciseType)) {
      issues.push(issue(
        'missing_required_exercise_type',
        `Missing required day 5 exercise type: ${exerciseType}.`,
        exerciseType,
      ));
    }
  });

  const missingCoverage = explanationCoverageMissing(candidate);
  if (missingCoverage.length > 0) {
    issues.push(issue(
      'missing_explanation_coverage',
      `Missing explanation coverage: ${missingCoverage.join(', ')}`,
    ));
  }

  const wrongAnswerPolicyBroken = ((value as {
    exerciseBlueprints?: Array<{
      wrongAnswerPolicy?: {
        mustReferenceOnlyPresentedOptions?: boolean;
        mustNotInventUnseenOptions?: boolean;
      };
    }>;
  }).exerciseBlueprints ?? []).some((exerciseBlueprint) =>
    exerciseBlueprint.wrongAnswerPolicy?.mustReferenceOnlyPresentedOptions !== true ||
    exerciseBlueprint.wrongAnswerPolicy?.mustNotInventUnseenOptions !== true,
  );
  if (wrongAnswerPolicyBroken) {
    issues.push(issue(
      'wrong_answer_policy_broken',
      'Wrong-answer explanations must not invent unseen options.',
    ));
  }

  if (minuteKeys(candidate).join(',') !== '5,10,15,20') {
    issues.push(issue(
      'invalid_minute_choices',
      'Only onboarding minute choices 5, 10, 15, and 20 are allowed.',
    ));
  }

  const mediaClaims = (value as {
    mediaClaims?: {
      audioAssetStatus?: string;
      pronunciationScoringStatus?: string;
      finalAudioReady?: boolean;
      finalPronunciationScoringReady?: boolean;
    };
  }).mediaClaims;
  if (mediaClaims?.finalAudioReady !== false || mediaClaims.audioAssetStatus !== 'not_generated') {
    issues.push(issue(
      'fake_final_audio_claim',
      'Day 5 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 5 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day5BlueprintCandidate(
  candidate: GavanWeek1Day5BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day5BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day5BlueprintCandidateWriteOptions,
): GavanWeek1Day5BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day5BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day5BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day5BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 5 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day5BlueprintCandidate(candidate);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    candidate,
  };
}
