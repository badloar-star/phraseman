import fs from 'fs';
import path from 'path';
import { PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING } from '../app/diagnosis_training_past_simple_vs_past_continuous';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('past simple vs past continuous diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_past_simple_vs_past_continuous.ts'), 'utf8');

  it('does not use generic past simple/continuous planned fallback as final copy', () => {
    expect(source).not.toContain('PAST_SIMPLE_CONT_GENERIC_PLANNED');
    expect(source).toContain('PAST_SIMPLE_CONT_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha Past Simple para evento/fato e Past Continuous para processo de fundo.');
    expect(source).not.toContain('Chon Past Simple cho su kien/su that va Past Continuous cho qua trinh nen.');
    expect(source).not.toContain('Pilih Past Simple untuk peristiwa/fakta dan Past Continuous untuk proses latar.');
    expect(source).not.toContain('Olay/olgu icin Past Simple, arka plan sureci icin Past Continuous sec.');
    expect(source).not.toContain('Wybierz Past Simple dla wydarzenia/faktu i Past Continuous dla procesu w tle.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.title[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
