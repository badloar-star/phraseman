/**
 * [CARDS-OPTIMISTIC] — замер «тап → первый кадр реакции» в Карточках 2.0 (координатор 18.10, правило «сперва логи»).
 *
 * зачем: прежде чем ускорять «добавить / убрать набор», «Тренироваться» и ответ в тренировке, нужны цифры: сколько мс от тапа
 * до кадра, где человек видит отклик, сколько ждёт запись (диск / сервер) и сработал ли откат при ошибке. Каждая строка — шаг
 * потока с временем от тапа этого потока. Только dev-сборка: в сторе журнал не шумит и ничего не стоит.
 */

const LOG = '[CARDS-OPTIMISTIC]';

export type CardsOptimisticFlow = 'pack_add' | 'pack_remove' | 'train_tap' | 'answer_tap';

type Mark = Readonly<{ at: number; key: string }>;

const marks = new Map<CardsOptimisticFlow, Mark>();

function devEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/** Начало потока: тап. key — набор / карточка, чтобы шаги разных тапов не смешивались. */
export function markCardsOptimisticTap(
  flow: CardsOptimisticFlow,
  key: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  marks.set(flow, Object.freeze({ at: Date.now(), key }));
  console.log(LOG, JSON.stringify({ flow, step: 'tap', key, ...extra }));
}

/** Шаг потока сейчас: ms от тапа; тапа не было — ms=null, это тоже ответ. */
export function logCardsOptimisticStep(
  flow: CardsOptimisticFlow,
  step: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  const mark = marks.get(flow);
  console.log(LOG, JSON.stringify({ flow, step, key: mark?.key ?? null, ms: mark ? Date.now() - mark.at : null, ...extra }));
}

/** Шаг на ближайшем кадре: то, что человек реально увидел, а не момент вызова setState. */
export function logCardsOptimisticFrame(
  flow: CardsOptimisticFlow,
  step: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  requestAnimationFrame(() => logCardsOptimisticStep(flow, step, extra));
}

export function resetCardsOptimisticTraceForTests(): void {
  marks.clear();
}
