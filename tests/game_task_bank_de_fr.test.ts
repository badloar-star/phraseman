/**
 * Сторож банка заданий игр для немецкого и французского курсов, уроки 1–20 (D207).
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться
 * для режимов игры, без багов». Задания сверяются с фразами уроков: слова — только пройденные, верный ответ
 * один, произносимая фраза «На слух» — дословная фраза урока.
 * Сработал — чинить задание, а не ослаблять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { gameBankFor, type GameBank } from '../modules/games/bank';
import { FORMS_BANK_DE } from '../modules/games/bank/forms_de';
import { huntFixedLines, isValidHuntTask, isValidOrderTask } from '../modules/games/dialogue_core';
import { isValidOddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound, type QuizRound } from '../modules/games/quiz_core';

// зачем (12.11): банк продлён на уроки 9–12 — после урока 8 игры брали задания урока 8;
// затем на 13–16 (задача координатора ночного дежурства) — после урока 12 игры брали задания урока 12;
// затем на 17–20 (слово владельца 12.11 через сессию Elevate: «работа идёт дальше»)
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const GAP = '___';

type Lang = 'de' | 'fr';

/** Чего ждём от банка: с какого урока идёт «Собери диалог» и в каких колодах «Сортировки» карта с пропуском. */
const EXPECTED: Record<Lang, { orderLessons: readonly number[]; gapDecks: readonly number[]; forms: boolean }> = {
  // зачем: колоды «на ты одному / нескольким» (de 15) и «на ты / на вы» (fr 16) — целые просьбы без пропуска
  de: { orderLessons: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], gapDecks: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20], forms: true },
  fr: { orderLessons: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], gapDecks: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20], forms: false },
};

const tokens = (text: string): string[] =>
  text.toLowerCase().replace(/[?.,!]/g, ' ').split(/\s+/).filter((w) => w.length > 0 && w !== GAP);
const norm = (text: string): string => tokens(text).join(' ');

