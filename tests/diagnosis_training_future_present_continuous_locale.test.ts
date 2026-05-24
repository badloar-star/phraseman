import fs from 'fs';
import path from 'path';
import { FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING } from '../app/diagnosis_training_future_present_continuous_arrangements';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('future Present Continuous diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_future_present_continuous_arrangements.ts'), 'utf8');

  it('does not use generic future Present Continuous planned fallback as final copy', () => {
    expect(source).not.toContain('FUTURE_PC_GENERIC_PLANNED');
    expect(source).toContain('FUTURE_PC_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha Present Continuous para compromisso futuro, will para decisão agora ou going to para intenção.');
    expect(source).not.toContain('Chọn Present Continuous cho sắp xếp tương lai, will cho quyết định lúc nói, hoặc going to cho ý định.');
    expect(source).not.toContain('Pilih Present Continuous untuk rencana yang sudah diatur, will untuk keputusan saat ini, atau going to untuk niat.');
    expect(source).not.toContain('Gelecek düzenleme için Present Continuous, şimdi alınan karar için will, niyet için going to seç.');
    expect(source).not.toContain('Wybierz Present Continuous dla ustalenia w przyszłości, will dla decyzji teraz albo going to dla zamiaru.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.title[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
