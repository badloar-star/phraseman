import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1CanonicalPlan } from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import {
  GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1FinalAudioApprovalWorkflowAudit,
  writeGavanWeek1FinalAudioApprovalWorkflowAudit,
} from './personal_plan_gavan_week1_final_audio_approval_workflow_audit';
import {
  GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1PronunciationApprovalWorkflowAudit,
  writeGavanWeek1PronunciationApprovalWorkflowAudit,
} from './personal_plan_gavan_week1_pronunciation_approval_workflow_audit';
import {
  buildGavanWeek1PronunciationScoringProviderContract,
} from './personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  buildGavanWeek1PronunciationScoringReadinessPacket,
} from './personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';
import {
  GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1RouteLiveReleaseWorkflowAudit,
  writeGavanWeek1RouteLiveReleaseWorkflowAudit,
} from './personal_plan_gavan_week1_route_live_release_workflow_audit';

export const GAVAN_WEEK1_MASTER_PRODUCTION_READINESS_MATRIX_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-master-production-readiness-matrix.json',
);

type MatrixStatus =
  | 'hold_audio_pronunciation_route_blocked'
  | 'hold_audio_blocked'
  | 'hold_pronunciation_blocked'
  | 'hold_route_blocked'
  | 'ready_for_final_release_review';

type MatrixIssueCode =
  | 'target_path_not_allowed'
  | 'audio_workflow_invalid'
  | 'pronunciation_workflow_invalid'
  | 'route_workflow_invalid';

type LayerId = 'audio' | 'pronunciation' | 'route';

interface MatrixIssue {
  code: MatrixIssueCode;
  detail: string;
}

interface AudioOptions {
  ownerId: string;
  intakeOwnerId: string;
  approvalOwnerId: string;
  registrationOwnerId: string;
  recordPacketOwnerId: string;
  readinessOwnerId: string;
  workflowOwnerId: string;
  outputRoot: string;
}

interface PronunciationOptions {
  evidenceOwnerId: string;
  readinessOwnerId: string;
  workflowOwnerId: string;
}

interface RouteOptions {
  workflowOwnerId: string;
}

interface BuildOptions {
  generatedAt: string;
  matrixOwnerId: string;
  audio: AudioOptions;
  pronunciation: PronunciationOptions;
  route: RouteOptions;
}

interface WriteOptions extends BuildOptions {
  targetPath: string;
}

interface MatrixLayer {
  id: LayerId;
  status: string;
  releaseDecision: 'hold' | 'ready_for_review';
  productionReady: false;
  readyForLive: false;
  liveWriteAllowed: false;
  blockerCount: number;
  requiredNextAction: string;
}

interface MatrixBlocker {
  code: string;
  layer: LayerId;
  blocksProduction: true;
  detail: string;
}

interface MasterProductionReadinessMatrix {
  kind: 'gavan_week1_master_production_readiness_matrix';
  generatedAt: string;
  matrixOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: MatrixStatus;
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
  layers: MatrixLayer[];
  blockers: MatrixBlocker[];
  artifactPaths: {
    finalAudioApprovalWorkflowAudit: string;
    pronunciationApprovalWorkflowAudit: string;
    routeLiveReleaseWorkflowAudit: string;
    masterProductionReadinessMatrix: string;
  };
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: string[];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
}

interface BuildResult {
  valid: boolean;
  issues: MatrixIssue[];
  matrix: MasterProductionReadinessMatrix;
}

interface WriteResult {
  valid: boolean;
  issues: MatrixIssue[];
  targetPath?: string;
  bytesWritten?: number;
  matrix?: MasterProductionReadinessMatrix;
}

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Master production readiness matrix can only write under .codex-tmp or docs/reports.';

