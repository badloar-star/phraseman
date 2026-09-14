const mockMemory = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockMemory.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => { mockMemory.set(key, value); });
const mockRemoveItem = jest.fn(async (key: string) => { mockMemory.delete(key); });
const mockGetAllKeys = jest.fn(async () => [...mockMemory.keys()]);
const mockReadQuotaReceipts = jest.fn();
const mockReadEnergyStatus = jest.fn();
const mockCreateEnergyIntent = jest.fn((kind: string, subjectId: string, attemptId: string) => ({
  operationId: `energy:${kind}:${attemptId}`,
  grant: { kind, subjectId, attemptId },
}));

let mockActiveStableUid = 'account-a';

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = { getItem: mockGetItem, setItem: mockSetItem, removeItem: mockRemoveItem, getAllKeys: mockGetAllKeys };
  return { ...api, default: api };
});
jest.mock('../app/account_generation', () => ({
  isCurrentAccountGeneration: (token: { stableId: string | null; phase: string }) => (
    token.phase === 'active' && token.stableId === mockActiveStableUid
  ),
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));
jest.mock('../app/revenue_quota_store', () => ({
  readFlashcardTrainingQuotaReceipts: (...args: unknown[]) => mockReadQuotaReceipts(...args),
}));
jest.mock('../app/energy_session_operation_ledger', () => ({
  createEnergySessionIntent: (...args: unknown[]) => mockCreateEnergyIntent(...args as [string, string, string]),
  readEnergySessionStartStatus: (...args: unknown[]) => mockReadEnergyStatus(...args),
}));

import {
  FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS,
  abandonFlashcardTrainingPendingGrant,
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  claimFlashcardTrainingPendingGrantStart,
  discardFlashcardTrainingPendingGrant,
  flashcardTrainingPendingGrantStorageKey,
  maintainFlashcardTrainingPendingGrants,
  markFlashcardTrainingEnergyCharged,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  readFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  withFlashcardTrainingPendingGrantLifecycle,
  type FlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantScope,
} from '../app/flashcard_training_pending_grant';

const account = (
  stableUid = 'account-a',
  lineage = 7,
  generation = 1,
): FlashcardTrainingPendingGrantAccount => ({
  stableUid,
  lineage,
  runtimeToken: { stableId: stableUid, generation, phase: 'active' },
});

const scope = (
  overrides: Partial<FlashcardTrainingPendingGrantScope> = {},
): FlashcardTrainingPendingGrantScope => ({
  mode: 'swipe',
  studyTarget: 'en',
  contentLang: 'ru',
  deckKeys: ['saved', 'custom:one'],
  daily: false,
  sessionSize: 10,
  preset: 'trainer',
  ...overrides,
});

const manifest = (mode: FlashcardTrainingPendingGrantScope['mode'] = 'swipe') => ({
  schemaVersion: 'flashcard-training-manifest.v1' as const,
  mode,
  payload: { orderedCardIds: ['card-1', 'card-2'], seed: 'seed-1' },
});

const claimRecord = async (
  record: { fingerprint: string; receiptId: string },
  claimId = 'mount-test',
) => claimFlashcardTrainingPendingGrantStart(
  account(), record.fingerprint, record.receiptId, claimId, 105,
);

const makeClaimPreviousRuntime = (receiptId: string) => {
  const key = flashcardTrainingPendingGrantStorageKey('account-a', 7);
  const journal = JSON.parse(String(mockMemory.get(key))) as {
    records: Array<{ receiptId: string; startInProgress: null | { runtimeOwnerId: string } }>;
  };
  const record = journal.records.find((item) => item.receiptId === receiptId);
  if (!record?.startInProgress) throw new Error('expected claimed record');
  record.startInProgress.runtimeOwnerId = 'pending-runtime:previous';
  mockMemory.set(key, JSON.stringify(journal));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMemory.clear();
  mockActiveStableUid = 'account-a';
  mockReadQuotaReceipts.mockResolvedValue({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] });
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });
});

test('PREPARED is durable and an exact remount reuses receipt, attempt, energy identity and original manifest', async () => {
  const first = await prepareFlashcardTrainingPendingGrant({
    account: account(),
    scope: scope({ deckKeys: ['custom:one', 'saved', 'saved'] }),
    manifest: manifest(),
    attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1',
    energyOperationId: 'energy:flashcards_swipe:attempt-1',
    energyEpoch: 'boot-1',
    nowMs: 100,
  });
  expect(first).toEqual(expect.objectContaining({ status: 'prepared' }));
  if (first.status !== 'prepared') throw new Error('expected prepared');

  const remount = await prepareFlashcardTrainingPendingGrant({
    account: account(),
    scope: scope({ deckKeys: ['saved', 'custom:one'] }),
    manifest: { ...manifest(), payload: { orderedCardIds: ['different'], seed: 'seed-2' } },
    attemptId: 'attempt-2',
    receiptId: 'swipe:attempt-2',
    energyOperationId: 'energy:flashcards_swipe:attempt-2',
    energyEpoch: 'boot-2',
    nowMs: 200,
  });

  expect(remount).toEqual({ status: 'reused', record: first.record });
  expect(mockMemory.has(flashcardTrainingPendingGrantStorageKey('account-a', 7))).toBe(true);
});

