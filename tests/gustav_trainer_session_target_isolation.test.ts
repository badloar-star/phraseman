import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  consumeTrainerSessionEntry,
  getFreeSessionsLeftToday,
  reserveTrainerSessionEntry,
} from '../app/trainer_session';
import {
  assertTargetKey,
  trainerFreeSessionKey,
  trainerSessionEntryKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));

const storage: Record<string, string> = {};

describe('Gustav trainer session target isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(storage).forEach((key) => delete storage[key]);
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      storage[key] = value;
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete storage[key];
    });
  });

  it('keeps English trainer session limit on legacy keys for compatibility', async () => {
    // Дефолт = 2 бесплатные сессии/день (remote_flags). После каждого consume — на одну меньше.
    await expect(getFreeSessionsLeftToday('en')).resolves.toBe(2);
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false, 'en')).resolves.toBe(true);
    expect(storage.trainer_session_entry_v1).toContain('/trainer_words_session');
    await expect(consumeTrainerSessionEntry('/trainer_words_session', 'en')).resolves.toBe(true);
    expect(storage.trainer_free_session_v1).toContain('"count":1');
    await expect(getFreeSessionsLeftToday('en')).resolves.toBe(1);
    // Вторая сессия — последняя бесплатная.
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false, 'en')).resolves.toBe(true);
    await expect(consumeTrainerSessionEntry('/trainer_words_session', 'en')).resolves.toBe(true);
    expect(storage.trainer_free_session_v1).toContain('"count":2');
    await expect(getFreeSessionsLeftToday('en')).resolves.toBe(0);
  });

  it('blocks French trainer session storage while the French trainer source gate is closed', async () => {
    await expect(getFreeSessionsLeftToday('fr')).resolves.toBe(0);
    await expect(reserveTrainerSessionEntry('/trainer_words_session', false, 'fr')).resolves.toBe(false);
    await expect(consumeTrainerSessionEntry('/trainer_words_session', 'fr')).resolves.toBe(false);

    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('trainer_free_session_v1');
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('trainer_session_entry_v1', expect.any(String));
    expect(storage[trainerFreeSessionKey('fr')]).toBeUndefined();
    expect(storage[trainerSessionEntryKey('fr')]).toBeUndefined();
  });

  it('reserves scoped French keys for future approved trainer packets', () => {
    expect(trainerFreeSessionKey('en')).toBe('trainer_free_session_v1');
    expect(trainerSessionEntryKey('en')).toBe('trainer_session_entry_v1');
    expect(trainerFreeSessionKey('fr')).toBe('trainer_practice_v2::fr::trainer_free_session_v1');
    expect(trainerSessionEntryKey('fr')).toBe('trainer_practice_v2::fr::trainer_session_entry_v1');

    expect(() => assertTargetKey('trainer_free_session_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('trainer_session_entry_v1')).toThrow(/Raw target-sensitive key/);
    expect(assertTargetKey(trainerFreeSessionKey('fr'))).toBe(trainerFreeSessionKey('fr'));
    expect(assertTargetKey(trainerSessionEntryKey('fr'))).toBe(trainerSessionEntryKey('fr'));
  });
});
