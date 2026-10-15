// D192 (владелец 14.10): хранилище «историй» — флаг выкл = ничего не пишем, повтор не копится, аккаунты не смешиваются,
// просмотр гасит кольцо, Firestore не трогается (в модуле нет ни одного сетевого импорта — проверяется моками ниже).
import {
  __resetStoryEventsForTests,
  getUnseenStories,
  markSeen,
  peekStoryEventsSnapshot,
  primeStoryEvents,
  recordStoryEvent,
  setDevStoriesFlag,
  setDevStoriesSeed,
} from '../modules/story_events/story_events_store';
import * as fs from 'fs';
import * as path from 'path';
import { markSpireWeekStoryShown, recordAchievementStories, recordSpireWeekStory, recordStreakMilestoneStory } from '../modules/story_events/story_event_sources';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

let mockStore: Record<string, string> = {};
let mockFlagOn = true;
let mockWarns: string[] = [];

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => { mockStore[key] = value; },
    removeItem: async (key: string) => { delete mockStore[key]; },
    getItem: async (key: string) => (key in mockStore ? mockStore[key] : null),
  },
}));
jest.mock('../app/remote_config_client', () => ({
  readRemoteConfigCacheRaw: async () => JSON.stringify({ bools: { stories_v1: mockFlagOn } }),
}));
// зачем: предупреждения модуля копятся — при падении тест печатает настоящую причину, а не голое storage_failed.
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: (_c: string, m: string) => { mockWarns.push(m); }, error: jest.fn() } }));
jest.mock('../app/events', () => ({ onAppEvent: () => ({ remove: () => undefined }), emitAppEvent: () => undefined }));