test.each([
  ['deck', scope({ deckKeys: ['saved', 'custom:two'] })],
  ['mode', scope({ mode: 'recall' })],
  ['language', scope({ contentLang: 'uk' })],
  ['target', scope({ studyTarget: 'es' })],
  ['daily', scope({ daily: true })],
  ['size', scope({ sessionSize: 20 })],
  ['preset', scope({ preset: 'daily' })],
])('a different %s scope never inherits the pending grant', async (_label, otherScope) => {
  const first = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'boot-1', nowMs: 100,
  });
  const second = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: otherScope,
    manifest: manifest(otherScope.mode), attemptId: 'attempt-2',
    receiptId: `${otherScope.mode}:attempt-2`, energyOperationId: `energy:${otherScope.mode}:attempt-2`,
    energyEpoch: 'boot-1', nowMs: 200,
  });

  expect(first.status).toBe('prepared');
  expect(second.status).toBe('prepared');
  if (first.status === 'prepared' && second.status === 'prepared') {
    expect(second.record.fingerprint).not.toBe(first.record.fingerprint);
    expect(second.record.receiptId).toContain('attempt-2');
  }
});

test('account and lineage use isolated keys and a stale account fails closed', async () => {
  await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-a',
    receiptId: 'swipe:attempt-a', energyOperationId: 'energy:swipe:attempt-a', energyEpoch: 'boot-1', nowMs: 100,
  });

  mockActiveStableUid = 'account-b';
  const otherAccount = await prepareFlashcardTrainingPendingGrant({
    account: account('account-b', 7, 2), scope: scope(), manifest: manifest(), attemptId: 'attempt-b',
    receiptId: 'swipe:attempt-b', energyOperationId: 'energy:swipe:attempt-b', energyEpoch: 'boot-2', nowMs: 200,
  });
  expect(otherAccount.status).toBe('prepared');
  expect(mockMemory.has(flashcardTrainingPendingGrantStorageKey('account-a', 7))).toBe(true);
  expect(mockMemory.has(flashcardTrainingPendingGrantStorageKey('account-b', 7))).toBe(true);

  const stale = await readFlashcardTrainingPendingGrant(account('account-a', 7, 1), scope());
  expect(stale).toEqual({ status: 'stale_account' });
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('quota/playable transitions are durable and clearing happens only after a successful energy ACK', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'boot-1', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  const committed = await markFlashcardTrainingQuotaCommitted(account(), prepared.record.fingerprint, 200);
  expect(committed.status).toBe('quota_committed');
  const playable = await markFlashcardTrainingPendingGrantPlayable(account(), prepared.record.fingerprint, 300);
  expect(playable.status).toBe('playable');

  const failedAck = jest.fn(async () => false);
  await expect(acknowledgeAndClearFlashcardTrainingPendingGrant(
    account(), prepared.record.fingerprint, failedAck,
  )).resolves.toEqual({ status: 'ack_failed' });
  expect(await readFlashcardTrainingPendingGrant(account(), scope())).toEqual(expect.objectContaining({
    status: 'found', record: expect.objectContaining({ phase: 'playable' }),
  }));

  const successfulAck = jest.fn(async () => {
    mockReadEnergyStatus.mockResolvedValue({ status: 'acknowledged' });
    return true;
  });
  await expect(acknowledgeAndClearFlashcardTrainingPendingGrant(
    account(), prepared.record.fingerprint, successfulAck,
  )).resolves.toEqual({ status: 'cleared' });
  expect(successfulAck).toHaveBeenCalledWith('energy:swipe:attempt-1');
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual({ status: 'missing' });
});

test('one storage mutex makes concurrent exact-scope mounts create one durable start', async () => {
  const inputs = [1, 2].map((ordinal) => ({
    account: account(), scope: scope(), manifest: manifest(), attemptId: `attempt-${ordinal}`,
    receiptId: `swipe:attempt-${ordinal}`, energyOperationId: `energy:swipe:attempt-${ordinal}`,
    energyEpoch: `boot-${ordinal}`, nowMs: 100 + ordinal,
  }));

  const results = await Promise.all(inputs.map(prepareFlashcardTrainingPendingGrant));

  expect(results.map((result) => result.status).sort()).toEqual(['prepared', 'reused']);
  const records = results.flatMap((result) => ('record' in result ? [result.record] : []));
  expect(new Set(records.map((record) => record.receiptId))).toEqual(new Set(['swipe:attempt-1']));
  const raw = mockMemory.get(flashcardTrainingPendingGrantStorageKey('account-a', 7));
  expect(JSON.parse(String(raw)).records).toHaveLength(1);
});

