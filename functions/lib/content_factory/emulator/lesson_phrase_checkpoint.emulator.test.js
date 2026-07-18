"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const prompt_context_1 = require("../prompt_context");
const prompt_registry_1 = require("../prompt_registry");
const lesson_phrase_generation_1 = require("../lesson_phrase_generation");
const generation_execution_1 = require("../generation_execution");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `lesson-phrase-checkpoint-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const phrase = (index) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const artifact = (chunkIndex) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(chunkIndex * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });
const basePacket = (0, prompt_registry_1.buildStagePromptPacket)('lesson_phrases', 'v3', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Daily routine', count: 50, approvedArtifactIds: ['outline'], exemplarIds: [], previousContentFingerprints: [] }), grounding);
test('cancelled lease preserves 30/50 and retry requests only missing chunks', async () => {
    const stageId = `checkpoint-race-${process.pid}`;
    const ref = db.collection('content_factory_stages').doc(stageId);
    await ref.set({ state: 'running', attempts: 1, leaseToken: 'lease-1' });
    let providerCalls = 0;
    const firstProvider = { generate: async ({ prompt }) => {
            const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1;
            providerCalls += 1;
            if (index === 3)
                await ref.update({ state: 'cancelled', leaseToken: admin.firestore.FieldValue.delete() });
            return JSON.stringify(artifact(index));
        } };
    const persist = (lease) => async (checkpoint) => (0, generation_execution_1.runGuardedGenerationTransaction)({ lease, allowedStates: ['running'], runTransaction: (handler) => db.runTransaction(handler), read: async (tx) => { const snap = await tx.get(ref); return { current: snap.data() ?? null, context: undefined }; }, commit: (tx) => { tx.update(ref, { lessonPhraseCheckpoint: checkpoint, acceptedCount: checkpoint.acceptedCount, missingCount: checkpoint.missingCount }); } });
    await expect((0, lesson_phrase_generation_1.generateLessonPhraseChunks)({ provider: firstProvider, model: 'fake', basePacket, identity: { stageId, revision: 1 }, persistCheckpoint: persist({ attempt: 1, leaseToken: 'lease-1' }) })).rejects.toBeInstanceOf(lesson_phrase_generation_1.LessonPhraseCheckpointSuperseded);
    const checkpoint30 = (await ref.get()).data()?.lessonPhraseCheckpoint;
    expect(providerCalls).toBe(4);
    expect(checkpoint30).toMatchObject({ acceptedCount: 30, missingCount: 20, publishable: false });
    const hashes = checkpoint30.chunks.slice(0, 3).map((item) => item.contentHash);
    await ref.update({ state: 'running', attempts: 2, leaseToken: 'lease-2' });
    const requested = [];
    const retryProvider = { generate: async ({ prompt }) => { const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1; requested.push(index); return JSON.stringify(artifact(index)); } };
    const result = await (0, lesson_phrase_generation_1.generateLessonPhraseChunks)({ provider: retryProvider, model: 'fake', basePacket, identity: { stageId, revision: 1 }, checkpoint: checkpoint30, persistCheckpoint: persist({ attempt: 2, leaseToken: 'lease-2' }) });
    expect(requested).toEqual([3, 4]);
    expect(result.artifact.items).toHaveLength(50);
    expect(result.checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash)).toEqual(hashes);
});
afterAll(async () => { await db.terminate(); await app.delete(); });
//# sourceMappingURL=lesson_phrase_checkpoint.emulator.test.js.map