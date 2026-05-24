import fs from 'fs';
import path from 'path';
import { VERB_WAS_WERE_TRAINING } from '../app/diagnosis_training_verb_was_were';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('was were diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_verb_was_were.ts'), 'utf8');

  it('does not use generic was-were planned fallback as final copy', () => {
    expect(source).not.toContain('WAS_WERE_GENERIC_PLANNED');
    expect(source).toContain('WAS_WERE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha was ou were para be no passado.');
    expect(source).not.toContain('Chon was hoac were cho be trong qua khu.');
    expect(source).not.toContain('Pilih was atau were untuk be di masa lalu.');
    expect(source).not.toContain('Gecmiste be icin was veya were sec.');
    expect(source).not.toContain('Wybierz was albo were dla be w przeszlosci.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(VERB_WAS_WERE_TRAINING.title[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(VERB_WAS_WERE_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_WAS_WERE_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_WAS_WERE_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_WAS_WERE_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_WAS_WERE_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = VERB_WAS_WERE_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
