import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  validatePlanApprovedAudioAssets,
  type PlanAudioApprovalIssue,
} from '../app/personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import type {
  GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport,
} from './personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion';

export const GAVAN_WEEK1_LIVE_AUDIO_REGISTRY_SOURCE_PREFLIGHT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-live-audio-registry-source-preflight.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1LiveAudioRegistrySourcePreflightStatus =
  | 'blocked_before_final_audio_promotion_ready'
  | 'blocked_invalid_approved_final_audio'
  | 'ready_for_source_registration_implementation';

export type GavanWeek1LiveAudioRegistrySourcePreflightRowStatus =
  | 'blocked_before_final_audio_promotion_ready'
  | 'blocked_invalid_approved_final_audio'
  | 'ready_for_source_registration_implementation';

export type GavanWeek1LiveAudioRegistrySourcePreflightIssueCode =
  | 'wrong_final_audio_promotion_report'
  | 'promotion_report_has_live_claim'
  | 'target_path_not_allowed';

export type GavanWeek1LiveAudioRegistrySourcePreflightIssue = {
  code: GavanWeek1LiveAudioRegistrySourcePreflightIssueCode;
  detail: string;
};

export type GavanWeek1LiveAudioRegistrySourcePreflightOptions = {
  generatedAt: string;
  registrationOwnerId: string;
};

export type GavanWeek1LiveAudioRegistrySourcePreflightWriteOptions =
  GavanWeek1LiveAudioRegistrySourcePreflightOptions & {
    targetPath: string;
  };

export type GavanWeek1LiveAudioRegistrySourcePreflightRow = {
  assetId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  uri: string;
  status: PlanAudioAsset['status'];
  finalAssetReady: boolean;
  provider: PlanAudioAsset['provider'];
  voiceId: string;
  registrationStatus: GavanWeek1LiveAudioRegistrySourcePreflightRowStatus;
  registryCandidateReady: boolean;
  runtimeRegistryWriteAllowed: false;
  sourceWriteAllowed: false;
  blocker?: string;
};

export type GavanWeek1LiveAudioRegistrySourcePreflightReport = {
  kind: 'gavan_week1_live_audio_registry_source_preflight';
  generatedAt: string;
  registrationOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourcePromotionStatus: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport['status'];
  status: GavanWeek1LiveAudioRegistrySourcePreflightStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioAssetRegistrationAllowed: false;
  runtimeRegistryWriteAllowed: false;
  sourceRegistrationPlanReady: boolean;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  registryWritesUsed: false;
  pronunciationReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  plannedSourceTargets: ['app/personal_plan_audio_asset_registry.ts'];
  summary: {
    expectedMp3Count: number;
    approvedFinalAudioCount: number;
    registryCandidateAssetCount: number;
    blockedAssetCount: number;
    sourceRegistrationTargetCount: 1;
    blockerCount: number;
  };
  rows: GavanWeek1LiveAudioRegistrySourcePreflightRow[];
  finalAudioGateEvidence: {
    valid: boolean;
    issues: PlanAudioApprovalIssue[];
    summary: {
      assets: number;
      approved: number;
      blocked: number;
    };
  };
  blockers: Array<{
    code:
      | 'final_audio_promotion_not_ready'
      | 'approved_final_audio_invalid'
      | 'source_registry_not_written';
    detail: string;
  }>;
  requiredNextActions: [
    'Run a separate source-registration implementation pass before runtime audio registry writes.',
    'Keep the implementation pass focused on approved final audio assets only.',
    'Run listening route regression after source registration, then keep pronunciation readiness separate.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    sourceFilesEdited: false;
    registryFilesEdited: false;
    audioFilesWritten: false;
  };
};

export type GavanWeek1LiveAudioRegistrySourcePreflightBuildResult = {
  valid: boolean;
  issues: GavanWeek1LiveAudioRegistrySourcePreflightIssue[];
  report?: GavanWeek1LiveAudioRegistrySourcePreflightReport;
};

export type GavanWeek1LiveAudioRegistrySourcePreflightWriteResult =
  GavanWeek1LiveAudioRegistrySourcePreflightBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1LiveAudioRegistrySourcePreflightIssueCode,
  detail: string,
): GavanWeek1LiveAudioRegistrySourcePreflightIssue {
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

export function isGavanWeek1LiveAudioRegistrySourcePreflightTargetAllowed(
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

function validatePromotionReport(
  promotion: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport,
): GavanWeek1LiveAudioRegistrySourcePreflightIssue[] {
  const issues: GavanWeek1LiveAudioRegistrySourcePreflightIssue[] = [];

  if (
    promotion.kind !== 'gavan_week1_audio_explicit_approval_records_and_promotion' ||
    promotion.planId !== 'gavan' ||
    promotion.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_final_audio_promotion_report',
      'Live audio registry source preflight requires the Gavan week 1 final audio promotion report.',
    ));
  }

  if (
    promotion.readyForLive ||
    promotion.audioProductionReady ||
    promotion.audioAssetRegistrationAllowed ||
    promotion.liveEditsAllowed ||
    promotion.sourceWritesUsed ||
    promotion.pronunciationReadinessMayBeInferred
  ) {
    issues.push(issue(
      'promotion_report_has_live_claim',
      'Live audio registry preflight cannot consume promotion reports that already claim live, registry, or source-write readiness.',
    ));
  }

  return issues;
}

