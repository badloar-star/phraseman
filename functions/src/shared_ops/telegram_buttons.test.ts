import { buildDecisionKeyboard, MAX_BUTTON_ROWS, type DecisionButtonSpec, type InlineKeyboard } from './telegram_buttons';

// зачем хелпер: buildDecisionKeyboard возвращает null для пустого списка,
// и это отдельно проверяется ниже. Здесь null означал бы провал теста.
function mustBuild(specs: readonly DecisionButtonSpec[]): InlineKeyboard {
  const kb = buildDecisionKeyboard(specs);
  if (!kb) throw new Error('ожидалась клавиатура, получен null');
  return kb;
}

describe('Jarvis telegram buttons — a press must be one tap and unmistakable', () => {
  test('builds an approve and a reject button for a decision', () => {
    const kb = mustBuild([
      { label: 'Платежи', approveData: 'jv1:a:aaa', rejectData: 'jv1:r:aaa' },
    ]);
    const flat = kb.inline_keyboard.flat();
    expect(flat).toHaveLength(2);
    expect(flat[0].callback_data).toBe('jv1:a:aaa');
    expect(flat[1].callback_data).toBe('jv1:r:aaa');
  });

  test('keeps approve and reject of the same decision on one row', () => {
    // зачем: иначе «отклонить» одного решения окажется под «принять» другого
    // и промах пальцем подтвердит не то.
    const kb = mustBuild([
      { label: 'A', approveData: 'jv1:a:1', rejectData: 'jv1:r:1' },
      { label: 'B', approveData: 'jv1:a:2', rejectData: 'jv1:r:2' },
    ]);
    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0].map((b) => b.callback_data)).toEqual(['jv1:a:1', 'jv1:r:1']);
    expect(kb.inline_keyboard[1].map((b) => b.callback_data)).toEqual(['jv1:a:2', 'jv1:r:2']);
  });

  test('names the department on the button, so a glance is enough', () => {
    const kb = mustBuild([
      { label: 'Безопасность', approveData: 'jv1:a:1', rejectData: 'jv1:r:1' },
    ]);
    expect(kb.inline_keyboard[0][0].text).toContain('Безопасность');
  });

  test('never exceeds the row cap — a wall of buttons is unusable', () => {
    const many = Array.from({ length: MAX_BUTTON_ROWS + 4 }, (_, i) => ({
      label: `D${i}`, approveData: `jv1:a:${i}`, rejectData: `jv1:r:${i}`,
    }));
    expect(mustBuild(many).inline_keyboard).toHaveLength(MAX_BUTTON_ROWS);
  });

  test('returns null when there is nothing to confirm — no empty keyboard', () => {
    expect(buildDecisionKeyboard([])).toBeNull();
  });

  test('callback_data stays within the 64-byte Telegram limit', () => {
    const kb = mustBuild([
      { label: 'Платежи', approveData: `jv1:a:${'n'.repeat(32)}`, rejectData: `jv1:r:${'n'.repeat(32)}` },
    ]);
    for (const button of kb.inline_keyboard.flat()) {
      expect(Buffer.byteLength(button.callback_data, 'utf8')).toBeLessThanOrEqual(64);
    }
  });
});
