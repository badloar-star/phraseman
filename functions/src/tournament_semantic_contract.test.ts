import {
  TOURNAMENT_REVIEW_CONTRACT_VERSION,
  TOURNAMENT_SEMANTIC_SCHEMA_VERSION,
  createTournamentProvenanceKey,
  createTournamentSemanticCandidate,
  parseTournamentProvenanceKey,
  validateTournamentSemanticCandidate,
  type ReviewSubject,
  type TournamentProvenanceKey,
  type TournamentSemanticCandidate,
  type TournamentSemanticCandidateInput,
} from './tournament_semantic_contract';

describe('tournament provenance keys', () => {
  test('brands a valid canonical provenance key', () => {
    const key: TournamentProvenanceKey = createTournamentProvenanceKey(
      'route-a:4:phrase-connect',
    );

    expect(key).toBe('route-a:4:phrase-connect');
    expect(parseTournamentProvenanceKey(key)).toEqual({ ok: true, value: key });
  });

  test.each([
    '',
    'route-a:-1:phrase-connect',
    'route-a:1.5:phrase-connect',
    ':1:phrase-connect',
    'route-a:1:',
    'route:a:1:phrase-connect',
    'route-a:1:phrase:connect',
  ])('rejects noncanonical provenance key %p', (value) => {
    expect(parseTournamentProvenanceKey(value)).toEqual({
      ok: false,
      reason: 'provenance_key_invalid',
    });
    expect(() => createTournamentProvenanceKey(value))
      .toThrow('invalid_tournament_provenance_key');
  });

  test('keeps candidate input ergonomic for readonly strings and output branded', () => {
    const inputKeys: readonly string[] = ['route-a:4:phrase-connect'];
    const input: TournamentSemanticCandidateInput = {
      ...baseInput,
      provenanceKeys: inputKeys,
    };
    const candidate = createTournamentSemanticCandidate(input);
    const outputKey: TournamentProvenanceKey = candidate.provenanceKeys[0];

    expect(outputKey).toBe(inputKeys[0]);
  });
});