test('a durable start_in_progress claim is required before energy or quota transitions', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-claim',
    receiptId: 'swipe:attempt-claim', energyOperationId: 'energy:swipe:attempt-claim', energyEpoch: 'attempt-claim', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');

  await expect(markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 110)).resolves.toEqual({ status: 'claim_required' });
  await expect(markFlashcardTrainingQuotaCommitted(account(), prepared.record.fingerprint, 120)).resolves.toEqual({ status: 'claim_required' });
  const claimed = await claimFlashcardTrainingPendingGrantStart(
    account(), prepared.record.fingerprint, prepared.record.receiptId, 'mount-1', 130,
  );
  expect(claimed).toEqual(expect.objectContaining({
    status: 'claimed', record: expect.objectContaining({ startInProgress: expect.objectContaining({
      claimId: 'mount-1',
      runtimeOwnerId: expect.stringMatching(/^pending-runtime:/),
      claimedAtMs: 130,
      leaseUntilMs: 100 + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS,
    }) }),
  }));
  await expect(markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 140)).resolves.toEqual(
    expect.objectContaining({ status: 'charged' }),
  );
});

test('discard compare-and-remove loses to a concurrent start claim at the authoritative-read gap', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-race',
    receiptId: 'swipe:attempt-race', energyOperationId: 'energy:swipe:attempt-race', energyEpoch: 'attempt-race', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  let resolveQuota!: () => void;
  mockReadQuotaReceipts.mockImplementationOnce(() => new Promise((resolve) => {
    resolveQuota = () => resolve({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] });
  }));
  mockReadEnergyStatus.mockResolvedValue({ status: 'missing' });

  const discard = discardFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint);
  await Promise.resolve();
  await claimFlashcardTrainingPendingGrantStart(account(), prepared.record.fingerprint, prepared.record.receiptId, 'mount-race', 150);
  resolveQuota();

  await expect(discard).resolves.toEqual({ status: 'retained_unsafe' });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(
    expect.objectContaining({ status: 'found' }),
  );
});

test('maintenance rechecks a claim created at the authoritative-read gap before removing', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-maintain-race',
    receiptId: 'swipe:attempt-maintain-race', energyOperationId: 'energy:swipe:attempt-maintain-race',
    energyEpoch: 'attempt-maintain-race', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  const nowMs = 100 + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS;
  let announceRead!: () => void;
  let finishRead!: () => void;
  const readStarted = new Promise<void>((resolve) => { announceRead = resolve; });
  mockReadQuotaReceipts.mockImplementationOnce(() => new Promise((resolve) => {
    announceRead();
    finishRead = () => resolve({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] });
  }));

  const maintenance = maintainFlashcardTrainingPendingGrants(account(), 'focus', jest.fn(), nowMs);
  await readStarted;
  await claimFlashcardTrainingPendingGrantStart(
    account(), prepared.record.fingerprint, prepared.record.receiptId, 'mount-maintain', nowMs,
  );
  finishRead();
  await expect(maintenance).resolves.toEqual({
    status: 'maintained', removed: 0, retained: 1,
  });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(
    expect.objectContaining({ status: 'found', record: expect.objectContaining({
      startInProgress: expect.objectContaining({ claimId: 'mount-maintain' }),
    }) }),
  );
});

test('maintenance rechecks claim plus quota transition created at the authoritative-read gap', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-maintain-quota-race',
    receiptId: 'swipe:attempt-maintain-quota-race', energyOperationId: 'energy:swipe:attempt-maintain-quota-race',
    energyEpoch: 'attempt-maintain-quota-race', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  const nowMs = 100 + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS;
  let announceRead!: () => void;
  let finishRead!: () => void;
  const readStarted = new Promise<void>((resolve) => { announceRead = resolve; });
  mockReadQuotaReceipts.mockImplementationOnce(() => new Promise((resolve) => {
    announceRead();
    finishRead = () => resolve({ status: 'available', stableUid: 'account-a', lineage: 7, receipts: [] });
  }));

  const maintenance = maintainFlashcardTrainingPendingGrants(account(), 'boot', jest.fn(), nowMs);
  await readStarted;
  await claimFlashcardTrainingPendingGrantStart(
    account(), prepared.record.fingerprint, prepared.record.receiptId, 'mount-maintain-quota', nowMs,
  );
  await markFlashcardTrainingQuotaCommitted(account(), prepared.record.fingerprint, nowMs, nowMs + 10_000);
  finishRead();

  await expect(maintenance).resolves.toEqual({ status: 'maintained', removed: 0, retained: 1 });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(expect.objectContaining({
    status: 'found', record: expect.objectContaining({ phase: 'quota_committed', receiptId: prepared.record.receiptId }),
  }));
});

test('a previous-runtime crashed claim with no quota or energy is safely removed and frees capacity', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-crash-empty',
    receiptId: 'swipe:attempt-crash-empty', energyOperationId: 'energy:swipe:attempt-crash-empty',
    energyEpoch: 'crash-empty', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record, 'mount-crash-empty');
  makeClaimPreviousRuntime(prepared.record.receiptId);

  await expect(maintainFlashcardTrainingPendingGrants(account(), 'boot', jest.fn(), 200)).resolves.toEqual({
    status: 'maintained', removed: 1, retained: 0,
  });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual({ status: 'missing' });
  await expect(prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-after-clean',
    receiptId: 'swipe:attempt-after-clean', energyOperationId: 'energy:swipe:attempt-after-clean',
    energyEpoch: 'after-clean', nowMs: 300,
  })).resolves.toEqual(expect.objectContaining({ status: 'prepared' }));
});

