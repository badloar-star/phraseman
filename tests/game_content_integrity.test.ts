/**
 * Сквозная проверка заданий всех игр для всех языков обучения — только данные и правила, без экранов.
 * зачем: владелец 11.11.2026 — «все механики должны точно правильно работать». Перебор идёт по тому же пути,
 * каким задания получают экраны (`task_source.ts` → реестр `bank/index.ts`), поэтому ловит и ошибку в банке,
 * и ошибку подбора. Каждая находка — строка «язык · урок · игра · id · что не так»; тест печатает их все разом.
 * Сработал — чинить задание или правило, а не ослаблять проверку.
 */
import { getClassicLessonPhrases, type ClassicCourseLang } from '../app/classic_course_phrases';
import { GAME_BANKS, gameBankFor, type GameBank } from '../modules/games/bank/index';
import { isValidHuntTask, isValidOrderTask, type HuntTask, type OrderTask } from '../modules/games/dialogue_core';
import { FLOW_DEFAULT_ROUNDS, FLOW_OPTIONS, buildFlowRounds, canStartFlow, type FlowItem } from '../modules/games/flow_core';
import { isValidOddWordTask, type OddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound, type QuizKind, type QuizRound } from '../modules/games/quiz_core';
import type { SortDeck } from '../modules/games/sort_core';
import {
  dailyPortion, huntTasksFor, isGameAvailable, oddWordTasksFor, orderTasksFor, quizDeckFor, sortDeckFor, type GameId,
} from '../modules/games/task_source';
import { WARMUP_GAMES_PER_DAY, WARMUP_POOL, availableWarmupGames, warmupGamesForDay } from '../modules/games/warmup_state';

const LANGS: readonly ClassicCourseLang[] = ['en', 'de', 'fr', 'es', 'it'];
const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);
const GAMES: readonly GameId[] = ['flow', 'odd_word', 'sort', 'listen', 'memory', 'exact', 'forms', 'hunt', 'order'];
const QUIZ_KINDS: readonly QuizKind[] = ['listen', 'memory', 'exact', 'forms'];
const UI_LANGS = ['ru', 'uk', 'en', 'es'] as const;

const same = (text: string): string => text.trim().toLowerCase();
const duplicates = (values: readonly string[]): string[] => values.filter((v, i) => values.indexOf(v) !== i);
const blank = (text: unknown): boolean => typeof text !== 'string' || text.trim().length === 0;

/** Все объекты заданий, которые лежат в банке языка: по ним видно, что задание не пришло из чужого языка. */
function ownedBy(bank: GameBank): Set<unknown> {
  const owned = new Set<unknown>();
  const lists = [bank.oddWord, bank.exact, bank.listen, bank.memory, bank.hunt, bank.order];
  for (const byLesson of lists) for (const list of Object.values(byLesson ?? {})) for (const item of list as readonly unknown[]) owned.add(item);
  for (const deck of Object.values(bank.sort ?? {})) owned.add(deck);
  for (const round of bank.forms ?? []) owned.add(round);
  return owned;
}
const OWNED = new Map(LANGS.map((lang) => [lang, ownedBy(GAME_BANKS[lang] ?? {})] as const));

/** Фразы курса языка до урока включительно — «На слух» обязана произносить фразу своего языка. */
const phraseCache = new Map<string, Set<string>>();
const plain = (text: string): string => same(text).replace(/[.?!¿¡,;:]/g, ' ').replace(/\s+/g, ' ').trim();
function coursePhrases(lang: ClassicCourseLang, upTo: number): Set<string> {
  const key = `${lang}:${upTo}`;
  const cached = phraseCache.get(key);
  if (cached) return cached;
  const set = new Set<string>(upTo > 1 ? coursePhrases(lang, upTo - 1) : []);
  for (const phrase of getClassicLessonPhrases(upTo, lang)) {
    set.add(plain(phrase.english));
    for (const alt of phrase.alternatives ?? []) set.add(plain(alt));
  }
  phraseCache.set(key, set);
  return set;
}

interface Found { tasks: readonly unknown[]; ids: readonly string[] }