const correct: ReviewSubject = {
  subjectId: 'choice:connect',
  kind: 'choice_option',
  declaredRole: 'correct',
  text: 'connect',
  completedText: 'Please connect to the call.',
  metadata: {
    sourceRole: 'answer', tokenIndex: '1', partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true',
  },
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
    metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
  },
  {
    subjectId: 'choice:connected',
    kind: 'choice_option',
    declaredRole: 'distractor',
    text: 'connected',
    completedText: 'Please connected to the call.',
    trapType: 'morphology',
    reason: '“connected” cannot follow “Please” as a bare imperative.',
    metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
  },
  {
    subjectId: 'choice:connection',
    kind: 'choice_option',
    declaredRole: 'distractor',
    text: 'connects',
    completedText: 'Please connects to the call.',
    trapType: 'agreement',
    reason: '“connects” cannot follow “Please” as a bare imperative.',
    metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
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
  patch: Partial<Record<keyof TournamentSemanticCandidate, unknown>>,
): TournamentSemanticCandidate {
  return { ...candidate, ...patch } as TournamentSemanticCandidate;
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
type InvalidArrayStateKind = HiddenStateKind | 'extra-enumerable' | 'sparse';

const EXPECTED_CONTEXT_MAX_BYTES = 4_096;
const EXPECTED_CONTEXT_MAX_DEPTH = 8;
const EXPECTED_CONTEXT_MAX_NODES = 130;

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

function arrayWithInvalidState<T>(values: readonly T[], kind: InvalidArrayStateKind): T[] {
  if (kind === 'sparse') {
    const sparse = Array<T>(values.length);
    for (let index = 1; index < values.length; index += 1) sparse[index] = values[index];
    return sparse;
  }
  const result = [...values];
  if (kind === 'accessor') {
    Object.defineProperty(result, '0', {
      get: () => values[0], enumerable: true, configurable: true,
    });
  } else if (kind === 'symbol') {
    Object.defineProperty(result, Symbol('hidden'), {
      value: 'secret', enumerable: true, configurable: true,
    });
  } else {
    Object.defineProperty(result, kind === 'non-enumerable' ? 'hidden' : 'extra', {
      value: 'secret',
      enumerable: kind === 'extra-enumerable',
      configurable: true,
    });
  }
  return result;
}

function nestedContext(depth: number): Readonly<Record<string, unknown>> {
  let value: unknown = 'leaf';
  for (let index = 0; index < depth; index += 1) value = { nested: value };
  return value as Readonly<Record<string, unknown>>;
}

function nodeBudgetContext(addOneNode: boolean): Readonly<Record<string, unknown>> {
  const groups = Array.from({ length: 64 }, (_, index) => (
    index === 0 && addOneNode ? { value: null, extra: null } : { value: null }
  ));
  return { groups };
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
        metadata: { partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true' },
      },
      {
        subjectId: 'oddity:safe-2',
        kind: 'choice_option',
        declaredRole: 'safe',
        text: 'She connected to the call.',
        metadata: { partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true' },
      },
      {
        subjectId: 'oddity:safe-3',
        kind: 'choice_option',
        declaredRole: 'safe',
        text: 'They connected to the call.',
        metadata: { partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true' },
      },
      {
        subjectId: 'oddity:odd',
        kind: 'choice_option',
        declaredRole: 'odd',
        text: 'He connect to the call.',
        completedText: 'He connects to the call.',
        trapType: 'single_oddity_error',
        reason: '“connect” lacks third-person singular agreement.',
        metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
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
    expect(TOURNAMENT_REVIEW_CONTRACT_VERSION).toBe('tournament-semantic-review-v2');
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
        {
          ...correct,
          metadata: {
            tokenIndex: '1', sourceRole: 'answer', partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true',
          },
        },
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
          ? { ...subject, trapType: 'morphology' as const }
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
            trapType: 'morphology' as const,
            reason: '“connect” is declared wrong in this changed key.',
            metadata: { ...subject.metadata, grammaticality: 'invalid' },
          };
        }
        if (index === 1) {
          const { reason: _reason, trapType: _trapType, ...rest } = subject;
          return {
            ...rest,
            declaredRole: 'correct' as const,
            metadata: { ...rest.metadata, grammaticality: 'valid' },
          };
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

  it('does not let guess prompt-family framing change semantic identity', () => {
    const first = makeCandidate({ context: { topic: 'test', promptFamily: 'situation' } });
    const reframed = makeCandidate({ context: { topic: 'test', promptFamily: 'dialogue' } });

    expect(reframed.semanticSignature).toBe(first.semanticSignature);
    expect(reframed.contentSha256).not.toBe(first.contentSha256);
  });

  test('pins the reviewed canonical hash vector', () => {
    const candidate = makeCandidate();

    expect({
      contentSha256: candidate.contentSha256,
      semanticSignature: candidate.semanticSignature,
    }).toEqual({
      contentSha256: '66a458ff0af7d708b0663890a9a073a9532c9f74f8472c9f9dae748c540fad46',
      semanticSignature: 'b1f617b32bdfe97e1911835b3f786452beb5cb6add5551d8aa65111868640687',
    });
  });

  test.each([
    ['completedText', {
      reviewSubjects: baseInput.reviewSubjects.map((subject, index) => (
        index === 0 ? { ...subject, completedText: 'Please join the call.' } : subject
      )),
    }],
    ['metadata', {
      reviewSubjects: baseInput.reviewSubjects.map((subject, index) => (
        index === 0 ? {
          ...subject,
          metadata: {
            sourceRole: 'answer', tokenIndex: '2', partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true',
          },
        } : subject
      )),
    }],
    ['mode', { mode: 'guess_phrase' as const }],
  ])('changes both identities when %s changes', (_field, patch) => {
    const first = makeCandidate();
    const changed = makeCandidate(patch);

    expect(changed.contentSha256).not.toBe(first.contentSha256);
    expect(changed.semanticSignature).not.toBe(first.semanticSignature);
  });

  it('treats difficulty as publication metadata rather than different semantics', () => {
    const first = makeCandidate({ difficulty: 1 });
    const moved = makeCandidate({ difficulty: 3 });

    expect(moved.contentSha256).not.toBe(first.contentSha256);
    expect(moved.semanticSignature).toBe(first.semanticSignature);
  });

  test.each([
    ['semantic context', { context: { ...baseInput.context, translation: 'Другое значение.' } }],
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
            trapType: 'morphology' as const,
            reason: '“connect” is wrong under the changed key.',
            metadata: { ...subject.metadata, grammaticality: 'invalid' },
          };
        }
        if (index === 1) {
          const { reason: _reason, trapType: _trapType, ...rest } = subject;
          return {
            ...rest,
            declaredRole: 'correct' as const,
            metadata: { ...rest.metadata, grammaticality: 'valid' },
          };
        }
        return subject;
      }),
    }],
  ])('changes the semantic signature when %s changes', (_field, patch) => {
    expect(makeCandidate(patch).semanticSignature).not.toBe(makeCandidate().semanticSignature);
  });
});

