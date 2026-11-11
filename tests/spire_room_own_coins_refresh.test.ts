/**
 * U35 (владелец 11.11): «был на 6 месте, заработал в уроках почти тысячу монет — в Пике нигде не отобразилось, прошло 12 часов,
 * в следующую башню не перешёл». Корень: сервер обновляет мои монеты в комнате только в spireJoinRoom, а телефон входил в
 * комнату раз в неделю. Сторож: после заработка открытие Пика досылает монеты уроков, ЗАНОВО входит в комнату и перечитывает
 * документ даже при свежем кэше; без заработка свежий кэш по-прежнему не трогает сеть (💸).
 */
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/spire_energy_bonus_store', () => ({ setSpireEnergyBonus: jest.fn() }));
jest.mock('../app/coin_rank_state_v1', () => ({ peekCoinRank: () => null }));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: jest.fn() }));
jest.mock('../components/spire/spire_tower_model', () => ({ spireCurrentWeekKey: () => '2026-W46' }));
const mockCall = jest.fn();
const mockDocGet = jest.fn();
jest.mock('../app/spire/spire_net', () => ({
  spireCall: (...args: unknown[]) => mockCall(...args),
  spireFirestore: () => ({ collection: () => ({ doc: () => ({ get: () => mockDocGet() }) }) }),
  spireCloudAvailable: () => true,
  spireClassifyNetError: () => 'offline',
  spireErrorText: (error: unknown) => String(error),
}));
const mockFlush = jest.fn();
jest.mock('../app/practice_rune_settlement', () => ({ flushStalePracticeRuneSettlements: (...args: unknown[]) => mockFlush(...args) }));

import { spireSyncRoom } from '../app/spire/spire_room_client';
import { __resetSpireRoomDirtyForTests, spireMarkOwnWeekCoinsChanged } from '../app/spire/spire_room_dirty';

const gate = { kind: 'home' } as never;
// зачем: кэш комнаты живёт в памяти модуля по ключу uid+язык — у каждого теста свой язык, чтобы комната одного теста не подменяла другую
let input = { uid: 'auth1', stableId: 'me', lang: 'en' as 'en' | 'es' | 'de' | 'it' };
const LANGS = ['en', 'es', 'de', 'it'] as const;
let testIndex = 0;
const roomDoc = (myCoins: number) => ({
  exists: true,
  data: () => ({
    tier: 0, cohortDay: 0, weekStartMs: 1,
    members: {
      me: { name: 'Я', steps: 0, weekCoins: myCoins },
      n1: { name: 'N1', steps: 3, weekCoins: 500 }, n2: { name: 'N2', steps: 2, weekCoins: 400 }, n3: { name: 'N3', steps: 1, weekCoins: 300 },
      n4: { name: 'N4', steps: 1, weekCoins: 200 }, n5: { name: 'N5', steps: 1, weekCoins: 100 },
    },
    roster: [],
  }),
});
const myCoins = (load: Awaited<ReturnType<typeof spireSyncRoom>>): number | undefined => load.room?.members.find((m) => m.uid === 'me')?.weekCoins;

beforeEach(() => {
  mockStore.clear(); mockCall.mockReset(); mockDocGet.mockReset(); mockFlush.mockReset();
  __resetSpireRoomDirtyForTests();
  input = { uid: 'auth1', stableId: 'me', lang: LANGS[testIndex % LANGS.length] };
  testIndex += 1;
  mockCall.mockResolvedValue({ ok: true, groupId: 'g1', weekId: '2026-W46', tier: 0, cohortDay: 0 });
  mockFlush.mockResolvedValue({ synced: 1, pending: 0 });
});

describe('[SPIRE-WEEK-COINS] монеты уроков доходят до комнаты Пика', () => {
  it('без заработка свежий кэш не трогает сеть: ни входа, ни чтения, ни досылки', async () => {
    mockDocGet.mockResolvedValue(roomDoc(0));
    const first = await spireSyncRoom(gate, input);
    expect(first.status).toBe('network');
    expect(mockCall).toHaveBeenCalledTimes(1);

    const second = await spireSyncRoom(gate, input);
    expect(second.status).toBe('cache');
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockDocGet).toHaveBeenCalledTimes(1);
    expect(mockFlush).not.toHaveBeenCalled();
  });

  it('после заработка в уроке: досылка → повторный вход → свежая комната с моими монетами, хотя кэш свежий', async () => {
    mockDocGet.mockResolvedValueOnce(roomDoc(0));
    await spireSyncRoom(gate, input);
    await new Promise((resolve) => setTimeout(resolve, 5));

    spireMarkOwnWeekCoinsChanged('me', 'test_lesson');
    mockDocGet.mockResolvedValueOnce(roomDoc(950));
    const order: string[] = [];
    mockFlush.mockImplementation(async () => { order.push('flush'); return { synced: 1, pending: 0 }; });
    mockCall.mockImplementation(async () => { order.push('join'); return { ok: true, groupId: 'g1', weekId: '2026-W46', tier: 0, cohortDay: 0 }; });

    const refreshed = await spireSyncRoom(gate, input);
    expect(refreshed.status).toBe('network');
    expect(order).toEqual(['flush', 'join']);
    expect(mockFlush).toHaveBeenCalledWith('me');
    expect(myCoins(refreshed)).toBe(950);

    // Отметка старше нового чтения — следующий вход снова из кэша, лишних запросов нет.
    const third = await spireSyncRoom(gate, input);
    expect(third.status).toBe('cache');
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(myCoins(third)).toBe(950);
  });

  it('отметка переживает перезапуск приложения (лежит на диске)', async () => {
    mockDocGet.mockResolvedValueOnce(roomDoc(0));
    await spireSyncRoom(gate, input);
    await new Promise((resolve) => setTimeout(resolve, 5));
    spireMarkOwnWeekCoinsChanged('me', 'test_lesson');
    await Promise.resolve();
    __resetSpireRoomDirtyForTests(); // память процесса пуста, как после перезапуска

    mockDocGet.mockResolvedValueOnce(roomDoc(300));
    const refreshed = await spireSyncRoom(gate, input);
    expect(refreshed.status).toBe('network');
    expect(myCoins(refreshed)).toBe(300);
  });

  it('повторный вход упал — комната всё равно перечитана по известному groupId, экран не пустеет', async () => {
    mockDocGet.mockResolvedValueOnce(roomDoc(0));
    await spireSyncRoom(gate, input);
    await new Promise((resolve) => setTimeout(resolve, 5));
    spireMarkOwnWeekCoinsChanged('me', 'test_lesson');
    mockCall.mockRejectedValueOnce(new Error('unavailable'));
    mockFlush.mockRejectedValueOnce(new Error('disk'));
    mockDocGet.mockResolvedValueOnce(roomDoc(0));

    const load = await spireSyncRoom(gate, input);
    expect(load.status).toBe('network');
    expect(load.room?.members).toHaveLength(6);
  });
});
