import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { finalizeV2AccessPurchase, makeFirestoreV2AccessRepository } from '../../learning_v2_access_adapter';

const PROJECT_ID = 'demo-phraseman-access-boost';
const RULES_PATH = path.resolve(__dirname, '../../../../firestore.rules');
const policy = {
  unitPriceShards: 3,
  maxPurchasedPerGate: 3,
  maxPurchasedPerChapter: 3,
  maxPurchasedPerSeason: 12,
} as const;

const account = (stableId: string, generation = 1, shards = 10) => ({
  stableId,
  accountGeneration: generation,
  shards,
});

const gate = (stableId: string, generation = 1) => ({
  stableId,
  accountGeneration: generation,
  seasonId: 'season-emulator',
  gateId: 'gate-2',
  releaseId: 'release-emulator',
  policyVersion: 'gate-policy-v1',
  requiredLoopsComplete: true,
  capabilityFallbackComplete: true,
  localPerformanceComplete: true,
  checkpointComplete: true,
  honestBlockCount: 2,
  recoveryReviewImpressionCount: 1,
  earnedDeficit: 2,
  purchasedForGate: 0,
  purchasedForChapter: 0,
  purchasedForSeason: 0,
  unlocked: false,
});

const quote = (stableId: string) => ({
  quoteId: `${stableId}-quote`,
  stableId,
  seasonId: 'season-emulator',
  gateId: 'gate-2',
  releaseId: 'release-emulator',
  policyVersion: 'gate-policy-v1',
  expiresAtMs: 2_000,
  earnedDeficit: 2,
  accessStarsToApply: 2,
  unitPriceShards: 3,
  totalCostShards: 6,
});

const purchaseInput = (stableId: string, operationId: string, accountGeneration = 1) => ({
  operationId,
  fingerprint: 'a'.repeat(64),
  authUid: stableId,
  stableId,
  accountGeneration,
  nowMs: 1_000,
  request: {
    opId: operationId,
    quoteId: `${stableId}-quote`,
    stableId,
    seasonId: 'season-emulator',
    gateId: 'gate-2',
    releaseId: 'release-emulator',
    policyVersion: 'gate-policy-v1',
    expectedCostShards: 6,
  },
});

async function seedServerState(environment: RulesTestEnvironment, stableId: string, generation = 1, shards = 10) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'auth_links', stableId), { stable_id: stableId });
    await setDoc(doc(db, 'users', stableId, 'v2_access_quotes', `${stableId}-quote`), quote(stableId));
    await setDoc(doc(db, 'users', stableId, 'v2_gate_receipts', 'season-emulator__gate-2'), gate(stableId, generation));
    await setDoc(doc(db, 'users', stableId), account(stableId, generation, shards));
  });
}

describe('Learning V2 Access Boost real Firestore emulator gate', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  beforeEach(async () => {
    await environment.clearFirestore();
  });

  afterAll(async () => environment?.cleanup());

  test('server transaction spends once and same operation replays idempotently', async () => {
    await seedServerState(environment, 'access-a');
    await environment.withSecurityRulesDisabled(async (context) => {
      const repository = makeFirestoreV2AccessRepository(context.firestore() as never);
      const input = purchaseInput('access-a', 'operation-emulator-1');
      const first = await finalizeV2AccessPurchase(repository, policy, input);
      const second = await finalizeV2AccessPurchase(repository, policy, input);
      expect(first.replayed).toBe(false);
      expect(second).toEqual({ replayed: true, receipt: first.receipt });
      expect((await getDoc(doc(context.firestore(), 'users', 'access-a'))).data()?.shards).toBe(4);
      expect((await getDoc(doc(context.firestore(), 'users', 'access-a', 'v2_access_ledger', input.operationId))).exists()).toBe(true);
    });
  });

  test('concurrent identical requests have one spend and one replay', async () => {
    await seedServerState(environment, 'access-concurrent');
    await environment.withSecurityRulesDisabled(async (context) => {
      const repository = makeFirestoreV2AccessRepository(context.firestore() as never);
      const input = purchaseInput('access-concurrent', 'operation-emulator-concurrent');
      const results = await Promise.all([
        finalizeV2AccessPurchase(repository, policy, input),
        finalizeV2AccessPurchase(repository, policy, input),
      ]);
      expect(results.filter((result) => !result.replayed)).toHaveLength(1);
      expect(results.filter((result) => result.replayed)).toHaveLength(1);
      expect((await getDoc(doc(context.firestore(), 'users', 'access-concurrent'))).data()?.shards).toBe(4);
    });
  });

  test('insufficient balance and stale generation reject without writes', async () => {
    await seedServerState(environment, 'access-reject', 4, 1);
    await environment.withSecurityRulesDisabled(async (context) => {
      const repository = makeFirestoreV2AccessRepository(context.firestore() as never);
      await expect(finalizeV2AccessPurchase(repository, policy, purchaseInput('access-reject', 'operation-stale', 3))).rejects.toThrow('account_generation_mismatch');
      await expect(finalizeV2AccessPurchase(repository, policy, purchaseInput('access-reject', 'operation-poor', 4))).rejects.toThrow('insufficient_balance');
      expect((await getDoc(doc(context.firestore(), 'users', 'access-reject'))).data()).toMatchObject({ shards: 1, accountGeneration: 4 });
      expect((await getDoc(doc(context.firestore(), 'users', 'access-reject', 'v2_access_ledger', 'operation-stale'))).exists()).toBe(false);
      expect((await getDoc(doc(context.firestore(), 'users', 'access-reject', 'v2_access_ledger', 'operation-poor'))).exists()).toBe(false);
    });
  });

  test('account A cannot bind to account B and account B remains isolated', async () => {
    await seedServerState(environment, 'access-a');
    await seedServerState(environment, 'access-b');
    await environment.withSecurityRulesDisabled(async (context) => {
      const repository = makeFirestoreV2AccessRepository(context.firestore() as never);
      const forged = purchaseInput('access-a', 'operation-forged');
      forged.request.stableId = 'access-b';
      await expect(finalizeV2AccessPurchase(repository, policy, forged)).rejects.toThrow('identity_invalid');
      const valid = await finalizeV2AccessPurchase(repository, policy, purchaseInput('access-a', 'operation-isolated'));
      expect(valid.receipt.stableId).toBe('access-a');
      expect((await getDoc(doc(context.firestore(), 'users', 'access-a'))).data()?.shards).toBe(4);
      expect((await getDoc(doc(context.firestore(), 'users', 'access-b'))).data()?.shards).toBe(10);
    });
  });

  test('clients cannot write shards, gate receipts, operation ledger, or public quotes directly', async () => {
    await seedServerState(environment, 'access-rules', 1, 10);
    const context = environment.authenticatedContext('access-rules');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'users', 'access-rules'), { shards: 999 }, { merge: true }));
    await assertFails(setDoc(doc(db, 'users', 'access-rules', 'v2_gate_receipts', 'season-emulator__gate-2'), { unlocked: true }, { merge: true }));
    await assertFails(setDoc(doc(db, 'users', 'access-rules', 'v2_access_operations', 'operation-client'), { receipt: true }));
    await assertFails(setDoc(doc(db, 'users', 'access-rules', 'v2_access_quotes', 'client-quote'), { stableId: 'access-rules', totalCostShards: 0 }));
  });
});
