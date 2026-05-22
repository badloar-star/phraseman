import fs from 'fs';
import path from 'path';
import { PREPOSITION_DIRECTION_TRAINING } from '../app/diagnosis_training_preposition_direction';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('preposition direction diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_preposition_direction.ts'), 'utf8');

  it('does not use generic direction planned fallback as final copy', () => {
    expect(source).not.toContain('DIRECTION_GENERIC_PLANNED');
    expect(source).toContain('DIRECTION_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Desenhe a seta do movimento e escolha a palavra pequena correta.');
    expect(source).not.toContain('Hãy vẽ mũi tên chuyển động rồi chọn từ nhỏ đúng.');
    expect(source).not.toContain('Gambar panah gerakannya lalu pilih kata kecil yang benar.');
    expect(source).not.toContain('Hareket okunu çiz ve doğru küçük kelimeyi seç.');
    expect(source).not.toContain('Narysuj strzałkę ruchu i wybierz właściwe małe słowo.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PREPOSITION_DIRECTION_TRAINING.title[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_DIRECTION_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_DIRECTION_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_DIRECTION_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_DIRECTION_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PREPOSITION_DIRECTION_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
