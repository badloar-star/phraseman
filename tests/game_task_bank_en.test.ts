/**
 * Сторож банка заданий игр (D207): задания «Лишнего слова», «Сортировки», «Точного слова» и «Трёх форм»
 * сверяются с фразами английского классического курса, уроки 1–12 (9–12 добавлены 12.11).
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Сработал — чинить задание, а не ослаблять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EXACT_BANK_EN } from '../modules/games/bank/exact_en';
import { FORMS_BANK_EN } from '../modules/games/bank/forms_en';
import { HUNT_BANK_EN } from '../modules/games/bank/hunt_en';
import { GAME_BANKS } from '../modules/games/bank/index';
import { LISTEN_BANK_EN } from '../modules/games/bank/listen_en';
import { MEMORY_BANK_EN } from '../modules/games/bank/memory_en';
import { ODD_WORD_BANK_EN } from '../modules/games/bank/odd_word_en';
import { ORDER_BANK_EN } from '../modules/games/bank/order_en';
import { SORT_BANK_EN } from '../modules/games/bank/sort_en';
import { huntFixedLines, isHuntHit, isValidHuntTask, isValidOrderTask } from '../modules/games/dialogue_core';
import { isValidOddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound } from '../modules/games/quiz_core';

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
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

describe('банк заданий игр: уроки 1–12 покрыты', () => {
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
    for (const lesson of [4, 5, 8, 9]) {
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

const wordsOutsideCourseSoFar = wordsNeverSeen;

describe('«На слух»', () => {
  const all = LESSONS.flatMap((lesson) => (LISTEN_BANK_EN[lesson] ?? []).map((round) => ({ lesson, round })));

  it('по 6 заданий на урок, каждое проходит isValidQuizRound: звук, обычная скорость, три варианта, перевод', () => {
    for (const lesson of LESSONS) expect([lesson, LISTEN_BANK_EN[lesson]?.length]).toEqual([lesson, 6]);
    for (const { round } of all) {
      expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'audio', 3]);
      expect([round.id, round.prompt.kind === 'audio' ? round.prompt.rate : 0]).toEqual([round.id, 1]);
      expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
    }
  });

  it('произносится дословная фраза урока, она же верный вариант', () => {
    for (const { lesson, round } of all) {
      const text = round.prompt.kind === 'audio' ? round.prompt.text : '';
      expect([round.id, targetsByLesson.get(lesson)?.has(norm(text))]).toEqual([round.id, true]);
      expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, text]);
    }
  });

  it('неверный вариант отличается ровно одним словом и собран из знакомых слов', () => {
    for (const { lesson, round } of all) {
      const said = tokens(round.options[round.correctIndex]);
      round.options.forEach((option, i) => {
        if (i === round.correctIndex) return;
        const other = tokens(option);
        const differs = other.length === said.length ? other.filter((w, k) => w !== said[k]).length : -1;
        expect([round.id, option, differs]).toEqual([round.id, option, 1]);
        expect([round.id, option, wordsOutsideCourseSoFar(lesson, option)]).toEqual([round.id, option, []]);
        // зачем: вопрос остаётся вопросом и в неверном варианте — иначе ответ выдаёт знак, а не слух
        expect([round.id, option, option.endsWith('?')]).toEqual([round.id, option, round.options[round.correctIndex].endsWith('?')]);
      });
    }
  });

  it('верный ответ не стоит всегда на одном месте', () => {
    for (const lesson of LESSONS) expect([lesson, new Set(LISTEN_BANK_EN[lesson].map((r) => r.correctIndex)).size]).toEqual([lesson, 3]);
  });
});

describe('«Память»', () => {
  const all = LESSONS.flatMap((lesson) => (MEMORY_BANK_EN[lesson] ?? []).map((round) => ({ lesson, round })));

  it('по 2 раунда на урок, в каждом 4 пары и 3 варианта, раунд проходит isValidQuizRound', () => {
    for (const lesson of LESSONS) expect([lesson, MEMORY_BANK_EN[lesson]?.length]).toEqual([lesson, 2]);
    for (const { round } of all) {
      expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'pairs', 3]);
      expect([round.id, round.prompt.kind === 'pairs' ? round.prompt.pairs.length : 0]).toEqual([round.id, 4]);
    }
  });

  it('слово пары — из фраз урока; слова и переводы в наборе не повторяются', () => {
    for (const { lesson, round } of all) {
      if (round.prompt.kind !== 'pairs') continue;
      for (const [word, translation] of round.prompt.pairs) {
        expect([round.id, word, tokens(word).filter((w) => !vocabByLesson.get(lesson)?.has(w))]).toEqual([round.id, word, []]);
        expect([round.id, word, translation.trim().length > 0]).toEqual([round.id, word, true]);
      }
      expect([round.id, new Set(round.prompt.pairs.map(([w]) => norm(w))).size]).toEqual([round.id, 4]);
      expect([round.id, new Set(round.prompt.pairs.map(([, t]) => norm(t))).size]).toEqual([round.id, 4]);
    }
  });

  it('верный вариант — перевод спрошенной пары, неверные — переводы других пар набора, вопрос называет слово', () => {
    for (const { round } of all) {
      if (round.prompt.kind !== 'pairs') continue;
      const { pairs, askIndex } = round.prompt;
      expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, pairs[askIndex][1]]);
      expect([round.id, round.ask]).toEqual([round.id, `Что значит «${pairs[askIndex][0]}»?`]);
      const translations = pairs.map(([, t]) => t);
      expect([round.id, round.options.filter((o) => !translations.includes(o))]).toEqual([round.id, []]);
    }
  });

  it('два раунда урока учат разные слова', () => {
    for (const lesson of LESSONS) {
      const words = MEMORY_BANK_EN[lesson].flatMap((r) => (r.prompt.kind === 'pairs' ? r.prompt.pairs.map(([w]) => norm(w)) : []));
      expect([lesson, new Set(words).size]).toEqual([lesson, 8]);
    }
  });
});

describe('«Охота на ошибку»', () => {
  const all = LESSONS.flatMap((lesson) => (HUNT_BANK_EN[lesson] ?? []).map((task) => ({ lesson, task })));

  it('по 2 диалога на урок из 3 реплик, каждый проходит isValidHuntTask и несёт объяснение', () => {
    for (const lesson of LESSONS) expect([lesson, HUNT_BANK_EN[lesson]?.length]).toEqual([lesson, 2]);
    for (const { task } of all) {
      expect([task.id, isValidHuntTask(task), task.lines.length]).toEqual([task.id, true, 3]);
      expect([task.id, task.why.trim().length > 0]).toEqual([task.id, true]);
    }
  });

  it('после исправления каждая реплика — из слов пройденных уроков, а реплика с ошибкой — нет', () => {
    for (const { lesson, task } of all) {
      for (const line of huntFixedLines(task)) {
        expect([task.id, wordsOutsideCourseSoFar(lesson, line.words.join(' '))]).toEqual([task.id, []]);
      }
      const wrongWord = task.lines[task.wrong.line].words[task.wrong.word];
      expect([task.id, norm(wrongWord) === norm(task.fix)]).toEqual([task.id, false]);
      expect([task.id, allTargets.has(norm(task.lines[task.wrong.line].words.join(' ')))]).toEqual([task.id, false]);
    }
  });

  it('нажимаемых слов два: ошибка и одна обманка в другой реплике', () => {
    for (const { task } of all) {
      const tappable = task.lines.flatMap((line, i) => line.tappable.map((word) => ({ line: i, word })));
      expect([task.id, tappable.length]).toEqual([task.id, 2]);
      const decoy = tappable.find((t) => !isHuntHit(task, t.line, t.word));
      expect([task.id, decoy !== undefined && decoy.line !== task.wrong.line]).toEqual([task.id, true]);
    }
  });

  it('реплики чередуются: слева, справа, слева', () => {
    for (const { task } of all) expect([task.id, task.lines.map((l) => l.right)]).toEqual([task.id, [false, true, false]]);
  });
});

describe('«Собери диалог»', () => {
  const ORDER_LESSONS = LESSONS.filter((lesson) => lesson >= 2);
  const all = ORDER_LESSONS.flatMap((lesson) => (ORDER_BANK_EN[lesson] ?? []).map((task) => ({ lesson, task })));

  it('по 2 диалога из 4 реплик на уроки 2–8, каждый проходит isValidOrderTask', () => {
    // зачем: в уроке 1 одни утверждения — однозначный порядок собрать не из чего; урок 1 в банк не входит намеренно
    expect(Object.keys(ORDER_BANK_EN).map(Number)).toEqual([...ORDER_LESSONS]);
    for (const lesson of ORDER_LESSONS) expect([lesson, ORDER_BANK_EN[lesson]?.length]).toEqual([lesson, 2]);
    for (const { task } of all) expect([task.id, isValidOrderTask(task), task.lines.length]).toEqual([task.id, true, 4]);
  });

  it('реплики — только из слов пройденных уроков', () => {
    for (const { lesson, task } of all) {
      for (const line of task.lines) expect([task.id, line, wordsOutsideCourseSoFar(lesson, line)]).toEqual([task.id, line, []]);
    }
  });

  it('порядок держит схема: вопрос с названным предметом, ответ, вопрос с it/he/she/they, ответ', () => {
    const PRONOUNS = new Set(['it', 'he', 'she', 'they']);
    for (const { task } of all) {
      const [q1, a1, q2, a2] = task.lines;
      expect([task.id, q1.endsWith('?'), a1.endsWith('?'), q2.endsWith('?'), a2.endsWith('?')]).toEqual([task.id, true, false, true, false]);
      expect([task.id, 'первый вопрос называет предмет', tokens(q1).some((w) => PRONOUNS.has(w))]).toEqual([task.id, 'первый вопрос называет предмет', false]);
      expect([task.id, 'второй вопрос ссылается на первый', tokens(q2).some((w) => PRONOUNS.has(w))]).toEqual([task.id, 'второй вопрос ссылается на первый', true]);
    }
  });
});

describe('реестр банков: английский', () => {
  it('четыре игры второй очереди подключены банками, а не примерами из макета', () => {
    const en = GAME_BANKS.en;
    expect(en.listen).toBe(LISTEN_BANK_EN);
    expect(en.memory).toBe(MEMORY_BANK_EN);
    expect(en.hunt).toBe(HUNT_BANK_EN);
    // зачем (владелец 11.11, «Скрыть на уроке 1»): пример из макета на урок 1 не возвращать — в нём слова, которых ученик ещё не видел
    expect(en.order).toBe(ORDER_BANK_EN);
    expect(en.order?.[1]).toBeUndefined();
  });

  it('id заданий второй очереди не повторяются', () => {
    const ids = [
      ...LESSONS.flatMap((l) => LISTEN_BANK_EN[l].map((t) => t.id)),
      ...LESSONS.flatMap((l) => MEMORY_BANK_EN[l].map((t) => t.id)),
      ...LESSONS.flatMap((l) => HUNT_BANK_EN[l].map((t) => t.id)),
      ...LESSONS.flatMap((l) => (ORDER_BANK_EN[l] ?? []).map((t) => t.id)),
    ];
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('тексты для ученика', () => {
  it('в объяснениях «Охоты на ошибку» нет грамматических терминов', () => {
    expect(LESSONS.flatMap((l) => HUNT_BANK_EN[l].map((t) => t.why)).filter((t) => FORBIDDEN_TERMS.test(t))).toEqual([]);
  });

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
