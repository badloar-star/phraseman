import {
  validateExplainInput,
  sanitizeExplanationOutput,
  wrongScriptRatio,
  expectedScriptFor,
  heuristicReject,
  MAX_PHRASE_LEN,
  MAX_MEANING_LEN,
  MIN_OUTPUT_LEN,
  MAX_WRONG_SCRIPT_RATIO,
} from './explain_gates';

describe('explain_gates — input validation', () => {
  it('accepts a normal phrase + meaning', () => {
    const r = validateExplainInput({ phraseEn: 'Break a leg', phraseMeaning: 'Удачи!', lang: 'ru' });
    expect(r.ok).toBe(true);
  });

  it('rejects an empty phraseEn', () => {
    expect(validateExplainInput({ phraseEn: '', phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
    expect(validateExplainInput({ phraseEn: '   ', phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
  });

  it('rejects a phraseEn longer than MAX_PHRASE_LEN', () => {
    const long = 'a'.repeat(MAX_PHRASE_LEN + 1);
    expect(validateExplainInput({ phraseEn: long, phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
  });

  it('rejects a missing/empty phraseMeaning (it feeds the fallback)', () => {
    expect(validateExplainInput({ phraseEn: 'Hello', phraseMeaning: '', lang: 'ru' }).ok).toBe(false);
    expect(validateExplainInput({ phraseEn: 'Hello', phraseMeaning: undefined, lang: 'ru' }).ok).toBe(false);
  });

  it('rejects a phraseMeaning longer than MAX_MEANING_LEN', () => {
    const long = 'я'.repeat(MAX_MEANING_LEN + 1);
    expect(validateExplainInput({ phraseEn: 'Hello', phraseMeaning: long, lang: 'ru' }).ok).toBe(false);
  });
});

describe('explain_gates — output sanitizer', () => {
  it('strips markdown emphasis and code fences', () => {
    const out = sanitizeExplanationOutput('**Hello** _world_ `code`');
    expect(out).not.toMatch(/[*_`]/);
    expect(out).toContain('Hello');
  });

  it('strips leading list/heading markers and stage directions', () => {
    const out = sanitizeExplanationOutput('# Title\n- item\n(He smiles) Hi there');
    expect(out).not.toMatch(/^#/m);
    expect(out).not.toMatch(/^- /m);
  });

  it('collapses excessive whitespace and trims', () => {
    expect(sanitizeExplanationOutput('  a\n\n\n b  ')).toBe('a\n\nb');
  });
});

describe('explain_gates — language-aware wrong-script (the prod-bug guard)', () => {
  it('expects Cyrillic for ru/uk and Latin for en/es', () => {
    expect(expectedScriptFor('ru')).toBe('cyrillic');
    expect(expectedScriptFor('uk')).toBe('cyrillic');
    expect(expectedScriptFor('en')).toBe('latin');
    expect(expectedScriptFor('es')).toBe('latin');
  });

  it('a valid Russian explanation (Cyrillic) is NOT wrong-script for lang=ru', () => {
    const ratio = wrongScriptRatio('Это значит пожелать удачи перед выступлением.', 'ru');
    expect(ratio).toBeLessThan(MAX_WRONG_SCRIPT_RATIO);
  });

  it('an English explanation IS wrong-script when lang=ru', () => {
    const ratio = wrongScriptRatio('This means good luck before a show.', 'ru');
    expect(ratio).toBeGreaterThan(MAX_WRONG_SCRIPT_RATIO);
  });

  it('a valid English explanation is NOT wrong-script for lang=en', () => {
    const ratio = wrongScriptRatio('This means good luck before a show.', 'en');
    expect(ratio).toBeLessThan(MAX_WRONG_SCRIPT_RATIO);
  });

  it('ignores digits/punctuation/spaces when computing the ratio', () => {
    // only letters count; "5 минут — это 300 секунд" is Cyrillic letters + digits
    const ratio = wrongScriptRatio('5 минут — это 300 секунд!', 'ru');
    expect(ratio).toBeLessThan(MAX_WRONG_SCRIPT_RATIO);
  });
});

describe('explain_gates — heuristicReject (pre-filter before the paid judge)', () => {
  it('rejects empty / whitespace output', () => {
    expect(heuristicReject('', 'ru')).toBe('empty');
    expect(heuristicReject('   ', 'ru')).toBe('empty');
  });

  it('rejects output shorter than MIN_OUTPUT_LEN as too_short', () => {
    expect(heuristicReject('Да', 'ru')).toBe('too_short'); // < 5 chars
  });

  it('rejects wrong-script output', () => {
    expect(heuristicReject('This is in English not Russian', 'ru')).toBe('non_target_language');
  });

  it('returns null (passes to judge) for a plausible Russian explanation', () => {
    expect(heuristicReject('Это значит пожелать кому-то удачи.', 'ru')).toBeNull();
  });

  it('returns null for a plausible English explanation when lang=en', () => {
    expect(heuristicReject('It means to wish someone good luck.', 'en')).toBeNull();
  });
});
