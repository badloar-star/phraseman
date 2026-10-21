import { COMPACT_ALERT_MAX_LENGTH, renderCompactAdminAlert } from './admin_alert_compact';

const NOW = Date.parse('2026-10-21T12:00:00Z');

describe('compact Telegram alert (владелец 21.10, №48)', () => {
  test('purchase: plan, store, who and until — 3 lines with the admin link', () => {
    const text = renderCompactAdminAlert({
      eventType: 'premiumPurchase', occurredAtMs: NOW,
      payload: {
        provider: 'PLAY_STORE', product: 'phraseman_plus_yearly', environment: 'PRODUCTION', nickname: 'Vertex56818', route: '#revenue',
        details: [{ label: 'Окончание подписки', value: '2026-11-21T10:00:00.000Z' }],
      },
    });
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('💳 Plus · год · Google Play');
    expect(lines[1]).toBe('Vertex56818 · до 21.11.2026');
    expect(lines[2]).toBe('<a href="https://phraseman-ea0b3.web.app/legacy.html#revenue">→ админка</a>');
  });

  test('critical error: kind, device, version and «×N за час» — no nickname, no stack', () => {
    const text = renderCompactAdminAlert({
      eventType: 'criticalError', occurredAtMs: NOW,
      payload: {
        category: 'learning_v2', platform: 'ios 26', appVersion: '2.0.0', buildNumber: '141', nickname: 'Secret Name', route: '#app-health',
        details: [
          { label: 'Ошибка', value: 'Эпизод не завершился' },
          { label: 'Контекст', value: 'finish' },
          { label: 'Стек ошибки', value: 'at a\nat b\nat c' },
        ],
      },
    }, { count: 3 });
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('🔴 Эпизод не завершился · iPhone iOS 26');
    expect(lines[1]).toBe('learning_v2 · finish · v2.0.0 (141) · ×3 за час');
    expect(text).not.toContain('Secret Name');
    expect(text).not.toContain('at b');
  });

  test('a single occurrence does not print a counter', () => {
    const text = renderCompactAdminAlert({ eventType: 'criticalError', occurredAtMs: NOW, payload: { category: 'spire', appVersion: '2.0.0' } }, { count: 1 });
    expect(text).not.toContain('×');
  });

  test('long user text is cut to a short quote and the message stays ONE message', () => {
    const text = renderCompactAdminAlert({
      eventType: 'supportEmail', occurredAtMs: NOW,
      payload: { route: '#support', details: [{ label: 'Отправитель', value: 'Ирина' }, { label: 'Тема', value: 'Подписка' }, { label: 'Сообщение', value: 'Очень длинное письмо '.repeat(400) }] },
    });
    expect(text.length).toBeLessThanOrEqual(COMPACT_ALERT_MAX_LENGTH);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toContain('…');
    expect(text).not.toMatch(/Часть \d/);
  });

  test('HTML in user text is escaped', () => {
    const text = renderCompactAdminAlert({
      eventType: 'websiteInbox', occurredAtMs: NOW,
      payload: { route: '#site', details: [{ label: 'Сообщение', value: '<b>hi</b> & bye' }] },
    });
    expect(text).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye');
  });

  test('test purchase money never looks like a sale: zero amount is not printed', () => {
    const text = renderCompactAdminAlert({ eventType: 'premiumPurchase', occurredAtMs: NOW, payload: { provider: 'APP_STORE', product: 'plus_monthly', amount: 0, currency: 'USD' } });
    expect(text.split('\n')[0]).toBe('💳 Plus · месяц · App Store');
  });
});

describe('late money alert (Ревизор 21.10)', () => {
  test('the delay is shown at the end of the second line, still one message of 3 lines', () => {
    const text = renderCompactAdminAlert({
      eventType: 'premiumPurchase', occurredAtMs: NOW,
      payload: { provider: 'APP_STORE', product: 'plus_yearly', nickname: 'Vertex56818', route: '#revenue' },
    }, { lateMs: 75 * 60_000 });
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Vertex56818 · с опозданием 75 мин');
  });
});
