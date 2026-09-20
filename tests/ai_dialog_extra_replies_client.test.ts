import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from '@react-native-firebase/functions';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  buyDialogExtraRepliesLocally,
  dialogExtraRepliesEnvelopeKey,
  dialogExtraRepliesPreparedKey,
  dialogExtraRepliesSyncMarkerKey,
  syncDialogExtraRepliesPurchase,
} from '../app/ai_dialog_extra_replies_client';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn(async () => {}) }));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let visibleProgress = { stars: 600, starsEarnedTotal: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 600, starsEarnedTotal: 0 };
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => keys.map((key) => [key, storage[key] ?? null]));
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as { readPhoneStateStarCreditState: jest.Mock };
  bridge.readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const next = updater({ progress: { ...visibleProgress } });
    if (next.progress) visibleProgress = { ...visibleProgress, ...next.progress };
  });
});

test('commits debit and +10 grant before network, then replays the same request idempotently', async () => {
  const token = captureAccountGeneration();
  const requestId = 'der1234567890123456';
  await expect(buyDialogExtraRepliesLocally(token, requestId)).resolves.toEqual({
    ok: true, balance: 300, repliesGranted: 10,
  });
  expect(httpsCallable).not.toHaveBeenCalled();
  expect(visibleProgress.stars).toBe(300);
  expect(JSON.parse(storage[dialogExtraRepliesEnvelopeKey('account-a', requestId)])).toMatchObject({
    schemaVersion: 'client-dialog-extra-replies-envelope.v2',
    operation: { requestId, balanceBefore: 600, balanceAfter: 300, repliesGranted: 10 },
  });
  expect(JSON.parse(storage[dialogExtraRepliesSyncMarkerKey('account-a', requestId)])).toEqual({
    schemaVersion: 'client-dialog-extra-replies-sync.v1', status: 'pending',
    operationId: `dialog_extra_replies:${requestId}`,
  });

  await expect(buyDialogExtraRepliesLocally(token, requestId)).resolves.toEqual({
    ok: true, balance: 300, repliesGranted: 10,
  });
  expect(visibleProgress.stars).toBe(300);
});

