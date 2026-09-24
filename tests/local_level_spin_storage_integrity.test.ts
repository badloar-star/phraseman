import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { emitAppEvent } from '../app/events';
import {
  claimLocalLevelSpin,
  grantLocalDailyJourneySpins,
  grantLocalDevSpin,
  grantLocalLessonCompletionSpin,
  LOCAL_LEVEL_SPIN_STATE_KEY,
} from '../app/local_level_spins';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
} from '../app/level_up_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
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

// зачем (PM-047, владелец): спин убран как механика (D09, R046/R047) —
// grantLocal*Spin* больше НИЧЕГО не выдают и НЕ пишут в хранилище (см. app/
// local_level_spins.ts, комментарий у grantLocalLevelSpins). Хранилище уже
// выданных спинов (issuedCreditIds/credits) и claim-путь (claimLocalLevelSpin,
// который расходует уже лежащие в кошельке кредиты) остаются работоспособны
// и нетронуты — эти тесты проверяют именно их, а не выдачу.
test.each([
  '{bad',
  JSON.stringify({ owner: 'account-b', credits: [] }),
  JSON.stringify({ owner: 'account-a', credits: {} }),
])('grant functions never write, so a corrupt local authority stays exactly as it was: %s', async (raw) => {
  storage[stateKey] = raw;
  await expect(grantLocalLessonCompletionSpin(1, 'en', captureAccountGeneration())).resolves.toBe(false);
  expect(storage[stateKey]).toBe(raw);
});

test.each(['{bad', '{}', '[{}]'])('grantLocalDevSpin never writes; claim still guards a malformed gift journal: %s', async (rawJournal) => {
  // зачем: dev-кнопка «+1 спин» тоже ничего не выдаёт (PM-047) — false, ноль
  // побочных эффектов, никакого storage[stateKey] для последующей проверки.
  await expect(grantLocalDevSpin(captureAccountGeneration())).resolves.toBe(false);
  expect(storage[stateKey]).toBeUndefined();
  storage[LEVEL_SPIN_GIFT_JOURNAL_KEY] = rawJournal;
  // claimLocalLevelSpin расходует уже лежащие в кошельке кредиты — этот путь
  // не тронут PM-047 и обязан по-прежнему отказывать на битом журнале подарков.
  await expect(claimLocalLevelSpin()).rejects.toThrow('local_spin_empty');
  expect(storage[LEVEL_SPIN_GIFT_JOURNAL_KEY]).toBe(rawJournal);
});

test('lesson completion never mints a spin, no matter how many lessons are completed', async () => {
  const token = captureAccountGeneration();
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    for (let lesson = 1; lesson <= 162; lesson += 1) {
      await expect(grantLocalLessonCompletionSpin(lesson, 'en', token)).resolves.toBe(false);
    }
  } finally {
    randomSpy.mockRestore();
  }
  // Механика выдачи отключена целиком: ни один прогон не создал состояние.
  expect(storage[stateKey]).toBeUndefined();
});

test('Daily Journey spin grants are no-ops: nothing credited, nothing written, repeat calls stay false', async () => {
  const token = captureAccountGeneration();
  const claimId = 'daily-journey-gift-claim:daily-spin-five-0001';

  await expect(grantLocalDailyJourneySpins(claimId, 5, token)).resolves.toBe(false);
  await expect(grantLocalDailyJourneySpins(claimId, 5, token)).resolves.toBe(false);

  expect(storage[stateKey]).toBeUndefined();
  expect(emitAppEvent).not.toHaveBeenCalled();
});

test('Daily Journey grant does not touch a pre-existing balance cache', async () => {
  const token = captureAccountGeneration();
  const priorCache = JSON.stringify({ owner: 'account-a', balance: 2 });
  storage[LEVEL_SPIN_BALANCE_CACHE_KEY] = priorCache;

  await expect(grantLocalDailyJourneySpins(
    'daily-journey-gift-claim:daily-spin-after-migration-0001',
    1,
    token,
  )).resolves.toBe(false);

  // Уже лежавший на диске баланс остаётся нетронутым — выдача не пишет ничего.
  expect(storage[LEVEL_SPIN_BALANCE_CACHE_KEY]).toBe(priorCache);
});
