// Опрос объявлений в историях (Ревизор 24.10, Firebase-экономия). Владелец 28.10: «истории при отправке должны уходить СРАЗУ, а не через много
// часов» — срок 6 ч заменён защитой в 1 минуту: запрос при каждом входе и возвращении в приложение, кроме повтора в пределах минуты.
// Свежий кэш → 0 вызовов storyAnnouncementsGet; просроченный или пустой → ровно 1; возврат из фона в пределах минуты → 0; таймера-опросника нет.
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react-native';

const mockStore = new Map<string, string>();
const mockCall = jest.fn(async (_payload: unknown) => ({ data: { items: [] as unknown[], nowMs: Date.now() } }));
let mockAppStateListener: ((state: string) => void) | null = null;
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, cb: (state: string) => void) => {
      mockAppStateListener = cb;
      return { remove: () => { mockAppStateListener = null; } };
    },
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => { mockStore.set(key, value); },
  },
}));
jest.mock('../app/account_generation', () => {
  const token = { phase: 'active', stableId: 'u1', generation: 1 };
  return {
    captureAccountGeneration: () => token,
    isCurrentAccountGeneration: () => true,
    subscribeAccountGeneration: () => ({ remove: () => undefined }),
  };
});
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
// зачем (28.10, версия ленты): хук слушает «пришёл конфиг» и читает сырой кэш конфига — оба под контролем теста
let mockConfigRaw: string | null = null;
const mockConfigListeners = new Set<() => void>();
jest.mock('../app/events', () => ({
  onAppEvent: (_event: string, cb: () => void) => { mockConfigListeners.add(cb); return { remove: () => { mockConfigListeners.delete(cb); } }; },
}));
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => mockConfigRaw }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => mockCall }));

import { useAnnouncementStories } from '../modules/story_events/use_announcement_stories';
import {
  ANNOUNCEMENTS_CONFIG_WAIT_MS,
  ANNOUNCEMENTS_MAX_AGE_MS,
  ANNOUNCEMENTS_REFRESH_TTL_MS,
  ANNOUNCEMENTS_WARM_RETURN_REFRESH_MS,
  announcementRefreshDue,
  decideAnnouncementFetch,
  parseAnnouncementsCache,
  serializeAnnouncementsCache,
  storyFeedRevFromConfigRaw,
} from '../modules/story_events/announcement_fetch_policy';
import { nextStoryFeedRev, storyFeedRevOf, STORY_FEED_REV_CONFIG_KEY } from '../modules/story_events/story_announcements_contract';

const CACHE_KEY = 'story_announcements_cache_v1:u1';
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;
let clockShift = 0;
const realNow = Date.now.bind(Date);
const seedCache = (ageMs: number) => {
  const at = realNow() - ageMs;
  mockStore.set(CACHE_KEY, JSON.stringify({ fetchedAtMs: at, serverNowMs: at, items: [] }));
};
const flush = async () => {
  for (let i = 0; i < 6; i += 1) await act(async () => { await new Promise((r) => setImmediate(r)); });
};