test('a previous-runtime charged claim refunds once and is removed only after authoritative refunded proof', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-crash-charged',
    receiptId: 'swipe:attempt-crash-charged', energyOperationId: 'energy:swipe:attempt-crash-charged',
    energyEpoch: 'crash-charged', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record, 'mount-crash-charged');
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 120);
  makeClaimPreviousRuntime(prepared.record.receiptId);
  mockReadEnergyStatus
    .mockResolvedValueOnce({ status: 'charged' })
    .mockResolvedValueOnce({ status: 'refunded' });
  const refund = jest.fn(async () => undefined);

  await expect(maintainFlashcardTrainingPendingGrants(account(), 'account', refund, 200)).resolves.toEqual({
    status: 'maintained', removed: 1, retained: 0,
  });
  expect(refund).toHaveBeenCalledTimes(1);
  expect(refund).toHaveBeenCalledWith('energy:swipe:attempt-crash-charged', 'entry_expired');
});

test('refund failure or uncertain authoritative energy retains a previous-runtime claim', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-crash-uncertain',
    receiptId: 'swipe:attempt-crash-uncertain', energyOperationId: 'energy:swipe:attempt-crash-uncertain',
    energyEpoch: 'crash-uncertain', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record, 'mount-crash-uncertain');
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 120);
  makeClaimPreviousRuntime(prepared.record.receiptId);
  mockReadEnergyStatus.mockResolvedValue({ status: 'charged' });
  const refund = jest.fn(async () => { throw new Error('refund unavailable'); });

  await expect(maintainFlashcardTrainingPendingGrants(account(), 'boot', refund, 200)).resolves.toEqual({
    status: 'maintained', removed: 0, retained: 1,
  });
  expect(refund).toHaveBeenCalledTimes(1);
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(expect.objectContaining({ status: 'found' }));
});

test('quota-present refunded recovery preserves the receipt and rotates energy exactly once', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-crash-voucher',
    receiptId: 'swipe:attempt-crash-voucher', energyOperationId: 'energy:swipe:attempt-crash-voucher',
    energyEpoch: 'crash-voucher', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record, 'mount-crash-voucher');
  makeClaimPreviousRuntime(prepared.record.receiptId);
  mockReadQuotaReceipts.mockResolvedValue({
    status: 'available', stableUid: 'account-a', lineage: 7,
    receipts: [{ receiptId: prepared.record.receiptId, resetAt: 10_000 }],
  });
  mockReadEnergyStatus.mockResolvedValue({ status: 'refunded' });

  await expect(maintainFlashcardTrainingPendingGrants(account(), 'boot', jest.fn(), 200)).resolves.toEqual({
    status: 'maintained', removed: 0, retained: 1,
  });
  const recovered = await readFlashcardTrainingPendingGrant(account(), scope());
  expect(recovered).toEqual(expect.objectContaining({
    status: 'found', record: expect.objectContaining({
      receiptId: prepared.record.receiptId,
      phase: 'quota_committed',
      energyAttemptOrdinal: 1,
      energyOperationId: 'energy:swipe:attempt-crash-voucher:resume:1',
    }),
  }));
  expect(mockCreateEnergyIntent).toHaveBeenCalledTimes(1);
});

test.each(['prepared', 'acknowledged', 'unavailable'] as const)(
  'previous-runtime claim retains on authoritative %s energy',
  async (energyStatus) => {
    const prepared = await prepareFlashcardTrainingPendingGrant({
      account: account(), scope: scope(), manifest: manifest(), attemptId: `attempt-crash-${energyStatus}`,
      receiptId: `swipe:attempt-crash-${energyStatus}`, energyOperationId: `energy:swipe:attempt-crash-${energyStatus}`,
      energyEpoch: `crash-${energyStatus}`, nowMs: 100,
    });
    if (prepared.status !== 'prepared') throw new Error('expected prepared');
    await claimRecord(prepared.record, `mount-crash-${energyStatus}`);
    makeClaimPreviousRuntime(prepared.record.receiptId);
    mockReadEnergyStatus.mockResolvedValue(
      energyStatus === 'unavailable'
        ? { status: 'unavailable', reason: 'read_failed' }
        : { status: energyStatus },
    );

    await expect(maintainFlashcardTrainingPendingGrants(account(), 'account', jest.fn(), 200)).resolves.toEqual({
      status: 'maintained', removed: 0, retained: 1,
    });
  },
);

test('an active lifecycle holder serializes maintenance and is never force-unlocked', async () => {
  let releaseRoute!: () => void;
  let announceRoute!: () => void;
  const routeStarted = new Promise<void>((resolve) => { announceRoute = resolve; });
  const route = withFlashcardTrainingPendingGrantLifecycle(account(), async (lease) => {
    expect(lease.accountKey).toBe('account-a:7');
    await expect(withFlashcardTrainingPendingGrantLifecycle(
      account(), async (nestedLease) => nestedLease.leaseId, lease,
    )).resolves.toBe(lease.leaseId);
    announceRoute();
    await new Promise<void>((resolve) => { releaseRoute = resolve; });
    return 'route-complete';
  });
  await routeStarted;
  const maintenance = maintainFlashcardTrainingPendingGrants(account(), 'boot', jest.fn(), 200);
  await Promise.resolve();
  expect(mockReadQuotaReceipts).not.toHaveBeenCalled();
  releaseRoute();
  await expect(route).resolves.toBe('route-complete');
  await expect(maintenance).resolves.toEqual({ status: 'maintained', removed: 0, retained: 0 });
});

