import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  clearPlanAudioAssetsForRuntime,
  registerPlanAudioAssetsForRuntime,
} from '../app/personal_plan_audio_asset_registry';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';

function approvedAsset(overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: 'audio:gavan:week1:gavan-week1-day2-block-2:gavan-week1-day2-phrase-1',
    blockId: 'gavan-week1-day2:block-2',
    contentUnitIds: ['gavan-week1-day2:phrase-1'],
    targetText: 'Could you say that again?',
    locale: 'en',
    status: 'approved',
    assetId: 'audio:gavan:week1:gavan-week1-day2-block-2:gavan-week1-day2-phrase-1',
    uri: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-block-2/gavan-week1-day2-phrase-1.mp3',
    durationMs: 1500,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: true,
    ...overrides,
  };
}

describe('personal plan runtime audio asset registry', () => {
  afterEach(() => {
    clearPlanAudioAssetsForRuntime();
  });

  it('feeds approved canonical audio into listen choose and listen build without mode-specific test hooks', () => {
    registerPlanAudioAssetsForRuntime([approvedAsset()]);

    const [chooseItem] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });
    const [buildItem] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(chooseItem).toEqual(expect.objectContaining({
      audioReady: true,
      audioAssetId: 'audio:gavan:week1:gavan-week1-day2-block-2:gavan-week1-day2-phrase-1',
      audioUri: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-block-2/gavan-week1-day2-phrase-1.mp3',
      correctAnswer: 'Could you say that again?',
    }));
    expect(buildItem).toEqual(expect.objectContaining({
      audioReady: true,
      audioAssetId: 'audio:gavan:week1:gavan-week1-day2-block-2:gavan-week1-day2-phrase-1',
      audioUri: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-block-2/gavan-week1-day2-phrase-1.mp3',
      targetWords: ['Could', 'you', 'say', 'that', 'again'],
    }));
  });

  it('keeps generated runtime audio blocked until an approval gate promotes it', () => {
    registerPlanAudioAssetsForRuntime([
      approvedAsset({
        status: 'generated',
        finalAssetReady: false,
      }),
    ]);

    const [chooseItem] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(chooseItem.audioReady).toBe(false);
    expect(chooseItem.audioUri).toBeUndefined();
    expect(chooseItem.blockedReason).toBe('missing_approved_audio');
  });

  it('blocks approved audio whose spoken target no longer matches the current phrase', () => {
    registerPlanAudioAssetsForRuntime([
      approvedAsset({ targetText: 'This sentence belonged to an older lesson version.' }),
    ]);

    const [chooseItem] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });
    const [buildItem] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(chooseItem).toEqual(expect.objectContaining({
      audioReady: false,
      audioUri: undefined,
      blockedReason: 'missing_approved_audio',
    }));
    expect(buildItem).toEqual(expect.objectContaining({
      audioReady: false,
      audioUri: undefined,
      blockedReason: 'missing_approved_audio',
    }));
  });
});
