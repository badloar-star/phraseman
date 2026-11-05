// Сторож (ночной выпуск 05.11, решение координатора): в данных нового классического курса fr/es/de/it нет названий уроков, а старые названия
// (английский курс / старая французская программа) не соответствуют содержимому. Пока нет заголовков нового курса — нейтральное «Урок N»; английский не меняется.
import { lessonNameForStudyTarget, lessonNamesForStudyTarget } from '../app/lesson_titles_for_study_target';
import { lessonNamesForLang } from '../constants/lessons';
import { FRENCH_LESSON_CURRICULUM } from '../app/french_lesson_curriculum';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const NUMBERED_TARGETS = ['fr', 'es', 'de', 'it'] as const;
const WORD: Readonly<Record<string, string>> = { ru: 'Урок', uk: 'Урок', en: 'Lesson', es: 'Lección', 'pt-BR': 'Lição', vi: 'Bài', id: 'Pelajaran', tr: 'Ders', pl: 'Lekcja' };

describe('fr/es/de/it: вместо старых названий — тема урока (запасной вариант «Урок N»)', () => {
  // зачем (Макеты 05.11: «Lesson 1 без темы»): название урока — тема из theory.json курса на языке интерфейса; «Урок N» только если темы нет
  it.each(NUMBERED_TARGETS)('%s: 32 названия на всех 9 языках интерфейса — это тема урока, не пустой номер', (target) => {
    for (const lang of LANGS) {
      const names = lessonNamesForStudyTarget(lang, target);
      expect(names).toHaveLength(32);
      names.forEach((name, index) => {
        expect(name.trim().length).toBeGreaterThan(0);
        expect(name).not.toBe(`${WORD[lang]} ${index + 1}`); // тема есть у каждого урока
        expect(lessonNameForStudyTarget(lang, target, index + 1)).toBe(name);
      });
    }
  });

  it.each(NUMBERED_TARGETS)('%s: ни одно старое английское/французское название не показывается', (target) => {
    for (const lang of LANGS) {
      const old = new Set<string>([...lessonNamesForLang(lang)]);
      for (const name of lessonNamesForStudyTarget(lang, target)) expect(old.has(name)).toBe(false);
    }
    // старая французская программа тоже не просачивается
    const frenchTitles = FRENCH_LESSON_CURRICULUM.map((entry) => entry.titleRU);
    for (const name of lessonNamesForStudyTarget('ru', 'fr')) expect(frenchTitles).not.toContain(name);
  });

  it('вне диапазона 1..32 названия нет', () => {
    expect(lessonNameForStudyTarget('ru', 'es', 0)).toBeUndefined();
    expect(lessonNameForStudyTarget('ru', 'de', 33)).toBeUndefined();
  });
});

describe('английский курс — названия прежние', () => {
  it.each(LANGS)('en-курс, язык интерфейса %s: те же названия, что и раньше', (lang) => {
    expect(lessonNamesForStudyTarget(lang, 'en')).toEqual(lessonNamesForLang(lang));
    expect(lessonNameForStudyTarget(lang, 'en', 10)).toBe(lessonNamesForLang(lang)[9]);
  });
});
