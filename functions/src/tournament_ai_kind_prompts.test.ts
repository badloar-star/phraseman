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

  it.each(['situation', 'gap'] as const)(
    'requires all three %s distractors to be minimal grammatical errors in one part of speech',
    (kind) => {
      const prompt = buildKindTask({ ...baseParams, kind });

      expect(prompt).toContain('ALL THREE wrong options must be grammatically invalid');
      expect(prompt).toContain('same part of speech');
      expect(prompt).toContain('minimal twin');
      expect(prompt).not.toContain('grammatically fine but wrong in this moment');
    },
  );

  it('keeps find_oddity solvable with exactly one grammatical error', () => {
    const prompt = buildKindTask({ ...baseParams, kind: 'oddity' });

    expect(prompt).toContain('exactly ONE grammatically invalid sentence');
    expect(prompt).toContain('other three must be grammatical minimal twins');
    expect(prompt).toContain('three DIFFERENT concrete proofs that the selected safe options are grammatical');
    expect(prompt).toContain('why the declared answer is the only grammatical error');
    expect(prompt).not.toContain('three DIFFERENT concrete grammatical proofs for the wrong options');
    expect(prompt).not.toContain('what trap each wrong option sets');
  });

  it.each(['situation', 'gap'] as const)(
    'does not re-allow collocation-only traps through %s difficulty copy',
    (kind) => {
      expect(buildKindTask({ ...baseParams, kind })).not.toContain('collocation call');
    },
  );
});
