import { readFileSync } from 'fs';
import { join } from 'path';

import { FRENCH_LESSON_CURRICULUM, frenchLessonTitle } from '../app/french_lesson_curriculum';
import { lessonNamesForStudyTarget } from '../app/lesson_titles_for_study_target';
import type { Lang } from '../constants/i18n';

const source = readFileSync(join(__dirname, '..', 'app', 'lesson_titles_for_study_target.ts'), 'utf8');
const frenchCurriculumSource = readFileSync(join(__dirname, '..', 'app', 'french_lesson_curriculum.ts'), 'utf8');
const rankChangeSource = readFileSync(join(__dirname, '..', 'app', 'rank_change.ts'), 'utf8');

const plannedLangs: Lang[] = ['pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('lesson titles for study target planned locale runtime copy', () => {
  it('does not use Russian lesson titles as the French curriculum fallback', () => {
    expect(source).not.toContain('?? entry.titleRU');
    expect(frenchCurriculumSource).not.toContain("sourceLocale === 'uk'");
    expect(frenchCurriculumSource).not.toContain('return entry.titleRU');
    expect(source).toContain('missingFrenchLessonTitle');
    expect(source).not.toContain('needs-review:');
    expect(rankChangeSource).not.toContain('fallback');
  });

  it('has explicit French lesson titles for planned locales', () => {
    for (const lang of plannedLangs) {
      const titles = lessonNamesForStudyTarget(lang, 'fr');
      expect(titles).toHaveLength(FRENCH_LESSON_CURRICULUM.length);
      expect(titles.every((title) => title && !title.startsWith('needs-review'))).toBe(true);
      expect(titles.some((title) => /[А-Яа-яЁёІіЇїЄє]/u.test(title))).toBe(false);
    }
  });

  it('keeps every French curriculum entry covered for planned locales', () => {
    for (const entry of FRENCH_LESSON_CURRICULUM) {
      for (const lang of plannedLangs) {
        expect(frenchLessonTitle(entry.id, lang)).toBeTruthy();
      }
    }
  });
});
