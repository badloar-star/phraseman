// Сторож (классические курсы 04.11): данные EN/ES/FR/DE/IT превращаются в обычные LessonPhrase без потерь и работают
// через общие функции фраз (phrase_target_utils). Мастер-выключатель пока выключен — старый курс не заменяется.
import {
  CLASSIC_COURSES_RUNTIME_ENABLED,
  CLASSIC_COURSE_LANGS,
  CLASSIC_TTS_LOCALE,
  classicCourseActiveFor,
  getClassicLessonPhrases,
} from '../app/classic_course_phrases';
import { getLessonData } from '../app/lesson_data_all';
import { phraseAnswerAlternatives, phraseCanonicalAnswer, phraseHasStudyTargetContent, phraseWordRowsForStudyTarget } from '../app/phrase_target_utils';

const strip = (s: string) => s.replace(/[.!?¿¡,;:—–«»"“”]+/g, ' ').replace(/\s+/g, ' ').trim();

describe('классические курсы: адаптер данных', () => {
  it('мастер-выключатель пока выключен: старый курс не заменён, getLessonData без изменений', () => {
    expect(CLASSIC_COURSES_RUNTIME_ENABLED).toBe(false);
    expect(classicCourseActiveFor('fr')).toBe(false);
    expect(getLessonData(1, 'fr')).toEqual(getLessonData(1));
  });

  it('TTS только системный по языку курса', () => {
    expect(CLASSIC_TTS_LOCALE).toEqual({ en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' });
  });

  for (const lang of CLASSIC_COURSE_LANGS) {
    it(`${lang}: уроки загружаются, фразы полные, id уникальны, плитки собирают цель`, () => {
      const ids = new Set<string>();
      let lessons = 0;
      for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
        const phrases = getClassicLessonPhrases(lessonId, lang);
        if (phrases.length === 0) continue;
        lessons += 1;
        expect(phrases).toHaveLength(50);
        for (const phrase of phrases) {
          expect(ids.has(String(phrase.id))).toBe(false);
          ids.add(String(phrase.id));
          expect(phrase.classic?.lang).toBe(lang);
          expect(phrase.russian.length).toBeGreaterThan(0);
          expect(phraseHasStudyTargetContent(phrase, lang)).toBe(true);
          expect(phraseWordRowsForStudyTarget(phrase, lang).length).toBeGreaterThan(0);
          // плитки по порядку = цель без знаков препинания
          expect(strip(phraseCanonicalAnswer(phrase, lang))).toBe(strip(phrase.english));
          expect(Array.isArray(phraseAnswerAlternatives(phrase, lang))).toBe(true);
        }
      }
      // ES в данных — уроки 1–16 (старый перевод был только для них), остальные языки — все 32
      expect(lessons).toBeGreaterThanOrEqual(lang === 'es' ? 16 : 32);
    });
  }
});
