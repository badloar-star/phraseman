import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1PronunciationReference,
  GavanWeek1PronunciationReferenceAdapterResult,
  GavanWeek1PronunciationReferenceIssue,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';

export const GAVAN_WEEK1_PRONUNCIATION_SCORING_READINESS_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-pronunciation-scoring-readiness-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1PronunciationScoringReadinessPacketStatus =
  | 'pronunciation_scoring_blocked_no_real_scorer'
  | 'pronunciation_scoring_ready_for_review'
  | 'pronunciation_scoring_reference_invalid';

export type GavanWeek1PronunciationScoringReadinessIssueCode =
  | 'wrong_adapter_kind'
  | 'wrong_plan_or_week'
  | 'reference_adapter_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1PronunciationScoringReadinessIssue = {
  code: GavanWeek1PronunciationScoringReadinessIssueCode;
  detail: string;
};

export type GavanWeek1PronunciationScoringReadinessPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1PronunciationScoringReadinessPacketWriteOptions =
  GavanWeek1PronunciationScoringReadinessPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1PronunciationScoringReadinessPacket = {
  kind: 'gavan_week1_pronunciation_scoring_readiness_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1PronunciationScoringReadinessPacketStatus;
  blockerStillOpen: 'missing_pronunciation_scorer';
  readyForLive: false;
  pronunciationProductionReady: false;
  scoringAdapterReady: false;
  pronunciationReferenceAdapterReady: boolean;
  approvalMayBeInferred: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  referenceEvidence: {
    adapterKind: 'gavan_week1_pronunciation_reference_adapter';
    adapterStatus: GavanWeek1PronunciationReferenceAdapterResult['status'];
    adapterValid: boolean;
    referenceIds: string[];
    targetTexts: string[];
    adapterIssues: GavanWeek1PronunciationReferenceIssue[];
  };
  references: Array<Pick<
    GavanWeek1PronunciationReference,
    'id' | 'dayId' | 'dayIndex' | 'blockId' | 'exerciseId' | 'contentUnitId' | 'targetText' | 'runtimeMode'
  > & {
    scoringStatus: GavanWeek1PronunciationReference['scoringRequirement']['status'];
    productionReady: boolean;
    validForAuthoring: boolean;
  }>;
  summary: GavanWeek1PronunciationReferenceAdapterResult['summary'];
  requiredNextActions: [
    'Choose a real pronunciation scorer provider and stable scorer id.',
    'Define scoring version, result fields, and minimum confidence for Gavan week 1.',
    'Run scored-attempt validation before allowing production scoring or progress penalties.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    scoringFilesWritten: false;
  };
};

export type GavanWeek1PronunciationScoringReadinessPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1PronunciationScoringReadinessIssue[];
  packet?: GavanWeek1PronunciationScoringReadinessPacket;
};

export type GavanWeek1PronunciationScoringReadinessPacketWriteResult =
  GavanWeek1PronunciationScoringReadinessPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1PronunciationScoringReadinessIssueCode,
  detail: string,
): GavanWeek1PronunciationScoringReadinessIssue {
  return { code, detail };
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

export function isGavanWeek1PronunciationScoringReadinessPacketTargetAllowed(
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

function validateAdapter(
  adapter: GavanWeek1PronunciationReferenceAdapterResult,
): GavanWeek1PronunciationScoringReadinessIssue[] {
  const issues: GavanWeek1PronunciationScoringReadinessIssue[] = [];

  if (adapter.kind !== 'gavan_week1_pronunciation_reference_adapter') {
    issues.push(issue(
      'wrong_adapter_kind',
      'Pronunciation scoring readiness packet requires the Gavan week 1 reference adapter.',
    ));
  }

  if (adapter.planId !== 'gavan' || adapter.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Pronunciation scoring readiness packet can only target Gavan week 1.',
    ));
  }

  if (!adapter.valid || adapter.issues.length > 0 || adapter.references.length === 0) {
    issues.push(issue(
      'reference_adapter_invalid',
      'Pronunciation scoring readiness packet requires complete non-live references before scoring can be reviewed.',
    ));
  }

  return issues;
}

function statusFor(
  adapter: GavanWeek1PronunciationReferenceAdapterResult,
): GavanWeek1PronunciationScoringReadinessPacketStatus {
  if (!adapter.valid) return 'pronunciation_scoring_reference_invalid';
  if (
    adapter.summary.referenceCount > 0 &&
    adapter.summary.productionReadyReferenceCount === adapter.summary.referenceCount
  ) {
    return 'pronunciation_scoring_ready_for_review';
  }
  return 'pronunciation_scoring_blocked_no_real_scorer';
}

export function buildGavanWeek1PronunciationScoringReadinessPacket(
  adapter: GavanWeek1PronunciationReferenceAdapterResult,
  options: GavanWeek1PronunciationScoringReadinessPacketOptions,
): GavanWeek1PronunciationScoringReadinessPacketBuildResult {
  const issues = validateAdapter(adapter);

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    issues: [],
    packet: {
      kind: 'gavan_week1_pronunciation_scoring_readiness_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: statusFor(adapter),
      blockerStillOpen: 'missing_pronunciation_scorer',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringAdapterReady: false,
      pronunciationReferenceAdapterReady: adapter.valid,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      referenceEvidence: {
        adapterKind: adapter.kind,
        adapterStatus: adapter.status,
        adapterValid: adapter.valid,
        referenceIds: adapter.references.map((item) => item.id),
        targetTexts: adapter.references.map((item) => item.targetText),
        adapterIssues: adapter.issues,
      },
      references: adapter.references.map((item) => ({
        id: item.id,
        dayId: item.dayId,
        dayIndex: item.dayIndex,
        blockId: item.blockId,
        exerciseId: item.exerciseId,
        contentUnitId: item.contentUnitId,
        targetText: item.targetText,
        runtimeMode: item.runtimeMode,
        scoringStatus: item.scoringRequirement.status,
        productionReady: item.readiness.productionReady,
        validForAuthoring: item.readiness.validForAuthoring,
      })),
      summary: adapter.summary,
      requiredNextActions: [
        'Choose a real pronunciation scorer provider and stable scorer id.',
        'Define scoring version, result fields, and minimum confidence for Gavan week 1.',
        'Run scored-attempt validation before allowing production scoring or progress penalties.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        scoringFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1PronunciationScoringReadinessPacket(
  adapter: GavanWeek1PronunciationReferenceAdapterResult,
  options: GavanWeek1PronunciationScoringReadinessPacketWriteOptions,
): GavanWeek1PronunciationScoringReadinessPacketWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1PronunciationScoringReadinessPacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Pronunciation scoring readiness packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const result = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, options);
  if (!result.valid || !result.packet) {
    return result;
  }

  const serialized = `${JSON.stringify(result.packet, null, 2)}\n`;
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...result,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
