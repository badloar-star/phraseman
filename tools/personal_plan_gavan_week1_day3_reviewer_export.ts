import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ExpansionExerciseType,
} from './personal_plan_gavan_week1_expansion_standards';
import type {
  GavanWeek1Day3BlueprintCandidate,
  GavanWeek1Day3ContentUnit,
  GavanWeek1Day3ExerciseBlueprint,
  GavanWeek1Day3ExplanationCard,
} from './personal_plan_gavan_week1_day3_blueprint_candidate';

export const GAVAN_WEEK1_DAY3_REVIEWER_EXPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day3-reviewer-export.json',
);

const REQUIRED_EXERCISE_TYPES: GavanWeek1ExpansionExerciseType[] = [
  'missing_word',
  'micro_dialogue',
  'listening_choice',
  'active_recall',
];

const FORBIDDEN_VISIBLE_COPY_PATTERNS = [
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

export type GavanWeek1Day3ReviewerStatus = 'needs_manual_review';

export type GavanWeek1Day3ReviewerContentUnitRow = {
  id: string;
  kind: 'content_unit';
  contentUnitId: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  finalCopyApproved: false;
  reviewStatus: GavanWeek1Day3ReviewerStatus;
};

export type GavanWeek1Day3ReviewerExplanationRow = {
  id: string;
  kind: 'explanation_card';
  contentUnitId: string;
  explanationId: string;
  covers: string[];
  body: string;
  wrongAnswerSafe: true;
  reviewStatus: GavanWeek1Day3ReviewerStatus;
};

export type GavanWeek1Day3ReviewerExerciseRow = {
  id: string;
  kind: 'exercise_blueprint';
  exerciseId: string;
  exerciseType: GavanWeek1ExpansionExerciseType;
  purpose: string;
  sourceContentUnitIds: string[];
  finalExerciseBuilt: false;
  reviewStatus: GavanWeek1Day3ReviewerStatus;
};

export type GavanWeek1Day3ReviewerExport = {
  kind: 'gavan_week1_day3_reviewer_export';
  generatedAt: string;
  sourceCandidateGeneratedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day3';
  dayIndex: 3;
  liveIntegration: false;
  reviewStatus: GavanWeek1Day3ReviewerStatus;
  contentUnitRows: GavanWeek1Day3ReviewerContentUnitRow[];
  explanationRows: GavanWeek1Day3ReviewerExplanationRow[];
  exerciseRows: GavanWeek1Day3ReviewerExerciseRow[];
  exerciseCoverage: {
    requiredTypes: GavanWeek1ExpansionExerciseType[];
    presentTypes: GavanWeek1ExpansionExerciseType[];
    valid: boolean;
  };
  forbiddenAnchorCheck: {
    valid: boolean;
    found: string[];
  };
  mediaClaims: GavanWeek1Day3BlueprintCandidate['mediaClaims'];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
  summary: {
    contentUnits: number;
    explanationCards: number;
    exerciseBlueprints: number;
    finalAudioClaims: number;
    finalPronunciationClaims: number;
    snippetsNeedingManualReview: number;
    approvedSnippets: 0;
  };
};

export type GavanWeek1Day3ReviewerExportOptions = {
  generatedAt: string;
};

export type GavanWeek1Day3ReviewerExportWriteOptions =
  GavanWeek1Day3ReviewerExportOptions & {
    targetPath: string;
  };

export type GavanWeek1Day3ReviewerExportIssueCode =
  | 'wrong_export_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_content_unit_export'
  | 'missing_explanation_card_export'
  | 'missing_exercise_blueprint_export'
  | 'missing_exercise_coverage'
  | 'forbidden_anchor_present'
  | 'fake_final_audio_claim'
  | 'fake_final_pronunciation_claim'
  | 'snippet_not_marked_for_manual_review'
  | 'target_path_not_allowed';

export type GavanWeek1Day3ReviewerExportIssue = {
  code: GavanWeek1Day3ReviewerExportIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day3ReviewerExportValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day3ReviewerExportIssue[];
};

export type GavanWeek1Day3ReviewerExportWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day3ReviewerExportIssue[];
  targetPath?: string;
  bytesWritten?: number;
  export?: GavanWeek1Day3ReviewerExport;
};

