// зачем (Ревизор P24, координатор 15.10): тумблеры пушей + сразу «Выйти» уносили выбор прошлого аккаунта в users/{гость}.
// Владелец запоминается при тапе; смена поколения аккаунта отменяет отложенную запись, начатая запись сверяет владельца.
const mockSet = jest.fn(async (_data: unknown, _opts: unknown) => undefined);
const mockDocIds: string[] = [];
let mockStableId = 'stable_A';
let mockOnLink: (() => void) | null = null;
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({
      doc: (id: string) => {
        mockDocIds.push(id);
        return { set: (data: unknown, opts: unknown) => mockSet(data, opts) };
      },
    }),
  }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: async () => mockStableId,
  ensureStableAuthLinkForStableId: async () => {
    mockOnLink?.();
    return true;
  },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import {
  cancelPendingServerPushPrefsForAccountDelete,
  flushPendingServerPushPrefsBeforeOwnerChange,
  flushServerPushPrefsForTests,
  updateServerPushPrefs,
} from '../app/push_token_registration';

describe('pushPrefs — владелец записи (P24)', () => {
  let logs: string[] = [];
  beforeEach(async () => {
    mockSet.mockClear();
    mockDocIds.length = 0;
    mockStableId = 'stable_A';
    mockOnLink = null;
    logs = [];
    __resetAccountGenerationForTests();
    await AsyncStorage.removeItem('server_push_prefs_last_written');
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('тумблер → выход до 1,5 с → в документ гостя ничего не записано', async () => {
    beginAccountGeneration('stable_A');
    void updateServerPushPrefs({ streak: false, offers: true, league: true });
    invalidateAccountGeneration();
    mockStableId = 'stable_guest';
    beginAccountGeneration('stable_guest');
    await flushServerPushPrefsForTests();
    expect(mockSet).not.toHaveBeenCalled();
    expect(logs.some((line) => line.includes('[PUSH-PREFS] cancel') && line.includes('owner_changed'))).toBe(true);
  });

  it('запись уже начата, выход посреди неё → set не вызван', async () => {
    beginAccountGeneration('stable_A');
    mockOnLink = () => {
      invalidateAccountGeneration();
      mockStableId = 'stable_guest';
      beginAccountGeneration('stable_guest');
    };
    void updateServerPushPrefs({ streak: true, offers: false, league: true });
    await flushServerPushPrefsForTests();
    expect(mockSet).not.toHaveBeenCalled();
    expect(logs.some((line) => line.includes('[PUSH-PREFS] skip') && line.includes('owner_changed'))).toBe(true);
  });

  it('владелец не менялся → запись в его документ, как прежде', async () => {
    beginAccountGeneration('stable_A');
    void updateServerPushPrefs({ streak: true, offers: true, league: false });
    await flushServerPushPrefsForTests();
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockDocIds).toEqual(['stable_A']);
  });

  it('новый тап уже под гостем после отмены → пишется в документ гостя', async () => {
    beginAccountGeneration('stable_A');
    void updateServerPushPrefs({ streak: false, offers: false, league: false });
    invalidateAccountGeneration();
    mockStableId = 'stable_guest';
    beginAccountGeneration('stable_guest');
    void updateServerPushPrefs({ streak: true, offers: true, league: true });
    await flushServerPushPrefsForTests();
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockDocIds).toEqual(['stable_guest']);
    expect(mockSet.mock.calls[0]![0]).toEqual({ pushPrefs: { streak: true, offers: true, league: true } });
  });
});

// зачем (Ревизор P24b, 15.10): тумблер + «Выйти» раньше 1,5 с — новое значение должно дойти до документа A, а в гостя — ничего.
describe('pushPrefs — досылка A перед выходом (P24b)', () => {
  beforeEach(async () => {
    mockSet.mockClear();
    mockDocIds.length = 0;
    mockStableId = 'stable_A';
    mockOnLink = null;
    __resetAccountGenerationForTests();
    await AsyncStorage.removeItem('server_push_prefs_last_written');
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('тумблер → выход через 0,5 с → новое значение в документе A, в гостя ничего', async () => {
    beginAccountGeneration('stable_A');
    void updateServerPushPrefs({ streak: false, offers: false, league: true });
    await expect(flushPendingServerPushPrefsBeforeOwnerChange()).resolves.toBe('flushed');
    expect(mockDocIds).toEqual(['stable_A']);
    expect(mockSet.mock.calls[0]![0]).toEqual({ pushPrefs: { streak: false, offers: false, league: true } });
    invalidateAccountGeneration();
    mockStableId = 'stable_guest';
    beginAccountGeneration('stable_guest');
    await flushServerPushPrefsForTests();
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockDocIds).toEqual(['stable_A']);
  });

  // зачем (координатор 15.10): при удалении досылки нет — users/{A} удаляется, запись могла бы пересечься со стиранием.
  it('удаление аккаунта → skip_delete, в документ ничего не пишется', async () => {
    beginAccountGeneration('stable_A');
    void updateServerPushPrefs({ streak: false, offers: true, league: false });
    expect(cancelPendingServerPushPrefsForAccountDelete()).toBe('skip_delete');
    await flushServerPushPrefsForTests();
    expect(mockSet).not.toHaveBeenCalled();
    expect(cancelPendingServerPushPrefsForAccountDelete()).toBe('none');
  });

  it('без отложенной записи выход ничего не ждёт', async () => {
    beginAccountGeneration('stable_A');
    await expect(flushPendingServerPushPrefsBeforeOwnerChange()).resolves.toBe('none');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('медленная запись — потолок, выход идёт дальше', async () => {
    beginAccountGeneration('stable_A');
    mockSet.mockImplementationOnce(() => new Promise<undefined>(() => undefined));
    void updateServerPushPrefs({ streak: true, offers: true, league: true });
    await expect(flushPendingServerPushPrefsBeforeOwnerChange(30)).resolves.toBe('timeout');
  });
});
