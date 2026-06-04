import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY7_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day7-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'active_recall',
  'listening_choice',
  'natural_choice',
  'micro_dialogue',
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
  /\d/,
  /[\u00d0\u00d1\u00c2\u00e2\ufffd]/,
];

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day7ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day7ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day7ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day7ExerciseBlueprint = {
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

export type GavanWeek1Day7Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day7BlueprintCandidate = {
  kind: 'gavan_week1_day7_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day7';
  dayIndex: 7;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day7ContentUnit[];
  exerciseBlueprints: GavanWeek1Day7ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day7Load;
    10: GavanWeek1Day7Load;
    15: GavanWeek1Day7Load;
    20: GavanWeek1Day7Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day7BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day7BlueprintCandidateWriteOptions =
  GavanWeek1Day7BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day7BlueprintCandidateIssueCode =
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

export type GavanWeek1Day7BlueprintCandidateIssue = {
  code: GavanWeek1Day7BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day7BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day7BlueprintCandidateIssue[];
};

export type GavanWeek1Day7BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day7BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day7BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day7BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day7BlueprintCandidateIssue {
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

export function isGavanWeek1Day7BlueprintCandidateTargetAllowed(
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

function day7Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day7');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day7ExplanationCard {
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
): GavanWeek1Day7ContentUnit {
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
): GavanWeek1Day7ExerciseBlueprint {
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

function loadByMinutes(): GavanWeek1Day7BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day7ContentUnit[] {
  return [
    unit(
      'gavan-w1-d7-candidate-p1',
      'I need a moment.',
      '\u041c\u043d\u0435 \u043d\u0443\u0436\u043d\u0430 \u043c\u0438\u043d\u0443\u0442\u043a\u0430.',
      ['need', 'moment'],
      ['I need', 'a moment'],
      [
        {
          covers: ['need', 'I need'],
          body: 'I need is a simple way to say what helps you right now. It sounds clear without sounding dramatic.',
        },
        {
          covers: ['moment', 'a moment'],
          body: 'A moment means a short bit of time. It gives you space to think and keeps the conversation calm.',
        },
      ],
    ),
    unit(
      'gavan-w1-d7-candidate-p2',
      'Could you say that again?',
      '\u041c\u043e\u0436\u0435\u0442\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c?',
      ['could', 'say', 'again'],
      ['could you', 'say that again'],
      [
        {
          covers: ['could', 'could you'],
          body: 'Could you makes a request softer. It is useful when you want help without sounding pushy.',
        },
        {
          covers: ['say', 'again', 'say that again'],
          body: 'Say that again means repeat the same thing. Again is the small word that asks for one more try.',
        },
      ],
    ),
    unit(
      'gavan-w1-d7-candidate-p3',
      'What should I do next?',
      '\u0427\u0442\u043e \u043c\u043d\u0435 \u0434\u0435\u043b\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435?',
      ['should', 'do', 'next'],
      ['what should I do', 'do next'],
      [
        {
          covers: ['should', 'what should I do'],
          body: 'What should I do asks for the recommended action. It is direct, but still normal and polite.',
        },
        {
          covers: ['do', 'next', 'do next'],
          body: 'Next points to the following step. The phrase is useful when you are ready to move on but need guidance.',
        },
      ],
    ),
    unit(
      'gavan-w1-d7-candidate-p4',
      "I'll check and come back.",
      '\u042f \u043f\u0440\u043e\u0432\u0435\u0440\u044e \u0438 \u0432\u0435\u0440\u043d\u0443\u0441\u044c.',
      ['check', 'come', 'back'],
      ["I'll check", 'come back'],
      [
        {
          covers: ['check', "I'll check"],
          body: "I'll check says you will look at it yourself. It is a clean way to avoid guessing out loud.",
        },
        {
          covers: ['come', 'back', 'come back'],
          body: 'Come back means return to the conversation. It tells the other person you are not disappearing.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day7BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day7BlueprintCandidateOptions,
): GavanWeek1Day7BlueprintCandidate {
  const dayStandards = day7Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day7_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day7',
    dayIndex: 7,
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
        'gavan-week1-day7:exercise-active-recall',
        'active_recall',
        'Week review: recall the strongest short phrase for buying time or asking again.',
        [units[0].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day7:exercise-listening-choice',
        'listening_choice',
        'Week review: later, choose what a short everyday line means after real audio exists.',
        [units[1].id, units[3].id],
      ),
      exercise(
        'gavan-week1-day7:exercise-natural-choice',
        'natural_choice',
        'Choose the clearest public-safe answer for the next action.',
        [units[1].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day7:exercise-micro-dialogue',
        'micro_dialogue',
        'Finish a tiny review dialogue with a short next-step phrase.',
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
  const visibleContent = (Array.isArray(contentUnitsValue) ? contentUnitsValue : []).map((item) => {
    const unitValue = item as {
      english?: unknown;
      meaningRu?: unknown;
      newWords?: unknown;
      firstSeenConstructions?: unknown;
      explanationCards?: Array<{ body?: unknown }>;
    };

    return {
      english: unitValue.english,
      meaningRu: unitValue.meaningRu,
      newWords: unitValue.newWords,
      firstSeenConstructions: unitValue.firstSeenConstructions,
      explanationBodies: (unitValue.explanationCards ?? []).map((card) => card.body),
    };
  });

  return JSON.stringify(visibleContent).toLowerCase();
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

export function validateGavanWeek1Day7BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day7BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day7BlueprintCandidate;
  const issues: GavanWeek1Day7BlueprintCandidateIssue[] = [];

  if (!day7Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 7 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day7' || value.dayIndex !== 7) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 7 candidate must describe day 7 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 7 candidate must stay non-live.'));
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
        `Missing required day 7 exercise type: ${exerciseType}.`,
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
      'Day 7 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 7 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day7BlueprintCandidate(
  candidate: GavanWeek1Day7BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day7BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day7BlueprintCandidateWriteOptions,
): GavanWeek1Day7BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day7BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day7BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day7BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 7 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day7BlueprintCandidate(candidate);
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