function relativeArtifactPath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const allowedRoots = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];

  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function buildProviderContract(options: BuildOptions) {
  const adapter = buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
  const packetResult = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
    generatedAt: options.generatedAt,
  });
  if (!packetResult.packet) {
    throw new Error('Expected pronunciation scoring readiness packet.');
  }

  const contractResult = buildGavanWeek1PronunciationScoringProviderContract(packetResult.packet, {
    generatedAt: options.generatedAt,
  });
  if (!contractResult.contract) {
    throw new Error('Expected pronunciation scoring provider contract.');
  }

  return contractResult.contract;
}

const NORMALIZED_PRONUNCIATION_BLOCKER_CODES: Record<string, string> = {
  missing_scorer_provider_contract: 'missing_scorer_provider',
  missing_real_recording_evidence: 'missing_recording_evidence',
  pronunciation_reviewer_signoff_blocked: 'reviewer_signoff_blocked',
  live_pronunciation_adapter_blocked: 'live_adapter_blocked',
};

function normalizedBlockerCode(layer: LayerId, code: string): string {
  if (layer !== 'pronunciation') return code;
  return NORMALIZED_PRONUNCIATION_BLOCKER_CODES[code] ?? code;
}

function prefixedBlockers(layer: LayerId, blockers: Array<{ code: string; detail: string }>): MatrixBlocker[] {
  return blockers.map((blocker) => ({
    code: `${layer}_${normalizedBlockerCode(layer, blocker.code)}`,
    layer,
    blocksProduction: true,
    detail: blocker.detail,
  }));
}

function statusForLayers(layers: MatrixLayer[]): MatrixStatus {
  const heldLayers = layers.filter((layer) => layer.releaseDecision === 'hold').map((layer) => layer.id);
  if (heldLayers.includes('audio') && heldLayers.includes('pronunciation') && heldLayers.includes('route')) {
    return 'hold_audio_pronunciation_route_blocked';
  }
  if (heldLayers.includes('audio')) return 'hold_audio_blocked';
  if (heldLayers.includes('pronunciation')) return 'hold_pronunciation_blocked';
  if (heldLayers.includes('route')) return 'hold_route_blocked';
  return 'ready_for_final_release_review';
}

