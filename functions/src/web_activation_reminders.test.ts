import { decideReminder, MAX_REMINDERS, REMINDER_SCHEDULE_DAYS } from './web_activation_reminders';

/*
 * Сторож расписания напоминаний о неактивированной покупке.
 *
 * зачем: 21.09.2026 трое оплативших на сайте остались без доступа, потому что
 * письмо с кодом провалилось и повторов не было. Тесты ниже проверяют не
 * «функция что-то вернула», а конкретные правила, нарушение которых снова
 * оставит человека без оплаченного доступа.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-21T12:00:00Z');

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    status: 'paid_pending_activation',
    paidAtMs: NOW - 3 * DAY,
    remindersSent: 0,
    lastReminderAtMs: 0,
    hasEmail: true,
    hasActivationCode: true,
    nowMs: NOW,
    ...overrides,
  };
}

describe('расписание напоминаний', () => {
  it('через 2 дня после оплаты шлёт первое напоминание', () => {
    const d = decideReminder(baseOrder({ paidAtMs: NOW - 2 * DAY }));
    expect(d).toEqual({ send: true, reminderIndex: 1 });
  });

  it('раньше 2 дней не шлёт — человек только что купил', () => {
    const d = decideReminder(baseOrder({ paidAtMs: NOW - 1 * DAY }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('not_due_yet');
  });

  it('второе напоминание ждёт 7 дней, а не 2', () => {
    const tooEarly = decideReminder(baseOrder({ paidAtMs: NOW - 5 * DAY, remindersSent: 1 }));
    expect(tooEarly.send).toBe(false);

    const due = decideReminder(baseOrder({ paidAtMs: NOW - 7 * DAY, remindersSent: 1 }));
    expect(due).toEqual({ send: true, reminderIndex: 2 });
  });

  it('третье напоминание ждёт 14 дней', () => {
    const due = decideReminder(baseOrder({ paidAtMs: NOW - 14 * DAY, remindersSent: 2 }));
    expect(due).toEqual({ send: true, reminderIndex: 3 });
  });

  it('после трёх напоминаний останавливается — это не спам', () => {
    const d = decideReminder(baseOrder({ paidAtMs: NOW - 30 * DAY, remindersSent: MAX_REMINDERS }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('limit_reached');
  });

  it('расписание именно 2/7/14 дней', () => {
    expect([...REMINDER_SCHEDULE_DAYS]).toEqual([2, 7, 14]);
  });
});

describe('защита от лишних писем', () => {
  it('активированный заказ писем не получает', () => {
    const d = decideReminder(baseOrder({ status: 'activated' }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('not_pending');
  });

  it('неоплаченный заказ (created) писем не получает', () => {
    const d = decideReminder(baseOrder({ status: 'created' }));
    expect(d.send).toBe(false);
  });

  it('два письма в сутки не уходят даже при повторном прогоне', () => {
    const d = decideReminder(baseOrder({
      paidAtMs: NOW - 10 * DAY,
      remindersSent: 1,
      lastReminderAtMs: NOW - 60 * 60 * 1000,
    }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('too_soon_after_last');
  });

  it('очень старый заказ не трогаем — там нужен живой человек', () => {
    const d = decideReminder(baseOrder({ paidAtMs: NOW - 90 * DAY }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('too_old');
  });

  it('без почты и без кода не шлём', () => {
    expect(decideReminder(baseOrder({ hasEmail: false })).send).toBe(false);
    expect(decideReminder(baseOrder({ hasActivationCode: false })).send).toBe(false);
  });

  it('заказ без даты оплаты не роняет крон', () => {
    const d = decideReminder(baseOrder({ paidAtMs: undefined }));
    expect(d.send).toBe(false);
    if (!d.send) expect(d.reason).toBe('no_paid_at');
  });
});

describe('реальные пострадавшие 2026-09', () => {
  /*
   * Три боевых заказа, из-за которых эта работа и появилась. Проверяем, что
   * крон возьмёт их в работу, а не пропустит.
   */
  const CASES = [
    { name: 'voldemaarr monthly 3.99 EUR', paidAt: Date.parse('2026-09-18T20:07:33Z') },
    { name: 'ssarapov yearly 27.99 EUR', paidAt: Date.parse('2026-09-19T08:58:41Z') },
    { name: 'sladeckova lifetime 99.99 EUR', paidAt: Date.parse('2026-08-28T16:42:59Z') },
  ];

  it.each(CASES)('$name получает напоминание', ({ paidAt }) => {
    const d = decideReminder(baseOrder({ paidAtMs: paidAt, nowMs: NOW }));
    expect(d.send).toBe(true);
  });

  it('провал доставки НЕ съедает лимит попыток', () => {
    // Ключ Resend был мёртв: письма проваливались. Если бы счётчик рос при
    // провале, после починки почты человек получил бы «лимит исчерпан»,
    // не увидев ни одного письма. Счётчик растёт только при успехе, поэтому
    // заказ с нулём отправленных обязан снова попасть в работу.
    const d = decideReminder(baseOrder({ paidAtMs: NOW - 20 * DAY, remindersSent: 0 }));
    expect(d).toEqual({ send: true, reminderIndex: 1 });
  });
});
