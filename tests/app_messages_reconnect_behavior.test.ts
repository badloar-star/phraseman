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

  // зачем (смета Ядра e72a5417b №2, 13.10): колокольчик открывает шторку с интервалом 60 с — повторное открытие в пределах минуты
  // берёт кэш (0 чтений), позже — снова сеть; исход виден вызывающему для лога [INBOX-REFRESH].
  it('reports the outcome: cache inside 60 s of the last read, network attempt after it', async () => {
    // Отметка последнего чтения — как её пишет удачное чтение сети (ключ владельца account-A).
    await AsyncStorage.setItem('app_messages_last_background_refresh_ms_v2:account-A', '100000');
    const outcomes: Array<{ source: string; ageMs?: number; minIntervalMs?: number }> = [];
    const onOutcome = (outcome: { source: string; ageMs?: number; minIntervalMs?: number }) => { outcomes.push(outcome); };
    await refreshAppMessagesSnapshotOnce({ minIntervalMs: 60_000, nowMs: 130_000, onOutcome });
    await refreshAppMessagesSnapshotOnce({ minIntervalMs: 60_000, nowMs: 161_000, onOutcome });
    expect(outcomes[0]).toEqual({ source: 'cache_interval', ageMs: 30_000, minIntervalMs: 60_000 });
    // после минуты — попытка сети (в тестовой подмене Firestore нет модульного getDocs → исход error, кэш возвращается)
    expect(['network', 'error']).toContain(outcomes[1].source);
    expect(outcomes).toHaveLength(2);
  });
});
