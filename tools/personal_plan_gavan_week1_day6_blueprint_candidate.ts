import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY6_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day6-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'active_recall',
  'error_repair',
  'pronunciation_shadow',
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

export type GavanWeek1Day6ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day6ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day6ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day6ExerciseBlueprint = {
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

export type GavanWeek1Day6Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day6BlueprintCandidate = {
  kind: 'gavan_week1_day6_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day6';
  dayIndex: 6;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day6ContentUnit[];
  exerciseBlueprints: GavanWeek1Day6ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day6Load;
    10: GavanWeek1Day6Load;
    15: GavanWeek1Day6Load;
    20: GavanWeek1Day6Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day6BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day6BlueprintCandidateWriteOptions =
  GavanWeek1Day6BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day6BlueprintCandidateIssueCode =
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

export type GavanWeek1Day6BlueprintCandidateIssue = {
  code: GavanWeek1Day6BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day6BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day6BlueprintCandidateIssue[];
};

export type GavanWeek1Day6BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day6BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day6BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day6BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day6BlueprintCandidateIssue {
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

export function isGavanWeek1Day6BlueprintCandidateTargetAllowed(
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

function day6Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day6');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day6ExplanationCard {
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
): GavanWeek1Day6ContentUnit {
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
): GavanWeek1Day6ExerciseBlueprint {
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

function loadByMinutes(): GavanWeek1Day6BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day6ContentUnit[] {
  return [
    unit(
      'gavan-w1-d6-candidate-p1',
      'Let me think for a second.',
      '\u0414\u0430\u0439\u0442\u0435 \u0441\u0435\u043a\u0443\u043d\u0434\u0443 \u043f\u043e\u0434\u0443\u043c\u0430\u0442\u044c.',
      ['let', 'think', 'second'],
      ['let me think', 'for a second'],
      [
        {
          covers: ['let', 'let me think'],
          body: 'Let me think gives you a polite pause. It is useful when you need a moment before answering.',
        },
        {
          covers: ['think', 'second', 'for a second'],
          body: 'For a second means for a very short moment. It sounds natural and keeps the pause small.',
        },
      ],
    ),
    unit(
      'gavan-w1-d6-candidate-p2',
      'That works for me.',
      '\u041c\u043d\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u0438\u0442.',
      ['works', 'me'],
      ['that works for me'],
      [
        {
          covers: ['works', 'that works for me'],
          body: 'That works for me means the option is okay for you. It is a simple way to agree without overexplaining.',
        },
        {
          covers: ['me'],
          body: 'For me shows that you are speaking about your side of the decision.',
        },
      ],
    ),
    unit(
      'gavan-w1-d6-candidate-p3',
      "I'm not sure yet.",
      '\u042f \u043f\u043e\u043a\u0430 \u043d\u0435 \u0443\u0432\u0435\u0440\u0435\u043d.',
      ['sure', 'yet'],
      ["I'm not sure", 'not sure yet'],
      [
        {
          covers: ["I'm not sure", 'sure'],
          body: "I'm not sure says you do not have a clear answer yet. It is honest and calm.",
        },
        {
          covers: ['yet', 'not sure yet'],
          body: 'Yet means the answer may change later. It keeps the door open.',
        },
      ],
    ),
    unit(
      'gavan-w1-d6-candidate-p4',
      'Could we decide later?',
      '\u041c\u043e\u0436\u0435\u043c \u0440\u0435\u0448\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435?',
      ['decide', 'later'],
      ['could we', 'decide later'],
      [
        {
          covers: ['could we'],
          body: 'Could we is a polite way to suggest something together, not order the other person.',
        },
        {
          covers: ['decide', 'later', 'decide later'],
          body: 'Decide later means leave the choice for another moment. It is useful when you need time.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day6BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day6BlueprintCandidateOptions,
): GavanWeek1Day6BlueprintCandidate {
  const dayStandards = day6Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day6_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day6',
    dayIndex: 6,
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
        'gavan-week1-day6:exercise-active-recall',
        'active_recall',
        'Recall one phrase that buys time politely.',
        [units[0].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day6:exercise-error-repair',
        'error_repair',
        'Repair a short-answer mistake without adding private details.',
        [units[1].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day6:exercise-pronunciation-shadow',
        'pronunciation_shadow',
        'Later, shadow a short pause or agreement line after real audio exists.',
        [units[0].id, units[1].id],
      ),
      exercise(
        'gavan-week1-day6:exercise-natural-choice',
        'natural_choice',
        'Choose the calm way to pause, agree, or delay a decision.',
        [units[1].id, units[3].id],
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

export function validateGavanWeek1Day6BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day6BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day6BlueprintCandidate;
  const issues: GavanWeek1Day6BlueprintCandidateIssue[] = [];

  if (!day6Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 6 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day6' || value.dayIndex !== 6) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 6 candidate must describe day 6 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 6 candidate must stay non-live.'));
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
        `Missing required day 6 exercise type: ${exerciseType}.`,
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
      'Day 6 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 6 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day6BlueprintCandidate(
  candidate: GavanWeek1Day6BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day6BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day6BlueprintCandidateWriteOptions,
): GavanWeek1Day6BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day6BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day6BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day6BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 6 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day6BlueprintCandidate(candidate);
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
