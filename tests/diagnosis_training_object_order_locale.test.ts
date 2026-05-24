import fs from 'fs';
import path from 'path';
import { OBJECT_ORDER_GIVE_ME_IT_TRAINING } from '../app/diagnosis_training_object_order_give_me_it';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('object order diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_object_order_give_me_it.ts'), 'utf8');

  it('does not use generic planned object-order fallback as final copy', () => {
    expect(source).not.toContain('OBJECT_ORDER_GENERIC_PLANNED');
    expect(source).toContain('OBJECT_ORDER_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a ordem segura: coisa completa ou it/them antes de to/for.');
    expect(source).not.toContain('Hãy chọn trật tự an toàn: đồ vật đầy đủ hoặc it/them trước to/for.');
    expect(source).not.toContain('Pilih urutan aman: benda lengkap atau it/them sebelum to/for.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.title[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(OBJECT_ORDER_GIVE_ME_IT_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = OBJECT_ORDER_GIVE_ME_IT_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
