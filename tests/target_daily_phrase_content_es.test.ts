import spanishBank from '../content/daily-phrases/es/source-bank.json';

describe('Spanish Daily Phrase candidate bank', () => {
  it('is a closed, isolated 176-row Spanish candidate', () => {
    expect(spanishBank.studyTarget).toBe('es');
    expect(spanishBank.sourceLocale).toBe('ru');
    expect(spanishBank.surface).toBe('daily_phrase');
    expect(spanishBank.activationApproved).toBe(false);
    expect(spanishBank.rows).toHaveLength(176);

    const ids = new Set<string>();
    const targets = new Set<string>();
    for (const row of spanishBank.rows) {
      expect(row.studyTarget).toBe('es');
      expect(row.sourceLocale).toBe('ru');
      expect(row.surface).toBe('daily_phrase');
      expect(row.allowSave).toBe(true);
      expect(row.active).toBe(false);
      expect(row.activationApproved).toBe(false);
      expect(row.sourceEvidence).toBeTruthy();
      for (const field of ['targetText', 'targetExample', 'literal_ru', 'meaning_ru', 'text_ru', 'literal_uk', 'meaning_uk', 'text_uk'] as const) {
        expect(row[field].trim()).not.toBe('');
      }
      expect(ids.has(row.id)).toBe(false);
      expect(targets.has(row.targetText.toLocaleLowerCase())).toBe(false);
      ids.add(row.id);
      targets.add(row.targetText.toLocaleLowerCase());
    }
  });
});
