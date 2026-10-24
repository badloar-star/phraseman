// dialog_list_viewport.ts — когда ленту Диалога докручивать к концу при изменении её окна.
// зачем (жалоба бета-тестера 24.10 «встречный вопрос появляется на секунду и исчезает»): лента держит прежнее смещение, когда её окно
// сжимается (выросла карточка цели или строка ввода с подсказками, открылась клавиатура). Содержимое при этом не меняется —
// onContentSizeChange не срабатывает, и свежая реплика уезжает под поле ввода. Если человек был у конца — возвращаем его к концу;
// если листал историю вверх — не дёргаем.

/** Допуск «у конца»: пузырь «печатает…» и нижний отступ ленты не должны считаться «листает вверх». */
export const DIALOG_LIST_END_SLACK = 48;

export type DialogListScrollState = Readonly<{ offsetY: number; viewport: number; content: number }>;

/** Лента у конца: всё помещается или нижний край окна в пределах допуска от конца содержимого. */
export function isDialogListAtEnd(state: DialogListScrollState, slack: number = DIALOG_LIST_END_SLACK): boolean {
  if (state.content <= state.viewport) return true;
  return state.offsetY + state.viewport >= state.content - slack;
}

export type DialogListViewportDecision = 'stick_to_end' | 'first_layout' | 'same_height' | 'user_scrolled_up';

/** Плашка цели при свёрнутой карточке: высота 28 и зазор над лентой 8. */
export const DIALOG_GOAL_STRIP_HEIGHT = 28;
export const DIALOG_GOAL_STRIP_GAP = 8;
/** Решение координатора 25.10: плашку показываем, только если ленте с ней остаётся не меньше 220 dp. */
export const DIALOG_GOAL_STRIP_MIN_LIST = 220;

/** Помещается ли плашка цели. Считаем по высоте ленты БЕЗ плашки, иначе показ плашки сам бы её и убирал (дрожание). */
export function dialogGoalStripFits(input: Readonly<{ listHeight: number; stripShown: boolean }>): boolean {
  const withoutStrip = input.listHeight + (input.stripShown ? DIALOG_GOAL_STRIP_HEIGHT + DIALOG_GOAL_STRIP_GAP : 0);
  return withoutStrip - DIALOG_GOAL_STRIP_HEIGHT - DIALOG_GOAL_STRIP_GAP >= DIALOG_GOAL_STRIP_MIN_LIST;
}

/** Окно ленты поменяло высоту: докрутить к концу, только если человек был у конца. */
export function dialogListViewportDecision(input: Readonly<{
  prevViewport: number;
  viewport: number;
  wasAtEnd: boolean;
}>): DialogListViewportDecision {
  if (input.prevViewport <= 0) return 'first_layout';
  if (input.viewport === input.prevViewport) return 'same_height';
  return input.wasAtEnd ? 'stick_to_end' : 'user_scrolled_up';
}
