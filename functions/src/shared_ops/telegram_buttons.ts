/**
 * Клавиатура подтверждений под сводкой Джарвиса.
 *
 * зачем отдельный модуль: раскладка кнопок — вопрос не транспорта, а
 * безопасности пальца. Промах по кнопке подтверждает не то решение, поэтому
 * правила раскладки закреплены тестами.
 */

/** Больше пяти пар кнопок читать невозможно — остальное ждёт панели. */
export const MAX_BUTTON_ROWS = 5;

export interface DecisionButtonSpec {
  /** Название департамента — по нему вы узнаёте, что подтверждаете. */
  readonly label: string;
  readonly approveData: string;
  readonly rejectData: string;
}

export interface InlineButton {
  readonly text: string;
  readonly callback_data: string;
}

export interface InlineKeyboard {
  readonly inline_keyboard: readonly (readonly InlineButton[])[];
}

export function buildDecisionKeyboard(specs: readonly DecisionButtonSpec[]): InlineKeyboard | null {
  if (specs.length === 0) return null;

  // зачем пара в ОДНОЙ строке: если разложить столбцом, «отклонить» одного
  // решения окажется прямо под «принять» другого — промах пальцем подтвердит
  // не то, что вы хотели.
  const rows = specs.slice(0, MAX_BUTTON_ROWS).map((spec) => Object.freeze([
    Object.freeze({ text: `✅ ${spec.label}`, callback_data: spec.approveData }),
    Object.freeze({ text: '✕', callback_data: spec.rejectData }),
  ]));

  return Object.freeze({ inline_keyboard: Object.freeze(rows) });
}
