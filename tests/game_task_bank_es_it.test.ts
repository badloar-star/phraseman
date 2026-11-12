/**
 * Сторож банка заданий игр (D207) для испанского и итальянского курсов, уроки 1–16: «Лишнее слово»,
 * «Сортировка», «Точное слово», «На слух», «Память», «Охота на ошибку», «Собери диалог».
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно
 * подбираться для режимов игры, без багов». Задания сверяются с фразами уроков курса.
 * Сработал — чинить задание, а не ослаблять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EXACT_BANK_ES } from '../modules/games/bank/exact_es';
import { EXACT_BANK_IT } from '../modules/games/bank/exact_it';
import { HUNT_BANK_ES } from '../modules/games/bank/hunt_es';
import { HUNT_BANK_IT } from '../modules/games/bank/hunt_it';
import { gameBankFor } from '../modules/games/bank/index';
import { LISTEN_BANK_ES } from '../modules/games/bank/listen_es';
import { LISTEN_BANK_IT } from '../modules/games/bank/listen_it';
import { MEMORY_BANK_ES } from '../modules/games/bank/memory_es';
import { MEMORY_BANK_IT } from '../modules/games/bank/memory_it';
import { ODD_WORD_BANK_ES } from '../modules/games/bank/odd_word_es';
import { ODD_WORD_BANK_IT } from '../modules/games/bank/odd_word_it';
import { ORDER_BANK_ES } from '../modules/games/bank/order_es';
import { ORDER_BANK_IT } from '../modules/games/bank/order_it';
import { SORT_BANK_ES } from '../modules/games/bank/sort_es';
import { SORT_BANK_IT } from '../modules/games/bank/sort_it';
import { huntFixedLines, isValidHuntTask, isValidOrderTask } from '../modules/games/dialogue_core';
import { isValidOddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound } from '../modules/games/quiz_core';

// зачем (12.11.2026): банк расширен на уроки 9–12, затем 13–16 — сторож проверяет их теми же правилами
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
/** «Собери диалог» начинается с урока 3: в уроках 1–2 ещё нет вопросов, порядок реплик не однозначен. */
const ORDER_LESSONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
const GAP = '___';

const BANKS = {
  es: { oddWord: ODD_WORD_BANK_ES, sort: SORT_BANK_ES, exact: EXACT_BANK_ES, listen: LISTEN_BANK_ES, memory: MEMORY_BANK_ES, hunt: HUNT_BANK_ES, order: ORDER_BANK_ES, gapDecks: [3, 6, 7, 8, 12, 13, 15, 16] },
  it: { oddWord: ODD_WORD_BANK_IT, sort: SORT_BANK_IT, exact: EXACT_BANK_IT, listen: LISTEN_BANK_IT, memory: MEMORY_BANK_IT, hunt: HUNT_BANK_IT, order: ORDER_BANK_IT, gapDecks: [3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15] },
} as const;
type Lang = keyof typeof BANKS;
const LANGS: readonly Lang[] = ['es', 'it'];

const tokens = (text: string): string[] =>
  text.toLowerCase().replace(/[¿?¡!.,]/g, ' ').split(/\s+/).filter((w) => w.length > 0 && w !== GAP);
const norm = (text: string): string => tokens(text).join(' ');

