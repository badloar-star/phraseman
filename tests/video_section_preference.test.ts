import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import { filterTodayTasksForTarget } from '../app/today_task_surface_filter';
import { tabPageLayoutFor, visibleLogicalTabs } from '../app/tab_page_model';

const STORAGE_KEY = 'video_section_enabled_v1';
const mockData = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  clear: async () => { mockData.clear(); },
  getItem: async (key: string) => mockData.get(key) ?? null,
  setItem: async (key: string, value: string) => { mockData.set(key, value); },
}));

function loadPreferenceModule(): typeof import('../app/video_section_preference') {
  let store!: typeof import('../app/video_section_preference');
  jest.isolateModules(() => { store = require('../app/video_section_preference'); });
  return store;
}

beforeEach(async () => { await AsyncStorage.clear(); });

test('starts no video requests before reading a saved off preference', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, 'false');
  const store = loadPreferenceModule();
  expect(store.getVideoSectionSignal()).toBeNull();
  await store.hydrateVideoSectionPreference();
  expect(store.getVideoSectionSignal()).toBeNull();
});

test('defaults to on, cancels active requests on off and persists the latest choice', async () => {
  const store = loadPreferenceModule();
  await store.hydrateVideoSectionPreference();
  const original = store.getVideoSectionSignal()!;
  expect(original.aborted).toBe(false);
  const off = store.setVideoSectionEnabled(false);
  expect(original.aborted).toBe(true);
  expect(store.getVideoSectionSignal()).toBeNull();
  const on = store.setVideoSectionEnabled(true);
  expect(store.getVideoSectionSignal()).not.toBe(original);
  expect(store.getVideoSectionSignal()?.aborted).toBe(false);
  await Promise.all([off, on]);
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('true');
});

test('off removes the video page and the video task while keeping other tasks', () => {
  const lesson: TodayTask = { id: 'lesson', kind: 'lesson', title: 'Lesson', progress: 0, target: 1, done: false, rewardCoins: 0, route: '/lessons' };
  const video: TodayTask = { ...lesson, id: 'video', kind: 'video', route: '/video' };
  expect(visibleLogicalTabs(tabPageLayoutFor({ learnTabVisible: true, videoTabVisible: false }))).toEqual([0, 1, 3, 4]);
  expect(filterTodayTasksForTarget([lesson, video], 'en', false)).toEqual([lesson]);
  expect(filterTodayTasksForTarget([lesson, video], 'en', true)).toEqual([lesson, video]);
});

test('off aborts an in-flight RSS request before its fallback starts', async () => {
  const { getLingmanYoutubeSnapshot } = require('../app/lingman_youtube') as typeof import('../app/lingman_youtube');
  const store = loadPreferenceModule();
  await store.hydrateVideoSectionPreference();
  const signal = store.getVideoSectionSignal()!;
  let fetchStarted!: () => void;
  const started = new Promise<void>((resolve) => { fetchStarted = resolve; });
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
    fetchStarted();
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('fetch aborted')));
    });
  });
  try {
    const request = getLingmanYoutubeSnapshot(signal);
    const rejected = expect(request).rejects.toThrow('Video request cancelled');
    await started;
    await store.setVideoSectionEnabled(false);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  } finally {
    fetchMock.mockRestore();
  }
});

test('off drops a catalog read already in progress and prevents the next native read', async () => {
  const { guardYoutubeCatalogReader } = require('../app/youtube_catalog_client') as typeof import('../app/youtube_catalog_client');
  const store = loadPreferenceModule();
  await store.hydrateVideoSectionPreference();
  const raw = { get: jest.fn(async (_path: string) => ({ ready: true })), list: jest.fn(async (_path: string) => []) };
  const reader = guardYoutubeCatalogReader(raw, store.getVideoSectionSignal()!);
  const pending = reader.get('manifest');
  const rejected = expect(pending).rejects.toThrow('Video request cancelled');
  await store.setVideoSectionEnabled(false);
  await rejected;
  await expect(reader.list('videos')).rejects.toThrow('Video request cancelled');
  expect(raw.get).toHaveBeenCalledTimes(1);
  expect(raw.list).not.toHaveBeenCalled();
});
