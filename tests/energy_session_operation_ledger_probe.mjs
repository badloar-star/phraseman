import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';

const root = process.cwd();
const virtual = {
  '@react-native-async-storage/async-storage': `
    export const __store = new Map();
    let failNextSetNeedle = null;
    let failNextRemoveNeedle = null;
    export const __failNextSetContaining = (needle) => { failNextSetNeedle = needle; };
    export const __failNextRemoveContaining = (needle) => { failNextRemoveNeedle = needle; };
    const api = {
      getItem: async (key) => __store.has(key) ? __store.get(key) : null,
      setItem: async (key, value) => {
        if (failNextSetNeedle && key.includes(failNextSetNeedle)) {
          failNextSetNeedle = null;
          throw new Error('injected_set_failure');
        }
        __store.set(key, String(value));
      },
      removeItem: async (key) => {
        if (failNextRemoveNeedle && key.includes(failNextRemoveNeedle)) {
          failNextRemoveNeedle = null;
          throw new Error('injected_remove_failure');
        }
        __store.delete(key);
      },
      multiSet: async (pairs) => { for (const [key, value] of pairs) __store.set(key, String(value)); },
      getAllKeys: async () => [...__store.keys()],
    };
    export default api;
  `,
  'expo-crypto': `
    import { createHash, randomUUID } from 'node:crypto';
    export { randomUUID };
    export const CryptoDigestAlgorithm = { SHA256: 'sha256' };
    export async function digestStringAsync(_algorithm, value) {
      return createHash('sha256').update(value).digest('hex');
    }
  `,
  './account_generation': `
    let token = { stableId: 'owner-a', generation: 1, phase: 'active' };
    export const __setToken = (next) => { token = next; };
    export const captureAccountGeneration = () => token;
    export const isCurrentAccountGeneration = (candidate, owner) =>
      candidate === token && (!owner || token.stableId === owner) && token.phase === 'active';
    export const withAccountTransitionLock = async (fn) => fn({ owner: token.stableId });
  `,
  './bonus_energy_store': `export const BONUS_ENERGY_KEY = 'bonus_energy_until_midnight_v1';`,
  './gift_account_storage': `
    export const requireGiftAccountStorageKey = (base, token) => base + ':' + token.stableId;
  `,
  './storage_mutex': `export const withStorageLock = async (fn) => fn();`,
};

const plugin = {
  name: 'energy-ledger-probe-mocks',
  setup(buildApi) {
    buildApi.onResolve({ filter: /.*/ }, (args) => {
      if (Object.hasOwn(virtual, args.path)) return { path: args.path, namespace: 'virtual' };
      return null;
    });
    buildApi.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => ({
      contents: virtual[args.path],
      loader: 'js',
      resolveDir: root,
    }));
  },
};

