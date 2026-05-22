import fs from 'fs';
import path from 'path';
import { RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING } from '../app/diagnosis_training_relative_clauses_who_which_that';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('relative clauses diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_relative_clauses_who_which_that.ts'), 'utf8');

  it('does not use generic relative clauses planned fallback as final copy', () => {
    expect(source).not.toContain('RELATIVE_GENERIC_PLANNED');
    expect(source).toContain('RELATIVE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha o conector correto: who para pessoas, which para coisas, that para detalhe essencial, whose para posse.');
    expect(source).not.toContain('Hay chon tu noi dung: who cho nguoi, which cho vat/y, that cho chi tiet can thiet, whose cho so huu.');
    expect(source).not.toContain('Pilih penghubung yang benar: who untuk orang, which untuk benda/ide, that untuk detail penting, whose untuk milik.');
    expect(source).not.toContain('Dogru baglaci sec: insanlar icin who, seyler icin which, gerekli ayrinti icin that, sahiplik icin whose.');
    expect(source).not.toContain('Wybierz wlasciwy lacznik: who dla ludzi, which dla rzeczy, that dla waznego doprecyzowania, whose dla posiadania.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.title[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
