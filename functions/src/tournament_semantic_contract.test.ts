import {
  TOURNAMENT_REVIEW_CONTRACT_VERSION,
  TOURNAMENT_SEMANTIC_SCHEMA_VERSION,
  createTournamentSemanticCandidate,
  validateTournamentSemanticCandidate,
  type ReviewSubject,
  type TournamentSemanticCandidate,
  type TournamentSemanticCandidateInput,
} from './tournament_semantic_contract';

const correct: ReviewSubject = {
  subjectId: 'choice:connect',
  kind: 'choice_option',
  declaredRole: 'correct',
  text: 'connect',
  completedText: 'Please connect to the call.',
  metadata: { sourceRole: 'answer', tokenIndex: '1' },
};

const distractors: readonly ReviewSubject[] = [
  {
    subjectId: 'choice:contact',
    kind: 'choice_option',
    declaredRole: 'distractor',
    text: 'contact',
    completedText: 'Please contact to the call.',
    trapType: 'government',
    reason: '“contact” does not take “to” with this meaning.',
  },
  {
    subjectId: 'choice:connected',
    kind: 'choice_option',
    declaredRole: 'distractor',
    text: 'connected',
    completedText: 'Please connected to the call.',
    trapType: 'morphology',
    reason: '“connected” cannot follow “Please” as a bare imperative.',
  },
  {
    subjectId: 'choice:connection',
    kind: 'choice_option',
    declaredRole: 'distractor',
    text: 'connection',
    completedText: 'Please connection to the call.',
    trapType: 'function_choice',
    reason: '“connection” is a noun, not the required imperative verb.',
  },
];

const baseInput: TournamentSemanticCandidateInput = {
  candidateId: 'candidate-v11-001',
  mode: 'fill_gap',
  difficulty: 2,
  prompt: 'Choose the word that completes the sentence.',
  context: {
    authoredSentence: 'Please connect to the call.',
    testedMeaning: 'Пожалуйста, подключитесь к звонку.',
  },
  reviewSubjects: [correct, ...distractors],
  provenanceKeys: ['route-a:4:phrase-connect', 'route-a:4:word-connect'],
};

function makeCandidate(
  overrides: Partial<TournamentSemanticCandidateInput> = {},
): TournamentSemanticCandidate {
  return createTournamentSemanticCandidate({ ...baseInput, ...overrides });
}

function withCandidatePatch(
  candidate: TournamentSemanticCandidate,
  patch: Partial<TournamentSemanticCandidate>,
): TournamentSemanticCandidate {
  return { ...candidate, ...patch };
}

function expectRejected(
  candidate: TournamentSemanticCandidate,
  reason: string,
): void {
  expect(validateTournamentSemanticCandidate(candidate)).toEqual({ ok: false, reason });
}

class NonCanonicalRecord {
  readonly detail = 'value';
}

type HiddenStateKind = 'non-enumerable' | 'symbol' | 'accessor';

function recordWithHiddenState(
  kind: HiddenStateKind,
  nullPrototype = false,
): Record<string, unknown> {
  const record = (nullPrototype ? Object.create(null) : {}) as Record<string, unknown>;
  Object.defineProperty(record, 'visible', {
    value: 'value', enumerable: true, writable: true, configurable: true,
  });
  if (kind === 'non-enumerable') {
    Object.defineProperty(record, 'hidden', {
      value: 'secret', enumerable: false, writable: true, configurable: true,
    });
  } else if (kind === 'symbol') {
    Object.defineProperty(record, Symbol('hidden'), {
      value: 'secret', enumerable: true, writable: true, configurable: true,
    });
  } else {
    Object.defineProperty(record, 'computed', {
      get: () => 'secret', enumerable: true, configurable: true,
    });
  }
  return record;
}

