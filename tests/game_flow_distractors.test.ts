/**
 * «Поток»: свои неверные варианты отличаются от верного ровно одним словом, как в макете
 * («Он готовит ужин» / «Он готовил ужин»), и подключены в сборку раундов (D207).
 * Сработал — чинить вариант в банке, а не ослаблять проверку.
 */
import { getClassicLessonPhrases, type ClassicCourseLang } from '../app/classic_course_phrases';
import { FLOW_DISTRACTORS_DE } from '../modules/games/bank/flow_de';
import { FLOW_DISTRACTORS_EN } from '../modules/games/bank/flow_en';
import { FLOW_DISTRACTORS_ES } from '../modules/games/bank/flow_es';
import { FLOW_DISTRACTORS_FR } from '../modules/games/bank/flow_fr';
import { FLOW_DISTRACTORS_IT } from '../modules/games/bank/flow_it';
import { buildFlowRounds, flowDistractorsFor, flowTranslation, type FlowItem } from '../modules/games/flow_core';

const BANKS: readonly (readonly [ClassicCourseLang, typeof FLOW_DISTRACTORS_EN])[] = [
  ['en', FLOW_DISTRACTORS_EN], ['de', FLOW_DISTRACTORS_DE], ['fr', FLOW_DISTRACTORS_FR], ['es', FLOW_DISTRACTORS_ES], ['it', FLOW_DISTRACTORS_IT],
];
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];
/** У английского курса наборы есть и для уроков 9–12 (12.11), у остальных — 1–8. */
const lessonsOf = (lang: ClassicCourseLang): number[] => (lang === 'en' ? [...LESSONS, 9, 10, 11, 12] : LESSONS);
const MARKS = /[()]|Для сборки|При сборке|Для складання/u;

const words = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);
/** Слово без знаков — «ужин.» и «ужин» одно слово; регистр не важен. */
const bare = (word: string): string => word.toLowerCase().replace(/[.,!?¿¡;:«»"]/gu, '');

function lessonOf(id: string): number {
  const m = /:(\d{2})[.:]/.exec(id);
  return m ? Number(m[1]) : 0;
}

describe('банк своих вариантов «Потока»', () => {
  for (const [lang, bank] of BANKS) {
    for (const [ui, entries] of Object.entries(bank)) {
      it(`${lang}/${ui}: фраза есть в уроке, варианты отличаются от верного ровно одним словом`, () => {
        const problems: string[] = [];
        for (const [id, pair] of Object.entries(entries)) {
          const lesson = lessonOf(id);
          const phrase = getClassicLessonPhrases(lesson, lang).find((p) => String(p.id) === id);
          if (!phrase) { problems.push(`${id} · фразы нет в уроке ${lesson}`); continue; }
          const correct = flowTranslation(phrase, ui);
          const cw = words(correct);
          const keys = new Set([correct, ...pair].map((t) => t.trim().toLowerCase()));
          if (keys.size !== 3) problems.push(`${id} · варианты повторяются или совпали с верным`);
          for (const wrong of pair) {
            const ww = words(wrong);
            const diff = ww.length === cw.length ? ww.filter((w, i) => bare(w) !== bare(cw[i])).length : -1;
            if (diff !== 1) problems.push(`${id} · «${wrong}» отличается от «${correct}» не одним словом (${diff})`);
            if (ww.length === cw.length && ww.some((w, i) => w.replace(/[^.,!?]/gu, '') !== cw[i].replace(/[^.,!?]/gu, ''))) problems.push(`${id} · «${wrong}» — другие знаки, верный выдаётся по ним`);
            if (MARKS.test(wrong)) problems.push(`${id} · в варианте пометка урока`);
            if (Math.abs(wrong.length - correct.length) > 8) problems.push(`${id} · «${wrong}» заметно другой длины`);
          }
        }
        expect(problems).toEqual([]);
      });

      it(`${lang}/${ui}: на каждый урок с набором — не меньше шести фраз (на целую игру)`, () => {
        const perLesson = lessonsOf(lang).map((lesson) => [lesson, Object.keys(entries).filter((id) => lessonOf(id) === lesson).length]);
        for (const [lesson, n] of perLesson) expect([lesson, n >= 6]).toEqual([lesson, true]);
      });
    }
  }
});

describe('сборка раундов берёт свои варианты', () => {
  it('на всех пяти курсах фразы с набором идут первыми, варианты — ровно свой набор и верный перевод', () => {
    for (const [lang] of BANKS) {
      for (const lesson of lessonsOf(lang)) {
        const pool: FlowItem[] = getClassicLessonPhrases(lesson, lang).map((p) => ({
          id: `${lang}:${lesson}:${String(p.id)}`, en: p.english, translation: flowTranslation(p, 'ru'), distractors: flowDistractorsFor(lang, String(p.id), 'ru'),
        }));
        const rounds = buildFlowRounds(pool, 6, () => 0.42);
        expect([lang, lesson, rounds.length]).toEqual([lang, lesson, 6]);
        for (const round of rounds) {
          const own = round.item.distractors ?? [];
          expect([lang, lesson, round.item.id, own.length]).toEqual([lang, lesson, round.item.id, 2]);
          expect([...round.options].sort()).toEqual([round.item.translation, ...own].sort());
          expect(round.options[round.correctIndex]).toBe(round.item.translation);
        }
      }
    }
  });

  it('без набора и с негодным набором — прежние варианты из других фраз', () => {
    const pool: FlowItem[] = [
      { id: 'a', en: 'I am ready now', translation: 'Я готов.', distractors: ['Я готов.', 'Ты готов.'] },
      { id: 'b', en: 'She is busy today', translation: 'Она занята.' },
      { id: 'c', en: 'We are free now', translation: 'Мы свободны.', distractors: ['Только один'] },
    ];
    const rounds = buildFlowRounds(pool, 3, () => 0.3);
    for (const round of rounds) {
      expect([...round.options].sort()).toEqual(['Я готов.', 'Она занята.', 'Мы свободны.'].sort());
    }
  });

  it('у языка или интерфейса без банка своих вариантов нет', () => {
    expect(flowDistractorsFor('en', 'en-classic-r1:01.04', 'ru')).toEqual(['Она свободна.', 'Она здесь.']);
    expect(flowDistractorsFor('en', 'en-classic-r1:01.04', 'uk')).toBeUndefined();
    expect(flowDistractorsFor('xx', 'en-classic-r1:01.04', 'ru')).toBeUndefined();
    expect(flowDistractorsFor('en', 'toString', 'ru')).toBeUndefined();
  });
});
