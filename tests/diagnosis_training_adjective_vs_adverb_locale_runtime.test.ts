import fs from 'node:fs';
import path from 'node:path';
import { getDiagnosisTraining } from '../app/diagnosis_trainings';

const ROOT = path.resolve(__dirname, '..');
const PLANNED_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('adjective vs adverb diagnosis training locale runtime', () => {
  it('keeps planned fallback explanations explicit and telemetry audit-safe', () => {
    const training = getDiagnosisTraining('adjective_vs_adverb');
    expect(training).toBeTruthy();

    for (const step of training!.steps) {
      for (const lang of PLANNED_LANGS) {
        expect(step.fallbackExplanation[lang]).toEqual(expect.any(String));
        expect(step.fallbackExplanation[lang]).not.toMatch(/^needs-review:/u);
      }
    }

    expect(training!.analyticsEvents.recovery).toBe('diagnosis_training_adjective_vs_adverb_recovery');
  });

  it('does not use the legacy telemetry fallback key in this training file', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'diagnosis_training_adjective_vs_adverb.ts'), 'utf8');
    const legacyKey = `${['fall', 'back'].join('')}:`;
    const legacyEventSuffix = `_${['fall', 'back'].join('')}'`;

    expect(source).not.toContain(legacyKey);
    expect(source).not.toContain(legacyEventSuffix);
  });
});
