/**
 * Lesson / celebration share text pools — RU / UK / ES branching and placeholders.
 */

import type { Lang } from '../constants/i18n';
import { buildCelebrationShareBody } from '../app/celebration_share_messages';
import { buildLessonShareMessage } from '../app/lesson_share';

const STORE = 'https://example.com/app';

describe('buildLessonShareMessage', () => {
  const lessonId = 7;
  const score = 92;

  const lessonCases: [Lang, RegExp][] = [
    ['ru', /Урок 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['uk', /Урок 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['es', /Lección 7[\s\S]*Phraseman[\s\S]*★ 92/u],
  ];

  for (const [lang, pattern] of lessonCases) {
    it(`lang ${lang} picks correct pool shape`, () => {
      const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
      try {
        const msg = buildLessonShareMessage(lang, lessonId, score, STORE);
        expect(msg).toContain(STORE);
        expect(msg).toMatch(pattern);
        expect(msg.split('\n')).toHaveLength(2);
      } finally {
        spy.mockRestore();
      }
    });
  }

  it('ES pool is exercised over random draws without Cyrillic lesson prefix', () => {
    let sawLessonWord = false;
    for (let i = 0; i < 80; i++) {
      jest.spyOn(Math, 'random').mockReturnValue((i % 997) / 997);
      const msg = buildLessonShareMessage('es', 3, 80, STORE);
      expect(msg.endsWith('\n' + STORE)).toBe(true);
      expect(msg).not.toMatch(/^Урок /m);
      if (msg.includes('Lección')) sawLessonWord = true;
      jest.restoreAllMocks();
    }
    expect(sawLessonWord).toBe(true);
  });
});

describe('buildCelebrationShareBody', () => {
  const medalCases: [Lang, RegExp][] = [
    ['ru', /Phraseman/u],
    ['uk', /Phraseman/u],
    ['es', /Phraseman/u],
  ];

  for (const [lang, hasBrand] of medalCases) {
    it(`medal kind lang=${lang} includes brand and lesson marker`, () => {
      const spy = jest.spyOn(Math, 'random').mockReturnValue(0.41);
      try {
        const body = buildCelebrationShareBody('medal', lang, 11, 95, {
          medalTier: 'gold',
        });
        expect(body).toMatch(hasBrand);
        expect(body).toMatch(/урок|Урок|Lección|Lesson|\d+/iu);
        if (lang === 'ru') expect(/[А-Яа-яЁё]/.test(body)).toBe(true);
        if (lang === 'uk') expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(body)).toBe(true);
        if (lang === 'es') expect(/[áéíóúñü¿¡]/i.test(body) || /Lecci[oó]n/i.test(body)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  }

  it('lesson_unlock inserts lesson id across locales', () => {
    for (let i = 0; i < 30; i++) {
      jest.spyOn(Math, 'random').mockReturnValue(((i + 3) % 11) / 11);
      for (const lang of ['ru', 'uk', 'es'] as const) {
        const b = buildCelebrationShareBody('lesson_unlock', lang, 9, 100, {
          unlockedLessonId: 12,
        });
        expect(b).toContain('12');
        expect(b).toMatch(/Phraseman/u);
      }
      jest.restoreAllMocks();
    }
  });
});
