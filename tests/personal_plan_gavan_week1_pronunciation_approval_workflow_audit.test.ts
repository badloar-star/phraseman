import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1CanonicalPlan } from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import {
  buildGavanWeek1PronunciationScoringReadinessPacket,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';
import {
  buildGavanWeek1PronunciationScoringProviderContract,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1PronunciationApprovalWorkflowAudit,
  writeGavanWeek1PronunciationApprovalWorkflowAudit,
} from '../tools/personal_plan_gavan_week1_pronunciation_approval_workflow_audit';

const OPTIONS = {
  generatedAt: '2026-06-04T17:40:00.000Z',
  evidenceOwnerId: 'pronunciation-evidence-owner',
  readinessOwnerId: 'pronunciation-production-readiness-owner',
  workflowOwnerId: 'pronunciation-approval-workflow-owner',
};

function providerContract() {
  const adapter = buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
  const packetResult = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
    generatedAt: OPTIONS.generatedAt,
  });
  if (!packetResult.packet) throw new Error('expected pronunciation scoring readiness packet');

  const contractResult = buildGavanWeek1PronunciationScoringProviderContract(packetResult.packet, {
    generatedAt: OPTIONS.generatedAt,
  });
  if (!contractResult.contract) throw new Error('expected pronunciation provider contract');

  return contractResult.contract;
}

describe('Gavan week 1 pronunciation approval workflow audit', () => {
  it('blocks pronunciation reviewer signoff before scorer provider and real recording evidence exist', () => {
    const result = buildGavanWeek1PronunciationApprovalWorkflowAudit(providerContract(), {}, OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.audit).toMatchObject({
      kind: 'gavan_week1_pronunciation_approval_workflow_audit',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceReadinessGateStatus: 'hold_missing_scorer_provider',
      sourceReleaseDecision: 'hold',
      status: 'blocked_before_scorer_provider_contract',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      pronunciationApprovalWorkflowReady: false,
      reviewerSignoffAllowed: false,
      approvalRecordsCreated: false,
      finalScorerPromotionAllowed: false,
      liveAdapterAllowed: false,
      progressPenaltyAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      recordingFilesWritten: false,
      scoringFilesWritten: false,
      audioReadinessMayBeInferred: false,
    });
    expect(result.audit.summary).toEqual({
      referenceCount: 4,
      scorerProviderReadyCount: 0,
      recordingEvidenceReadyCount: 0,
      scoredAttemptReadyCount: 0,
      reviewerSignoffReadyCount: 0,
      explicitApprovalRecordCount: 0,
      finalScorerReadyCount: 0,
      liveAdapterReadyCount: 0,
      progressPenaltyReadyCount: 0,
      blockedWorkflowRowCount: 4,
      blockerCount: 7,
    });
    expect(result.audit.workflowRows).toHaveLength(4);
    expect(result.audit.workflowRows.every((row) =>
      row.status === 'blocked_missing_scorer_provider' &&
      row.scorerProviderReady === false &&
      row.recordingEvidenceReady === false &&
      row.scoredAttemptReady === false &&
      row.reviewerSignoffAllowed === false &&
      row.approvalRecordCreated === false &&
      row.finalScorerPromotionAllowed === false &&
      row.liveAdapterAllowed === false &&
      row.progressPenaltyAllowed === false &&
      row.productionReady === false,
    )).toBe(true);
    expect(result.audit.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_scorer_provider_contract',
      'missing_real_recording_evidence',
      'missing_scored_attempt_evidence',
      'pronunciation_reviewer_signoff_blocked',
      'final_scorer_promotion_blocked',
      'live_pronunciation_adapter_blocked',
      'progress_penalty_blocked',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-approval-workflow-audit.test.json',
    );
    const result = writeGavanWeek1PronunciationApprovalWorkflowAudit(providerContract(), {}, {
      ...OPTIONS,
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_pronunciation_approval_workflow_audit');
    expect(parsed.status).toBe('blocked_before_scorer_provider_contract');
    expect(parsed.summary.blockedWorkflowRowCount).toBe(4);
  });

  it('rejects runtime, scoring, recording, audio, and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_attempt.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_recording.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-pronunciation-approval.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1PronunciationApprovalWorkflowAudit(providerContract(), {}, {
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Pronunciation approval workflow audit can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio workers live scorers or readiness source', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_pronunciation_approval_workflow_audit.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'child_process',
      'ffprobe',
      'from \'openai\'',
      'from "openai"',
      'personal_plan_audio_openai_worker',
      'personal_plan_pronunciation_readiness',
      'personal_plan_exercise.tsx',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical audit path', () => {
    expect(GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-approval-workflow-audit.json',
    ));
  });
});
