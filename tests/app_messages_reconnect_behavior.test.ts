import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'account-A'),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

import firestore from '@react-native-firebase/firestore';
import {
  dismissAppMessage,
  refreshAppMessagesSnapshotOnce,
} from '../app/app_messages';

describe('app-message reconnect behavior', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (firestore as any).__resetTestState();
  });

  it('flushes an offline tombstone before the normal refresh TTL check', async () => {
    await dismissAppMessage('message-1');
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    const callsBeforeReconnect = (firestore as any).__testState.runTransactionCalls;

    await dismissAppMessage('message-2');
    const callsAfterOfflineDelete = (firestore as any).__testState.runTransactionCalls;
    await refreshAppMessagesSnapshotOnce({ minIntervalMs: 3 * 60 * 60_000, nowMs: 10_001 });

    expect(callsAfterOfflineDelete).toBeGreaterThan(callsBeforeReconnect);
    expect((firestore as any).__testState.runTransactionCalls).toBeGreaterThan(callsAfterOfflineDelete);
  });
});
