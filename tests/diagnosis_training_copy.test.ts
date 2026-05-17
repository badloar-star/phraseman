import fs from 'fs';
import path from 'path';
import { getAllDiagnosisTrainings } from '../app/diagnosis_trainings';
import {
  DIAGNOSIS_COPY_FORBIDDEN_RU_UK,
  sanitizeDiagnosisCopy,
} from '../app/diagnosis_training_copy';
import { getVisibleIntroLearningBlocks } from '../app/personal_training_intro_blocks';

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

  it('does not mix Russian and Ukrainian learner-facing language labels', () => {
    const failures: string[] = [];
    const mixedLanguagePair =
      /(?:\u0440\u0443\u0441\u0441\u043a\w*\s+(?:\u0438|\u0438\u043b\u0438|\/)\s+\u0443\u043a\u0440\u0430\u0438\u043d\w*|\u0443\u043a\u0440\u0430[\u0438\u0457]\u043d\w*\s+(?:\u0438|\u0438\u043b\u0438|\/)\s+\u0440\u0443\u0441\u0441\u043a\w*|\u0440\u043e\u0441\u0456\u0439\w*\s+(?:\u0456|\u0430\u0431\u043e|\/)\s+\u0443\u043a\u0440\u0430\u0457\u043d\w*|\u0443\u043a\u0440\u0430\u0457\u043d\w*\s+(?:\u0456|\u0430\u0431\u043e|\/)\s+\u0440\u043e\u0441\u0456\u0439\w*|russian\s*(?:\/|or|and)\s*ukrainian|ukrainian\s*(?:\/|or|and)\s*russian)/i;

    for (const training of getAllDiagnosisTrainings()) {
      const items: Array<{ path: string; text: Tri }> = [];
      collectLocalizedDisplayCopy(training, items, training.id);

      for (const item of items) {
        if (mixedLanguagePair.test(item.text.ru)) {
          failures.push(`${item.path}.ru: ${item.text.ru}`);
        }
        if (mixedLanguagePair.test(item.text.uk)) {
          failures.push(`${item.path}.uk: ${item.text.uk}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps duplicate diagnosis intro blocks out of the visible intro guide', () => {
    const failures: string[] = [];

    for (const training of getAllDiagnosisTrainings()) {
      const visibleBlocks = getVisibleIntroLearningBlocks(training);
      visibleBlocks.forEach((block, index) => {
        if ('type' in block && block.type === 'diagnosis') {
          failures.push(`${training.id}.visibleIntroBlocks[${index}]`);
        }
      });
    }

    expect(failures).toEqual([]);
  });

  it('keeps the visible intro guide compact', () => {
    const failures: string[] = [];

    for (const training of getAllDiagnosisTrainings()) {
      const visibleBlocks = getVisibleIntroLearningBlocks(training);
      if (visibleBlocks.length > 3) {
        failures.push(`${training.id}: ${visibleBlocks.length} visible intro blocks`);
      }

      visibleBlocks.forEach((block, index) => {
        const text = 'text' in block ? block.text : block;
        for (const lang of ['ru', 'uk', 'es'] as const) {
          if (text[lang].length > 260) {
            failures.push(`${training.id}.visibleIntroBlocks[${index}].${lang}: ${text[lang].length} chars`);
          }
        }
      });
    }

    expect(failures).toEqual([]);
  });

  it('keeps the problem coach intro from rendering duplicate diagnosis copy', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/problem_coach.tsx'), 'utf8');

    expect(source).not.toContain('copy(diagnosisTraining.shortDiagnosis)');
    expect(source).not.toContain('diagnosisTraining.introBlocks.map');
    expect(source).toContain('getVisibleIntroLearningBlocks(diagnosisTraining)');
  });
});