function checkOddWord(tasks: readonly OddWordTask[], say: (id: string, what: string) => void): void {
  for (const task of tasks) {
    if (!isValidOddWordTask(task)) say(task.id, 'не проходит isValidOddWordTask');
    if (!Number.isInteger(task.extraIndex) || task.extraIndex < 0 || task.extraIndex >= task.words.length) { say(task.id, 'extraIndex вне words'); continue; }
    const rest = task.words.filter((_, i) => i !== task.extraIndex);
    if (rest.length < 2 || rest.some(blank)) say(task.id, 'после удаления лишнего слова фразы не остаётся');
    if (blank(task.translation)) say(task.id, 'пустой перевод');
    if (blank(task.whyTitle) || blank(task.whyText)) say(task.id, 'пустое объяснение');
  }
}

function checkSort(deck: SortDeck, say: (id: string, what: string) => void): void {
  const left = deck.tasks.filter((t) => t.side === 'left').length;
  const right = deck.tasks.filter((t) => t.side === 'right').length;
  if (left === 0 || right === 0) say(deck.id, `пустая корзина: слева ${left}, справа ${right}`);
  if (left + right !== deck.tasks.length) say(deck.id, 'у карты side не left и не right');
  if (blank(deck.left.title) || blank(deck.right.title) || same(deck.left.title) === same(deck.right.title)) say(deck.id, 'корзины не подписаны или названы одинаково');
  for (const id of duplicates(deck.tasks.map((t) => t.id))) say(id, 'id карты повторяется');
  for (const text of duplicates(deck.tasks.map((t) => same(t.text)))) say(deck.id, `карта повторяется: ${text}`);
  for (const card of deck.tasks) {
    if (blank(card.text)) say(card.id, 'пустой текст карты');
    if (blank(card.hint)) say(card.id, 'нет подсказки');
  }
}

function checkQuiz(kind: QuizKind, rounds: readonly QuizRound[], lang: ClassicCourseLang, lesson: number, say: (id: string, what: string) => void): void {
  const expectedPrompt = { listen: 'audio', memory: 'pairs', exact: 'gap', forms: 'forms' }[kind];
  for (const round of rounds) {
    if (!isValidQuizRound(round)) say(round.id, 'не проходит isValidQuizRound');
    if (round.prompt.kind !== expectedPrompt) say(round.id, `вид задания ${round.prompt.kind}, а игра ждёт ${expectedPrompt}`);
    if (!Number.isInteger(round.correctIndex) || round.correctIndex < 0 || round.correctIndex >= round.options.length) { say(round.id, 'correctIndex вне options'); continue; }
    if (round.options.some(blank)) say(round.id, 'пустой вариант ответа');
    for (const option of duplicates(round.options.map(same))) say(round.id, `вариант повторяется: ${option}`);
    if (blank(round.ask)) say(round.id, 'пустой вопрос');
    const correct = round.options[round.correctIndex];
    if (round.prompt.kind === 'audio') {
      if (round.prompt.text.trim() !== correct.trim()) say(round.id, 'верный вариант не равен тому, что произносится');
      if (!(round.prompt.rate > 0)) say(round.id, 'скорость речи не положительная');
      if (!coursePhrases(lang, lesson).has(plain(round.prompt.text))) say(round.id, `произносится не фраза курса ${lang} до урока ${lesson}: ${round.prompt.text}`);
    }
    if (round.prompt.kind === 'pairs') {
      const { pairs, askIndex } = round.prompt;
      if (!(askIndex >= 0 && askIndex < pairs.length)) { say(round.id, 'askIndex вне пар'); continue; }
      for (const word of duplicates(pairs.map(([w]) => same(w)))) say(round.id, `слово пары повторяется: ${word}`);
      for (const tr of duplicates(pairs.map(([, t]) => same(t)))) say(round.id, `перевод пары повторяется: ${tr}`);
      if (pairs.some(([w, t]) => blank(w) || blank(t))) say(round.id, 'пустая пара');
      if (same(correct) !== same(pairs[askIndex][1])) say(round.id, 'верный вариант — не перевод спрошенной пары');
    }
    if (round.prompt.kind === 'gap' && blank(round.prompt.before) && blank(round.prompt.after)) say(round.id, 'у пропуска нет фразы');
    if (round.prompt.kind === 'forms') {
      if (round.prompt.known.length !== 2 || round.prompt.known.some(blank)) say(round.id, `форм вместе с ответом не три: известных ${round.prompt.known.length}`);
    }
  }
}

