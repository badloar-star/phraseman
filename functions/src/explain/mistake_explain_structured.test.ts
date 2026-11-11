import {
  buildStructuredMistakeMessages,
  coerceStoredBreakdown,
  MISTAKE_BREAKDOWN_RESPONSE_FORMAT,
  parseMistakeBreakdown,
  renderBreakdownFullText,
  sentenceHasFragment,
  type StructuredMistakePromptInput,
} from './mistake_explain_structured';

const SENTENCES = { userAnswer: "I don't have some money", targetAnswer: "I don't have any money." };

function answer(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    verdict: 'one',
    wrong: 'some',
    right: 'any',
    rule: 'Когда чего-то нет — "any".',
    why: 'Почти! "some" говорят, когда что-то есть.',
    you_said: '',
    pair: ['I have some money', "I don't have any money"],
    also: [],
    simple: 'Нет денег — "any".',
    ...overrides,
  });
}

function promptInput(overrides: Partial<StructuredMistakePromptInput> = {}): StructuredMistakePromptInput {
  return {
    targetName: 'English',
    studyTarget: 'en',
    interfaceLangKey: 'ru',
    interfaceLangName: 'Russian',
    writeIn: 'Пиши объяснение ТОЛЬКО на русском языке.',
    shortFormsNote: 'A SHORT FORM IS NOT A MISTAKE. ',
    userAnswer: SENTENCES.userAnswer,
    targetAnswer: SENTENCES.targetAnswer,
    diffHint: '"some" → "any"',
    ...overrides,
  };
}

describe('structured mistake breakdown: parsing', () => {
  it('returns validated fields and strips the trailing full stop of the rule', () => {
    const { breakdown, droppedFragments } = parseMistakeBreakdown(answer(), SENTENCES);

    expect(droppedFragments).toBe(false);
    expect(breakdown).toEqual({
      verdict: 'one',
      wrong: 'some',
      right: 'any',
      rule: 'Когда чего-то нет — "any"',
      why: 'Почти! "some" говорят, когда что-то есть.',
      youSaid: '',
      pair: ['I have some money', "I don't have any money"],
      also: [],
      simple: 'Нет денег — "any".',
    });
  });

  it.each([
    ['not JSON', 'Просто текст без полей'],
    ['an array', '[]'],
    ['unknown verdict', answer({ verdict: 'maybe' })],
    ['empty why', answer({ why: '  ' })],
    ['empty simple', answer({ simple: '' })],
    ['non-string field', answer({ rule: 7 })],
    ['pair is not a list', answer({ pair: 'I have some money' })],
  ])('rejects %s', (_name, raw) => {
    expect(() => parseMistakeBreakdown(raw, SENTENCES)).toThrow('mistake_explain_invalid_bundle');
  });

  it('drops pointers the model invented instead of failing the paid answer', () => {
    const { breakdown, droppedFragments } = parseMistakeBreakdown(answer({ wrong: 'many' }), SENTENCES);

    expect(droppedFragments).toBe(true);
    expect(breakdown.wrong).toBe('');
    expect(breakdown.right).toBe('');
    expect(breakdown.why).toContain('some');
  });

  it('keeps only real extra differences and a complete pair', () => {
    const { breakdown } = parseMistakeBreakdown(answer({
      pair: ['only one example'],
      also: [{ wrong: "don't", right: "don't" }, { wrong: 'cat', right: 'money' }],
    }), SENTENCES);

    expect(breakdown.pair).toEqual([]);
    expect(breakdown.also).toEqual([{ wrong: "don't", right: "don't" }]);
  });

  it('clears every pointer when there is no mistake', () => {
    const { breakdown } = parseMistakeBreakdown(answer({
      verdict: 'no_mistake',
      rule: 'Всё верно',
      you_said: 'лишнее',
    }), SENTENCES);

    expect(breakdown).toMatchObject({ verdict: 'no_mistake', wrong: '', right: '', youSaid: '', pair: [], also: [] });
  });

  it('matches fragments regardless of case, spacing and apostrophe shape', () => {
    expect(sentenceHasFragment('I don’t  have Money', "DON'T have")).toBe(true);
    expect(sentenceHasFragment('I have money', '')).toBe(false);
  });
});

