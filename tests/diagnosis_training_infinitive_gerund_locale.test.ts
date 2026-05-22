import fs from 'fs';
import path from 'path';
import { INFINITIVE_VS_GERUND_BASIC_TRAINING } from '../app/diagnosis_training_infinitive_vs_gerund_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('infinitive vs gerund diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_infinitive_vs_gerund_basic.ts'), 'utf8');

  it('does not use generic infinitive/gerund planned fallback as final copy', () => {
    expect(source).not.toContain('INF_GER_GENERIC_PLANNED');
    expect(source).toContain('INF_GER_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a segunda acao: to + verbo base ou verbo com -ing.');
    expect(source).not.toContain('Chon hanh dong thu hai: to + dong tu goc hoac dong tu -ing.');
    expect(source).not.toContain('Pilih aksi kedua: to + kata kerja dasar atau kata kerja -ing.');
    expect(source).not.toContain('Ikinci eylemi sec: to + yalın fiil veya -ing fiil.');
    expect(source).not.toContain('Wybierz druga czynnosc: to + czasownik podstawowy albo czasownik z -ing.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(INFINITIVE_VS_GERUND_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = INFINITIVE_VS_GERUND_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
