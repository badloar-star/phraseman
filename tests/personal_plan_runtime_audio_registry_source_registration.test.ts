import {
  buildPlanAudioApprovalInput,
} from '../app/personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  buildPersonalPlanRuntimeAudioApprovalIntake,
} from '../app/personal_plan_runtime_audio_approval_intake';
import {
  buildPersonalPlanRuntimeAudioRegistrySourceRegistration,
} from '../app/personal_plan_runtime_audio_registry_source_registration';

const GENERATED_AT = '2026-06-05T09:20:00.000Z';

function generatedAsset(index: number): PlanAudioAsset {
  return {
    id: `audio:runtime:${index}`,
    blockId: `runtime-block-${index}`,
    contentUnitIds: [`runtime-unit-${index}`],
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

describe('personal plan runtime audio registry source registration', () => {
  it('stays blocked while runtime audio approval intake is missing records', () => {
    const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'runtime-audio-owner',
      generatedAssets: [generatedAsset(1)],
      approvalInput: { kind: 'plan_audio_approval_input', approvals: [] },
    });
    const registration = buildPersonalPlanRuntimeAudioRegistrySourceRegistration({
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'runtime-audio-registry',
      approvalIntake: intake,
    });

    expect(registration).toMatchObject({
      kind: 'personal_plan_runtime_audio_registry_source_registration',
      status: 'blocked_before_runtime_audio_approval',
      approvedFinalAssetCount: 0,
      registryCandidateCount: 0,
      sourceWriteAllowed: false,
      runtimeRegistryWriteAllowed: false,
      productionReady: false,
      nextRequiredStep: 'complete_runtime_audio_approval_intake',
    });
  });

  it('maps approved final assets into a guarded registry source plan without writing source', () => {
    const generatedAssets = [generatedAsset(1), generatedAsset(2)];
    const intake = buildPersonalPlanRuntimeAudioApprovalIntake({
      generatedAt: GENERATED_AT,
      approvalOwnerId: 'runtime-audio-owner',
      generatedAssets,
      approvalInput: buildPlanAudioApprovalInput(generatedAssets, {
        reviewerId: 'human-runtime-audio-reviewer',
        approvedAt: GENERATED_AT,
      }),
    });
    const registration = buildPersonalPlanRuntimeAudioRegistrySourceRegistration({
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'runtime-audio-registry',
      approvalIntake: intake,
    });

    expect(registration.status).toBe('ready_for_guarded_runtime_registry_source_write');
    expect(registration.approvedFinalAssetCount).toBe(2);
    expect(registration.registryCandidateCount).toBe(2);
    expect(registration.rows).toHaveLength(2);
    expect(registration.rows.every((row) =>
      row.registryCandidateReady &&
      row.sourceWriteAllowed === false &&
      row.runtimeRegistryWriteAllowed === false
    )).toBe(true);
    expect(registration.productionReady).toBe(false);
    expect(registration.nextRequiredStep).toBe('apply_guarded_runtime_audio_registry_source_write');
  });
});
