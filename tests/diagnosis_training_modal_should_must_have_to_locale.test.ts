import fs from 'fs';
import path from 'path';
import { MODAL_SHOULD_MUST_HAVE_TO_TRAINING } from '../app/diagnosis_training_modal_should_must_have_to';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('modal should/must/have to diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_modal_should_must_have_to.ts'), 'utf8');

  it('does not use generic should/must/have to planned fallback as final copy', () => {
    expect(source).not.toContain('SHOULD_MUST_GENERIC_PLANNED');
    expect(source).toContain('SHOULD_MUST_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha should, must, have to, don’t have to ou mustn’t pela forca.');
    expect(source).not.toContain('Chon should, must, have to, don’t have to hoac mustn’t theo muc do.');
    expect(source).not.toContain('Pilih should, must, have to, don’t have to, atau mustn’t sesuai kekuatan.');
    expect(source).not.toContain('Guce gore should, must, have to, don’t have to veya mustn’t sec.');
    expect(source).not.toContain('Wybierz should, must, have to, don’t have to albo mustn’t wedlug sily.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.title[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(MODAL_SHOULD_MUST_HAVE_TO_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = MODAL_SHOULD_MUST_HAVE_TO_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
