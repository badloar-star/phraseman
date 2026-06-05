import {
  buildPlanListeningPlaybackSource,
} from '../app/personal_plan_listening_playback_contract';
import type { PersonalPlanListenBuildItem } from '../app/personal_plan_listen_build_items';
import type { PersonalPlanListenChooseItem } from '../app/personal_plan_listen_choose_items';

function item(overrides: Partial<PersonalPlanListenChooseItem> = {}): PersonalPlanListenChooseItem {
  return {
    id: 'gavan_d1_phrase_1',
    promptRu: 'Я здесь.',
    promptUk: 'Я тут.',
    correctAnswer: "I'm here.",
    options: ["I'm here.", "I'm okay."],
    grammarTags: ['to-be'],
    vocabularyTags: [],
    explanation: {
      id: 'listen_here',
      titleRu: 'Слушаем фразу',
      correctRu: 'Да, смысл совпал.',
      wrongRu: 'Послушай еще раз и выбери смысл всей фразы.',
    },
    audioReady: true,
    audioAssetId: 'approved-gavan-d1-p1',
    audioUri: 'https://cdn.example.test/gavan/d1/p1.mp3',
    ...overrides,
  };
}

function buildItem(overrides: Partial<PersonalPlanListenBuildItem> = {}): PersonalPlanListenBuildItem {
  return {
    id: 'gavan_d1_phrase_1',
    promptRu: 'Я здесь.',
    promptUk: 'Я тут.',
    correctAnswer: "I'm here.",
    targetWords: ["I'm", 'here'],
    wordOptions: ["I'm", 'here', "You're", 'there'],
    options: ["I'm", 'here', "You're", 'there'],
    grammarTags: ['to-be'],
    vocabularyTags: ['place'],
    explanation: {
      id: 'listen_build_here',
      titleRu: 'Слух плюс сборка',
      correctRu: 'Да, собрал то, что прозвучало.',
      wrongRu: 'Послушай еще раз и собери слова в порядке звучания.',
    },
    audioReady: true,
    audioAssetId: 'approved-gavan-d1-p1',
    audioUri: 'https://cdn.example.test/gavan/d1/p1.mp3',
    ...overrides,
  };
}

describe('personal plan listening playback contract', () => {
  it('builds an in-app downloadable playback source for approved audio', () => {
    expect(buildPlanListeningPlaybackSource(item())).toEqual({
      source: 'in_app_audio',
      uri: 'https://cdn.example.test/gavan/d1/p1.mp3',
      playerSource: 'https://cdn.example.test/gavan/d1/p1.mp3',
      options: {
        downloadFirst: true,
        updateInterval: 250,
      },
      audioMode: {
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      },
      issues: [],
    });
  });

  it('blocks playback when approved audio is missing', () => {
    expect(buildPlanListeningPlaybackSource(item({
      audioReady: false,
      audioAssetId: undefined,
      audioUri: undefined,
      blockedReason: 'missing_approved_audio',
    }))).toEqual({
      source: 'blocked',
      issues: ['missing_approved_audio'],
    });
  });

  it('blocks playback when audioReady is true but uri is empty', () => {
    expect(buildPlanListeningPlaybackSource(item({
      audioUri: '   ',
    }))).toEqual({
      source: 'blocked',
      issues: ['missing_audio_uri'],
    });
  });

  it('uses the same strict playback gate for listen-build word-bank items', () => {
    expect(buildPlanListeningPlaybackSource(buildItem())).toEqual(expect.objectContaining({
      source: 'in_app_audio',
      uri: 'https://cdn.example.test/gavan/d1/p1.mp3',
      playerSource: 'https://cdn.example.test/gavan/d1/p1.mp3',
      issues: [],
    }));

    expect(buildPlanListeningPlaybackSource(buildItem({
      audioReady: false,
      audioAssetId: undefined,
      audioUri: undefined,
      blockedReason: 'missing_approved_audio',
    }))).toEqual({
      source: 'blocked',
      issues: ['missing_approved_audio'],
    });

    expect(buildPlanListeningPlaybackSource(buildItem({
      audioUri: '   ',
    }))).toEqual({
      source: 'blocked',
      issues: ['missing_audio_uri'],
    });
  });

  it('resolves bundled personal plan runtime mp3 paths to Expo asset modules', () => {
    expect(buildPlanListeningPlaybackSource(item({
      audioUri: 'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-1.mp3',
    }))).toEqual(expect.objectContaining({
      source: 'in_app_audio',
      uri: 'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-1.mp3',
      playerSource: { assetId: expect.anything() },
      issues: [],
    }));
  });
});
