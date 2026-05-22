import fs from 'fs';
import path from 'path';
import { WORD_ORDER_BASIC_QUESTION_TRAINING } from '../app/diagnosis_training_word_order_basic_question';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('word order basic question diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_word_order_basic_question.ts'), 'utf8');

  it('does not use generic question-order planned fallback as final copy', () => {
    expect(source).not.toContain('QUESTION_ORDER_GENERIC_PLANNED');
    expect(source).toContain('QUESTION_ORDER_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a primeira palavra da pergunta e mantenha a ordem de pergunta em inglês.');
    expect(source).not.toContain('Hãy chọn từ mở đầu câu hỏi rồi giữ trật tự câu hỏi tiếng Anh.');
    expect(source).not.toContain('Pilih kata pembuka pertanyaan lalu pertahankan urutan pertanyaan bahasa Inggris.');
    expect(source).not.toContain('Sorunun ilk kelimesini seç ve İngilizce soru sırasını koru.');
    expect(source).not.toContain('Wybierz pierwsze słowo pytania i zachowaj angielski szyk pytania.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.title[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(WORD_ORDER_BASIC_QUESTION_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = WORD_ORDER_BASIC_QUESTION_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
