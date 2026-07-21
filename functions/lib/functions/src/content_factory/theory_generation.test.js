"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const theory_generation_1 = require("./theory_generation");
describe('evidence-backed lesson theory', () => {
    const registry = {
        registryId: 'english-theory-core', version: 'v1', registryHash: 'a'.repeat(64),
        exemplars: [
            { exemplarId: 'directions-imperative', ruleKey: 'imperative', canonicalRule: 'Use the base verb for direct instructions.', objectiveTags: ['directions', 'instructions'], fragments: [{ fragmentId: 'f1', text: 'Turn left at the bank.' }] },
            { exemplarId: 'directions-politeness', ruleKey: 'polite_request', canonicalRule: 'Use could you for a polite request.', objectiveTags: ['directions', 'requests'], fragments: [{ fragmentId: 'f2', text: 'Could you show me the way?' }] },
            { exemplarId: 'travel-prepositions', ruleKey: 'place_prepositions', canonicalRule: 'Use at for a point and in for an area.', objectiveTags: ['travel', 'place'], fragments: [{ fragmentId: 'f3', text: 'Meet me at the station.' }] },
            { exemplarId: 'unrelated-past', ruleKey: 'past_simple', canonicalRule: 'Use the past simple for completed events.', objectiveTags: ['history'], fragments: [{ fragmentId: 'f4', text: 'I visited Rome.' }] },
        ],
    };
    it('validates and retrieves 2-4 relevant versioned English exemplars', () => {
        expect((0, theory_generation_1.validateTheoryExemplarRegistry)(registry)).toEqual([]);
        const result = (0, theory_generation_1.retrieveTheoryExemplars)(registry, { objective: 'Ask for directions and understand instructions', approvedTargetPhrases: ['Could you show me the way?', 'Turn left here.'] });
        expect(result.state).toBe('ready');
        expect(result.exemplars).toHaveLength(2);
        expect(result.exemplars.map((item) => item.exemplarId)).toEqual(['directions-imperative', 'directions-politeness']);
    });
    it('requires rule, examples, mistakes, mini-check and concrete evidence references', () => {
        const artifact = {
            stage: 'lesson_theory', result: {
                rules: [{ rule: 'Use the base verb.', evidenceRefs: ['exemplar:f1'] }],
                examples: [{ targetText: 'Turn left.', explanation: 'Base verb.', evidenceRefs: ['phrase:p1'] }],
                commonMistakes: [{ wrong: 'Turn to left.', correction: 'Turn left.', evidenceRefs: ['exemplar:f1'] }],
                miniCheck: [{ prompt: '___ left.', answer: 'Turn', evidenceRefs: ['phrase:p1'] }],
                exemplarIds: ['directions-imperative', 'directions-politeness'],
            },
        };
        expect((0, theory_generation_1.validateTheoryArtifact)(artifact, { allowedPhraseIds: ['p1'], allowedExemplarFragmentIds: ['f1'] })).toEqual([]);
        artifact.result.rules[0].evidenceRefs = ['exemplar:unknown'];
        expect((0, theory_generation_1.validateTheoryArtifact)(artifact, { allowedPhraseIds: ['p1'], allowedExemplarFragmentIds: ['f1'] })).toContain('theory_evidence_reference_invalid');
    });
    it('stops for human adjudication when retrieved exemplars conflict', () => {
        const conflicting = { ...registry, exemplars: [...registry.exemplars, { exemplarId: 'directions-imperative-conflict', ruleKey: 'imperative', canonicalRule: 'Always add to before an instruction verb.', objectiveTags: ['directions'], fragments: [{ fragmentId: 'f5', text: 'To turn left.' }] }] };
        expect((0, theory_generation_1.retrieveTheoryExemplars)(conflicting, { objective: 'directions', approvedTargetPhrases: ['Turn left.'] })).toMatchObject({ state: 'review_required', reason: 'exemplar_conflict', conflictingRuleKeys: ['imperative'] });
    });
    it('rejects empty theory prose even when evidence references are syntactically valid', () => {
        const artifact = { stage: 'lesson_theory', result: { rules: [{ rule: '', evidenceRefs: ['phrase:p1'] }], examples: [{ targetText: '', explanation: '', evidenceRefs: ['phrase:p1'] }], commonMistakes: [{ wrong: '', correction: '', evidenceRefs: ['phrase:p1'] }], miniCheck: [{ prompt: '', answer: '', evidenceRefs: ['phrase:p1'] }], exemplarIds: ['e1', 'e2'] } };
        expect((0, theory_generation_1.validateTheoryArtifact)(artifact, { allowedPhraseIds: ['p1'], allowedExemplarFragmentIds: [] })).toEqual(expect.arrayContaining(['theory_rules_content_invalid', 'theory_examples_content_invalid', 'theory_commonMistakes_content_invalid', 'theory_miniCheck_content_invalid']));
    });
});
//# sourceMappingURL=theory_generation.test.js.map