function arrayWithHiddenState(kind: HiddenStateKind): unknown[] {
  if (kind === 'accessor') {
    const values = Array<string>(1);
    Object.defineProperty(values, '0', {
      get: () => 'value', enumerable: true, configurable: true,
    });
    return values;
  }
  const values = ['value'];
  Object.defineProperty(values, kind === 'symbol' ? Symbol('hidden') : 'hidden', {
    value: 'secret',
    enumerable: kind === 'symbol',
    writable: true,
    configurable: true,
  });
  return values;
}

function oddityInput(): TournamentSemanticCandidateInput {
  return {
    ...baseInput,
    candidateId: 'candidate-oddity-001',
    mode: 'find_oddity',
    prompt: 'Find the sentence with one error.',
    reviewSubjects: [
      {
        subjectId: 'oddity:safe-1',
        kind: 'choice_option',
        declaredRole: 'safe',
        text: 'I connected to the call.',
      },
      {
        subjectId: 'oddity:safe-2',
        kind: 'choice_option',
        declaredRole: 'safe',
        text: 'She connected to the call.',
      },
      {
        subjectId: 'oddity:safe-3',
        kind: 'choice_option',
        declaredRole: 'safe',
        text: 'They connected to the call.',
      },
      {
        subjectId: 'oddity:odd',
        kind: 'choice_option',
        declaredRole: 'odd',
        text: 'He connect to the call.',
        completedText: 'He connects to the call.',
        trapType: 'single_oddity_error',
        reason: '“connect” lacks third-person singular agreement.',
      },
    ],
  };
}

function buildInput(): TournamentSemanticCandidateInput {
  return {
    ...baseInput,
    candidateId: 'candidate-build-001',
    mode: 'translate_build',
    prompt: 'Build the English sentence.',
    reviewSubjects: [
      {
        subjectId: 'build:please',
        kind: 'build_token',
        declaredRole: 'required',
        text: 'Please',
      },
      {
        subjectId: 'build:connect',
        kind: 'build_token',
        declaredRole: 'required',
        text: 'connect',
      },
      {
        subjectId: 'build:decoy',
        kind: 'build_token',
        declaredRole: 'decoy',
        text: 'connected',
        trapType: 'build_decoy',
        reason: '“connected” cannot form the required imperative.',
      },
    ],
  };
}

function speedInput(): TournamentSemanticCandidateInput {
  return {
    ...baseInput,
    candidateId: 'candidate-speed-001',
    mode: 'speed_match',
    prompt: 'Match all six pairs.',
    reviewSubjects: Array.from({ length: 6 }, (_, index) => ({
      subjectId: `pair:${index + 1}`,
      kind: 'speed_pair' as const,
      declaredRole: 'pair' as const,
      text: `English ${index + 1}`,
      completedText: `Перевод ${index + 1}`,
    })),
  };
}

