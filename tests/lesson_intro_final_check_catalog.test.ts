import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'shared', 'lesson_intro_final_checks.ts');
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

type LocalizedText = Record<(typeof LOCALES)[number], string>;
type CatalogModule = {
  getLessonIntroFinalCheck: (lessonId: number, studyTarget: string) => null | {
    checkId: string;
    contentVersion: number;
    studyTarget: 'en';
    lessonId: number;
    questions: readonly {
      id: string;
      kind: 'yes_no';
      prompt: LocalizedText;
      statement: string;
      correct: boolean;
      explanation: LocalizedText;
    }[];
  };
};

function loadCatalog(): CatalogModule {
  expect(fs.existsSync(CATALOG_PATH)).toBe(true);
  // The path is intentionally loaded only after the existence assertion so the
  // first RED run reports the missing feature, not a Jest module-resolution error.
  return require(CATALOG_PATH) as CatalogModule;
}

describe('lesson intro final-check catalog', () => {
  test('covers every ordinary English lesson with exactly three localized yes/no questions', () => {
    const { getLessonIntroFinalCheck } = loadCatalog();
    const checkIds = new Set<string>();
    const questionIds = new Set<string>();

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const check = getLessonIntroFinalCheck(lessonId, 'en');
      expect(check).not.toBeNull();
      expect(check).toMatchObject({
        studyTarget: 'en',
        lessonId,
      });
      expect(Number.isInteger(check!.contentVersion)).toBe(true);
      expect(check!.contentVersion).toBeGreaterThan(0);
      expect(check!.questions).toHaveLength(3);
      expect(checkIds.has(check!.checkId)).toBe(false);
      checkIds.add(check!.checkId);

      const answers = new Set<boolean>();
      for (const question of check!.questions) {
        expect(question.kind).toBe('yes_no');
        expect(typeof question.correct).toBe('boolean');
        expect(question.statement.trim()).not.toBe('');
        expect(questionIds.has(question.id)).toBe(false);
        questionIds.add(question.id);
        answers.add(question.correct);

        for (const locale of LOCALES) {
          expect(question.prompt[locale].trim()).not.toBe('');
          expect(question.explanation[locale].trim()).not.toBe('');
        }

        const visibleCopy = [
          ...Object.values(question.prompt),
          question.statement,
          ...Object.values(question.explanation),
        ].join(' ');
        expect(visibleCopy).not.toMatch(/\b(?:todo|tbd|undefined|null|lorem)\b/i);
        expect(visibleCopy).not.toMatch(/(?:спин(?:а)? не будет|не получишь спин|без спина)/i);
      }

      expect(answers).toEqual(new Set([true, false]));
    }

    expect(checkIds.size).toBe(32);
    expect(questionIds.size).toBe(96);
  });

  test('returns null for unsupported targets and lesson ids', () => {
    const { getLessonIntroFinalCheck } = loadCatalog();

    expect(getLessonIntroFinalCheck(1, 'fr')).toBeNull();
    expect(getLessonIntroFinalCheck(0, 'en')).toBeNull();
    expect(getLessonIntroFinalCheck(33, 'en')).toBeNull();
    expect(getLessonIntroFinalCheck(1.5, 'en')).toBeNull();
  });
});
