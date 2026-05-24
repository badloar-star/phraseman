import fs from 'fs';
import path from 'path';
import { PAST_CONTINUOUS_BASIC_TRAINING } from '../app/diagnosis_training_past_continuous_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('past continuous diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_past_continuous_basic.ts'), 'utf8');

  it('does not use generic planned Past Continuous fallback as final copy', () => {
    expect(source).not.toContain('PAST_CONT_GENERIC_PLANNED');
    expect(source).toContain('PAST_CONT_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha was/were + -ing para mostrar um processo no passado.');
    expect(source).not.toContain('Chon was/were + -ing de noi ve mot qua trinh trong qua khu.');
    expect(source).not.toContain('Pilih was/were + -ing untuk menunjukkan proses di masa lalu.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PAST_CONTINUOUS_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PAST_CONTINUOUS_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_CONTINUOUS_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_CONTINUOUS_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_CONTINUOUS_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PAST_CONTINUOUS_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