describe('tournament semantic candidate identity', () => {
  test('exports the frozen schema and review contract versions', () => {
    expect(TOURNAMENT_SEMANTIC_SCHEMA_VERSION).toBe('tournament-semantic-candidate-v1');
    expect(TOURNAMENT_REVIEW_CONTRACT_VERSION).toBe('tournament-semantic-review-v1');
  });

  test('is independent of review-subject and provenance presentation order', () => {
    const firstSubjects = [...baseInput.reviewSubjects];
    const firstProvenance = [...baseInput.provenanceKeys];
    const first = makeCandidate();
    const shuffled = makeCandidate({
      reviewSubjects: [...baseInput.reviewSubjects].reverse(),
      provenanceKeys: [...baseInput.provenanceKeys].reverse(),
    });

    expect(shuffled.contentSha256).toBe(first.contentSha256);
    expect(shuffled.semanticSignature).toBe(first.semanticSignature);
    expect(first.reviewSubjects).toEqual(firstSubjects);
    expect(first.provenanceKeys).toEqual(firstProvenance);
    expect(baseInput.reviewSubjects).toEqual(firstSubjects);
    expect(baseInput.provenanceKeys).toEqual(firstProvenance);
  });

  test('uses stable recursive JSON ordering for context and metadata', () => {
    const reordered = makeCandidate({
      context: {
        testedMeaning: 'Пожалуйста, подключитесь к звонку.',
        authoredSentence: 'Please connect to the call.',
      },
      reviewSubjects: [
        { ...correct, metadata: { tokenIndex: '1', sourceRole: 'answer' } },
        ...distractors,
      ],
    });

    expect(reordered.contentSha256).toBe(makeCandidate().contentSha256);
  });

  test.each([
    ['reason', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      reviewSubjects: input.reviewSubjects.map((subject) => (
        subject.declaredRole === 'distractor'
          ? { ...subject, reason: `${subject.reason} More detail.` }
          : subject
      )),
    })],
    ['trap', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      reviewSubjects: input.reviewSubjects.map((subject) => (
        subject.declaredRole === 'distractor'
          ? { ...subject, trapType: 'collocation' as const }
          : subject
      )),
    })],
    ['provenance', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      provenanceKeys: ['route-b:7:phrase-connect'],
    })],
    ['context', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      context: { ...input.context, testedMeaning: 'Свяжитесь со звонком.' },
    })],
    ['prompt', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      prompt: 'Select the only valid completion.',
    })],
    ['subject key', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      reviewSubjects: input.reviewSubjects.map((subject, index) => (
        index === 0 ? { ...subject, subjectId: 'choice:answer-renamed' } : subject
      )),
    })],
    ['answer role', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      reviewSubjects: input.reviewSubjects.map((subject, index) => {
        if (index === 0) {
          return {
            ...subject,
            declaredRole: 'distractor' as const,
            trapType: 'lexical_meaning' as const,
            reason: '“connect” is declared wrong in this changed key.',
          };
        }
        if (index === 1) {
          const { reason: _reason, trapType: _trapType, ...rest } = subject;
          return { ...rest, declaredRole: 'correct' as const };
        }
        return subject;
      }),
    })],
    ['semantic text', (input: TournamentSemanticCandidateInput) => ({
      ...input,
      reviewSubjects: input.reviewSubjects.map((subject, index) => (
        index === 0 ? { ...subject, text: 'join' } : subject
      )),
    })],
  ])('changes contentSha256 when %s changes', (_field, change) => {
    expect(createTournamentSemanticCandidate(
      change(baseInput) as TournamentSemanticCandidateInput,
    ).contentSha256)
      .not.toBe(makeCandidate().contentSha256);
  });

  test('keeps the semantic signature stable across version and presentation-only changes', () => {
    const first = makeCandidate();
    const presentationOnly = makeCandidate({
      candidateId: 'candidate-v12-001',
      prompt: 'New framing: choose the unique answer.',
      reviewSubjects: [...baseInput.reviewSubjects].reverse().map((subject) => (
        subject.reason ? { ...subject, reason: `Presentation prose: ${subject.reason}` } : subject
      )),
    });

    expect(presentationOnly.semanticSignature).toBe(first.semanticSignature);
    expect(presentationOnly.contentSha256).not.toBe(first.contentSha256);
  });

  test.each([
    ['semantic context', { context: { ...baseInput.context, testedMeaning: 'Другое значение.' } }],
    ['subject text', {
      reviewSubjects: baseInput.reviewSubjects.map((subject, index) => (
        index === 0 ? { ...subject, text: 'join' } : subject
      )),
    }],
    ['answer role', {
      reviewSubjects: baseInput.reviewSubjects.map((subject, index) => {
        if (index === 0) {
          return {
            ...subject,
            declaredRole: 'distractor' as const,
            trapType: 'lexical_meaning' as const,
            reason: '“connect” is wrong under the changed key.',
          };
        }
        if (index === 1) {
          const { reason: _reason, trapType: _trapType, ...rest } = subject;
          return { ...rest, declaredRole: 'correct' as const };
        }
        return subject;
      }),
    }],
  ])('changes the semantic signature when %s changes', (_field, patch) => {
    expect(makeCandidate(patch).semanticSignature).not.toBe(makeCandidate().semanticSignature);
  });
});

