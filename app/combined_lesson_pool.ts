/**
 * Комбинированный урок: сборка пула фраз из нескольких тем.
 *
 * зачем (пользователь → владелец, 2026-09-17): «Я отлично прохожу тему из 50
 * вопросов подряд. Но открываю следующую — и первые 5 вопросов туплю жёстко.
 * А в жизни у тебя темы перемешаны, и мозгу надо перестраиваться быстро.
 * Выбрал 3 темы и пошли 50 вопросов вперемешку.»
 *
 * Приём взят из `level_exam_blueprint.ts:205-232` (экзамен уровня): фразы
 * собираются из нескольких тем и выдаются по кругу, чтобы одна тема не шла
 * подряд. Отличие: там диапазон задаёт уровень, здесь темы выбирает человек.
 *
 * Этот модуль — ЧИСТЫЙ: ни сети, ни хранилища, ни React. Так он тестируется
 * без окружения и не тянет за собой экран урока.
 */

import { getLessonData } from './lesson_data_all';
import type { LessonPhrase } from './lesson_data_types';
import { shuffle } from './utils_shuffle';

/** Сколько тем разрешено смешать за раз (решение владельца 2026-09-17). */
export const COMBINED_LESSON_MIN_TOPICS = 2;
export const COMBINED_LESSON_MAX_TOPICS = 5;

/**
 * Потолок вопросов. Совпадает с TOTAL в app/lesson1.tsx:301 — экран урока
 * рисует ровно столько ячеек прогресса, и расхождение сломало бы полосу.
 */
export const COMBINED_LESSON_TOTAL = 50;

/** Одна позиция смешанного урока: фраза и тема, из которой она пришла. */
export type CombinedLessonEntry = {
  /** Тема-источник. Нужна для кнопки «Теория» и скрытой подписи над заданием. */
  readonly lessonId: number;
  readonly phrase: LessonPhrase;
};

export type CombinedLessonPlan = {
  /** Темы в том порядке, в котором их выбрал человек. */
  readonly topicIds: readonly number[];
  readonly entries: readonly CombinedLessonEntry[];
};

export type BuildCombinedLessonPlanInput = {
  readonly topicIds: readonly number[];
  /** Подменяется в тестах, чтобы порядок был предсказуем. */
  readonly random?: () => number;
  readonly total?: number;
};

/**
 * Годится ли фраза для экрана урока. Те же два условия, что и в
 * `app/lesson1.tsx:2031-2035`: без токенов экран не соберёт задание.
 */
function isUsablePhrase(phrase: LessonPhrase | undefined): phrase is LessonPhrase {
  if (!phrase) return false;
  return Array.isArray(phrase.words) && phrase.words.length > 0;
}

/**
 * Собирает смешанный урок.
 *
 * Правило чередования: пока в темах есть неиспользованные фразы, две подряд
 * позиции НИКОГДА не из одной темы. Когда фразы остались только в одной теме,
 * чередовать больше нечем — остаток идёт как есть (иначе пришлось бы
 * выбрасывать материал, за который человек заплатил вниманием).
 */
