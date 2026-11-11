/**
 * Игры-викторины «На слух», «Память», «Точное слово», «Три формы» — правила без React.
 * Эталон: docs/design/v2-app/elevate-games.js (`listen`, `memory`, `exact`, `forms`) — одна механика «показали → выбери ответ».
 */
import type { SkillAction } from '../skills/skill_points_table';

export type QuizKind = 'listen' | 'memory' | 'exact' | 'forms';

export type QuizPrompt =
  /** «На слух»: фраза произносится голосом телефона; `rate` — множитель скорости речи. */
  | { readonly kind: 'audio'; readonly text: string; readonly rate: number }
  /** «Память»: пары показываются, затем скрываются; спрашивается пара `askIndex`. */
  | { readonly kind: 'pairs'; readonly pairs: readonly (readonly [string, string])[]; readonly askIndex: number }
  /** «Точное слово»: фраза с пропуском. */
  | { readonly kind: 'gap'; readonly before: string; readonly after: string }
  /** «Три формы»: известные формы глагола и пустая ячейка. */
  | { readonly kind: 'forms'; readonly known: readonly string[] };

export interface QuizRound {
  readonly id: string;
  readonly ask: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly prompt: QuizPrompt;
  /** Пояснение после ответа. */
  readonly note?: string;
}

export interface QuizDeck {
  readonly kind: QuizKind;
  /** Подпись в шапке: «Запомни пары». */
  readonly pill: string;
  /** Строка таблицы навыков за верный ответ. */
  readonly skillAction: SkillAction;
  /** Сколько миллисекунд показывается задание до появления вариантов. */
  readonly showMs: number;
  readonly rounds: readonly QuizRound[];
}

const MEMORY_PAIRS: readonly (readonly [string, string])[] = [
  ['Pitch in', 'Скинуться, помочь'], ['Call it a day', 'Закончить на сегодня'], ['Tend to', 'Иметь склонность'], ['Quit', 'Уйти, бросить'],
];

/** Утверждённые владельцем примеры из макета (11.11.2026). Банки по урокам и наборам — отдельная задача с вычиткой. */
export const QUIZ_SEED_DECKS: Readonly<Record<QuizKind, QuizDeck>> = {
  listen: {
    kind: 'listen', pill: 'На слух', skillAction: 'by_ear_correct', showMs: 2400,
    rounds: [
      { id: 'l1', ask: 'Что прозвучало?', options: ['We are waiting here', 'We were waiting here', 'We are waiting there'], correctIndex: 0, prompt: { kind: 'audio', text: 'We are waiting here', rate: 1 }, note: 'Мы ждём здесь' },
      { id: 'l2', ask: 'Что прозвучало?', options: ['He is cooking dinner', 'She is cooking dinner', 'He is cooking a dinner'], correctIndex: 0, prompt: { kind: 'audio', text: 'He is cooking dinner', rate: 1.25 }, note: 'Он готовит ужин' },
      { id: 'l3', ask: 'Что прозвучало?', options: ['I listen to music', 'I am listening to music', 'I am listening music'], correctIndex: 1, prompt: { kind: 'audio', text: 'I am listening to music', rate: 1.5 }, note: 'Я слушаю музыку' },
    ],
  },
  memory: {
    kind: 'memory', pill: 'Запомни пары', skillAction: 'memory_exact_word_correct', showMs: 3600,
    rounds: [
      { id: 'm1', ask: 'Что значит «Call it a day»?', options: ['Назвать дату', 'Закончить на сегодня', 'Позвонить днём'], correctIndex: 1, prompt: { kind: 'pairs', pairs: MEMORY_PAIRS, askIndex: 1 } },
      { id: 'm2', ask: 'Что значит «Tend to»?', options: ['Иметь склонность', 'Ухаживать', 'Тянуться'], correctIndex: 0, prompt: { kind: 'pairs', pairs: MEMORY_PAIRS, askIndex: 2 } },
    ],
  },
  exact: {
    kind: 'exact', pill: 'Точное слово', skillAction: 'memory_exact_word_correct', showMs: 700,
    rounds: [
      { id: 'e1', ask: 'Какое слово сюда?', options: ['listen', 'hear'], correctIndex: 0, prompt: { kind: 'gap', before: 'I', after: 'to music every day' }, note: 'Listen — слушаю намеренно. Hear — просто слышу.' },
      { id: 'e2', ask: 'Какое слово сюда?', options: ['write', 'writing'], correctIndex: 1, prompt: { kind: 'gap', before: 'She is', after: 'messages now' }, note: 'После is идёт форма на -ing.' },
      { id: 'e3', ask: 'Какое слово сюда?', options: ['here', 'at here'], correctIndex: 0, prompt: { kind: 'gap', before: 'We are waiting', after: '' }, note: 'Here не требует предлога.' },
    ],
  },
  forms: {
    kind: 'forms', pill: 'Неправильные глаголы', skillAction: 'verbs_prepositions_correct', showMs: 900,
    rounds: [
      { id: 'f1', ask: 'Третья форма?', options: ['goed', 'gone', 'went'], correctIndex: 1, prompt: { kind: 'forms', known: ['go', 'went'] }, note: 'идти — шёл — ушедший' },
      { id: 'f2', ask: 'Третья форма?', options: ['written', 'writed', 'wrote'], correctIndex: 0, prompt: { kind: 'forms', known: ['write', 'wrote'] }, note: 'писать — писал — написанный' },
      { id: 'f3', ask: 'Третья форма?', options: ['took', 'taked', 'taken'], correctIndex: 2, prompt: { kind: 'forms', known: ['take', 'took'] }, note: 'брать — брал — взятый' },
    ],
  },
};

export function isQuizKind(value: unknown): value is QuizKind {
  return value === 'listen' || value === 'memory' || value === 'exact' || value === 'forms';
}

export function isValidQuizRound(round: QuizRound): boolean {
  const unique = new Set(round.options.map((o) => o.trim().toLowerCase()));
  return Boolean(round.id) && round.options.length >= 2 && unique.size === round.options.length
    && Number.isInteger(round.correctIndex) && round.correctIndex >= 0 && round.correctIndex < round.options.length
    && (round.prompt.kind !== 'audio' || (round.prompt.text.trim().length > 0 && round.options[round.correctIndex].trim() === round.prompt.text.trim()))
    && (round.prompt.kind !== 'pairs' || (round.prompt.askIndex >= 0 && round.prompt.askIndex < round.prompt.pairs.length));
}

export interface QuizState {
  readonly index: number;
  readonly correct: number;
  readonly misses: number;
}

export const INITIAL_QUIZ_STATE: QuizState = { index: 0, correct: 0, misses: 0 };

export interface QuizAnswerResult {
  readonly correct: boolean;
  readonly state: QuizState;
}

/** Ответ на текущий раунд. В викторине одна попытка: ответ фиксируется, раунд не переигрывается. */
export function answerQuiz(state: QuizState, round: QuizRound, optionIndex: number): QuizAnswerResult {
  const correct = optionIndex === round.correctIndex;
  return { correct, state: { ...state, correct: state.correct + (correct ? 1 : 0), misses: state.misses + (correct ? 0 : 1) } };
}

export function nextQuizRound(state: QuizState): QuizState {
  return { ...state, index: state.index + 1 };
}
