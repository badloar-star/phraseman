import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  claimLocalLevelSpin,
  grantLocalDailyJourneySpins,
  grantLocalDevSpin,
  grantLocalLessonCompletionSpin,
  LOCAL_LEVEL_SPIN_STATE_KEY,
} from '../app/local_level_spins';
import { LEVEL_SPIN_GIFT_JOURNAL_KEY } from '../app/level_up_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
  randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

const storage: Record<string, string> = {};
const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
});

test.each([
  '{bad',
  JSON.stringify({ owner: 'account-b', credits: [] }),
  JSON.stringify({ owner: 'account-a', credits: {} }),
])('never overwrites or mints from corrupt local authority: %s', async (raw) => {
  storage[stateKey] = raw;
  await expect(grantLocalLessonCompletionSpin(1, 'en', captureAccountGeneration()))
    .rejects.toThrow('local_spin_state_corrupt');
  expect(storage[stateKey]).toBe(raw);
});

test.each(['{bad', '{}', '[{}]'])('never consumes a credit or overwrites a malformed gift journal: %s', async (rawJournal) => {
  await expect(grantLocalDevSpin(captureAccountGeneration())).resolves.toBe(true);
  const before = storage[stateKey];
  storage[LEVEL_SPIN_GIFT_JOURNAL_KEY] = rawJournal;
  await expect(claimLocalLevelSpin()).rejects.toThrow('local_spin_gift_journal_corrupt');
  expect(storage[stateKey]).toBe(before);
  expect(storage[LEVEL_SPIN_GIFT_JOURNAL_KEY]).toBe(rawJournal);
});

test('a replay cannot mint again after more than 160 later source awards', async () => {
  const token = captureAccountGeneration();
  await expect(grantLocalLessonCompletionSpin(1, 'en', token)).resolves.toBe(true);
  for (let lesson = 2; lesson <= 162; lesson += 1) {
    await expect(grantLocalLessonCompletionSpin(lesson, 'en', token)).resolves.toBe(true);
  }
  await expect(grantLocalLessonCompletionSpin(1, 'en', token)).resolves.toBe(false);
  const state = JSON.parse(storage[stateKey]!) as { issuedCreditIds: string[] };
  expect(state.issuedCreditIds).toHaveLength(162);
  expect(state.issuedCreditIds[0]).toBe('local_spin_lesson_en-1');
});

test('Daily Journey grants five durable credits once for one stable claim id', async () => {
  const token = captureAccountGeneration();
  const claimId = 'daily-journey-gift-claim:daily-spin-five-0001';

  await expect(grantLocalDailyJourneySpins(claimId, 5, token)).resolves.toBe(true);
  await expect(grantLocalDailyJourneySpins(claimId, 5, token)).resolves.toBe(true);

  const state = JSON.parse(storage[stateKey]!) as {
    credits: { id: string }[];
    issuedCreditIds: string[];
  };
  expect(state.credits).toHaveLength(5);
  expect(state.issuedCreditIds).toEqual(Array.from(
    { length: 5 },
    (_, index) => `local_spin_daily_journey_${'a'.repeat(40)}_${index + 1}`,
  ));
});

test('Daily Journey grant fails closed when storage silently drops the authoritative owner state', async () => {
  const token = captureAccountGeneration();
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      if (key !== stateKey) storage[key] = value;
    });
  });

  await expect(grantLocalDailyJourneySpins(
    'daily-journey-gift-claim:daily-spin-silent-drop-0001',
    2,
    token,
  )).rejects.toThrow('local_daily_journey_spin_state_not_durable');
  expect(storage[stateKey]).toBeUndefined();
});

test('Daily Journey retry trusts owner authority after state-only partial write and never duplicates', async () => {
  const token = captureAccountGeneration();
  let failAfterOwnerWrite = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    const [ownerPair] = pairs;
    storage[ownerPair[0]] = ownerPair[1];
    if (failAfterOwnerWrite) {
      failAfterOwnerWrite = false;
      throw new Error('simulated_cache_write_failure');
    }
    pairs.slice(1).forEach(([key, value]) => { storage[key] = value; });
  });
  const claimId = 'daily-journey-gift-claim:daily-spin-partial-0001';

  await expect(grantLocalDailyJourneySpins(claimId, 2, token))
    .rejects.toThrow('simulated_cache_write_failure');
  await expect(grantLocalDailyJourneySpins(claimId, 2, token)).resolves.toBe(true);

  const state = JSON.parse(storage[stateKey]!) as { credits: { id: string }[] };
  expect(state.credits).toHaveLength(2);
});