test('an awaited boot recovery queues behind weaker focus work and still reclaims a previous-runtime empty claim', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-trigger-strength',
    receiptId: 'swipe:attempt-trigger-strength', energyOperationId: 'energy:swipe:attempt-trigger-strength',
    energyEpoch: 'trigger-strength', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record, 'mount-trigger-strength');
  makeClaimPreviousRuntime(prepared.record.receiptId);
  let announceFocus!: () => void;
  let finishFocus!: () => void;
  const focusPaused = new Promise<void>((resolve) => { announceFocus = resolve; });
  mockGetAllKeys.mockImplementationOnce(() => new Promise((resolve) => {
    announceFocus();
    finishFocus = () => resolve([...mockMemory.keys()]);
  }));

  const focus = maintainFlashcardTrainingPendingGrants(account(), 'focus', jest.fn(), 200);
  await focusPaused;
  const boot = maintainFlashcardTrainingPendingGrants(account(), 'boot', jest.fn(), 200);
  const aliasedWeakerRun = boot === focus;
  finishFocus();

  await expect(focus).resolves.toEqual({ status: 'maintained', removed: 0, retained: 1 });
  expect(aliasedWeakerRun).toBe(false);
  await expect(boot).resolves.toEqual({ status: 'maintained', removed: 1, retained: 0 });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual({ status: 'missing' });
});

test('reconstructs quota and energy after a debit crash, then clears an ACK-before-delete crash', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'boot-1', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  mockReadQuotaReceipts.mockResolvedValue({
    status: 'available', stableUid: 'account-a', lineage: 7,
    receipts: [{ receiptId: 'swipe:attempt-1', resetAt: 10_000 }],
  });
  mockReadEnergyStatus.mockResolvedValue({ status: 'charged' });

  const recovered = await reconcileFlashcardTrainingPendingGrant(account(), scope(), 200);
  expect(recovered).toEqual(expect.objectContaining({
    status: 'found',
    record: expect.objectContaining({ phase: 'quota_committed', energyState: 'charged', quotaResetAt: 10_000 }),
  }));
  await markFlashcardTrainingPendingGrantPlayable(account(), prepared.record.fingerprint, 300);

  mockReadEnergyStatus.mockResolvedValue({ status: 'acknowledged' });
  await expect(reconcileFlashcardTrainingPendingGrant(account(), scope(), 400)).resolves.toEqual({ status: 'missing' });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual({ status: 'missing' });
});

test('explicit abandon refunds once and retains a voucher when pending quota later commits', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'boot-1', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 150);
  let finishRefund!: () => void;
  let announceRefund!: () => void;
  const refundStarted = new Promise<void>((resolve) => { announceRefund = resolve; });
  const refund = jest.fn(() => {
    announceRefund();
    return new Promise<void>((resolve) => { finishRefund = resolve; });
  });

  const first = abandonFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint, refund, 200);
  await refundStarted;
  const second = abandonFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint, refund, 201);
  expect(refund).toHaveBeenCalledTimes(1);
  finishRefund();
  await expect(Promise.all([first, second])).resolves.toEqual(expect.arrayContaining([
    { status: 'refunded' }, { status: 'refund_in_progress' },
  ]));

  await markFlashcardTrainingQuotaCommitted(account(), prepared.record.fingerprint, 300, 10_000);
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(expect.objectContaining({
    status: 'found',
    record: expect.objectContaining({ phase: 'quota_committed', energyState: 'refunded', quotaResetAt: 10_000 }),
  }));
});

test.each(['boot', 'account', 'focus'] as const)(
  '%s maintenance removes an expired record only after authoritative no-quota/no-debit proof',
  async (trigger) => {
    const prepared = await prepareFlashcardTrainingPendingGrant({
      account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-old',
      receiptId: 'swipe:attempt-old', energyOperationId: 'energy:swipe:attempt-old', energyEpoch: 'boot-1', nowMs: 100,
    });
    if (prepared.status !== 'prepared') throw new Error('expected prepared');
    const nowMs = 100 + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS;

    await expect(maintainFlashcardTrainingPendingGrants(account(), trigger, jest.fn(), nowMs)).resolves.toEqual({
      status: 'maintained', removed: 1, retained: 0,
    });
    await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual({ status: 'missing' });
  },
);