function rowForAsset(
  asset: PlanAudioAsset,
  registrationStatus: GavanWeek1LiveAudioRegistrySourcePreflightRowStatus,
): GavanWeek1LiveAudioRegistrySourcePreflightRow {
  const registryCandidateReady = registrationStatus === 'ready_for_source_registration_implementation';
  return {
    assetId: asset.assetId ?? asset.id,
    blockId: asset.blockId,
    contentUnitIds: [...asset.contentUnitIds],
    targetText: asset.targetText,
    uri: asset.uri ?? '',
    status: asset.status,
    finalAssetReady: asset.finalAssetReady === true,
    provider: asset.provider,
    voiceId: asset.voiceId ?? '',
    registrationStatus,
    registryCandidateReady,
    runtimeRegistryWriteAllowed: false,
    sourceWriteAllowed: false,
    ...(registryCandidateReady ? {} : { blocker: registrationStatus }),
  };
}

function emptyFinalAudioGate(assets: PlanAudioAsset[]) {
  return {
    valid: false,
    issues: [] as PlanAudioApprovalIssue[],
    summary: {
      assets: assets.length,
      approved: 0,
      blocked: assets.length,
    },
  };
}

export function buildGavanWeek1LiveAudioRegistrySourcePreflight(
  promotion: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport,
  options: GavanWeek1LiveAudioRegistrySourcePreflightOptions,
): GavanWeek1LiveAudioRegistrySourcePreflightBuildResult {
  const issues = validatePromotionReport(promotion);
  if (issues.length > 0) return { valid: false, issues };

  const promotionReady = (
    promotion.status === 'ready_for_guarded_live_audio_registry_preflight' &&
    promotion.finalAudioPromotionReady &&
    promotion.summary.promotedFinalAudioCount === promotion.summary.expectedMp3Count &&
    promotion.approvedAssets.length === promotion.summary.expectedMp3Count
  );
  const finalAudioGate = promotionReady
    ? validatePlanApprovedAudioAssets(promotion.approvedAssets)
    : emptyFinalAudioGate(promotion.approvedAssets);
  const finalAudioValid = promotionReady && finalAudioGate.valid;
  const rowStatus: GavanWeek1LiveAudioRegistrySourcePreflightRowStatus = !promotionReady
    ? 'blocked_before_final_audio_promotion_ready'
    : finalAudioValid
      ? 'ready_for_source_registration_implementation'
      : 'blocked_invalid_approved_final_audio';
  const rows = promotion.approvedAssets.map((asset) => rowForAsset(asset, rowStatus));
  const registryCandidateAssetCount = rows.filter((row) => row.registryCandidateReady).length;
  const blockedAssetCount = promotion.summary.expectedMp3Count - registryCandidateAssetCount;
  const blockers: GavanWeek1LiveAudioRegistrySourcePreflightReport['blockers'] = [];

  if (!promotionReady) {
    blockers.push({
      code: 'final_audio_promotion_not_ready',
      detail: 'Approved final audio promotion must be complete before source registration can be planned.',
    });
  } else if (!finalAudioGate.valid) {
    blockers.push({
      code: 'approved_final_audio_invalid',
      detail: 'Approved final audio assets must remain valid before source registration can be planned.',
    });
  } else {
    blockers.push({
      code: 'source_registry_not_written',
      detail: 'Approved final audio still needs a separate source-registration implementation pass before runtime registry writes.',
    });
  }

  const status: GavanWeek1LiveAudioRegistrySourcePreflightStatus = !promotionReady
    ? 'blocked_before_final_audio_promotion_ready'
    : finalAudioValid
      ? 'ready_for_source_registration_implementation'
      : 'blocked_invalid_approved_final_audio';

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_live_audio_registry_source_preflight',
      generatedAt: options.generatedAt,
      registrationOwnerId: options.registrationOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourcePromotionStatus: promotion.status,
      status,
      readyForLive: false,
      audioProductionReady: false,
      audioAssetRegistrationAllowed: false,
      runtimeRegistryWriteAllowed: false,
      sourceRegistrationPlanReady: status === 'ready_for_source_registration_implementation',
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      registryWritesUsed: false,
      pronunciationReadinessMayBeInferred: false,
      phaseWriteTargets: [],
      plannedSourceTargets: ['app/personal_plan_audio_asset_registry.ts'],
      summary: {
        expectedMp3Count: promotion.summary.expectedMp3Count,
        approvedFinalAudioCount: promotion.summary.promotedFinalAudioCount,
        registryCandidateAssetCount,
        blockedAssetCount,
        sourceRegistrationTargetCount: 1,
        blockerCount: blockers.length,
      },
      rows,
      finalAudioGateEvidence: {
        valid: finalAudioGate.valid,
        issues: finalAudioGate.issues,
        summary: finalAudioGate.summary,
      },
      blockers,
      requiredNextActions: [
        'Run a separate source-registration implementation pass before runtime audio registry writes.',
        'Keep the implementation pass focused on approved final audio assets only.',
        'Run listening route regression after source registration, then keep pronunciation readiness separate.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        sourceFilesEdited: false,
        registryFilesEdited: false,
        audioFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1LiveAudioRegistrySourcePreflight(
  promotion: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport,
  options: GavanWeek1LiveAudioRegistrySourcePreflightWriteOptions,
): GavanWeek1LiveAudioRegistrySourcePreflightWriteResult {
  if (!isGavanWeek1LiveAudioRegistrySourcePreflightTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Live audio registry source preflight can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1LiveAudioRegistrySourcePreflight(promotion, options);
  if (!result.valid || !result.report) return result;

  const output = `${JSON.stringify(result.report, null, 2)}\n`;
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  writeFileSync(options.targetPath, output, 'utf8');

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(output, 'utf8'),
  };
}
