// D192 (владелец 14.10): хранилище «историй» — флаг выкл = ничего не пишем, повтор не копится, аккаунты не смешиваются,
// просмотр гасит кольцо, Firestore не трогается (в модуле нет ни одного сетевого импорта — проверяется моками ниже).
import {
  __resetStoryEventsForTests,
  getUnseenStories,
  markSeen,
  peekStoryEventsSnapshot,
  primeStoryEvents,
  recordStoryEvent,
} from '../modules/story_events/story_events_store';
import { recordAchievementStories, recordStreakMilestoneStory } from '../modules/story_events/story_event_sources';
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

  it('writes nothing while the stories_v1 flag is off', async () => {
    mockFlagOn = false;
    await expect(recordStoryEvent('coin_rank_up', { toRank: 2 })).resolves.toEqual({ recorded: false, reason: 'flag_off' });
    expect(mockStore).toEqual({});
    await primeStoryEvents('test');
    expect(peekStoryEventsSnapshot()).toMatchObject({ enabled: false, unseenCount: 0 });
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

  it('records only real streak milestones', async () => {
    expect(recordStreakMilestoneStory(8, '2026-10-14')).toBeUndefined();
    await expect(recordStreakMilestoneStory(7, '2026-10-14')).resolves.toEqual({ recorded: true, id: 'streak_milestone:7:2026-10-14' });
  });
});
