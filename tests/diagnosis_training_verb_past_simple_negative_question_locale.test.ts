import fs from 'fs';
import path from 'path';
import { VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING } from '../app/diagnosis_training_verb_past_simple_negative_question';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('past simple did/did not diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_verb_past_simple_negative_question.ts'), 'utf8');

  it('does not use generic did/did-not planned fallback as final copy', () => {
    expect(source).not.toContain('PAST_DID_GENERIC_PLANNED');
    expect(source).toContain('PAST_DID_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain("Escolha a forma correta com did/didn't e verbo base depois dele.");
    expect(source).not.toContain("Hay chon dang dung voi did/didn't va dong tu nguyen mau sau no.");
    expect(source).not.toContain("Pilih bentuk yang benar dengan did/didn't dan verba dasar setelahnya.");
    expect(source).not.toContain("Did/didn't ile dogru bicimi ve sonrasinda yalın fiili sec.");
    expect(source).not.toContain("Wybierz wlasciwa forme z did/didn't i podstawowa forma czasownika po nim.");
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.title[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
