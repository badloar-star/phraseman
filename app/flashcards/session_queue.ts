/**
 * cards-2.0 (E5): чистая логика каркаса сессии (§3.5 мастер-плана).
 * «Ошибка → карточка в конец очереди, максимум 2 повтора за сессию» + расчёт
 * итога сессии (счёт/точность/среднее время) для экрана результата.
 * Без RN-импортов — юнит-тестируется в node (tests/fc_session_queue.test.ts).
 */

/** Максимум повторных заходов одной карточки за сессию (§3.5: «макс 2 повтора»). */
export const MAX_MISTAKE_REPEATS = 2;

/** Дефолтный размер сессии тренера (§3.5: 10/15/20, дефолт 15). */
export const TRAINER_SESSION_SIZE = 15;

export type MistakeRequeueResult<T> = {
  queue: T[];
  repeatCounts: Record<string, number>;
  /** true — карточка добавлена в конец очереди (кэп повторов не исчерпан). */
  requeued: boolean;
};

/**
 * Ошибка на карточке `card` (ключ `key`): вернуть очередь с карточкой в конце,
 * если у неё осталось меньше MAX_MISTAKE_REPEATS повторов; иначе — без изменений.
 * Не мутирует входные структуры (undo снимает повтор простым queue.slice).
 */
export function requeueAfterMistake<T>(
  queue: readonly T[],
  card: T,
  key: string,
  repeatCounts: Readonly<Record<string, number>>,
  maxRepeats: number = MAX_MISTAKE_REPEATS,
): MistakeRequeueResult<T> {
  const used = repeatCounts[key] ?? 0;
  if (used >= maxRepeats) {
    return { queue: [...queue], repeatCounts: { ...repeatCounts }, requeued: false };
  }
  return {
    queue: [...queue, card],
    repeatCounts: { ...repeatCounts, [key]: used + 1 },
    requeued: true,
  };
}

// ── Итог сессии ───────────────────────────────────────────────────────────────

export type SessionAnswerEvent = {
  /** Стабильный ключ карточки (для списка «Ещё учу»). */
  key: string;
  correct: boolean;
  /** Время ответа, мс (для среднего времени сессии). */
  ms?: number;
};

export type SessionOutcomeSummary = {
  /** Верных ответов (по попыткам — повторы считаются). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /** Всего попыток. */
  total: number;
  /** Точность 0..1 (0 при пустой сессии). */
  accuracy: number;
  /** Среднее время ответа, сек; undefined — нет замеров. */
  avgAnswerSec?: number;
  /** Уникальные ключи карточек с хотя бы одной ошибкой — для CTA «Добить: Ещё учу (N)». */
  learnKeys: string[];
};

/** Свести журнал ответов сессии к итогу для SessionResultScreen. */
export function summarizeSession(events: readonly SessionAnswerEvent[]): SessionOutcomeSummary {
  let correct = 0;
  let wrong = 0;
  let msSum = 0;
  let msCount = 0;
  const learn = new Set<string>();
  for (const e of events) {
    if (e.correct) correct += 1;
    else {
      wrong += 1;
      learn.add(e.key);
    }
    if (typeof e.ms === 'number' && Number.isFinite(e.ms) && e.ms >= 0) {
      msSum += e.ms;
      msCount += 1;
    }
  }
  const total = correct + wrong;
  return {
    correct,
    wrong,
    total,
    accuracy: total > 0 ? correct / total : 0,
    ...(msCount > 0 ? { avgAnswerSec: msSum / msCount / 1000 } : {}),
    learnKeys: [...learn],
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
