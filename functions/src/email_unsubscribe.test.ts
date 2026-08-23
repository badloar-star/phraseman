export {};

// ============================================================================
// Сторож ссылок отписки.
//
// зачем: 2026-08-23 в email_unsubscribe.ts нашли defineString с дефолтом
// 'phraseman-unsubscribe-dev-secret-change-me'. Дефолт срабатывал МОЛЧА —
// деплой из окружения без functions/.env подписывал бы ссылки строкой из
// открытого исходника, и любой мог подделать HMAC и массово отписать чужие
// адреса. Плюс EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET лежала в .env, но кодом не
// читалась: ротация секрета разом сломала бы ссылки в уже отправленных
// письмах (а там List-Unsubscribe-Post: One-Click, который Gmail/Yahoo
// требуют держать рабочим).
//
// Этот тест ловит возврат обоих дефектов. Сработал — чинить код, не тест.
// ============================================================================

const paramValues: Record<string, string> = {};

jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({
    name,
    value: () => paramValues[name] ?? '',
  }),
  defineString: (name: string, opts?: { default?: string }) => ({
    name,
    value: () => paramValues[name] ?? opts?.default ?? '',
  }),
}));

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-functions/logger', () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: { serverTimestamp: () => 'ts' },
}));

// зачем: значения собираются, а не пишутся литералом — сканер секретов
// (scripts/scan_secrets.mjs) справедливо ругается на «NAME=длинная строка»,
// и обходить его ради теста нельзя.
const material = (label: string) => [label, 'test', 'material', 'x'.repeat(24)].join('-');
const CURRENT = material('current');
const PREVIOUS = material('previous');
const REVOKED = material('revoked');

function load() {
  return require('./email_unsubscribe');
}

beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(paramValues)) delete paramValues[key];
  paramValues.EMAIL_UNSUBSCRIBE_SECRET = CURRENT;
});

describe('секрет отписки', () => {
  it('в исходнике нет дефолта-заглушки и секрет объявлен через defineSecret', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, 'email_unsubscribe.ts'),
      'utf8',
    );
    // Заглушка не должна вернуться ни в каком виде.
    expect(source).not.toMatch(/unsubscribe-dev-secret/);
    expect(source).toContain("defineSecret('EMAIL_UNSUBSCRIBE_SECRET')");
    // defineString с дефолтом для секрета — тихая заглушка, так нельзя.
    expect(source).not.toMatch(/defineString\(\s*'EMAIL_UNSUBSCRIBE_SECRET'/);
  });

  it('подпись без настроенного секрета падает, а не подписывает пустотой', () => {
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = '';
    const { unsubscribeToken } = load();
    expect(() => unsubscribeToken('user@gmail.com')).toThrow(/not configured/i);
  });

  it('публичная проверка при пустом секрете отвечает false, а не падает в 500', () => {
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = '';
    const { verifyUnsubscribeToken } = load();
    expect(() => verifyUnsubscribeToken('user@gmail.com', 'a'.repeat(32))).not.toThrow();
    expect(verifyUnsubscribeToken('user@gmail.com', 'a'.repeat(32))).toBe(false);
  });
});

describe('проверка токена', () => {
  it('свой токен принимается, чужой и пустой — нет', () => {
    const { unsubscribeToken, verifyUnsubscribeToken } = load();
    const token = unsubscribeToken('user@gmail.com');
    expect(verifyUnsubscribeToken('user@gmail.com', token)).toBe(true);
    expect(verifyUnsubscribeToken('other@gmail.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('user@gmail.com', '')).toBe(false);
    expect(verifyUnsubscribeToken('user@gmail.com', 'f'.repeat(32))).toBe(false);
  });

  it('регистр email не влияет на подпись', () => {
    const { unsubscribeToken, verifyUnsubscribeToken } = load();
    const token = unsubscribeToken('User@Gmail.com');
    expect(verifyUnsubscribeToken('user@gmail.com', token)).toBe(true);
  });
});

describe('ротация секрета', () => {
  it('ссылка из старого письма продолжает работать после ротации', () => {
    // Письмо ушло со старым секретом...
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = PREVIOUS;
    const oldToken = load().unsubscribeToken('user@gmail.com');

    // ...потом секрет ротировали: прежний уехал в PREVIOUS.
    jest.resetModules();
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = CURRENT;
    paramValues.EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET = PREVIOUS;
    const { verifyUnsubscribeToken, unsubscribeToken } = load();

    expect(verifyUnsubscribeToken('user@gmail.com', oldToken)).toBe(true);
    // Новые ссылки подписываются ТОЛЬКО текущим секретом.
    expect(unsubscribeToken('user@gmail.com')).not.toBe(oldToken);
  });

  it('без ротации прошлый секрет пуст и ничего не ослабляет', () => {
    const { verifyUnsubscribeToken } = load();
    expect(verifyUnsubscribeToken('user@gmail.com', '0'.repeat(32))).toBe(false);
  });

  it('токен, подписанный отозванным секретом, отвергается', () => {
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = REVOKED;
    const revokedToken = load().unsubscribeToken('user@gmail.com');

    jest.resetModules();
    paramValues.EMAIL_UNSUBSCRIBE_SECRET = CURRENT;
    paramValues.EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET = PREVIOUS;
    expect(load().verifyUnsubscribeToken('user@gmail.com', revokedToken)).toBe(false);
  });
});

describe('функции-потребители объявляют секреты', () => {
  it('каждая функция, строящая ссылку отписки, перечисляет EMAIL_UNSUBSCRIBE_SECRETS', () => {
    const fs = require('fs');
    const path = require('path');
    // зачем: без secrets[] в опциях рантайм не увидит значение и .value()
    // вернёт пустую строку — рассылка упадёт уже в проде, а не на сборке.
    for (const file of ['admin_email.ts', 'web_leads.ts', 'email_unsubscribe.ts']) {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(source).toContain('EMAIL_UNSUBSCRIBE_SECRETS');
    }
  });
});
