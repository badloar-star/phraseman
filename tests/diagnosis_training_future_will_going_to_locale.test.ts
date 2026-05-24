import fs from 'fs';
import path from 'path';
import { FUTURE_WILL_GOING_TO_TRAINING } from '../app/diagnosis_training_future_will_going_to';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('future will/going to diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_future_will_going_to.ts'), 'utf8');

  it('does not use generic will/going to planned fallback as final copy', () => {
    expect(source).not.toContain('FUTURE_WILL_GENERIC_PLANNED');
    expect(source).toContain('FUTURE_WILL_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha will para decisão/promessa/previsão e going to para plano ou evidência.');
    expect(source).not.toContain('Chọn will cho quyết định/lời hứa/dự đoán và going to cho kế hoạch hoặc bằng chứng.');
    expect(source).not.toContain('Pilih will untuk keputusan/janji/prediksi dan going to untuk rencana atau bukti.');
    expect(source).not.toContain('Karar/söz/tahmin için will, plan veya kanıt için going to seç.');
    expect(source).not.toContain('Wybierz will dla decyzji/obietnicy/przewidywania i going to dla planu albo dowodu.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(FUTURE_WILL_GOING_TO_TRAINING.title[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(FUTURE_WILL_GOING_TO_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_WILL_GOING_TO_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_WILL_GOING_TO_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_WILL_GOING_TO_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(FUTURE_WILL_GOING_TO_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = FUTURE_WILL_GOING_TO_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
