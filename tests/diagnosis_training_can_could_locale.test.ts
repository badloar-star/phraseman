import fs from 'fs';
import path from 'path';
import { MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING } from '../app/diagnosis_training_modal_can_could_ability_request';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('modal can/could diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_modal_can_could_ability_request.ts'), 'utf8');

  it('does not use generic planned can/could fallback as final copy', () => {
    expect(source).not.toContain('CAN_COULD_GENERIC_PLANNED');
    expect(source).toContain('CAN_COULD_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha can, could, can not ou could not conforme tempo e tom.');
    expect(source).not.toContain('Chon can, could, can not hoac could not theo thoi gian va sac thai.');
    expect(source).not.toContain('Pilih can, could, can not, atau could not sesuai waktu dan nada.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.title[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
