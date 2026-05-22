import fs from 'fs';
import path from 'path';
import { VERB_PRESENT_PERFECT_BASIC_TRAINING } from '../app/diagnosis_training_verb_present_perfect_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('present perfect basic diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_verb_present_perfect_basic.ts'), 'utf8');

  it('does not use generic present-perfect planned fallback as final copy', () => {
    expect(source).not.toContain('PRESENT_PERFECT_GENERIC_PLANNED');
    expect(source).toContain('PRESENT_PERFECT_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma correta de Present Perfect: have/has + V3, com already/yet/ever/never quando necessario.');
    expect(source).not.toContain('Hay chon dang Present Perfect dung: have/has + V3, voi already/yet/ever/never khi can.');
    expect(source).not.toContain('Pilih bentuk Present Perfect yang benar: have/has + V3, dengan already/yet/ever/never bila perlu.');
    expect(source).not.toContain('Dogru Present Perfect bicimini sec: have/has + V3, gerekirse already/yet/ever/never ile.');
    expect(source).not.toContain('Wybierz wlasciwa forme Present Perfect: have/has + V3, w razie potrzeby z already/yet/ever/never.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PRESENT_PERFECT_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = VERB_PRESENT_PERFECT_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
