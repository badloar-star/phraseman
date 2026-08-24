import {
  buildStrictGrammarTwinSets,
  TOURNAMENT_GRAMMAR_RULE_CATALOG_DESCRIPTOR,
  TOURNAMENT_GRAMMAR_RULE_CATALOG_SHA256,
  validateStrictGrammarTwinSet,
  type V11SourceDay,
  type V11SourcePhrase,
} from './tournament_pool_v11_grammar_twins';

const day: V11SourceDay = {
  planId: 'strict-v11',
  dayIndex: 7,
  level: 'A2',
};

function phrase(
  id: string,
  english: string,
  word: string,
  partOfSpeech = 'verb',
  distractors: readonly string[] = [],
): V11SourcePhrase {
  return {
    id,
    english,
    meaning: { ru: 'Проверяем грамматическую форму.' },
    words: [{ text: word, partOfSpeech, distractors }],
  };
}

describe('buildStrictGrammarTwinSets', () => {
  it('binds ambiguity and source-shape policies into the immutable catalog receipt', () => {
    expect(TOURNAMENT_GRAMMAR_RULE_CATALOG_DESCRIPTOR.proofPolicy).toEqual({
      annotatedTargetMustBeUnique: true,
      annotatedTargetMustBeSingleToken: true,
      deduplicateRejectedSurfaceForms: true,
      directAgreementSubjectSlot: 0,
      directAgreementVerbSlot: 1,
      distractorSetSize: 3,
      excludeAffirmativeDoAuxiliary: true,
      excludeAmbiguousAffirmativeModals: ['can', 'may', 'will'],
      excludePastInvertedBeQuestions: true,
      excludePerfectAndProgressiveProofs: true,
      excludePleaseImperative: true,
      irregularAgreementRequiresDistinctPastAndParticiple: true,
      maxOptionCodePointDelta: 4,
      maxOptionLengthRatio: 3,
      negativeDoAuxiliaryMustFollowSentenceInitialSubject: true,
      questionMustEndWithQuestionMark: true,
      questionDoAuxiliaryMustBeInitialOrFollowOneQuestionWord: true,
      rejectedDirectAgreementPrefixTokens: ['if'],
      rejectedFormsMustExcludeCorrectSurface: true,
      rejectIfPrefixedSubjectClause: true,
      subjectPronounMustBeSentenceInitialBeforeReviewedFinitePredicate: true,
      supportedPartOfSpeech: ['be', 'pronoun', 'pronouns', 'to be', 'verb', 'verbs'],
    });
    expect(TOURNAMENT_GRAMMAR_RULE_CATALOG_SHA256).toBe(
      '3d2e28a3349d07a75e2a4ced4d015711124095bd00fcbb804290f9705715ef55',
    );
  });

  it('rejects conspicuous one-character versus four-character option giveaways', () => {
    const sets = buildStrictGrammarTwinSets(day, phrase('i-work', 'I work today.', 'I', 'pronoun'));

    expect(sets.length).toBeGreaterThan(0);
    expect(sets.flatMap((set) => set.distractors.map((item) => item.value))).not.toContain('Them');
    expect(sets.every((set) => {
      const lengths = [set.correctValue, ...set.distractors.map((item) => item.value)]
        .map((value) => [...value].length);
      return Math.max(...lengths) / Math.min(...lengths) <= 3;
    })).toBe(true);
  });

  it('builds a one-valid/three-invalid same-POS set for subject/be agreement', () => {
    const source = phrase('she-is', 'She is ready.', 'is');
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set).toEqual(expect.objectContaining({
      correctValue: 'is',
      correctCompletedText: 'She is ready.',
      slotIndex: 1,
      partOfSpeech: 'verb',
      ruleId: 'subject_be_agreement',
    }));
    expect(set?.distractors.map((item) => item.value)).toEqual(['am', 'are', 'been']);
    expect(set?.distractors.every((item) => item.completedText !== source.english)).toBe(true);
    expect(set?.distractors.every((item) => item.partOfSpeech === set.partOfSpeech)).toBe(true);
    expect(set?.distractors.every((item) => item.slotIndex === set.slotIndex)).toBe(true);
    expect(set?.distractors.every((item) => item.reason.includes(`«${item.value}»`))).toBe(true);
    expect(validateStrictGrammarTwinSet(day, source, set!)).toEqual({ ok: true });
  });

  it.each([
    ['I am ready.', 'am', ['is', 'are', 'been']],
    ['They are ready.', 'are', ['am', 'is', 'been']],
    ['He was ready.', 'was', ['were', 'been', 'being']],
    ['We were ready.', 'were', ['was', 'been', 'being']],
  ])('proves the be form from an explicit pronoun anchor: %s', (english, correct, wrong) => {
    const [set] = buildStrictGrammarTwinSets(day, phrase(`be-${correct}`, english, correct));

    expect(set?.correctValue).toBe(correct);
    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, phrase(`be-${correct}`, english, correct), set)).toEqual({ ok: true });
  });

  it('proves inverted subject/be agreement at the first slot of a question', () => {
    const source = phrase('question-is', 'Is she ready?', 'Is', 'to-be');
    const sets = buildStrictGrammarTwinSets(day, source);
    const [set] = sets;

    expect(sets).toHaveLength(10);
    expect(set).toEqual(expect.objectContaining({
      correctValue: 'Is',
      slotIndex: 0,
      ruleId: 'question_subject_be_agreement',
    }));
    expect(set?.distractors.map((item) => item.value)).toEqual(['Am', 'Are', 'Been']);
    expect(sets.flatMap((item) => item.distractors.map((option) => option.value))).toContain('Be');
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it('rejects embedded pronoun/be frames where non-finite or subjunctive alternatives are grammatical', () => {
    expect(buildStrictGrammarTwinSets(day, phrase(
      'embedded-being',
      'I remember it was cold.',
      'was',
    ))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase(
      'embedded-subjunctive',
      'I demand he is ready.',
      'is',
    ))).toEqual([]);
  });

  it('explains non-finite be errors as non-finite errors, not as fake agreement', () => {
    const [set] = buildStrictGrammarTwinSets(day, phrase('non-finite-reason', 'She is ready.', 'is'));
    const nonFinite = set?.distractors.find((item) => item.value === 'been');

    expect(nonFinite?.reason).toMatch(/нефинитн/u);
    expect(nonFinite?.reason).toContain('«been»');
    expect(nonFinite?.reason).toContain('«is»');
  });

  it.each([
    ['modal', 'You should swim.', 'swim', 'modal_base_form', ['swims', 'swam', 'swimming']],
    ['negative-do-aux', "They don't make dinner.", 'make', 'do_aux_base_form', ['makes', 'made', 'making']],
    ['to-inf', 'I want to go.', 'go', 'to_infinitive_base_form', ['goes', 'went', 'going']],
    ['to-inf-noun-frame', 'It is time to go.', 'go', 'to_infinitive_base_form', ['goes', 'went', 'going']],
    ['lets-imperative', "Let's go.", 'go', 'lets_imperative_base_form', ['goes', 'went', 'going']],
  ])('builds a strict governed base-form set: %s', (id, english, correct, ruleId, wrong) => {
    const [set] = buildStrictGrammarTwinSets(day, phrase(id, english, correct));

    expect(set).toEqual(expect.objectContaining({ correctValue: correct, ruleId }));
    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, phrase(id, english, correct), set)).toEqual({ ok: true });
  });

  it.each([
    ['Can you swim?', 'swim', ['swims', 'swam', 'swimming']],
    ['What will I do?', 'do', ['does', 'did', 'doing']],
  ])('proves a base form when subject/modal inversion disambiguates a question: %s', (english, correct, wrong) => {
    const source = phrase(`question-modal-${correct}`, english, correct);
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set).toEqual(expect.objectContaining({ ruleId: 'question_modal_base_form' }));
    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it.each([
    ['Do you have a question?', 'have', 'question_do_aux_base_form', ['has', 'had', 'having']],
    ['Where did you work?', 'work', 'question_do_aux_base_form', ['works', 'worked', 'working']],
    ['I do not understand.', 'understand', 'negative_do_aux_base_form', ['understands', 'understood', 'understanding']],
  ])('proves a base form in an unambiguous do-support frame: %s', (english, correct, ruleId, wrong) => {
    const source = phrase(`do-support-${correct}`, english, correct);
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set).toEqual(expect.objectContaining({ ruleId }));
    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it.each([
    ['You should apply.', 'apply', ['applies', 'applied', 'applying']],
    ['You should stop.', 'stop', ['stops', 'stopped', 'stopping']],
    ['You should use.', 'use', ['uses', 'used', 'using']],
    ['You should travel.', 'travel', ['travels', 'traveled', 'traveling']],
  ])('uses only catalogued, reviewed inflections: %s', (english, correct, wrong) => {
    const source = phrase(`catalog-${correct}`, english, correct);
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it.each([
    ['singular-present', 'She goes.', 'goes', 'irregular_subject_verb_agreement', ['go', 'gone', 'going']],
    ['plural-present', 'They go.', 'go', 'irregular_subject_verb_agreement', ['goes', 'gone', 'going']],
  ])('proves additional non-finite and agreement frames: %s', (id, english, correct, ruleId, wrong) => {
    const source = phrase(id, english, correct);
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set).toEqual(expect.objectContaining({ correctValue: correct, ruleId }));
    expect(set?.distractors.map((item) => item.value)).toEqual(wrong);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it('proves objective pronoun case after an explicit preposition with same-POS errors', () => {
    const source = phrase('preposition-object-case', 'This is for me.', 'me', 'pronoun');
    const sets = buildStrictGrammarTwinSets(day, source);
    const [set] = sets;

    expect(sets).toHaveLength(7);
    expect(set).toEqual(expect.objectContaining({
      correctValue: 'me',
      slotIndex: 3,
      partOfSpeech: 'pronoun',
      ruleId: 'preposition_object_pronoun_case',
    }));
    expect(set?.distractors.map((item) => item.value)).toEqual(['I', 'we', 'he']);
    expect(set?.distractors.every((item) => item.partOfSpeech === 'pronoun')).toBe(true);
    expect(set?.distractors.every((item) => item.reason.includes(`«${item.value}»`))).toBe(true);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it('proves nominative pronoun case before a reviewed finite predicate', () => {
    const source = phrase('subject-pronoun-case', 'I work today.', 'I', 'pronoun');
    const sets = buildStrictGrammarTwinSets(day, source);
    const [set] = sets;

    expect(sets).toHaveLength(4);
    expect(set).toEqual(expect.objectContaining({
      correctValue: 'I',
      slotIndex: 0,
      partOfSpeech: 'pronoun',
      ruleId: 'sentence_initial_subject_pronoun_case',
    }));
    expect(set?.distractors.map((item) => item.value)).toEqual(['Me', 'Us', 'Him']);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it('proves objective pronoun case after a reviewed transitive governor', () => {
    const source = phrase('transitive-object-case', 'They told me yesterday.', 'me', 'pronoun');
    const [set] = buildStrictGrammarTwinSets(day, source);

    expect(set).toEqual(expect.objectContaining({
      correctValue: 'me',
      partOfSpeech: 'pronoun',
      ruleId: 'transitive_object_pronoun_case',
    }));
    expect(set?.distractors.map((item) => item.value)).toEqual(['I', 'we', 'he']);
    expect(set && validateStrictGrammarTwinSet(day, source, set)).toEqual({ ok: true });
  });

  it('does not invent an object-case proof without an explicit reviewed governor', () => {
    expect(buildStrictGrammarTwinSets(day, phrase(
      'unreviewed-verb-object-case',
      'They noticed me yesterday.',
      'me',
      'pronoun',
    ))).toEqual([]);
  });

  it('does not claim unsafe progressive or regular simple-agreement proof', () => {
    expect(buildStrictGrammarTwinSets(day, phrase('regular-progressive', 'She is working.', 'working'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('irregular-progressive', 'She is going.', 'going'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('regular-present', 'She works.', 'works'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('please-lexical-reparse', 'Please wait.', 'wait'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('affirmative-do-swimming', 'I do swim.', 'swim'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('affirmative-did-dancing', 'I did dance.', 'dance'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('lexical-can-paints', 'I can paint.', 'paint'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('lexical-will-works', 'I will work.', 'work'))).toEqual([]);
  });

  it.each(['come', 'become'])('rejects an irregular agreement set when a participle duplicates the correct base: %s', (verb) => {
    expect(buildStrictGrammarTwinSets(day, phrase(
      `duplicate-base-${verb}`,
      `They ${verb}.`,
      verb,
    ))).toEqual([]);
  });

  it('rejects perfect substitutions when a proposed base form can be a grammatical noun', () => {
    expect(buildStrictGrammarTwinSets(day, phrase(
      'perfect-work-noun',
      'I have worked here for three years.',
      'worked',
    ))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('perfect-gone', 'She has gone.', 'gone'))).toEqual([]);
  });

  it('rejects a lexical alternative instead of mislabelling it as grammar', () => {
    expect(buildStrictGrammarTwinSets(day, phrase(
      'closes-locks',
      'She closes the door at night.',
      'closes',
      'verb',
      ['close', 'closed', 'locks'],
    ))).toEqual([]);
  });

  it('does not trust authored distractors or declared metadata as proof', () => {
    const source = phrase('spoof', 'She is ready.', 'is', 'verb', ['looks', 'seems', 'stays']);
    const [set] = buildStrictGrammarTwinSets(day, source);
    expect(set).toBeDefined();

    const spoof = {
      ...set!,
      distractors: [
        { ...set!.distractors[0], value: 'looks', completedText: 'She looks ready.' },
        set!.distractors[1],
        set!.distractors[2],
      ] as const,
    };
    expect(validateStrictGrammarTwinSet(day, source, spoof)).toEqual({
      ok: false,
      reason: 'proof_mismatch',
    });
  });

  it('fails closed for contractions, repeated targets, unknown POS, and unsupported infinitive frames', () => {
    expect(buildStrictGrammarTwinSets(day, phrase('contracted', "She isn't ready.", "isn't"))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('repeat', 'They are where they are.', 'are'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('pos', 'She is ready.', 'is', 'adjective'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('to-prep', 'I look forward to go.', 'go'))).toEqual([]);
    expect(buildStrictGrammarTwinSets(day, phrase('to-work-noun', 'I go to work.', 'work'))).toEqual([]);
  });

  it('rejects any mutation of canonical evidence, explanation, or source provenance', () => {
    const source = phrase('canonical', 'She is ready.', 'is');
    const [set] = buildStrictGrammarTwinSets(day, source);
    expect(set).toBeDefined();

    expect(validateStrictGrammarTwinSet(day, source, {
      ...set!,
      provenanceKey: 'strict-v11:7:other' as typeof set.provenanceKey,
    })).toEqual({ ok: false, reason: 'proof_mismatch' });
    expect(validateStrictGrammarTwinSet(day, source, {
      ...set!,
      distractors: [
        { ...set!.distractors[0], reason: 'Поддельное объяснение.' },
        set!.distractors[1],
        set!.distractors[2],
      ] as const,
    })).toEqual({ ok: false, reason: 'proof_mismatch' });
  });

  it('fails closed instead of throwing on malformed serialized proof input', () => {
    const source = phrase('malformed', 'She is ready.', 'is');

    expect(validateStrictGrammarTwinSet(day, source, null)).toEqual({
      ok: false,
      reason: 'proof_missing',
    });
    expect(validateStrictGrammarTwinSet(day, source, { ruleId: 'subject_be_agreement' })).toEqual({
      ok: false,
      reason: 'proof_missing',
    });
  });

  it('fails closed instead of throwing on malformed source words', () => {
    const malformed = {
      ...phrase('malformed-source', 'She is ready.', 'is'),
      words: [null],
    } as unknown as V11SourcePhrase;

    expect(buildStrictGrammarTwinSets(day, malformed)).toEqual([]);
    expect(validateStrictGrammarTwinSet(day, malformed, {})).toEqual({
      ok: false,
      reason: 'source_invalid',
    });
  });
});
