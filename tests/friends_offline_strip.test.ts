/**
 * Полоса «Нет сети · список сохранён в 18:40» на вкладке «Друзья» (идея 1, макет friends-full.html «Нет сети»).
 * Сторож: текст с временем только за сегодня; время — когда список последний раз пришёл с сервера (своё на аккаунт, на диск
 * не чаще раза в минуту); «сети нет» — тот же признак, что у очереди зовов.
 */
const mockStorage: Record<string, string> = {};
const mockSetItem = jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); });
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: (key: string, value: string) => mockSetItem(key, value),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));
const mockScope: { current: string | null } = { current: 'me-1' };
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve(mockScope.current) }));
const mockNet: { listener: ((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | null } = { listener: null };
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (listener: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) => {
    mockNet.listener = listener;
    return () => { mockNet.listener = null; };
  },
  fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
}));

import { pairOfflineStrip } from '../app/friends_together/pair_copy';
import {
  __resetFriendsListSyncForTests,
  noteFriendsListServerSnapshot,
  peekFriendsListSyncedAt,
  readFriendsListSyncedAt,
} from '../app/friends_together/friends_list_sync';
import { subscribeOffline } from '../app/friends_together/nudge_queue';

const at = (h: number, m: number, day = 22) => new Date(2026, 9, day, h, m).getTime();

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockSetItem.mockClear();
  mockScope.current = 'me-1';
  __resetFriendsListSyncForTests();
});

describe('текст полосы', () => {
  it('список с сервера сегодня — со временем', () => {
    expect(pairOfflineStrip('ru', at(18, 40), at(21, 5))).toBe('Нет сети · список сохранён в 18:40');
    expect(pairOfflineStrip('en', at(18, 40), at(21, 5))).toBe('Offline · list saved at 18:40');
    expect(pairOfflineStrip('ru', at(8, 5), at(9, 0))).toBe('Нет сети · список сохранён в 8:05');
  });

  it('не сегодня или неизвестно — без времени, ничего не выдумываем', () => {
    expect(pairOfflineStrip('ru', at(18, 40, 21), at(9, 0))).toBe('Нет сети · список сохранён');
    expect(pairOfflineStrip('ru', null, at(9, 0))).toBe('Нет сети · список сохранён');
  });

  it('испанский и португальский — «a la / à» для часа дня', () => {
    expect(pairOfflineStrip('es', at(1, 5), at(2, 0))).toBe('Sin conexión · lista guardada a la 1:05');
    expect(pairOfflineStrip('es', at(18, 40), at(21, 0))).toBe('Sin conexión · lista guardada a las 18:40');
    expect(pairOfflineStrip('pt-BR', at(1, 5), at(2, 0))).toBe('Sem internet · lista salva à 1:05');
    expect(pairOfflineStrip('pt-BR', at(18, 40), at(21, 0))).toBe('Sem internet · lista salva às 18:40');
  });

  it('на всех языках непусто, кириллица только в ru/uk', () => {
    for (const lang of ['en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const line = pairOfflineStrip(lang, at(18, 40), at(21, 0));
      expect(line).toContain('18:40');
      expect(line).not.toMatch(/[А-Яа-яЁёІіЇїЄє]/);
    }
  });
});

describe('время списка с сервера', () => {
  it('снимок с сервера — время в памяти сразу и на диске своего аккаунта', async () => {
    noteFriendsListServerSnapshot('me-1', at(18, 40));
    expect(peekFriendsListSyncedAt()).toBe(at(18, 40));
    expect(mockStorage['friends_list_synced_at_v1::me-1']).toBe(String(at(18, 40)));
    expect(await readFriendsListSyncedAt()).toBe(at(18, 40));
  });

  it('на диск — не чаще раза в минуту, память — всегда свежая', () => {
    noteFriendsListServerSnapshot('me-1', at(18, 40));
    noteFriendsListServerSnapshot('me-1', at(18, 40) + 20_000);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(peekFriendsListSyncedAt()).toBe(at(18, 40) + 20_000);
    noteFriendsListServerSnapshot('me-1', at(18, 42));
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('холодный старт без сети — время с диска своего аккаунта; чужой аккаунт — нет', async () => {
    mockStorage['friends_list_synced_at_v1::me-1'] = String(at(18, 40));
    expect(await readFriendsListSyncedAt()).toBe(at(18, 40));
    mockScope.current = 'other';
    expect(await readFriendsListSyncedAt()).toBeNull();
  });

  it('мусор на диске или нет аккаунта — null', async () => {
    mockStorage['friends_list_synced_at_v1::me-1'] = 'not-a-number';
    expect(await readFriendsListSyncedAt()).toBeNull();
    mockScope.current = null;
    expect(await readFriendsListSyncedAt()).toBeNull();
  });

  it('без аккаунта отметку не ставим', () => {
    noteFriendsListServerSnapshot('', at(18, 40));
    expect(peekFriendsListSyncedAt()).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('сеть — тот же признак, что у очереди зовов', () => {
  it('нет связи или интернет недоступен — offline; есть — online; отписка снимает слушателя', () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeOffline((offline) => seen.push(offline));
    mockNet.listener?.({ isConnected: false, isInternetReachable: null });
    mockNet.listener?.({ isConnected: true, isInternetReachable: false });
    mockNet.listener?.({ isConnected: true, isInternetReachable: true });
    mockNet.listener?.({ isConnected: true, isInternetReachable: null });
    expect(seen).toEqual([true, true, false, false]);
    unsubscribe();
    expect(mockNet.listener).toBeNull();
  });
});
