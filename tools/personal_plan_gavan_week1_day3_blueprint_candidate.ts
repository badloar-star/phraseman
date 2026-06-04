import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionDayStandards,
  GavanWeek1ExpansionExerciseType,
  GavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';

export const GAVAN_WEEK1_DAY3_BLUEPRINT_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day3-blueprint-candidate.json',
);

const REQUIRED_EXERCISE_TYPES = [
  'missing_word',
  'micro_dialogue',
  'listening_choice',
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

export type GavanWeek1Day3ExplanationCard = {
  id: string;
  covers: string[];
  body: string;
  tone: 'plain_supportive_human';
  wrongAnswerSafe: true;
};

export type GavanWeek1Day3ContentUnit = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  explanationCards: GavanWeek1Day3ExplanationCard[];
  finalCopyApproved: false;
};

export type GavanWeek1Day3ExerciseBlueprint = {
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

export type GavanWeek1Day3Load = {
  targetMinutes: number;
  contentUnitCount: number;
  exerciseBlueprintCount: number;
};

export type GavanWeek1Day3BlueprintCandidate = {
  kind: 'gavan_week1_day3_blueprint_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day3';
  dayIndex: 3;
  basedOnStandardsGeneratedAt: string;
  liveIntegration: false;
  candidateStatus: 'blueprint_candidate_not_final_exercises';
  socialSafety: 'universal_public_everyday';
  mustAvoidPersonalIdentityData: true;
  finalExerciseCopyWritten: false;
  forbiddenAnchors: string[];
  contentUnits: GavanWeek1Day3ContentUnit[];
  exerciseBlueprints: GavanWeek1Day3ExerciseBlueprint[];
  loadByMinutes: {
    5: GavanWeek1Day3Load;
    10: GavanWeek1Day3Load;
    15: GavanWeek1Day3Load;
    20: GavanWeek1Day3Load;
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
};

export type GavanWeek1Day3BlueprintCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day3BlueprintCandidateWriteOptions =
  GavanWeek1Day3BlueprintCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day3BlueprintCandidateIssueCode =
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

export type GavanWeek1Day3BlueprintCandidateIssue = {
  code: GavanWeek1Day3BlueprintCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day3BlueprintCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day3BlueprintCandidateIssue[];
};

export type GavanWeek1Day3BlueprintCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day3BlueprintCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day3BlueprintCandidate;
};

function issue(
  code: GavanWeek1Day3BlueprintCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day3BlueprintCandidateIssue {
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

export function isGavanWeek1Day3BlueprintCandidateTargetAllowed(
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

function day3Standards(
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1ExpansionDayStandards | undefined {
  return standards.days.find((day) => day.dayId === 'gavan-week1-day3');
}

function explanation(
  unitId: string,
  index: number,
  covers: string[],
  body: string,
): GavanWeek1Day3ExplanationCard {
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
): GavanWeek1Day3ContentUnit {
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
): GavanWeek1Day3ExerciseBlueprint {
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

function loadByMinutes(): GavanWeek1Day3BlueprintCandidate['loadByMinutes'] {
  return {
    5: { targetMinutes: 5, contentUnitCount: 1, exerciseBlueprintCount: 1 },
    10: { targetMinutes: 9, contentUnitCount: 2, exerciseBlueprintCount: 2 },
    15: { targetMinutes: 14, contentUnitCount: 3, exerciseBlueprintCount: 3 },
    20: { targetMinutes: 18, contentUnitCount: 4, exerciseBlueprintCount: 4 },
  };
}

function contentUnits(): GavanWeek1Day3ContentUnit[] {
  return [
    unit(
      'gavan-w1-d3-candidate-p1',
      "Sorry, I didn't catch that.",
      'Извините, я не расслышал.',
      ['sorry', 'catch', 'that'],
      ["I didn't"],
      [
        {
          covers: ['sorry'],
          body: 'Sorry makes the phrase polite and calm. It is normal when you missed something.',
        },
        {
          covers: ["I didn't"],
          body: "I didn't is the spoken short form of I did not. It keeps the sentence light.",
        },
        {
          covers: ['catch', 'that'],
          body: 'Catch here means hear or understand. That points to the words you just missed.',
        },
      ],
    ),
    unit(
      'gavan-w1-d3-candidate-p2',
      'Could you speak a little slower?',
      'Можете говорить немного медленнее?',
      ['speak', 'little', 'slower'],
      ['could you', 'a little slower'],
      [
        {
          covers: ['could you'],
          body: 'Could you keeps the request polite. It asks for help without sounding sharp.',
        },
        {
          covers: ['speak'],
          body: 'Speak means say words out loud. Here it is about the pace of speech.',
        },
        {
          covers: ['little', 'slower', 'a little slower'],
          body: 'A little slower means not too much, just a bit easier to follow.',
        },
      ],
    ),
    unit(
      'gavan-w1-d3-candidate-p3',
      'What does that mean?',
      'Что это значит?',
      ['what', 'does', 'mean', 'that'],
      ['what does that mean'],
      [
        {
          covers: ['what', 'does', 'that', 'what does that mean'],
          body: 'What does that mean asks for the meaning of the thing you just heard or saw.',
        },
        {
          covers: ['mean'],
          body: 'Mean here is about meaning, not being angry or rude. The phrase is direct and useful.',
        },
      ],
    ),
    unit(
      'gavan-w1-d3-candidate-p4',
      'Could you show me?',
      'Можете показать мне?',
      ['show', 'me'],
      ['could you', 'show me'],
      [
        {
          covers: ['could you'],
          body: 'Could you makes a short request sound polite and easy to answer.',
        },
        {
          covers: ['show', 'me', 'show me'],
          body: 'Show me means let me see it. It helps when words are not enough yet.',
        },
      ],
    ),
  ];
}

export function buildGavanWeek1Day3BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day3BlueprintCandidateOptions,
): GavanWeek1Day3BlueprintCandidate {
  const dayStandards = day3Standards(standards);
  const units = contentUnits();

  return {
    kind: 'gavan_week1_day3_blueprint_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day3',
    dayIndex: 3,
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
        'gavan-week1-day3:exercise-missing-word',
        'missing_word',
        'Fill the missing word in an understanding phrase.',
        [units[0].id, units[2].id],
      ),
      exercise(
        'gavan-week1-day3:exercise-micro-dialogue',
        'micro_dialogue',
        'Pick the next calm reply in a tiny public dialogue.',
        [units[0].id, units[3].id],
      ),
      exercise(
        'gavan-week1-day3:exercise-listening-choice',
        'listening_choice',
        'Later, recognize a short pace-control request by ear.',
        [units[1].id],
      ),
      exercise(
        'gavan-week1-day3:exercise-active-recall',
        'active_recall',
        'Recall one phrase for meaning or slower speech without hints.',
        [units[1].id, units[2].id],
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

export function validateGavanWeek1Day3BlueprintCandidate(
  candidate: unknown,
  standards: GavanWeek1ExpansionStandards,
): GavanWeek1Day3BlueprintCandidateValidationResult {
  const value = candidate as GavanWeek1Day3BlueprintCandidate;
  const issues: GavanWeek1Day3BlueprintCandidateIssue[] = [];

  if (!day3Standards(standards)) {
    issues.push(issue('standards_day_missing', 'Day 3 standards must exist before a candidate is built.'));
  }

  if (value.dayId !== 'gavan-week1-day3' || value.dayIndex !== 3) {
    issues.push(issue('wrong_day_id', 'Gavan week 1 day 3 candidate must describe day 3 only.'));
  }

  if ((value as { liveIntegration?: boolean }).liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Day 3 candidate must stay non-live.'));
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
        `Missing required day 3 exercise type: ${exerciseType}.`,
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
      'Day 3 candidate cannot claim final generated audio.',
    ));
  }

  if (
    mediaClaims?.finalPronunciationScoringReady !== false ||
    mediaClaims.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 3 candidate cannot claim final pronunciation scoring.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day3BlueprintCandidate(
  candidate: GavanWeek1Day3BlueprintCandidate,
): string {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function writeGavanWeek1Day3BlueprintCandidate(
  standards: GavanWeek1ExpansionStandards,
  options: GavanWeek1Day3BlueprintCandidateWriteOptions,
): GavanWeek1Day3BlueprintCandidateWriteResult {
  const candidate = buildGavanWeek1Day3BlueprintCandidate(standards, options);
  const validation = validateGavanWeek1Day3BlueprintCandidate(candidate, standards);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day3BlueprintCandidateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 3 blueprint candidate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day3BlueprintCandidate(candidate);
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