describe('объявления: когда ходим в сеть', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    mockStore.clear();
    mockCall.mockClear();
    mockConfigRaw = null;
    mockConfigListeners.clear();
    clockShift = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockShift);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('повторный запрос — не раньше чем через минуту (было 6 часов)', () => {
    expect(ANNOUNCEMENTS_REFRESH_TTL_MS).toBe(MIN);
    expect(announcementRefreshDue(null, 1000)).toBe(true);
    expect(announcementRefreshDue(1000, 1000 + MIN - 1)).toBe(false);
    expect(announcementRefreshDue(1000, 1000 + MIN)).toBe(true);
    expect(announcementRefreshDue(5000, 1000)).toBe(true);
  });

  it('пустой кэш → ровно 1 вызов', async () => {
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('свежий кэш (30 с) → 0 вызовов', async () => {
    seedCache(30 * 1000);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(0);
    await hook.unmount();
  });

  it('кэш старше минуты (2 мин) → ровно 1 вызов', async () => {
    seedCache(2 * MIN);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('возврат из фона в пределах минуты → 0 новых вызовов; позже → ещё 1', async () => {
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    clockShift = 30 * 1000;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    clockShift = 2 * MIN;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(2);
    await hook.unmount();
  });

  // зачем (владелец 28.10): опубликованная история доходит при следующем возвращении в приложение, и истории не заменяют друг друга
  const story = (id: string, publishedAgoMs: number) => {
    const now = realNow() + clockShift;
    return { templateId: 'leaf', badge: '', title: `T ${id}`, blocks: [], titleSize: 28, align: 'left', decoration: false, lifetime: 24, unit: 'hours',
      durationMs: 5000, id, revision: 1, status: 'published', publishedAtMs: now - publishedAgoMs, expiresAtMs: now - publishedAgoMs + 24 * HOUR };
  };
  it('история, опубликованная пока приложение в фоне, появляется при возвращении; две истории живут рядом', async () => {
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(hook.result.current.stories).toHaveLength(0);
    clockShift = 2 * MIN;
    mockCall.mockImplementationOnce(async () => ({ data: { items: [story('first', 60 * 1000)], nowMs: realNow() + clockShift } }));
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(hook.result.current.stories.map((x) => x.id)).toEqual(['announcement:first:1']);
    clockShift = 4 * MIN;
    mockCall.mockImplementationOnce(async () => ({ data: { items: [story('first', 3 * MIN), story('second', 1000)], nowMs: realNow() + clockShift } }));
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(hook.result.current.stories.map((x) => x.id)).toEqual(['announcement:first:1', 'announcement:second:1']);
    await hook.unmount();
  });

  it('повреждённый кэш → 1 вызов и причина в журнале с префиксом', async () => {
    mockStore.set(CACHE_KEY, '{not json');
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('[STORY-ANNOUNCE]'))).toBe(true);
    await hook.unmount();
  });

  it('parseAnnouncementsCache: мусор → null, нормальный кэш → разобран', () => {
    expect(parseAnnouncementsCache(null)).toBeNull();
    expect(parseAnnouncementsCache('{"fetchedAtMs":1}')).toBeNull();
    const ok = parseAnnouncementsCache(JSON.stringify({ fetchedAtMs: 1, serverNowMs: 2, items: [] }));
    expect(ok?.serverNowMs).toBe(2);
  });
});

describe('объявления: источник', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  it('в хуке нет таймера-опросника', () => {
    const src = read('modules/story_events/use_announcement_stories.ts');
    expect(src).not.toMatch(/setInterval/);
    expect(src).not.toMatch(/60000/);
  });
  it('кэш и «просмотрено» стираются при выходе и удалении аккаунта', () => {
    const src = read('app/cloud_sync.ts');
    expect(src).toContain("'story_announcements_cache_v1'");
    expect(src).toContain("'story_announcements_seen_v1'");
    expect(src).toMatch(/STORY_ANNOUNCEMENTS_CACHE_PREFIX, STORY_ANNOUNCEMENTS_SEEN_PREFIX/);
  });
  it('немых catch нет: у каждого — причина с префиксом [STORY-ANNOUNCE]', () => {
    for (const rel of [
      'modules/story_events/use_announcement_stories.ts',
      'modules/story_events/announcement_fetch_policy.ts',
      'modules/story_events/story_announcements_contract.ts',
      'components/stories/AnnouncementSlide.tsx',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/catch\s*\{/);
      expect(src).toContain('STORY-ANNOUNCE');
    }
  });
});

