import fs from 'fs';
import path from 'path';
import { PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING } from '../app/diagnosis_training_present_perfect_vs_past_simple';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('present perfect vs past simple diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_present_perfect_vs_past_simple.ts'), 'utf8');

  it('does not use generic present-perfect-vs-past planned fallback as final copy', () => {
    expect(source).not.toContain('PP_VS_PAST_GENERIC_PLANNED');
    expect(source).toContain('PP_VS_PAST_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha entre Present Perfect e Past Simple: resultado agora ou tempo passado terminado.');
    expect(source).not.toContain('Hay chon giua Present Perfect va Past Simple: ket qua hien tai hay thoi diem qua khu da ket thuc.');
    expect(source).not.toContain('Pilih antara Present Perfect dan Past Simple: hasil sekarang atau waktu lampau yang selesai.');
    expect(source).not.toContain('Present Perfect ile Past Simple arasindan sec: simdiki sonuc mu, bitmis gecmis zaman mi.');
    expect(source).not.toContain('Wybierz miedzy Present Perfect a Past Simple: rezultat teraz czy zakonczony czas w przeszlosci.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.title[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