export function buildGavanWeek1MasterProductionReadinessMatrix(options: BuildOptions): BuildResult {
  const audioResult = buildGavanWeek1FinalAudioApprovalWorkflowAudit({
    generatedAt: options.generatedAt,
    ...options.audio,
  });
  const contract = buildProviderContract(options);
  const pronunciationResult = buildGavanWeek1PronunciationApprovalWorkflowAudit(contract, {}, {
    generatedAt: options.generatedAt,
    ...options.pronunciation,
  });
  const routeResult = buildGavanWeek1RouteLiveReleaseWorkflowAudit({
    generatedAt: options.generatedAt,
    ...options.route,
  });

  const audioAudit = audioResult.audit;
  const pronunciationAudit = pronunciationResult.audit;
  const routeAudit = routeResult.audit;

  const layers: MatrixLayer[] = [
    {
      id: 'audio',
      status: audioAudit.status,
      releaseDecision: audioAudit.releaseDecision,
      productionReady: false,
      readyForLive: false,
      liveWriteAllowed: false,
      blockerCount: audioAudit.summary.blockerCount,
      requiredNextAction: 'Validate the 10 real MP3 files, produce checksum evidence, collect reviewer signoff, and only then consider explicit approval records.',
    },
    {
      id: 'pronunciation',
      status: pronunciationAudit.status,
      releaseDecision: pronunciationAudit.releaseDecision,
      productionReady: false,
      readyForLive: false,
      liveWriteAllowed: false,
      blockerCount: pronunciationAudit.summary.blockerCount,
      requiredNextAction: 'Attach a real scorer provider, record real attempts, create scored-attempt evidence, and only then request pronunciation approval.',
    },
    {
      id: 'route',
      status: routeAudit.status,
      releaseDecision: routeAudit.releaseDecision,
      productionReady: false,
      readyForLive: false,
      liveWriteAllowed: false,
      blockerCount: routeAudit.summary.blockerCount,
      requiredNextAction: 'Collect product-copy signature and route approval before route source registration, live regression, and device verification.',
    },
  ];

  const blockers = [
    ...prefixedBlockers('audio', audioAudit.blockers),
    ...prefixedBlockers('pronunciation', pronunciationAudit.blockers),
    ...prefixedBlockers('route', routeAudit.blockers),
  ];
  const issues: MatrixIssue[] = [];
  if (!audioResult.valid) {
    issues.push({ code: 'audio_workflow_invalid', detail: 'Audio workflow audit reported invalid source evidence.' });
  }
  if (!pronunciationResult.valid) {
    issues.push({ code: 'pronunciation_workflow_invalid', detail: 'Pronunciation workflow audit reported invalid source evidence.' });
  }
  if (!routeResult.valid) {
    issues.push({ code: 'route_workflow_invalid', detail: 'Route workflow audit reported invalid source evidence.' });
  }

  const matrix: MasterProductionReadinessMatrix = {
    kind: 'gavan_week1_master_production_readiness_matrix',
    generatedAt: options.generatedAt,
    matrixOwnerId: options.matrixOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: statusForLayers(layers),
    releaseDecision: blockers.length === 0 ? 'ready_for_review' : 'hold',
    productionReady: false,
    readyForLive: false,
    audioProductionReady: false,
    pronunciationProductionReady: false,
    routeProductionReady: false,
    allExplicitApprovalsPresent: false,
    liveAssetRegistrationAllowed: false,
    liveRouteRegistrationAllowed: false,
    liveRuntimeChangesAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      layerCount: layers.length,
      holdLayerCount: layers.filter((layer) => layer.releaseDecision === 'hold').length,
      productionReadyLayerCount: 0,
      totalBlockerCount: blockers.length,
      audioExpectedMp3Count: audioAudit.summary.expectedMp3Count,
      audioApprovedFinalCount: audioAudit.summary.finalPromotionReadyCount,
      pronunciationReferenceCount: pronunciationAudit.summary.referenceCount,
      pronunciationApprovedReferenceCount: pronunciationAudit.summary.finalScorerReadyCount,
      routeWorkflowStageCount: routeAudit.summary.workflowStageCount,
      routeBlockedWorkflowStageCount: routeAudit.summary.blockedWorkflowStageCount,
      liveArtifactCount: routeAudit.summary.liveArtifactCount,
    },
    layers,
    blockers,
    artifactPaths: {
      finalAudioApprovalWorkflowAudit: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH),
      pronunciationApprovalWorkflowAudit: relativeArtifactPath(GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH),
      routeLiveReleaseWorkflowAudit: relativeArtifactPath(GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH),
      masterProductionReadinessMatrix: relativeArtifactPath(GAVAN_WEEK1_MASTER_PRODUCTION_READINESS_MATRIX_PATH),
    },
    requiredNextActions: layers.map((layer) => layer.requiredNextAction),
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };

  return {
    valid: issues.length === 0,
    issues,
    matrix,
  };
}

export function writeGavanWeek1MasterProductionReadinessMatrix(options: WriteOptions): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      }],
    };
  }

  writeGavanWeek1FinalAudioApprovalWorkflowAudit({
    generatedAt: options.generatedAt,
    ...options.audio,
    targetPath: GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH,
  });
  const contract = buildProviderContract(options);
  writeGavanWeek1PronunciationApprovalWorkflowAudit(contract, {}, {
    generatedAt: options.generatedAt,
    ...options.pronunciation,
    targetPath: GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH,
  });
  writeGavanWeek1RouteLiveReleaseWorkflowAudit({
    generatedAt: options.generatedAt,
    ...options.route,
    targetPath: GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH,
  });

  const result = buildGavanWeek1MasterProductionReadinessMatrix(options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.matrix, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    matrix: result.matrix,
  };
}
