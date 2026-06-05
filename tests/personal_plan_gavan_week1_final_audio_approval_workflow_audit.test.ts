import { readFileSync, rmSync } from 'fs';
import path from 'path';

import {
  GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1FinalAudioApprovalWorkflowAudit,
  writeGavanWeek1FinalAudioApprovalWorkflowAudit,
} from '../tools/personal_plan_gavan_week1_final_audio_approval_workflow_audit';

const MISSING_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-workflow-missing-files');

const OPTIONS = {
  generatedAt: '2026-06-04T17:10:00.000Z',
  ownerId: 'audio-handoff-owner',
  intakeOwnerId: 'audio-intake-owner',
  approvalOwnerId: 'audio-approval-owner',
  registrationOwnerId: 'audio-registration-owner',
  recordPacketOwnerId: 'audio-record-packet-owner',
  readinessOwnerId: 'audio-production-readiness-owner',
  workflowOwnerId: 'audio-final-approval-workflow-owner',
  outputRoot: MISSING_OUTPUT_ROOT,
};

describe('Gavan week 1 final audio approval workflow audit', () => {
  beforeEach(() => {
    rmSync(MISSING_OUTPUT_ROOT, { recursive: true, force: true });
  });

  it('blocks reviewer signoff before generated MP3 validation and checksum evidence exist', () => {
    const result = buildGavanWeek1FinalAudioApprovalWorkflowAudit(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.audit).toMatchObject({
      kind: 'gavan_week1_final_audio_approval_workflow_audit',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceReadinessGateStatus: 'hold_missing_generated_audio',
      sourceReleaseDecision: 'hold',
      status: 'blocked_before_generated_file_validation',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      finalApprovalWorkflowReady: false,
      reviewerSignoffAllowed: false,
      approvalRecordsCreated: false,
      finalPromotionAllowed: false,
      registryWriteAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      audioFilesWritten: false,
      registryWritesUsed: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.audit.summary).toEqual({
      expectedMp3Count: 10,
      generatedFileValidatedCount: 0,
      checksumEvidenceReadyCount: 0,
      reviewerSignoffReadyCount: 0,
      explicitApprovalRecordCount: 0,
      finalPromotionReadyCount: 0,
      registryReadyCount: 0,
      blockedWorkflowRowCount: 10,
      blockerCount: 5,
    });
    expect(result.audit.workflowRows).toHaveLength(10);
    expect(result.audit.workflowRows.every((row) =>
      row.status === 'blocked_missing_generated_file' &&
      row.reviewerSignoffAllowed === false &&
      row.approvalRecordCreated === false &&
      row.finalPromotionAllowed === false &&
      row.registryWriteAllowed === false &&
      row.productionReady === false,
    )).toBe(true);
    expect(result.audit.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_generated_mp3_files',
      'missing_generated_file_checksums',
      'reviewer_signoff_blocked',
      'final_audio_promotion_blocked',
      'live_audio_registry_blocked',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-final-audio-approval-workflow-audit.test.json',
    );
    const result = writeGavanWeek1FinalAudioApprovalWorkflowAudit({
      ...OPTIONS,
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_final_audio_approval_workflow_audit');
    expect(parsed.status).toBe('blocked_before_generated_file_validation');
    expect(parsed.summary.blockedWorkflowRowCount).toBe(10);
  });

  it('rejects live approval, asset, registry, and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_approval_gate.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_audio_asset_runtime_registry.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-final-approval.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1FinalAudioApprovalWorkflowAudit({
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Final audio approval workflow audit can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio workers approval writers or pronunciation gates', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_final_audio_approval_workflow_audit.ts'),
      'utf8',
    );

    for (const forbidden of [
      'approvePlanAudioAssets',
      'buildPlanAudioApprovalInput',
      'registerPlanAudioAssetsForRuntime',
      'personal_plan_audio_asset_runtime_registry',
      'personal_plan_audio_openai_worker',
      'personal_plan_pronunciation',
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'child_process',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical audit path', () => {
    expect(GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-final-audio-approval-workflow-audit.json',
    ));
  });
});
