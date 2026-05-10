import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCelebrationPending,
  markCelebrationPending,
  consumeCelebration,
  getLastSeenMarker,
  processAdminGrantForCelebration,
} from '../app/premium_celebration_state';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('premium_celebration_state — pending/seen lifecycle', () => {
  it('starts with no pending', async () => {
    await expect(isCelebrationPending()).resolves.toBe(false);
  });

  it('markCelebrationPending → pending=true', async () => {
    await markCelebrationPending();
    await expect(isCelebrationPending()).resolves.toBe(true);
  });

  it('consumeCelebration → pending=false, seen marker stored', async () => {
    await markCelebrationPending();
    await consumeCelebration('iap_yearly_2026');
    await expect(isCelebrationPending()).resolves.toBe(false);
    await expect(getLastSeenMarker()).resolves.toBe('iap_yearly_2026');
  });

  it('getLastSeenMarker returns null if never consumed', async () => {
    await expect(getLastSeenMarker()).resolves.toBeNull();
  });
});

describe('premium_celebration_state — processAdminGrantForCelebration', () => {
  it('does nothing if grantAt is null/undefined/empty/0', async () => {
    await processAdminGrantForCelebration(null);
    await processAdminGrantForCelebration(undefined);
    await processAdminGrantForCelebration('');
    await processAdminGrantForCelebration('0');
    await expect(isCelebrationPending()).resolves.toBe(false);
  });

  it('marks pending on FIRST grant detection (no previous seen)', async () => {
    await processAdminGrantForCelebration('1735000000000');
    await expect(isCelebrationPending()).resolves.toBe(true);
  });

  it('does NOT re-mark pending if grantAt matches last seen', async () => {
    await markCelebrationPending();
    await consumeCelebration('1735000000000');
    await processAdminGrantForCelebration('1735000000000');
    await expect(isCelebrationPending()).resolves.toBe(false);
  });

  it('marks pending when admin re-grants with newer timestamp', async () => {
    await markCelebrationPending();
    await consumeCelebration('1735000000000');
    // Admin re-granted premium → new timestamp.
    await processAdminGrantForCelebration('1736000000000');
    await expect(isCelebrationPending()).resolves.toBe(true);
  });

  it('survives the IAP+admin-grant sequence (IAP first, then admin newer)', async () => {
    // 1. User bought IAP.
    await markCelebrationPending();
    await consumeCelebration('iap_yearly_purchase_1');
    await expect(isCelebrationPending()).resolves.toBe(false);
    // 2. Admin later grants premium (different marker).
    await processAdminGrantForCelebration('1736000000000');
    await expect(isCelebrationPending()).resolves.toBe(true);
  });
});
