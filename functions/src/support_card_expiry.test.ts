import { expireJarvisCardButtons } from './jarvis/telegram_send';

/**
 * зачем этот файл (владелец, 2026-08-17: «я нажал уже кучу раз, а оно всё
 * приходит и приходит»): карточка ответа пересоздаётся каждый час, и в чате
 * скопилось ПЯТЬ версий, у каждой кнопки «Отправить / Правки / Отменить».
 * Живая всегда только последняя — токены прежних погашены. Владелец жал на
 * старую, нажатие уходило в пустоту, и это читалось как «ничего не работает».
 * Половина разбора ушла на этот симптом, а причина была в интерфейсе.
 *
 * Проверяем именно защиту от мусорных входов: снятие кнопок не должно ни
 * бросать, ни ходить в сеть на пустом номере — иначе одна плохая запись
 * уронит отправку нового ответа.
 */

describe('expireJarvisCardButtons — гашение кнопок прежней карточки', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  test('без номера сообщения в сеть не ходим', async () => {
    // зачем: telegramMessageId=0 означает «отправлено, но номер не разобрался».
    // Запрос с нулём получил бы отказ API и зря потратил вызов.
    let called = false;
    global.fetch = (async () => { called = true; return { ok: true } as Response; }) as typeof fetch;
    for (const messageId of [0, -1, Number.NaN, 1.5]) {
      expect(await expireJarvisCardButtons({
        botToken: 'token', chatId: '123', messageId, note: 'stale',
      })).toBe(false);
    }
    expect(called).toBe(false);
  });

  test('без токена или чата тоже молчим', async () => {
    let called = false;
    global.fetch = (async () => { called = true; return { ok: true } as Response; }) as typeof fetch;
    expect(await expireJarvisCardButtons({ botToken: '', chatId: '1', messageId: 5, note: '' })).toBe(false);
    expect(await expireJarvisCardButtons({ botToken: 't', chatId: '', messageId: 5, note: '' })).toBe(false);
    expect(called).toBe(false);
  });

  test('нормальный вызов снимает клавиатуру', async () => {
    let body: Record<string, unknown> = {};
    let url = '';
    global.fetch = (async (input: unknown, init?: RequestInit) => {
      url = String(input);
      body = JSON.parse(String(init?.body ?? '{}'));
      return { ok: true } as Response;
    }) as unknown as typeof fetch;

    expect(await expireJarvisCardButtons({
      botToken: 'token', chatId: '42', messageId: 777, note: 'stale',
    })).toBe(true);
    expect(url).toContain('editMessageReplyMarkup');
    expect(body.message_id).toBe(777);
    // Пустой inline_keyboard — это и есть «кнопок больше нет».
    expect(body.reply_markup).toEqual({ inline_keyboard: [] });
  });

  test('отказ Telegram не бросает — отправка нового ответа важнее', async () => {
    // Telegram запрещает правку сообщений старше 48 часов, и владелец мог
    // удалить сообщение вручную. Оба случая — норма, а не сбой.
    global.fetch = (async () => ({ ok: false } as Response)) as typeof fetch;
    expect(await expireJarvisCardButtons({
      botToken: 'token', chatId: '42', messageId: 777, note: 'stale',
    })).toBe(false);
  });

  test('обрыв сети не бросает', async () => {
    global.fetch = (async () => { throw new Error('network down'); }) as typeof fetch;
    await expect(expireJarvisCardButtons({
      botToken: 'token', chatId: '42', messageId: 777, note: 'stale',
    })).resolves.toBe(false);
  });
});
