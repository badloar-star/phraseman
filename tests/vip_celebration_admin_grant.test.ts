import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  consumeVipCelebration,
  getPendingVipCelebrationMarker,
  isVipCelebrationPending,
  markVipCelebrationPending,
  processVipGrantForCelebration,
} from '../app/vip_celebration_state';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('vip_celebration_state', () => {
  it('shows a pending VIP celebration for a new admin VIP grant', async () => {
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(true);
    await expect(getPendingVipCelebrationMarker()).resolves.toBe('1736000000000');
  });

  it('does not show the same VIP grant twice after consumption', async () => {
    await markVipCelebrationPending('1736000000000');
    await consumeVipCelebration('1736000000000');
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
  });
});
