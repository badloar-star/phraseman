import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  checksumPlanAudioAsset,
} from '../app/personal_plan_audio_approval_gate';
import {
  buildPersonalPlanRuntimeAudioApprovalReviewPacket,
} from '../app/personal_plan_runtime_audio_approval_review_packet';

const GENERATED_AT = '2026-06-05T09:45:00.000Z';

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
    durationMs: 1600 + index,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: false,
  };
}

describe('personal plan runtime audio approval review packet', () => {
  it('turns valid generated runtime audio into checksum-bound human review rows', () => {
    const assets = [generatedAsset(1), generatedAsset(2)];
    const packet = buildPersonalPlanRuntimeAudioApprovalReviewPacket({
      generatedAt: GENERATED_AT,
      reviewOwnerId: 'runtime-audio-review',
      generatedAssets: assets,
    });

    expect(packet).toMatchObject({
      kind: 'personal_plan_runtime_audio_approval_review_packet',
      status: 'ready_for_human_audio_review',
      generatedAssetCount: 2,
      reviewRowCount: 2,
      invalidGeneratedAssetCount: 0,
      approvalRecordCount: 0,
      approvalMayBeInferred: false,
      readyForLive: false,
      productionReady: false,
      nextRequiredStep: 'human_listen_and_create_explicit_approval_records',
    });
    expect(packet.rows[0]).toEqual({
      assetId: assets[0].assetId,
      blockId: assets[0].blockId,
      contentUnitIds: assets[0].contentUnitIds,
      targetText: assets[0].targetText,
      uri: assets[0].uri,
      durationMs: assets[0].durationMs,
      voiceId: assets[0].voiceId,
      provider: assets[0].provider,
      audioChecksum: checksumPlanAudioAsset(assets[0]),
      reviewStatus: 'pending_human_review',
      approvalRecordReady: false,
    });
  });

  it('blocks invalid generated assets instead of creating approval-ready rows', () => {
    const packet = buildPersonalPlanRuntimeAudioApprovalReviewPacket({
      generatedAt: GENERATED_AT,
      reviewOwnerId: 'runtime-audio-review',
      generatedAssets: [
        generatedAsset(1),
        {
          ...generatedAsset(2),
          uri: '',
          durationMs: 0,
        },
      ],
    });

    expect(packet.status).toBe('blocked_invalid_generated_audio');
    expect(packet.reviewRowCount).toBe(1);
    expect(packet.invalidGeneratedAssetCount).toBe(1);
    expect(packet.invalidGeneratedAssets[0]).toEqual(expect.objectContaining({
      assetId: 'audio:runtime:2',
      issueCodes: expect.arrayContaining(['missing_audio_uri', 'invalid_audio_duration']),
    }));
    expect(packet.productionReady).toBe(false);
  });
});
