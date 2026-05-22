import fs from 'fs';
import path from 'path';
import { IMPERATIVE_BASIC_TRAINING } from '../app/diagnosis_training_imperative_basic';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('imperative diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_imperative_basic.ts'), 'utf8');

  it('does not use generic imperative planned fallback as final copy', () => {
    expect(source).not.toContain('IMPERATIVE_GENERIC_PLANNED');
    expect(source).toContain('IMPERATIVE_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha a forma curta correta para comando, proibição, pedido ou sugestão.');
    expect(source).not.toContain('Hãy chọn dạng ngắn đúng cho mệnh lệnh, lệnh cấm, lời nhờ hoặc đề nghị.');
    expect(source).not.toContain('Pilih bentuk pendek yang benar untuk perintah, larangan, permintaan, atau ajakan.');
    expect(source).not.toContain('Komut, yasak, rica ya da birlikte öneri için doğru kısa biçimi seç.');
    expect(source).not.toContain('Wybierz właściwą krótką formę polecenia, zakazu, prośby albo wspólnej propozycji.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(IMPERATIVE_BASIC_TRAINING.title[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(IMPERATIVE_BASIC_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(IMPERATIVE_BASIC_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(IMPERATIVE_BASIC_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(IMPERATIVE_BASIC_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(IMPERATIVE_BASIC_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = IMPERATIVE_BASIC_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
