import type { ApprovalAction } from './approval_token';
import type { InlineKeyboard } from './telegram_buttons';

/**
 * Заменяет ТОЛЬКО нажатую строку клавиатуры Джарвиса статичной надписью
 * «✅ Одобрено» / «✕ Отклонено», остальные строки (другие департаменты той
 * же сводки) остаются активными.
 *
 * зачем нельзя editMessageText вместо этого: у нас нет исходного текста
 * сообщения (Telegram не присылает его в callback-апдейте отдельно от
 * reply_markup), а editMessageText требует передать текст целиком —
 * пришлось бы реконструировать его или рисковать испортить форматирование.
 * editMessageReplyMarkup меняет только клавиатуру и безопасен без текста.
 *
 * зачем искать по точному совпадению callback_data, а не по nonce: approve
 * и reject одного решения — это ДВА РАЗНЫХ токена (два разных вызова
 * issueApprovalToken в issue_decision_buttons.ts), у них разные nonce.
 * Единственный надёжный ключ — сам callback_data, который прислал Telegram.
 */
const NOOP_CALLBACK_DATA = 'jv1:noop';

export function markRowDecided(
  keyboard: InlineKeyboard | null | undefined,
  pressedCallbackData: string,
  action: ApprovalAction,
): InlineKeyboard | null {
  if (!keyboard) return null;
  const rowIndex = keyboard.inline_keyboard.findIndex(
    (row) => row.some((button) => button.callback_data === pressedCallbackData),
  );
  if (rowIndex === -1) return null;

  const decidedRow = [Object.freeze({
    text: action === 'approve' ? '✅ Одобрено' : '✕ Отклонено',
    callback_data: NOOP_CALLBACK_DATA,
  })];

  return Object.freeze({
    inline_keyboard: Object.freeze(
      keyboard.inline_keyboard.map((row, index) => (index === rowIndex ? decidedRow : row)),
    ),
  });
}
