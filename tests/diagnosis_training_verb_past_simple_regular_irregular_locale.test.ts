import fs from 'fs';
import path from 'path';
import { VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING } from '../app/diagnosis_training_verb_past_simple_regular_irregular';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('past simple regular irregular diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_verb_past_simple_regular_irregular.ts'), 'utf8');

  it('does not use generic past-simple planned fallback as final copy', () => {
    expect(source).not.toContain('PAST_SIMPLE_GENERIC_PLANNED');
    expect(source).toContain('PAST_SIMPLE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma correta do passado: -ed ou uma forma irregular como went, saw, bought.');
    expect(source).not.toContain('Hay chon dang qua khu dung: -ed hoac dang bat quy tac nhu went, saw, bought.');
    expect(source).not.toContain('Pilih bentuk lampau yang benar: -ed atau bentuk tidak beraturan seperti went, saw, bought.');
    expect(source).not.toContain('Dogru gecmis zaman bicimini sec: -ed ya da went, saw, bought gibi duzensiz bicim.');
    expect(source).not.toContain('Wybierz wlasciwa forme przeszla: -ed albo nieregularna forme jak went, saw, bought.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.title[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
