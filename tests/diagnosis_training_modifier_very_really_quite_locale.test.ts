import fs from 'fs';
import path from 'path';
import { MODIFIER_VERY_REALLY_QUITE_TRAINING } from '../app/diagnosis_training_modifier_very_really_quite';

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('modifier very/really/quite diagnosis planned locale copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/diagnosis_training_modifier_very_really_quite.ts'), 'utf8');

  it('does not use generic very/really/quite planned fallback as final copy', () => {
    expect(source).not.toContain('VRQ_GENERIC_PLANNED');
    expect(source).toContain('VRQ_NEEDS_REVIEW_PLANNED');
    expect(source).not.toContain('Escolha very, really, quite ou too e verifique o tom.');
    expect(source).not.toContain('Chon very, really, quite hoac too va kiem tra sac thai.');
    expect(source).not.toContain('Pilih very, really, quite, atau too dan periksa nadanya.');
    expect(source).not.toContain('Very, really, quite veya too sec ve tonu kontrol et.');
    expect(source).not.toContain('Wybierz very, really, quite albo too i sprawdz ton.');
  });

  it('keeps planned top-level training copy explicit and not needs-review', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.title[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.shortTitle?.[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.shortDiagnosis[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.diagnosisText[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.mentalModel[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.coreRule?.[locale]).toBeTruthy();
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.title[locale]).not.toMatch(/^needs-review:/);
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.shortTitle?.[locale]).not.toMatch(/^needs-review:/);
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.diagnosisText[locale]).not.toMatch(/^needs-review:/);
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.mentalModel[locale]).not.toMatch(/^needs-review:/);
      expect(MODIFIER_VERY_REALLY_QUITE_TRAINING.coreRule?.[locale]).not.toMatch(/^needs-review:/);
    }
  });

  it('keeps unresolved step feedback marked for review instead of using RU/UK/ES or generic planned copy', () => {
    const first = MODIFIER_VERY_REALLY_QUITE_TRAINING.steps[0];

    for (const locale of PLANNED_LOCALES) {
      expect(first.translation?.[locale]).toMatch(/^needs-review:/);
      expect(first.fallbackExplanation[locale]).toMatch(/^needs-review:/);
      expect(first.correctFeedback[locale]).toMatch(/^needs-review:/);
    }
  });
});
