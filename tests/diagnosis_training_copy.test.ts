import { getAllDiagnosisTrainings } from '../app/diagnosis_trainings';
import {
  DIAGNOSIS_COPY_FORBIDDEN_RU_UK,
  sanitizeDiagnosisCopy,
} from '../app/diagnosis_training_copy';

type Tri = { ru: string; uk: string; es: string };

function isTri(value: unknown): value is Tri {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as Tri).ru === 'string' &&
    typeof (value as Tri).uk === 'string' &&
    typeof (value as Tri).es === 'string',
  );
}

function collectLocalizedDisplayCopy(value: unknown, out: Array<{ path: string; text: Tri }>, path = 'training'): void {
  if (!value || typeof value !== 'object') return;
  if (isTri(value)) {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectLocalizedDisplayCopy(entry, out, `${path}[${index}]`));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (['sentence', 'options', 'answerOptions', 'correctAnswer', 'correctAnswerId', 'focusWords', 'contrastSet', 'smartTrainerConfig', 'analyticsEvents', 'routing'].includes(key)) {
      continue;
    }
    collectLocalizedDisplayCopy(entry, out, `${path}.${key}`);
  }
}

describe('diagnosis training learner-facing copy', () => {
  it('removes internal English grammar jargon from Russian and Ukrainian UI text', () => {
    const failures: string[] = [];

    for (const training of getAllDiagnosisTrainings()) {
      const items: Array<{ path: string; text: Tri }> = [];
      collectLocalizedDisplayCopy(training, items, training.id);

      for (const item of items) {
        for (const lang of ['ru', 'uk'] as const) {
          const normalized = sanitizeDiagnosisCopy(lang, item.text[lang]).toLowerCase();
          for (const term of DIAGNOSIS_COPY_FORBIDDEN_RU_UK) {
            const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (pattern.test(normalized)) {
              failures.push(`${item.path}.${lang}: ${term} -> ${normalized}`);
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
