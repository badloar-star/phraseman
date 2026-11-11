/**
 * Сторож банка заданий игр (D207): задания «Лишнего слова», «Сортировки», «Точного слова» и «Трёх форм»
 * сверяются с фразами английского классического курса, уроки 1–8.
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Сработал — чинить задание, а не ослаблять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EXACT_BANK_EN } from '../modules/games/bank/exact_en';
import { FORMS_BANK_EN } from '../modules/games/bank/forms_en';
import { ODD_WORD_BANK_EN } from '../modules/games/bank/odd_word_en';
import { SORT_BANK_EN } from '../modules/games/bank/sort_en';
import { isValidOddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound } from '../modules/games/quiz_core';

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const GAP = '___';

const tokens = (text: string): string[] =>
  text.toLowerCase().replace(/[?.,!]/g, ' ').split(/\s+/).filter((w) => w.length > 0 && w !== GAP);
const norm = (text: string): string => tokens(text).join(' ');

function lessonTargets(lesson: number): string[] {
  const file = path.join(__dirname, '..', 'modules', 'classic-courses', 'en', `lessons-${String(lesson).padStart(2, '0')}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { phrases: { target: string }[] };
  return data.phrases.map((p) => p.target);
}

const targetsByLesson = new Map<number, Set<string>>();
const vocabByLesson = new Map<number, Set<string>>();
const cumulativeVocab = new Map<number, Set<string>>();
const allTargets = new Set<string>();
{
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    const targets = lessonTargets(lesson);
    targetsByLesson.set(lesson, new Set(targets.map(norm)));
    const vocab = new Set(targets.flatMap(tokens));
    vocabByLesson.set(lesson, vocab);
    vocab.forEach((w) => seen.add(w));
    cumulativeVocab.set(lesson, new Set(seen));
    targets.forEach((t) => allTargets.add(norm(t)));
  }
}

/** Фраза — это фраза урока либо собрана только из слов этого урока. */
function wordsOutsideLesson(lesson: number, phrase: string): string[] {
  if (targetsByLesson.get(lesson)?.has(norm(phrase))) return [];
  const vocab = vocabByLesson.get(lesson) ?? new Set<string>();
  return tokens(phrase).filter((w) => !vocab.has(w));
}
const wordsNeverSeen = (lesson: number, text: string): string[] =>
  tokens(text).filter((w) => !cumulativeVocab.get(lesson)?.has(w));

const FORBIDDEN_TERMS = /инфинитив|артикл|спряжен|глагол|предлог|существительн|прилагательн|местоимен|наречи|залог/i;

