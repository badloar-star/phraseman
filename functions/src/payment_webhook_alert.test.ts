import {
  buildPaymentWebhookFailureDoc,
  paymentWebhookFailureId,
} from './payment_webhook_alert';

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;

describe('Payment webhook failure alert — деньги не должны падать молча', () => {
  test('падение вебхука становится критической ошибкой', () => {
    // зачем critical: adminAlertOnCriticalError шлёт в Telegram только их.
    // Ниже уровнем — владелец узнает о сбое оплаты от самого пользователя.
    const doc = buildPaymentWebhookFailureDoc({
      hook: 'shards',
      message: 'boom',
      nowMs: NOW,
    });
    expect(doc.severity).toBe('critical');
    expect(doc.platform).toBe('server');
  });

  test('в тексте видно, какой именно вебхук упал', () => {
    const doc = buildPaymentWebhookFailureDoc({
      hook: 'refund',
      message: 'timeout',
      nowMs: NOW,
    });
    expect(doc.context).toContain('refund');
    expect(String(doc.message)).toContain('timeout');
  });

  test('один документ в час на вебхук — лавина не создаёт лавину алертов', () => {
    // зачем: сбой провайдера длится минутами и роняет десятки запросов.
    // Без склейки владелец получил бы сотню одинаковых сообщений и
    // отключил бы канал — ровно то, от чего этот алерт защищает.
    const a = paymentWebhookFailureId('shards', NOW);
    const b = paymentWebhookFailureId('shards', NOW + 30 * 60_000);
    expect(a).toBe(b);
  });

  test('через час — новый документ, сбой не теряется', () => {
    expect(paymentWebhookFailureId('shards', NOW))
      .not.toBe(paymentWebhookFailureId('shards', NOW + HOUR));
  });

  test('разные вебхуки не склеиваются между собой', () => {
    expect(paymentWebhookFailureId('shards', NOW))
      .not.toBe(paymentWebhookFailureId('refund', NOW));
  });

  test('длинное сообщение обрезается, а не рвёт документ', () => {
    const doc = buildPaymentWebhookFailureDoc({
      hook: 'transfer',
      message: 'x'.repeat(5_000),
      nowMs: NOW,
    });
    expect(String(doc.message).length).toBeLessThanOrEqual(900);
  });

  test('в документ не попадает идентификатор пользователя', () => {
    // зачем: правило проекта — во внешние каналы уходят количества, не PII.
    // Алерт летит в Telegram, значит uid туда попасть не должен.
    const doc = buildPaymentWebhookFailureDoc({
      hook: 'shards',
      message: 'failed for user abc123xyz',
      nowMs: NOW,
      appUserId: 'abc123xyz',
    });
    expect(JSON.stringify(doc)).not.toContain('abc123xyz');
  });
});
