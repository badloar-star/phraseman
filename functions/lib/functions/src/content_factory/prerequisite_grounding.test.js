"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prerequisite_grounding_1 = require("./prerequisite_grounding");
describe('approved prerequisite grounding loader', () => {
    const payload = { stage: 'lesson_phrases', items: Array.from({ length: 50 }, (_, index) => ({ id: `p${index + 1}`, sourceText: `Исходная фраза ${index + 1}`, targetText: index === 0 ? 'I went home.' : `I read book ${String.fromCharCode(97 + (index % 26))}${String.fromCharCode(97 + Math.floor(index / 26))}.`, meaningKey: `meaning-${index + 1}`, cefr: 'A1', coverageTag: 'movement' })) };
    const bytes = Buffer.from(JSON.stringify(payload));
    const hash = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    const bucket = { file: () => ({ getMetadata: async () => [{ generation: '7' }], download: async () => [bytes] }) };
    it('loads verified approved phrases and deterministic candidate receipt', async () => {
        const grounding = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(bucket, {
            stageId: 'request:lesson_phrases:lesson-1:r1', artifactId: 'artifact:request:lesson_phrases:lesson-1:r1', kind: 'lesson_phrases', state: 'approved', studyTarget: 'en', cefr: 'A1', promptVersion: 'v2', objectPath: 'content-factory-stages/a/r1/a1-token.json', contentHash: hash, objectGeneration: '7',
        });
        expect(grounding.phrases).toEqual(payload.items);
        expect(grounding.extraction).toMatchObject({ state: 'ready', studyTarget: 'en' });
        expect(grounding.groundingHash).toMatch(/^[a-f0-9]{64}$/);
    });
    it.each([
        [{ state: 'needs_review' }, 'grounding_prerequisite_not_approved'],
        [{ objectGeneration: '8' }, 'grounding_generation_mismatch'],
        [{ contentHash: 'b'.repeat(64) }, 'grounding_content_hash_mismatch'],
    ])('fails closed for untrusted prerequisite metadata %#', async (override, code) => {
        await expect((0, prerequisite_grounding_1.loadApprovedLessonGrounding)(bucket, { stageId: 's', artifactId: 'a', kind: 'lesson_phrases', state: 'approved', studyTarget: 'en', cefr: 'A1', promptVersion: 'v2', objectPath: 'safe.json', contentHash: hash, objectGeneration: '7', ...override })).rejects.toThrow(code);
    });
    it('builds a derived grounding receipt with explicit previous-lesson exclusions', async () => {
        const loaded = await (0, prerequisite_grounding_1.loadApprovedLessonGrounding)(bucket, { stageId: 's', artifactId: 'a2', kind: 'lesson_phrases', state: 'approved', studyTarget: 'en', cefr: 'A1', promptVersion: 'v2', objectPath: 'safe.json', contentHash: hash, objectGeneration: '7' });
        const grounding = (0, prerequisite_grounding_1.prepareDerivedLessonGrounding)({ kind: 'lesson_irregular_verbs', lessonId: 2, phraseArtifactId: 'a2', loaded, ledger: { studyTarget: 'en', revision: 1, lessons: { 1: { phraseArtifactId: 'a1', candidateKeys: ['irregular_verb\u0000go'], fingerprint: 'a'.repeat(64) } } } });
        expect(grounding.acceptedCandidates).toEqual([]);
        expect(grounding.excludedPrevious).toEqual([expect.objectContaining({ lemma: 'go', previousLessonId: 1 })]);
    });
    it('loads an approved outline only after generation, hash and blueprint validation', async () => {
        const blueprintLesson = { lessonId: 16, topic: 'Phrasal verbs', sourcePhrases: ['Turn back.'], vocabularyFocus: ['turn back'], drills: ['phrasal_verbs'] };
        const artifact = { stage: 'lesson_outline', result: { lessonId: 16, objective: 'Phrasal verbs for routes', cefr: 'B1', coverage: ['route', 'clarification'], exclusions: ['advanced geography'], blueprint: { lessonId: 16, registryId: 'english-core-32:v1', topic: 'Phrasal verbs', sourceFocusUsed: ['turn back'] } } };
        const outlineBytes = Buffer.from(JSON.stringify(artifact));
        const outlineHash = require('node:crypto').createHash('sha256').update(outlineBytes).digest('hex');
        const outlineBucket = { file: () => ({ getMetadata: async () => [{ generation: '11' }], download: async () => [outlineBytes] }) };
        const metadata = { stageId: 'outline-stage', artifactId: 'outline-artifact', kind: 'lesson_outline', state: 'approved', studyTarget: 'en', cefr: 'B1', promptVersion: 'v3', objectPath: 'outline.json', contentHash: outlineHash, objectGeneration: '11', groundingReceipt: { registryId: 'english-core-32:v1', blueprintHash: 'a'.repeat(64), blueprintLesson, evidenceIds: ['e1'] } };
        await expect((0, prerequisite_grounding_1.loadApprovedOutlineGrounding)(outlineBucket, metadata)).resolves.toMatchObject({ artifactId: 'outline-artifact', outline: { coverage: ['route', 'clarification'] } });
        await expect((0, prerequisite_grounding_1.loadApprovedOutlineGrounding)(outlineBucket, { ...metadata, objectGeneration: '12' })).rejects.toThrow('outline_grounding_generation_mismatch');
        await expect((0, prerequisite_grounding_1.loadApprovedOutlineGrounding)(outlineBucket, { ...metadata, contentHash: 'b'.repeat(64) })).rejects.toThrow('outline_grounding_content_hash_mismatch');
    });
});
//# sourceMappingURL=prerequisite_grounding.test.js.map