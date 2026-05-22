import fs from 'fs';
import path from 'path';
import { PREPOSITION_COMMON_VERB_PATTERNS_TRAINING } from '../app/diagnosis_training_preposition_common_verb_patterns';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('preposition common verb patterns planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_preposition_common_verb_patterns.ts'), 'utf8');

  it('does not use generic planned verb-pattern fallback as final copy', () => {
    expect(source).not.toContain('VERB_PATTERN_GENERIC_PLANNED');
    expect(source).toContain('VERB_PATTERN_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Aprenda o verbo junto com a palavrinha como um bloco fixo.');
    expect(source).not.toContain('Hãy học động từ cùng từ nhỏ như một cụm cố định.');
    expect(source).not.toContain('Pelajari kata kerja bersama kata kecilnya sebagai satu chunk tetap.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.title[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PREPOSITION_COMMON_VERB_PATTERNS_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
