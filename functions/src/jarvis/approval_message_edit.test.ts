import { markRowDecided } from './approval_message_edit';
import type { InlineKeyboard } from './telegram_buttons';

/**
 * Заменяет ТОЛЬКО нажатую строку клавиатуры на статичный «✅ Одобрено»/
 * «✕ Отклонено», остальные строки (другие департаменты той же сводки)
 * остаются активными — владелец должен успеть нажать их тоже.
 */

function keyboard(rows: readonly (readonly { text: string; callback_data: string }[])[]): InlineKeyboard {
  return { inline_keyboard: rows };
}

describe('markRowDecided', () => {
  test('replaces only the row containing the pressed callback_data', () => {
    const kb = keyboard([
      [{ text: '✅ Качество', callback_data: 'jv1:a:aaa' }, { text: '✕', callback_data: 'jv1:r:bbb' }],
      [{ text: '✅ Рост', callback_data: 'jv1:a:ccc' }, { text: '✕', callback_data: 'jv1:r:ddd' }],
    ]);
    const result = markRowDecided(kb, 'jv1:a:aaa', 'approve');
    expect(result?.inline_keyboard[0]).toEqual([{ text: '✅ Одобрено', callback_data: 'jv1:noop' }]);
    expect(result?.inline_keyboard[1]).toEqual(kb.inline_keyboard[1]);
  });

  test('renders a reject decision distinctly from approve', () => {
    const kb = keyboard([[{ text: '✅ Качество', callback_data: 'jv1:a:aaa' }, { text: '✕', callback_data: 'jv1:r:bbb' }]]);
    const result = markRowDecided(kb, 'jv1:r:bbb', 'reject');
    expect(result?.inline_keyboard[0]).toEqual([{ text: '✕ Отклонено', callback_data: 'jv1:noop' }]);
  });

  test('returns null when the callback_data is not found in the keyboard', () => {
    const kb = keyboard([[{ text: '✅ Качество', callback_data: 'jv1:a:aaa' }, { text: '✕', callback_data: 'jv1:r:bbb' }]]);
    expect(markRowDecided(kb, 'jv1:a:zzz', 'approve')).toBeNull();
  });

  test('returns null for a null/undefined keyboard — nothing to edit', () => {
    expect(markRowDecided(null, 'jv1:a:aaa', 'approve')).toBeNull();
    expect(markRowDecided(undefined, 'jv1:a:aaa', 'approve')).toBeNull();
  });

  test('leaves a three-department keyboard with two untouched rows after one decision', () => {
    const kb = keyboard([
      [{ text: '✅ Качество', callback_data: 'jv1:a:aaa' }, { text: '✕', callback_data: 'jv1:r:bbb' }],
      [{ text: '✅ Рост', callback_data: 'jv1:a:ccc' }, { text: '✕', callback_data: 'jv1:r:ddd' }],
      [{ text: '✅ Деньги', callback_data: 'jv1:a:eee' }, { text: '✕', callback_data: 'jv1:r:fff' }],
    ]);
    const result = markRowDecided(kb, 'jv1:r:ddd', 'reject');
    expect(result?.inline_keyboard).toHaveLength(3);
    expect(result?.inline_keyboard[0]).toEqual(kb.inline_keyboard[0]);
    expect(result?.inline_keyboard[1]).toEqual([{ text: '✕ Отклонено', callback_data: 'jv1:noop' }]);
    expect(result?.inline_keyboard[2]).toEqual(kb.inline_keyboard[2]);
  });
});
