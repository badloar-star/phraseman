import fs from 'fs';
import path from 'path';
import { CONDITION_SECOND_BASIC_TRAINING } from '../app/diagnosis_training_condition_second_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('second conditional diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_condition_second_basic.ts'), 'utf8');

  it('does not use generic planned second conditional fallback as final copy', () => {
    expect(source).not.toContain('SECOND_CONDITION_GENERIC_PLANNED');
    expect(source).toContain('SECOND_CONDITION_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma correta para uma situacao imaginada com if e would.');
    expect(source).not.toContain('Hay chon dang dung cho tinh huong tuong tuong voi if va would.');
    expect(source).not.toContain('Pilih bentuk yang benar untuk situasi imajiner dengan if dan would.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(CONDITION_SECOND_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(CONDITION_SECOND_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_SECOND_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_SECOND_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(CONDITION_SECOND_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = CONDITION_SECOND_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
