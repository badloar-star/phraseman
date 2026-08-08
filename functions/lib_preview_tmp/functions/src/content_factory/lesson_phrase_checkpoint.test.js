"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lesson_phrase_checkpoint_1 = require("./lesson_phrase_checkpoint");
const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const phrase = (index) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const chunk = (chunkIndex) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(chunkIndex * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });
const expected = { cefr: 'A2', grounding, stageId: 'request:lesson_phrases:lesson-20:r1', revision: 1, groundingHash: 'a'.repeat(64), sourceLocale: 'ru', studyTarget: 'en' };
describe('lesson phrase chunk checkpoint', () => {
    test('accepts only complete valid chunks and exposes only missing chunk indexes', () => {
        let checkpoint = (0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected);
        checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 0, chunk(0), expected);
        checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 1, chunk(1), expected);
        checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 2, chunk(2), expected);
        expect(checkpoint).toMatchObject({ acceptedCount: 30, missingCount: 20, publishable: false });
        expect((0, lesson_phrase_checkpoint_1.missingLessonPhraseChunkIndexes)(checkpoint)).toEqual([3, 4]);
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 3, { ...chunk(3), items: chunk(3).items.slice(0, 9) }, expected)).toThrow('lesson_phrase_chunk_invalid');
    });
    test('keeps accepted chunks immutable and accepts an idempotent replay', () => {
        let checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, chunk(0), expected);
        const hash = checkpoint.chunks[0]?.contentHash;
        expect((0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 0, chunk(0), expected)).toEqual(checkpoint);
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 0, { ...chunk(0), items: [phrase(999), ...chunk(0).items.slice(1)] }, expected)).toThrow('lesson_phrase_chunk_immutable');
        expect(checkpoint.chunks[0]?.contentHash).toBe(hash);
    });
    test('smoke: 30/50, malformed refill, retry only 20, final exactly 50 with original hashes', () => {
        let checkpoint = (0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected);
        for (const index of [0, 1, 2])
            checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, index, chunk(index), expected);
        const originalHashes = checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash);
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, 3, { stage: 'lesson_phrases', items: [], coverageReceipt: {} }, expected)).toThrow('lesson_phrase_chunk_invalid');
        for (const index of (0, lesson_phrase_checkpoint_1.missingLessonPhraseChunkIndexes)(checkpoint))
            checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)(checkpoint, index, chunk(index), expected);
        const artifact = (0, lesson_phrase_checkpoint_1.assembleLessonPhraseCheckpoint)(checkpoint, expected);
        expect(artifact.items).toHaveLength(50);
        expect(new Set(artifact.items.map((item) => item.id)).size).toBe(50);
        expect(checkpoint.chunks.slice(0, 3).map((item) => item?.contentHash)).toEqual(originalHashes);
    });
    test('parses only matching revision, grounding and hash-valid stored checkpoints', () => {
        const checkpoint = (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, chunk(0), expected);
        expect((0, lesson_phrase_checkpoint_1.parseLessonPhraseCheckpoint)(checkpoint, expected)).toEqual(checkpoint);
        expect(() => (0, lesson_phrase_checkpoint_1.parseLessonPhraseCheckpoint)({ ...checkpoint, revision: 2 }, expected)).toThrow('lesson_phrase_checkpoint_identity_mismatch');
        expect(() => (0, lesson_phrase_checkpoint_1.parseLessonPhraseCheckpoint)({ ...checkpoint, contentHash: 'b'.repeat(64) }, expected)).toThrow('lesson_phrase_checkpoint_hash_mismatch');
    });
    test('rejects swapped RU/EN and unsafe mixed-script direction while allowing names and numbers', () => {
        const swapped = chunk(0);
        swapped.items[0] = { ...swapped.items[0], sourceText: 'I am ready', targetText: 'Я готов' };
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, swapped, expected)).toThrow('lesson_phrase_chunk_invalid');
        const latinSource = chunk(0);
        latinSource.items[0] = { ...latinSource.items[0], sourceText: 'Only Latin source' };
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, latinSource, expected)).toThrow('lesson_phrase_chunk_invalid');
        const cyrillicTarget = chunk(0);
        cyrillicTarget.items[0] = { ...cyrillicTarget.items[0], targetText: 'This is текст на двух языках' };
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, cyrillicTarget, expected)).toThrow('lesson_phrase_chunk_invalid');
        const namesAndNumbers = chunk(0);
        namesAndNumbers.items[0] = { ...namesAndNumbers.items[0], sourceText: 'Я встречаю Anna в 5 часов', targetText: 'I meet Anna at 5' };
        expect(() => (0, lesson_phrase_checkpoint_1.acceptLessonPhraseChunk)((0, lesson_phrase_checkpoint_1.createLessonPhraseCheckpoint)(expected), 0, namesAndNumbers, expected)).not.toThrow();
    });
});
//# sourceMappingURL=lesson_phrase_checkpoint.test.js.map