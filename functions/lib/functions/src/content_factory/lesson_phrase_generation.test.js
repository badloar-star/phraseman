"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_context_1 = require("./prompt_context");
const prompt_registry_1 = require("./prompt_registry");
const lesson_phrase_generation_1 = require("./lesson_phrase_generation");
const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const phrase = (index) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const artifact = (chunkIndex) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(chunkIndex * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });
const basePacket = (0, prompt_registry_1.buildStagePromptPacket)('lesson_phrases', 'v3', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Daily routine', count: 50, approvedArtifactIds: ['outline'], exemplarIds: [], previousContentFingerprints: [] }), grounding);
const identity = { stageId: 'request:lesson_phrases:lesson-20:r1', revision: 1 };
describe('lesson phrase chunk generation', () => {
    test('persists 30/50, survives malformed refill, then requests only missing 20', async () => {
        const persisted = [];
        const firstProvider = { generate: async ({ prompt }) => {
                const match = prompt.match(/chunk (\d) of 5/);
                const index = Number(match?.[1] ?? 1) - 1;
                return index < 3 ? JSON.stringify(artifact(index)) : '{}';
            } };
        const firstError = await (0, lesson_phrase_generation_1.generateLessonPhraseChunks)({ provider: firstProvider, model: 'fake', basePacket, identity, persistCheckpoint: async (checkpoint) => { persisted.push(checkpoint); return true; } }).catch((error) => error);
        expect(firstError.message).toBe('generation_stage_schema_failed');
        const checkpoint30 = persisted.at(-1);
        expect(checkpoint30).toMatchObject({ acceptedCount: 30, missingCount: 20, publishable: false });
        const originalHashes = checkpoint30.chunks.slice(0, 3).map((item) => item.contentHash);
        const requested = [];
        const retryProvider = { generate: async ({ prompt }) => { const index = Number(prompt.match(/chunk (\d) of 5/)?.[1]) - 1; requested.push(index); return JSON.stringify(artifact(index)); } };
        const result = await (0, lesson_phrase_generation_1.generateLessonPhraseChunks)({ provider: retryProvider, model: 'fake', basePacket, identity, checkpoint: checkpoint30, persistCheckpoint: async (checkpoint) => { persisted.push(checkpoint); return true; } });
        expect(requested).toEqual([3, 4]);
        expect(result.artifact.items).toHaveLength(50);
        expect(result.checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash)).toEqual(originalHashes);
        expect(result.receipt).toMatchObject({ status: 'structural_pass_pending_linguistic_review', chunkCount: 5, checkpointHash: result.checkpoint.contentHash, validation: { structuralValidated: true, linguisticValidated: false, semanticDuplicateValidated: false } });
    });
});
//# sourceMappingURL=lesson_phrase_generation.test.js.map