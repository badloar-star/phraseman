import { getPlanAudioAssetsForRuntime } from '../app/personal_plan_audio_asset_registry';
import { validatePlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import { buildPlanListeningPlaybackSource } from '../app/personal_plan_listening_playback_contract';
import { getPlanAudioUrl } from '../app/plan_audio_url_map.generated';

describe('personal plan runtime audio registry source write', () => {
  it('loads runtime audio assets from source without test-only registration', () => {
    const assets = getPlanAudioAssetsForRuntime();

    // Every runtime listen-audio asset maps to EXACTLY ONE content unit (1 mp3 = 1
    // phrase). The previous registry packed many days onto a single mp3 via a
    // bloated contentUnitIds list, which made the "На слух" exercise play the wrong
    // sentence on ~98% of days. Guard against that regression returning.
    expect(assets.length).toBeGreaterThan(2000);
    expect(assets.every((asset) => validatePlanAudioAsset(asset).validForAuthoring)).toBe(true);
    expect(assets.filter((asset) => validatePlanAudioAsset(asset).productionReady).length).toBeGreaterThan(2000);
    expect(assets.every((asset) => asset.contentUnitIds.length === 1)).toBe(true);
    const contentUnitIds = assets.map((asset) => asset.contentUnitIds[0]);
    expect(new Set(contentUnitIds).size).toBe(contentUnitIds.length);

    const asset = assets[0];
    expect(getPlanAudioUrl(asset.uri!)).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\//);

    expect(buildPlanListeningPlaybackSource({
      id: asset.contentUnitIds[0],
      promptRu: '',
      promptUk: '',
      correctAnswer: asset.targetText,
      options: [asset.targetText],
      grammarTags: [],
      vocabularyTags: [],
      explanation: {} as never,
      audioReady: true,
      audioAssetId: asset.assetId,
      audioUri: asset.uri,
    })).toEqual(expect.objectContaining({
      source: 'in_app_audio',
      playerSource: getPlanAudioUrl(asset.uri!),
    }));
  });
});
