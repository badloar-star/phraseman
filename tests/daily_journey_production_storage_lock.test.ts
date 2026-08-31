import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  dailyJourneyProductionIntentStorageKey,
  dailyJourneyProductionPresentedStorageKey,
  writePreparedIntent,
  writePresentedReceipt,
} from '../app/daily_journey_production_host';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) => (
    createHash('sha256').update(value).digest('hex')
  ),
}));

const storage: Record<string, string> = {};
const owner = 'owner-a';
const ownerHash = 'a'.repeat(64);

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
});

it.each(['presented', 'intent'] as const)(
  'does not allow a queued old-account %s write to resurrect data after deletion wipe',
  async (kind) => {
    const token = beginAccountGeneration(owner);
    let wipeEntered!: () => void;
    let releaseWipe!: () => void;
    const entered = new Promise<void>((resolve) => { wipeEntered = resolve; });
    const release = new Promise<void>((resolve) => { releaseWipe = resolve; });
    const key = kind === 'presented'
      ? dailyJourneyProductionPresentedStorageKey(owner)
      : dailyJourneyProductionIntentStorageKey(owner);
    const wipe = withAccountTransitionLock(async () => {
      wipeEntered();
      await release;
      beginAccountGeneration('owner-b');
      await AsyncStorage.removeItem(key);
    });
    await entered;

    const lateWrite = kind === 'presented'
      ? writePresentedReceipt(
        owner,
        `daily_journey:${ownerHash}:c1:d1:2026-08-31`,
        token,
      )
      : writePreparedIntent({
        ownerStableId: owner,
        baselineOperationId: null,
        localDayKey: '2026-08-31',
        freezeUseOperationIds: [],
        input: {
          operationId: `daily_journey:${ownerHash}:c1:d1:2026-08-31`,
          source: 'daily_journey',
          cycle: 1,
          day: 1,
          reward: { kind: 'pearls', amount: 10 },
        },
      }, token);
    releaseWipe();

    await wipe;
    await expect(lateWrite).rejects.toThrow('daily_journey_production_account_stale');
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
  },
);
