import { mistakeCheckCopy } from '../components/mistakes-panel/checkCopy';

// зачем (владелец 11.11, D203, вкладка «Проверка»): заголовки групп по сроку. У русского, украинского и польского
// форма слова зависит от числа — «через 2 дня», но «через 5 дней»; ошибка здесь видна человеку сразу.
describe('mistake check tab copy', () => {
  test('russian picks the word form by the number', () => {
    const copy = mistakeCheckCopy('ru');
    expect(copy.tab).toBe('Проверка');
    expect(copy.cta).toBe('Проверить');
    expect(copy.group({ kind: 'today' })).toBe('Сегодня');
    expect(copy.group({ kind: 'tomorrow' })).toBe('Завтра');
    expect(copy.group({ kind: 'days', days: 2 })).toBe('Через 2 дня');
    expect(copy.group({ kind: 'days', days: 3 })).toBe('Через 3 дня');
    expect(copy.group({ kind: 'days', days: 5 })).toBe('Через 5 дней');
    expect(copy.group({ kind: 'days', days: 11 })).toBe('Через 11 дней');
    expect(copy.group({ kind: 'days', days: 21 })).toBe('Через 21 день');
    expect(copy.group({ kind: 'days', days: 22 })).toBe('Через 22 дня');
  });

  test('ukrainian picks the word form by the number', () => {
    const copy = mistakeCheckCopy('uk');
    expect(copy.group({ kind: 'days', days: 2 })).toBe('Через 2 дні');
    expect(copy.group({ kind: 'days', days: 5 })).toBe('Через 5 днів');
    expect(copy.group({ kind: 'days', days: 21 })).toBe('Через 21 день');
  });

  test('every group label is a non-empty string and carries the number', () => {
    for (const kind of ['today', 'tomorrow'] as const) {
      expect(mistakeCheckCopy('ru').group({ kind }).length).toBeGreaterThan(0);
    }
    expect(mistakeCheckCopy('ru').group({ kind: 'days', days: 7 })).toContain('7');
    expect(mistakeCheckCopy('uk').group({ kind: 'days', days: 7 })).toContain('7');
  });
});