describe('tournament semantic candidate validation', () => {
  test('accepts the exact contract for every v11 mode', () => {
    const inputs: TournamentSemanticCandidateInput[] = [
      { ...baseInput, mode: 'guess_phrase' },
      baseInput,
      oddityInput(),
      buildInput(),
      speedInput(),
    ];

    for (const input of inputs) {
      expect(validateTournamentSemanticCandidate(
        createTournamentSemanticCandidate(input),
      )).toEqual({ ok: true });
    }
  });

  test('rejects duplicate subject IDs and normalized subject values', () => {
    const candidate = makeCandidate();
    const duplicateId = candidate.reviewSubjects.map((subject, index) => (
      index === 1 ? { ...subject, subjectId: candidate.reviewSubjects[0].subjectId } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: duplicateId }), 'subject_id_duplicate');

    const duplicateValue = candidate.reviewSubjects.map((subject, index) => (
      index === 1 ? { ...subject, text: candidate.reviewSubjects[0].text.toUpperCase() } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: duplicateValue }), 'subject_value_duplicate');
  });

  test('rejects duplicate provenance keys and provenance counts outside 1..6', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, {
      provenanceKeys: [candidate.provenanceKeys[0], candidate.provenanceKeys[0]],
    }), 'provenance_key_duplicate');
    expectRejected(withCandidatePatch(candidate, { provenanceKeys: [] }), 'provenance_count_invalid');
    expectRejected(withCandidatePatch(candidate, {
      provenanceKeys: Array.from(
        { length: 7 },
        (_, index) => `route-a:${index}:phrase-${index}` as const,
      ),
    }), 'provenance_count_invalid');
  });

  test('rejects a missing declared answer key or oddity error', () => {
    const candidate = makeCandidate();
    const withoutCorrect = candidate.reviewSubjects.map((subject) => (
      subject.declaredRole === 'correct'
        ? {
          ...subject,
          declaredRole: 'distractor' as const,
          trapType: 'lexical_meaning' as const,
          reason: '“connect” is deliberately declared wrong.',
        }
        : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: withoutCorrect }), 'declared_key_invalid');

    const oddity = createTournamentSemanticCandidate(oddityInput());
    const withoutOdd = oddity.reviewSubjects.map((subject) => {
      if (subject.declaredRole !== 'odd') return subject;
      const { reason: _reason, trapType: _trapType, ...rest } = subject;
      return { ...rest, declaredRole: 'safe' as const };
    });
    expectRejected(withCandidatePatch(oddity, { reviewSubjects: withoutOdd }), 'declared_key_invalid');
  });

  test.each([
    ['correct', () => makeCandidate(), 0],
    ['safe', () => createTournamentSemanticCandidate(oddityInput()), 0],
    ['required', () => createTournamentSemanticCandidate(buildInput()), 0],
  ])('rejects explanation prose on a %s subject', (_role, factory, index) => {
    const candidate = factory();
    const subjects = candidate.reviewSubjects.map((subject, subjectIndex) => (
      subjectIndex === index ? { ...subject, reason: 'This role must not carry error prose.' } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: subjects }), 'subject_reason_forbidden');
  });

  test.each([
    ['distractor', () => makeCandidate(), 1],
    ['odd', () => createTournamentSemanticCandidate(oddityInput()), 3],
    ['decoy', () => createTournamentSemanticCandidate(buildInput()), 2],
  ])('rejects a %s subject without its own reason', (_role, factory, index) => {
    const candidate = factory();
    const subjects = candidate.reviewSubjects.map((subject, subjectIndex) => {
      if (subjectIndex !== index) return subject;
      const { reason: _reason, ...rest } = subject;
      return rest;
    });
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: subjects }), 'subject_reason_required');
  });

  test('rejects malformed or stale hashes', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, { semanticSignature: 'not-a-hash' }), 'semantic_signature_invalid');
    expectRejected(withCandidatePatch(candidate, { contentSha256: 'not-a-hash' }), 'content_sha256_invalid');
    expectRejected(withCandidatePatch(candidate, { semanticSignature: '0'.repeat(64) }), 'semantic_signature_mismatch');
    expectRejected(withCandidatePatch(candidate, { contentSha256: '0'.repeat(64) }), 'content_sha256_mismatch');
  });

  test('rejects invalid modes, difficulties, provenance format, and byte bounds', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, { mode: 'legacy_mode' as never }), 'mode_invalid');
    expectRejected(withCandidatePatch(candidate, { difficulty: 4 as never }), 'difficulty_invalid');
    expectRejected(withCandidatePatch(candidate, { provenanceKeys: ['not-a-provenance-key' as never] }), 'provenance_key_invalid');
    expectRejected(withCandidatePatch(candidate, { candidateId: 'x'.repeat(161) }), 'candidate_id_invalid');
    expectRejected(withCandidatePatch(candidate, { prompt: 'é'.repeat(257) }), 'prompt_invalid');
    expectRejected(withCandidatePatch(candidate, { context: { detail: 'x'.repeat(4_096) } }), 'context_invalid');

    const oversizedMetadata = candidate.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata: { detail: 'x'.repeat(257) } } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects: oversizedMetadata }), 'subject_metadata_invalid');
  });

  test.each([
    ['array', ['bad']],
    ['string', 'bad'],
    ['null', null],
    ['non-string value', { detail: 42 }],
  ])('rejects malformed %s subject metadata instead of coercing it', (_shape, metadata) => {
    const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata: metadata as never } : subject
    ));

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_metadata_invalid');
  });

  test.each([
    ['Map', new Map([['detail', 'value']])],
    ['Date', new Date('2026-08-08T00:00:00.000Z')],
    ['class instance', new NonCanonicalRecord()],
    ['nested non-string value', { detail: { nested: 'value' } }],
  ])('rejects non-plain %s subject metadata before cloning', (_shape, metadata) => {
    const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata: metadata as never } : subject
    ));

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_metadata_invalid');
  });

  test.each([
    ['Date', new Date('2026-08-08T00:00:00.000Z')],
    ['Map', new Map([['key', 'value']])],
    ['Set', new Set(['value'])],
    ['class instance', new NonCanonicalRecord()],
  ])('rejects a nested non-plain %s in context before cloning', (_shape, value) => {
    expect(() => makeCandidate({ context: { nested: value } }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test.each([
    ['undefined', undefined],
    ['function', () => 'value'],
    ['symbol', Symbol('value')],
    ['bigint', 1n],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('rejects non-JSON context value %s', (_shape, value) => {
    expect(() => makeCandidate({ context: { invalid: value } }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('accepts deterministic JSON data in plain and null-prototype records', () => {
    const nullPrototypeMetadata = Object.assign(Object.create(null), {
      sourceRole: 'answer',
      tokenIndex: '1',
    }) as Readonly<Record<string, string>>;
    const nestedNullPrototype = Object.assign(Object.create(null), {
      beta: [null, true, false, 42, 'value'],
      alpha: { finite: 1.5 },
    }) as Readonly<Record<string, unknown>>;
    const nullPrototypeContext = Object.assign(Object.create(null), {
      testedMeaning: 'Пожалуйста, подключитесь к звонку.',
      nested: nestedNullPrototype,
      authoredSentence: 'Please connect to the call.',
    }) as Readonly<Record<string, unknown>>;
    const nullPrototypeCandidate = makeCandidate({
      context: nullPrototypeContext,
      reviewSubjects: [
        { ...correct, metadata: nullPrototypeMetadata },
        ...distractors,
      ],
    });
    const plainCandidate = makeCandidate({
      context: {
        authoredSentence: 'Please connect to the call.',
        nested: { alpha: { finite: 1.5 }, beta: [null, true, false, 42, 'value'] },
        testedMeaning: 'Пожалуйста, подключитесь к звонку.',
      },
      reviewSubjects: [
        { ...correct, metadata: { tokenIndex: '1', sourceRole: 'answer' } },
        ...distractors,
      ],
    });

    expect(validateTournamentSemanticCandidate(nullPrototypeCandidate)).toEqual({ ok: true });
    expect(nullPrototypeCandidate.contentSha256).toBe(plainCandidate.contentSha256);
    expect(nullPrototypeCandidate.semanticSignature).toBe(plainCandidate.semanticSignature);
  });

  test('rejects post-creation candidates mutated with non-plain context or metadata', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, {
      context: { nested: new Date('2026-08-08T00:00:00.000Z') },
    }), 'context_invalid');

    const reviewSubjects = candidate.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata: new Map([['detail', 'value']]) as never } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects }), 'subject_metadata_invalid');
  });

  test.each([
    ['root-level property', (() => {
      const values = Array<string>(1);
      return { values };
    })()],
    ['nested property', (() => {
      const values = Array<string>(2);
      values[1] = 'present-after-hole';
      return { nested: { values } };
    })()],
  ])('rejects sparse arrays in a context %s', (_location, context) => {
    expect(() => makeCandidate({ context }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test.each([
    ['root-level property', (() => {
      const values = ['value'] as string[] & { extra?: string };
      values.extra = 'not-an-array-index';
      return { values };
    })()],
    ['nested property', (() => {
      const values = [null] as Array<null> & { note?: string };
      values.note = 'not-an-array-index';
      return { nested: { values } };
    })()],
  ])('rejects arrays with enumerable extra properties in a context %s', (_location, context) => {
    expect(() => makeCandidate({ context }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('rejects post-creation mutations to sparse or extra-property arrays', () => {
    const candidate = makeCandidate();
    const sparse = Array<string>(1);
    expectRejected(withCandidatePatch(candidate, { context: { values: sparse } }), 'context_invalid');

    const withExtraProperty = ['value'] as string[] & { extra?: string };
    withExtraProperty.extra = 'not-an-array-index';
    expectRejected(withCandidatePatch(candidate, {
      context: { values: withExtraProperty },
    }), 'context_invalid');
  });

  test('accepts dense JSON arrays and hashes semantic differences distinctly', () => {
    const candidates = [
      makeCandidate({ context: { values: [] } }),
      makeCandidate({ context: { values: [null] } }),
      makeCandidate({ context: { values: [[null], ['value', 1, true]] } }),
    ];

    for (const candidate of candidates) {
      expect(validateTournamentSemanticCandidate(candidate)).toEqual({ ok: true });
    }
    expect(new Set(candidates.map((candidate) => candidate.contentSha256)).size).toBe(3);
    expect(new Set(candidates.map((candidate) => candidate.semanticSignature)).size).toBe(3);
  });

  test.each<HiddenStateKind>([
    'non-enumerable',
    'symbol',
    'accessor',
  ])('rejects arrays carrying %s own state', (kind) => {
    expect(() => makeCandidate({ context: { values: arrayWithHiddenState(kind) } }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test.each([
    ['plain', 'non-enumerable', false],
    ['plain', 'symbol', false],
    ['plain', 'accessor', false],
    ['null-prototype', 'non-enumerable', true],
    ['null-prototype', 'symbol', true],
    ['null-prototype', 'accessor', true],
  ] as const)('rejects %s context objects carrying %s own state', (
    _prototype,
    kind,
    nullPrototype,
  ) => {
    expect(() => makeCandidate({ context: recordWithHiddenState(kind, nullPrototype) }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test.each<HiddenStateKind>([
    'non-enumerable',
    'symbol',
    'accessor',
  ])('rejects subject metadata carrying %s own state', (kind) => {
    const metadata = recordWithHiddenState(kind) as Readonly<Record<string, string>>;
    const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata } : subject
    ));

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_metadata_invalid');
  });

  test('rejects post-creation hidden state mutations without invoking accessors', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, {
      context: recordWithHiddenState('non-enumerable'),
    }), 'context_invalid');
    expectRejected(withCandidatePatch(candidate, {
      context: { values: arrayWithHiddenState('symbol') },
    }), 'context_invalid');

    const metadata = recordWithHiddenState('accessor') as Readonly<Record<string, string>>;
    const reviewSubjects = candidate.reviewSubjects.map((subject, index) => (
      index === 0 ? { ...subject, metadata } : subject
    ));
    expectRejected(withCandidatePatch(candidate, { reviewSubjects }), 'subject_metadata_invalid');
  });

  test('rejects accessor state without invoking its getter', () => {
    let getterCalls = 0;
    const context: Record<string, unknown> = {};
    Object.defineProperty(context, 'computed', {
      get: () => {
        getterCalls += 1;
        return 'value';
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => makeCandidate({ context }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
    expect(getterCalls).toBe(0);
  });

  test.each([
    ['English', 1, { text: 'English 1', completedText: 'Другой перевод' }],
    ['Russian', 1, { text: 'Different English', completedText: 'Перевод 1' }],
  ])('requires unique normalized %s sides for speed_match', (_side, index, patch) => {
    const input = speedInput();
    const reviewSubjects = input.reviewSubjects.map((subject, subjectIndex) => (
      subjectIndex === index ? { ...subject, ...patch } : subject
    ));

    expect(() => createTournamentSemanticCandidate({ ...input, reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_value_duplicate');
  });

  test('allows repeated required token values in translate_build', () => {
    const input = buildInput();
    const repeatedRequired: ReviewSubject = {
      subjectId: 'build:had-second',
      kind: 'build_token',
      declaredRole: 'required',
      text: 'had',
    };
    const reviewSubjects = [
      { ...input.reviewSubjects[0], text: 'had' },
      repeatedRequired,
      ...input.reviewSubjects.slice(1),
    ];

    const candidate = createTournamentSemanticCandidate({ ...input, reviewSubjects });

    expect(validateTournamentSemanticCandidate(candidate)).toEqual({ ok: true });
    expect(candidate.reviewSubjects.filter((subject) => subject.text === 'had')).toHaveLength(2);
  });

  test.each([
    ['guess_phrase cardinality', () => makeCandidate({ mode: 'guess_phrase' }), (subjects: readonly ReviewSubject[]) => subjects.slice(0, 3)],
    ['fill_gap kind', () => makeCandidate(), (subjects: readonly ReviewSubject[]) => subjects.map((subject, index) => (
      index === 3 ? { ...subject, kind: 'build_token' as const } : subject
    ))],
    ['find_oddity roles', () => createTournamentSemanticCandidate(oddityInput()), (subjects: readonly ReviewSubject[]) => subjects.map((subject, index) => (
      index === 1 ? { ...subject, declaredRole: 'odd' as const, trapType: 'single_oddity_error' as const, reason: 'Second declared error.' } : subject
    ))],
    ['translate_build roles', () => createTournamentSemanticCandidate(buildInput()), (subjects: readonly ReviewSubject[]) => subjects.map((subject, index) => (
      index === 0 ? { ...subject, declaredRole: 'decoy' as const, trapType: 'build_decoy' as const, reason: 'Second decoy.' } : subject
    ))],
    ['speed_match cardinality', () => createTournamentSemanticCandidate(speedInput()), (subjects: readonly ReviewSubject[]) => subjects.slice(0, 5)],
  ])('rejects wrong subject cardinality or roles for %s', (_case, factory, mutate) => {
    const candidate = factory();
    expectRejected(withCandidatePatch(candidate, {
      reviewSubjects: mutate(candidate.reviewSubjects),
    }), 'subject_contract_invalid');
  });
});
