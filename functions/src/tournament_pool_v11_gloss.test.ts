import { TOURNAMENT_TASK_LIMITS } from './tournament_core';
import { parseDisplayGloss } from './tournament_pool_v11_gloss';

describe('parseDisplayGloss', () => {
  it('keeps commas inside a balanced parenthetical gloss', () => {
    expect(parseDisplayGloss('до полудня (утро, ночь)')).toEqual({
      ok: true,
      value: { displayTranslation: 'до полудня (утро, ночь)', senseHint: '' },
    });
  });

  it('splits top-level senses and joins additional hints deterministically', () => {
    expect(parseDisplayGloss('простуда, холод; озноб / стужа')).toEqual({
      ok: true,
      value: { displayTranslation: 'простуда', senseHint: 'холод; озноб; стужа' },
    });
  });

  it('preserves nested balanced brackets and their internal separators', () => {
    expect(parseDisplayGloss('вещь [редко: предмет (старое/новое; пример, случай)], объект')).toEqual({
      ok: true,
      value: {
        displayTranslation: 'вещь [редко: предмет (старое/новое; пример, случай)]',
        senseHint: 'объект',
      },
    });
  });

  it.each([
    'слово (пояснение',
    'слово пояснение)',
    'слово [пояснение)',
    'слово {пояснение]',
  ])('rejects unbalanced bracket input: %s', (raw) => {
    expect(parseDisplayGloss(raw)).toEqual({ ok: false, reason: 'unbalanced_brackets' });
  });

  it.each([
    ', холод',
    'простуда,',
    'простуда,, холод',
    'простуда; ; холод',
  ])('rejects empty top-level segments: %s', (raw) => {
    expect(parseDisplayGloss(raw)).toEqual({ ok: false, reason: 'empty_primary_sense' });
  });

  it.each([
    ['', 'empty_input'],
    ['  \t ', 'empty_input'],
    ['простуда\u0000', 'control_character'],
    ['простуда\nхолод', 'control_character'],
    ['простуда <i>холод</i>', 'unsupported_editorial_fragment'],
    ['простуда [sic]', 'unsupported_editorial_fragment'],
  ] as const)('rejects malformed source text: %s', (raw, reason) => {
    expect(parseDisplayGloss(raw)).toEqual({ ok: false, reason });
  });

  it('trims only outer segment whitespace without mutating the input', () => {
    const raw = '  простуда!  ,  холод?  ';
    expect(parseDisplayGloss(raw)).toEqual({
      ok: true,
      value: { displayTranslation: 'простуда!', senseHint: 'холод?' },
    });
    expect(raw).toBe('  простуда!  ,  холод?  ');
  });

  it('allows exactly three display words and rejects four', () => {
    expect(parseDisplayGloss('очень сильная простуда')).toMatchObject({ ok: true });
    expect(parseDisplayGloss('очень сильная зимняя простуда')).toEqual({
      ok: false,
      reason: 'display_word_count_exceeded',
    });
  });

  it('uses UTF-8 byte limits for input, display, and sense hint boundaries', () => {
    const exactOption = 'я'.repeat(TOURNAMENT_TASK_LIMITS.optionBytes / 2);
    const overOption = `${exactOption}я`;
    expect(Buffer.byteLength(exactOption, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(parseDisplayGloss(exactOption)).toEqual({
      ok: true,
      value: { displayTranslation: exactOption, senseHint: '' },
    });
    expect(parseDisplayGloss(overOption)).toEqual({ ok: false, reason: 'input_bytes_exceeded' });
    const exactInput = `a,${'я'.repeat((TOURNAMENT_TASK_LIMITS.optionBytes - 2) / 2)}`;
    expect(Buffer.byteLength(exactInput, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(parseDisplayGloss(exactInput)).toEqual({
      ok: true,
      value: { displayTranslation: 'a', senseHint: 'я'.repeat((TOURNAMENT_TASK_LIMITS.optionBytes - 2) / 2) },
    });
    expect(parseDisplayGloss(`${exactInput}я`)).toEqual({
      ok: false,
      reason: 'input_bytes_exceeded',
    });
  });
});
