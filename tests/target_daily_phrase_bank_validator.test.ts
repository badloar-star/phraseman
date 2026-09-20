import { validateTargetDailyPhraseBank } from '../scripts/validate_target_daily_phrase_bank.mjs';

const row = (id: number) => ({
  id: `es-daily-${id}`,
  order: id,
  studyTarget: 'es',
  sourceLocale: 'ru',
  surface: 'daily_phrase',
  targetText: `expresión ${id}`,
  targetExample: `Usamos expresión ${id} en una frase natural.`,
  literal_ru: `буквально ${id}`,
  meaning_ru: `значение ${id}`,
  text_ru: `В разговоре скажи expresión ${id}.`,
  literal_uk: `буквально ${id}`,
  meaning_uk: `значення ${id}`,
  text_uk: `У розмові скажи expresión ${id}.`,
  allowSave: true,
  active: false,
  activationApproved: false,
});

describe('target Daily Phrase bank validator', () => {
  it('structurally accepts exactly 176 complete native-shaped rows, without claiming content quality', () => {
    const bank = {
      studyTarget: 'es',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      activationApproved: false,
      rows: Array.from({ length: 176 }, (_, index) => row(index + 1)),
    };

    expect(validateTargetDailyPhraseBank(bank)).toEqual({ status: 'STRUCTURAL_PASS', errors: [] });
  });

  it('accepts valid Spanish ñ instead of treating it as mojibake', () => {
    const bank = {
      studyTarget: 'es',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      activationApproved: false,
      rows: Array.from({ length: 176 }, (_, index) => ({
        ...row(index + 1),
        targetText: index === 0 ? 'Año nuevo, vida nueva' : `expresión ${index + 1}`,
        targetExample: index === 0 ? 'Con el año nuevo empezó una vida nueva.' : `Usamos expresión ${index + 1} en una frase natural.`,
      })),
    };

    expect(validateTargetDailyPhraseBank(bank).errors).not.toEqual(
      expect.arrayContaining([expect.stringContaining('contains_placeholder')]),
    );
  });

  it('rejects an incomplete bank and target text omitted from an example', () => {
    const incomplete = {
      studyTarget: 'de',
      sourceLocale: 'uk',
      surface: 'daily_phrase',
      activationApproved: false,
      rows: [{ ...row(1), studyTarget: 'de', sourceLocale: 'uk', targetExample: '' }],
    };

    expect(validateTargetDailyPhraseBank(incomplete)).toEqual({
      status: 'FAIL',
      errors: expect.arrayContaining(['count_must_equal_176', 'row:de-daily-1:targetExample_required']),
    });
  });
});
