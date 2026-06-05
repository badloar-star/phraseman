import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1LiveRouteRegressionEvidencePreflight,
} from './personal_plan_gavan_week1_live_route_regression_evidence_preflight';

export const GAVAN_WEEK1_MASTER_FINAL_RELEASE_READINESS_V2_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-master-final-release-readiness-v2.json',
);

type FinalStatus =
  | 'hold_audio_pronunciation_route_evidence_blocked'
  | 'hold_audio_blocked'
  | 'hold_pronunciation_blocked'
  | 'hold_route_blocked'
  | 'ready_for_final_release_review';

type IssueCode =
  | 'wrong_master_matrix_kind'
  | 'wrong_route_evidence_kind'
  | 'wrong_plan_or_week'
  | 'master_matrix_not_non_live'
  | 'route_evidence_not_non_live'
  | 'target_path_not_allowed';

type LayerId = 'audio' | 'pronunciation' | 'route';

export type GavanWeek1MasterProductionReadinessMatrixInput = {
  kind: 'gavan_week1_master_production_readiness_matrix';
  generatedAt: string;
  matrixOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: string;
  releaseDecision: 'hold' | 'ready_for_review';
  productionReady: false;
  readyForLive: false;
  audioProductionReady: false;
  pronunciationProductionReady: false;
  routeProductionReady: false;
  allExplicitApprovalsPresent: false;
  liveAssetRegistrationAllowed: false;
  liveRouteRegistrationAllowed: false;
  liveRuntimeChangesAllowed: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: {
    layerCount: number;
    holdLayerCount: number;
    productionReadyLayerCount: number;
    totalBlockerCount: number;
    audioExpectedMp3Count: number;
    audioApprovedFinalCount: number;
    pronunciationReferenceCount: number;
    pronunciationApprovedReferenceCount: number;
    routeWorkflowStageCount: number;
    routeBlockedWorkflowStageCount: number;
    liveArtifactCount: number;
  };
  layers: Array<{
    id: LayerId;
    status: string;
    releaseDecision: 'hold' | 'ready_for_review';
    productionReady: false;
    readyForLive: false;
    liveWriteAllowed: false;
    blockerCount: number;
    requiredNextAction: string;
  }>;
  blockers: Array<{
    code: string;
    layer: LayerId;
    blocksProduction: true;
    detail: string;
  }>;
  artifactPaths: Record<string, string>;
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: string[];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type GavanWeek1MasterFinalReleaseReadinessV2Issue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1MasterFinalReleaseLayer = {
  id: LayerId;
  status: string;
  productionReady: false;
  readyForLive: false;
  blockerCount: number;
};

export type GavanWeek1MasterFinalReleaseBlocker = {
  code: string;
  layer: LayerId;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1MasterFinalReleaseReadinessV2 = {
  kind: 'gavan_week1_master_final_release_readiness_v2';
  generatedAt: string;
  releaseOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceMasterStatus: GavanWeek1MasterProductionReadinessMatrixInput['status'];
  sourceRouteEvidenceStatus: GavanWeek1LiveRouteRegressionEvidencePreflight['status'];
  status: FinalStatus;
  releaseDecision: 'hold' | 'ready_for_review';
  finalReleaseReady: false;
  productionReady: false;
  readyForLive: false;
  audioReady: false;
  pronunciationReady: false;
  routeReady: false;
  regressionEvidenceReady: false;
  deviceEvidenceReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: {
    sourceLayerCount: number;
    finalLayerCount: number;
    productionReadyLayerCount: number;
    masterBlockerCount: number;
    routeEvidenceBlockerCount: number;
    totalBlockerCount: number;
    audioExpectedMp3Count: number;
    pronunciationReferenceCount: number;
    routeWorkflowStageCount: number;
    routeRegressionSuiteCount: number;
    routeDeviceCheckCount: number;
  };
  layers: GavanWeek1MasterFinalReleaseLayer[];
  blockers: GavanWeek1MasterFinalReleaseBlocker[];
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  releaseOwnerId: string;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1MasterFinalReleaseReadinessV2Issue[];
  readiness: GavanWeek1MasterFinalReleaseReadinessV2;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1MasterFinalReleaseReadinessV2Issue[];
  targetPath?: string;
  bytesWritten?: number;
  readiness?: GavanWeek1MasterFinalReleaseReadinessV2;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Master final release readiness v2 can only write under .codex-tmp or docs/reports.';

function issue(code: IssueCode, detail: string): GavanWeek1MasterFinalReleaseReadinessV2Issue {
  return { code, detail };
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const roots = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];

  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function validateInputs(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
): GavanWeek1MasterFinalReleaseReadinessV2Issue[] {
  const issues: GavanWeek1MasterFinalReleaseReadinessV2Issue[] = [];

  if (matrix.kind !== 'gavan_week1_master_production_readiness_matrix') {
    issues.push(issue('wrong_master_matrix_kind', 'Final release readiness v2 requires the master production readiness matrix.'));
  }
  if (evidence.kind !== 'gavan_week1_live_route_regression_evidence_preflight') {
    issues.push(issue('wrong_route_evidence_kind', 'Final release readiness v2 requires the live route regression evidence preflight.'));
  }
  if (matrix.planId !== 'gavan' || matrix.weekId !== 'gavan-week1' || evidence.planId !== 'gavan' || evidence.weekId !== 'gavan-week1') {
    issues.push(issue('wrong_plan_or_week', 'Final release readiness v2 can only target Gavan week 1.'));
  }
  if (
    matrix.productionReady !== false ||
    matrix.readyForLive !== false ||
    matrix.liveAssetRegistrationAllowed !== false ||
    matrix.liveRouteRegistrationAllowed !== false ||
    matrix.liveRuntimeChangesAllowed !== false ||
    matrix.sourceWritesUsed !== false ||
    matrix.liveEditsAllowed !== false
  ) {
    issues.push(issue('master_matrix_not_non_live', 'Final release readiness v2 cannot start from a live-ready master matrix.'));
  }
  if (
    evidence.productionReady !== false ||
    evidence.readyForLive !== false ||
    evidence.regressionEvidenceReady !== false ||
    evidence.deviceEvidenceReady !== false ||
    evidence.sourceWritesUsed !== false ||
    evidence.liveEditsAllowed !== false
  ) {
    issues.push(issue('route_evidence_not_non_live', 'Final release readiness v2 cannot start from live-ready route evidence.'));
  }

  return issues;
}

function finalStatus(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
): FinalStatus {
  const audioHeld = matrix.layers.some((layer) => layer.id === 'audio' && layer.releaseDecision === 'hold');
  const pronunciationHeld = matrix.layers.some((layer) => layer.id === 'pronunciation' && layer.releaseDecision === 'hold');
  const routeHeld = matrix.layers.some((layer) => layer.id === 'route' && layer.releaseDecision === 'hold') ||
    evidence.releaseDecision === 'hold';

  if (audioHeld && pronunciationHeld && routeHeld) return 'hold_audio_pronunciation_route_evidence_blocked';
  if (audioHeld) return 'hold_audio_blocked';
  if (pronunciationHeld) return 'hold_pronunciation_blocked';
  if (routeHeld) return 'hold_route_blocked';
  return 'ready_for_final_release_review';
}

function layers(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
): GavanWeek1MasterFinalReleaseLayer[] {
  return matrix.layers.map((layer) => ({
    id: layer.id,
    status: layer.id === 'route' ? evidence.status : layer.status,
    productionReady: false,
    readyForLive: false,
    blockerCount: layer.id === 'route'
      ? layer.blockerCount + evidence.summary.evidenceBlockerCount
      : layer.blockerCount,
  }));
}

function blockers(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
): GavanWeek1MasterFinalReleaseBlocker[] {
  return [
    ...matrix.blockers.map((blocker) => ({
      ...blocker,
      blocksProduction: true as const,
    })),
    ...evidence.blockers.map((blocker) => ({
      code: `route_evidence_${blocker.code}`,
      layer: 'route' as const,
      blocksProduction: true as const,
      detail: blocker.detail,
    })),
  ];
}

export function buildGavanWeek1MasterFinalReleaseReadinessV2(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
  options: BuildOptions,
): BuildResult {
  const issues = validateInputs(matrix, evidence);
  const allBlockers = blockers(matrix, evidence);
  const finalLayers = layers(matrix, evidence);

  return {
    valid: issues.length === 0,
    issues,
    readiness: {
      kind: 'gavan_week1_master_final_release_readiness_v2',
      generatedAt: options.generatedAt,
      releaseOwnerId: options.releaseOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceMasterStatus: matrix.status,
      sourceRouteEvidenceStatus: evidence.status,
      status: finalStatus(matrix, evidence),
      releaseDecision: allBlockers.length === 0 ? 'ready_for_review' : 'hold',
      finalReleaseReady: false,
      productionReady: false,
      readyForLive: false,
      audioReady: false,
      pronunciationReady: false,
      routeReady: false,
      regressionEvidenceReady: false,
      deviceEvidenceReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      summary: {
        sourceLayerCount: 2,
        finalLayerCount: finalLayers.length,
        productionReadyLayerCount: 0,
        masterBlockerCount: matrix.summary.totalBlockerCount,
        routeEvidenceBlockerCount: evidence.summary.evidenceBlockerCount,
        totalBlockerCount: allBlockers.length,
        audioExpectedMp3Count: matrix.summary.audioExpectedMp3Count,
        pronunciationReferenceCount: matrix.summary.pronunciationReferenceCount,
        routeWorkflowStageCount: matrix.summary.routeWorkflowStageCount,
        routeRegressionSuiteCount: evidence.summary.regressionSuiteCount,
        routeDeviceCheckCount: evidence.summary.deviceCheckCount,
      },
      layers: finalLayers,
      blockers: allBlockers,
      requiredNextActions: [
        'Provide real MP3 files, checksum evidence, reviewer signoff, explicit approval records, final audio promotion, and live audio registry evidence.',
        'Provide a real pronunciation scorer provider, recordings, scored attempts, reviewer signoff, final scorer promotion, live adapter evidence, and progress-penalty evidence.',
        'Provide signed route approval, route source registration, live route regression evidence, and device route opening verification.',
      ],
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1MasterFinalReleaseReadinessV2(
  matrix: GavanWeek1MasterProductionReadinessMatrixInput,
  evidence: GavanWeek1LiveRouteRegressionEvidencePreflight,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      }],
    };
  }

  const result = buildGavanWeek1MasterFinalReleaseReadinessV2(matrix, evidence, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.readiness, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    readiness: result.readiness,
  };
}