const built = await build({
  stdin: {
    contents: `
      import * as ledger from './app/energy_session_operation_ledger.ts';
      import { __store, __failNextRemoveContaining, __failNextSetContaining } from '@react-native-async-storage/async-storage';
      import { __setToken } from './account_generation';
      export { ledger, __store, __failNextRemoveContaining, __failNextSetContaining, __setToken };
    `,
    resolveDir: root,
    sourcefile: 'energy-ledger-probe-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
  plugins: [plugin],
});

const encoded = Buffer.from(built.outputFiles[0].contents).toString('base64');
const { ledger, __store, __failNextRemoveContaining, __failNextSetContaining, __setToken } = await import(`data:text/javascript;base64,${encoded}`);

const now = Date.now();
const opening = {
  baseEnergy: 5,
  bonusEnergy: 3,
  bonusCapacity: 3,
  bonusExpiresAt: now + 60_000,
  refundCredit: 0,
  lastRecoveryTime: now - 10_000,
  maxEnergy: 5,
};

const partialTemporaryCapacity = {
  ...opening,
  bonusEnergy: 0,
  bonusCapacity: 3,
  lastRecoveryTime: now - 29 * 60_000,
};
const partialCapacityDebit = ledger.planEnergySessionDebit(partialTemporaryCapacity, 1, now);
assert.ok(partialCapacityDebit);
assert.equal(partialCapacityDebit.after.baseEnergy, 4);
assert.equal(partialCapacityDebit.after.lastRecoveryTime, partialTemporaryCapacity.lastRecoveryTime);

const expiredTemporaryCapacity = {
  ...partialTemporaryCapacity,
  bonusExpiresAt: now - 1,
};
const expiredCapacityDebit = ledger.planEnergySessionDebit(expiredTemporaryCapacity, 1, now);
assert.ok(expiredCapacityDebit);
assert.equal(expiredCapacityDebit.after.bonusCapacity, 0);
assert.equal(expiredCapacityDebit.after.lastRecoveryTime, now);
const bonusStorageKey = 'bonus_energy_until_midnight_v1:owner-a';
__store.set(bonusStorageKey, JSON.stringify({
  amount: opening.bonusEnergy,
  capacity: 3,
  expiresAt: opening.bonusExpiresAt,
}));
const intent = ledger.createEnergySessionIntent('arena_today', 'today', 'attempt-0001');
const first = await ledger.commitEnergySessionStart(intent, 4, opening, 'boot:test-a');
assert.equal(first.status, 'applied');
assert.deepEqual(first.operation.split, { bonus: 3, refundCredit: 0, base: 1 });
assert.equal(first.projection.baseEnergy, 4);
assert.equal(first.projection.bonusEnergy, 0);
assert.deepEqual(JSON.parse(__store.get(bonusStorageKey)), {
  amount: 0,
  capacity: 3,
  expiresAt: opening.bonusExpiresAt,
});

const replay = await ledger.commitEnergySessionStart(intent, 4, first.projection, 'boot:test-a');
assert.equal(replay.status, 'already-applied');
assert.deepEqual(replay.projection, first.projection);

const conflicting = await ledger.commitEnergySessionStart(
  { ...intent, grant: { ...intent.grant, subjectId: 'different' } },
  4,
  opening,
  'boot:test-a',
);
assert.deepEqual(conflicting, { status: 'failed', reason: 'operation_id_conflict' });

const refunded = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_failed',
  first.projection,
  'boot:test-a',
);
assert.equal(refunded.status, 'applied');
assert.equal(refunded.projection.baseEnergy, 5);
assert.equal(refunded.projection.bonusEnergy, 3);
assert.deepEqual(JSON.parse(__store.get(bonusStorageKey)), {
  amount: 3,
  capacity: 3,
  expiresAt: opening.bonusExpiresAt,
});

const refundReplay = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_failed',
  refunded.projection,
  'boot:test-a',
);
assert.equal(refundReplay.status, 'already-applied');
assert.deepEqual(refundReplay.projection, refunded.projection);
const refundDifferentReasonReplay = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_cancelled',
  refunded.projection,
  'boot:test-a',
);
assert.equal(refundDifferentReasonReplay.status, 'already-applied');
assert.deepEqual(refundDifferentReasonReplay.projection, refunded.projection);

const afterMidnight = ledger.planEnergySessionRefund(
  { ...first.projection, bonusExpiresAt: 0 },
  first.operation,
  opening.bonusExpiresAt + 1,
);
assert.equal(afterMidnight.bonusEnergy, 0);
assert.equal(afterMidnight.baseEnergy, 5);

const fullBaseRefund = ledger.planEnergySessionRefund(
  { ...first.projection, baseEnergy: 5 },
  { ...first.operation, split: { bonus: 0, refundCredit: 0, base: 1 } },
  now,
);
assert.equal(fullBaseRefund.baseEnergy, 5);
assert.equal(fullBaseRefund.refundCredit, 1);

assert.equal(await ledger.acknowledgeEnergySessionStart(intent.operationId), true);
const receiptRaw = [...__store.entries()].find(([key]) =>
  key.startsWith('energy_session_grant_receipt_v1:owner-a:') && key.endsWith(intent.operationId),
)?.[1];
assert.equal(JSON.parse(receiptRaw).schemaVersion, 'energy-session-grant-receipt.v1');