describe('story_events_store', () => {
  beforeEach(() => {
    mockStore = {};
    mockFlagOn = true;
    mockWarns = [];
    __resetStoryEventsForTests();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
  });

  // координатор 15.10 (R21): к запуску 17.10 у людей уже должны быть истории — пишем и при выключенном флаге,
  // но только локально и без показа; кольцо появляется, когда флаг включат.
  it('records locally while the stories_v1 flag is off, shows nothing, and the ring lights once the flag is on', async () => {
    mockFlagOn = false;
    await expect(recordStoryEvent('coin_rank_up', { toRank: 2 })).resolves.toMatchObject({ recorded: true });
    expect(Object.keys(mockStore)).toEqual(['story_events_v1:stable-a']);
    await primeStoryEvents('test');
    expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: false, unseenCount: 0 });

    // следующий запуск: флаг уже включён — запись из «выключенного» времени видна и горит
    __resetStoryEventsForTests();
    mockFlagOn = true;
    await primeStoryEvents('test');
    expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: true, unseenCount: 1 });
  });

  it('records a fact once, persists it locally and shows it as unseen', async () => {
    const first = await recordStoryEvent('coin_rank_up', { toRank: 2 });
    expect(mockWarns).toEqual([]);
    expect(first).toEqual({ recorded: true, id: 'coin_rank_up:2' });
    await expect(recordStoryEvent('coin_rank_up', { toRank: 2 })).resolves.toEqual({ recorded: false, reason: 'duplicate' });
    expect(Object.keys(mockStore)).toEqual(['story_events_v1:stable-a']);
    expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: true, owner: 'stable-a', unseenCount: 1 });
    await expect(getUnseenStories()).resolves.toHaveLength(1);
  });

  it('keeps parallel records instead of losing one', async () => {
    recordAchievementStories(['a1', 'a2', 'a3']);
    await recordStoryEvent('coin_rank_up', { toRank: 5 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(peekStoryEventsSnapshot().unseenCount).toBe(4);
    expect(JSON.parse(mockStore['story_events_v1:stable-a']!).events).toHaveLength(4);
  });

  it('просмотр гасит кольцо в том же кадре (до записи на диск), а диск догоняет (аудит Optimistic UI 15.10)', async () => {
    await recordStoryEvent('achievement', { achievementId: 'a2' });
    const pending = markSeen('achievement:a2');
    expect(peekStoryEventsSnapshot().unseenCount).toBe(0);
    await expect(pending).resolves.toBe(true);
    expect(JSON.parse(mockStore['story_events_v1:stable-a']!).events[0].seen).toBe(true);
  });

  it('marks a story seen: the ring goes out and stays out after reload', async () => {
    await recordStoryEvent('achievement', { achievementId: 'a1' });
    await expect(markSeen('achievement:a1')).resolves.toBe(true);
    expect(peekStoryEventsSnapshot().unseenCount).toBe(0);
    __resetStoryEventsForTests();
    await primeStoryEvents('reload');
    expect(peekStoryEventsSnapshot()).toMatchObject({ unseenCount: 0 });
    expect(peekStoryEventsSnapshot().stories).toHaveLength(1);
  });

  it('never shows one account the stories of another', async () => {
    await recordStoryEvent('achievement', { achievementId: 'a1' });
    beginAccountGeneration('stable-b');
    await primeStoryEvents('switch');
    expect(peekStoryEventsSnapshot()).toMatchObject({ owner: 'stable-b', unseenCount: 0 });
    await expect(getUnseenStories()).resolves.toHaveLength(0);
  });

  // координатор 14.10 (D191+D192): окно итога недели показано → кольцо на этот итог не горит, история остаётся в недавних.
  const WEEK = { weekId: '2026-W41', lang: 'en', promoted: true, demoted: false, prevTier: 2, newTier: 3, roomRank: 4, roomTotal: 30 };

  it('a week result already shown in the D191 window lands as seen, whichever comes first', async () => {
    await markSpireWeekStoryShown(WEEK);
    await recordSpireWeekStory(WEEK);
    expect(peekStoryEventsSnapshot()).toMatchObject({ unseenCount: 0 });
    expect(peekStoryEventsSnapshot().stories).toHaveLength(1);

    beginAccountGeneration('stable-c');
    await recordSpireWeekStory(WEEK);
    expect(peekStoryEventsSnapshot()).toMatchObject({ owner: 'stable-c', unseenCount: 1 });
    await markSpireWeekStoryShown(WEEK);
    expect(peekStoryEventsSnapshot()).toMatchObject({ unseenCount: 0 });
    expect(peekStoryEventsSnapshot().stories[0]).toMatchObject({ id: 'spire_week:2026-W41:en', seen: true });
  });

  it('records only real streak milestones', async () => {
    expect(recordStreakMilestoneStory(8, '2026-10-14')).toBeUndefined();
    await expect(recordStreakMilestoneStory(7, '2026-10-14')).resolves.toEqual({ recorded: true, id: 'streak_milestone:7:2026-10-14' });
  });

  it('старт при stories_v1 вкл: ноль Firestore — только локальное хранилище (D192, координатор 15.10)', async () => {
    const reads: string[] = [];
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage').default as { getItem: (k: string) => Promise<string | null> };
    const original = AsyncStorage.getItem;
    AsyncStorage.getItem = async (key: string) => { reads.push(key); return original(key); };
    try {
      await primeStoryEvents('cold_start');
    } finally {
      AsyncStorage.getItem = original;
    }
    expect(reads).toEqual(['story_events_v1:stable-a']);
    expect(mockStore).toEqual({});
    // Сетевых модулей в цепочке сторис нет вовсе: ни firebase, ни облачной синхронизации, ни вызовов функций.
    const files = ['modules/story_events/story_events_store.ts', 'modules/story_events/story_events_core.ts', 'modules/story_events/story_event_sources.ts',
      'modules/story_events/use_story_events.ts', 'components/stories/StoryAvatarSlot.tsx'];
    for (const file of files) {
      const imports = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').split('\n').filter((line) => /^import |^\} from |require\(/.test(line.trim()));
      expect([file, imports.filter((line) => /firebase|firestore|cloud_sync|httpsCallable|callable/i.test(line))]).toEqual([file, []]);
    }
  });

  it('dev stories=on|off|inherit и storyseed=all|seen|none|off: только память, вне dev отклоняется', async () => {
    const g = globalThis as { __DEV__?: boolean };
    mockFlagOn = false;
    expect(setDevStoriesFlag('on')).toBe(false);
    expect(setDevStoriesSeed('all')).toBe(false);
    g.__DEV__ = true;
    try {
      expect(setDevStoriesSeed('all')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: false, unseenCount: 0 });
      expect(setDevStoriesFlag('on')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: true, unseenCount: 4 });
      expect(peekStoryEventsSnapshot().stories.map((s) => s.type)).toEqual(['achievement', 'coin_rank_up', 'streak_milestone', 'spire_week']);
      await expect(markSeen('coin_rank_up:6')).resolves.toBe(true);
      expect(peekStoryEventsSnapshot().unseenCount).toBe(3);
      expect(setDevStoriesSeed('seen')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: true, unseenCount: 0 });
      expect(peekStoryEventsSnapshot().stories).toHaveLength(4);
      expect(setDevStoriesSeed('none')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: true, unseenCount: 0, stories: [] });
      expect(setDevStoriesFlag('off')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: false });
      expect(setDevStoriesFlag('inherit')).toBe(true);
      expect(setDevStoriesSeed('off')).toBe(true);
      expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: false, unseenCount: 0 });
      expect(mockStore).toEqual({});
    } finally {
      delete g.__DEV__;
    }
  });
});