function lessonTargets(lang: Lang, lesson: number): string[] {
  const file = path.join(__dirname, '..', 'modules', 'classic-courses', lang, `lessons-${String(lesson).padStart(2, '0')}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { phrases: { target: string }[] };
  return data.phrases.map((p) => p.target);
}

interface Course {
  readonly targetsByLesson: Map<number, Set<string>>;
  readonly seenByLesson: Map<number, Set<string>>;
  readonly allTargets: Set<string>;
}

function loadCourse(lang: Lang): Course {
  const targetsByLesson = new Map<number, Set<string>>();
  const seenByLesson = new Map<number, Set<string>>();
  const allTargets = new Set<string>();
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    const targets = lessonTargets(lang, lesson);
    targetsByLesson.set(lesson, new Set(targets.map(norm)));
    targets.flatMap(tokens).forEach((w) => seen.add(w));
    seenByLesson.set(lesson, new Set(seen));
    targets.forEach((t) => allTargets.add(norm(t)));
  }
  return { targetsByLesson, seenByLesson, allTargets };
}

const COURSES: Record<Lang, Course> = { es: loadCourse('es'), it: loadCourse('it') };

/** Слова, которых ученик к этому уроку ещё не встречал (уроки 1..N). */
const wordsNeverSeen = (lang: Lang, lesson: number, text: string): string[] =>
  tokens(text).filter((w) => !COURSES[lang].seenByLesson.get(lesson)?.has(w));
const isCoursePhrase = (lang: Lang, text: string): boolean => COURSES[lang].allTargets.has(norm(text));

const FORBIDDEN_TERMS = /инфинитив|артикл|спряжен|глагол|предлог|существительн|прилагательн|местоимен|наречи|залог|множественн|единственн/i;

describe.each(LANGS)('банк заданий игр, язык %s', (lang) => {
  const bank = BANKS[lang];

  describe('покрытие и реестр', () => {
    it('по каждому уроку есть нужное число заданий каждой игры', () => {
      for (const lesson of LESSONS) {
        expect([lesson, bank.oddWord[lesson]?.length]).toEqual([lesson, 8]);
        expect([lesson, bank.sort[lesson]?.tasks.length]).toEqual([lesson, 8]);
        expect([lesson, bank.exact[lesson]?.length]).toEqual([lesson, 6]);
        expect([lesson, bank.listen[lesson]?.length]).toEqual([lesson, 6]);
        expect([lesson, bank.memory[lesson]?.length]).toEqual([lesson, 2]);
        expect([lesson, bank.hunt[lesson]?.length]).toEqual([lesson, 2]);
      }
      for (const lesson of ORDER_LESSONS) expect([lesson, bank.order[lesson]?.length]).toEqual([lesson, 2]);
      for (const game of [bank.oddWord, bank.sort, bank.exact, bank.listen, bank.memory, bank.hunt]) {
        expect(Object.keys(game).map(Number)).toEqual([...LESSONS]);
      }
      expect(Object.keys(bank.order).map(Number)).toEqual([...ORDER_LESSONS]);
    });

    it('id заданий нигде не повторяются', () => {
      const ids = [
        ...LESSONS.flatMap((l) => bank.oddWord[l].map((t) => t.id)),
        ...LESSONS.flatMap((l) => [bank.sort[l].id, ...bank.sort[l].tasks.map((t) => t.id)]),
        ...LESSONS.flatMap((l) => [...bank.exact[l], ...bank.listen[l], ...bank.memory[l], ...bank.hunt[l]].map((t) => t.id)),
        ...ORDER_LESSONS.flatMap((l) => bank.order[l].map((t) => t.id)),
      ];
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
      expect(ids.filter((id) => !id.includes(`-${lang}-`))).toEqual([]);
    });

    it('реестр отдаёт именно этот банк, а игры «Три формы» у языка нет', () => {
      const registered = gameBankFor(lang);
      expect(registered?.oddWord).toBe(bank.oddWord);
      expect(registered?.sort).toBe(bank.sort);
      expect(registered?.exact).toBe(bank.exact);
      expect(registered?.listen).toBe(bank.listen);
      expect(registered?.memory).toBe(bank.memory);
      expect(registered?.hunt).toBe(bank.hunt);
      expect(registered?.order).toBe(bank.order);
      expect(registered?.forms).toBeUndefined();
    });
  });

  describe('«Лишнее слово»', () => {
    const all = LESSONS.flatMap((lesson) => bank.oddWord[lesson].map((task) => ({ lesson, task })));

    it('каждое задание проходит isValidOddWordTask и несёт перевод с объяснением', () => {
      for (const { task } of all) {
        expect([task.id, isValidOddWordTask(task)]).toEqual([task.id, true]);
        expect([task.id, task.translation.trim().length > 0 && task.whyText.trim().length > 0]).toEqual([task.id, true]);
        expect([task.id, task.whyTitle]).toEqual([task.id, `«${task.words[task.extraIndex].replace(/[¿?¡!.,]/g, '')}» здесь лишнее`]);
      }
    });

    it('без лишнего слова остаётся фраза из слов этого и прошлых уроков', () => {
      for (const { lesson, task } of all) {
        const correct = task.words.filter((_, i) => i !== task.extraIndex).join(' ');
        expect([task.id, wordsNeverSeen(lang, lesson, correct)]).toEqual([task.id, []]);
      }
    });

    it('лишнее слово ученик уже встречал, а фраза с ним — не фраза курса', () => {
      for (const { lesson, task } of all) {
        expect([task.id, wordsNeverSeen(lang, lesson, task.words[task.extraIndex])]).toEqual([task.id, []]);
        expect([task.id, isCoursePhrase(lang, task.words.join(' '))]).toEqual([task.id, false]);
      }
    });

    it('убрав любое другое слово, нельзя получить ту же верную фразу или фразу курса', () => {
      for (const { task } of all) {
        const correct = norm(task.words.filter((_, i) => i !== task.extraIndex).join(' '));
        task.words.forEach((_, j) => {
          if (j === task.extraIndex) return;
          const other = norm(task.words.filter((__, i) => i !== j).join(' '));
          expect([task.id, j, other === correct || isCoursePhrase(lang, other)]).toEqual([task.id, j, false]);
        });
      }
    });

    it('лишнее слово не несёт знаков вопроса и не повторяет соседнее', () => {
      for (const { task } of all) {
        const neighbours = [task.words[task.extraIndex - 1], task.words[task.extraIndex + 1]].filter((w): w is string => Boolean(w)).map(norm);
        expect([task.id, /[¿?]/.test(task.words[task.extraIndex])]).toEqual([task.id, false]);
        // зачем: «la la» или «es es» решались бы нажатием на любое из двух одинаковых слов
        expect([task.id, neighbours.includes(norm(task.words[task.extraIndex]))]).toEqual([task.id, false]);
      }
    });
  });

  describe('«Сортировка»', () => {
    it('в каждой колоде обе корзины непустые и подписаны, карты не повторяются', () => {
      for (const lesson of LESSONS) {
        const deck = bank.sort[lesson];
        const left = deck.tasks.filter((t) => t.side === 'left').length;
        const right = deck.tasks.filter((t) => t.side === 'right').length;
        expect([deck.id, left > 0 && right > 0, left + right]).toEqual([deck.id, true, deck.tasks.length]);
        expect([deck.id, Boolean(deck.left.title.trim() && deck.right.title.trim() && deck.left.title !== deck.right.title)]).toEqual([deck.id, true]);
        const texts = deck.tasks.map((t) => norm(t.text));
        expect([deck.id, texts.filter((t, i) => texts.indexOf(t) !== i)]).toEqual([deck.id, []]);
      }
    });

    it('текст каждой карты — только знакомые слова, у карты есть подсказка', () => {
      for (const lesson of LESSONS) {
        for (const card of bank.sort[lesson].tasks) {
          expect([card.id, wordsNeverSeen(lang, lesson, card.text)]).toEqual([card.id, []]);
          expect([card.id, card.hint.trim().length > 0]).toEqual([card.id, true]);
        }
      }
    });

    it('пропуск бывает только в колодах, где корзины названы словами, и заполняется своей корзиной', () => {
      for (const lesson of LESSONS) {
        const deck = bank.sort[lesson];
        const withGap = (bank.gapDecks as readonly number[]).includes(lesson);
        for (const card of deck.tasks) {
          expect([card.id, card.text.includes(GAP)]).toEqual([card.id, withGap]);
          if (!withGap) continue;
          const own = card.text.replace(GAP, deck[card.side].title);
          const foreign = card.text.replace(GAP, deck[card.side === 'left' ? 'right' : 'left'].title);
          expect([card.id, wordsNeverSeen(lang, lesson, own)]).toEqual([card.id, []]);
          expect([card.id, isCoursePhrase(lang, foreign)]).toEqual([card.id, false]);
        }
      }
    });
  });

  describe('«Точное слово»', () => {
    const all = LESSONS.flatMap((lesson) => bank.exact[lesson].map((round) => ({ lesson, round })));
    const fill = (round: (typeof all)[number]['round'], option: string): string =>
      round.prompt.kind === 'gap' ? `${round.prompt.before} ${option} ${round.prompt.after}` : '';

    it('каждое задание проходит isValidQuizRound, это пропуск с пояснением, варианты без дублей', () => {
      for (const { round } of all) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind]).toEqual([round.id, true, 'gap']);
        expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
        expect([round.id, new Set(round.options.map(norm)).size]).toEqual([round.id, round.options.length]);
      }
    });

    it('с верным вариантом получается фраза из слов этого и прошлых уроков', () => {
      for (const { lesson, round } of all) {
        expect([round.id, wordsNeverSeen(lang, lesson, fill(round, round.options[round.correctIndex]))]).toEqual([round.id, []]);
      }
    });

    it('неверные варианты — из знакомых слов и не дают фразу курса', () => {
      for (const { lesson, round } of all) {
        round.options.forEach((option, i) => {
          if (i === round.correctIndex) return;
          expect([round.id, option, wordsNeverSeen(lang, lesson, option)]).toEqual([round.id, option, []]);
          expect([round.id, option, isCoursePhrase(lang, fill(round, option))]).toEqual([round.id, option, false]);
        });
      }
    });

    it('верный ответ не стоит всегда на одном месте', () => {
      for (const lesson of LESSONS) {
        expect([lesson, new Set(bank.exact[lesson].map((r) => r.correctIndex)).size > 1]).toEqual([lesson, true]);
      }
    });
  });

  describe('«На слух»', () => {
    const all = LESSONS.flatMap((lesson) => bank.listen[lesson].map((round) => ({ lesson, round })));

    it('произносится фраза своего урока, верный вариант дословно равен ей', () => {
      for (const { lesson, round } of all) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'audio', 3]);
        if (round.prompt.kind !== 'audio') continue;
        expect([round.id, round.prompt.rate]).toEqual([round.id, 1]);
        expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, round.prompt.text]);
        expect([round.id, COURSES[lang].targetsByLesson.get(lesson)?.has(norm(round.prompt.text))]).toEqual([round.id, true]);
        expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
      }
    });

    it('неверные варианты отличаются ровно одним словом и собраны из знакомых слов', () => {
      for (const { lesson, round } of all) {
        if (round.prompt.kind !== 'audio') continue;
        const heard = tokens(round.prompt.text);
        round.options.forEach((option, i) => {
          if (i === round.correctIndex) return;
          const words = tokens(option);
          const differing = words.length === heard.length ? words.filter((w, k) => w !== heard[k]).length : -1;
          expect([round.id, option, differing]).toEqual([round.id, option, 1]);
          expect([round.id, option, wordsNeverSeen(lang, lesson, option)]).toEqual([round.id, option, []]);
        });
        expect([round.id, new Set(round.options.map(norm)).size]).toEqual([round.id, 3]);
      }
    });

    it('верный ответ не стоит всегда на одном месте', () => {
      for (const lesson of LESSONS) {
        expect([lesson, new Set(bank.listen[lesson].map((r) => r.correctIndex)).size > 1]).toEqual([lesson, true]);
      }
    });
  });

  describe('«Память»', () => {
    const all = LESSONS.flatMap((lesson) => bank.memory[lesson].map((round) => ({ lesson, round })));

    it('четыре разные пары из знакомых слов, вопрос про одну из них', () => {
      for (const { lesson, round } of all) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind]).toEqual([round.id, true, 'pairs']);
        if (round.prompt.kind !== 'pairs') continue;
        const { pairs, askIndex } = round.prompt;
        expect([round.id, pairs.length]).toEqual([round.id, 4]);
        expect([round.id, new Set(pairs.map(([word]) => norm(word))).size, new Set(pairs.map(([, ru]) => ru.trim().toLowerCase())).size]).toEqual([round.id, 4, 4]);
        for (const [word, ru] of pairs) {
          expect([round.id, word, wordsNeverSeen(lang, lesson, word)]).toEqual([round.id, word, []]);
          expect([round.id, word, ru.trim().length > 0]).toEqual([round.id, word, true]);
        }
        expect([round.id, round.ask.includes(pairs[askIndex][0])]).toEqual([round.id, true]);
      }
    });

    it('верный вариант — перевод спрошенной пары, неверные — переводы других пар', () => {
      for (const { round } of all) {
        if (round.prompt.kind !== 'pairs') continue;
        const { pairs, askIndex } = round.prompt;
        const translations = pairs.map(([, ru]) => ru);
        expect([round.id, round.options.length, round.options[round.correctIndex]]).toEqual([round.id, 3, pairs[askIndex][1]]);
        expect([round.id, round.options.filter((o) => !translations.includes(o))]).toEqual([round.id, []]);
        expect([round.id, new Set(round.options).size]).toEqual([round.id, 3]);
      }
    });
  });

  describe('«Охота на ошибку»', () => {
    const all = LESSONS.flatMap((lesson) => bank.hunt[lesson].map((task) => ({ lesson, task })));

    it('три реплики, одна ошибка и одна обманка в другой реплике', () => {
      for (const { task } of all) {
        expect([task.id, isValidHuntTask(task), task.lines.length]).toEqual([task.id, true, 3]);
        const tappable = task.lines.flatMap((line, i) => line.tappable.map((word) => ({ line: i, word })));
        expect([task.id, tappable.length]).toEqual([task.id, 2]);
        expect([task.id, tappable.filter((t) => t.line !== task.wrong.line).length]).toEqual([task.id, 1]);
        expect([task.id, task.why.trim().length > 0]).toEqual([task.id, true]);
      }
    });

    it('после исправления все реплики — из знакомых слов, а ошибка действительно меняет слово', () => {
      for (const { lesson, task } of all) {
        const wrongWord = task.lines[task.wrong.line].words[task.wrong.word];
        expect([task.id, norm(wrongWord) === norm(task.fix)]).toEqual([task.id, false]);
        expect([task.id, wordsNeverSeen(lang, lesson, wrongWord)]).toEqual([task.id, []]);
        expect([task.id, isCoursePhrase(lang, task.lines[task.wrong.line].words.join(' '))]).toEqual([task.id, false]);
        for (const line of huntFixedLines(task)) {
          expect([task.id, wordsNeverSeen(lang, lesson, line.words.join(' '))]).toEqual([task.id, []]);
        }
      }
    });
  });

  describe('«Собери диалог»', () => {
    const all = ORDER_LESSONS.flatMap((lesson) => bank.order[lesson].map((task) => ({ lesson, task })));

    it('четыре разные реплики из знакомых слов, диалог начинается с вопроса и кончается ответом', () => {
      for (const { lesson, task } of all) {
        expect([task.id, isValidOrderTask(task), task.lines.length]).toEqual([task.id, true, 4]);
        for (const line of task.lines) expect([task.id, line, wordsNeverSeen(lang, lesson, line)]).toEqual([task.id, line, []]);
        expect([task.id, task.lines.map((line) => line.trim().endsWith('?'))]).toEqual([task.id, [true, false, true, false]]);
      }
    });

    it('третья реплика короче первой или ссылается на уже названного — первой она стоять не может', () => {
      // зачем: порядок держится на том, что второй вопрос не называет заново, о ком речь
      for (const { task } of all) {
        const [first, , third] = task.lines;
        const firstWords = tokens(first);
        const thirdWords = tokens(third);
        const repeatsSubject = firstWords.length > 1 && thirdWords.slice(0, 2).join(' ') === firstWords.slice(0, 2).join(' ');
        expect([task.id, repeatsSubject]).toEqual([task.id, false]);
      }
    });
  });

  describe('тексты для ученика', () => {
    it('в объяснениях и подсказках нет грамматических терминов', () => {
      const texts = [
        ...LESSONS.flatMap((l) => bank.oddWord[l].flatMap((t) => [t.whyTitle, t.whyText])),
        ...LESSONS.flatMap((l) => [bank.sort[l].left.title, bank.sort[l].right.title, bank.sort[l].left.example, bank.sort[l].right.example, ...bank.sort[l].tasks.map((t) => t.hint)]),
        ...LESSONS.flatMap((l) => [...bank.exact[l], ...bank.listen[l]].map((r) => r.note ?? '')),
        ...LESSONS.flatMap((l) => bank.hunt[l].map((t) => t.why)),
      ];
      expect(texts.filter((t) => FORBIDDEN_TERMS.test(t))).toEqual([]);
    });
  });
});
