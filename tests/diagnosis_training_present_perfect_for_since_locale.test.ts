import fs from 'fs';
import path from 'path';
import { PRESENT_PERFECT_FOR_SINCE_TRAINING } from '../app/diagnosis_training_present_perfect_for_since';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('present perfect for/since diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_present_perfect_for_since.ts'), 'utf8');

  it('does not use generic planned for/since fallback as final copy', () => {
    expect(source).not.toContain('PP_FOR_SINCE_GENERIC_PLANNED');
    expect(source).toContain('PP_FOR_SINCE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha for para duracao e since para ponto inicial.');
    expect(source).not.toContain('Chon for cho khoang thoi gian va since cho diem bat dau.');
    expect(source).not.toContain('Pilih for untuk durasi dan since untuk titik awal.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.title[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_FOR_SINCE_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PRESENT_PERFECT_FOR_SINCE_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
