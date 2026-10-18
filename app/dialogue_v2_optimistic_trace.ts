/**
 * [DIALOGUE-V2-OPTIMISTIC] — замер «тап → первый кадр реакции» в Диалогах 2.0 (координатор 18.10, правило «сперва логи»).
 *
 * зачем: прежде чем что-то ускорять в цепочке «тап по сценке → брифинг», «Начать → сессия», «отправка → свой пузырь → ответ»,
 * нужны цифры: сколько миллисекунд от тапа до кадра, где человек видит отклик, и какой шаг (чтение согласия, энергия,
 * id хода, сеть) держит экран. Каждая строка — один шаг потока с временем от тапа этого потока.
 * Только dev-сборка: в сторе журнал не шумит и не стоит ничего.
 */

const LOG = '[DIALOGUE-V2-OPTIMISTIC]';

export type DialogueV2OptimisticFlow = 'hub_tap' | 'start_tap' | 'send_tap';

type Mark = Readonly<{ at: number; key: string }>;

const marks = new Map<DialogueV2OptimisticFlow, Mark>();

function devEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/** Начало потока: тап. key — сценка / ход, чтобы шаги разных тапов не смешивались. */
export function markDialogueV2OptimisticTap(
  flow: DialogueV2OptimisticFlow,
  key: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  marks.set(flow, Object.freeze({ at: Date.now(), key }));
  console.log(LOG, JSON.stringify({ flow, step: 'tap', key, ...extra }));
}

/** Шаг потока сейчас: ms от тапа; тапа не было (экран открыт иначе) — ms=null, это тоже ответ. */
export function logDialogueV2OptimisticStep(
  flow: DialogueV2OptimisticFlow,
  step: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  const mark = marks.get(flow);
  console.log(LOG, JSON.stringify({ flow, step, key: mark?.key ?? null, ms: mark ? Date.now() - mark.at : null, ...extra }));
}

/** Шаг на ближайшем кадре: то, что человек реально увидел, а не момент вызова setState. */
export function logDialogueV2OptimisticFrame(
  flow: DialogueV2OptimisticFlow,
  step: string,
  extra: Readonly<Record<string, unknown>> = {},
): void {
  if (!devEnabled()) return;
  requestAnimationFrame(() => logDialogueV2OptimisticStep(flow, step, extra));
}

export function resetDialogueV2OptimisticTraceForTests(): void {
  marks.clear();
}
