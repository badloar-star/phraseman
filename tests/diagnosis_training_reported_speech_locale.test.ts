import fs from 'fs';
import path from 'path';
import { REPORTED_SPEECH_BASIC_TRAINING } from '../app/diagnosis_training_reported_speech_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('reported speech diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_reported_speech_basic.ts'), 'utf8');

  it('does not use generic reported speech planned fallback as final copy', () => {
    expect(source).not.toContain('REPORTED_GENERIC_PLANNED');
    expect(source).toContain('REPORTED_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma correta de reported speech: said that, told me, asked if ou asked where.');
    expect(source).not.toContain('Hay chon dang reported speech dung: said that, told me, asked if hoac asked where.');
    expect(source).not.toContain('Pilih bentuk reported speech yang benar: said that, told me, asked if, atau asked where.');
    expect(source).not.toContain('Dogru reported speech bicimini sec: said that, told me, asked if ya da asked where.');
    expect(source).not.toContain('Wybierz wlasciwa forme reported speech: said that, told me, asked if albo asked where.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(REPORTED_SPEECH_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(REPORTED_SPEECH_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(REPORTED_SPEECH_BASIC_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(REPORTED_SPEECH_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(REPORTED_SPEECH_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(REPORTED_SPEECH_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = REPORTED_SPEECH_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
