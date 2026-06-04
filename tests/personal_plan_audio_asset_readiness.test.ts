import {
  buildPlaceholderPlanAudioAsset,
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from '../app/personal_plan_audio_asset_readiness';

function approvedAsset(overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: 'audio:gavan:d2:b2',
    blockId: 'gavan-week1-day2:block-2',
    contentUnitIds: ['gavan-w1-d2-p1'],
    targetText: 'Could you repeat that?',
    locale: 'en',
    status: 'approved',
    assetId: 'openai-audio-001',
    uri: 'assets/audio/personal-plans/gavan/d2/repeat-that.mp3',
    durationMs: 1800,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: true,
    ...overrides,
  };
}

describe('personal plan audio asset readiness', () => {
  it('allows placeholder audio for authoring but keeps it out of production-ready state', () => {
    const asset = buildPlaceholderPlanAudioAsset({
      blockId: 'gavan-week1-day2:block-2',
      contentUnitIds: ['gavan-w1-d2-p1'],
      targetText: 'Could you repeat that?',
    });
    const result = validatePlanAudioAsset(asset);

    expect(result.validForAuthoring).toBe(true);
    expect(result.productionReady).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('marks approved audio as production-ready only with id text duration voice provider and uri', () => {
    const result = validatePlanAudioAsset(approvedAsset());

    expect(result.validForAuthoring).toBe(true);
    expect(result.productionReady).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails approved audio without required final asset metadata', () => {
    const result = validatePlanAudioAsset(approvedAsset({
      assetId: '',
      uri: '',
      durationMs: 0,
      voiceId: '',
      provider: 'unknown',
      finalAssetReady: false,
    }));

    expect(result.productionReady).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_audio_asset_id' }),
      expect.objectContaining({ code: 'missing_audio_uri' }),
      expect.objectContaining({ code: 'invalid_audio_duration' }),
      expect.objectContaining({ code: 'missing_audio_voice' }),
      expect.objectContaining({ code: 'missing_audio_provider' }),
      expect.objectContaining({ code: 'approved_audio_not_marked_final' }),
    ]));
  });

  it('fails fake final claims on placeholder or generated audio', () => {
    const placeholder = buildPlaceholderPlanAudioAsset({
      blockId: 'gavan-week1-day2:block-2',
      contentUnitIds: ['gavan-w1-d2-p1'],
      targetText: 'Could you repeat that?',
    });

    expect(validatePlanAudioAsset({
      ...placeholder,
      finalAssetReady: true,
    }).issues).toContainEqual(expect.objectContaining({
      code: 'fake_final_audio_claim',
    }));

    expect(validatePlanAudioAsset(approvedAsset({
      status: 'generated',
      finalAssetReady: true,
    })).issues).toContainEqual(expect.objectContaining({
      code: 'fake_final_audio_claim',
    }));
  });

  it('fails audio assets without target text or content units', () => {
    const result = validatePlanAudioAsset(approvedAsset({
      targetText: '',
      contentUnitIds: [],
    }));

    expect(result.validForAuthoring).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_audio_text' }),
      expect.objectContaining({ code: 'missing_audio_content_units' }),
    ]));
  });
});
