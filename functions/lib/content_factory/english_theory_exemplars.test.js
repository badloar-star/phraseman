"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const english_theory_exemplars_generated_1 = require("./english_theory_exemplars.generated");
const theory_generation_1 = require("./theory_generation");
describe('generated English theory exemplar registry', () => {
    it('covers all 32 canonical lessons with a valid immutable source receipt', () => {
        expect(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.exemplars).toHaveLength(32);
        expect((0, theory_generation_1.validateTheoryExemplarRegistry)(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY)).toEqual([]);
        expect(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryHash).toMatch(/^[a-f0-9]{64}$/);
        expect(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY.source).toBe('app/lesson_help_theory_data.tsx');
    });
    it('retrieves a bounded evidence set for a real lesson objective', () => {
        const result = (0, theory_generation_1.retrieveTheoryExemplars)(english_theory_exemplars_generated_1.ENGLISH_THEORY_EXEMPLAR_REGISTRY, { objective: 'To Be statements with I am, he is and they are', approvedTargetPhrases: ['I am ready.', 'They are here.'], requiredExemplarIds: ['english-lesson-1'] });
        expect(result.state).toBe('ready');
        expect(result.exemplars.length).toBeGreaterThanOrEqual(2);
        expect(result.exemplars.length).toBeLessThanOrEqual(4);
        expect(result.exemplars[0].exemplarId).toBe('english-lesson-1');
    });
});
//# sourceMappingURL=english_theory_exemplars.test.js.map