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
  it('builds an in-app streaming playback source for approved audio', () => {
    expect(buildPlanListeningPlaybackSource(item())).toEqual({
      source: 'in_app_audio',
      uri: 'https://cdn.example.test/gavan/d1/p1.mp3',
      playerSource: 'https://cdn.example.test/gavan/d1/p1.mp3',
      options: {
        downloadFirst: false,
        updateInterval: 250,
      },
      audioMode: {
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'duckOthers',
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

  it('falls back to the raw uri for a runtime path NOT in the uploaded map', () => {
    // A runtime path not present in the URL map (e.g. a freshly added clip before
    // the next upload) is no longer bundled (the require() map was neutralized to
    // drop ~126 MB), so the resolver passes the uri through as a string for the
    // player to load directly. We mock an empty URL map to exercise this path
    // regardless of what the real generated map currently contains.
    jest.resetModules();
    jest.doMock('../app/plan_audio_url_map.generated', () => ({
      PLAN_AUDIO_URL_MAP: {},
      getPlanAudioUrl: () => undefined,
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildPlanListeningPlaybackSource: build } =
      require('../app/personal_plan_listening_playback_contract') as typeof import('../app/personal_plan_listening_playback_contract');
    const runtimeUri =
      'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d001-content-unit-phrase-1.mp3';
    const result = build({
      ...item(),
      audioUri: runtimeUri,
    });
    expect(result).toEqual(expect.objectContaining({
      source: 'in_app_audio',
      uri: runtimeUri,
      playerSource: runtimeUri,
      issues: [],
    }));
    jest.resetModules();
    jest.unmock('../app/plan_audio_url_map.generated');
  });
});

describe('personal plan listening playback prefers the server URL once uploaded', () => {
  const RUNTIME_URI =
    'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d001-content-unit-phrase-1.mp3';
  const SERVER_URL =
    'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/plan-audio%2Fgavan%2Fgavan-d001-listen-audio%2Fgavan-d001-content-unit-phrase-1.mp3?alt=media&token=abc';

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('../app/plan_audio_url_map.generated');
  });

  it('returns the Firebase Storage URL (not the bundled assetId) when the uri is in the uploaded map', () => {
    jest.doMock('../app/plan_audio_url_map.generated', () => ({
      PLAN_AUDIO_URL_MAP: { [RUNTIME_URI]: SERVER_URL },
      getPlanAudioUrl: (uri: string) => (uri === RUNTIME_URI ? SERVER_URL : undefined),
    }));
    // Re-require the module under test so it picks up the mocked map.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildPlanListeningPlaybackSource: build } =
      require('../app/personal_plan_listening_playback_contract') as typeof import('../app/personal_plan_listening_playback_contract');

    const result = build({
      ...item(),
      audioUri: RUNTIME_URI,
    });
    expect(result).toEqual(
      expect.objectContaining({
        source: 'in_app_audio',
        uri: RUNTIME_URI,
        playerSource: SERVER_URL,
        issues: [],
      }),
    );
  });
});
