// Жалоба №9 (29.10, владелец «Да, чинить + логи»): ник в данных счёта ломал оплату при длинном кириллическом нике — «invoice payload
// too long» (лимит Telegram 128 байт). Сторож: данные счёта v2 не несут ника и укладываются в лимит при любом нике; старые данные v1
// (с ником) по-прежнему разбираются — Stars-подписка продлевается со своими исходными данными.
import fs from 'fs';
import path from 'path';

import {
  TELEGRAM_INVOICE_NICKNAMES_KEEP,
  TELEGRAM_INVOICE_PAYLOAD_MAX_BYTES,
  buildTelegramInvoicePayloadV2,
  hashTelegramUserId,
  invoiceNicknamesToDrop,
  newTelegramInvoiceId,
  parseTelegramInvoicePayload,
  webhookUrlHost,
} from './telegram_premium_invoice_payload';

const v1 = (obj: Record<string, unknown>): string => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

describe('данные счёта Telegram Stars', () => {
  it('ник из 40 кириллических букв с эмодзи — данные v2 строятся и укладываются в 128 байт; ника внутри нет', () => {
    const nickname = `${'Александра'.repeat(4)}🙂🎉`;
    expect([...nickname].length).toBeGreaterThanOrEqual(40);
    for (const plan of ['monthly', 'yearly'] as const) {
      const payload = buildTelegramInvoicePayloadV2({
        plan, userId: 9_876_543_210_123, chatId: -1_009_876_543_210, invoiceId: newTelegramInvoiceId(), issuedAtSec: 1_893_456_000,
      });
      expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(TELEGRAM_INVOICE_PAYLOAD_MAX_BYTES);
      const decoded = Buffer.from(payload, 'base64url').toString('utf8');
      expect(decoded).not.toContain('Александра');
      const parsed = parseTelegramInvoicePayload(payload);
      expect(parsed).toMatchObject({ v: 2, plan, userId: 9_876_543_210_123, chatId: -1_009_876_543_210, appNickname: null });
      expect(parsed.invoiceId).toMatch(/^[0-9a-z]{8}$/);
    }
  });

  it('старые данные v1 (короткие поля u/c/n/t) разбираются вместе с ником', () => {
    const parsed = parseTelegramInvoicePayload(v1({ v: 1, p: 'y', u: 123, c: 456, n: '  Маша   К ', t: 1_800_000_000 }));
    expect(parsed).toMatchObject({ v: 1, plan: 'yearly', userId: 123, chatId: 456, appNickname: 'Маша К', invoiceId: null, issuedAt: 1_800_000_000 });
  });

  it('самые старые данные (длинные поля plan/userId/appNickname) разбираются', () => {
    const parsed = parseTelegramInvoicePayload(v1({ plan: 'monthly', userId: 1, chatId: 2, appNickname: 'Nick', issuedAt: 5 }));
    expect(parsed).toMatchObject({ v: 1, plan: 'monthly', userId: 1, chatId: 2, appNickname: 'Nick', issuedAt: 5 });
  });

  it('неизвестный тариф и плохой номер счёта отвергаются', () => {
    expect(() => parseTelegramInvoicePayload(v1({ p: 'x', plan: 'weekly', u: 1, c: 1 }))).toThrow('unknown plan');
    expect(() => buildTelegramInvoicePayloadV2({ plan: 'monthly', userId: 1, chatId: 1, invoiceId: 'BAD ID!', issuedAtSec: 1 })).toThrow('bad invoice id');
  });

  it('сессия помнит не больше 5 последних счетов: с новым счётом удаляются самые старые', () => {
    expect(invoiceNicknamesToDrop(undefined)).toEqual([]);
    const four = { a: { at: 1 }, b: { at: 2 }, c: { at: 3 }, d: { at: 4 } };
    expect(invoiceNicknamesToDrop(four)).toEqual([]); // 4 + новый = 5
    const seven = { ...four, e: { at: 5 }, f: { at: 6 }, g: { at: 7 } };
    expect(invoiceNicknamesToDrop(seven).sort()).toEqual(['a', 'b', 'c']); // остаются d..g + новый = 5
    expect(invoiceNicknamesToDrop({ x: {}, y: { at: 9 } }, 2)).toEqual(['x']); // запись без времени — самая старая
    expect(TELEGRAM_INVOICE_NICKNAMES_KEEP).toBe(5);
  });

  it('номер счёта — 8 знаков base36, разные подряд', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newTelegramInvoiceId()));
    for (const id of ids) expect(id).toMatch(/^[0-9a-z]{8}$/);
    expect(ids.size).toBe(50);
  });

  it('логи без id и без токена: хэш стабилен и не равен id; у адреса вебхука только хост', () => {
    expect(hashTelegramUserId(123456789)).toBe(hashTelegramUserId('123456789'));
    expect(hashTelegramUserId(123456789)).not.toContain('123456789');
    expect(hashTelegramUserId(undefined)).toBe('none');
    expect(webhookUrlHost('https://us-central1-x.cloudfunctions.net/telegramPremiumWebhook?secret=abc')).toBe('us-central1-x.cloudfunctions.net');
    expect(webhookUrlHost('')).toBeNull();
  });
});

describe('бот: ник не в данных счёта, логи [TG-PAY], без немых catch', () => {
  const source = fs.readFileSync(path.join(__dirname, 'telegram_premium_bot.ts'), 'utf8');

  it('данные счёта строит только v2 с номером счёта, ник уходит в сессию', () => {
    expect(source).not.toMatch(/function buildInvoicePayload\(/);
    expect(source).toContain('buildTelegramInvoicePayloadV2({');
    expect(source).toContain("const nicknamesPatch: Record<string, unknown> = { [invoiceId]: { n: appNickname");
    expect(source).toContain('for (const id of dropped) nicknamesPatch[id] = admin.firestore.FieldValue.delete();');
    expect(source).toContain('const orderNickname = await resolveOrderNickname(userId, payload);');
    expect(source).toContain('appNickname: orderNickname,');
  });

  it('пять мест журнала [TG-PAY] на месте; немых catch {} нет; токен в журнал не пишется', () => {
    for (const marker of ["'update'", "'invoice:prepared'", "'invoice:failed'", "'pre_checkout:answered'", "'pre_checkout:answer_failed'", "'webhook:response'", "'webhook_info'", "'order:nickname'"]) {
      expect(source).toContain(marker);
    }
    // код вида «} catch {» (без переменной ошибки) — немой; комментарий «немой catch {}» не считается
    expect(source).not.toMatch(/\}\s*catch\s*\{/);
    expect(source).not.toMatch(/console\.\w+\([^)]*PHRASEMAN_PREMIUM_BOT_TOKEN/);
  });
});
