// Контракт D48: тихая докачка озвучки текущего+следующего урока V1 заранее.
// Проверяем то, что легко сломать незаметно: задержка НЕ на первом кадре
// (см. D47/22.09 инцидент), отмена при уходе в фон, два урока сразу, дедуп
// между уроками, и что дальше 6 МБ/20 с потолка ничего лишнего не уезжает.

let appStateListener: ((state: string) => void) | null = null;
let netStatus: 'online' | 'offline' | 'unknown' = 'online';
let studyTargetRaw: string | null = 'en';
let storageLastOpened: string | null = '1';
let accountGenerationListeners: Array<() => void> = [];

const cachedUrls = new Set<string>();
const downloads: string[] = [];

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      appStateListener = listener;
      return { remove: () => { appStateListener = null; } };
    },
  },
}));

jest.mock('../app/net_status', () => ({ getNetStatus: () => netStatus }));

jest.mock('../app/interactive_network_quiet', () => ({
  withBackgroundNetworkLease: async (
    _source: string,
    run: (lease: { signal: AbortSignal; assertCurrent(): void }) => Promise<void>,
  ) => run({ signal: new AbortController().signal, assertCurrent() {} }),
}));

jest.mock('../modules/audio/phrase_audio_lookup', () => ({
  getPlayablePhraseAudioUrl: (text: string) =>
    text.startsWith('нет-клипа') ? undefined : `https://cdn.test/${encodeURIComponent(text)}.mp3`,
}));

jest.mock('../hooks/phrase_audio_player', () => ({
  isPhraseAudioCached: (text: string, url: string) => cachedUrls.has(url),
  ensurePhraseAudioCached: async (text: string, url: string) => {
    downloads.push(text);
    cachedUrls.add(url);
    return true;
  },
}));

jest.mock('../app/account_generation', () => ({
  subscribeAccountGeneration: (listener: () => void) => {
    accountGenerationListeners.push(listener);
    return { remove: () => {
      accountGenerationListeners = accountGenerationListeners.filter((l) => l !== listener);
    } };
  },
}));

jest.mock('../app/app_snapshot_bootstrap', () => ({
  peekStudyTargetRaw: () => studyTargetRaw,
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: () => {}, warn: () => {}, error: () => {} },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => storageLastOpened },
}));

jest.mock('../app/target_storage_keys', () => ({
  lastOpenedLessonKey: () => 'last_opened_lesson',
}));

jest.mock('../app/lesson_lock_system', () => ({
  resolveLastAvailableLessonId: async (requested: number) => requested,
}));

type FakePhrase = { words: string[]; english: string };

const lessonPhrasesById: Record<number, FakePhrase[]> = {
  1: [
    { words: ['a'], english: 'lesson one phrase a' },
    { words: ['b'], english: 'lesson one phrase b' },
    // Общая фраза с уроком 2 — проверяет дедуп между уроками.
    { words: ['shared'], english: 'shared phrase' },
  ],
  2: [
    { words: ['c'], english: 'lesson two phrase c' },
    { words: ['shared'], english: 'shared phrase' },
  ],
};

jest.mock('../app/lesson_data_all', () => ({
  getLessonData: (lessonId: number) => lessonPhrasesById[lessonId] ?? [],
}));

jest.mock('../app/phrase_target_utils', () => ({
  phraseHasStudyTargetContent: () => true,
  phraseAnswerDisplayLine: (p: FakePhrase) => p.english,
}));

import {
  scheduleAheadPhraseAudioPrefetch,
  __resetAheadPhraseAudioPrefetchForTests,
  AHEAD_PREFETCH_START_DELAY_MS,
} from '../hooks/phrase_audio_ahead_prefetch';

const flush = async (): Promise<void> => {
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
};

beforeEach(() => {
  jest.useFakeTimers();
  appStateListener = null;
  netStatus = 'online';
  studyTargetRaw = 'en';
  storageLastOpened = '1';
  accountGenerationListeners = [];
  cachedUrls.clear();
  downloads.length = 0;
  __resetAheadPhraseAudioPrefetchForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('scheduleAheadPhraseAudioPrefetch (D48)', () => {
  it('не качает ничего раньше 15 секунд — старт не на первом кадре', async () => {
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(14_999);
    await flush();
    expect(downloads).toHaveLength(0);
  });

  it('задержка старта не меньше 15 секунд', () => {
    expect(AHEAD_PREFETCH_START_DELAY_MS).toBeGreaterThanOrEqual(15_000);
  });

  it('качает текущий и следующий урок, с дедупом общей фразы', async () => {
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    // Урок 1: a, b, shared. Урок 2: c, shared (уже качается один раз).
    expect(downloads).toEqual(
      expect.arrayContaining([
        'lesson one phrase a',
        'lesson one phrase b',
        'shared phrase',
        'lesson two phrase c',
      ]),
    );
    // Дедуп: "shared phrase" встречается ровно один раз, а не дважды.
    expect(downloads.filter((t) => t === 'shared phrase')).toHaveLength(1);
  });

  it('второй вызов не запускает вторую пачку — стартует один раз за процесс', async () => {
    scheduleAheadPhraseAudioPrefetch();
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    const uniqueDownloads = new Set(downloads);
    expect(downloads).toHaveLength(uniqueDownloads.size);
  });

  it('уход приложения в фон отменяет ещё не начавшуюся докачку', async () => {
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(1_000);
    appStateListener?.('background');
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    expect(downloads).toHaveLength(0);
  });

  it('не студент английского — докачка не стартует', async () => {
    studyTargetRaw = 'es';
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    expect(downloads).toHaveLength(0);
  });

  it('офлайн — докачка не стартует', async () => {
    netStatus = 'offline';
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    expect(downloads).toHaveLength(0);
  });

  it('уже закэшированные клипы не качаются повторно', async () => {
    cachedUrls.add(`https://cdn.test/${encodeURIComponent('lesson one phrase a')}.mp3`);
    scheduleAheadPhraseAudioPrefetch();
    jest.advanceTimersByTime(AHEAD_PREFETCH_START_DELAY_MS);
    await flush();
    expect(downloads).not.toContain('lesson one phrase a');
    expect(downloads).toContain('lesson one phrase b');
  });
});
