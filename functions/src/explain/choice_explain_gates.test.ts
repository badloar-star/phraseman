import {
  validateChoiceInput,
  parseChoiceBatch,
  MAX_CHOICE_DISTRACTORS,
  MAX_CHOICE_EXPLANATION_CHARS,
} from './choice_explain_gates';

describe('choice_explain_gates — input validation', () => {
  it('accepts a normal correct + meaning + distractors', () => {
    const r = validateChoiceInput({
      correctEn: "I'm fine, thanks.",
      phraseMeaning: 'Я в порядке, спасибо.',
      distractors: ['We are all okay.', 'He is not here.'],
      lang: 'ru',
    });
    expect(r.ok).toBe(true);
    expect(r.distractors).toEqual(['We are all okay.', 'He is not here.']);
  });

  it('rejects an empty correct answer', () => {
    expect(validateChoiceInput({ correctEn: '', phraseMeaning: 'x', distractors: ['a'], lang: 'ru' }).ok).toBe(false);
  });

  it('rejects an empty meaning', () => {
    expect(validateChoiceInput({ correctEn: 'Hi', phraseMeaning: '', distractors: ['a'], lang: 'ru' }).ok).toBe(false);
  });

  it('rejects when there are no distractors', () => {
    expect(validateChoiceInput({ correctEn: 'Hi', phraseMeaning: 'm', distractors: [], lang: 'ru' }).reason).toBe('no_distractors');
  });

  it('de-dupes and caps distractors', () => {
    const many = Array.from({ length: MAX_CHOICE_DISTRACTORS + 5 }, (_, i) => `opt ${i}`);
    const r = validateChoiceInput({ correctEn: 'Hi', phraseMeaning: 'm', distractors: [...many, 'opt 0', 'OPT 0'], lang: 'ru' });
    expect(r.ok).toBe(true);
    expect(r.distractors?.length).toBe(MAX_CHOICE_DISTRACTORS);
  });
});

describe('choice_explain_gates — batch parsing', () => {
  const distractors = ['We are all okay.', 'He is not here.'];

  it('parses a clean JSON batch and maps onto requested keys', () => {
    const raw = JSON.stringify({
      confirm: 'Nice — that is the natural one!',
      distractors: {
        'We are all okay.': 'That talks about a group, not just you.',
        'He is not here.': 'That is about someone else, not you.',
      },
    });
    const r = parseChoiceBatch(raw, distractors);
    expect(r.ok).toBe(true);
    expect(r.confirm).toContain('natural');
    expect(r.distractors['We are all okay.']).toContain('group');
    expect(r.distractors['He is not here.']).toContain('someone else');
  });

  it('tolerates a ```json fenced reply', () => {
    const raw = '```json\n{"confirm":"Good!","distractors":{"We are all okay.":"too plural"}}\n```';
    const r = parseChoiceBatch(raw, distractors);
    expect(r.ok).toBe(true);
    expect(r.distractors['We are all okay.']).toBe('too plural');
  });

  it('maps keys case-insensitively', () => {
    const raw = JSON.stringify({ confirm: 'Yes', distractors: { 'we are all okay.': 'plural' } });
    const r = parseChoiceBatch(raw, distractors);
    expect(r.distractors['We are all okay.']).toBe('plural');
  });

  it('clamps overlong generated lines to a UI-sized human hint', () => {
    const long = 'Это слишком длинное машинное объяснение, которое пытается разобрать все слова подряд и поэтому расползается по экрану '.repeat(5);
    const raw = JSON.stringify({
      confirm: long,
      distractors: { 'We are all okay.': long },
    });

    const r = parseChoiceBatch(raw, distractors);

    expect(r.confirm.length).toBeLessThanOrEqual(MAX_CHOICE_EXPLANATION_CHARS);
    expect(r.distractors['We are all okay.'].length).toBeLessThanOrEqual(MAX_CHOICE_EXPLANATION_CHARS);
    expect(r.confirm).toMatch(/…$/);
  });

  it('fails on unparseable JSON', () => {
    expect(parseChoiceBatch('not json at all', distractors).ok).toBe(false);
  });

  it('fails when confirm is missing', () => {
    const raw = JSON.stringify({ distractors: { 'We are all okay.': 'x' } });
    expect(parseChoiceBatch(raw, distractors).ok).toBe(false);
  });
});