describe('банк заданий игр: уроки 1–8 покрыты', () => {
  it('по каждому уроку есть 8 «Лишних слов», колода из 8 карт и 6 «Точных слов»', () => {
    for (const lesson of LESSONS) {
      expect([lesson, ODD_WORD_BANK_EN[lesson]?.length]).toEqual([lesson, 8]);
      expect([lesson, SORT_BANK_EN[lesson]?.tasks.length]).toEqual([lesson, 8]);
      expect([lesson, EXACT_BANK_EN[lesson]?.length]).toEqual([lesson, 6]);
    }
    expect(Object.keys(ODD_WORD_BANK_EN).map(Number)).toEqual([...LESSONS]);
    expect(Object.keys(SORT_BANK_EN).map(Number)).toEqual([...LESSONS]);
    expect(Object.keys(EXACT_BANK_EN).map(Number)).toEqual([...LESSONS]);
  });

  it('id заданий нигде не повторяются', () => {
    const ids = [
      ...LESSONS.flatMap((l) => ODD_WORD_BANK_EN[l].map((t) => t.id)),
      ...LESSONS.flatMap((l) => [SORT_BANK_EN[l].id, ...SORT_BANK_EN[l].tasks.map((t) => t.id)]),
      ...LESSONS.flatMap((l) => EXACT_BANK_EN[l].map((t) => t.id)),
      ...FORMS_BANK_EN.map((t) => t.id),
    ];
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('«Лишнее слово»', () => {
  const all = LESSONS.flatMap((lesson) => ODD_WORD_BANK_EN[lesson].map((task) => ({ lesson, task })));

  it('каждое задание проходит isValidOddWordTask и несёт перевод с объяснением', () => {
    for (const { task } of all) {
      expect([task.id, isValidOddWordTask(task)]).toEqual([task.id, true]);
      expect([task.id, task.translation.trim().length > 0 && task.whyText.trim().length > 0]).toEqual([task.id, true]);
      expect([task.id, task.whyTitle]).toEqual([task.id, `«${task.words[task.extraIndex].replace(/[?.,!]/g, '')}» здесь лишнее`]);
    }
  });

  it('без лишнего слова остаётся фраза урока или фраза только из слов урока', () => {
    for (const { lesson, task } of all) {
      const correct = task.words.filter((_, i) => i !== task.extraIndex).join(' ');
      expect([task.id, wordsOutsideLesson(lesson, correct)]).toEqual([task.id, []]);
    }
  });

  it('лишнее слово ученик уже встречал, а фраза с ним — не фраза курса', () => {
    for (const { lesson, task } of all) {
      expect([task.id, wordsNeverSeen(lesson, task.words[task.extraIndex])]).toEqual([task.id, []]);
      expect([task.id, allTargets.has(norm(task.words.join(' ')))]).toEqual([task.id, false]);
    }
  });

  it('убрав любое другое слово, нельзя получить ту же верную фразу или фразу курса', () => {
    for (const { task } of all) {
      const correct = norm(task.words.filter((_, i) => i !== task.extraIndex).join(' '));
      task.words.forEach((_, j) => {
        if (j === task.extraIndex) return;
        const other = norm(task.words.filter((__, i) => i !== j).join(' '));
        expect([task.id, j, other === correct || allTargets.has(other)]).toEqual([task.id, j, false]);
      });
    }
  });

  it('лишнее слово не стоит последним в вопросе — знак «?» остаётся на фразе', () => {
    for (const { task } of all) {
      expect([task.id, /[?]/.test(task.words[task.extraIndex])]).toEqual([task.id, false]);
    }
  });
});

describe('«Сортировка»', () => {
  it('в каждой колоде обе корзины непустые и подписаны, карты не повторяются', () => {
    for (const lesson of LESSONS) {
      const deck = SORT_BANK_EN[lesson];
      const left = deck.tasks.filter((t) => t.side === 'left').length;
      const right = deck.tasks.filter((t) => t.side === 'right').length;
      expect([deck.id, left > 0 && right > 0, left + right]).toEqual([deck.id, true, deck.tasks.length]);
      expect([deck.id, Boolean(deck.left.title.trim() && deck.right.title.trim() && deck.left.title !== deck.right.title)]).toEqual([deck.id, true]);
      const texts = deck.tasks.map((t) => norm(t.text));
      expect([deck.id, texts.filter((t, i) => texts.indexOf(t) !== i)]).toEqual([deck.id, []]);
    }
  });

  it('текст каждой карты — только слова урока, у карты есть подсказка', () => {
    for (const lesson of LESSONS) {
      for (const card of SORT_BANK_EN[lesson].tasks) {
        expect([card.id, wordsOutsideLesson(lesson, card.text)]).toEqual([card.id, []]);
        expect([card.id, card.hint.trim().length > 0]).toEqual([card.id, true]);
      }
    }
  });

  it('карта с пропуском заполняется названием своей корзины до фразы из слов урока', () => {
    // зачем: колоды уроков 4, 5 и 8 называют корзины самими словами (do not / does not, Do / Does, at / on)
    for (const lesson of [4, 5, 8]) {
      const deck = SORT_BANK_EN[lesson];
      for (const card of deck.tasks) {
        expect([card.id, card.text.includes(GAP)]).toEqual([card.id, true]);
        const own = card.text.replace(GAP, deck[card.side].title);
        const foreign = card.text.replace(GAP, deck[card.side === 'left' ? 'right' : 'left'].title);
        expect([card.id, wordsOutsideLesson(lesson, own)]).toEqual([card.id, []]);
        expect([card.id, allTargets.has(norm(foreign))]).toEqual([card.id, false]);
      }
    }
  });
});

describe('«Точное слово»', () => {
  const all = LESSONS.flatMap((lesson) => EXACT_BANK_EN[lesson].map((round) => ({ lesson, round })));
  const fill = (round: (typeof all)[number]['round'], option: string): string =>
    round.prompt.kind === 'gap' ? `${round.prompt.before} ${option} ${round.prompt.after}` : '';

  it('каждое задание проходит isValidQuizRound, это пропуск с пояснением, варианты без дублей', () => {
    for (const { round } of all) {
      expect([round.id, isValidQuizRound(round), round.prompt.kind]).toEqual([round.id, true, 'gap']);
      expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
      expect([round.id, new Set(round.options.map(norm)).size]).toEqual([round.id, round.options.length]);
    }
  });

  it('с верным вариантом получается фраза урока или фраза только из слов урока', () => {
    for (const { lesson, round } of all) {
      expect([round.id, wordsOutsideLesson(lesson, fill(round, round.options[round.correctIndex]))]).toEqual([round.id, []]);
    }
  });

  it('неверные варианты — из знакомых слов и не дают фразу курса', () => {
    for (const { lesson, round } of all) {
      round.options.forEach((option, i) => {
        if (i === round.correctIndex) return;
        expect([round.id, option, wordsNeverSeen(lesson, option)]).toEqual([round.id, option, []]);
        expect([round.id, option, allTargets.has(norm(fill(round, option)))]).toEqual([round.id, option, false]);
      });
    }
  });

  it('верный ответ не стоит всегда на одном месте', () => {
    for (const lesson of LESSONS) {
      expect([lesson, new Set(EXACT_BANK_EN[lesson].map((r) => r.correctIndex)).size > 1]).toEqual([lesson, true]);
    }
  });
});

describe('«Три формы»', () => {
  it('30 разных глаголов, каждое задание проходит isValidQuizRound', () => {
    expect(FORMS_BANK_EN.length).toBe(30);
    const bases = FORMS_BANK_EN.map((r) => (r.prompt.kind === 'forms' ? r.prompt.known[0] : ''));
    expect(bases.filter((b, i) => !b || bases.indexOf(b) !== i)).toEqual([]);
    for (const round of FORMS_BANK_EN) {
      expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'forms', 3]);
      expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
    }
  });

  it('верная форма совпадает с эталонной таблицей', () => {
    const THIRD: Record<string, string> = {
      be: 'been', have: 'had', do: 'done', say: 'said', go: 'gone', make: 'made', know: 'known', think: 'thought',
      take: 'taken', see: 'seen', come: 'come', find: 'found', give: 'given', tell: 'told', feel: 'felt', leave: 'left',
      keep: 'kept', begin: 'begun', write: 'written', run: 'run', bring: 'brought', buy: 'bought', speak: 'spoken',
      eat: 'eaten', drink: 'drunk', pay: 'paid', meet: 'met', hear: 'heard', send: 'sent', break: 'broken',
    };
    for (const round of FORMS_BANK_EN) {
      const base = round.prompt.kind === 'forms' ? round.prompt.known[0] : '';
      expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, THIRD[base]]);
    }
  });
});

describe('тексты для ученика', () => {
  it('в объяснениях и подсказках нет грамматических терминов', () => {
    const texts = [
      ...LESSONS.flatMap((l) => ODD_WORD_BANK_EN[l].flatMap((t) => [t.whyTitle, t.whyText])),
      ...LESSONS.flatMap((l) => [SORT_BANK_EN[l].left.title, SORT_BANK_EN[l].right.title, SORT_BANK_EN[l].left.example, SORT_BANK_EN[l].right.example, ...SORT_BANK_EN[l].tasks.map((t) => t.hint)]),
      ...LESSONS.flatMap((l) => EXACT_BANK_EN[l].map((r) => r.note ?? '')),
      ...FORMS_BANK_EN.map((r) => r.note ?? ''),
    ];
    expect(texts.filter((t) => FORBIDDEN_TERMS.test(t))).toEqual([]);
  });
});
