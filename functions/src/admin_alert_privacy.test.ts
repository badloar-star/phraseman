import {
  escapeTelegramHtml,
  maskId,
  renderAdminAlertMessage,
  sanitizePublicNickname,
  redactAdminAlertText,
} from './admin_alert_privacy';
import { ADMIN_ALERT_IDS } from './admin_alert_catalog';
import { ADMIN_ALERT_TEMPLATES } from './admin_alert_templates';

describe('admin Telegram alert privacy formatter', () => {
  test('renders the unique nickname without substituting a masked identifier', () => {
    const message = renderAdminAlertMessage({
      eventType: 'newUser',
      occurredAtMs: Date.UTC(2026, 8, 12, 14, 32),
      payload: {
        platform: 'android',
        language: 'ru',
        source: 'referral',
        nickname: 'Виталий 3',
        uidLast4: '8F2A',
      },
    });

    expect(message).toContain('<b>НОВЫЙ ЧЕЛОВЕК В PHRASEMAN</b>');
    expect(message).toContain('Виталий 3');
    expect(message).not.toContain('••••8F2A');
    expect(message).not.toContain('uid-very-long-secret');
  });

  test('never renders arbitrary PII or diagnostic fields from a payment payload', () => {
    const message = renderAdminAlertMessage({
      eventType: 'premiumPurchase',
      occurredAtMs: Date.UTC(2026, 8, 12, 14, 32),
      payload: {
        provider: 'app_store',
        product: 'yearly',
        environment: 'production',
        amount: 39.99,
        currency: 'EUR',
        uidLast4: '4C9D',
        email: 'owner-leak@example.com',
        uid: 'uid-very-long-secret',
        activationCode: 'PLUS-SECRET-CODE',
        transactionId: 'transaction-secret-123',
        telegramUserId: '99887766',
        stack: 'Error for uid-very-long-secret at owner-leak@example.com',
        context: { nested: 'PLUS-SECRET-CODE' },
      } as never,
    });

    expect(message).toContain('<b>КУПИЛИ PREMIUM</b>');
    expect(message).toContain('39,99 €');
    expect(message).not.toContain('••••4C9D');
    expect(message).not.toContain('owner-leak@example.com');
    expect(message).not.toContain('uid-very-long-secret');
    expect(message).not.toContain('PLUS-SECRET-CODE');
    expect(message).not.toContain('transaction-secret-123');
    expect(message).not.toContain('99887766');
    expect(message).not.toContain('stack');
  });

  test('shows the owner-requested report text but not arbitrary stack fields', () => {
    const message = renderAdminAlertMessage({
      eventType: 'contentReport',
      occurredAtMs: Date.UTC(2026, 8, 12, 14, 32),
      payload: {
        category: 'wrong_answer',
        severity: 'high',
        uidLast4: 'A1B2',
        route: '#reports',
        details: [{ label: 'Текст репорта', value: 'Не работает кнопка <Далее> & выход' }],
        stack: 'private stack trace',
      } as never,
    });

    expect(message).toContain('wrong_answer');
    expect(message).toContain('◆ ВЫСОКИЙ ПРИОРИТЕТ');
    expect(message).toContain('legacy.html#reports');
    expect(message).toContain('Не работает кнопка &lt;Далее&gt; &amp; выход');
    expect(message).not.toContain('private stack trace');
  });

  test('renders ratings and the corresponding feedback text', () => {
    const message = renderAdminAlertMessage({
      eventType: 'lessonRating',
      occurredAtMs: Date.UTC(2026, 8, 12, 14, 32),
      payload: {
        rating: 4,
        category: 'lesson',
        uidLast4: 'C3D4',
        details: [{ label: 'Отзыв', value: 'В диалоге слишком тихий звук' }],
      } as never,
    });

    expect(message).toContain('Оценка: 4/5');
    expect(message).toContain('В диалоге слишком тихий звук');
  });

  test('renders critical error app version and public nickname', () => {
    const message = renderAdminAlertMessage({
      eventType: 'criticalError',
      occurredAtMs: Date.UTC(2026, 8, 12, 17, 25, 43),
      payload: {
        category: 'practice_runes',
        severity: 'critical',
        platform: 'ios',
        nickname: 'Alex12300',
        appVersion: '1.6.15',
        route: '#app-health',
      },
    });
    expect(message).toContain('<b>Alex12300</b>');
    expect(message).toContain('v1.6.15');
  });

  test('escapes Telegram HTML and only accepts public-handle nicknames', () => {
    expect(escapeTelegramHtml('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
    expect(sanitizePublicNickname('alex_learner-7')).toBe('alex_learner-7');
    expect(sanitizePublicNickname('Виталий 3')).toBe('Виталий 3');
    expect(sanitizePublicNickname('Nova 48213')).toBe('Nova 48213');
    expect(sanitizePublicNickname('Alex Smith <alex@example.com>')).toBe('');
    expect(maskId('uid-12345678')).toBe('••••5678');
  });

  test.each(ADMIN_ALERT_IDS)('%s renders its own hero headline and never a masked id', (eventType) => {
    const message = renderAdminAlertMessage({ eventType, occurredAtMs: 1725000000000, payload: {} });
    const template = ADMIN_ALERT_TEMPLATES[eventType];
    expect(message).toContain(`${template.emoji} <b>${template.hero}</b>`);
    expect(message).not.toContain('••••');
    // зачем: владелец убрал заглушки — пустое поле не печатается вообще.
    expect(message).not.toContain('ник не найден');
    expect(message).not.toContain('не передана клиентом');
  });

  test('money keeps the currency the person actually paid in', () => {
    // зачем: владелец 2026-09-13 отменил пересчёт в евро («пусть будет как есть,
    // не надо конвертировать»). Показываем факт платежа, а не приблизительную
    // цифру по одному курсу, которую нельзя свести с отчётом магазина.
    const rub = renderAdminAlertMessage({ eventType: 'premiumPurchase', occurredAtMs: 1725000000000,
      payload: { amount: 1200, currency: 'RUB' } });
    expect(rub).toContain('1 200,00 RUB');
    expect(rub).not.toContain('EUR_PER_USD');

    const eur = renderAdminAlertMessage({ eventType: 'renewal', occurredAtMs: 1725000000000,
      payload: { amount: 11.49, currency: 'EUR' } });
    expect(eur).toContain('11,49 €');

    const shard = renderAdminAlertMessage({ eventType: 'ugcPurchase', occurredAtMs: 1725000000000,
      payload: { amount: 250, currency: 'SHARD' } });
    expect(shard).toContain('250,00 SHARD');
  });

  test('every catalog type has a unique template: hero, emoji and id', () => {
    const heroes = new Set(ADMIN_ALERT_IDS.map((id) => ADMIN_ALERT_TEMPLATES[id].hero));
    const emojis = new Set(ADMIN_ALERT_IDS.map((id) => ADMIN_ALERT_TEMPLATES[id].emoji));
    expect(heroes.size).toBe(ADMIN_ALERT_IDS.length);
    expect(emojis.size).toBe(ADMIN_ALERT_IDS.length);
  });

  test('opposite outcomes get their own headline instead of a misleading one', () => {
    const unbanned = renderAdminAlertMessage({ eventType: 'banChanged', occurredAtMs: 1725000000000, payload: { status: 'unbanned' } });
    expect(unbanned).toContain('БАН СНЯТ');
    expect(unbanned).not.toContain('БАН ВЫДАН');
    const recovered = renderAdminAlertMessage({ eventType: 'cronHealth', occurredAtMs: 1725000000000, payload: { status: 'recovered' } });
    expect(recovered).toContain('ЗАДАЧА ВОССТАНОВИЛАСЬ');
    const lowRating = renderAdminAlertMessage({ eventType: 'lessonRating', occurredAtMs: 1725000000000, payload: { rating: 1 } });
    expect(lowRating).toContain('НИЗКАЯ ОЦЕНКА УРОКА');
  });

  test('redacts credentials even inside quoted JSON or Basic auth diagnostics', () => {
    const value = redactAdminAlertText('{"apiKey":"PRIVATE_KEY_123","password": "SECRET_PASSWORD"} Authorization: Basic c2VjcmV0');
    expect(value).not.toMatch(/PRIVATE_KEY_123|SECRET_PASSWORD|c2VjcmV0/);
  });

  test.each([
    'client_secret="TOP SECRET VALUE"', 'Cookie: session=SUPERSECRET; auth=OTHERSECRET',
    'https://service.invalid/path?token=SUPERSECRET&signature=OTHERSECRET',
    'https://login:SUPERSECRET@service.invalid/path', 'sk_live_SUPERSECRET', 'whsec_SUPERSECRET',
    '-----BEGIN PRIVATE KEY-----\nSUPERSECRET\n-----END PRIVATE KEY-----',
    'GITHUB_TOKEN=ghp_SUPERSECRET123456789', 'AWS_SECRET_ACCESS_KEY=SUPERSECRET123456789',
    'postgres://user:SUPERSECRET123456789@db.invalid/app', 'password=TOP SECRET VALUE',
  ])('redacts supported credential shapes: %s', (value) => {
    expect(redactAdminAlertText(value)).not.toMatch(/SUPERSECRET|OTHERSECRET|TOP SECRET VALUE/);
  });

  test.each(['premiumPurchase', 'adminAudit'] as const)('%s cannot bypass its field policy with generic details', (eventType) => {
    const result = renderAdminAlertMessage({ eventType, occurredAtMs: 1725000000000,
      payload: { details: [{ label: 'Данные', value: '{"transactionId":"PRIVATE"}' }, { label: 'Стек ошибки', value: 'RAW ORDER PRIVATE' }] } });
    expect(result).not.toContain('PRIVATE');
  });

  test('keeps the largest accepted metadata and pathological body below message and document limits', () => {
    const { renderAdminAlertMessages } = require('./admin_alert_privacy');
    const messages: string[] = renderAdminAlertMessages({ eventType: 'contentReport', occurredAtMs: 1725000000000,
      payload: { nickname: '"'.repeat(32), appVersion: '9'.repeat(64), platform: 'x'.repeat(64), relatedNickname: '"'.repeat(32), relatedRole: 'x'.repeat(64), route: '#' + 'x'.repeat(10000),
        details: ['Текст репорта', 'Контент', 'Ответ пользователя'].map((label) => ({ label, value: '&'.repeat(70000) })) } });
    expect(messages.every((message) => message.length <= 4096)).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(messages), 'utf8')).toBeLessThan(800000);
    expect(messages.join('')).toContain('продолжение в админке');
  });

  test.each(ADMIN_ALERT_IDS.filter((id) => id !== 'ownerDailyDigest'))('%s retains event version, build and nickname', (eventType) => {
    const message = renderAdminAlertMessage({ eventType, occurredAtMs: 1725000000000,
      payload: { nickname: 'Мария 12', appVersion: '1.6.15', buildNumber: '215' } as never });
    expect(message).toContain('Мария 12');
    expect(message).toContain('v1.6.15 (215)');
  });

  test('renders one complete daily digest without accepting arbitrary metric text', () => {
    const metrics = ADMIN_ALERT_IDS
      .filter((eventType) => eventType !== 'ownerDailyDigest')
      .map((eventType, index) => ({ eventType, count: index }));
    const message = renderAdminAlertMessage({
      eventType: 'ownerDailyDigest',
      occurredAtMs: Date.parse('2026-09-12T18:59:59.999Z'),
      payload: {
        count: 31,
        windowStartMs: Date.parse('2026-09-11T19:00:00Z'),
        windowEndMs: Date.parse('2026-09-12T19:00:00Z'),
        metrics: [...metrics, { eventType: 'evil' as never, count: 999 }],
        route: '#alerts',
        status: '<script>private</script>',
      },
    });
    expect(message).toContain('11.09.2026, 20:00 → 12.09.2026, 20:00');
    expect(message).toContain('Новый пользователь');
    expect(message).toContain('Paywall funnel');
    expect(message).not.toContain('evil');
    expect(message).not.toContain('private');
    expect(message).not.toContain('Ирландия');
    expect(message.length).toBeLessThanOrEqual(4096);
  });

  test('uses readable Telegram blocks for long human text and compact metadata', () => {
    const message = renderAdminAlertMessage({
      eventType: 'contentReport', occurredAtMs: Date.parse('2026-09-13T05:48:00Z'),
      payload: {
        nickname: 'Tanya', appVersion: '1.6.17', buildNumber: '215', platform: 'ios',
        category: 'practice_runes', severity: 'critical', route: '#reports',
        details: [
          {label: 'Текст репорта', value: 'Кнопка Далее не отвечает, когда открываю урок'},
        ],
      },
    });
    expect(message).toContain('<b>ЖАЛОБА НА КОНТЕНТ</b>');
    expect(message).toContain('<code>◆ КРИТИЧНО</code>');
    expect(message).toContain('<b>Tanya</b>');
    expect(message).toContain('v1.6.17');
    expect(message).toContain('<blockquote>Категория: <b>practice_runes</b></blockquote>');
    expect(message).toContain('<blockquote>Кнопка Далее не отвечает, когда открываю урок</blockquote>');
    expect(message).not.toContain('Ирландия');

    const technicalMessage = renderAdminAlertMessage({eventType: 'criticalError', occurredAtMs: Date.parse('2026-09-13T05:48:00Z'), payload: {
      nickname: 'Tanya', appVersion: '1.6.17', details: [{label: 'Стек ошибки', value: 'Error: sample_stack_line'}],
    }});
    expect(technicalMessage).toContain('<blockquote expandable>Error: sample_stack_line</blockquote>');
    expect(technicalMessage).not.toContain('<blockquote expandable><pre>');
  });

  test('does not add the Ireland label to ordinary notification timestamps', () => {
    const message = renderAdminAlertMessage({eventType: 'criticalError', occurredAtMs: Date.parse('2026-09-13T05:48:00Z'), payload: {
      nickname: 'Tanya', appVersion: '1.6.17', platform: 'ios', category: 'practice_runes', severity: 'critical',
    }});
    expect(message).toContain('Время: <code>13.09.2026, 06:48</code>');
    expect(message).not.toContain('Ирландия');
  });
});
