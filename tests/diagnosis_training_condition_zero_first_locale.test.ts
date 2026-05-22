import fs from 'fs';
import path from 'path';
import { CONDITION_ZERO_FIRST_TRAINING } from '../app/diagnosis_training_condition_zero_first';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('zero and first conditional diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_condition_zero_first.ts'), 'utf8');

  it('does not use generic planned condition fallback as final copy', () => {
    expect(source).not.toContain('CONDITION_GENERIC_PLANNED');
    expect(source).toContain('CONDITION_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma correta: sem will depois de if/when/unless neste padrao.');
    expect(source).not.toContain('Hay chon dang dung: khong dung will sau if/when/unless trong mau nay.');
    expect(source).not.toContain('Pilih bentuk yang benar: tanpa will setelah if/when/unless dalam pola ini.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(CONDITION_ZERO_FIRST_TRAINING.title[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(CONDITION_ZERO_FIRST_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_ZERO_FIRST_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_ZERO_FIRST_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_ZERO_FIRST_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = CONDITION_ZERO_FIRST_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
