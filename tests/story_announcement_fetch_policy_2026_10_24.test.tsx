// Опрос объявлений в историях (Ревизор 24.10, Firebase-экономия; решение координатора: срок обновления 6 ч).
// Свежий кэш → 0 вызовов storyAnnouncementsGet; просроченный или пустой → ровно 1; возврат из фона в пределах срока → 0; таймера-опросника нет.
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
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => mockCall }));

import { useAnnouncementStories } from '../modules/story_events/use_announcement_stories';
import {
  ANNOUNCEMENTS_REFRESH_TTL_MS,
  announcementRefreshDue,
  parseAnnouncementsCache,
} from '../modules/story_events/announcement_fetch_policy';

const CACHE_KEY = 'story_announcements_cache_v1:u1';
const HOUR = 60 * 60 * 1000;
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
    clockShift = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockShift);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('срок обновления — 6 часов', () => {
    expect(ANNOUNCEMENTS_REFRESH_TTL_MS).toBe(6 * HOUR);
    expect(announcementRefreshDue(null, 1000)).toBe(true);
    expect(announcementRefreshDue(1000, 1000 + 6 * HOUR - 1)).toBe(false);
    expect(announcementRefreshDue(1000, 1000 + 6 * HOUR)).toBe(true);
    expect(announcementRefreshDue(5000, 1000)).toBe(true);
  });

  it('пустой кэш → ровно 1 вызов', async () => {
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('свежий кэш (1 ч) → 0 вызовов', async () => {
    seedCache(HOUR);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(0);
    await hook.unmount();
  });

  it('просроченный кэш (7 ч) → ровно 1 вызов', async () => {
    seedCache(7 * HOUR);
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('возврат из фона в пределах срока → 0 новых вызовов; после срока → ещё 1', async () => {
    const hook = await renderHook(() => useAnnouncementStories(true));
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    clockShift = 2 * HOUR;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(1);
    clockShift = 7 * HOUR;
    await act(async () => { mockAppStateListener?.('active'); });
    await flush();
    expect(mockCall).toHaveBeenCalledTimes(2);
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
