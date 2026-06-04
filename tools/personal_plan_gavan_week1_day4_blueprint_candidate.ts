import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY4_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day4-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'phrase_build',
  'natural_choice',
  'pronunciation_shadow',
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
  /\balex\b/i,
  /beta8958/i,
  /[\u00d0\u00d1\u00c2\u00e2\ufffd]/,
];

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day4ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day4ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day4ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day4ExerciseBlueprint = {
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

export type GavanWeek1Day4Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day4BlueprintCandidate = {
  kind: 'gavan_week1_day4_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day4';
  dayIndex: 4;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day4ContentUnit[];
  exerciseBlueprints: GavanWeek1Day4ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day4Load;
    10: GavanWeek1Day4Load;
    15: GavanWeek1Day4Load;
    20: GavanWeek1Day4Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day4BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day4BlueprintCandidateWriteOptions =
  GavanWeek1Day4BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day4BlueprintCandidateIssueCode =
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

export type GavanWeek1Day4BlueprintCandidateIssue = {
  code: GavanWeek1Day4BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day4BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day4BlueprintCandidateIssue[];
};

export type GavanWeek1Day4BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day4BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day4BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day4BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day4BlueprintCandidateIssue {
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

export function isGavanWeek1Day4BlueprintCandidateTargetAllowed(
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

function day4Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day4');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day4ExplanationCard {
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
): GavanWeek1Day4ContentUnit {
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
): GavanWeek1Day4ExerciseBlueprint {
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

function loadByMinutes(): GavanWeek1Day4BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day4ContentUnit[] {
  return [
    unit(
      'gavan-w1-d4-candidate-p1',
      'Could you help me with this?',
      'Можете помочь мне с этим?',
      ['help', 'with', 'this'],
      ['could you', 'with this'],
      [
        {
          covers: ['could you'],
          body: 'Could you keeps a request polite. It is useful when you need help but do not want to sound demanding.',
        },
        {
          covers: ['help'],
          body: 'Help is the simple everyday word for asking someone to assist you.',
        },
        {
          covers: ['with', 'this', 'with this'],
          body: 'With this points to the thing or situation in front of you, so you do not need to explain private details.',
        },
      ],
    ),
    unit(
      'gavan-w1-d4-candidate-p2',
      "I'm not sure what to do.",
      'Я не уверен, что делать.',
      ['sure', 'what', 'do'],
      ["I'm not sure", 'what to do'],
      [
        {
          covers: ["I'm not sure", 'sure'],
          body: "I'm not sure is a calm way to say you need a second. It sounds normal, not helpless.",
        },
        {
          covers: ['what', 'do', 'what to do'],
          body: 'What to do means the next action. The phrase asks for direction without a long story.',
        },
      ],
    ),
    unit(
      'gavan-w1-d4-candidate-p3',
      'Is this the right place?',
      'Это правильное место?',
      ['right', 'place', 'this'],
      ['is this', 'the right place'],
      [
        {
          covers: ['is this', 'this'],
          body: 'Is this asks about the thing or place you are looking at right now.',
        },
        {
          covers: ['right', 'place', 'the right place'],
          body: 'The right place means the correct place. It is short and useful in public everyday situations.',
        },
      ],
    ),
    unit(
      'gavan-w1-d4-candidate-p4',
      'Could you point me in the right direction?',
      'Можете показать мне правильное направление?',
      ['point', 'direction', 'right'],
      ['could you', 'in the right direction'],
      [
        {
          covers: ['could you'],
          body: 'Could you keeps this request polite even when you are asking a stranger.',
        },
        {
          covers: ['point'],
          body: 'Point here means show the way, often with a hand gesture or a quick explanation.',
        },
        {
          covers: ['right', 'direction', 'in the right direction'],
          body: 'In the right direction means toward the correct next place or next step.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day4BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day4BlueprintCandidateOptions,
): GavanWeek1Day4BlueprintCandidate {
  const dayStandards = day4Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day4_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day4',
    dayIndex: 4,
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
        'gavan-week1-day4:exercise-phrase-build',
        'phrase_build',
        'Build a short help request from familiar pieces.',
        [units[0].id],
      ),
      exercise(
        'gavan-week1-day4:exercise-natural-choice',
        'natural_choice',
        'Choose the calm version of asking for visible help.',
        [units[0].id, units[1].id],
      ),
      exercise(
        'gavan-week1-day4:exercise-pronunciation-shadow',
        'pronunciation_shadow',
        'Later, shadow one short help request after real audio exists.',
        [units[3].id],
      ),
      exercise(
        'gavan-week1-day4:exercise-active-recall',
        'active_recall',
        'Recall one phrase for checking a place or next direction without hints.',
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

export function validateGavanWeek1Day4BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day4BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day4BlueprintCandidate;
  const issues: GavanWeek1Day4BlueprintCandidateIssue[] = [];

  if (!day4Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 4 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day4' || value.dayIndex !== 4) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 4 candidate must describe day 4 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 4 candidate must stay non-live.'));
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
        `Missing required day 4 exercise type: ${exerciseType}.`,
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
      'Day 4 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 4 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day4BlueprintCandidate(
  candidate: GavanWeek1Day4BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day4BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day4BlueprintCandidateWriteOptions,
): GavanWeek1Day4BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day4BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day4BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day4BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 4 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day4BlueprintCandidate(candidate);
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
