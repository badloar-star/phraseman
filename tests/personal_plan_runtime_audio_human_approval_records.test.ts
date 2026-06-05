import { checksumPlanAudioAsset } from '../app/personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  buildPersonalPlanRuntimeAudioHumanApprovalRecords,
} from '../app/personal_plan_runtime_audio_human_approval_records';

const APPROVED_AT = '2026-06-05T12:00:00.000Z';

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
    durationMs: 1400 + index,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: false,
  };
}

describe('personal plan runtime audio human approval records', () => {
  it('creates explicit checksum-bound approval records for every generated asset', () => {
    const generatedAssets = [generatedAsset(1), generatedAsset(2)];
    const records = buildPersonalPlanRuntimeAudioHumanApprovalRecords({
      approvedAt: APPROVED_AT,
      reviewerId: 'user-audio-review-2026-06-05',
      generatedAssets,
    });

    expect(records).toMatchObject({
      kind: 'personal_plan_runtime_audio_human_approval_records',
      reviewerDecision: 'approve_all_runtime_audio_assets',
      sourceEvidence: 'user_confirmed_audio_clear_in_chat',
      generatedAssetCount: 2,
      approvalRecordCount: 2,
      productionReady: false,
      nextRequiredStep: 'runtime_audio_approval_intake',
    });
    expect(records.approvalInput.approvals).toEqual([
      {
        kind: 'plan_audio_approval_record',
        assetId: 'audio:runtime:1',
        reviewerId: 'user-audio-review-2026-06-05',
        approvedAt: APPROVED_AT,
        audioChecksum: checksumPlanAudioAsset(generatedAssets[0]),
      },
      {
        kind: 'plan_audio_approval_record',
        assetId: 'audio:runtime:2',
        reviewerId: 'user-audio-review-2026-06-05',
        approvedAt: APPROVED_AT,
        audioChecksum: checksumPlanAudioAsset(generatedAssets[1]),
      },
    ]);
  });
});
