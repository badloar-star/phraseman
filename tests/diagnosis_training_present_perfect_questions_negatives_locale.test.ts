import fs from 'fs';
import path from 'path';
import { PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING } from '../app/diagnosis_training_present_perfect_questions_negatives';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('present perfect questions/negatives diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_present_perfect_questions_negatives.ts'), 'utf8');

  it('does not use generic present perfect questions planned fallback as final copy', () => {
    expect(source).not.toContain('PP_QN_GENERIC_PLANNED');
    expect(source).toContain('PP_QN_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a pergunta ou negacao correta no Present Perfect.');
    expect(source).not.toContain('Chon cau hoi hoac cau phu dinh dung trong Present Perfect.');
    expect(source).not.toContain('Pilih pertanyaan atau kalimat negatif yang benar dalam Present Perfect.');
    expect(source).not.toContain('Present Perfect icin dogru soru veya olumsuz cumleyi sec.');
    expect(source).not.toContain('Wybierz poprawne pytanie albo przeczenie w Present Perfect.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.title[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
