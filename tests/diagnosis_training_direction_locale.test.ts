import fs from 'fs';
import path from 'path';
import { PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING } from '../app/diagnosis_training_preposition_direction_to_into_from';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('preposition direction diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_preposition_direction_to_into_from.ts'), 'utf8');

  it('does not use generic planned preposition fallback as final copy', () => {
    expect(source).not.toContain('DIRECTION_GENERIC_PLANNED');
    expect(source).toContain('DIRECTION_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Desenhe a seta do movimento e escolha a palavra pequena correta.');
    expect(source).not.toContain('Hãy vẽ mũi tên chuyển động rồi chọn từ nhỏ đúng.');
    expect(source).not.toContain('Gambar panah gerakannya lalu pilih kata kecil yang benar.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.title[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps explicit planned step translations while marking unresolved feedback for review', () => {
    const first = PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING.steps[0];
    expect(first.translation?.['pt-BR']).toBe('Eu vou ao trabalho todos os dias.');
    expect(first.translation?.vi).toBe('Tôi đi làm mỗi ngày.');
    expect(first.translation?.id).toBe('Saya pergi bekerja setiap hari.');
    expect(first.translation?.tr).toBe('Her gün işe giderim.');
    expect(first.translation?.pl).toBe('Chodzę do pracy codziennie.');

    for (const locale of PLANNED_LOCALES) {
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
    }
  });
});