const longKind = 'k'.repeat(150);
const longA = ledger.createEnergySessionIntent(longKind, 'subject', `a${'x'.repeat(100)}`);
const longB = ledger.createEnergySessionIntent(longKind, 'subject', `b${'x'.repeat(100)}`);
assert.notEqual(longA.operationId, longB.operationId);
assert.ok(longA.operationId.length <= 120);

const ownerAKeys = [...__store.keys()];
__setToken({ stableId: 'owner-b', generation: 2, phase: 'active' });
const ownerBIntent = ledger.createEnergySessionIntent('lesson', '1', 'attempt-owner-b');
const ownerB = await ledger.commitEnergySessionStart(ownerBIntent, 1, opening, 'boot:test-b');
assert.equal(ownerB.status, 'applied');
assert.ok([...__store.keys()].some((key) => key.includes('owner-b')));
assert.ok(ownerAKeys.every((key) => __store.has(key)));

const ownerBOperationKey = [...__store.keys()].find((key) =>
  key.startsWith('energy_session_operation_v1:owner-b:') && key.endsWith(ownerBIntent.operationId),
);
assert.ok(ownerBOperationKey);
__store.set(ownerBOperationKey, '{corrupt');
const corruptReplay = await ledger.commitEnergySessionStart(ownerBIntent, 1, opening, 'boot:test-b');
assert.deepEqual(corruptReplay, { status: 'failed', reason: 'energy_session_operation_corrupt' });
assert.equal(__store.get(ownerBOperationKey), '{corrupt');

// Destructive retry order: an old debit must never republish its historical
// after-image over a newer refund, debit, or elapsed-recovery projection.
__setToken({ stableId: 'owner-c', generation: 3, phase: 'active' });
const sequenceOpening = {
  ...opening,
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
};
const sequenceAIntent = ledger.createEnergySessionIntent('arena', 'sequence-a', 'attempt-a');
const sequenceA = await ledger.commitEnergySessionStart(sequenceAIntent, 1, sequenceOpening, 'boot:sequence');
assert.equal(sequenceA.status, 'applied');
assert.equal(sequenceA.projection.baseEnergy, 4);
const sequenceRefund = await ledger.refundEnergySessionStart(
  sequenceAIntent.operationId, 'entry_failed', sequenceA.projection, 'boot:sequence',
);
assert.equal(sequenceRefund.status, 'applied');
assert.equal(sequenceRefund.projection.baseEnergy, 5);
const retryAfterRefund = await ledger.commitEnergySessionStart(
  sequenceAIntent, 1, sequenceRefund.projection, 'boot:sequence',
);
assert.equal(retryAfterRefund.status, 'reversed');
assert.deepEqual(retryAfterRefund.projection, sequenceRefund.projection);

const sequenceBIntent = ledger.createEnergySessionIntent('arena', 'sequence-b', 'attempt-b');
const sequenceB = await ledger.commitEnergySessionStart(
  sequenceBIntent, 1, sequenceRefund.projection, 'boot:sequence',
);
assert.equal(sequenceB.status, 'applied');
assert.equal(sequenceB.projection.baseEnergy, 4);
const retryAfterNewDebit = await ledger.commitEnergySessionStart(
  sequenceAIntent, 1, sequenceB.projection, 'boot:sequence',
);
assert.equal(retryAfterNewDebit.status, 'reversed');
assert.deepEqual(retryAfterNewDebit.projection, sequenceB.projection);

const elapsedProjection = {
  ...sequenceB.projection,
  baseEnergy: 5,
  lastRecoveryTime: sequenceB.projection.lastRecoveryTime + 60_000,
};
const retryAfterElapsedRecovery = await ledger.commitEnergySessionStart(
  sequenceBIntent, 1, elapsedProjection, 'boot:sequence',
);
assert.equal(retryAfterElapsedRecovery.status, 'already-applied');
assert.deepEqual(retryAfterElapsedRecovery.projection, elapsedProjection);

