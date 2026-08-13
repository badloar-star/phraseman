import { getPlanAudioAssetsForRuntime } from '../app/personal_plan_audio_asset_registry';
import { validatePlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';

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

    const [item] = getPersonalPlanListenChooseItems({
      lessonId: 'voyazh_d001_content_unit',
      contentUnitIds: ['voyazh_d001_content_unit_phrase_1'],
    });

    expect(item).toEqual(expect.objectContaining({
      audioReady: true,
      blockedReason: undefined,
      audioUri: expect.stringContaining('assets/audio/personal-plans-runtime/'),
    }));
  });
});
