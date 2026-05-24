import fs from 'fs';
import path from 'path';
import { TOO_ENOUGH_TRAINING } from '../app/diagnosis_training_too_enough';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('too/enough diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_too_enough.ts'), 'utf8');

  it('does not use generic too/enough planned fallback as final copy', () => {
    expect(source).not.toContain('TOO_ENOUGH_GENERIC_PLANNED');
    expect(source).toContain('TOO_ENOUGH_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha too ou enough e verifique a ordem das palavras.');
    expect(source).not.toContain('Chon too hoac enough va kiem tra thu tu tu.');
    expect(source).not.toContain('Pilih too atau enough dan periksa urutan kata.');
    expect(source).not.toContain('Too veya enough sec ve kelime sirasini kontrol et.');
    expect(source).not.toContain('Wybierz too albo enough i sprawdz szyk slow.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(TOO_ENOUGH_TRAINING.title[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(TOO_ENOUGH_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(TOO_ENOUGH_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(TOO_ENOUGH_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(TOO_ENOUGH_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(TOO_ENOUGH_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = TOO_ENOUGH_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
