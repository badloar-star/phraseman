import { readFileSync } from 'fs';
import path from 'path';

import { buildPlanAudioApprovalInput } from '../app/personal_plan_audio_approval_gate';
import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import { buildGavanWeek1AudioGenerationHandoffPacket } from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';
import { buildGavanWeek1GeneratedAudioIntakeReport } from '../tools/personal_plan_gavan_week1_generated_audio_intake_report';
import {
  GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
  buildGavanWeek1AudioExplicitApprovalIntakeReport,
  isGavanWeek1AudioExplicitApprovalIntakeReportTargetAllowed,
  writeGavanWeek1AudioExplicitApprovalIntakeReport,
} from '../tools/personal_plan_gavan_week1_audio_explicit_approval_intake_report';

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

function missingGeneratedIntake() {
  const result = buildGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
    generatedAt: '2026-06-04T00:00:00.000Z',
    intakeOwnerId: 'audio-intake',
  });
  if (!result.report) throw new Error('expected generated audio intake report');
  return result.report;
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

describe('Gavan week 1 audio explicit approval intake report', () => {
  it('maps missing generated files to approval blockers without creating approval readiness', () => {
    const result = buildGavanWeek1AudioExplicitApprovalIntakeReport(missingGeneratedIntake(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_audio_explicit_approval_intake_report',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocked_missing_generated_audio',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalMayBeInferred: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      approvalRecordValidCount: 0,
      approvalRecordInvalidCount: 0,
      missingApprovalRecordCount: 0,
      missingGeneratedFileCount: 10,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows).toHaveLength(10);
    expect(result.report?.rows.every((row: { status: string; approvalStatus: string }) =>
      row.status === 'blocked_missing_generated_file' &&
      row.approvalStatus === 'not_applicable_until_generated',
    )).toBe(true);
  });

  it('blocks complete generated files until every explicit approval record exists', () => {
    const result = buildGavanWeek1AudioExplicitApprovalIntakeReport(completeGeneratedIntake(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
      approvalInput: {
        kind: 'plan_audio_approval_input',
        approvals: [],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_missing_approval_records');
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      validGeneratedFileCount: 10,
      approvalRecordCount: 0,
      approvalRecordValidCount: 0,
      approvalRecordInvalidCount: 0,
      missingApprovalRecordCount: 10,
      missingGeneratedFileCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows.every((row: { status: string; approvalStatus: string }) =>
      row.status === 'blocked_missing_approval_record' &&
      row.approvalStatus === 'missing_approval_record',
    )).toBe(true);
    expect(result.report?.approvalGateEvidence.summary).toEqual({
      assets: 10,
      approved: 0,
      blocked: 10,
    });
  });

  it('accepts complete explicit approval records for review without registering final audio', () => {
    const generatedIntake = completeGeneratedIntake();
    const approvalInput = buildPlanAudioApprovalInput(
      generatedIntake.generatedAssetsEvidence.assets,
      {
        reviewerId: 'audio-reviewer',
        approvedAt: '2026-06-04T00:00:00.000Z',
      },
    );
    const result = buildGavanWeek1AudioExplicitApprovalIntakeReport(generatedIntake, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
      approvalInput,
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      status: 'ready_for_final_audio_approval_gate_review',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: true,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      validGeneratedFileCount: 10,
      approvalRecordCount: 10,
      approvalRecordValidCount: 10,
      approvalRecordInvalidCount: 0,
      missingApprovalRecordCount: 0,
      missingGeneratedFileCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows.every((row: { status: string; approvalStatus: string }) =>
      row.status === 'approval_record_valid' &&
      row.approvalStatus === 'explicit_record_valid',
    )).toBe(true);
  });

  it('rejects unknown approval records instead of inferring readiness', () => {
    const result = buildGavanWeek1AudioExplicitApprovalIntakeReport(completeGeneratedIntake(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
      approvalInput: {
        kind: 'plan_audio_approval_input',
        approvals: [{
          kind: 'plan_audio_approval_record',
          assetId: 'unknown-audio-asset',
          reviewerId: 'audio-reviewer',
          approvedAt: '2026-06-04T00:00:00.000Z',
          audioChecksum: 'fnv1a:00000000',
        }],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_invalid_approval_records');
    expect(result.report?.approvalGateEvidence.issues).toContainEqual({
      code: 'unknown_audio_asset',
      assetId: 'unknown-audio-asset',
      detail: 'Audio approval record references an asset that is not in the generated asset set.',
    });
    expect(result.report?.summary.productionReadyAudioCount).toBe(0);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-audio-explicit-approval-intake-report.test.json',
    );

    const result = writeGavanWeek1AudioExplicitApprovalIntakeReport(missingGeneratedIntake(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(isGavanWeek1AudioExplicitApprovalIntakeReportTargetAllowed(targetPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_audio_explicit_approval_intake_report');
    expect(parsed.summary.missingGeneratedFileCount).toBe(10);
  });

  it('rejects source audio and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1.mp3'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioExplicitApprovalIntakeReport(missingGeneratedIntake(), {
        generatedAt: '2026-06-04T00:00:00.000Z',
        approvalOwnerId: 'audio-approval-owner',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio explicit approval intake report can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import generation workers runtime scoring storage navigation or live registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_explicit_approval_intake_report.ts'),
      'utf8',
    );

    for (const forbidden of [
      'child_process',
      'ffprobe',
      'openai',
      'expo-av',
      'expo-audio',
      'react-native',
      'AsyncStorage',
      'navigation',
      'personal_plan_audio_openai_worker',
      'personal_plan_audio_asset_runtime_registry',
      'personal_plan_exercise.tsx',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical report path', () => {
    expect(GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-audio-explicit-approval-intake-report.json',
    ));
  });
});
