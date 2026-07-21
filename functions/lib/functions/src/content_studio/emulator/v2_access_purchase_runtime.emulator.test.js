"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const firestore_1 = require("firebase/firestore");
const learning_v2_access_adapter_1 = require("../../learning_v2_access_adapter");
const PROJECT_ID = 'demo-phraseman-rules';
const RULES_PATH = node_path_1.default.resolve(__dirname, '../../../../firestore.rules');
const policy = {
    unitPriceShards: 3,
    maxPurchasedPerGate: 3,
    maxPurchasedPerChapter: 3,
    maxPurchasedPerSeason: 12,
};
const baseInput = {
    operationId: 'emulator-operation-1',
    fingerprint: 'a'.repeat(64),
    stableId: 'uid-access-emulator',
    accountGeneration: 4,
    nowMs: 1000,
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
async function seed(db) {
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'learning_v2_access_quotes', 'quote-emulator-1'), {
        quoteId: 'quote-emulator-1', stableId: 'uid-access-emulator', seasonId: 'season-emulator-1', gateId: 'gate-2',
        policyVersion: 'gate-policy-v1', releaseId: 'release-emulator-1', expiresAtMs: 2000,
        earnedDeficit: 2, accessStarsToApply: 2, unitPriceShards: 3, totalCostShards: 6,
    });
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator', 'v2_gate_receipts', 'season-emulator-1__gate-2'), {
        stableId: 'uid-access-emulator', accountGeneration: 4, seasonId: 'season-emulator-1', gateId: 'gate-2',
        releaseId: 'release-emulator-1', policyVersion: 'gate-policy-v1', requiredLoopsComplete: true,
        capabilityFallbackComplete: true, localPerformanceComplete: true, checkpointComplete: true,
        honestBlockCount: 2, recoveryReviewImpressionCount: 1, earnedDeficit: 2,
        purchasedForGate: 0, purchasedForChapter: 0, purchasedForSeason: 0, unlocked: false,
    });
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator'), {
        stableId: 'uid-access-emulator', accountGeneration: 4, shards: 10,
    });
}
describe('Learning V2 Access Boost Firestore transaction', () => {
    let environment;
    beforeAll(async () => {
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, 'utf8') },
        });
    });
    afterAll(async () => environment?.cleanup());
    test('persists one receipt and replays without a second spend', async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await seed(db);
            const repository = (0, learning_v2_access_adapter_1.makeFirestoreV2AccessRepository)(db);
            const first = await (0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(repository, policy, baseInput);
            const second = await (0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(repository, policy, baseInput);
            expect(first.replayed).toBe(false);
            expect(second).toEqual({ replayed: true, receipt: first.receipt });
            expect((await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(4);
            expect((await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator', 'v2_access_ledger', 'emulator-operation-1'))).exists()).toBe(true);
        });
    });
    test('insufficient balance does not write gate, receipt, or operation', async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await seed(db);
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator'), { shards: 1 }, { merge: true });
            const repository = (0, learning_v2_access_adapter_1.makeFirestoreV2AccessRepository)(db);
            await expect((0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(repository, policy, {
                ...baseInput,
                operationId: 'emulator-operation-2',
                fingerprint: 'b'.repeat(64),
                request: { ...baseInput.request, opId: 'emulator-operation-2' },
            })).rejects.toThrow('insufficient_balance');
            expect((await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(1);
            expect((await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator', 'v2_access_ledger', 'emulator-operation-2'))).exists()).toBe(false);
        });
    });
    test('concurrent identical purchases produce one spend and one replay', async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await seed(db);
            const repository = (0, learning_v2_access_adapter_1.makeFirestoreV2AccessRepository)(db);
            const concurrentInput = {
                ...baseInput,
                operationId: 'emulator-concurrent-1',
                fingerprint: 'c'.repeat(64),
                request: { ...baseInput.request, opId: 'emulator-concurrent-1' },
            };
            const results = await Promise.all([
                (0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(repository, policy, concurrentInput),
                (0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(repository, policy, concurrentInput),
            ]);
            expect(results.filter((result) => !result.replayed)).toHaveLength(1);
            expect(results.filter((result) => result.replayed)).toHaveLength(1);
            expect((await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', 'uid-access-emulator'))).data()?.shards).toBe(4);
        });
    });
});
//# sourceMappingURL=v2_access_purchase_runtime.emulator.test.js.map