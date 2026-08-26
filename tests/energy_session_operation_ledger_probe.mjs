import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';

const root = process.cwd();
const virtual = {
  '@react-native-async-storage/async-storage': `
    export const __store = new Map();
    let failNextSetNeedle = null;
    export const __failNextSetContaining = (needle) => { failNextSetNeedle = needle; };
    const api = {
      getItem: async (key) => __store.has(key) ? __store.get(key) : null,
      setItem: async (key, value) => {
        if (failNextSetNeedle && key.includes(failNextSetNeedle)) {
          failNextSetNeedle = null;
          throw new Error('injected_set_failure');
        }
        __store.set(key, String(value));
      },
      removeItem: async (key) => { __store.delete(key); },
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
      import { __store, __failNextSetContaining } from '@react-native-async-storage/async-storage';
      import { __setToken } from './account_generation';
      export { ledger, __store, __failNextSetContaining, __setToken };
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
const { ledger, __store, __failNextSetContaining, __setToken } = await import(`data:text/javascript;base64,${encoded}`);

const now = Date.now();
const opening = {
  baseEnergy: 5,
  bonusEnergy: 3,
  bonusExpiresAt: now + 60_000,
  refundCredit: 0,
  lastRecoveryTime: now - 10_000,
  maxEnergy: 5,
};
const intent = ledger.createEnergySessionIntent('arena_today', 'today', 'attempt-0001');
const first = await ledger.commitEnergySessionStart(intent, 4, opening, 'boot:test-a');
assert.equal(first.status, 'applied');
assert.deepEqual(first.operation.split, { bonus: 3, refundCredit: 0, base: 1 });
assert.equal(first.projection.baseEnergy, 4);
assert.equal(first.projection.bonusEnergy, 0);

const replay = await ledger.commitEnergySessionStart(intent, 4, opening, 'boot:test-a');
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

const refundReplay = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_failed',
  refunded.projection,
  'boot:test-a',
);
assert.equal(refundReplay.status, 'already-applied');
assert.deepEqual(refundReplay.projection, refunded.projection);

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
const sequenceOpening = { ...opening, bonusEnergy: 0, bonusExpiresAt: 0 };
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
assert.equal(retryAfterRefund.status, 'already-applied');
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
assert.equal(retryAfterNewDebit.status, 'already-applied');
assert.deepEqual(retryAfterNewDebit.projection, sequenceB.projection);

const elapsedProjection = {
  ...sequenceB.projection,
  baseEnergy: 5,
  lastRecoveryTime: sequenceB.projection.lastRecoveryTime + 60_000,
};
const retryAfterElapsedRecovery = await ledger.commitEnergySessionStart(
  sequenceAIntent, 1, elapsedProjection, 'boot:sequence',
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
const recoveredRefund = await ledger.refundEnergySessionStart(
  failureIntent.operationId, 'entry_failed', failureDebit.projection, 'boot:failure',
);
assert.equal(recoveredRefund.status, 'applied');
assert.equal(recoveredRefund.projection.baseEnergy, 5);
const recoveredRefundReplay = await ledger.refundEnergySessionStart(
  failureIntent.operationId, 'entry_failed', recoveredRefund.projection, 'boot:failure',
);
assert.equal(recoveredRefundReplay.status, 'already-applied');
assert.deepEqual(recoveredRefundReplay.projection, recoveredRefund.projection);

const preparedKeys = [...__store.keys()].filter((key) => key.startsWith('energy_session_prepared_v1:'));
assert.equal(preparedKeys.length, 0);

console.log(`ENERGY SESSION LEDGER PROBE: PASS (${__store.size} durable records)`);
