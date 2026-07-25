"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonPhraseCheckpointSuperseded = void 0;
exports.generateLessonPhraseChunks = generateLessonPhraseChunks;
const node_crypto_1 = require("node:crypto");
const lesson_phrase_checkpoint_1 = require("./lesson_phrase_checkpoint");
const prompt_registry_1 = require("./prompt_registry");
const stage_runner_1 = require("./stage_runner");
class LessonPhraseCheckpointSuperseded extends Error {
    constructor() { super('lesson_phrase_checkpoint_superseded'); this.name = 'LessonPhraseCheckpointSuperseded'; }
}
exports.LessonPhraseCheckpointSuperseded = LessonPhraseCheckpointSuperseded;
async function generateLessonPhraseChunks(input) {
    if (input.basePacket.kind !== 'lesson_phrases' || input.basePacket.context.count !== 50 || !input.basePacket.groundingHash)
        throw new Error('lesson_phrase_generation_contract_invalid');
    const expected = { stageId: input.identity.stageId, revision: input.identity.revision, groundingHash: input.basePacket.groundingHash, cefr: input.basePacket.context.cefr, grounding: input.basePacket.grounding, sourceLocale: input.basePacket.context.sourceLocale, studyTarget: input.basePacket.context.studyTarget };
    let checkpoint = input.checkpoint === undefined ? (0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected) : (0, lesson_phrase_checkpoint_1.parseLessonPhraseCheckpoint)(input.checkpoint, expected);
    let logicalAttempts = 0;
    for (const chunkIndex of (0, lesson_phrase_checkpoint_1.missingLessonPhraseChunkIndexes)(checkpoint)) {
        const acceptedHashes = checkpoint.chunks.filter((chunk) => Boolean(chunk)).map((chunk) => chunk.contentHash);
        const acceptedItems = checkpoint.chunks.flatMap((chunk) => chunk?.artifact.items ?? []);
        const packet = (0, prompt_registry_1.buildLessonPhraseChunkPromptPacket)(input.basePacket, chunkIndex, acceptedHashes, { ids: acceptedItems.map((item) => String(item.id ?? '')), meaningKeys: acceptedItems.map((item) => String(item.meaningKey ?? '')), pairs: acceptedItems.map((item) => `${String(item.sourceText ?? '')}\n${String(item.targetText ?? '')}`) });
        const generated = await (0, stage_runner_1.runGenerationStage)({ provider: input.provider, model: input.model, packet });
        logicalAttempts += generated.attempts;
        checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, chunkIndex, generated.artifact, expected, generated.receipt);
        if (!await input.persistCheckpoint(checkpoint))
            throw new LessonPhraseCheckpointSuperseded();
    }
    const artifact = (0, lesson_phrase_checkpoint_1.assembleLessonPhraseCheckpoint)(checkpoint, expected);
    const chunkReceipts = checkpoint.chunks.map((chunk) => chunk?.generationReceipt ?? null);
    const providerUnits = chunkReceipts.reduce((sum, receipt) => sum + Number(receipt?.providerRequests?.usedUnits ?? 0), 0);
    const receipt = Object.freeze({ status: 'structural_pass_pending_linguistic_review', promptVersion: input.basePacket.promptVersion, promptHash: input.basePacket.promptHash, contextHash: input.basePacket.contextHash, schemaHash: input.basePacket.schemaHash, groundingHash: input.basePacket.groundingHash, model: input.model, policyVersion: 'content-stage-policy-r9a-v1', chunkCount: 5, chunkSize: 10, checkpointHash: checkpoint.contentHash, acceptedChunkHashes: Object.freeze(checkpoint.chunks.map((chunk) => chunk.contentHash)), assemblyHash: (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(artifact)).digest('hex'), providerRequests: Object.freeze({ requestedUnits: providerUnits, usedUnits: providerUnits, refundedUnits: 0, unit: 'provider_requests' }), chunkReceipts: Object.freeze(chunkReceipts), operatorCorrection: Object.freeze({ status: 'unavailable_not_collected' }), validation: Object.freeze({ structuralValidated: true, linguisticValidated: false, semanticDuplicateValidated: false, errors: Object.freeze([]) }) });
    return Object.freeze({ artifact, attempts: logicalAttempts, receipt, checkpoint });
}
//# sourceMappingURL=lesson_phrase_generation.js.map