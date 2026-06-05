import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1PronunciationScoringReadinessPacket,
} from './personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';

export const GAVAN_WEEK1_PRONUNCIATION_SCORING_PROVIDER_CONTRACT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-pronunciation-scoring-provider-contract.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1PronunciationScoringProviderContractStatus =
  | 'pronunciation_scorer_contract_blocked_missing_provider'
  | 'pronunciation_scorer_contract_ready_for_scored_attempt_validation';

export type GavanWeek1PronunciationScoringContractReferenceStatus =
  | 'missing_scorer_contract'
  | 'ready_for_scored_attempt_validation';

export type GavanWeek1PronunciationScoringProviderContractIssueCode =
  | 'wrong_readiness_packet_kind'
  | 'wrong_plan_or_week'
  | 'readiness_packet_not_valid_for_contract'
  | 'missing_provider_id'
  | 'missing_scorer_id'
  | 'missing_scoring_version'
  | 'missing_result_fields'
  | 'invalid_minimum_confidence'
  | 'scored_attempt_validation_not_approved'
  | 'fake_production_pronunciation_scorer_claim'
  | 'fake_final_pronunciation_scorer_claim'
  | 'live_edits_not_allowed'
  | 'target_path_not_allowed';

export type GavanWeek1PronunciationScoringProviderContractIssue = {
  code: GavanWeek1PronunciationScoringProviderContractIssueCode;
  detail: string;
};

export type GavanWeek1PronunciationScoringProviderMetadata = {
  providerId?: 'openai' | 'manual' | 'system' | 'unknown' | 'none';
  scorerId?: string;
  scoringVersion?: string;
  resultFields?: Array<'score' | 'pronunciationScore' | 'fluencyScore' | 'intonationScore'>;
  minimumConfidence?: number;
  approvedForScoredAttemptValidation?: boolean;
  productionReady?: boolean;
  finalScoringReady?: boolean;
  liveEditsAllowed?: boolean;
};

export type GavanWeek1PronunciationScoringProviderContractOptions = {
  generatedAt: string;
  provider?: GavanWeek1PronunciationScoringProviderMetadata;
};

export type GavanWeek1PronunciationScoringProviderContractWriteOptions =
  GavanWeek1PronunciationScoringProviderContractOptions & {
    targetPath: string;
  };

export type GavanWeek1PronunciationScoringProviderContract = {
  kind: 'gavan_week1_pronunciation_scoring_provider_contract';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1PronunciationScoringProviderContractStatus;
  blockerStillOpen: 'missing_pronunciation_scorer' | 'missing_scored_attempt_evidence_and_approval';
  readyForLive: false;
  pronunciationProductionReady: false;
  scoringContractReady: boolean;
  scoringAdapterReady: false;
  approvalMayBeInferred: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  readinessPacketEvidence: {
    kind: 'gavan_week1_pronunciation_scoring_readiness_packet';
    status: GavanWeek1PronunciationScoringReadinessPacket['status'];
    referenceCount: number;
    pronunciationReferenceAdapterReady: boolean;
    scoringAdapterReady: false;
  };
  provider?: Required<GavanWeek1PronunciationScoringProviderMetadata>;
  references: Array<{
    id: string;
    dayId: string;
    dayIndex: number;
    blockId: string;
    exerciseId: string;
    contentUnitId: string;
    targetText: string;
    runtimeMode: string;
    readinessPacketScoringStatus: string;
    scoringContractStatus: GavanWeek1PronunciationScoringContractReferenceStatus;
    productionReady: false;
    approvedScoredAttemptValidation: boolean;
  }>;
  summary: {
    referenceCount: number;
    missingProviderReferenceCount: number;
    contractReadyReferenceCount: number;
    approvedScoredAttemptValidationReferenceCount: number;
    productionReadyReferenceCount: 0;
    fakeFinalClaimCount: number;
  };
  requiredNextActions: [
    'Attach real pronunciation scorer provider metadata before scored-attempt validation.',
    'Run scored-attempt validation with recorded attempts and confidence/score evidence.',
    'Create explicit approval records before any live scoring adapter or progress penalty is enabled.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    scoringFilesWritten: false;
  };
};

