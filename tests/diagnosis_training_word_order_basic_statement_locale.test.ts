import fs from 'fs';
import path from 'path';
import { WORD_ORDER_BASIC_STATEMENT_TRAINING } from '../app/diagnosis_training_word_order_basic_statement';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('word order basic statement diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_word_order_basic_statement.ts'), 'utf8');

  it('does not use generic word-order planned fallback as final copy', () => {
    expect(source).not.toContain('WORD_ORDER_GENERIC_PLANNED');
    expect(source).toContain('WORD_ORDER_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Monte a frase neutra em inglês: quem, ação, coisa, lugar e tempo.');
    expect(source).not.toContain('Hãy dựng câu tiếng Anh trung tính: ai, hành động, vật, nơi chốn và thời gian.');
    expect(source).not.toContain('Susun kalimat Inggris netral: siapa, aksi, benda, tempat, lalu waktu.');
    expect(source).not.toContain('Nötr İngilizce cümleyi kur: kim, eylem, nesne, yer ve zaman.');
    expect(source).not.toContain('Zbuduj neutralne zdanie po angielsku: kto, czynność, rzecz, miejsce i czas.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.title[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_STATEMENT_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = WORD_ORDER_BASIC_STATEMENT_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
