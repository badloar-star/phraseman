import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY2_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day2-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'natural_choice',
  'listening_choice',
  'phrase_build',
  'active_recall',
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
  /alex/i,
  /beta8958/i,
];

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day2ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day2ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day2ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day2ExerciseBlueprint = {
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

export type GavanWeek1Day2Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day2BlueprintCandidate = {
  kind: 'gavan_week1_day2_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day2';
  dayIndex: 2;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day2ContentUnit[];
  exerciseBlueprints: GavanWeek1Day2ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day2Load;
    10: GavanWeek1Day2Load;
    15: GavanWeek1Day2Load;
    20: GavanWeek1Day2Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day2BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day2BlueprintCandidateWriteOptions =
  GavanWeek1Day2BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day2BlueprintCandidateIssueCode =
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

export type GavanWeek1Day2BlueprintCandidateIssue = {
  code: GavanWeek1Day2BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day2BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day2BlueprintCandidateIssue[];
};

export type GavanWeek1Day2BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day2BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day2BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day2BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day2BlueprintCandidateIssue {
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

export function isGavanWeek1Day2BlueprintCandidateTargetAllowed(
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

function day2Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day2');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day2ExplanationCard {
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
): GavanWeek1Day2ContentUnit {
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
): GavanWeek1Day2ExerciseBlueprint {
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

function loadByMinutes(): GavanWeek1Day2BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day2ContentUnit[] {
  return [
    unit(
      'gavan-w1-d2-candidate-p1',
      'Sorry, could you say that again?',
      'Извините, можете повторить?',
      ['sorry', 'say', 'again'],
      ['could you'],
      [
        {
          covers: ['sorry'],
          body: 'Sorry softens the request. It is short, normal, and does not sound dramatic.',
        },
        {
          covers: ['could you'],
          body: 'Could you makes the request polite. It asks for help without pressure.',
        },
        {
          covers: ['say', 'again'],
          body: 'Say that again means repeat the same idea one more time.',
        },
      ],
    ),
    unit(
      'gavan-w1-d2-candidate-p2',
      'Could you say it a bit slower?',
      'Можете сказать чуть медленнее?',
      ['say', 'bit', 'slower'],
      ['could you', 'a bit slower'],
      [
        {
          covers: ['could you'],
          body: 'Could you keeps the request friendly and useful in public everyday talk.',
        },
        {
          covers: ['say'],
          body: 'Say means speak the words. Here it keeps the request short and clear.',
        },
        {
          covers: ['bit', 'slower', 'a bit slower'],
          body: 'A bit slower means just a little slower. It sounds softer than a command.',
        },
      ],
    ),
    unit(
      'gavan-w1-d2-candidate-p3',
      "I didn't catch that.",
      'Я не расслышал.',
      ['catch', 'that'],
      ["I didn't"],
      [
        {
          covers: ["I didn't"],
          body: "I didn't is the short spoken form of I did not.",
        },
        {
          covers: ['catch', 'that'],
          body: 'Catch here means hear or understand what was just said. That points to the phrase you missed.',
        },
      ],
    ),
    unit(
      'gavan-w1-d2-candidate-p4',
      'One more time, please.',
      'Ещё раз, пожалуйста.',
      ['one', 'more', 'time', 'please'],
      ['one more time'],
      [
        {
          covers: ['one', 'more', 'time', 'one more time'],
          body: 'One more time is a compact way to ask for the same phrase again.',
        },
        {
          covers: ['please'],
          body: 'Please keeps the request polite without adding a long explanation.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day2BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day2BlueprintCandidateOptions,
): GavanWeek1Day2BlueprintCandidate {
  const dayStandards = day2Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day2_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day2',
    dayIndex: 2,
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
        'gavan-week1-day2:exercise-natural-choice',
        'natural_choice',
        'Choose the most natural way to ask for repetition.',
        [units[0].id, units[3].id],
      ),
      exercise(
        'gavan-week1-day2:exercise-listening-choice',
        'listening_choice',
        'Later, recognize a short repetition request by ear.',
        [units[0].id, units[1].id],
      ),
      exercise(
        'gavan-week1-day2:exercise-phrase-build',
        'phrase_build',
        'Build a short polite request from known pieces.',
        [units[1].id],
      ),
      exercise(
        'gavan-week1-day2:exercise-active-recall',
        'active_recall',
        'Recall one useful phrase without hints.',
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

export function validateGavanWeek1Day2BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day2BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day2BlueprintCandidate;
  const issues: GavanWeek1Day2BlueprintCandidateIssue[] = [];

  if (!day2Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 2 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day2' || value.dayIndex !== 2) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 2 candidate must describe day 2 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 2 candidate must stay non-live.'));
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
        `Missing required day 2 exercise type: ${exerciseType}.`,
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
      'Day 2 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 2 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day2BlueprintCandidate(
  candidate: GavanWeek1Day2BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day2BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day2BlueprintCandidateWriteOptions,
): GavanWeek1Day2BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day2BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day2BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day2BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 2 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day2BlueprintCandidate(candidate);
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
