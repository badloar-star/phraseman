import { ENGLISH_THEORY_EXEMPLAR_REGISTRY } from './english_theory_exemplars.generated';
import { retrieveTheoryExemplars, validateTheoryExemplarRegistry } from './theory_generation';

describe('generated English theory exemplar registry', () => {
  it('covers all 32 canonical lessons with a valid immutable source receipt', () => {
    expect(ENGLISH_THEORY_EXEMPLAR_REGISTRY.exemplars).toHaveLength(32);
    expect(validateTheoryExemplarRegistry(ENGLISH_THEORY_EXEMPLAR_REGISTRY)).toEqual([]);
    expect(ENGLISH_THEORY_EXEMPLAR_REGISTRY.registryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ENGLISH_THEORY_EXEMPLAR_REGISTRY.source).toBe('app/lesson_help_theory_data.tsx');
  });

  it('retrieves a bounded evidence set for a real lesson objective', () => {
    const result = retrieveTheoryExemplars(ENGLISH_THEORY_EXEMPLAR_REGISTRY, { objective: 'To Be statements with I am, he is and they are', approvedTargetPhrases: ['I am ready.', 'They are here.'], requiredExemplarIds: ['english-lesson-1'] });
    expect(result.state).toBe('ready');
    expect(result.exemplars.length).toBeGreaterThanOrEqual(2);
    expect(result.exemplars.length).toBeLessThanOrEqual(4);
    expect(result.exemplars[0].exemplarId).toBe('english-lesson-1');
  });
});