function lessonTargets(lang: Lang, lesson: number): string[] {
  const file = path.join(__dirname, '..', 'modules', 'classic-courses', lang, `lessons-${String(lesson).padStart(2, '0')}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { phrases: { target: string }[] };
  return data.phrases.map((p) => p.target);
}

interface Course {
  /** Фразы самого урока. */
  readonly own: Map<number, Set<string>>;
  /** Слова уроков 1..N. */
  readonly vocab: Map<number, Set<string>>;
  /** Фразы уроков 1..N. */
  readonly seenTargets: Map<number, Set<string>>;
  readonly allTargets: Set<string>;
}

function loadCourse(lang: Lang): Course {
  const own = new Map<number, Set<string>>();
  const vocab = new Map<number, Set<string>>();
  const seenTargets = new Map<number, Set<string>>();
  const words = new Set<string>();
  const targets = new Set<string>();
  for (const lesson of LESSONS) {
    const list = lessonTargets(lang, lesson);
    own.set(lesson, new Set(list.map(norm)));
    list.flatMap(tokens).forEach((w) => words.add(w));
    list.forEach((t) => targets.add(norm(t)));
    vocab.set(lesson, new Set(words));
    seenTargets.set(lesson, new Set(targets));
  }
  return { own, vocab, seenTargets, allTargets: targets };
}

const FORBIDDEN_TERMS = /инфинитив|артикл|спряжен|глагол|предлог|существительн|прилагательн|местоимен|наречи|залог|падеж|причасти|претерит/i;

describe.each(['de', 'fr'] as const)('банк заданий игр: %s', (lang) => {
  const bank = gameBankFor(lang) as GameBank;
  const course = loadCourse(lang);
  const expected = EXPECTED[lang];

  /** Слова фразы, которых ученик к уроку ещё не видел (пусто — фраза урока или только из пройденных слов). */
  const unseen = (lesson: number, phrase: string): string[] => {
    if (course.seenTargets.get(lesson)?.has(norm(phrase))) return [];
    const known = course.vocab.get(lesson) ?? new Set<string>();
    return tokens(phrase).filter((w) => !known.has(w));
  };

  const odd = LESSONS.flatMap((lesson) => (bank.oddWord?.[lesson] ?? []).map((task) => ({ lesson, task })));
  const exact = LESSONS.flatMap((lesson) => (bank.exact?.[lesson] ?? []).map((round) => ({ lesson, round })));
  const listen = LESSONS.flatMap((lesson) => (bank.listen?.[lesson] ?? []).map((round) => ({ lesson, round })));
  const memory = LESSONS.flatMap((lesson) => (bank.memory?.[lesson] ?? []).map((round) => ({ lesson, round })));
  const hunt = LESSONS.flatMap((lesson) => (bank.hunt?.[lesson] ?? []).map((task) => ({ lesson, task })));
  const order = LESSONS.flatMap((lesson) => (bank.order?.[lesson] ?? []).map((task) => ({ lesson, task })));

  it('реестр отдаёт банк языка; «Три формы» есть только там, где задуманы', () => {
    expect(bank).not.toBeNull();
    expect(Boolean(bank.forms?.length)).toBe(expected.forms);
  });

  it('по каждому уроку есть полный набор заданий', () => {
    for (const lesson of LESSONS) {
      expect([lesson, 'odd', bank.oddWord?.[lesson]?.length]).toEqual([lesson, 'odd', 8]);
      expect([lesson, 'sort', bank.sort?.[lesson]?.tasks.length]).toEqual([lesson, 'sort', 8]);
      expect([lesson, 'exact', bank.exact?.[lesson]?.length]).toEqual([lesson, 'exact', 6]);
      expect([lesson, 'listen', bank.listen?.[lesson]?.length]).toEqual([lesson, 'listen', 6]);
      expect([lesson, 'memory', bank.memory?.[lesson]?.length]).toEqual([lesson, 'memory', 2]);
      expect([lesson, 'hunt', bank.hunt?.[lesson]?.length]).toEqual([lesson, 'hunt', 2]);
    }
    expect(Object.keys(bank.order ?? {}).map(Number)).toEqual([...expected.orderLessons]);
    for (const lesson of expected.orderLessons) expect([lesson, 'order', bank.order?.[lesson]?.length]).toEqual([lesson, 'order', 2]);
  });

  it('id заданий нигде не повторяются и несут код языка', () => {
    const ids = [
      ...odd.map((x) => x.task.id),
      ...LESSONS.flatMap((l) => [bank.sort?.[l]?.id ?? '', ...(bank.sort?.[l]?.tasks ?? []).map((t) => t.id)]),
      ...[...exact, ...listen, ...memory].map((x) => x.round.id),
      ...[...hunt, ...order].map((x) => x.task.id),
      ...(bank.forms ?? []).map((r) => r.id),
    ];
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ids.filter((id) => !id.includes(`-${lang}-`))).toEqual([]);
  });

  describe('«Лишнее слово»', () => {
    it('каждое задание проходит isValidOddWordTask и несёт перевод с объяснением', () => {
      for (const { task } of odd) {
        expect([task.id, isValidOddWordTask(task)]).toEqual([task.id, true]);
        expect([task.id, task.translation.trim().length > 0 && task.whyText.trim().length > 0]).toEqual([task.id, true]);
        expect([task.id, task.whyTitle]).toEqual([task.id, `«${task.words[task.extraIndex].replace(/[?.,!]/g, '').trim()}» здесь лишнее`]);
      }
    });

    it('без лишнего слова остаётся фраза урока или фраза только из пройденных слов', () => {
      for (const { lesson, task } of odd) {
        const correct = task.words.filter((_, i) => i !== task.extraIndex).join(' ');
        expect([task.id, unseen(lesson, correct)]).toEqual([task.id, []]);
      }
    });

    it('лишнее слово ученик уже встречал, а фраза с ним — не фраза курса', () => {
      for (const { lesson, task } of odd) {
        expect([task.id, unseen(lesson, task.words[task.extraIndex])]).toEqual([task.id, []]);
        expect([task.id, course.allTargets.has(norm(task.words.join(' ')))]).toEqual([task.id, false]);
      }
    });

    it('убрав любое другое слово, нельзя получить ту же верную фразу или фразу курса', () => {
      for (const { task } of odd) {
        const correct = norm(task.words.filter((_, i) => i !== task.extraIndex).join(' '));
        task.words.forEach((_, j) => {
          if (j === task.extraIndex) return;
          const other = norm(task.words.filter((__, i) => i !== j).join(' '));
          expect([task.id, j, other === correct || course.allTargets.has(other)]).toEqual([task.id, j, false]);
        });
      }
    });

    it('лишнее слово не несёт знак «?» и не содержит апостроф', () => {
      // зачем: «?» должен остаться на фразе; слово с апострофом (n’est, l’heure) без соседа писалось бы иначе
      for (const { task } of odd) {
        expect([task.id, /[?’']/.test(task.words[task.extraIndex])]).toEqual([task.id, false]);
      }
    });

    it('знак «?» нигде не стал отдельным словом', () => {
      for (const { task } of odd) expect([task.id, task.words.includes('?')]).toEqual([task.id, false]);
      for (const { task } of hunt) expect([task.id, task.lines.some((l) => l.words.includes('?'))]).toEqual([task.id, false]);
    });
  });

  describe('«Сортировка»', () => {
    it('в каждой колоде обе корзины непустые и подписаны, карты не повторяются', () => {
      for (const lesson of LESSONS) {
        const deck = bank.sort?.[lesson];
        if (!deck) throw new Error(`нет колоды урока ${lesson}`);
        const left = deck.tasks.filter((t) => t.side === 'left').length;
        const right = deck.tasks.filter((t) => t.side === 'right').length;
        expect([deck.id, left > 0 && right > 0, left + right]).toEqual([deck.id, true, deck.tasks.length]);
        expect([deck.id, Boolean(deck.left.title.trim() && deck.right.title.trim() && deck.left.title !== deck.right.title)]).toEqual([deck.id, true]);
        const texts = deck.tasks.map((t) => norm(t.text));
        expect([deck.id, texts.filter((t, i) => texts.indexOf(t) !== i)]).toEqual([deck.id, []]);
      }
    });

    it('текст каждой карты — только пройденные слова, у карты есть подсказка', () => {
      for (const lesson of LESSONS) {
        for (const card of bank.sort?.[lesson]?.tasks ?? []) {
          expect([card.id, unseen(lesson, card.text)]).toEqual([card.id, []]);
          expect([card.id, card.hint.trim().length > 0]).toEqual([card.id, true]);
        }
      }
    });

    it('карта с пропуском заполняется названием своей корзины до фразы из пройденных слов', () => {
      for (const lesson of LESSONS) {
        const deck = bank.sort?.[lesson];
        if (!deck) throw new Error(`нет колоды урока ${lesson}`);
        const withGap = expected.gapDecks.includes(lesson);
        for (const card of deck.tasks) {
          expect([card.id, card.text.includes(GAP)]).toEqual([card.id, withGap]);
          if (!withGap) continue;
          const own = card.text.replace(GAP, deck[card.side].title);
          const foreign = card.text.replace(GAP, deck[card.side === 'left' ? 'right' : 'left'].title);
          expect([card.id, unseen(lesson, own)]).toEqual([card.id, []]);
          expect([card.id, course.allTargets.has(norm(foreign))]).toEqual([card.id, false]);
        }
      }
    });
  });

  describe('«Точное слово»', () => {
    const fill = (round: QuizRound, option: string): string =>
      round.prompt.kind === 'gap' ? `${round.prompt.before} ${option} ${round.prompt.after}` : '';

    it('каждое задание проходит isValidQuizRound, это пропуск с пояснением, варианты без дублей', () => {
      for (const { round } of exact) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind]).toEqual([round.id, true, 'gap']);
        expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
        expect([round.id, new Set(round.options.map(norm)).size]).toEqual([round.id, round.options.length]);
      }
    });

    it('с верным вариантом получается фраза урока или фраза только из пройденных слов', () => {
      for (const { lesson, round } of exact) {
        expect([round.id, unseen(lesson, fill(round, round.options[round.correctIndex]))]).toEqual([round.id, []]);
      }
    });

    it('неверные варианты — из знакомых слов и не дают фразу курса', () => {
      for (const { lesson, round } of exact) {
        round.options.forEach((option, i) => {
          if (i === round.correctIndex) return;
          expect([round.id, option, unseen(lesson, option)]).toEqual([round.id, option, []]);
          expect([round.id, option, course.allTargets.has(norm(fill(round, option)))]).toEqual([round.id, option, false]);
        });
      }
    });

    it('верный ответ не стоит всегда на одном месте', () => {
      for (const lesson of LESSONS) {
        expect([lesson, new Set((bank.exact?.[lesson] ?? []).map((r) => r.correctIndex)).size > 1]).toEqual([lesson, true]);
      }
    });
  });

  describe('«На слух»', () => {
    it('произносится дословная фраза урока, верный вариант равен ей, скорость обычная', () => {
      for (const { lesson, round } of listen) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'audio', 3]);
        if (round.prompt.kind !== 'audio') continue;
        expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, round.prompt.text]);
        expect([round.id, round.prompt.rate]).toEqual([round.id, 1]);
        expect([round.id, course.own.get(lesson)?.has(norm(round.prompt.text))]).toEqual([round.id, true]);
        expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
      }
    });

    it('неверные варианты отличаются ровно одним словом и собраны из пройденных слов', () => {
      for (const { lesson, round } of listen) {
        const spoken = tokens(round.options[round.correctIndex]);
        expect([round.id, new Set(round.options.map(norm)).size]).toEqual([round.id, round.options.length]);
        round.options.forEach((option, i) => {
          if (i === round.correctIndex) return;
          const other = tokens(option);
          const changed = other.length === spoken.length ? other.filter((w, k) => w !== spoken[k]).length : -1;
          expect([round.id, option, changed]).toEqual([round.id, option, 1]);
          expect([round.id, option, unseen(lesson, option)]).toEqual([round.id, option, []]);
          // вопрос остаётся вопросом: знак в конце не теряется и не появляется
          expect([round.id, option, option.trim().endsWith('?')]).toEqual([round.id, option, round.options[round.correctIndex].trim().endsWith('?')]);
        });
      }
    });

    it('верный ответ не стоит всегда на одном месте', () => {
      for (const lesson of LESSONS) {
        expect([lesson, new Set((bank.listen?.[lesson] ?? []).map((r) => r.correctIndex)).size > 1]).toEqual([lesson, true]);
      }
    });
  });

  describe('«Память»', () => {
    it('четыре разные пары из пройденных слов, вопрос про одну из них, три варианта перевода', () => {
      for (const { lesson, round } of memory) {
        expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'pairs', 3]);
        if (round.prompt.kind !== 'pairs') continue;
        const { pairs, askIndex } = round.prompt;
        expect([round.id, pairs.length]).toEqual([round.id, 4]);
        expect([round.id, new Set(pairs.map((p) => norm(p[0]))).size, new Set(pairs.map((p) => p[1].trim().toLowerCase())).size]).toEqual([round.id, 4, 4]);
        for (const [word, translation] of pairs) {
          expect([round.id, word, unseen(lesson, word)]).toEqual([round.id, word, []]);
          expect([round.id, word, translation.trim().length > 0]).toEqual([round.id, word, true]);
        }
        expect([round.id, round.options[round.correctIndex]]).toEqual([round.id, pairs[askIndex][1]]);
        expect([round.id, round.ask.includes(pairs[askIndex][0])]).toEqual([round.id, true]);
        // неверные варианты — переводы других пар того же набора
        const shown = new Set(pairs.map((p) => p[1]));
        expect([round.id, round.options.every((o) => shown.has(o))]).toEqual([round.id, true]);
      }
    });

    it('слова не повторяются между наборами одного языка', () => {
      const words = memory.flatMap(({ round }) => (round.prompt.kind === 'pairs' ? round.prompt.pairs.map((p) => norm(p[0])) : []));
      expect(words.filter((w, i) => words.indexOf(w) !== i)).toEqual([]);
    });
  });

  describe('«Охота на ошибку»', () => {
    it('три реплики, одна ошибка и одно слово-обманка в другой реплике', () => {
      for (const { task } of hunt) {
        expect([task.id, isValidHuntTask(task), task.lines.length]).toEqual([task.id, true, 3]);
        const tappable = task.lines.map((l) => l.tappable.length);
        expect([task.id, tappable.reduce((a, b) => a + b, 0), tappable[task.wrong.line]]).toEqual([task.id, 2, 1]);
        const wrongWord = task.lines[task.wrong.line].words[task.wrong.word];
        expect([task.id, norm(wrongWord) !== norm(task.fix)]).toEqual([task.id, true]);
        expect([task.id, Boolean(task.why.trim())]).toEqual([task.id, true]);
      }
    });

    it('после исправления каждая реплика — из пройденных слов, а с ошибкой реплика не фраза курса', () => {
      for (const { lesson, task } of hunt) {
        huntFixedLines(task).forEach((line, i) => {
          expect([task.id, i, unseen(lesson, line.words.join(' '))]).toEqual([task.id, i, []]);
        });
        const broken = task.lines[task.wrong.line];
        expect([task.id, course.allTargets.has(norm(broken.words.join(' ')))]).toEqual([task.id, false]);
        expect([task.id, unseen(lesson, broken.words[task.wrong.word])]).toEqual([task.id, []]);
      }
    });

    it('исправление не трогает слова с апострофом', () => {
      for (const { task } of hunt) {
        const wrongWord = task.lines[task.wrong.line].words[task.wrong.word];
        expect([task.id, /[’']/.test(`${wrongWord}${task.fix}`)]).toEqual([task.id, false]);
      }
    });
  });

  describe('«Собери диалог»', () => {
    it('четыре разные реплики из пройденных слов', () => {
      for (const { lesson, task } of order) {
        expect([task.id, isValidOrderTask(task), task.lines.length]).toEqual([task.id, true, 4]);
        task.lines.forEach((line, i) => {
          expect([task.id, i, unseen(lesson, line)]).toEqual([task.id, i, []]);
        });
      }
    });
  });

  it('в объяснениях и подсказках нет грамматических терминов', () => {
    const texts = [
      ...odd.flatMap(({ task }) => [task.whyTitle, task.whyText]),
      ...LESSONS.flatMap((l) => {
        const deck = bank.sort?.[l];
        return deck ? [deck.left.title, deck.right.title, deck.left.example, deck.right.example, ...deck.tasks.map((t) => t.hint)] : [];
      }),
      ...[...exact, ...listen].map(({ round }) => round.note ?? ''),
      ...hunt.map(({ task }) => task.why),
      ...(bank.forms ?? []).map((r) => r.note ?? ''),
    ];
    expect(texts.filter((t) => FORBIDDEN_TERMS.test(t))).toEqual([]);
  });
});

describe('«Три формы»: немецкий', () => {
  it('30 разных глаголов, каждое задание проходит isValidQuizRound', () => {
    expect(FORMS_BANK_DE.length).toBe(30);
    const bases = FORMS_BANK_DE.map((r) => (r.prompt.kind === 'forms' ? r.prompt.known[0] : ''));
    expect(bases.filter((b, i) => !b || bases.indexOf(b) !== i)).toEqual([]);
    for (const round of FORMS_BANK_DE) {
      expect([round.id, isValidQuizRound(round), round.prompt.kind, round.options.length]).toEqual([round.id, true, 'forms', 3]);
      expect([round.id, Boolean(round.note?.trim())]).toEqual([round.id, true]);
    }
  });

  it('вторая и третья формы совпадают с эталонной таблицей', () => {
    const TABLE: Record<string, readonly [string, string]> = {
      sein: ['war', 'gewesen'], gehen: ['ging', 'gegangen'], kommen: ['kam', 'gekommen'], sehen: ['sah', 'gesehen'],
      geben: ['gab', 'gegeben'], nehmen: ['nahm', 'genommen'], finden: ['fand', 'gefunden'], sprechen: ['sprach', 'gesprochen'],
      essen: ['aß', 'gegessen'], trinken: ['trank', 'getrunken'], lesen: ['las', 'gelesen'], schreiben: ['schrieb', 'geschrieben'],
      fahren: ['fuhr', 'gefahren'], schlafen: ['schlief', 'geschlafen'], helfen: ['half', 'geholfen'], treffen: ['traf', 'getroffen'],
      stehen: ['stand', 'gestanden'], liegen: ['lag', 'gelegen'], sitzen: ['saß', 'gesessen'], bleiben: ['blieb', 'geblieben'],
      tragen: ['trug', 'getragen'], laufen: ['lief', 'gelaufen'], rufen: ['rief', 'gerufen'], singen: ['sang', 'gesungen'],
      schwimmen: ['schwamm', 'geschwommen'], fliegen: ['flog', 'geflogen'], ziehen: ['zog', 'gezogen'],
      beginnen: ['begann', 'begonnen'], schließen: ['schloss', 'geschlossen'], halten: ['hielt', 'gehalten'],
    };
    for (const round of FORMS_BANK_DE) {
      const known = round.prompt.kind === 'forms' ? round.prompt.known : [];
      expect([round.id, known[1], round.options[round.correctIndex]]).toEqual([round.id, ...(TABLE[known[0]] ?? ['?', '?'])]);
    }
  });

  it('верный ответ не стоит всегда на одном месте', () => {
    expect(new Set(FORMS_BANK_DE.map((r) => r.correctIndex)).size).toBe(3);
  });
});
