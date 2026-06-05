import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import { buildGavanWeek1AudioGenerationHandoffPacket } from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';
import { buildGavanWeek1GeneratedAudioIntakeReport } from '../tools/personal_plan_gavan_week1_generated_audio_intake_report';
import {
  GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_RECORDS_PATH,
  GAVAN_WEEK1_FINAL_AUDIO_PROMOTION_REPORT_PATH,
  buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion,
  isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed,
  writeGavanWeek1AudioExplicitApprovalRecordsAndPromotion,
} from '../tools/personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion';

const GENERATED_AT = '2026-06-04T23:10:00.000Z';
const APPROVED_AT = '2026-06-04T23:09:00.000Z';

function handoffPacket() {
  const plan = buildGavanWeek1AudioGenerationPlan({
    voiceId: 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
  const result = buildGavanWeek1AudioGenerationHandoffPacket(plan, {
    generatedAt: '2026-06-04T00:00:00.000Z',
    ownerId: 'audio-producer',
  });
  if (!result.packet) throw new Error('expected handoff packet');
  return result.packet;
}

function completeGeneratedIntake() {
  const handoff = handoffPacket();
  const generatedFilesByOutputPath = Object.fromEntries(
    handoff.generationRequests.map((request, index) => [
      request.outputPath,
      {
        uri: request.outputPath,
        durationMs: 1200 + index,
        bytes: 4096 + index,
      },
    ]),
  );
  const result = buildGavanWeek1GeneratedAudioIntakeReport(handoff, generatedFilesByOutputPath, {
    generatedAt: '2026-06-04T00:00:00.000Z',
    intakeOwnerId: 'audio-intake',
  });
  if (!result.report) throw new Error('expected generated audio intake report');
  return result.report;
}

function missingGeneratedIntake() {
  const result = buildGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
    generatedAt: '2026-06-04T00:00:00.000Z',
    intakeOwnerId: 'audio-intake',
  });
  if (!result.report) throw new Error('expected generated audio intake report');
  return result.report;
}

describe('Gavan week 1 audio explicit approval records and promotion', () => {
  it('turns valid generated MP3 evidence and explicit reviewer approval into non-live final promotion evidence', () => {
    const result = buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(completeGeneratedIntake(), {
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'audio-approval-owner',
      reviewerId: 'user-audio-reviewer',
      approvedAt: APPROVED_AT,
      approvalSource: 'user_message: Excellent audios, continue',
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_audio_explicit_approval_records_and_promotion',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'ready_for_guarded_live_audio_registry_preflight',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: true,
      finalAudioPromotionReady: true,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      approvalMayBeInferred: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      validGeneratedFileCount: 10,
      approvalRecordCount: 10,
      approvalRecordValidCount: 10,
      approvalRecordInvalidCount: 0,
      promotedFinalAudioCount: 10,
      registryReadyAssetCount: 0,
      blockerCount: 1,
    });
    expect(result.report?.approvalInput.approvals).toHaveLength(10);
    expect(result.report?.approvedAssets).toHaveLength(10);
    expect(result.report?.approvedAssets.every((asset) =>
      asset.status === 'approved' && asset.finalAssetReady === true,
    )).toBe(true);
    expect(result.report?.blockers).toContainEqual({
      code: 'live_audio_registry_not_written',
      detail: 'Approved final audio still needs a separate guarded live registry preflight before runtime registration.',
    });
    expect(result.report?.requiredNextActions).toContain(
      'Run the guarded live audio registry preflight before any runtime registration.',
    );
  });

  it('blocks approval records when generated MP3 evidence is incomplete', () => {
    const result = buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(missingGeneratedIntake(), {
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'audio-approval-owner',
      reviewerId: 'user-audio-reviewer',
      approvedAt: APPROVED_AT,
      approvalSource: 'user_message: Excellent audios, continue',
    });

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_before_generated_audio_intake_ready');
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      approvalRecordValidCount: 0,
      approvalRecordInvalidCount: 0,
      promotedFinalAudioCount: 0,
      registryReadyAssetCount: 0,
      blockerCount: 1,
    });
    expect(result.report?.audioApprovalReady).toBe(false);
    expect(result.report?.finalAudioPromotionReady).toBe(false);
    expect(result.report?.approvedAssets).toHaveLength(0);
  });

  it('rejects invalid reviewer timestamps instead of manufacturing approval', () => {
    const result = buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(completeGeneratedIntake(), {
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'audio-approval-owner',
      reviewerId: 'user-audio-reviewer',
      approvedAt: '2026-06-04',
      approvalSource: 'user_message: Excellent audios, continue',
    });

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_invalid_approval_records');
    expect(result.report?.summary.approvalRecordInvalidCount).toBe(10);
    expect(result.report?.summary.promotedFinalAudioCount).toBe(0);
    expect(result.report?.audioApprovalReady).toBe(false);
    expect(result.report?.approvalGateEvidence.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_approved_at' }),
      ]),
    );
  });

  it('writes approval records and promotion report only under temp or report roots', () => {
    const recordsPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-audio-explicit-approval-records.test.json',
    );
    const reportPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-final-audio-promotion-report.test.json',
    );

    const result = writeGavanWeek1AudioExplicitApprovalRecordsAndPromotion(completeGeneratedIntake(), {
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'audio-approval-owner',
      reviewerId: 'user-audio-reviewer',
      approvedAt: APPROVED_AT,
      approvalSource: 'user_message: Excellent audios, continue',
      approvalRecordsPath: recordsPath,
      targetPath: reportPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(reportPath);
    expect(result.approvalRecordsPath).toBe(recordsPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(result.approvalRecordsBytesWritten).toBeGreaterThan(1000);
    expect(existsSync(reportPath)).toBe(true);
    expect(existsSync(recordsPath)).toBe(true);
    expect(isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed(reportPath)).toBe(true);
    expect(isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed(recordsPath)).toBe(true);

    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const records = JSON.parse(readFileSync(recordsPath, 'utf8'));
    expect(report.kind).toBe('gavan_week1_audio_explicit_approval_records_and_promotion');
    expect(report.summary.promotedFinalAudioCount).toBe(10);
    expect(records.kind).toBe('plan_audio_approval_input');
    expect(records.approvals).toHaveLength(10);
  });

  it('rejects source audio runtime and root config write targets', () => {
    const badTargets = [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-approval-records.json'),
      path.join(process.cwd(), 'package.json'),
    ];

    for (const targetPath of badTargets) {
      const result = writeGavanWeek1AudioExplicitApprovalRecordsAndPromotion(completeGeneratedIntake(), {
        generatedAt: GENERATED_AT,
        approvalOwnerId: 'audio-approval-owner',
        reviewerId: 'user-audio-reviewer',
        approvedAt: APPROVED_AT,
        approvalSource: 'user_message: Excellent audios, continue',
        approvalRecordsPath: GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_RECORDS_PATH,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio explicit approval records and promotion can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import runtime registries workers storage navigation scoring or UI', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion.ts'),
      'utf8',
    );

    for (const forbidden of [
      'registerPlanAudioAssetsForRuntime',
      'personal_plan_audio_asset_registry',
      'personal_plan_audio_openai_worker',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'react-native',
      'personal_plan_pronunciation',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