export type GavanWeek1PronunciationScoringProviderContractBuildResult = {
  valid: boolean;
  issues: GavanWeek1PronunciationScoringProviderContractIssue[];
  contract?: GavanWeek1PronunciationScoringProviderContract;
};

export type GavanWeek1PronunciationScoringProviderContractWriteResult =
  GavanWeek1PronunciationScoringProviderContractBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1PronunciationScoringProviderContractIssueCode,
  detail: string,
): GavanWeek1PronunciationScoringProviderContractIssue {
  return { code, detail };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidMinimumConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function compactResultFields(
  value: GavanWeek1PronunciationScoringProviderMetadata['resultFields'],
): Required<GavanWeek1PronunciationScoringProviderMetadata>['resultFields'] {
  return [...new Set(value ?? [])];
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

export function isGavanWeek1PronunciationScoringProviderContractTargetAllowed(
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

function validateReadinessPacket(
  packet: GavanWeek1PronunciationScoringReadinessPacket,
): GavanWeek1PronunciationScoringProviderContractIssue[] {
  const issues: GavanWeek1PronunciationScoringProviderContractIssue[] = [];

  if (packet.kind !== 'gavan_week1_pronunciation_scoring_readiness_packet') {
    issues.push(issue(
      'wrong_readiness_packet_kind',
      'Pronunciation scoring provider contract requires the Gavan week 1 readiness packet.',
    ));
  }

  if (packet.planId !== 'gavan' || packet.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Pronunciation scoring provider contract can only target Gavan week 1.',
    ));
  }

  if (
    !packet.pronunciationReferenceAdapterReady ||
    packet.references.length === 0 ||
    packet.readyForLive ||
    packet.pronunciationProductionReady ||
    packet.scoringAdapterReady ||
    packet.approvalMayBeInferred ||
    packet.liveEditsAllowed
  ) {
    issues.push(issue(
      'readiness_packet_not_valid_for_contract',
      'Provider contract requires a non-live pronunciation readiness packet with complete references and no live readiness claims.',
    ));
  }

  return issues;
}

function validateProvider(
  provider: GavanWeek1PronunciationScoringProviderMetadata,
): GavanWeek1PronunciationScoringProviderContractIssue[] {
  const issues: GavanWeek1PronunciationScoringProviderContractIssue[] = [];
  const resultFields = compactResultFields(provider.resultFields);

  if (!provider.providerId || provider.providerId === 'none' || provider.providerId === 'unknown') {
    issues.push(issue(
      'missing_provider_id',
      'Provider metadata needs a real pronunciation scoring provider id.',
    ));
  }

  if (!hasText(provider.scorerId)) {
    issues.push(issue(
      'missing_scorer_id',
      'Provider metadata needs a stable scorer id.',
    ));
  }

  if (!hasText(provider.scoringVersion)) {
    issues.push(issue(
      'missing_scoring_version',
      'Provider metadata needs a scoring version.',
    ));
  }

  if (resultFields.length === 0) {
    issues.push(issue(
      'missing_result_fields',
      'Provider metadata needs explicit scoring result fields.',
    ));
  }

  if (!isValidMinimumConfidence(provider.minimumConfidence)) {
    issues.push(issue(
      'invalid_minimum_confidence',
      'Provider metadata needs minimumConfidence between 0 and 1.',
    ));
  }

  if (!provider.approvedForScoredAttemptValidation) {
    issues.push(issue(
      'scored_attempt_validation_not_approved',
      'Provider metadata must be approved for scored-attempt validation before contract-ready review.',
    ));
  }

  if (provider.productionReady) {
    issues.push(issue(
      'fake_production_pronunciation_scorer_claim',
      'Provider metadata cannot mark pronunciation scoring production-ready before scored-attempt evidence and explicit approval.',
    ));
  }

  if (provider.finalScoringReady) {
    issues.push(issue(
      'fake_final_pronunciation_scorer_claim',
      'Provider metadata cannot mark finalScoringReady before scored-attempt evidence and explicit approval.',
    ));
  }

  if (provider.liveEditsAllowed) {
    issues.push(issue(
      'live_edits_not_allowed',
      'Pronunciation scoring provider contract is non-live and cannot allow live edits.',
    ));
  }

  return issues;
}

function normalizeProvider(
  provider: GavanWeek1PronunciationScoringProviderMetadata,
): Required<GavanWeek1PronunciationScoringProviderMetadata> {
  return {
    providerId: provider.providerId ?? 'unknown',
    scorerId: provider.scorerId?.trim() ?? '',
    scoringVersion: provider.scoringVersion?.trim() ?? '',
    resultFields: compactResultFields(provider.resultFields),
    minimumConfidence: provider.minimumConfidence ?? 0,
    approvedForScoredAttemptValidation: Boolean(provider.approvedForScoredAttemptValidation),
    productionReady: false,
    finalScoringReady: false,
    liveEditsAllowed: false,
  };
}

export function buildGavanWeek1PronunciationScoringProviderContract(
  packet: GavanWeek1PronunciationScoringReadinessPacket,
  options: GavanWeek1PronunciationScoringProviderContractOptions,
): GavanWeek1PronunciationScoringProviderContractBuildResult {
  const issues = [
    ...validateReadinessPacket(packet),
    ...(options.provider ? validateProvider(options.provider) : []),
  ];

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  const provider = options.provider ? normalizeProvider(options.provider) : undefined;
  const scoringContractReady = Boolean(provider);
  const referenceStatus: GavanWeek1PronunciationScoringContractReferenceStatus =
    scoringContractReady ? 'ready_for_scored_attempt_validation' : 'missing_scorer_contract';
  const referenceCount = packet.references.length;

  return {
    valid: true,
    issues: [],
    contract: {
      kind: 'gavan_week1_pronunciation_scoring_provider_contract',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: scoringContractReady
        ? 'pronunciation_scorer_contract_ready_for_scored_attempt_validation'
        : 'pronunciation_scorer_contract_blocked_missing_provider',
      blockerStillOpen: scoringContractReady
        ? 'missing_scored_attempt_evidence_and_approval'
        : 'missing_pronunciation_scorer',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringContractReady,
      scoringAdapterReady: false,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      readinessPacketEvidence: {
        kind: packet.kind,
        status: packet.status,
        referenceCount,
        pronunciationReferenceAdapterReady: packet.pronunciationReferenceAdapterReady,
        scoringAdapterReady: false,
      },
      ...(provider ? { provider } : {}),
      references: packet.references.map((item) => ({
        id: item.id,
        dayId: item.dayId,
        dayIndex: item.dayIndex,
        blockId: item.blockId,
        exerciseId: item.exerciseId,
        contentUnitId: item.contentUnitId,
        targetText: item.targetText,
        runtimeMode: item.runtimeMode,
        readinessPacketScoringStatus: item.scoringStatus,
        scoringContractStatus: referenceStatus,
        productionReady: false,
        approvedScoredAttemptValidation: scoringContractReady,
      })),
      summary: {
        referenceCount,
        missingProviderReferenceCount: scoringContractReady ? 0 : referenceCount,
        contractReadyReferenceCount: scoringContractReady ? referenceCount : 0,
        approvedScoredAttemptValidationReferenceCount: scoringContractReady ? referenceCount : 0,
        productionReadyReferenceCount: 0,
        fakeFinalClaimCount: 0,
      },
      requiredNextActions: [
        'Attach real pronunciation scorer provider metadata before scored-attempt validation.',
        'Run scored-attempt validation with recorded attempts and confidence/score evidence.',
        'Create explicit approval records before any live scoring adapter or progress penalty is enabled.',
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

export function writeGavanWeek1PronunciationScoringProviderContract(
  packet: GavanWeek1PronunciationScoringReadinessPacket,
  options: GavanWeek1PronunciationScoringProviderContractWriteOptions,
): GavanWeek1PronunciationScoringProviderContractWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1PronunciationScoringProviderContractTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Pronunciation scoring provider contract can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const result = buildGavanWeek1PronunciationScoringProviderContract(packet, options);
  if (!result.valid || !result.contract) {
    return result;
  }

  const serialized = `${JSON.stringify(result.contract, null, 2)}\n`;
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...result,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