describe('structured mistake breakdown: legacy text and cache shape', () => {
  it('renders rule + explanation for old builds and only the confirmation when there is no mistake', () => {
    const one = parseMistakeBreakdown(answer(), SENTENCES).breakdown;
    expect(renderBreakdownFullText(one)).toBe('Когда чего-то нет — "any". Почти! "some" говорят, когда что-то есть.');
    expect(renderBreakdownFullText({ ...one, rule: '' })).toBe(one.why);
    expect(renderBreakdownFullText({ ...one, verdict: 'no_mistake', rule: 'Всё верно', why: 'Всё правильно.' }))
      .toBe('Всё правильно.');
  });

  it('re-validates a stored breakdown and ignores a broken one', () => {
    const stored = parseMistakeBreakdown(answer(), SENTENCES).breakdown;
    expect(coerceStoredBreakdown(stored)).toEqual(stored);
    expect(coerceStoredBreakdown(undefined)).toBeUndefined();
    expect(coerceStoredBreakdown({ verdict: 'one' })).toBeUndefined();
    expect(coerceStoredBreakdown({ verdict: 'one', why: 'текст', pair: 'x', also: [{ wrong: 1 }] }))
      .toMatchObject({ pair: [], also: [], simple: '' });
  });
});

describe('structured mistake breakdown: prompt', () => {
  it('asks for a strict JSON schema with every field required', () => {
    const schema = MISTAKE_BREAKDOWN_RESPONSE_FORMAT.json_schema;
    expect(schema.strict).toBe(true);
    expect(schema.schema.required).toEqual(Object.keys(schema.schema.properties));
  });

  it('mentions missing articles only for interface languages that have none', () => {
    const system = (input: StructuredMistakePromptInput) => buildStructuredMistakeMessages(input)[0].content;

    expect(system(promptInput())).toContain('has no articles');
    expect(system(promptInput({ interfaceLangKey: 'es', interfaceLangName: 'Spanish' }))).not.toContain('has no articles');
    expect(system(promptInput({ interfaceLangKey: 'pt-BR', interfaceLangName: 'Brazilian Portuguese' })))
      .not.toContain('has no articles');
    // Курс не английский — оговорка про a/the неуместна при любом интерфейсе.
    expect(system(promptInput({ studyTarget: 'de', targetName: 'German' }))).not.toContain('has no articles');
  });

  it('never names a specific native language and addresses the learner in the interface language', () => {
    const system = buildStructuredMistakeMessages(promptInput({ interfaceLangKey: 'tr', interfaceLangName: 'Turkish' }))[0].content;

    expect(system).not.toContain('Russian');
    expect(system).toContain('informal singular "you" of Turkish');
    expect(system).toContain('Your text fields must be in Turkish');
  });

  it('gives tone examples in the interface language when they exist', () => {
    const ru = buildStructuredMistakeMessages(promptInput())[0].content;
    const es = buildStructuredMistakeMessages(promptInput({ interfaceLangKey: 'es', interfaceLangName: 'Spanish' }))[0].content;

    expect(ru).toContain('Почти!');
    expect(es).toContain('¡Casi!');
    expect(es).not.toContain('Почти!');
  });

  it('keeps the two sentences as the source of truth and marks the hint unreliable', () => {
    const [system, user] = buildStructuredMistakeMessages(promptInput());

    expect(system.content).toContain('SOURCE OF TRUTH');
    expect(user.content).toContain(`LEARNER_ANSWER: ${SENTENCES.userAnswer}`);
    expect(user.content).toContain(`CORRECT_ANSWER: ${SENTENCES.targetAnswer}`);
    expect(user.content).toContain('UNRELIABLE');
    expect(buildStructuredMistakeMessages(promptInput({ diffHint: '' }))[1].content).not.toContain('Rough machine hint');
  });

  it('keeps every example a valid breakdown', () => {
    const system = buildStructuredMistakeMessages(promptInput())[0].content;
    const jsonLines = system.split('\n').filter((line) => line.startsWith('{"verdict"'));

    expect(jsonLines).toHaveLength(2);
    for (const line of jsonLines) {
      expect(() => parseMistakeBreakdown(line, {
        userAnswer: "I don't have some money",
        targetAnswer: "I don't have any money",
      })).not.toThrow();
    }
  });
});
