import fs from 'fs';
import path from 'path';
import { MODAL_MAY_MIGHT_PROBABILITY_TRAINING } from '../app/diagnosis_training_modal_may_might_probability';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('modal may/might diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_modal_may_might_probability.ts'), 'utf8');

  it('does not use generic planned may/might fallback as final copy', () => {
    expect(source).not.toContain('MAY_MIGHT_GENERIC_PLANNED');
    expect(source).toContain('MAY_MIGHT_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha may, might, may not ou might not para probabilidade.');
    expect(source).not.toContain('Chon may, might, may not hoac might not cho kha nang xay ra.');
    expect(source).not.toContain('Pilih may, might, may not, atau might not untuk kemungkinan.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.title[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_MAY_MIGHT_PROBABILITY_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = MODAL_MAY_MIGHT_PROBABILITY_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
