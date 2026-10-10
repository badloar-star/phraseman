import assert from 'node:assert/strict';
import { build } from 'esbuild';

const root = process.cwd();
const virtual = {
  '@react-native-async-storage/async-storage': `
    export const __store = new Map();
    const api = {
      getItem: async key => __store.has(key) ? __store.get(key) : null,
      setItem: async (key, value) => { __store.set(key, String(value)); },
      removeItem: async key => { __store.delete(key); },
      multiSet: async pairs => { for (const [key, value] of pairs) __store.set(key, String(value)); },
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
    export const __setToken = next => { token = next; };
    export const captureAccountGeneration = () => token;
    export const isCurrentAccountGeneration = (candidate, owner) =>
      candidate === token && (!owner || token.stableId === owner) && token.phase === 'active';
    export const withAccountTransitionLock = async fn => fn({ owner: token.stableId });
  `,
  './bonus_energy_store': `export const BONUS_ENERGY_KEY = 'energy_gift_bonus';`,
  './gift_account_storage': `export const requireGiftAccountStorageKey = (base, token) => base + ':' + token.stableId;`,
  './storage_mutex': `export const withStorageLock = async fn => fn();`,
};

const plugin = {
  name: 'energy-ledger-probe-mocks',
  setup(api) {
    api.onResolve({ filter: /.*/ }, args => Object.hasOwn(virtual, args.path)
      ? { path: args.path, namespace: 'virtual' }
      : null);
    api.onLoad({ filter: /.*/, namespace: 'virtual' }, args => ({
      contents: virtual[args.path], loader: 'js', resolveDir: root,
    }));
  },
};

const built = await build({
  stdin: {
    contents: `
      import * as ledger from './app/energy_session_operation_ledger.ts';
      import { __store } from '@react-native-async-storage/async-storage';
      import { __setToken } from './account_generation';
      export { ledger, __store, __setToken };
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
const { ledger, __store, __setToken } = await import(`data:text/javascript;base64,${encoded}`);
const now = Date.now();
// зачем (10.10): PM-081 (2eeef959e) — шкала энергии 0..5, бонусная энергия снята (ENERGY_BONUS_CAPACITY_LIMIT = 0).
// Сценарий переписан под 2.0, проверки те же: применение, повтор, конфликт id, возврат, повтор возврата,
// план списания, нехватка, изоляция владельцев.
const opening = {
  schemaVersion: 2,
  baseEnergy: 5,
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
  refundCredit: 0,
  lastSettledAt: now,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
  maxEnergy: 5,
};

const intent = ledger.createEnergySessionIntent('lesson', 'today', 'attempt-0001');
const first = await ledger.commitEnergySessionStart(intent, 1, opening, 'boot:test-a');
assert.equal(first.status, 'applied');
assert.deepEqual(first.operation.split, { bonus: 0, refundCredit: 0, base: 1 });
assert.equal(first.projection.baseEnergy, 4);
assert.equal(first.projection.bonusEnergy, 0);

const replay = await ledger.commitEnergySessionStart(intent, 1, first.projection, 'boot:test-a');
assert.equal(replay.status, 'already-applied');
assert.deepEqual(replay.projection, first.projection);

const conflict = await ledger.commitEnergySessionStart(
  { ...intent, grant: { ...intent.grant, subjectId: 'different' } },
  1,
  opening,
  'boot:test-a',
);
assert.deepEqual(conflict, { status: 'failed', reason: 'operation_id_conflict' });

const refunded = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_failed',
  first.projection,
  'boot:test-a',
);
assert.equal(refunded.status, 'applied');
assert.equal(refunded.projection.baseEnergy, 5);

const refundReplay = await ledger.refundEnergySessionStart(
  intent.operationId,
  'entry_failed',
  refunded.projection,
  'boot:test-a',
);
assert.equal(refundReplay.status, 'already-applied');

const lessonPlan = ledger.planEnergySessionDebit(opening, 1, now);
assert.ok(lessonPlan);
assert.equal(lessonPlan.after.baseEnergy, 4);
assert.deepEqual(lessonPlan.split, { bonus: 0, refundCredit: 0, base: 1 });

const insufficient = ledger.planEnergySessionDebit({ ...opening, baseEnergy: 0 }, 1, now);
assert.equal(insufficient, null);

__setToken({ stableId: 'owner-b', generation: 2, phase: 'active' });
const ownerBIntent = ledger.createEnergySessionIntent('flashcards', 'deck', 'attempt-b');
const ownerB = await ledger.commitEnergySessionStart(ownerBIntent, 1, opening, 'boot:test-b');
assert.equal(ownerB.status, 'applied');
assert.equal(ownerB.projection.baseEnergy, 4);
assert.ok([...__store.keys()].some(key => key.includes('owner-b')));

const preparedKeys = [...__store.keys()].filter(key => key.startsWith('energy_session_prepared_v1:'));
assert.equal(preparedKeys.length, 0);
console.log(`ENERGY SESSION LEDGER PROBE: PASS (${__store.size} durable records)`);
