// зачем (координатор 13.10, к 1804b52ab): дисковая копия визиток друзей стирается при выходе/смене/удалении аккаунта (вместе с памятью модуля),
// а запись/чтение/ответ, начатые ДО чистки, её не воскрешают. Контракт cloud_sync + поведение модуля.
import fs from 'node:fs';
import path from 'node:path';

const mockGet = jest.fn();
const diskStore = new Map<string, string>();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => diskStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { diskStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { diskStore.delete(key); }),
  },
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: () => ({ get: mockGet }) }) }),
}));
jest.mock('react-native', () => ({
  InteractionManager: { runAfterInteractions: (fn: () => void) => { fn(); return { cancel: () => undefined }; } },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));

import {
  PROFILE_CARD_PUBLIC_DISK_KEY,
  __profileCardPublicTestHooks,
  clearPublicProfileCardCache,
  fetchPublicProfileCard,
  loadPublicProfileCardDisk,
  peekPublicProfileCardOrStale,
} from '../app/profile_card_public';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const proSnap = { exists: true, data: () => ({ profileCardPro: true, profileCardStyle: 'gold', profileCardBio: 'Привет' }) };

beforeEach(() => {
  jest.useRealTimers();
  mockGet.mockReset();
  diskStore.clear();
  __profileCardPublicTestHooks.reset();
});

describe('выход, смена и удаление аккаунта стирают копию визиток друзей', () => {
  it('cloud_sync: ключ копии входит в список ключей «стереть при выходе», а память сбрасывается отдельным шагом без риска для выхода', () => {
    const cloud = read('app/cloud_sync.ts');
    expect(cloud).toMatch(/const PROFILE_CARD_PUBLIC_CACHE_PREFIX = 'profile_card_public_v1';/);
    expect(cloud).toMatch(/ECONOMY_DAILY_STATS_TAIL_PREFIX, PROFILE_CARD_PUBLIC_CACHE_PREFIX,\n\];/);
    expect(cloud).toMatch(/await clearPublicProfileCardCache\('account_wipe'\);/);
    // шаг не может уронить выход: бросок импорта/очистки ловится и пишет причину
    expect(cloud).toMatch(/\[ACC-WIPE\] profile_card_public clear_failed code=/);
    // тот же ключ, что у модуля визиток
    expect(PROFILE_CARD_PUBLIC_DISK_KEY).toBe('profile_card_public_v1');
  });

  it('ключ копии совпадает с префиксом стирания (ключ без владельца → префикс целиком)', () => {
    const cloud = read('app/cloud_sync.ts');
    const fn = cloud.slice(cloud.indexOf('function wipeOnlyAccountKeyPrefix'), cloud.indexOf('function wipeOnlyAccountKeyPrefix') + 600);
    expect(fn).toMatch(/key === prefix|key\.startsWith\(`\$\{prefix\}:`\)/);
  });

  it('clearPublicProfileCardCache: память и диск пусты, отложенная запись отменена', async () => {
    jest.useFakeTimers();
    mockGet.mockResolvedValueOnce(proSnap);
    await fetchPublicProfileCard('friend-1');
    expect(peekPublicProfileCardOrStale('friend-1')?.pro).toBe(true);
    // копия уже на диске
    jest.advanceTimersByTime(2100);
    jest.useRealTimers();
    await Promise.resolve();
    expect(diskStore.has(PROFILE_CARD_PUBLIC_DISK_KEY)).toBe(true);

    await clearPublicProfileCardCache('test');
    expect(peekPublicProfileCardOrStale('friend-1')).toBeNull();
    expect(diskStore.has(PROFILE_CARD_PUBLIC_DISK_KEY)).toBe(false);
  });

  it('запись, назначенная до чистки, после чистки не воскрешает ключ на диске', async () => {
    jest.useFakeTimers();
    mockGet.mockResolvedValueOnce(proSnap);
    await fetchPublicProfileCard('friend-2'); // назначена отложенная запись (2 с)
    await clearPublicProfileCardCache('test');
    jest.advanceTimersByTime(5000);
    jest.useRealTimers();
    await Promise.resolve();
    expect(diskStore.has(PROFILE_CARD_PUBLIC_DISK_KEY)).toBe(false);
  });

  it('ответ сети, начатый до чистки и пришедший после, в копию не попадает', async () => {
    let release!: (value: unknown) => void;
    mockGet.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const pending = fetchPublicProfileCard('friend-3');
    await clearPublicProfileCardCache('test'); // аккаунт сменился, пока чтение шло
    release(proSnap);
    const card = await pending;
    expect(card.pro).toBe(true); // вызвавший получил ответ…
    expect(peekPublicProfileCardOrStale('friend-3')).toBeNull(); // …но в копию чужого аккаунта он не лёг
  });

  it('загрузка с диска, начатая до чистки, ничего не возвращает в память', async () => {
    diskStore.set(PROFILE_CARD_PUBLIC_DISK_KEY, JSON.stringify({ v: 1, items: { 'friend-4': { pro: true, style: null, bio: '' } } }));
    const loading = loadPublicProfileCardDisk();
    await clearPublicProfileCardCache('test');
    await loading;
    expect(peekPublicProfileCardOrStale('friend-4')).toBeNull();
  });
});