test('capacity never evicts a record without authoritative safe-state maintenance', async () => {
  for (let index = 0; index < 8; index += 1) {
    const result = await prepareFlashcardTrainingPendingGrant({
      account: account(), scope: scope({ deckKeys: [`deck-${index}`] }),
      manifest: manifest(), attemptId: `attempt-${index}`, receiptId: `swipe:attempt-${index}`,
      energyOperationId: `energy:swipe:attempt-${index}`, energyEpoch: 'boot-1', nowMs: 100 + index,
    });
    if (result.status !== 'prepared') throw new Error('expected prepared');
    if (index === 0) {
      await claimRecord(result.record, 'mount-capacity');
      await markFlashcardTrainingQuotaCommitted(account(), result.record.fingerprint, 200);
    }
  }

  const ninth = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['deck-8'] }), manifest: manifest(),
    attemptId: 'attempt-8', receiptId: 'swipe:attempt-8', energyOperationId: 'energy:swipe:attempt-8',
    energyEpoch: 'boot-1', nowMs: 300,
  });
  expect(ninth).toEqual({ status: 'unavailable', reason: 'capacity_committed' });
  await expect(readFlashcardTrainingPendingGrant(account(), scope({ deckKeys: ['deck-0'] }))).resolves.toEqual(
    expect.objectContaining({ status: 'found', record: expect.objectContaining({ phase: 'quota_committed' }) }),
  );
  for (let index = 1; index < 8; index += 1) {
    await expect(readFlashcardTrainingPendingGrant(account(), scope({ deckKeys: [`deck-${index}`] }))).resolves.toEqual(
      expect.objectContaining({ status: 'found' }),
    );
  }
});

test('a refunded committed voucher rotates energy once and concurrent recovery reuses the new operation', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:flashcards_swipe:attempt-1', energyEpoch: 'attempt-1', nowMs: 100,
    energyKind: 'flashcards_swipe', energySubjectId: 'saved',
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 120);
  await markFlashcardTrainingQuotaCommitted(account(), prepared.record.fingerprint, 130, 10_000);
  mockReadQuotaReceipts.mockResolvedValue({
    status: 'available', stableUid: 'account-a', lineage: 7,
    receipts: [{ receiptId: 'swipe:attempt-1', resetAt: 10_000 }],
  });
  mockReadEnergyStatus.mockResolvedValue({ status: 'refunded' });

  const recovered = await Promise.all([
    reconcileFlashcardTrainingPendingGrant(account(), scope(), 200),
    reconcileFlashcardTrainingPendingGrant(account(), scope(), 201),
  ]);

  const records = recovered.flatMap((result) => result.status === 'found' ? [result.record] : []);
  expect(records).toHaveLength(2);
  expect(new Set(records.map((record) => record.energyOperationId))).toEqual(
    new Set(['energy:flashcards_swipe:attempt-1:resume:1']),
  );
  expect(records[0]).toEqual(expect.objectContaining({
    receiptId: 'swipe:attempt-1', phase: 'quota_committed', energyState: 'pending', energyAttemptOrdinal: 1,
  }));
  expect(mockCreateEnergyIntent).toHaveBeenCalledTimes(1);
  expect(mockCreateEnergyIntent).toHaveBeenCalledWith('flashcards_swipe', 'saved', 'attempt-1:resume:1');
});

test('discard retains charged, unavailable, and quota-committed records until authoritative safe state', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'attempt-1', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 120);

  mockReadEnergyStatus.mockResolvedValue({ status: 'charged' });
  await expect(discardFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint)).resolves.toEqual({ status: 'retained_unsafe' });
  mockReadEnergyStatus.mockResolvedValue({ status: 'unavailable', reason: 'read_failed' });
  await expect(discardFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint)).resolves.toEqual({ status: 'retained_unsafe' });
  mockReadEnergyStatus.mockResolvedValue({ status: 'refunded' });
  await expect(discardFlashcardTrainingPendingGrant(account(), prepared.record.fingerprint)).resolves.toEqual({ status: 'removed' });
});

test('maintenance retains a claimed charged start for exact-scope recovery and deduplicates concurrent triggers', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'attempt-1', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(prepared.record);
  await markFlashcardTrainingEnergyCharged(account(), prepared.record.fingerprint, 120);
  const nowMs = 100 + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS;
  const refund = jest.fn(async () => undefined);
  mockReadEnergyStatus
    .mockResolvedValue({ status: 'charged' });

  await expect(Promise.all([
    maintainFlashcardTrainingPendingGrants(account(), 'boot', refund, nowMs),
    maintainFlashcardTrainingPendingGrants(account(), 'focus', refund, nowMs),
  ])).resolves.toEqual([
    { status: 'maintained', removed: 0, retained: 1 },
    { status: 'maintained', removed: 0, retained: 1 },
  ]);
  expect(refund).not.toHaveBeenCalled();
});

