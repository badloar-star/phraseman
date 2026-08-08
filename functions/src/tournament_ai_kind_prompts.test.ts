import { buildKindTask } from './tournament_ai_kind_prompts';

const baseParams = {
  levelAnchor: 'intermediate English',
  level: 'B1',
  count: 3,
  difficultyWord: 'medium' as const,
};

describe('tournament kind prompt mirrors the fail-closed content limits', () => {
  it('asks assembly generation for exactly one meaningful trap', () => {
    const prompt = buildKindTask({ ...baseParams, kind: 'assembly' });

    expect(prompt).toContain('exactly 1 extra trap word');
    expect(prompt).not.toMatch(/(?:2-4|exactly 4) (?:extra )?decoy/i);
  });

  it.each(['situation', 'gap', 'oddity', 'assembly'] as const)(
    'caps the %s prompt and correct answer at 8 normalized words',
    (kind) => {
      const prompt = buildKindTask({ ...baseParams, kind });

      expect(prompt).toContain('at most 8 normalized words');
      expect(prompt).not.toContain('4-12 words');
    },
  );
});
