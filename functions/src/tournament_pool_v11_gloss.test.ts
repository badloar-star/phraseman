import { TOURNAMENT_TASK_LIMITS } from './tournament_core';
import { parseDisplayGloss } from './tournament_pool_v11_gloss';

describe('parseDisplayGloss', () => {
  it('extracts a trailing whitespace-prefixed parenthetical sense annotation', () => {
    expect(parseDisplayGloss('до полудня (утро, ночь)')).toEqual({
      ok: true,
      value: { displayTranslation: 'до полудня', senseHint: 'утро, ночь' },
    });
  });

  it('merges an extracted annotation with top-level secondary senses', () => {
    expect(parseDisplayGloss('до полудня (утро, ночь), до обеда')).toEqual({
      ok: true,
      value: { displayTranslation: 'до полудня', senseHint: 'утро, ночь; до обеда' },
    });
  });

  it('splits top-level senses and joins additional hints deterministically', () => {
    expect(parseDisplayGloss('простуда, холод; озноб / стужа')).toEqual({
      ok: true,
      value: { displayTranslation: 'простуда', senseHint: 'холод; озноб; стужа' },
    });
  });

  it('preserves nested balanced brackets and their internal separators', () => {
    expect(parseDisplayGloss('вещь[редко:предмет(старое/новое;пример,случай)], объект')).toEqual({
      ok: true,
      value: {
        displayTranslation: 'вещь[редко:предмет(старое/новое;пример,случай)]',
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
    ['простуда <холод', 'unsupported_editorial_fragment'],
    ['простуда [sic]', 'unsupported_editorial_fragment'],
    ['слово (устар.)', 'unsupported_editorial_fragment'],
    ['слово [книжн.]', 'unsupported_editorial_fragment'],
    ['слово ред.', 'unsupported_editorial_fragment'],
    ['слово разг.', 'unsupported_editorial_fragment'],
    ['слово букв.', 'unsupported_editorial_fragment'],
    ['слово перен.', 'unsupported_editorial_fragment'],
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

  it('counts display words with the runtime whitespace-token contract after extraction', () => {
    expect(parseDisplayGloss('слово (очень длинное пояснение)')).toEqual({
      ok: true,
      value: { displayTranslation: 'слово', senseHint: 'очень длинное пояснение' },
    });
    expect(parseDisplayGloss('слово (очень длинное пояснение) ещё четыре')).toEqual({
      ok: false,
      reason: 'display_word_count_exceeded',
    });
    expect(parseDisplayGloss('a(b)c(d)e(f)g')).toEqual({
      ok: true,
      value: { displayTranslation: 'a(b)c(d)e(f)g', senseHint: '' },
    });
    expect(parseDisplayGloss('a.m.')).toEqual({
      ok: true,
      value: { displayTranslation: 'a.m.', senseHint: '' },
    });
  });

  it('allows ordinary period-terminated trailing sense annotations', () => {
    expect(parseDisplayGloss('слово (обычное значение.)')).toEqual({
      ok: true,
      value: { displayTranslation: 'слово', senseHint: 'обычное значение.' },
    });
  });

  it.each([
    'слово\u061C',
    'слово\u200E',
    'слово\u200F',
    'слово\u202A',
    'слово\u202E',
    'слово\u2066',
    'слово\u2069',
    'слово\u200B',
    'слово\u200D',
    'слово\u2060',
    'слово\uFEFF',
    'слово\u00AD',
    'слово\u206A',
    'слово\uFFF9',
    `слово${String.fromCodePoint(0x1BCA0)}`,
  ])('rejects Unicode format controls: %s', (raw) => {
    expect(parseDisplayGloss(raw)).toEqual({ ok: false, reason: 'control_character' });
  });

  it.each([String.fromCharCode(0xD800), String.fromCharCode(0xDC00)])('rejects unpaired surrogates', (raw) => {
    expect(parseDisplayGloss(`слово${raw}`)).toEqual({ ok: false, reason: 'invalid_unicode' });
  });

  it('uses UTF-8 byte limits for input, display, and sense hint boundaries', () => {
    const exactOption = 'я'.repeat(TOURNAMENT_TASK_LIMITS.optionBytes / 2);
    const overOption = `${exactOption}я`;
    expect(Buffer.byteLength(exactOption, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(parseDisplayGloss(exactOption)).toEqual({
      ok: true,
      value: { displayTranslation: exactOption, senseHint: '' },
    });
    expect(parseDisplayGloss(overOption)).toEqual({ ok: false, reason: 'display_bytes_exceeded' });
    const exactInput = `a,${'я'.repeat((TOURNAMENT_TASK_LIMITS.optionBytes - 2) / 2)}`;
    expect(Buffer.byteLength(exactInput, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(parseDisplayGloss(exactInput)).toEqual({
      ok: true,
      value: { displayTranslation: 'a', senseHint: 'я'.repeat((TOURNAMENT_TASK_LIMITS.optionBytes - 2) / 2) },
    });
    expect(parseDisplayGloss(`${exactInput}я`)).toEqual({
      ok: true,
      value: { displayTranslation: 'a', senseHint: 'я'.repeat(TOURNAMENT_TASK_LIMITS.optionBytes / 2) },
    });

    const exactHintSegments = [...Array(31).fill('я'), 'x', 'y'];
    const exactHint = exactHintSegments.join('; ');
    const exactHintRaw = `a,${exactHintSegments.join(',')}`;
    expect(Buffer.byteLength(exactHintRaw, 'utf8')).toBeLessThanOrEqual(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(Buffer.byteLength(exactHint, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(parseDisplayGloss(exactHintRaw)).toEqual({
      ok: true,
      value: { displayTranslation: 'a', senseHint: exactHint },
    });

    const overHintSegments = [...Array(8).fill('я'), ...Array(33).fill('x')];
    const overHint = overHintSegments.join('; ');
    const overHintRaw = `a,${overHintSegments.join(',')}`;
    expect(Buffer.byteLength(overHintRaw, 'utf8')).toBeLessThanOrEqual(TOURNAMENT_TASK_LIMITS.optionBytes);
    expect(Buffer.byteLength(overHint, 'utf8')).toBe(TOURNAMENT_TASK_LIMITS.optionBytes + 1);
    expect(parseDisplayGloss(overHintRaw)).toEqual({
      ok: false,
      reason: 'sense_hint_bytes_exceeded',
    });

    const overInput = 'я'.repeat(Math.floor(TOURNAMENT_TASK_LIMITS.referenceBytes / 2) + 1);
    expect(Buffer.byteLength(overInput, 'utf8')).toBeGreaterThan(TOURNAMENT_TASK_LIMITS.referenceBytes);
    expect(parseDisplayGloss(overInput)).toEqual({ ok: false, reason: 'input_bytes_exceeded' });
  });
});
