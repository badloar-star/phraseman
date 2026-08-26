import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  claimLocalLevelSpin,
  grantLocalDevSpin,
  grantLocalLessonCompletionSpin,
  LOCAL_LEVEL_SPIN_STATE_KEY,
} from '../app/local_level_spins';
import { LEVEL_SPIN_GIFT_JOURNAL_KEY } from '../app/level_up_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111') }));

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