// A failed refund write is fail-closed and can be retried with the same stable
// id; it neither loses the debit nor applies compensation twice.
__setToken({ stableId: 'owner-d', generation: 4, phase: 'active' });
const failureIntent = ledger.createEnergySessionIntent('arena', 'refund-failure', 'attempt-failure');
const failureDebit = await ledger.commitEnergySessionStart(
  failureIntent, 1, sequenceOpening, 'boot:failure',
);
assert.equal(failureDebit.status, 'applied');
__failNextSetContaining('energy_session_prepared_v1:');
const failedRefund = await ledger.refundEnergySessionStart(
  failureIntent.operationId, 'entry_failed', failureDebit.projection, 'boot:failure',
);
assert.deepEqual(failedRefund, { status: 'failed', reason: 'injected_set_failure' });
const recoveredProjection = await ledger.recoverEnergySessionOperations(
  failureDebit.projection,
  'boot:failure-recovery',
);
assert.equal(recoveredProjection.baseEnergy, 5);
const recoveredRefundReplay = await ledger.refundEnergySessionStart(
  failureIntent.operationId, 'entry_failed', recoveredProjection, 'boot:failure',
);
assert.equal(recoveredRefundReplay.status, 'already-applied');
assert.deepEqual(recoveredRefundReplay.projection, recoveredProjection);

__setToken({ stableId: 'owner-e', generation: 5, phase: 'active' });
const repeatedFailureIntent = ledger.createEnergySessionIntent('arena', 'refund-retry-loop', 'attempt-retry-loop');
const repeatedFailureDebit = await ledger.commitEnergySessionStart(
  repeatedFailureIntent, 1, sequenceOpening, 'boot:retry-loop',
);
assert.equal(repeatedFailureDebit.status, 'applied');
for (let failure = 0; failure < 2; failure += 1) {
  __failNextSetContaining('energy_session_refund_request_v1:');
  const failed = await ledger.refundEnergySessionStart(
    repeatedFailureIntent.operationId,
    'entry_failed',
    repeatedFailureDebit.projection,
    'boot:retry-loop',
  );
  assert.deepEqual(failed, { status: 'failed', reason: 'injected_set_failure' });
}
const retryLoopRefund = await ledger.refundEnergySessionStart(
  repeatedFailureIntent.operationId,
  'entry_failed',
  repeatedFailureDebit.projection,
  'boot:retry-loop',
);
assert.equal(retryLoopRefund.status, 'applied');
assert.equal(retryLoopRefund.projection.baseEnergy, 5);

// A prepared debit is rebased over a newer gift before it commits. The retry
// completes exactly one charge instead of later surprising the caller.
__setToken({ stableId: 'owner-f', generation: 6, phase: 'active' });
const ambiguousIntent = ledger.createEnergySessionIntent('lesson', 'ambiguous-write', 'attempt-ambiguous');
const noBonusOpening = { ...sequenceOpening };
__failNextSetContaining('energy_session_ledger_state_v1:');
const ambiguousFirst = await ledger.commitEnergySessionStart(
  ambiguousIntent, 1, noBonusOpening, 'boot:ambiguous',
);
assert.deepEqual(ambiguousFirst, { status: 'failed', reason: 'injected_set_failure' });
const openingWithGift = {
  ...noBonusOpening,
  bonusEnergy: 3,
  bonusCapacity: 3,
  bonusExpiresAt: now + 120_000,
};
const ambiguousRetry = await ledger.commitEnergySessionStart(
  ambiguousIntent, 1, openingWithGift, 'boot:ambiguous',
);
assert.equal(ambiguousRetry.status, 'applied');
assert.equal(ambiguousRetry.projection.baseEnergy, 5);
assert.equal(ambiguousRetry.projection.bonusEnergy, 2);
assert.deepEqual(ambiguousRetry.operation.split, { bonus: 1, refundCredit: 0, base: 0 });

