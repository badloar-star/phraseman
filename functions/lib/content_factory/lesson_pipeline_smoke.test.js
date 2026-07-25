"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_context_1 = require("./prompt_context");
const prompt_registry_1 = require("./prompt_registry");
const stage_runner_1 = require("./stage_runner");
const lesson_extractors_1 = require("./lesson_extractors");
const dedupe_ledger_1 = require("./dedupe_ledger");
const english_theory_exemplars_generated_1 = require("./english_theory_exemplars.generated");
const theory_generation_1 = require("./theory_generation");
jest.setTimeout(30000);
const providerFor = (payload) => ({ generate: async () => JSON.stringify(payload) });
const context = (sourceLocale, count, approvedArtifactIds = []) => (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale, cefr: 'A2', objective: 'Ask for directions and understand route instructions', count, approvedArtifactIds, exemplarIds: [], previousContentFingerprints: [] });
function priorLedger(lessonId) {
    const lessons = Object.fromEntries(Array.from({ length: lessonId - 1 }, (_, index) => [index + 1, { phraseArtifactId: `phrases-${index + 1}`, candidateKeys: index === 0 ? ['word\u0000station'] : [], fingerprint: String(index + 1).padStart(64, 'a').slice(-64) }]));
    return { studyTarget: 'en', revision: lessonId - 1, lessons };
}
describe('R3 lesson pipeline fake-provider smoke', () => {
    it.each(['ru', 'uk'])('passes lessons 1, 16 and 32 twice for en <- %s', async (sourceLocale) => {
        for (let pass = 1; pass <= 2; pass += 1)
            for (const lessonId of [1, 16, 32]) {
                const outline = { stage: 'lesson_outline', result: { lessonId, objective: 'Directions', cefr: 'A2', coverage: ['request', 'route'], exclusions: ['advanced geography'], blueprint: { lessonId, registryId: 'english-core:v1', topic: 'Directions', sourceFocusUsed: ['turn left'] } } };
                const blueprintGrounding = { registryId: 'english-core:v1', blueprintHash: 'a'.repeat(64), blueprintLesson: { lessonId, topic: 'Directions', sourcePhrases: ['turn left'], vocabularyFocus: ['turn left'], drills: ['route'] }, evidenceIds: ['fake-evidence'] };
                await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor(outline), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)('lesson_outline', 'v3', context(sourceLocale, 1), blueprintGrounding) })).resolves.toMatchObject({ attempts: 1 });
                const phrases = Array.from({ length: 50 }, (_, index) => ({ id: `l${lessonId}-p${index + 1}`, sourceText: `${sourceLocale} source phrase ${lessonId}-${index + 1}`, targetText: `I went in front of the station on route alpha ${String.fromCharCode(97 + (index % 26))}${String.fromCharCode(97 + Math.floor(index / 26))}.`, meaningKey: `lesson-${lessonId}-meaning-${index + 1}`, cefr: 'A2', coverageTag: index % 2 ? 'request' : 'route' }));
                const phraseGrounding = { artifactId: `outline-${lessonId}`, contentHash: 'b'.repeat(64), outline: outline.result, blueprintGrounding };
                await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor({ stage: 'lesson_phrases', items: phrases, coverageReceipt: { coveredTags: ['request', 'route'], respectedExclusions: ['advanced geography'] } }), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)('lesson_phrases', 'v3', context(sourceLocale, 50, [`outline-${lessonId}`]), phraseGrounding) })).resolves.toMatchObject({ attempts: 1 });
                const extraction = (0, lesson_extractors_1.extractLessonCandidates)({ studyTarget: 'en', phrases });
                expect(extraction.state).toBe('ready');
                if (extraction.state !== 'ready')
                    throw new Error('expected supported extraction');
                for (const [kind, candidates] of [
                    ['lesson_vocabulary', extraction.vocabulary],
                    ['lesson_irregular_verbs', extraction.irregularVerbs],
                    ['lesson_prepositions', extraction.prepositions],
                ]) {
                    const receipt = (0, dedupe_ledger_1.dedupeLessonCandidates)(priorLedger(lessonId), { lessonId, phraseArtifactId: `phrases-${lessonId}`, candidates });
                    expect(receipt.state).toBe('ready');
                    if (receipt.state !== 'ready' || receipt.accepted.length === 0)
                        throw new Error(`expected candidates:${kind}`);
                    const grounding = { phraseArtifactId: `phrases-${lessonId}`, acceptedCandidates: receipt.accepted, excludedPrevious: receipt.excludedPrevious };
                    const items = receipt.accepted.map((candidate) => ({ ...candidate, translation: `translation:${candidate.lemma}`, explanation: `Explanation for ${candidate.lemma}.`, ...(kind === 'lesson_irregular_verbs' ? { forms: [candidate.lemma, candidate.surface, candidate.surface] } : {}) }));
                    await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor({ stage: kind, items }), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)(kind, 'v3', context(sourceLocale, items.length, [`phrases-${lessonId}`]), grounding) })).resolves.toMatchObject({ attempts: 1 });
                }
                const selection = (0, theory_generation_1.retrieveTheoryExemplars)(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY, { objective: 'directions and route instructions', approvedTargetPhrases: phrases.map((item) => item.targetText) });
                expect(selection.state).toBe('ready');
                if (selection.state !== 'ready')
                    throw new Error('expected theory selection');
                const fragmentId = selection.exemplars[0].fragments[0].fragmentId;
                const evidenceRefs = [`phrase:${phrases[0].id}`, `exemplar:${fragmentId}`];
                const theory = { stage: 'lesson_theory', result: { rules: [{ rule: 'Use an imperative for directions.', evidenceRefs }], examples: [{ targetText: 'Go straight.', explanation: 'Direct instruction.', evidenceRefs }], commonMistakes: [{ wrong: 'Go to straight.', correction: 'Go straight.', evidenceRefs }], miniCheck: [{ prompt: '___ straight.', answer: 'Go', evidenceRefs }], exemplarIds: selection.exemplars.map((item) => item.exemplarId) } };
                const theoryGrounding = { phrases, exemplars: selection.exemplars };
                await expect((0, stage_runner_1.runGenerationStage)({ provider: providerFor(theory), model: 'fake', packet: (0, prompt_registry_1.buildStagePromptPacket)('lesson_theory', 'v3', context(sourceLocale, 1, [`phrases-${lessonId}`]), theoryGrounding) })).resolves.toMatchObject({ attempts: 1 });
            }
    });
});
//# sourceMappingURL=lesson_pipeline_smoke.test.js.map