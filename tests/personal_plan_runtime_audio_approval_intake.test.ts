import {
  buildPlanAudioApprovalInput,
  type PlanAudioApprovalInput,
} from '../app/personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  buildPersonalPlanRuntimeAudioApprovalIntake,
} from '../app/personal_plan_runtime_audio_approval_intake';

const GENERATED_AT = '2026-06-05T09:00:00.000Z';

function generatedAsset(index: number): PlanAudioAsset {
  return {
    id: `audio:runtime:${index}`,
    blockId: `runtime-block-${index}`,
    contentUnitIds: [`runtime-unit-${index}`, `runtime-unit-repeat-${index}`],
    targetText: `Runtime phrase ${index}`,
    locale: 'en',
    status: 'generated',
    assetId: `audio:runtime:${index}`,
    uri: `assets/audio/personal-plans-runtime/runtime-${index}.mp3`,
    durationMs: 1500 + index,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: false,
  };
}

describe('personal plan runtime audio approval intake', () => {
  it('blocks generated runtime audio until explicit approval records exist', () => {
    const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'runtime-audio-owner',
      generatedAssets: [generatedAsset(1), generatedAsset(2)],
      approvalInput: {
        kind: 'plan_audio_approval_input',
        approvals: [],
      },
    });

    expect(intake).toMatchObject({
      kind: 'personal_plan_runtime_audio_approval_intake',
      status: 'blocked_missing_approval_records',
      generatedAssetCount: 2,
      approvedFinalAssetCount: 0,
      missingApprovalRecordCount: 2,
      approvalRecordCount: 0,
      approvalMayBeInferred: false,
      readyForLive: false,
      productionReady: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'collect_explicit_runtime_audio_approval_records',
    });
    expect(intake.approvedAssets).toEqual([]);
  });

  it('promotes runtime generated audio only when approval checksums match', () => {
    const generatedAssets = [generatedAsset(1), generatedAsset(2)];
    const approvalInput = buildPlanAudioApprovalInput(generatedAssets, {
      reviewerId: 'human-runtime-audio-reviewer',
      approvedAt: GENERATED_AT,
    });
    const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'runtime-audio-owner',
      generatedAssets,
      approvalInput,
    });

    expect(intake.status).toBe('ready_for_guarded_runtime_audio_registry');
    expect(intake.generatedAssetCount).toBe(2);
    expect(intake.approvedFinalAssetCount).toBe(2);
    expect(intake.missingApprovalRecordCount).toBe(0);
    expect(intake.invalidApprovalRecordCount).toBe(0);
    expect(intake.approvedAssets).toEqual([
      expect.objectContaining({ status: 'approved', finalAssetReady: true }),
      expect.objectContaining({ status: 'approved', finalAssetReady: true }),
    ]);
    expect(intake.readyForLive).toBe(false);
    expect(intake.productionReady).toBe(false);
    expect(intake.nextRequiredStep).toBe('guarded_runtime_audio_registry_source_registration');
  });

  it('keeps checksum drift blocked instead of registering stale audio', () => {
    const generatedAssets = [generatedAsset(1)];
    const approvalInput: PlanAudioApprovalInput = buildPlanAudioApprovalInput(generatedAssets, {
      reviewerId: 'human-runtime-audio-reviewer',
      approvedAt: GENERATED_AT,
    });
    const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'runtime-audio-owner',
      generatedAssets: [{ ...generatedAssets[0], durationMs: 1900 }],
      approvalInput,
    });

    expect(intake.status).toBe('blocked_invalid_approval_records');
    expect(intake.invalidApprovalRecordCount).toBeGreaterThan(0);
    expect(intake.approvedAssets).toEqual([]);
    expect(intake.productionReady).toBe(false);
  });
});
