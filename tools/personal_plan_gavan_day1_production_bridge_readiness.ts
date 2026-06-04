import {
  validateGavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReportIssue,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import {
  auditGavanDay1ApprovedArtifactCopy,
  type GavanDay1ArtifactCopyAuditIssue,
} from './personal_plan_gavan_day1_artifact_copy_audit';
import type {
  GavanDay1ApprovedReportArtifact,
} from './personal_plan_gavan_day1_approved_report_artifact';
import {
  auditGavanDay1ApprovedReportArtifact,
  type GavanDay1ApprovedArtifactAuditIssue,
} from './personal_plan_gavan_day1_generated_artifact';

export type GavanDay1ProductionBridgeReadinessStageId =
  | 'approved_report'
  | 'approved_artifact'
  | 'product_copy';

export type GavanDay1ProductionBridgeReadinessIssueCode =
  | 'approved_report_invalid'
  | 'approved_artifact_invalid'
  | 'product_copy_invalid';

export type GavanDay1ProductionBridgeReadinessIssue = {
  code: GavanDay1ProductionBridgeReadinessIssueCode;
  stage: GavanDay1ProductionBridgeReadinessStageId;
  sourceCode: string;
  snippetId?: string;
  detail: string;
};

export type GavanDay1ProductionBridgeReadinessStage = {
  id: GavanDay1ProductionBridgeReadinessStageId;
  status: 'ready' | 'blocked';
  issueCount: number;
  issues: GavanDay1ProductionBridgeReadinessIssue[];
};

export type GavanDay1ProductionBridgeReadinessResult = {
  kind: 'gavan_day1_production_bridge_readiness';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  status: 'ready' | 'blocked';
  canDraftProductionBridge: boolean;
  blockers: GavanDay1ProductionBridgeReadinessStageId[];
  stages: {
    approvedReport: GavanDay1ProductionBridgeReadinessStage;
    approvedArtifact: GavanDay1ProductionBridgeReadinessStage;
    productCopy: GavanDay1ProductionBridgeReadinessStage;
  };
  summary: {
    headline: string;
    ready: GavanDay1ProductionBridgeReadinessStageId[];
    blockers: GavanDay1ProductionBridgeReadinessStageId[];
  };
};

function issue(
  code: GavanDay1ProductionBridgeReadinessIssueCode,
  stage: GavanDay1ProductionBridgeReadinessStageId,
  sourceCode: string,
  detail: string,
  snippetId?: string,
): GavanDay1ProductionBridgeReadinessIssue {
  return { code, stage, sourceCode, detail, snippetId };
}

function reportIssues(
  issues: GavanDay1ApprovedExportReportIssue[],
): GavanDay1ProductionBridgeReadinessIssue[] {
  return issues.map((currentIssue) => issue(
    'approved_report_invalid',
    'approved_report',
    currentIssue.code,
    currentIssue.detail,
    currentIssue.snippetId,
  ));
}

function artifactIssues(
  issues: GavanDay1ApprovedArtifactAuditIssue[],
): GavanDay1ProductionBridgeReadinessIssue[] {
  return issues.map((currentIssue) => issue(
    'approved_artifact_invalid',
    'approved_artifact',
    currentIssue.code,
    currentIssue.detail,
    currentIssue.snippetId,
  ));
}

function copyIssues(
  issues: GavanDay1ArtifactCopyAuditIssue[],
): GavanDay1ProductionBridgeReadinessIssue[] {
  return issues.map((currentIssue) => issue(
    'product_copy_invalid',
    'product_copy',
    currentIssue.code,
    currentIssue.detail,
    currentIssue.snippetId,
  ));
}

function stage(
  id: GavanDay1ProductionBridgeReadinessStageId,
  issues: GavanDay1ProductionBridgeReadinessIssue[],
): GavanDay1ProductionBridgeReadinessStage {
  return {
    id,
    status: issues.length === 0 ? 'ready' : 'blocked',
    issueCount: issues.length,
    issues,
  };
}

export function buildGavanDay1ProductionBridgeReadiness(
  artifact: GavanDay1ApprovedReportArtifact,
): GavanDay1ProductionBridgeReadinessResult {
  const reportValidation = validateGavanDay1ApprovedExportReport(artifact.report);
  const artifactAudit = auditGavanDay1ApprovedReportArtifact(artifact);
  const copyAudit = auditGavanDay1ApprovedArtifactCopy(artifact);
  const stages = {
    approvedReport: stage('approved_report', reportIssues(reportValidation.issues)),
    approvedArtifact: stage('approved_artifact', artifactIssues(artifactAudit.issues)),
    productCopy: stage('product_copy', copyIssues(copyAudit.issues)),
  };
  const allStages = [
    stages.approvedReport,
    stages.approvedArtifact,
    stages.productCopy,
  ];
  const blockers = allStages
    .filter((currentStage) => currentStage.status === 'blocked')
    .map((currentStage) => currentStage.id);
  const ready = allStages
    .filter((currentStage) => currentStage.status === 'ready')
    .map((currentStage) => currentStage.id);
  const canDraftProductionBridge = blockers.length === 0;

  return {
    kind: 'gavan_day1_production_bridge_readiness',
    dayId: 'gavan-week1-day1',
    liveIntegration: false,
    status: canDraftProductionBridge ? 'ready' : 'blocked',
    canDraftProductionBridge,
    blockers,
    stages,
    summary: {
      headline: canDraftProductionBridge
        ? 'Gavan day 1 is ready for production bridge draft.'
        : 'Gavan day 1 is not ready for production bridge draft.',
      ready,
      blockers,
    },
  };
}
