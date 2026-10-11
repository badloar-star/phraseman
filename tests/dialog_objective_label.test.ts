import { formatDialogObjectiveLabel } from '../components/dialogs/dialog_objective_label';

// зачем (Сверка dialogs-007/008/018/019): задания диалога показываются с заглавной и без точки в конце (макет «Заказать капучино…»).
describe('formatDialogObjectiveLabel', () => {
  test('capitalizes the first letter and drops the trailing period', () => {
    expect(formatDialogObjectiveLabel('поздороваться с собеседником')).toBe('Поздороваться с собеседником');
    expect(formatDialogObjectiveLabel('подтвердить финальное время.')).toBe('Подтвердить финальное время');
  });
  test('keeps an already formatted label, trims spaces and survives empty input', () => {
    expect(formatDialogObjectiveLabel('  Заказать капучино  ')).toBe('Заказать капучино');
    expect(formatDialogObjectiveLabel('')).toBe('');
    expect(formatDialogObjectiveLabel('order a coffee…')).toBe('Order a coffee…'.replace('…', '…'));
  });
});
