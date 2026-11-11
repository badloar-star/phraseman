// Сторож (владелец 11.11): заказ Telegram-бота после ввода кода не должен вечно числиться «ждёт активации».
import fs from 'fs';
import path from 'path';

import {
  TELEGRAM_ORDER_ACTIVATED_STATUS,
  decideTelegramOrderMark,
  markTelegramOrderActivatedByCode,
  telegramOrderIdFromPromoCodeDoc,
} from './promo_code_telegram_order';

describe('telegramOrderIdFromPromoCodeDoc', () => {
  it('разбирает note, который пишет бот', () => {
    expect(telegramOrderIdFromPromoCodeDoc({ note: 'telegram_stars telegram_premium_orders/stxAb_C-9' })).toBe('stxAb_C-9');
  });

  it('код сайта и админский код не дают id заказа бота', () => {
    expect(telegramOrderIdFromPromoCodeDoc({ note: 'web_checkout web_premium_orders/KafsNls2' })).toBe('');
    expect(telegramOrderIdFromPromoCodeDoc({ note: 'выдан вручную' })).toBe('');
    expect(telegramOrderIdFromPromoCodeDoc(undefined)).toBe('');
  });

  it('не принимает id с путём — защита от записи не туда', () => {
    expect(telegramOrderIdFromPromoCodeDoc({ note: 'telegram_stars telegram_premium_orders/abc/users/victim' })).toBe('');
  });
});

describe('decideTelegramOrderMark', () => {
  const pending = { status: 'paid_pending_activation', activationCode: 'WEB-AAA' };

  it('ждущий заказ со своим кодом помечается', () => {
    expect(decideTelegramOrderMark(pending, 'WEB-AAA')).toBe('marked');
  });

  it('чужой код, пропавший заказ и уже закрытый/возвращённый заказ не трогаются', () => {
    expect(decideTelegramOrderMark(pending, 'WEB-BBB')).toBe('code_mismatch');
    expect(decideTelegramOrderMark(null, 'WEB-AAA')).toBe('order_missing');
    expect(decideTelegramOrderMark({ ...pending, status: 'refunded' }, 'WEB-AAA')).toBe('status_not_pending');
    expect(decideTelegramOrderMark({ ...pending, status: 'vip_activated' }, 'WEB-AAA')).toBe('status_not_pending');
  });
});

describe('markTelegramOrderActivatedByCode', () => {
  function fakeDb(order: Record<string, unknown> | null) {
    const writes: Record<string, unknown>[] = [];
    const ref = { id: 'order-1' };
    const tx = {
      get: async () => ({ exists: order !== null, data: () => order }),
      set: (_ref: unknown, data: Record<string, unknown>) => { writes.push(data); },
    };
    const db = {
      collection: (name: string) => ({ doc: (id: string) => ({ ...ref, path: `${name}/${id}` }) }),
      runTransaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    };
    return { db: db as never, writes };
  }
  const params = { orderId: 'order-1', code: 'WEB-AAA', stableUid: 'user-1', nowMs: 1000, vipUntilMs: 5000 };

  it('пишет статус выполненного заказа и не трогает поле, на которое подписано уведомление', async () => {
    const { db, writes } = fakeDb({ status: 'paid_pending_activation', activationCode: 'WEB-AAA' });
    await expect(markTelegramOrderActivatedByCode(db, params)).resolves.toBe('marked');
    expect(writes).toEqual([{
      status: TELEGRAM_ORDER_ACTIVATED_STATUS,
      activatedVia: 'code',
      activatedAt: 1000,
      activatedUntil: 5000,
      activatedUserId: 'user-1',
      activationCodeUsed: 'WEB-AAA',
    }]);
    expect(writes[0]).not.toHaveProperty('testerActivationStatus');
  });

  it('ничего не пишет, если заказ не ждёт этот код', async () => {
    const { db, writes } = fakeDb({ status: 'refunded', activationCode: 'WEB-AAA' });
    await expect(markTelegramOrderActivatedByCode(db, params)).resolves.toBe('status_not_pending');
    expect(writes).toEqual([]);
  });
});

it('ввод кода вызывает отметку заказа бота после выдачи доступа, и её сбой не немой', () => {
  const source = fs.readFileSync(path.join(__dirname, 'promo_codes.ts'), 'utf8');
  expect(source).toMatch(/telegramOrderId: telegramOrderIdFromPromoCodeDoc\(/);
  expect(source).toMatch(/await markTelegramOrderActivatedByCode\(db, \{[\s\S]*?\}\);[\s\S]*?catch \(e\) \{[\s\S]*?telegram-заказ НЕ помечен выполненным/);
});