test('prepared envelope recovers a crash during materialization without a second debit', async () => {
  const token = captureAccountGeneration();
  const requestId = 'der1234567890123456';
  let injected = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (!injected && pairs.some(([key]) => key === dialogExtraRepliesEnvelopeKey('account-a', requestId))) {
      injected = true;
      throw new Error('fault_after_prepare');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(buyDialogExtraRepliesLocally(token, requestId)).rejects.toThrow('fault_after_prepare');
  expect(storage[dialogExtraRepliesPreparedKey('account-a')]).toBeDefined();

  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(buyDialogExtraRepliesLocally(token, requestId)).resolves.toMatchObject({ ok: true, balance: 300 });
  expect(storage[dialogExtraRepliesPreparedKey('account-a')]).toBeUndefined();
  expect(visibleProgress.stars).toBe(300);
});

test('partial materialization with operation and projection written resumes without a second debit', async () => {
  const token = captureAccountGeneration();
  const requestId = 'der1234567890123456';
  let injected = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (!injected && pairs.some(([key]) => key === dialogExtraRepliesEnvelopeKey('account-a', requestId))) {
      injected = true;
      for (const [key, value] of pairs.slice(0, 2)) storage[key] = value;
      throw new Error('fault_after_projection');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(buyDialogExtraRepliesLocally(token, requestId)).rejects.toThrow('fault_after_projection');
  expect(storage[dialogExtraRepliesPreparedKey('account-a')]).toBeDefined();

  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(buyDialogExtraRepliesLocally(token, requestId))
    .resolves.toEqual({ ok: true, balance: 300, repliesGranted: 10 });
  expect(visibleProgress.stars).toBe(300);
});

test('prepared envelope keeps its original identity after A to B to A account generations', async () => {
  const originalToken = captureAccountGeneration();
  const requestId = 'der1234567890123456';
  let injected = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (!injected && pairs.some(([key]) => key === dialogExtraRepliesEnvelopeKey('account-a', requestId))) {
      injected = true;
      throw new Error('fault_after_prepare');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(buyDialogExtraRepliesLocally(originalToken, requestId)).rejects.toThrow('fault_after_prepare');
  const originalEnvelope = JSON.parse(storage[dialogExtraRepliesPreparedKey('account-a')]);
  expect(originalEnvelope.operation.accountGeneration).toBe(originalToken.generation);

  beginAccountGeneration('account-b');
  beginAccountGeneration('account-a');
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  await expect(buyDialogExtraRepliesLocally(captureAccountGeneration(), requestId))
    .resolves.toEqual({ ok: true, balance: 300, repliesGranted: 10 });
  expect(JSON.parse(storage[dialogExtraRepliesEnvelopeKey('account-a', requestId)]).operation)
    .toEqual(originalEnvelope.operation);
  expect(visibleProgress.stars).toBe(300);
});

test('sync validates the exact operation acknowledgement and stores a per-operation quota marker', async () => {
  const token = captureAccountGeneration();
  const requestId = 'der1234567890123456';
  await buyDialogExtraRepliesLocally(token, requestId);
  const envelope = JSON.parse(storage[dialogExtraRepliesEnvelopeKey('account-a', requestId)]);
  const transport = jest.fn(async () => ({ data: {
    ok: true,
    operationId: envelope.operation.operationId,
    requestFingerprint: envelope.operation.requestFingerprint,
    repliesGranted: 10,
    priceRunes: 300,
    quota: { remainingQuota: 10, resetAtMs: Date.UTC(2026, 8, 21), quotaVersion: 1 },
  } }));
  (httpsCallable as jest.Mock).mockReturnValue(transport);

  await expect(syncDialogExtraRepliesPurchase(token)).resolves.toMatchObject({ synced: 1, pending: 0 });
  expect(transport).toHaveBeenCalledWith({ stableId: 'account-a', operation: envelope.operation });
  expect(JSON.parse(storage[dialogExtraRepliesSyncMarkerKey('account-a', requestId)])).toMatchObject({
    status: 'synced', operationId: envelope.operation.operationId,
    quota: { remainingQuota: 10, quotaVersion: 1 },
  });
  expect(visibleProgress.stars).toBe(300);
});

test('account switch cannot expose A purchase to B and returning A syncs the original operation', async () => {
  const requestId = 'der1234567890123456';
  await buyDialogExtraRepliesLocally(captureAccountGeneration(), requestId);
  const envelope = JSON.parse(storage[dialogExtraRepliesEnvelopeKey('account-a', requestId)]);
  const transport = jest.fn(async () => ({ data: {
    ok: true,
    operationId: envelope.operation.operationId,
    requestFingerprint: envelope.operation.requestFingerprint,
    repliesGranted: 10,
    priceRunes: 300,
    quota: { remainingQuota: 10, resetAtMs: Date.UTC(2026, 8, 21), quotaVersion: 1 },
  } }));
  (httpsCallable as jest.Mock).mockReturnValue(transport);

  beginAccountGeneration('account-b');
  await expect(syncDialogExtraRepliesPurchase(captureAccountGeneration()))
    .resolves.toEqual({ synced: 0, pending: 0, latestQuota: null });
  expect(transport).not.toHaveBeenCalled();

  beginAccountGeneration('account-a');
  await expect(syncDialogExtraRepliesPurchase(captureAccountGeneration()))
    .resolves.toMatchObject({ synced: 1, pending: 0 });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport).toHaveBeenCalledWith({ stableId: 'account-a', operation: envelope.operation });
});

test('a later sync failure leaves only the unsynced operation pending and retry skips history', async () => {
  const token = captureAccountGeneration();
  const firstId = 'der1234567890123456';
  const secondId = 'der1234567890123457';
  await buyDialogExtraRepliesLocally(token, firstId);
  await buyDialogExtraRepliesLocally(token, secondId);
  const responseFor = (requestId: string, quotaVersion: number) => {
    const operation = JSON.parse(storage[dialogExtraRepliesEnvelopeKey('account-a', requestId)]).operation;
    return { data: {
      ok: true,
      operationId: operation.operationId,
      requestFingerprint: operation.requestFingerprint,
      repliesGranted: 10,
      priceRunes: 300,
      quota: { remainingQuota: quotaVersion * 10, resetAtMs: Date.UTC(2026, 8, 21), quotaVersion },
    } };
  };
  const firstTransport = jest.fn()
    .mockResolvedValueOnce(responseFor(firstId, 1))
    .mockRejectedValueOnce(new Error('network_down'));
  (httpsCallable as jest.Mock).mockReturnValue(firstTransport);
  await expect(syncDialogExtraRepliesPurchase(token)).resolves.toMatchObject({ synced: 0, pending: 1 });
  expect(firstTransport).toHaveBeenCalledTimes(2);

  const retryTransport = jest.fn().mockResolvedValueOnce(responseFor(secondId, 2));
  (httpsCallable as jest.Mock).mockReturnValue(retryTransport);
  await expect(syncDialogExtraRepliesPurchase(token)).resolves.toMatchObject({ synced: 1, pending: 0 });
  expect(retryTransport).toHaveBeenCalledTimes(1);
  expect(retryTransport.mock.calls[0][0].operation.requestId).toBe(secondId);
});
