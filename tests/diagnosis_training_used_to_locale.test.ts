import fs from 'fs';
import path from 'path';
import { USED_TO_BASIC_TRAINING } from '../app/diagnosis_training_used_to_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('used to diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_used_to_basic.ts'), 'utf8');

  it('does not use generic used-to planned fallback as final copy', () => {
    expect(source).not.toContain('USED_TO_GENERIC_PLANNED');
    expect(source).toContain('USED_TO_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha used to para habito antigo, use to depois de did, ou present para habito atual.');
    expect(source).not.toContain('Chon used to cho thoi quen cu, use to sau did, hoac present cho thoi quen hien tai.');
    expect(source).not.toContain('Pilih used to untuk kebiasaan lama, use to setelah did, atau present untuk kebiasaan saat ini.');
    expect(source).not.toContain('Eski aliskanlik icin used to, did sonrasi use to, simdiki aliskanlik icin present sec.');
    expect(source).not.toContain('Wybierz used to dla dawnego nawyku, use to po did albo present dla obecnego nawyku.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(USED_TO_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(USED_TO_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(USED_TO_BASIC_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(USED_TO_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(USED_TO_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(USED_TO_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = USED_TO_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
