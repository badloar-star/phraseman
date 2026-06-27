import {
  validateQuizInput,
  parseQuizBatch,
  MAX_QUIZ_WRONG_OPTIONS,
  MAX_QUIZ_EXPLANATION_CHARS,
} from './quiz_explain_gates';

describe('quiz_explain_gates — input validation', () => {
  it('accepts a normal correct + meaning + wrong options', () => {
    const r = validateQuizInput({
      correctEn: 'Knife',
      questionPrompt: 'How do you say "нож" in English?',
      wrongOptions: ['Cup', 'Bowl', 'Chair'],
      lang: 'ru',
    });
    expect(r.ok).toBe(true);
    expect(r.wrongOptions).toEqual(['Cup', 'Bowl', 'Chair']);
  });

  it('rejects an empty correct answer', () => {
    expect(validateQuizInput({ correctEn: '', questionPrompt: 'x', wrongOptions: ['a'], lang: 'ru' }).ok).toBe(false);
  });

  it('rejects an empty meaning', () => {
    expect(validateQuizInput({ correctEn: 'Hi', questionPrompt: '', wrongOptions: ['a'], lang: 'ru' }).ok).toBe(false);
  });

  it('rejects when there are no wrong options', () => {
    expect(validateQuizInput({ correctEn: 'Hi', questionPrompt: 'm', wrongOptions: [], lang: 'ru' }).reason).toBe('no_wrong_options');
  });

  it('excludes the correct option from the wrong list (case-insensitive)', () => {
    const r = validateQuizInput({
      correctEn: 'Knife',
      questionPrompt: 'm',
      wrongOptions: ['Cup', 'knife', 'Bowl'],
      lang: 'ru',
    });
    expect(r.ok).toBe(true);
    expect(r.wrongOptions).toEqual(['Cup', 'Bowl']);
  });

  it('de-dupes and caps wrong options', () => {
    const many = Array.from({ length: MAX_QUIZ_WRONG_OPTIONS + 5 }, (_, i) => `opt ${i}`);
    const r = validateQuizInput({ correctEn: 'Hi', questionPrompt: 'm', wrongOptions: [...many, 'opt 0', 'OPT 0'], lang: 'ru' });
    expect(r.ok).toBe(true);
    expect(r.wrongOptions?.length).toBe(MAX_QUIZ_WRONG_OPTIONS);
  });
});

describe('quiz_explain_gates — batch parsing', () => {
  const wrongOptions = ['Cup', 'Bowl', 'Chair'];

  it('parses a clean JSON batch and maps onto requested keys', () => {
    const raw = JSON.stringify({
      confirm: 'Бинго! "Knife" — это нож, кухонный острый помощник.',
      options: {
        Cup: '"Cup" — это чашка для напитков, а не нож.',
        Bowl: '"Bowl" — миска, в неё суп, а не резка.',
        Chair: '"Chair" — стул, на нём сидят, а не режут.',
      },
    });
    const r = parseQuizBatch(raw, wrongOptions);
    expect(r.ok).toBe(true);
    expect(r.confirm).toContain('Knife');
    expect(r.options['Cup']).toContain('чашка');
    expect(r.options['Chair']).toContain('стул');
  });

  it('tolerates a ```json fenced reply', () => {
    const raw = '```json\n{"confirm":"Отлично!","options":{"Cup":"это чашка"}}\n```';
    const r = parseQuizBatch(raw, wrongOptions);
    expect(r.ok).toBe(true);
    expect(r.options['Cup']).toBe('это чашка');
  });

  it('maps keys case-insensitively', () => {
    const raw = JSON.stringify({ confirm: 'Да', options: { cup: 'чашка' } });
    const r = parseQuizBatch(raw, wrongOptions);
    expect(r.options['Cup']).toBe('чашка');
  });

  it('clamps overlong generated lines to a UI-sized human hint', () => {
    const long = 'Это слишком длинный машинный разбор, который перечисляет всё подряд и перестаёт быть понятной подсказкой для человека '.repeat(5);
    const raw = JSON.stringify({
      confirm: long,
      options: { Cup: long },
    });

    const r = parseQuizBatch(raw, wrongOptions);

    expect(r.confirm.length).toBeLessThanOrEqual(MAX_QUIZ_EXPLANATION_CHARS);
    expect(r.options.Cup.length).toBeLessThanOrEqual(MAX_QUIZ_EXPLANATION_CHARS);
    expect(r.confirm).toMatch(/…$/);
  });

  it('fails on unparseable JSON', () => {
    expect(parseQuizBatch('not json at all', wrongOptions).ok).toBe(false);
  });

  it('fails when confirm is missing', () => {
    const raw = JSON.stringify({ options: { Cup: 'x' } });
    expect(parseQuizBatch(raw, wrongOptions).ok).toBe(false);
  });
});