// If only prepared cleanup failed after commit, retry preserves newer live
// gifts and never republishes the historical absolute after-image.
__setToken({ stableId: 'owner-g', generation: 7, phase: 'active' });
const cleanupIntent = ledger.createEnergySessionIntent('lesson', 'cleanup-failure', 'attempt-cleanup');
__failNextRemoveContaining('energy_session_prepared_v1:');
const cleanupFirst = await ledger.commitEnergySessionStart(
  cleanupIntent, 1, noBonusOpening, 'boot:cleanup',
);
assert.deepEqual(cleanupFirst, { status: 'failed', reason: 'injected_remove_failure' });
const cleanupCommitRetry = await ledger.commitEnergySessionStart(
  cleanupIntent, 1, noBonusOpening, 'boot:cleanup',
);
assert.equal(cleanupCommitRetry.status, 'already-applied');
assert.equal(cleanupCommitRetry.projection.baseEnergy, 4);
const liveAfterCleanupGift = {
  ...cleanupCommitRetry.projection,
  bonusEnergy: 2,
  bonusCapacity: 2,
  bonusExpiresAt: now + 120_000,
};
const cleanupRetry = await ledger.commitEnergySessionStart(
  cleanupIntent, 1, liveAfterCleanupGift, 'boot:cleanup',
);
assert.equal(cleanupRetry.status, 'already-applied');
assert.deepEqual(cleanupRetry.projection, liveAfterCleanupGift);

// A second operation cannot reserve the same revision while the first WAL
// record is unresolved. It retries only after the original head commits.
__setToken({ stableId: 'owner-h', generation: 8, phase: 'active' });
const collisionAIntent = ledger.createEnergySessionIntent('lesson', 'collision-a', 'attempt-collision-a');
const collisionBIntent = ledger.createEnergySessionIntent('lesson', 'collision-b', 'attempt-collision-b');
__failNextSetContaining('energy_session_ledger_state_v1:');
const collisionAFirst = await ledger.commitEnergySessionStart(
  collisionAIntent, 1, noBonusOpening, 'boot:collision',
);
assert.deepEqual(collisionAFirst, { status: 'failed', reason: 'injected_set_failure' });
const collisionBBlocked = await ledger.commitEnergySessionStart(
  collisionBIntent, 1, noBonusOpening, 'boot:collision',
);
assert.deepEqual(collisionBBlocked, { status: 'failed', reason: 'energy_session_pending_operation' });
const collisionACommitted = await ledger.commitEnergySessionStart(
  collisionAIntent, 1, noBonusOpening, 'boot:collision',
);
assert.equal(collisionACommitted.status, 'applied');
const collisionBCommitted = await ledger.commitEnergySessionStart(
  collisionBIntent, 1, collisionACommitted.projection, 'boot:collision',
);
assert.equal(collisionBCommitted.status, 'applied');
assert.equal(collisionBCommitted.operation.revision, collisionACommitted.operation.revision + 1);

// If live energy became insufficient before a prepared debit committed, the
// temporary abort marker cleans every WAL artifact. Later recovery cannot
// charge the cancelled session after energy refills.
__setToken({ stableId: 'owner-i', generation: 9, phase: 'active' });
const insufficientOpening = { ...noBonusOpening, baseEnergy: 1 };
const insufficientIntent = ledger.createEnergySessionIntent('lesson', 'insufficient-rebase', 'attempt-insufficient');
__failNextSetContaining('energy_session_ledger_state_v1:');
const insufficientFirst = await ledger.commitEnergySessionStart(
  insufficientIntent, 1, insufficientOpening, 'boot:insufficient',
);
assert.deepEqual(insufficientFirst, { status: 'failed', reason: 'injected_set_failure' });
const drainedProjection = { ...insufficientOpening, baseEnergy: 0 };
const insufficientRetry = await ledger.commitEnergySessionStart(
  insufficientIntent, 1, drainedProjection, 'boot:insufficient',
);
assert.equal(insufficientRetry.status, 'insufficient');
const refilledProjection = { ...drainedProjection, baseEnergy: 5 };
const afterInsufficientRecovery = await ledger.recoverEnergySessionOperations(
  refilledProjection,
  'boot:insufficient-recovery',
);
assert.deepEqual(afterInsufficientRecovery, refilledProjection);

