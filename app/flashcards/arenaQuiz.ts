import type { CardItem } from './types';

/**
 * Ядро режима «Арена» — быстрый тест на узнавание (макет
 * flashcards-screens.html, экраны C4 и D).
 *
 * зачем: у раздела было два режима — свайп («сам себе судья») и аудио
 * («на слух»). Проверки «знаю ли я на самом деле» не было: в свайпе можно
 * честно нажимать «знаю» и не выучить ничего. Арена даёт объективный
 * результат — 4 варианта, таймер, счёт в конце.
 *
 * Чистые функции без React и без хранилища: вся механика под тестами,
 * экран только рисует. Неверные варианты берём из ТОЙ ЖЕ колоды — чужие
 * переводы правдоподобны, поэтому тест честный (в отличие от случайного
 * мусора, который отсекается с ходу).
 */

/** Сколько вопросов в одном забеге (макет: «Арена · 3/10»). */
export const ARENA_QUESTION_COUNT = 10;
/** Вариантов ответа на вопрос (макет C4: 4 кнопки). */
export const ARENA_OPTION_COUNT = 4;
/** Секунд на вопрос (макет: кольцо-таймер с числом 8). */
export const ARENA_SECONDS_PER_QUESTION = 8;

export interface ArenaQuestion {
  /** id исходной карточки — по нему пишем прогресс и собираем слабые. */
  cardId: string;
  /** Что спрашиваем (перевод/родная сторона). */
  prompt: string;
  /** Варианты в порядке показа. */
  options: string[];
  /** Индекс верного варианта в `options`. */
  correctIndex: number;
}

export interface ArenaAnswer {
  cardId: string;
  correct: boolean;
}

export interface ArenaSummary {
  correct: number;
  total: number;
  /** Максимальная серия верных подряд — для чипа «комбо ×N». */
  bestStreak: number;
  /** id карточек, где ошиблись — они пойдут в «слабые». */
  weakCardIds: string[];
}

/**
 * Детерминированный псевдослучайный генератор.
 * зачем: Math.random в сборке вопросов делает баг невоспроизводимым и ломает
 * тесты. Seed берём снаружи (например, от времени старта забега) — забег
 * остаётся разным каждый раз, но при том же seed воспроизводится точно.
 */
export function makeRng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s === 0) s = 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Перемешивание Фишера-Йетса на переданном ГПСЧ (не мутирует вход). */
export function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Собирает вопросы из колоды.
 *
 * @param cards   карточки-источник
 * @param answerFor как достать «ответ» (изучаемую сторону) из карточки
 * @param promptFor как достать «вопрос» (родную сторону)
 * @param seed    зерно ГПСЧ (детерминизм)
 *
 * Требует минимум ARENA_OPTION_COUNT различных ответов — иначе вопрос
 * невозможно составить честно, и мы возвращаем пустой список: экран покажет
 * понятную заглушку вместо теста с двумя одинаковыми вариантами.
 */
export function buildArenaQuestions(
  cards: readonly CardItem[],
  answerFor: (c: CardItem) => string,
  promptFor: (c: CardItem) => string,
  seed: number,
  limit: number = ARENA_QUESTION_COUNT,
): ArenaQuestion[] {
  const rng = makeRng(seed);

  // Годные карточки: есть и вопрос, и ответ.
  const usable = cards.filter((c) => {
    const a = answerFor(c)?.trim();
    const p = promptFor(c)?.trim();
    return !!a && !!p;
  });

  // Пул уникальных ответов — из него берём «обманки».
  const answerPool = Array.from(new Set(usable.map((c) => answerFor(c).trim())));
  if (answerPool.length < ARENA_OPTION_COUNT) return [];

  const picked = shuffle(usable, rng).slice(0, limit);

  return picked.map((card) => {
    const correct = answerFor(card).trim();
    // Обманки: чужие ответы, не совпадающие с верным.
    const distractors = shuffle(
      answerPool.filter((a) => a !== correct),
      rng,
    ).slice(0, ARENA_OPTION_COUNT - 1);
    const options = shuffle([correct, ...distractors], rng);
    return {
      cardId: card.id,
      prompt: promptFor(card).trim(),
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}

/** Сводка забега для экрана итогов (макет D). */
export function summarizeArena(answers: readonly ArenaAnswer[]): ArenaSummary {
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  const weakCardIds: string[] = [];

  for (const a of answers) {
    if (a.correct) {
      correct += 1;
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
      if (!weakCardIds.includes(a.cardId)) weakCardIds.push(a.cardId);
    }
  }

  return { correct, total: answers.length, bestStreak, weakCardIds };
}
