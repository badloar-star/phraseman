import { getPlanAudioAssetsForRuntime } from '../app/personal_plan_audio_asset_registry';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';

describe('personal plan runtime audio registry source write', () => {
  it('loads approved runtime audio assets from source without test-only registration', () => {
    const assets = getPlanAudioAssetsForRuntime();

    expect(assets).toHaveLength(48);
    expect(assets.every((asset) => asset.status === 'approved' && asset.finalAssetReady === true)).toBe(true);

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