describe('tournament semantic candidate validation', () => {
  test.each(['lexical_meaning', 'collocation', 'reference', 'function_choice'] as const)(
    'rejects %s as a grammar-choice distractor even when it is semantically wrong',
    (trapType) => {
      const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => (
        index === 1 ? { ...subject, trapType } : subject
      ));

      expect(() => makeCandidate({ mode: 'guess_phrase', reviewSubjects }))
        .toThrow('invalid_tournament_semantic_candidate:subject_contract_invalid');
    },
  );

  test.each(['lexical_meaning', 'collocation', 'reference', 'function_choice'] as const)(
    'rejects %s on the broken oddity option even when metadata falsely declares it ungrammatical',
    (trapType) => {
      const reviewSubjects = oddityInput().reviewSubjects.map((subject) => (
        subject.declaredRole === 'odd'
          ? {
            ...subject,
            text: 'She looks ready.',
            completedText: 'She is ready.',
            trapType,
            reason: 'Подложное объяснение ошибки.',
            metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
          }
          : subject
      ));

      expect(() => createTournamentSemanticCandidate({ ...oddityInput(), reviewSubjects }))
        .toThrow('invalid_tournament_semantic_candidate:subject_contract_invalid');
    },
  );

  test('rejects a grammar-choice set whose options do not share one part of speech', () => {
    const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => (
      index === 2
        ? { ...subject, metadata: { ...subject.metadata, partOfSpeech: 'noun' } }
        : subject
    ));

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_contract_invalid');
  });

  test('rejects a grammar-choice option without explicit minimal-twin evidence', () => {
    const reviewSubjects = baseInput.reviewSubjects.map((subject, index) => {
      if (index !== 3 || !subject.metadata) return subject;
      const { minimalTwin: _minimalTwin, ...metadata } = subject.metadata;
      return { ...subject, metadata };
    });

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_contract_invalid');
  });

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
      partOfSpeech: 'verb',
      grammaticality: 'valid',
      minimalTwin: 'true',
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
        {
          ...correct,
          metadata: {
            tokenIndex: '1', sourceRole: 'answer', partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true',
          },
        },
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
    expect(new Set(candidates.map((candidate) => candidate.semanticSignature)).size).toBe(1);
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

  test('rejects a translate_build decoy matching a normalized required token', () => {
    const input = buildInput();
    const reviewSubjects = input.reviewSubjects.map((subject) => (
      subject.declaredRole === 'decoy' ? { ...subject, text: 'CONNECT' } : subject
    ));

    expect(() => createTournamentSemanticCandidate({ ...input, reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:subject_value_duplicate');
  });

  test.each<InvalidArrayStateKind>([
    'non-enumerable',
    'symbol',
    'accessor',
    'extra-enumerable',
    'sparse',
  ])('rejects noncanonical reviewSubjects arrays carrying %s state', (kind) => {
    const reviewSubjects = arrayWithInvalidState(baseInput.reviewSubjects, kind);
    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:review_subjects_invalid');
  });

  test.each<InvalidArrayStateKind>([
    'non-enumerable',
    'symbol',
    'accessor',
    'extra-enumerable',
    'sparse',
  ])('rejects noncanonical provenance arrays carrying %s state', (kind) => {
    const provenanceKeys = arrayWithInvalidState(baseInput.provenanceKeys, kind);
    expect(() => makeCandidate({ provenanceKeys }))
      .toThrow('invalid_tournament_semantic_candidate:provenance_keys_invalid');
  });

  test('rejects post-creation noncanonical top-level arrays with field-specific reasons', () => {
    const candidate = makeCandidate();
    expectRejected(withCandidatePatch(candidate, {
      reviewSubjects: arrayWithInvalidState(candidate.reviewSubjects, 'symbol'),
    }), 'review_subjects_invalid');
    expectRejected(withCandidatePatch(candidate, {
      provenanceKeys: arrayWithInvalidState(candidate.provenanceKeys, 'sparse'),
    }), 'provenance_keys_invalid');
  });

  test('rejects top-level array accessors without invoking getters', () => {
    let getterCalls = 0;
    const reviewSubjects = [...baseInput.reviewSubjects];
    Object.defineProperty(reviewSubjects, '0', {
      get: () => {
        getterCalls += 1;
        return baseInput.reviewSubjects[0];
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => makeCandidate({ reviewSubjects }))
      .toThrow('invalid_tournament_semantic_candidate:review_subjects_invalid');
    expect(getterCalls).toBe(0);
  });

  test('rejects direct and indirect context cycles', () => {
    const direct: Record<string, unknown> = {};
    direct.self = direct;
    const first: Record<string, unknown> = {};
    const second: Record<string, unknown> = { first };
    first.second = second;

    expect(() => makeCandidate({ context: direct }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
    expect(() => makeCandidate({ context: first }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('rejects shared references and high-fan-out DAGs', () => {
    const shared = { value: 'shared' };
    expect(() => makeCandidate({ context: { left: shared, right: shared } }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');

    const fanOut = Object.fromEntries(
      Array.from({ length: 64 }, (_, index) => [`node${index}`, shared]),
    );
    expect(() => makeCandidate({ context: fanOut }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('enforces cumulative context node budget at the exact boundary', () => {
    const atBoundary = makeCandidate({ context: nodeBudgetContext(false) });
    expect(validateTournamentSemanticCandidate(atBoundary)).toEqual({ ok: true });
    expect(() => makeCandidate({ context: nodeBudgetContext(true) }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
    expect(EXPECTED_CONTEXT_MAX_NODES).toBe(130);
  });

  test('enforces context depth at the exact boundary', () => {
    const atBoundary = makeCandidate({ context: nestedContext(EXPECTED_CONTEXT_MAX_DEPTH) });
    expect(validateTournamentSemanticCandidate(atBoundary)).toEqual({ ok: true });
    expect(() => makeCandidate({ context: nestedContext(EXPECTED_CONTEXT_MAX_DEPTH + 1) }))
      .toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('enforces serialized context bytes at the exact boundary', () => {
    const overheadBytes = Buffer.byteLength(JSON.stringify({ value: '' }), 'utf8');
    const atBoundary = makeCandidate({
      context: { value: 'x'.repeat(EXPECTED_CONTEXT_MAX_BYTES - overheadBytes) },
    });
    expect(validateTournamentSemanticCandidate(atBoundary)).toEqual({ ok: true });
    expect(() => makeCandidate({
      context: { value: 'x'.repeat(EXPECTED_CONTEXT_MAX_BYTES - overheadBytes + 1) },
    })).toThrow('invalid_tournament_semantic_candidate:context_invalid');
  });

  test('recursively freezes cloned context and all returned collection surfaces', () => {
    const candidate = makeCandidate({
      context: { nested: { values: [{ value: 'kept' }] } },
    });
    const nested = candidate.context.nested as { values: Array<{ value: string }> };

    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.context)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Object.isFrozen(nested.values)).toBe(true);
    expect(Object.isFrozen(nested.values[0])).toBe(true);
    expect(Object.isFrozen(candidate.reviewSubjects)).toBe(true);
    expect(Object.isFrozen(candidate.reviewSubjects[0])).toBe(true);
    expect(Object.isFrozen(candidate.reviewSubjects[0].metadata)).toBe(true);
    expect(Object.isFrozen(candidate.provenanceKeys)).toBe(true);

    expect(() => { nested.values[0].value = 'changed'; }).toThrow(TypeError);
    expect(() => { nested.values.push({ value: 'changed' }); }).toThrow(TypeError);
    expect(() => { (candidate.reviewSubjects as ReviewSubject[]).push(correct); }).toThrow(TypeError);
    expect(() => {
      Array.prototype.push.call(candidate.provenanceKeys, 'route-a:4:other');
    }).toThrow(TypeError);
    expect(validateTournamentSemanticCandidate(candidate)).toEqual({ ok: true });
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
