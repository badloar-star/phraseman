// зачем (координатор 05.11, проверка 1cdcbafd6): в списке уроков es/fr/de/it темы на es/pt-BR/vi/id/tr/pl были английской копией.
// Переводы — в источнике scripts/data/classic_lesson_topics_i18n.json (генератор scripts/gen_classic_lesson_topics.cjs).
// Сторож: ни одна тема ни одного курса не показывает английский текст пользователю с другим языком интерфейса.
import { CLASSIC_LESSON_TOPICS } from '../app/classic_lesson_topics.gen';

const UI_LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const NON_EN = UI_LOCALES.filter((l) => l !== 'en');

describe('classic lesson topics: no English copies in 9 interface languages', () => {
  for (const [course, lessons] of Object.entries(CLASSIC_LESSON_TOPICS)) {
    it(`${course}: every lesson topic exists in all 9 languages and only en is English`, () => {
      const problems: string[] = [];
      for (const [lesson, titles] of Object.entries(lessons)) {
        for (const locale of UI_LOCALES) {
          if (!titles[locale]?.trim()) problems.push(`${course} ${lesson} ${locale}: пусто`);
        }
        for (const locale of NON_EN) {
          if (titles[locale] && titles[locale] === titles.en) problems.push(`${course} ${lesson} ${locale}: английская копия «${titles.en}»`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
