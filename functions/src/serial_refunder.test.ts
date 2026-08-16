import {
  SERIAL_REFUND_THRESHOLD,
  buildSerialRefunderAlert,
  isSerialRefunder,
} from './serial_refunder';

describe('Серийный возвращатель — когда это уже закономерность', () => {
  test('два возврата у одного покупателя — уже серия', () => {
    // зачем именно два: ровно так считает детектор в админке
    // (legacy.html:24359, `r.serial = r.buyerCount >= 2`). Порог взят
    // оттуда, а не выдуман — иначе сигнал и список разошлись бы.
    expect(isSerialRefunder(2)).toBe(true);
    expect(SERIAL_REFUND_THRESHOLD).toBe(2);
  });

  test('один возврат — ещё не повод беспокоить', () => {
    expect(isSerialRefunder(1)).toBe(false);
  });

  test('ноль и мусор не считаются серией', () => {
    expect(isSerialRefunder(0)).toBe(false);
    expect(isSerialRefunder(Number.NaN)).toBe(false);
    expect(isSerialRefunder(-3)).toBe(false);
  });

  test('в тексте видно, сколько возвратов', () => {
    const text = buildSerialRefunderAlert({ refundCount: 4 });
    expect(text).toContain('4');
  });

  test('идентификатор покупателя в сообщение не попадает', () => {
    // зачем: правило проекта — во внешние каналы уходят количества, не PII.
    // Кто именно, владелец смотрит в админке, где есть имя рядом с uid.
    const text = buildSerialRefunderAlert({ refundCount: 3, buyerId: 'abc123xyz' });
    expect(text).not.toContain('abc123xyz');
  });

  test('сообщение подсказывает, куда идти', () => {
    // зачем: алерт без адреса — это тревога без действия, а такие
    // перестают читать первыми.
    expect(buildSerialRefunderAlert({ refundCount: 3 })).toMatch(/возврат|админк/i);
  });
});
