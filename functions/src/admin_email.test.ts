export {};

// Мокаем defineString до загрузки модуля: RESEND_API_KEY управляется из теста.
const paramValues: Record<string, string> = {};

jest.mock('firebase-functions/params', () => ({
  defineString: (name: string, opts?: { default?: string }) => ({
    value: () => paramValues[name] ?? opts?.default ?? '',
  }),
}));

type FetchInit = { headers: Record<string, string>; body: string };

const fetchMock = jest.fn(async (_url: string, _init: FetchInit) => ({
  ok: true,
  text: async () => '{"id":"em_123"}',
}));

(global as { fetch?: unknown }).fetch = fetchMock;

async function callSend(params: { to: string; subject: string; text: string }) {
  const { sendTransactionalEmail } = require('./admin_email');
  return sendTransactionalEmail(params);
}

beforeEach(() => {
  jest.resetModules();
  fetchMock.mockClear();
  fetchMock.mockResolvedValue({ ok: true, text: async () => '{"id":"em_123"}' });
  for (const key of Object.keys(paramValues)) delete paramValues[key];
});

describe('sendTransactionalEmail', () => {
  it('без RESEND_API_KEY не шлёт и возвращает resend_key_missing (не бросает)', async () => {
    const result = await callSend({ to: 'user@gmail.com', subject: 'Тема', text: 'Тело письма' });
    expect(result).toEqual({ ok: false, error: 'resend_key_missing' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('шлёт через Resend без List-Unsubscribe и без футера отписки', async () => {
    paramValues.RESEND_API_KEY = 're_test_key';
    paramValues.ADMIN_EMAIL_FROM = 'Phraseman <noreply@phraseman.app>';

    const result = await callSend({
      to: 'user@gmail.com',
      subject: 'Phraseman — код восстановления аккаунта',
      text: 'Ваш код: 123456\nОн действует 10 минут.',
    });

    expect(result).toEqual({ ok: true, id: 'em_123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('Phraseman <noreply@phraseman.app>');
    expect(body.to).toEqual(['user@gmail.com']);
    expect(body.subject).toBe('Phraseman — код восстановления аккаунта');
    expect(body.text).toContain('123456');
    // Транзакционное письмо: ни List-Unsubscribe-заголовков, ни футера отписки.
    expect(body.headers).toBeUndefined();
    expect(body.html).toContain('123456');
    expect(body.html).not.toContain('Отписаться');
    expect(body.html).toContain('charset="utf-8"');
  });

  it('не-200 от Resend → ok:false с текстом ошибки', async () => {
    paramValues.RESEND_API_KEY = 're_test_key';
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => '{"error":"bad request for private.user@example.com"}',
    } as never);
    const result = await callSend({ to: 'user@gmail.com', subject: 's', text: 't' });
    expect(result).toEqual({ ok: false, error: 'resend_http_failed' });
    expect(JSON.stringify(result)).not.toContain('private.user@example.com');
  });

  it('returns a stable non-PII error for a transactional transport failure', async () => {
    paramValues.RESEND_API_KEY = 're_test_key';
    fetchMock.mockRejectedValueOnce(new Error('socket failed for private.user@example.com'));
    const result = await callSend({ to: 'user@gmail.com', subject: 's', text: 't' });
    expect(result).toEqual({ ok: false, error: 'resend_transport_failed' });
    expect(JSON.stringify(result)).not.toContain('private.user@example.com');
  });
});
