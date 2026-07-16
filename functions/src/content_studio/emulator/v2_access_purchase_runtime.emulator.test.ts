import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  finalizeV2AccessPurchase,
  makeFirestoreV2AccessRepository,
} from '../../learning_v2_access_adapter';

const PROJECT_ID = 'demo-phraseman-rules';
const RULES_PATH = path.resolve(__dirname, '../../../../firestore.rules');
const policy = {
  unitPriceShards: 3,
  maxPurchasedPerGate: 3,
  maxPurchasedPerChapter: 3,
  maxPurchasedPerSeason: 12,
} as const;
const baseInput = {
  operationId: 'emulator-operation-1',
  fingerprint: 'a'.repeat(64),
  stableId: 'uid-access-emulator',
  accountGeneration: 4,
  nowMs: 1_000,
  request: {
    opId: 'emulator-operation-1',
    quoteId: 'quote-emulator-1',
    stableId: 'uid-access-emulator',
    seasonId: 'season-emulator-1',
    gateId: 'gate-2',
    releaseId: 'release-emulator-1',
    policyVersion: 'gate-policy-v1',
    expectedCostShards: 6,
  },
};

async function seed(db: ReturnType<RulesTestEnvironment['authenticatedContext']> extends never ? never : any) {
  await setDoc(doc(db, 'learning_v2_access_quotes', 'quote-emulator-1'), {
    quoteId: 'quote-emulator-1', stableId: 'uid-access-emulator', seasonId: 'season-emulator-1', gateId: 'gate-2',
    policyVersion: 'gate-policy-v1', releaseId: 'release-emulator-1', expiresAtMs: 2_000,
    earnedDeficit: 2, accessStarsToApply: 2, unitPriceShards: 3, totalCostShards: 6,
  });
  await setDoc(doc(db, 'learning_v2_gate_receipts', 'season-emulator-1__gate-2'), {
    stableId: 'uid-access-emulator', accountGeneration: 4, seasonId: 'season-emulator-1', gateId: 'gate-2',
    releaseId: 'release-emulator-1', policyVersion: 'gate-policy-v1', requiredLoopsComplete: true,
    capabilityFallbackComplete: true, localPerformanceComplete: true, checkpointComplete: true,
    honestBlockCount: 2, recoveryReviewImpressionCount: 1, earnedDeficit: 2,
    purchasedForGate: 0, purchasedForChapter: 0, purchasedForSeason: 0, unlocked: false,
  });
  await setDoc(doc(db, 'users', 'uid-access-emulator'), {
    stableId: 'uid-access-emulator', accountGeneration: 4, shards: 10,
  });
}

describe('Learning V2 Access Boost Firestore transaction', () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });
  afterAll(async () => environment?.cleanup());

  test('persists one receipt and replays without a second spend', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await seed(db);
      const repository = makeFirestoreV2AccessRepository(db as never);
      const first = await finalizeV2AccessPurchase(repository, policy, baseInput);
      const second = await finalizeV2AccessPurchase(repository, policy, baseInput);
      expect(first.replayed).toBe(false);
      expect(second).toEqual({ replayed: true, receipt: first.receipt });
      expect((await getDoc(doc(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(4);
      expect((await getDoc(doc(db, 'learning_v2_access_ledger', 'uid-access-emulator_emulator-operation-1'))).exists()).toBe(true);
    });
  });

  test('insufficient balance does not write gate, receipt, or operation', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await seed(db);
      await setDoc(doc(db, 'users', 'uid-access-emulator'), { shards: 1 }, { merge: true });
      const repository = makeFirestoreV2AccessRepository(db as never);
      await expect(finalizeV2AccessPurchase(repository, policy, {
        ...baseInput,
        operationId: 'emulator-operation-2',
        fingerprint: 'b'.repeat(64),
        request: { ...baseInput.request, opId: 'emulator-operation-2' },
      })).rejects.toThrow('insufficient_balance');
      expect((await getDoc(doc(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(1);
      expect((await getDoc(doc(db, 'learning_v2_access_ledger', 'uid-access-emulator_emulator-operation-2'))).exists()).toBe(false);
    });
  });

  test('concurrent identical purchases produce one spend and one replay', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await seed(db);
      const repository = makeFirestoreV2AccessRepository(db as never);
      const concurrentInput = {
        ...baseInput,
        operationId: 'emulator-concurrent-1',
        fingerprint: 'c'.repeat(64),
        request: { ...baseInput.request, opId: 'emulator-concurrent-1' },
      };
      const results = await Promise.all([
        finalizeV2AccessPurchase(repository, policy, concurrentInput),
        finalizeV2AccessPurchase(repository, policy, concurrentInput),
      ]);
      expect(results.filter((result) => !result.replayed)).toHaveLength(1);
      expect(results.filter((result) => result.replayed)).toHaveLength(1);
      expect((await getDoc(doc(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(4);
    });
  });
});