// ── Версия ленты в конфиге (координатор 28.10: «запрос только при новой истории») ────────────────────────────────────
describe('объявления: решение по версии ленты', () => {
  const at = 1_000_000_000;
  const local = (ageMs: number, feedRev?: number) => ({ fetchedAtMs: at - ageMs, ...(feedRev ? { feedRev } : {}) });
  it('таблица решений: копии нет, часы назад, сутки, без версии, версия сменилась, та же версия, тёплое возвращение, тайм-аут входа', () => {
    expect(decideAnnouncementFetch({ trigger: 'entry', remoteRev: 5, local: null, nowMs: at })).toMatchObject({ fetch: true, reason: 'no_local_copy' });
    expect(decideAnnouncementFetch({ trigger: 'entry', remoteRev: 5, local: local(-1000, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'clock_back' });
    expect(decideAnnouncementFetch({ trigger: 'config', remoteRev: 5, local: local(ANNOUNCEMENTS_MAX_AGE_MS, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'max_age' });
    // копия без версии (сервер ещё без версии) — прежнее правило минуты
    expect(decideAnnouncementFetch({ trigger: 'entry', remoteRev: 5, local: local(30_000), nowMs: at })).toMatchObject({ fetch: false, reason: 'no_local_rev' });
    expect(decideAnnouncementFetch({ trigger: 'entry', remoteRev: 5, local: local(2 * MIN), nowMs: at })).toMatchObject({ fetch: true, reason: 'no_local_rev' });
    // новая история: версия в конфиге не та, что у копии — сразу, при любом поводе
    for (const trigger of ['entry', 'config', 'return'] as const) {
      expect(decideAnnouncementFetch({ trigger, remoteRev: 6, local: local(10_000, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'rev_changed' });
    }
    // вход с той же версией — ждём свежий конфиг (кэш конфига мог устареть), в сеть не идём
    expect(decideAnnouncementFetch({ trigger: 'entry', remoteRev: 5, local: local(5 * MIN, 5), nowMs: at })).toMatchObject({ fetch: false, wait: true, reason: 'entry_wait_config' });
    expect(decideAnnouncementFetch({ trigger: 'config', remoteRev: 5, local: local(5 * MIN, 5), nowMs: at })).toMatchObject({ fetch: false, reason: 'same_rev' });
    // конфиг без поля (сервер не выложен / откат) — правило минуты
    expect(decideAnnouncementFetch({ trigger: 'config', remoteRev: 0, local: local(2 * MIN, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'no_remote_rev' });
    // тёплое возвращение: конфиг не перечитывается — версия + 15 минут
    expect(decideAnnouncementFetch({ trigger: 'return', remoteRev: 5, local: local(5 * MIN, 5), nowMs: at })).toMatchObject({ fetch: false, reason: 'warm_recent' });
    expect(decideAnnouncementFetch({ trigger: 'return', remoteRev: 5, local: local(ANNOUNCEMENTS_WARM_RETURN_REFRESH_MS, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'warm_time_rule' });
    expect(decideAnnouncementFetch({ trigger: 'entry_timeout', remoteRev: 5, local: local(30_000, 5), nowMs: at })).toMatchObject({ fetch: false, reason: 'entry_timeout_time_rule' });
    expect(decideAnnouncementFetch({ trigger: 'entry_timeout', remoteRev: 5, local: local(2 * MIN, 5), nowMs: at })).toMatchObject({ fetch: true, reason: 'entry_timeout_time_rule' });
  });

  it('версия из сырого кэша конфига; копия хранит версию; серверные помощники монотонны', () => {
    expect(STORY_FEED_REV_CONFIG_KEY).toBe('story_feed_rev');
    expect(storyFeedRevFromConfigRaw(JSON.stringify({ numbers: { story_feed_rev: 42 } }), STORY_FEED_REV_CONFIG_KEY)).toBe(42);
    expect(storyFeedRevFromConfigRaw(JSON.stringify({ numbers: {} }), STORY_FEED_REV_CONFIG_KEY)).toBe(0);
    expect(storyFeedRevFromConfigRaw(null, STORY_FEED_REV_CONFIG_KEY)).toBe(0);
    expect(storyFeedRevFromConfigRaw('{bad', STORY_FEED_REV_CONFIG_KEY)).toBe(0);
    const cache = parseAnnouncementsCache(serializeAnnouncementsCache({ fetchedAtMs: 1, serverNowMs: 2, items: [], feedRev: 77 }));
    expect(cache?.feedRev).toBe(77);
    expect(parseAnnouncementsCache(JSON.stringify({ fetchedAtMs: 1, serverNowMs: 2, items: [] }))?.feedRev).toBeUndefined();
    expect(nextStoryFeedRev(0, 1000)).toBe(1000);
    expect(nextStoryFeedRev(5000, 1000)).toBe(5001); // часы сервера назад — версия всё равно растёт
    expect(nextStoryFeedRev(1000, 1000)).toBe(1001); // та же миллисекунда — строго больше
    expect(storyFeedRevOf({ rev: 9 })).toBe(9);
    expect(storyFeedRevOf({ rev: 'x' })).toBe(0);
    expect(storyFeedRevOf(null)).toBe(0);
  });
});

describe('объявления: хук ходит в сеть только при новой истории', () => {
  const seedRevCache = (ageMs: number, feedRev: number) => {
    const at = realNow() - ageMs;
    mockStore.set(CACHE_KEY, JSON.stringify({ fetchedAtMs: at, serverNowMs: at, items: [], feedRev }));
  };
  const configWithRev = (rev: number) => JSON.stringify({ numbers: { story_feed_rev: rev } });
  const fireConfig = async () => { await act(async () => { for (const cb of [...mockConfigListeners]) cb(); }); await flush(); };
  beforeEach(() => {
    mockStore.clear();
    mockCall.mockClear();
    mockConfigRaw = null;
    mockConfigListeners.clear();
    clockShift = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockShift);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('та же версия в свежем конфиге → 0 вызовов', async () => {
    seedRevCache(5 * MIN, 100);
    mockConfigRaw = configWithRev(100);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    await fireConfig();
    expect(mockCall).toHaveBeenCalledTimes(0);
    await hook.unmount();
  });

  it('новая версия (опубликована история) → ровно 1 вызов сразу, версия ответа ложится в копию', async () => {
    seedRevCache(5 * MIN, 100);
    mockConfigRaw = configWithRev(200);
    mockCall.mockImplementationOnce(async () => ({ data: { items: [] as unknown[], nowMs: realNow(), feedRev: 200 } }));
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockStore.get(CACHE_KEY) ?? '{}').feedRev).toBe(200);
    await fireConfig(); // тот же конфиг ещё раз — версия уже совпала
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('свежий конфиг не пришёл за время ожидания → правило минуты (копия старше минуты → 1 вызов)', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'Date'] });
    seedRevCache(5 * MIN, 100);
    mockConfigRaw = configWithRev(100);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(0);
    await act(async () => { jest.advanceTimersByTime(ANNOUNCEMENTS_CONFIG_WAIT_MS); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('тёплое возвращение с той же версией: до 15 мин — 0, после — 1', async () => {
    seedRevCache(MIN / 2, 100);
    mockConfigRaw = configWithRev(100);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    await fireConfig();
    expect(mockCall).toHaveBeenCalledTimes(0);
    clockShift = 5 * MIN;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(0);
    clockShift = ANNOUNCEMENTS_WARM_RETURN_REFRESH_MS;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});

describe('объявления: сервер пишет версию ленты', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'functions/src/story_announcements.ts'), 'utf8').replace(/\r\n/g, '\n');
  it('публикация и снятие поднимают версию в ленте и в remote_config/app (merge); черновик — нет; лента отдаёт версию', () => {
    expect(src).toContain('const feedChanged = command.action !== "save";');
    expect(src).toContain('const feedRev = feedChanged ? nextStoryFeedRev(prevFeedRev, next.document.updatedAtMs) : prevFeedRev;');
    expect(src).toMatch(/tx\.set\(feedRef, \{\n\s+items: next\.items,\n\s+updatedAtMs: next\.document\.updatedAtMs,\n\s+rev: feedRev,\n\s+\}\);/);
    expect(src).toMatch(/if \(feedChanged\)\n\s+tx\.set\(\n\s+db\.collection\("remote_config"\)\.doc\("app"\),\n\s+\{ numbers: \{ \[STORY_FEED_REV_CONFIG_KEY\]: feedRev \} \},\n\s+\{ merge: true \},\n\s+\);/);
    expect(src).toContain('feedRev: storyFeedRevOf(feed.data())');
  });
});
