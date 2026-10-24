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