export function buildCombinedLessonPlan(
  input: BuildCombinedLessonPlanInput,
): CombinedLessonPlan {
  const random = input.random ?? Math.random;
  const total = Math.max(1, input.total ?? COMBINED_LESSON_TOTAL);

  // Дубли убираем молча: они означали бы, что одна тема получит двойной вес.
  const topicIds = Array.from(new Set(input.topicIds)).filter(
    (id) => Number.isInteger(id) && id >= 1,
  );
  if (topicIds.length < COMBINED_LESSON_MIN_TOPICS) {
    throw new Error(`combined_lesson_too_few_topics:${topicIds.length}`);
  }
  if (topicIds.length > COMBINED_LESSON_MAX_TOPICS) {
    throw new Error(`combined_lesson_too_many_topics:${topicIds.length}`);
  }

  // Очередь на каждую тему: свои фразы, перемешанные независимо.
  const queues = new Map<number, LessonPhrase[]>();
  for (const lessonId of topicIds) {
    const usable = getLessonData(lessonId).filter(isUsablePhrase);
    if (usable.length > 0) queues.set(lessonId, shuffle(usable, random));
  }
  if (queues.size === 0) {
    throw new Error(`combined_lesson_no_phrases:${topicIds.join(',')}`);
  }

  const entries: CombinedLessonEntry[] = [];
  let previousLessonId: number | null = null;

  while (entries.length < total) {
    // Темы, в которых ещё есть материал, в порядке выбора человеком.
    const available = topicIds.filter((id) => (queues.get(id)?.length ?? 0) > 0);
    if (available.length === 0) break;

    // Не повторяем тему подряд, пока есть из чего выбрать. Когда осталась
    // одна тема — берём её, иначе пришлось бы оборвать урок раньше времени.
    const candidates =
      available.length > 1
        ? available.filter((id) => id !== previousLessonId)
        : available;
    const pool = candidates.length > 0 ? candidates : available;

    // Самая полная очередь вперёд — так темы кончаются примерно одновременно
    // и в конце урока не остаётся длинный хвост одной темы.
    let lessonId = pool[0];
    let best = queues.get(lessonId)?.length ?? 0;
    for (const id of pool) {
      const size = queues.get(id)?.length ?? 0;
      if (size > best) {
        best = size;
        lessonId = id;
      }
    }

    const queue = queues.get(lessonId);
    const phrase = queue?.pop();
    if (!phrase) {
      // Сюда попасть нельзя: тема выбрана из available, где длина > 0.
      // Логируем, а не молчим — немой обрыв прятал бы причину короткого урока.
      // зачем: голый __DEV__ — известная ловушка проекта (память
      // project_dev_guard_bare_dev_global_jest): вне React Native это
      // необъявленная переменная, и модуль падает при первом же обращении.
      if ((globalThis as { __DEV__?: boolean }).__DEV__) {
        console.log(
          '[COMBO-POOL] неожиданно пустая очередь',
          JSON.stringify({ lessonId, collected: entries.length }),
        );
      }
      queues.delete(lessonId);
      continue;
    }

    entries.push({ lessonId, phrase });
    previousLessonId = lessonId;
  }

  return { topicIds, entries };
}

/**
 * Разбирает параметр маршрута `combo` («3,10,20») в список тем.
 *
 * expo-router на iOS умеет отдать параметр массивом — форма учтена, иначе
 * комбо молча превращался бы в обычный урок (класс «механизм есть, а данных
 * не дали», из-за которого в проекте уже терялись круги работы).
 * Пустой/битый вход даёт пустой массив: вызывающий сам решает, что делать.
 */
export function parseCombinedLessonTopicsParam(
  raw: string | string[] | undefined,
): number[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  const ids = value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isInteger(id) && id >= 1);
  return Array.from(new Set(ids)).slice(0, COMBINED_LESSON_MAX_TOPICS);
}

/** Результат одной темы в завершённом комбо-уроке. */
export type CombinedLessonTopicResult = {
  readonly lessonId: number;
  readonly correct: number;
  readonly total: number;
};

/**
 * Разбирает параметр `comboBreakdown` («3:16:17,10:10:16») в список результатов.
 *
 * Формат плоский и строковый намеренно: expo-router везёт параметры маршрута
 * как строки, а JSON в query ломался бы об экранирование. Битые куски
 * пропускаются молча — экран завершения обязан показаться в любом случае,
 * лучше неполная разбивка, чем упавший экран после пройденного урока.
 */
export function parseCombinedLessonBreakdownParam(
  raw: string | string[] | undefined,
): CombinedLessonTopicResult[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  const rows: CombinedLessonTopicResult[] = [];
  for (const chunk of value.split(',')) {
    const [rawId, rawOk, rawTotal] = chunk.split(':');
    const lessonId = Number.parseInt(rawId ?? '', 10);
    const correct = Number.parseInt(rawOk ?? '', 10);
    const total = Number.parseInt(rawTotal ?? '', 10);
    if (!Number.isInteger(lessonId) || lessonId < 1) continue;
    if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0) continue;
    rows.push({ lessonId, correct: Math.max(0, Math.min(correct, total)), total });
  }
  return rows;
}

/** Сколько фраз реально доступно у темы — для экрана выбора. */
export function countCombinedLessonPhrases(lessonId: number): number {
  return getLessonData(lessonId).filter(isUsablePhrase).length;
}

/*
 * expo-router route shim.
 * зачем: файл лежит в app/, поэтому роутер считает его МАРШРУТОМ и требует
 * компонент по умолчанию. Без заглушки приложение падало сразу при старте
 * (владелец 2026-09-17: «оно вылетает сразу с ошибкой»). Тот же приём уже
 * применён в app/course_levels.ts и app/lesson_screen_bootstrap.ts.
 */
export default function __RouteShim() { return null; }
