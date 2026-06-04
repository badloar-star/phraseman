import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  approvePlanAudioAssets,
  buildPlanAudioApprovalInput,
  checksumPlanAudioAsset,
  validatePlanAudioApprovalGate,
  validatePlanApprovedAudioAssets,
} from '../app/personal_plan_audio_approval_gate';

const REVIEWER_ID = 'audio-reviewer-1';
const APPROVED_AT = '2026-06-02T12:00:00.000Z';

function generatedAsset(overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: 'audio:gavan:week1:block-1:unit-1',
    blockId: 'gavan-week1-day2:block-2',
    contentUnitIds: ['gavan-w1-d2-p1'],
    targetText: 'Could you repeat that?',
    locale: 'en',
    status: 'generated',
    assetId: 'audio:gavan:week1:block-1:unit-1',
    uri: 'assets/audio/personal-plans/gavan/week1/block-1/unit-1.mp3',
    durationMs: 1420,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: false,
    ...overrides,
  };
}

describe('personal plan audio approval gate', () => {
  it('builds approval records and approves generated audio without changing identity', () => {
    const assets = [
      generatedAsset(),
      generatedAsset({
        id: 'audio:gavan:week1:block-1:unit-2',
        assetId: 'audio:gavan:week1:block-1:unit-2',
        contentUnitIds: ['gavan-w1-d2-p2'],
        targetText: 'Could you say that again?',
        uri: 'assets/audio/personal-plans/gavan/week1/block-1/unit-2.mp3',
      }),
    ];
    const input = buildPlanAudioApprovalInput(assets, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    expect(input.approvals).toHaveLength(2);
    expect(input.approvals[0]).toEqual({
      kind: 'plan_audio_approval_record',
      assetId: assets[0].assetId,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      audioChecksum: checksumPlanAudioAsset(assets[0]),
    });

    const result = approvePlanAudioAssets(assets, input);

    expect(result.valid).toBe(true);
    expect(result.approvedAssets).toEqual([
      expect.objectContaining({
        id: assets[0].id,
        assetId: assets[0].assetId,
        status: 'approved',
        finalAssetReady: true,
      }),
      expect.objectContaining({
        id: assets[1].id,
        assetId: assets[1].assetId,
        status: 'approved',
        finalAssetReady: true,
      }),
    ]);
    expect(result.summary).toEqual({
      assets: 2,
      approved: 2,
      blocked: 0,
    });
  });

  it('fails partial approval and invalid reviewer metadata', () => {
    const assets = [generatedAsset()];
    const input = buildPlanAudioApprovalInput(assets, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = validatePlanAudioApprovalGate(assets, {
      ...input,
      approvals: [
        {
          ...input.approvals[0],
          assetId: 'unknown-audio',
          reviewerId: '',
          approvedAt: 'not-a-date',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_audio_asset', assetId: 'unknown-audio' }),
      expect.objectContaining({ code: 'missing_reviewer_id', assetId: 'unknown-audio' }),
      expect.objectContaining({ code: 'invalid_approved_at', assetId: 'unknown-audio' }),
      expect.objectContaining({ code: 'missing_approval_record', assetId: assets[0].assetId }),
    ]));
  });

  it('fails when generated audio metadata changes after approval', () => {
    const assets = [generatedAsset()];
    const input = buildPlanAudioApprovalInput(assets, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const changedAssets = [generatedAsset({ durationMs: 1600 })];

    const result = validatePlanAudioApprovalGate(changedAssets, input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'audio_checksum_mismatch',
        assetId: assets[0].assetId,
      }),
    ]));
  });

  it('rejects invalid generated assets and tampered approved output', () => {
    const assets = [generatedAsset({ status: 'placeholder', targetText: '' })];
    const input = buildPlanAudioApprovalInput(assets, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    expect(validatePlanAudioApprovalGate(assets, input).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'audio_asset_not_generated',
        assetId: assets[0].assetId,
      }),
      expect.objectContaining({
        code: 'audio_asset_readiness_failed',
        assetId: assets[0].assetId,
      }),
    ]));

    const approved = approvePlanAudioAssets([generatedAsset()], buildPlanAudioApprovalInput([generatedAsset()], {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    })).approvedAssets!;

    expect(validatePlanApprovedAudioAssets([
      { ...approved[0], finalAssetReady: false },
    ]).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'approved_audio_not_final' }),
    ]));
  });
});
