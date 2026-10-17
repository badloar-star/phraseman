/**
 * Lesson / celebration share text pools and placeholders.
 */

import type { Lang } from '../constants/i18n';
import { buildCelebrationShareBody } from '../app/celebration_share_messages';
import { buildLessonShareMessage } from '../app/lesson_share';
import { normalizeEol } from './helpers/read_source';

const STORE = 'https://example.com/app';

describe('buildLessonShareMessage', () => {
  const lessonId = 7;
  const score = 92;

  const lessonCases: [Lang, RegExp][] = [
    ['ru', /Урок 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['uk', /Урок 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['es', /Lección 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['pt-BR', /Lição 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['vi', /Bài 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['id', /Pelajaran 7[\s\S]*Phraseman[\s\S]*★ 92/u],
    ['tr', /Phraseman[\s\S]*Ders 7[\s\S]*★ 92/u],
    ['pl', /Lekcja 7[\s\S]*Phraseman[\s\S]*★ 92/u],
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

  it('does not route planned lesson share copy through RU/UK/ES runtime branches', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '..');
    const source = normalizeEol(fs.readFileSync(path.join(root, 'app', 'lesson_share.ts'), 'utf8'));
    const completeSource = normalizeEol(fs.readFileSync(path.join(root, 'app', 'lesson_complete.tsx'), 'utf8'));
    const legacyRuntimeRe = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimeRe);
    expect(source).toContain('const pools: Record<LangCode, readonly string[]>');
    expect(completeSource).not.toContain("lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru'");
    expect(completeSource).toMatch(/buildLessonShareMessage\(\s*lang,/);
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

  // зачем (17.10, открытие английского): en/pt-BR/vi/id/tr/pl получали русский текст «Поделиться» — теперь свои пулы
  it('en/pt-BR/vi/id/tr/pl share texts have no Cyrillic and keep brand + numbers (all four kinds, every variant)', () => {
    const langs = ['en', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const r of [0, 0.34, 0.67, 0.99]) {
      jest.spyOn(Math, 'random').mockReturnValue(r);
      for (const lang of langs) {
        const medal = buildCelebrationShareBody('medal', lang, 11, 95, { medalTier: 'gold' });
        const unlock = buildCelebrationShareBody('lesson_unlock', lang, 9, 100, { unlockedLessonId: 12 });
        const level = buildCelebrationShareBody('level_exam_unlock', lang, 9, 100, { cefrLevel: 'B1' });
        const lingman = buildCelebrationShareBody('lingman_exam_unlock', lang, 9, 100, {});
        for (const body of [medal, unlock, level, lingman]) {
          expect(body).toMatch(/Phraseman/u);
          expect(body).not.toMatch(/[Ѐ-ӿ]/u);
        }
        expect(medal).toContain('11');
        expect(medal).toContain('95');
        expect(unlock).toContain('12');
        expect(level).toContain('B1');
        expect(lingman).toContain('Lingman');
      }
      jest.restoreAllMocks();
    }
  });

  it('achievement share for en/pt-BR/vi/id/tr/pl: own text with the name, no Cyrillic', () => {
    const { buildAchievementShareMessage } = require('../app/achievement_share');
    for (const lang of ['en', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      const msg: string = buildAchievementShareMessage(lang, 'Streak 7', STORE);
      expect(msg).toContain('Streak 7');
      expect(msg.endsWith('\n' + STORE)).toBe(true);
      expect(msg).not.toMatch(/[Ѐ-ӿ]/u);
    }
  });

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
