import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import { buildGavanWeek1AudioGenerationHandoffPacket } from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';
import { buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion } from '../tools/personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion';
import { buildGavanWeek1GeneratedAudioIntakeReport } from '../tools/personal_plan_gavan_week1_generated_audio_intake_report';
import {
  GAVAN_WEEK1_LIVE_AUDIO_REGISTRY_SOURCE_PREFLIGHT_PATH,
  buildGavanWeek1LiveAudioRegistrySourcePreflight,
  isGavanWeek1LiveAudioRegistrySourcePreflightTargetAllowed,
  writeGavanWeek1LiveAudioRegistrySourcePreflight,
} from '../tools/personal_plan_gavan_week1_live_audio_registry_source_preflight';

const GENERATED_AT = '2026-06-04T23:50:00.000Z';

function completePromotionReport() {
  const plan = buildGavanWeek1AudioGenerationPlan({
    voiceId: 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
  const handoffResult = buildGavanWeek1AudioGenerationHandoffPacket(plan, {
    generatedAt: '2026-06-04T00:00:00.000Z',
    ownerId: 'audio-producer',
  });
  if (!handoffResult.packet) throw new Error('expected handoff packet');

  const generatedFilesByOutputPath = Object.fromEntries(
    handoffResult.packet.generationRequests.map((request, index) => [
      request.outputPath,
      {
        uri: request.outputPath,
        durationMs: 1200 + index,
        bytes: 4096 + index,
      },
    ]),
  );
  const intakeResult = buildGavanWeek1GeneratedAudioIntakeReport(
    handoffResult.packet,
    generatedFilesByOutputPath,
    {
      generatedAt: '2026-06-04T00:00:00.000Z',
      intakeOwnerId: 'audio-intake',
    },
  );
  if (!intakeResult.report) throw new Error('expected intake report');

  const promotionResult = buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(
    intakeResult.report,
    {
      generatedAt: '2026-06-04T23:40:00.000Z',
      approvalOwnerId: 'audio-approval-owner',
      reviewerId: 'user-audio-reviewer',
      approvedAt: '2026-06-04T23:39:00.000Z',
      approvalSource: 'user_message: Excellent audios, continue',
    },
  );
  if (!promotionResult.report) throw new Error('expected promotion report');
  return promotionResult.report;
}

function blockedPromotionReport() {
  const report = completePromotionReport();
  return {
    ...report,
    status: 'blocked_invalid_final_audio_promotion' as const,
    audioApprovalReady: false,
    finalAudioPromotionReady: false,
    approvedAssets: [],
    summary: {
      ...report.summary,
      promotedFinalAudioCount: 0,
    },
  };
}

describe('Gavan week 1 live audio registry source preflight', () => {
  it('maps approved final audio into a guarded source-registration plan without writing runtime registry', () => {
    const result = buildGavanWeek1LiveAudioRegistrySourcePreflight(completePromotionReport(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'audio-registry-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_live_audio_registry_source_preflight',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourcePromotionStatus: 'ready_for_guarded_live_audio_registry_preflight',
      status: 'ready_for_source_registration_implementation',
      readyForLive: false,
      audioProductionReady: false,
      audioAssetRegistrationAllowed: false,
      runtimeRegistryWriteAllowed: false,
      sourceWritesUsed: false,
      registryWritesUsed: false,
      liveEditsAllowed: false,
      pronunciationReadinessMayBeInferred: false,
      sourceRegistrationPlanReady: true,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      approvedFinalAudioCount: 10,
      registryCandidateAssetCount: 10,
      blockedAssetCount: 0,
      sourceRegistrationTargetCount: 1,
      blockerCount: 1,
    });
    expect(result.report?.rows).toHaveLength(10);
    expect(result.report?.rows.every((row) =>
      row.registryCandidateReady === true &&
      row.runtimeRegistryWriteAllowed === false &&
      row.registrationStatus === 'ready_for_source_registration_implementation',
    )).toBe(true);
    expect(result.report?.plannedSourceTargets).toEqual([
      'app/personal_plan_audio_asset_registry.ts',
    ]);
    expect(result.report?.blockers).toContainEqual({
      code: 'source_registry_not_written',
      detail: 'Approved final audio still needs a separate source-registration implementation pass before runtime registry writes.',
    });
  });

  it('blocks when final audio promotion is not ready', () => {
    const result = buildGavanWeek1LiveAudioRegistrySourcePreflight(blockedPromotionReport(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'audio-registry-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_before_final_audio_promotion_ready');
    expect(result.report?.sourceRegistrationPlanReady).toBe(false);
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      approvedFinalAudioCount: 0,
      registryCandidateAssetCount: 0,
      blockedAssetCount: 10,
      sourceRegistrationTargetCount: 1,
      blockerCount: 1,
    });
    expect(result.report?.rows.every((row) =>
      row.registrationStatus === 'blocked_before_final_audio_promotion_ready',
    )).toBe(true);
  });

  it('rejects promotion reports that already claim live or registry readiness', () => {
    const unsafePromotion = {
      ...completePromotionReport(),
      readyForLive: true,
      audioAssetRegistrationAllowed: true,
    };

    const result = buildGavanWeek1LiveAudioRegistrySourcePreflight(unsafePromotion as ReturnType<typeof completePromotionReport>, {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'audio-registry-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      {
        code: 'promotion_report_has_live_claim',
        detail: 'Live audio registry preflight cannot consume promotion reports that already claim live, registry, or source-write readiness.',
      },
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-live-audio-registry-source-preflight.test.json',
    );

    const result = writeGavanWeek1LiveAudioRegistrySourcePreflight(completePromotionReport(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'audio-registry-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(existsSync(targetPath)).toBe(true);
    expect(isGavanWeek1LiveAudioRegistrySourcePreflightTargetAllowed(targetPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_live_audio_registry_source_preflight');
    expect(parsed.summary.registryCandidateAssetCount).toBe(10);
  });

  it('rejects runtime source audio asset and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_asset_registry.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-live-registry.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1LiveAudioRegistrySourcePreflight(completePromotionReport(), {
        generatedAt: GENERATED_AT,
        registrationOwnerId: 'audio-registry-owner',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Live audio registry source preflight can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import runtime registries workers storage navigation scoring or UI', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_live_audio_registry_source_preflight.ts'),
      'utf8',
    );

    for (const forbidden of [
      'registerPlanAudioAssetsForRuntime',
      'getPlanAudioAssetsForRuntime',
      "from '../app/personal_plan_audio_asset_registry'",
      'from "./personal_plan_audio_asset_registry"',
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
