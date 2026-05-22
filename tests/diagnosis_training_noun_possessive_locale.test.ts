import fs from 'fs';
import path from 'path';
import { NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING } from '../app/diagnosis_training_noun_possessive_apostrophe_s';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('noun possessive apostrophe s diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_noun_possessive_apostrophe_s.ts'), 'utf8');

  it('does not use generic possessive planned fallback as final copy', () => {
    expect(source).not.toContain('POSSESSIVE_GENERIC_PLANNED');
    expect(source).toContain('POSSESSIVE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma possessiva com apostrofo correta.');
    expect(source).not.toContain('Chon dang so huu dung voi dau apostrophe.');
    expect(source).not.toContain('Pilih bentuk possessive dengan apostrof yang benar.');
    expect(source).not.toContain('Dogru apostroflu iyelik bicimini sec.');
    expect(source).not.toContain('Wybierz poprawna forme dzierzawcza z apostrofem.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.title[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
