import { buildMistakeIdentity } from '../modules/mistake-practice/identity';

const baseInput = {
  studyTarget: 'en' as const,
  content: {
    sourceKind: 'lesson_phrase' as const,
    sourceId: 'lesson-3:phrase-7',
    canonicalTarget: 'I am ready.',
    sourceMeaning: 'Я готов.',
  },
  facet: {
    kind: 'word_order' as const,
  },
};

describe('mistake identity', () => {
  test('is stable for the same canonical content and facet', () => {
    const first = buildMistakeIdentity(baseInput);
    const second = buildMistakeIdentity({
      facet: { kind: 'word_order' },
      content: {
        sourceMeaning: 'Я готов.',
        canonicalTarget: '  I   am ready.  ',
        sourceId: 'lesson-3:phrase-7',
        sourceKind: 'lesson_phrase',
      },
      studyTarget: 'en',
    });

    expect(first.kind).toBe('capturable');
    expect(second.kind).toBe('capturable');
    if (first.kind !== 'capturable' || second.kind !== 'capturable') return;
    expect(second.mistakeId).toBe(first.mistakeId);
    expect(first.mistakeId).toMatch(/^mistake:v1:[a-f0-9]{64}$/);
  });

  test.each([
    ['study target', { ...baseInput, studyTarget: 'fr' as const }],
    [
      'content object',
      {
        ...baseInput,
        content: { ...baseInput.content, sourceId: 'lesson-3:phrase-8' },
      },
    ],
    [
      'content meaning',
      {
        ...baseInput,
        content: { ...baseInput.content, sourceMeaning: 'Я уже готов.' },
      },
    ],
    [
      'content tokens',
      {
        ...baseInput,
        content: { ...baseInput.content, tokens: ['I', 'am', 'ready', 'now.'] },
      },
    ],
    [
      'error facet',
      { ...baseInput, facet: { kind: 'meaning' as const } },
    ],
    [
      'specific token facet',
      {
        ...baseInput,
        facet: {
          kind: 'missing_token' as const,
          tokenIndex: 1,
          expected: 'am',
        },
      },
    ],
  ])('changes when %s changes', (_label, changedInput) => {
    const baseline = buildMistakeIdentity(baseInput);
    const changed = buildMistakeIdentity(changedInput);

    expect(baseline.kind).toBe('capturable');
    expect(changed.kind).toBe('capturable');
    if (baseline.kind !== 'capturable' || changed.kind !== 'capturable') return;
    expect(changed.mistakeId).not.toBe(baseline.mistakeId);
  });

  test('fingerprints semantic content revisions', () => {
    const baseline = buildMistakeIdentity(baseInput);
    const changed = buildMistakeIdentity({
      ...baseInput,
      content: { ...baseInput.content, sourceMeaning: 'Я уже готов.' },
    });
    if (baseline.kind !== 'capturable' || changed.kind !== 'capturable') return;
    expect(changed.contentFingerprint).not.toBe(baseline.contentFingerprint);
  });

  test.each([
    [
      'missing source id',
      { ...baseInput, content: { ...baseInput.content, sourceId: '   ' } },
      'missing_source_id',
    ],
    [
      'missing canonical answer',
      { ...baseInput, content: { ...baseInput.content, canonicalTarget: '' } },
      'missing_canonical_target',
    ],
    [
      'invalid token facet',
      {
        ...baseInput,
        facet: { kind: 'missing_token' as const, tokenIndex: -1, expected: '' },
      },
      'invalid_facet',
    ],
  ])('returns not_capturable for %s', (_label, input, reason) => {
    expect(buildMistakeIdentity(input)).toEqual({
      kind: 'not_capturable',
      reason,
    });
  });
});
