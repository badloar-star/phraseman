// зачем (E-1, R1_SETTINGS_OPTIMISTIC_UI, координатор 12.10): быстрые переключения тумблеров пушей — одна запись в облако
// с последним значением, а не параллельные записи, где поздний ответ мог победить свежее значение.
const mockSet = jest.fn(async (_data: unknown, _opts: unknown) => undefined);
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: () => ({ set: (data: unknown, opts: unknown) => mockSet(data, opts) }) }) }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: async () => 'stable_test_user',
  ensureStableAuthLinkForStableId: async () => true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PUSH_PREFS_WRITE_DEBOUNCE_MS,
  flushServerPushPrefsForTests,
  updateServerPushPrefs,
} from '../app/push_token_registration';

describe('updateServerPushPrefs — склейка быстрых переключений (E-1)', () => {
  beforeEach(async () => {
    mockSet.mockClear();
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
    await AsyncStorage.removeItem('server_push_prefs_last_written');
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('пауза склейки — 1,5 с', () => {
    expect(PUSH_PREFS_WRITE_DEBOUNCE_MS).toBe(1_500);
  });

  it('пять быстрых тапов → одна запись с последним значением', async () => {
    void updateServerPushPrefs({ streak: true, offers: true, league: true });
    void updateServerPushPrefs({ streak: false, offers: true, league: true });
    void updateServerPushPrefs({ streak: true, offers: false, league: true });
    void updateServerPushPrefs({ streak: false, offers: false, league: true });
    void updateServerPushPrefs({ streak: false, offers: false, league: false });
    expect(mockSet).not.toHaveBeenCalled();
    await flushServerPushPrefsForTests();
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0]![0]).toEqual({ pushPrefs: { streak: false, offers: false, league: false } });
  });

  it('то же значение повторно — без второй записи (кэш)', async () => {
    void updateServerPushPrefs({ streak: true, offers: false, league: true });
    await flushServerPushPrefsForTests();
    void updateServerPushPrefs({ streak: true, offers: false, league: true });
    await flushServerPushPrefsForTests();
    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});
