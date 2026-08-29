import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { getCanonicalUserId } from '../app/user_id_policy';
import { loadRunesServerStats, peekRunesServerStats } from '../app/runes_wallet_stats';

const mockFirestoreGet = jest.fn();

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));
jest.mock('@react-native-firebase/firestore', () => {
  const firestore = () => ({
    collection: () => ({
      doc: () => ({ get: (...args: unknown[]) => mockFirestoreGet(...args) }),
    }),
  });
  return { __esModule: true, default: firestore };
});

test('a late Firestore response from account A cannot become account B stats', async () => {
  __resetAccountGenerationForTests();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (getCanonicalUserId as jest.Mock).mockResolvedValue('account-a');
  let resolveFetch!: (snapshot: unknown) => void;
  mockFirestoreGet.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

  beginAccountGeneration('account-a');
  const pendingA = loadRunesServerStats();
  await waitFor(() => expect(mockFirestoreGet).toHaveBeenCalledTimes(1));

  beginAccountGeneration('account-b');
  resolveFetch({
    exists: true,
    data: () => ({ stars: { weekKey: '2026-W35', weekEarned: 77, earnedTotal: 77 } }),
  });

  await expect(pendingA).resolves.toBeNull();
  expect(peekRunesServerStats()).toBeNull();
});