function checkHunt(tasks: readonly HuntTask[], say: (id: string, what: string) => void): void {
  for (const task of tasks) {
    if (!isValidHuntTask(task)) say(task.id, 'не проходит isValidHuntTask');
    const line = task.lines[task.wrong.line];
    const word = line?.words[task.wrong.word];
    if (!line || word === undefined) { say(task.id, 'wrong.line / wrong.word не существуют'); continue; }
    if (!line.tappable.includes(task.wrong.word)) say(task.id, 'неверное слово нельзя нажать');
    if (blank(task.fix) || same(task.fix) === same(word)) say(task.id, 'fix не отличается от неверного слова');
    if (task.lines.every((l) => l.tappable.length === 0)) say(task.id, 'нажимаемых слов нет');
    if (task.lines.some((l) => l.tappable.some((i) => !Number.isInteger(i) || i < 0 || i >= l.words.length))) say(task.id, 'индекс нажимаемого слова вне реплики');
    if (task.lines.some((l) => l.words.length === 0 || l.words.some(blank))) say(task.id, 'пустая реплика или пустое слово');
    if (task.lines.some((l) => duplicates(l.tappable.map(String)).length > 0)) say(task.id, 'нажимаемое слово указано дважды');
    if (blank(task.why)) say(task.id, 'нет объяснения');
  }
}

function checkOrder(tasks: readonly OrderTask[], say: (id: string, what: string) => void): void {
  for (const task of tasks) {
    if (!isValidOrderTask(task)) say(task.id, 'не проходит isValidOrderTask');
    if (task.lines.length < 3) say(task.id, 'меньше трёх реплик');
    if (task.lines.some(blank)) say(task.id, 'пустая реплика');
    for (const line of duplicates(task.lines.map(same))) say(task.id, `реплика повторяется — порядок неоднозначен: ${line}`);
  }
}

/** Что игра отдаёт экрану — тем же путём, каким берёт экран. */
function fetch(game: GameId, lang: string, lesson: number): Found {
  switch (game) {
    case 'odd_word': { const t = oddWordTasksFor(lang, lesson); return { tasks: t, ids: t.map((x) => x.id) }; }
    case 'sort': { const d = sortDeckFor(lang, lesson); return d ? { tasks: [d], ids: [d.id, ...d.tasks.map((x) => x.id)] } : { tasks: [], ids: [] }; }
    case 'listen': case 'memory': case 'exact': case 'forms': { const r = quizDeckFor(game, lang, lesson)?.rounds ?? []; return { tasks: r, ids: r.map((x) => x.id) }; }
    case 'hunt': { const t = huntTasksFor(lang, lesson); return { tasks: t, ids: t.map((x) => x.id) }; }
    case 'order': { const t = orderTasksFor(lang, lesson); return { tasks: t, ids: t.map((x) => x.id) }; }
    default: return { tasks: [], ids: [] };
  }
}

/** Ключ урока в банке, из которого пришло задание (для проверки «не из будущего урока»). */
function sourceLesson(bank: GameBank, game: GameId, first: unknown): number | null {
  const byLesson = { odd_word: bank.oddWord, sort: bank.sort, listen: bank.listen, memory: bank.memory, exact: bank.exact, hunt: bank.hunt, order: bank.order }[game as Exclude<GameId, 'flow' | 'forms'>];
  for (const [key, entry] of Object.entries(byLesson ?? {})) {
    if (entry === first || (Array.isArray(entry) && entry.includes(first))) return Number(key);
  }
  return null;
}