function issue(
  code: GavanWeek1Day3ReviewerExportIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day3ReviewerExportIssue {
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

export function isGavanWeek1Day3ReviewerExportTargetAllowed(
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

function contentUnitRow(
  unit: GavanWeek1Day3ContentUnit,
): GavanWeek1Day3ReviewerContentUnitRow {
  return {
    id: `review:${unit.id}`,
    kind: 'content_unit',
    contentUnitId: unit.id,
    english: unit.english,
    meaningRu: unit.meaningRu,
    newWords: [...unit.newWords],
    firstSeenConstructions: [...unit.firstSeenConstructions],
    finalCopyApproved: unit.finalCopyApproved,
    reviewStatus: 'needs_manual_review',
  };
}

function explanationRow(
  contentUnitId: string,
  card: GavanWeek1Day3ExplanationCard,
): GavanWeek1Day3ReviewerExplanationRow {
  return {
    id: `review:${card.id}`,
    kind: 'explanation_card',
    contentUnitId,
    explanationId: card.id,
    covers: [...card.covers],
    body: card.body,
    wrongAnswerSafe: card.wrongAnswerSafe,
    reviewStatus: 'needs_manual_review',
  };
}

function exerciseRow(
  exercise: GavanWeek1Day3ExerciseBlueprint,
): GavanWeek1Day3ReviewerExerciseRow {
  return {
    id: `review:${exercise.id}`,
    kind: 'exercise_blueprint',
    exerciseId: exercise.id,
    exerciseType: exercise.exerciseType,
    purpose: exercise.purpose,
    sourceContentUnitIds: [...exercise.sourceContentUnitIds],
    finalExerciseBuilt: exercise.finalExerciseBuilt,
    reviewStatus: 'needs_manual_review',
  };
}

function visibleCopy(exportValue: GavanWeek1Day3ReviewerExport): string {
  return JSON.stringify({
    contentUnitRows: exportValue.contentUnitRows,
    explanationRows: exportValue.explanationRows,
    exerciseRows: exportValue.exerciseRows,
  });
}

function forbiddenAnchors(exportValue: GavanWeek1Day3ReviewerExport): string[] {
  const copy = visibleCopy(exportValue);
  return FORBIDDEN_VISIBLE_COPY_PATTERNS
    .filter((pattern) => pattern.test(copy))
    .map((pattern) => pattern.source);
}

function presentExerciseTypes(
  rows: GavanWeek1Day3ReviewerExerciseRow[],
): GavanWeek1ExpansionExerciseType[] {
  return rows.map((row) => row.exerciseType);
}

export function buildGavanWeek1Day3ReviewerExport(
  candidate: GavanWeek1Day3BlueprintCandidate,
  options: GavanWeek1Day3ReviewerExportOptions,
): GavanWeek1Day3ReviewerExport {
  const contentUnitRows = candidate.contentUnits.map(contentUnitRow);
  const explanationRows = candidate.contentUnits.flatMap((unit) =>
    unit.explanationCards.map((card) => explanationRow(unit.id, card)),
  );
  const exerciseRows = candidate.exerciseBlueprints.map(exerciseRow);
  const exerciseTypes = presentExerciseTypes(exerciseRows);
  const exerciseCoverageValid = REQUIRED_EXERCISE_TYPES.every((type) =>
    exerciseTypes.includes(type),
  );
  const finalAudioClaims = candidate.mediaClaims.finalAudioReady ? 1 : 0;
  const finalPronunciationClaims = candidate.mediaClaims.finalPronunciationScoringReady ? 1 : 0;

  const exportValue: GavanWeek1Day3ReviewerExport = {
    kind: 'gavan_week1_day3_reviewer_export',
    generatedAt: options.generatedAt,
    sourceCandidateGeneratedAt: candidate.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day3',
    dayIndex: 3,
    liveIntegration: false,
    reviewStatus: 'needs_manual_review',
    contentUnitRows,
    explanationRows,
    exerciseRows,
    exerciseCoverage: {
      requiredTypes: [...REQUIRED_EXERCISE_TYPES],
      presentTypes: exerciseTypes,
      valid: exerciseCoverageValid,
    },
    forbiddenAnchorCheck: {
      valid: true,
      found: [],
    },
    mediaClaims: { ...candidate.mediaClaims },
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
    summary: {
      contentUnits: contentUnitRows.length,
      explanationCards: explanationRows.length,
      exerciseBlueprints: exerciseRows.length,
      finalAudioClaims,
      finalPronunciationClaims,
      snippetsNeedingManualReview:
        contentUnitRows.length + explanationRows.length + exerciseRows.length,
      approvedSnippets: 0,
    },
  };

  const found = forbiddenAnchors(exportValue);
  exportValue.forbiddenAnchorCheck = {
    valid: found.length === 0,
    found,
  };

  return exportValue;
}

function idSet(values: string[]): Set<string> {
  return new Set(values);
}

function everyRowNeedsReview(exportValue: GavanWeek1Day3ReviewerExport): boolean {
  return [
    ...exportValue.contentUnitRows,
    ...exportValue.explanationRows,
    ...exportValue.exerciseRows,
  ].every((row) => row.reviewStatus === 'needs_manual_review');
}

export function validateGavanWeek1Day3ReviewerExport(
  exportValue: unknown,
  candidate: GavanWeek1Day3BlueprintCandidate,
): GavanWeek1Day3ReviewerExportValidationResult {
  const value = exportValue as GavanWeek1Day3ReviewerExport;
  const issues: GavanWeek1Day3ReviewerExportIssue[] = [];

  if (value.kind !== 'gavan_week1_day3_reviewer_export') {
    issues.push(issue('wrong_export_kind', 'Reviewer export must use the expected kind.'));
  }

  if (value.dayId !== 'gavan-week1-day3' || value.dayIndex !== 3) {
    issues.push(issue('wrong_day_id', 'Reviewer export must describe Gavan week 1 day 3 only.'));
  }

  if (value.liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Reviewer export must stay outside live integration.'));
  }

  const contentUnitRows = value.contentUnitRows ?? [];
  const explanationRows = value.explanationRows ?? [];
  const exerciseRows = value.exerciseRows ?? [];

  const exportedContentIds = idSet(contentUnitRows.map((row) => row.contentUnitId));
  candidate.contentUnits.forEach((unit) => {
    if (!exportedContentIds.has(unit.id)) {
      issues.push(issue(
        'missing_content_unit_export',
        'Every day 3 content unit must appear in the reviewer export.',
        unit.id,
      ));
    }
  });

  const exportedExplanationIds = idSet(explanationRows.map((row) => row.explanationId));
  candidate.contentUnits.flatMap((unit) => unit.explanationCards).forEach((card) => {
    if (!exportedExplanationIds.has(card.id)) {
      issues.push(issue(
        'missing_explanation_card_export',
        'Every day 3 explanation card must appear in the reviewer export.',
        card.id,
      ));
    }
  });

  const exportedExerciseIds = idSet(exerciseRows.map((row) => row.exerciseId));
  candidate.exerciseBlueprints.forEach((exercise) => {
    if (!exportedExerciseIds.has(exercise.id)) {
      issues.push(issue(
        'missing_exercise_blueprint_export',
        'Every day 3 exercise blueprint must appear in the reviewer export.',
        exercise.id,
      ));
    }
  });

  const presentTypes = new Set(value.exerciseCoverage?.presentTypes ?? []);
  const missingTypes = REQUIRED_EXERCISE_TYPES.filter((type) => !presentTypes.has(type));
  if (missingTypes.length > 0 || value.exerciseCoverage?.valid !== true) {
    issues.push(issue(
      'missing_exercise_coverage',
      `Reviewer export is missing exercise coverage: ${missingTypes.join(', ') || 'coverage flag false'}.`,
    ));
  }

  if (!value.forbiddenAnchorCheck?.valid || value.forbiddenAnchorCheck.found.length > 0) {
    issues.push(issue(
      'forbidden_anchor_present',
      `Reviewer export contains forbidden anchors: ${(value.forbiddenAnchorCheck?.found ?? []).join(', ')}.`,
    ));
  }

  if (
    value.mediaClaims?.finalAudioReady !== false ||
    value.mediaClaims?.audioAssetStatus !== 'not_generated' ||
    value.summary?.finalAudioClaims !== 0
  ) {
    issues.push(issue(
      'fake_final_audio_claim',
      'Reviewer export cannot claim generated final audio for day 3.',
    ));
  }

  if (
    value.mediaClaims?.finalPronunciationScoringReady !== false ||
    value.mediaClaims?.pronunciationScoringStatus !== 'not_built' ||
    value.summary?.finalPronunciationClaims !== 0
  ) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Reviewer export cannot claim built pronunciation scoring for day 3.',
    ));
  }

  if (!everyRowNeedsReview(value) || value.reviewStatus !== 'needs_manual_review') {
    issues.push(issue(
      'snippet_not_marked_for_manual_review',
      'Every exported row must stay pending manual review.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1Day3ReviewerExport(
  exportValue: GavanWeek1Day3ReviewerExport,
): string {
  return `${JSON.stringify(exportValue, null, 2)}\n`;
}

export function writeGavanWeek1Day3ReviewerExport(
  candidate: GavanWeek1Day3BlueprintCandidate,
  options: GavanWeek1Day3ReviewerExportWriteOptions,
): GavanWeek1Day3ReviewerExportWriteResult {
  const exportValue = buildGavanWeek1Day3ReviewerExport(candidate, options);
  const validation = validateGavanWeek1Day3ReviewerExport(exportValue, candidate);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!validation.valid) {
    return {
      valid: false,
      issues: validation.issues,
    };
  }

  if (!isGavanWeek1Day3ReviewerExportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 3 reviewer export can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1Day3ReviewerExport(exportValue);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    export: exportValue,
  };
}