test('manifest accepts compact IDs for a huge-text library and rejects duplicated or disguised card text', async () => {
  const hugeLibrary = Array.from({ length: 200 }, (_, index) => ({
    id: `card-${index}`,
    front: `front-${index}-${'x'.repeat(4_000)}`,
    back: `back-${index}-${'y'.repeat(4_000)}`,
  }));
  const compact = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: {
      ...manifest(), payload: { orderedCardIds: hugeLibrary.map((card) => card.id), seed: 'seed-huge' },
    },
    attemptId: 'attempt-compact', receiptId: 'swipe:attempt-compact',
    energyOperationId: 'energy:swipe:attempt-compact', energyEpoch: 'attempt-compact', nowMs: 100,
  });
  expect(compact.status).toBe('prepared');
  const raw = mockMemory.get(flashcardTrainingPendingGrantStorageKey('account-a', 7)) ?? '';
  expect(raw.length).toBeLessThan(16_000);
  expect(raw).not.toContain(hugeLibrary[0].front);

  const rich = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['rich'] }), manifest: {
      ...manifest(), payload: { cards: hugeLibrary.slice(0, 1), seed: 'seed-rich' },
    },
    attemptId: 'attempt-rich', receiptId: 'swipe:attempt-rich',
    energyOperationId: 'energy:swipe:attempt-rich', energyEpoch: 'attempt-rich', nowMs: 200,
  });
  expect(rich).toEqual({ status: 'unavailable', reason: 'invalid_input' });

  await expect(prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ mode: 'speaking', deckKeys: ['speaking-rich'] }),
    manifest: {
      ...manifest('speaking'),
      payload: { orderedCardIds: ['card-1'], seed: 'seed-speaking', task: 'front text' },
    },
    attemptId: 'attempt-speaking-rich', receiptId: 'speaking:attempt-rich',
    energyOperationId: 'energy:speaking:attempt-rich', energyEpoch: 'attempt-rich', nowMs: 300,
  })).resolves.toEqual({ status: 'unavailable', reason: 'invalid_input' });

  await expect(prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ mode: 'blitz', deckKeys: ['blitz-rich'] }),
    manifest: {
      ...manifest('blitz'),
      payload: { orderedCardIds: ['card-1'], seed: 'seed-blitz', options: ['translation'] },
    },
    attemptId: 'attempt-blitz-rich', receiptId: 'blitz:attempt-rich',
    energyOperationId: 'energy:blitz:attempt-rich', energyEpoch: 'attempt-rich', nowMs: 400,
  })).resolves.toEqual({ status: 'unavailable', reason: 'invalid_input' });
});

test('chunked ID-only manifests have no logical 2,000-card cap and keep the metadata journal bounded', async () => {
  const shortIds = Array.from({ length: 2_501 }, (_, index) => `short-${index}`);
  const longIds = Array.from({ length: 1_000 }, (_, index) => `long-${index}-${'z'.repeat(150)}`);
  const short = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['short-library'], sessionSize: Number.MAX_SAFE_INTEGER }),
    manifest: { ...manifest(), payload: { orderedCardIds: shortIds, seed: 'seed-short' } },
    attemptId: 'attempt-short', receiptId: 'swipe:attempt-short',
    energyOperationId: 'energy:swipe:attempt-short', energyEpoch: 'attempt-short', nowMs: 100,
  });
  const long = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['long-library'], sessionSize: Number.MAX_SAFE_INTEGER }),
    manifest: { ...manifest(), payload: { orderedCardIds: longIds, seed: 'seed-long' } },
    attemptId: 'attempt-long', receiptId: 'swipe:attempt-long',
    energyOperationId: 'energy:swipe:attempt-long', energyEpoch: 'attempt-long', nowMs: 200,
  });

  expect(short.status).toBe('prepared');
  expect(long.status).toBe('prepared');
  const journalRaw = mockMemory.get(flashcardTrainingPendingGrantStorageKey('account-a', 7)) ?? '';
  expect(journalRaw.length).toBeLessThan(16_000);
  expect(journalRaw).not.toContain('short-2500');
  expect(journalRaw).not.toContain('long-999');
  await expect(readFlashcardTrainingPendingGrant(
    account(), scope({ deckKeys: ['short-library'], sessionSize: Number.MAX_SAFE_INTEGER }),
  )).resolves.toEqual(expect.objectContaining({
    status: 'found', record: expect.objectContaining({ manifest: expect.objectContaining({
      payload: expect.objectContaining({ orderedCardIds: shortIds }),
    }) }),
  }));
  const reused = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['long-library'], sessionSize: Number.MAX_SAFE_INTEGER }),
    manifest: manifest(), attemptId: 'different', receiptId: 'swipe:different',
    energyOperationId: 'energy:swipe:different', energyEpoch: 'different', nowMs: 300,
  });
  expect(reused).toEqual(expect.objectContaining({
    status: 'reused', record: expect.objectContaining({ manifest: expect.objectContaining({
      payload: expect.objectContaining({ orderedCardIds: longIds }),
    }) }),
  }));
});

test('boot/focus orphan GC scans only the exact account manifest prefix and preserves every referenced root and chunk', async () => {
  const prepared = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-gc',
    receiptId: 'swipe:attempt-gc', energyOperationId: 'energy:swipe:attempt-gc', energyEpoch: 'attempt-gc', nowMs: 100,
  });
  if (prepared.status !== 'prepared') throw new Error('expected prepared');
  const prefix = 'flashcard_training_pending_grant_manifest_v1:account-a:7:';
  const referencedKeys = [...mockMemory.keys()].filter((key) => key.startsWith(prefix));
  expect(referencedKeys.length).toBeGreaterThan(1);
  mockMemory.set(`${prefix}m:orphan:chunk:0`, 'orphan');
  mockMemory.set(`${prefix}m:orphan:root`, '{}');
  mockMemory.set('flashcard_training_pending_grant_manifest_v1:account-b:7:m:other:root', '{}');
  mockMemory.set('unrelated:key', 'keep');

  await expect(maintainFlashcardTrainingPendingGrants(account(), 'focus', jest.fn(), 200)).resolves.toEqual({
    status: 'maintained', removed: 0, retained: 1,
  });
  for (const key of referencedKeys) expect(mockMemory.has(key)).toBe(true);
  expect(mockMemory.has(`${prefix}m:orphan:chunk:0`)).toBe(false);
  expect(mockMemory.has(`${prefix}m:orphan:root`)).toBe(false);
  expect(mockMemory.get('flashcard_training_pending_grant_manifest_v1:account-b:7:m:other:root')).toBe('{}');
  expect(mockMemory.get('unrelated:key')).toBe('keep');
});