// Crash/failure during abort cleanup leaves the abort marker authoritative.
// Boot recovery removes every partial WAL artifact before energy recovery can
// make the old debit affordable again.
__setToken({ stableId: 'owner-j', generation: 10, phase: 'active' });
const abortCrashIntent = ledger.createEnergySessionIntent('lesson', 'abort-crash', 'attempt-abort-crash');
__failNextSetContaining('energy_session_ledger_state_v1:');
const abortCrashFirst = await ledger.commitEnergySessionStart(
  abortCrashIntent, 1, insufficientOpening, 'boot:abort-crash',
);
assert.deepEqual(abortCrashFirst, { status: 'failed', reason: 'injected_set_failure' });
__failNextRemoveContaining('energy_session_prepared_v1:');
const abortCleanupFailure = await ledger.commitEnergySessionStart(
  abortCrashIntent, 1, drainedProjection, 'boot:abort-crash',
);
assert.deepEqual(abortCleanupFailure, { status: 'failed', reason: 'injected_remove_failure' });
const abortCrashRecovered = await ledger.recoverEnergySessionOperations(
  refilledProjection,
  'boot:abort-crash-recovery',
);
assert.deepEqual(abortCrashRecovered, refilledProjection);

// A delayed refund cannot turn a temporary +3 pool into +4 after ordinary
// recovery has already filled the active three slots.
__setToken({ stableId: 'owner-k', generation: 11, phase: 'active' });
const overflowExpiry = now + 120_000;
const overflowBonusKey = 'bonus_energy_until_midnight_v1:owner-k';
const overflowOpening = {
  ...noBonusOpening,
  bonusEnergy: 2,
  bonusCapacity: 3,
  bonusExpiresAt: overflowExpiry,
};
__store.set(overflowBonusKey, JSON.stringify({
  amount: 2,
  capacity: 3,
  expiresAt: overflowExpiry,
}));
const overflowIntent = ledger.createEnergySessionIntent('lesson', 'refund-overflow', 'attempt-overflow');
const overflowDebit = await ledger.commitEnergySessionStart(
  overflowIntent, 1, overflowOpening, 'boot:overflow',
);
assert.equal(overflowDebit.status, 'applied');
assert.equal(overflowDebit.projection.bonusEnergy, 1);
const naturallyRecoveredFullPool = {
  ...overflowDebit.projection,
  bonusEnergy: 3,
};
const overflowRefund = await ledger.refundEnergySessionStart(
  overflowIntent.operationId,
  'entry_failed',
  naturallyRecoveredFullPool,
  'boot:overflow',
);
assert.equal(overflowRefund.status, 'applied');
assert.equal(overflowRefund.projection.bonusEnergy, 3);
assert.equal(overflowRefund.projection.bonusCapacity, 3);
assert.equal(overflowRefund.projection.baseEnergy, 5);
assert.equal(overflowRefund.projection.refundCredit, 0);
assert.deepEqual(JSON.parse(__store.get(overflowBonusKey)), {
  amount: 3,
  capacity: 3,
  expiresAt: overflowExpiry,
});

const preparedKeys = [...__store.keys()].filter((key) => key.startsWith('energy_session_prepared_v1:'));
assert.equal(preparedKeys.length, 0);
const refundRequestKeys = [...__store.keys()].filter((key) => key.startsWith('energy_session_refund_request_v1:'));
assert.equal(refundRequestKeys.length, 0);
const abortKeys = [...__store.keys()].filter((key) => key.startsWith('energy_session_abort_v1:'));
assert.equal(abortKeys.length, 0);

console.log(`ENERGY SESSION LEDGER PROBE: PASS (${__store.size} durable records)`);