describe('игры × языки × уроки: задания решаемы и принадлежат своему языку', () => {
  const problems: string[] = [];
  let pairs = 0;
  let available = 0;
  let tasksChecked = 0;

  for (const lang of LANGS) {
    const bank = GAME_BANKS[lang];
    for (const lesson of LESSONS) {
      for (const game of GAMES) {
        if (game === 'flow') continue; // «Поток» берёт фразы прямо из уроков — проверяется отдельным блоком ниже
        pairs += 1;
        const say = (id: string, what: string) => problems.push(`${lang} · урок ${lesson} · ${game} · ${id} · ${what}`);
        const open = isGameAvailable(game, lang, lesson);
        const found = fetch(game, lang, lesson);
        if (!open) {
          if (found.tasks.length > 0) say('—', 'игра недоступна, но задания отдаются');
          continue;
        }
        available += 1;
        if (found.tasks.length === 0) { say('—', 'игра доступна, но заданий нет'); continue; }
        tasksChecked += found.ids.length;
        for (const id of duplicates(found.ids)) say(id, 'id повторяется в выдаче');
        for (const id of found.ids) if (!new RegExp(`(^|-)${lang}(-|$)`).test(id)) say(id, 'в id нет кода своего языка');
        for (const task of found.tasks) {
          if (!OWNED.get(lang)?.has(task)) say('—', 'задание не из банка этого языка');
          for (const other of LANGS) if (other !== lang && OWNED.get(other)?.has(task)) say('—', `задание лежит и в банке ${other}`);
        }
        if (game !== 'forms') {
          const from = sourceLesson(bank, game, found.tasks[0]);
          if (from === null || from > lesson) say('—', `задания из урока ${String(from)} — старше текущего`);
        }
        if (game === 'odd_word') checkOddWord(found.tasks as readonly OddWordTask[], say);
        else if (game === 'sort') checkSort(found.tasks[0] as SortDeck, say);
        else if (game === 'hunt') checkHunt(found.tasks as readonly HuntTask[], say);
        else if (game === 'order') checkOrder(found.tasks as readonly OrderTask[], say);
        else checkQuiz(game, found.tasks as readonly QuizRound[], lang, lesson, say);
      }
    }
  }

  it('перебраны все пары язык × урок × игра', () => {
    expect(pairs).toBe(LANGS.length * LESSONS.length * (GAMES.length - 1));
    expect(available).toBeGreaterThan(0);
    expect(tasksChecked).toBeGreaterThan(0);
  });

  it('ни одной находки: «язык · урок · игра · id · что не так»', () => {
    expect([...new Set(problems)]).toEqual([]);
  });

  it('подбор ничего не выбрасывает молча: каждое задание каждого банка проходит проверку своих правил', () => {
    const dropped: string[] = [];
    for (const lang of LANGS) {
      const bank = GAME_BANKS[lang];
      for (const [lesson, list] of Object.entries(bank.oddWord ?? {})) for (const t of list) if (!isValidOddWordTask(t)) dropped.push(`${lang} · урок ${lesson} · odd_word · ${t.id}`);
      for (const kind of ['listen', 'memory', 'exact'] as const) {
        for (const [lesson, list] of Object.entries(bank[kind] ?? {})) for (const r of list) if (!isValidQuizRound(r)) dropped.push(`${lang} · урок ${lesson} · ${kind} · ${r.id}`);
      }
      for (const r of bank.forms ?? []) if (!isValidQuizRound(r)) dropped.push(`${lang} · forms · ${r.id}`);
      for (const [lesson, list] of Object.entries(bank.hunt ?? {})) for (const t of list) if (!isValidHuntTask(t)) dropped.push(`${lang} · урок ${lesson} · hunt · ${t.id}`);
      for (const [lesson, list] of Object.entries(bank.order ?? {})) for (const t of list) if (!isValidOrderTask(t)) dropped.push(`${lang} · урок ${lesson} · order · ${t.id}`);
      for (const [lesson, deck] of Object.entries(bank.sort ?? {})) if (deck.tasks.length === 0) dropped.push(`${lang} · урок ${lesson} · sort · ${deck.id}`);
    }
    expect(dropped).toEqual([]);
  });

  it('id заданий не повторяются ни внутри языка, ни между языками', () => {
    const all: string[] = [];
    for (const lang of LANGS) {
      const bank = GAME_BANKS[lang];
      for (const byLesson of [bank.oddWord, bank.exact, bank.listen, bank.memory, bank.hunt, bank.order]) {
        for (const list of Object.values(byLesson ?? {})) for (const item of list as readonly { id: string }[]) all.push(item.id);
      }
      for (const deck of Object.values(bank.sort ?? {})) all.push(deck.id, ...deck.tasks.map((t) => t.id));
      for (const round of bank.forms ?? []) all.push(round.id);
    }
    expect(duplicates(all)).toEqual([]);
  });

  it('в реестре ровно пять языков, и у каждого банк свой', () => {
    expect(Object.keys(GAME_BANKS).sort()).toEqual([...LANGS].sort());
    for (const lang of LANGS) expect([lang, gameBankFor(lang) === GAME_BANKS[lang]]).toEqual([lang, true]);
  });

  it('язык без банка получает только «Поток» и ни одного чужого задания', () => {
    for (const target of ['xx', 'pt', 'ru', 'EN', '', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      for (const lesson of [1, 8, 32]) {
        expect([target, lesson, GAMES.filter((g) => isGameAvailable(g, target, lesson))]).toEqual([target, lesson, ['flow']]);
        for (const game of GAMES) expect([target, lesson, game, fetch(game, target, lesson).tasks.length]).toEqual([target, lesson, game, 0]);
      }
    }
  });

  it('урок вне диапазона не ломает подбор и не отдаёт чужое', () => {
    for (const lang of LANGS) {
      for (const lesson of [0, -3, 1.7, 33, 999, Number.NaN, Number.POSITIVE_INFINITY]) {
        for (const game of GAMES) {
          const found = fetch(game, lang, lesson);
          expect([lang, lesson, game, isGameAvailable(game, lang, lesson)]).toEqual([lang, lesson, game, game === 'flow' || found.tasks.length > 0]);
          for (const task of found.tasks) expect([lang, lesson, game, OWNED.get(lang)?.has(task)]).toEqual([lang, lesson, game, true]);
        }
      }
    }
  });
});

describe('«Поток»: фразы своего языка, три разных варианта, верный среди них', () => {
  /** Перевод на язык интерфейса — те же три строки, что в экране игры (экран в этом тесте не монтируется). */
  const translationOf = (phrase: { russian: string; ukrainian: string; sourceLocales?: Record<string, string | undefined> }, ui: string): string => {
    if (ui === 'ru') return phrase.russian;
    if (ui === 'uk') return phrase.ukrainian || phrase.russian;
    return phrase.sourceLocales?.[ui] || phrase.russian;
  };
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('для каждого языка, урока и языка интерфейса раунды собираются и решаемы', () => {
    const problems: string[] = [];
    let pairs = 0;
    for (const lang of LANGS) {
      for (const lesson of LESSONS) {
        pairs += 1;
        const phrases = getClassicLessonPhrases(lesson, lang);
        if (phrases.length === 0) { problems.push(`${lang} · урок ${lesson} · flow · — · у урока нет фраз`); continue; }
        for (const ui of UI_LANGS) {
          if (ui === lang) continue; // язык интерфейса не совпадает с изучаемым: иначе «перевод» — та же фраза
          const pool: FlowItem[] = phrases.map((p) => ({ id: `${lang}:${lesson}:${String(p.id)}`, en: p.english, translation: translationOf(p, ui) }));
          const say = (id: string, what: string) => problems.push(`${lang} · урок ${lesson} · flow(${ui}) · ${id} · ${what}`);
          if (!canStartFlow(pool)) { say('—', 'фраз с разными переводами меньше трёх'); continue; }
          const rounds = buildFlowRounds(pool, FLOW_DEFAULT_ROUNDS, seeded(lesson * 131 + lang.charCodeAt(0)));
          if (rounds.length !== FLOW_DEFAULT_ROUNDS) say('—', `раундов ${rounds.length}, а нужно ${FLOW_DEFAULT_ROUNDS}`);
          for (const id of duplicates(rounds.map((r) => r.item.id))) say(id, 'фраза повторяется в одной игре');
          for (const round of rounds) {
            if (round.options.length !== FLOW_OPTIONS) say(round.item.id, `вариантов ${round.options.length}`);
            if (duplicates(round.options.map(same)).length > 0) say(round.item.id, 'варианты повторяются');
            if (round.options.some(blank)) say(round.item.id, 'пустой вариант');
            if (round.options[round.correctIndex] !== round.item.translation.trim()) say(round.item.id, 'верный вариант — не перевод показанной фразы');
            if (round.words.length === 0 || round.words.join(' ') !== round.item.en.trim().split(/\s+/).join(' ')) say(round.item.id, 'слова не складываются в фразу');
            if (!round.item.id.startsWith(`${lang}:`)) say(round.item.id, 'фраза не из курса этого языка');
          }
        }
      }
    }
    expect(pairs).toBe(LANGS.length * LESSONS.length);
    expect(problems).toEqual([]);
  });
});

describe('разминка: никогда не выдаёт игру без заданий', () => {
  const dayKeys = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 11 + i));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  });

  it('60 дней подряд для каждого языка и урока: до трёх игр, без повторов, у каждой есть задания', () => {
    const problems: string[] = [];
    for (const lang of LANGS) {
      for (const lesson of LESSONS) {
        const pool = WARMUP_POOL.filter((game) => isGameAvailable(game.id, lang, lesson));
        const seen = new Set<string>();
        for (const day of dayKeys) {
          const games = warmupGamesForDay(day, pool);
          const where = `${lang} · урок ${lesson} · ${day}`;
          if (games.length !== Math.min(WARMUP_GAMES_PER_DAY, pool.length)) problems.push(`${where} · игр ${games.length} при ${pool.length} доступных`);
          if (games.some((g) => g === undefined)) { problems.push(`${where} · в тройке пустое место`); continue; }
          if (duplicates(games.map((g) => g.id)).length > 0) problems.push(`${where} · игра повторяется внутри дня`);
          for (const game of games) {
            seen.add(game.id);
            if (!isGameAvailable(game.id, lang, lesson)) problems.push(`${where} · ${game.id} · игра без заданий`);
            if (game.id !== 'flow' && fetch(game.id, lang, lesson).tasks.length === 0) problems.push(`${where} · ${game.id} · выдача пустая`);
          }
        }
        for (const game of pool) if (!seen.has(game.id)) problems.push(`${lang} · урок ${lesson} · ${game.id} · за 60 дней ни разу не попала в разминку`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('язык без банка: разминка из одного «Потока», а не из чужих игр', () => {
    for (const target of ['xx', 'pt', 'constructor']) {
      expect([target, availableWarmupGames(target).map((g) => g.id)]).toEqual([target, ['flow']]);
      for (const day of dayKeys.slice(0, 7)) expect(warmupGamesForDay(day, availableWarmupGames(target)).map((g) => g.id)).toEqual(['flow']);
    }
  });

  it('список игр разминки совпадает со списком игр подбора, маршруты и названия заполнены', () => {
    expect(WARMUP_POOL.map((g) => g.id)).toEqual([...GAMES]);
    for (const game of WARMUP_POOL) {
      expect([game.id, game.route.startsWith('/game_')]).toEqual([game.id, true]);
      for (const ui of UI_LANGS) expect([game.id, ui, blank(game.name[ui]) || blank(game.description[ui])]).toEqual([game.id, ui, false]);
    }
  });

  it('битая дата дня не даёт пустых мест в тройке', () => {
    for (const day of ['', 'garbage', '2026-13-45', 'NaN-NaN-NaN']) {
      const games = warmupGamesForDay(day);
      expect([day, games.length, games.every((g) => g !== undefined)]).toEqual([day, WARMUP_GAMES_PER_DAY, true]);
    }
  });
});

describe('порция на день (dailyPortion)', () => {
  const items = Array.from({ length: 8 }, (_, i) => `t${i}`);

  it('внутри дня стабильна, не длиннее списка, без повторов и только из своих заданий', () => {
    for (let size = 0; size <= 12; size += 1) {
      for (let seed = -20; seed <= 400; seed += 1) {
        const first = dailyPortion(items, size, seed);
        expect(dailyPortion(items, size, seed)).toEqual(first);
        expect([size, seed, first.length]).toEqual([size, seed, Math.min(size, items.length)]);
        expect([size, seed, duplicates([...first])]).toEqual([size, seed, []]);
        expect([size, seed, first.every((t) => items.includes(t))]).toEqual([size, seed, true]);
      }
    }
  });

  it('за дни проходит весь список, а не одну и ту же порцию', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < items.length; seed += 1) dailyPortion(items, 3, seed).forEach((t) => seen.add(t));
    expect(seen.size).toBe(items.length);
  });

  it('дробный, огромный и нечисловой день не дают пустых мест', () => {
    for (const seed of [0.5, 7.99, 1e15, -1e15, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const portion = dailyPortion(items, 3, seed);
      expect([String(seed), portion.length, portion.every((t) => typeof t === 'string')]).toEqual([String(seed), 3, true]);
      expect([String(seed), duplicates([...portion])]).toEqual([String(seed), []]);
    }
    expect(dailyPortion([], 3, 5)).toEqual([]);
  });
});