test('GC derives referenced manifests under the same storage lease as a concurrent prepare', async () => {
  const first = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-gc-first',
    receiptId: 'swipe:attempt-gc-first', energyOperationId: 'energy:swipe:attempt-gc-first', energyEpoch: 'gc-first', nowMs: 100,
  });
  expect(first.status).toBe('prepared');
  const secondScope = scope({ deckKeys: ['concurrent'] });
  const seeded = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: secondScope, manifest: manifest(), attemptId: 'attempt-gc-second',
    receiptId: 'swipe:attempt-gc-second', energyOperationId: 'energy:swipe:attempt-gc-second', energyEpoch: 'gc-second', nowMs: 110,
  });
  if (seeded.status !== 'prepared') throw new Error('expected seeded manifest');
  const journalKey = flashcardTrainingPendingGrantStorageKey('account-a', 7);
  const rawJournal = JSON.parse(String(mockMemory.get(journalKey))) as { records: Array<{ receiptId: string }> };
  rawJournal.records = rawJournal.records.filter((record) => record.receiptId !== 'swipe:attempt-gc-second');
  mockMemory.set(journalKey, JSON.stringify(rawJournal));
  const secondKeys = [...mockMemory.keys()].filter((key) => key.includes(seeded.record.manifestRef));
  let announceDelete!: () => void;
  let finishDelete!: () => void;
  let paused = false;
  const deleteStarted = new Promise<void>((resolve) => { announceDelete = resolve; });
  mockRemoveItem.mockImplementation(async (key: string) => {
    if (!paused && secondKeys.includes(key)) {
      paused = true;
      announceDelete();
      await new Promise<void>((resolve) => { finishDelete = resolve; });
    }
    mockMemory.delete(key);
  });

  const maintenance = maintainFlashcardTrainingPendingGrants(account(), 'focus', jest.fn(), 200);
  await deleteStarted;
  const concurrent = prepareFlashcardTrainingPendingGrant({
    account: account(), scope: secondScope, manifest: manifest(), attemptId: 'attempt-gc-second',
    receiptId: 'swipe:attempt-gc-second', energyOperationId: 'energy:swipe:attempt-gc-second', energyEpoch: 'gc-second', nowMs: 210,
  });
  await Promise.resolve();
  finishDelete();

  await expect(maintenance).resolves.toEqual({ status: 'maintained', removed: 0, retained: 1 });
  await expect(concurrent).resolves.toEqual(expect.objectContaining({ status: 'prepared' }));
  await expect(readFlashcardTrainingPendingGrant(account(), secondScope)).resolves.toEqual(
    expect.objectContaining({ status: 'found', record: expect.objectContaining({ receiptId: 'swipe:attempt-gc-second' }) }),
  );
  mockRemoveItem.mockImplementation(async (key: string) => { mockMemory.delete(key); });
});

test('a manifest storage failure fails closed without damaging existing grants', async () => {
  const existing = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope(), manifest: manifest(), attemptId: 'attempt-1',
    receiptId: 'swipe:attempt-1', energyOperationId: 'energy:swipe:attempt-1', energyEpoch: 'boot-1', nowMs: 100,
  });
  if (existing.status !== 'prepared') throw new Error('expected prepared');
  await claimRecord(existing.record);
  await markFlashcardTrainingQuotaCommitted(account(), existing.record.fingerprint, 200);

  mockSetItem.mockRejectedValueOnce(new Error('storage unavailable'));
  const failed = await prepareFlashcardTrainingPendingGrant({
    account: account(), scope: scope({ deckKeys: ['huge'] }),
    manifest: {
      ...manifest(),
      payload: {
        orderedCardIds: Array.from({ length: 1_000 }, (_, index) => `card-${index}-${'x'.repeat(140)}`),
        seed: 'seed-oversized',
      },
    },
    attemptId: 'attempt-huge', receiptId: 'swipe:attempt-huge',
    energyOperationId: 'energy:swipe:attempt-huge', energyEpoch: 'boot-1', nowMs: 300,
  });
  expect(failed).toEqual({ status: 'unavailable', reason: 'storage_error' });
  await expect(readFlashcardTrainingPendingGrant(account(), scope())).resolves.toEqual(
    expect.objectContaining({ status: 'found', record: expect.objectContaining({ receiptId: 'swipe:attempt-1' }) }),
  );
});
