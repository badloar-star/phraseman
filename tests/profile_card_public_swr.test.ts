// зачем (координатор 13.10, аудит Optimistic UI Профиля): карточка Pro-друга в первом кадре берётся из устаревшей копии (память/диск) и не перекрашивается;
// число чтений Firestore прежнее (свежая копия 10 минут — 0 чтений, после — 1), сбой чтения не стирает известную визитку.
const mockGet = jest.fn();
const diskStore = new Map<string, string>();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => diskStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { diskStore.set(key, value); }),
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
  __profileCardPublicTestHooks,
  fetchPublicProfileCard,
  loadPublicProfileCardDisk,
  peekPublicProfileCard,
  peekPublicProfileCardOrStale,
} from '../app/profile_card_public';

const proSnap = (style: string) => ({ exists: true, data: () => ({ profileCardPro: true, profileCardStyle: style, profileCardBio: 'Привет' }) });

beforeEach(() => {
  jest.useRealTimers();
  mockGet.mockReset();
  diskStore.clear();
  __profileCardPublicTestHooks.reset();
});

describe('визитка друга: первый кадр из устаревшей копии', () => {
  it('после чтения копия лежит в памяти и «свежая», и «устаревшая»; чтений Firestore одно', async () => {
    mockGet.mockResolvedValueOnce(proSnap('gold'));
    await fetchPublicProfileCard('friend-1');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(peekPublicProfileCard('friend-1')?.pro).toBe(true);
    expect(peekPublicProfileCardOrStale('friend-1')?.pro).toBe(true);
    await fetchPublicProfileCard('friend-1'); // внутри 10 минут — 0 чтений
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('копия переживает перезапуск: запись на диск → «новый процесс» видит Pro в первом кадре без чтения сети', async () => {
    jest.useFakeTimers();
    mockGet.mockResolvedValueOnce(proSnap('gold'));
    await fetchPublicProfileCard('friend-2');
    jest.advanceTimersByTime(2100); // дебаунс записи на диск
    jest.useRealTimers();
    await Promise.resolve();
    expect(diskStore.get('profile_card_public_v1')).toContain('friend-2');

    __profileCardPublicTestHooks.reset(); // «перезапуск»: память пуста, диск остался
    expect(peekPublicProfileCardOrStale('friend-2')).toBeNull();
    await loadPublicProfileCardDisk();
    const first = peekPublicProfileCardOrStale('friend-2');
    expect(first?.pro).toBe(true);
    expect(first?.bio).toBe('Привет');
    expect(peekPublicProfileCard('friend-2')).toBeNull(); // свежей копии нет → освежение остаётся
    expect(mockGet).toHaveBeenCalledTimes(1); // диск сеть не трогал
  });

  it('сбой чтения не перекрашивает известного Pro-друга в «обычного»', async () => {
    __profileCardPublicTestHooks.staleCards.set('friend-3', { pro: true, style: null, bio: '' });
    mockGet.mockRejectedValueOnce(new Error('network down'));
    const card = await fetchPublicProfileCard('friend-3');
    expect(card.pro).toBe(true);
  });

  it('незнакомый друг и сбой → обычная визитка (как раньше)', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));
    const card = await fetchPublicProfileCard('friend-4');
    expect(card.pro).toBe(false);
    expect(peekPublicProfileCardOrStale('friend-4')).toBeNull();
  });

  it('битая или чужая дисковая копия игнорируется без падения', async () => {
    diskStore.set('profile_card_public_v1', '{"v":2,"items":{}}');
    await loadPublicProfileCardDisk();
    expect(peekPublicProfileCardOrStale('x')).toBeNull();
    __profileCardPublicTestHooks.reset();
    diskStore.set('profile_card_public_v1', 'not json');
    await expect(loadPublicProfileCardDisk()).resolves.toBeUndefined();
  });
});
