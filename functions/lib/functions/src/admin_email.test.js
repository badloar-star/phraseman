"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Мокаем params до загрузки модуля: секрет и non-secret sender управляются из теста.
const paramValues = {};
jest.mock('firebase-functions/params', () => ({
    defineSecret: (name) => ({
        name,
        value: () => paramValues[name] ?? '',
    }),
    defineString: (name, opts) => ({
        value: () => paramValues[name] ?? opts?.default ?? '',
    }),
}));
const fetchMock = jest.fn(async (_url, _init) => ({
    ok: true,
    text: async () => '{"id":"em_123"}',
}));
global.fetch = fetchMock;
async function callSend(params) {
    const { sendTransactionalEmail } = require('./admin_email');
    return sendTransactionalEmail(params);
}
beforeEach(() => {
    jest.resetModules();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue({ ok: true, text: async () => '{"id":"em_123"}' });
    for (const key of Object.keys(paramValues))
        delete paramValues[key];
    paramValues.ADMIN_EMAIL_FROM = 'Phraseman <noreply@example.com>';
});
describe('sendTransactionalEmail', () => {
    it('без RESEND_API_KEY не шлёт и возвращает resend_key_missing (не бросает)', async () => {
        const result = await callSend({ to: 'user@gmail.com', subject: 'Тема', text: 'Тело письма' });
        expect(result).toEqual({ ok: false, error: 'resend_key_missing' });
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('без проверенного sender не шлёт и fail-closed возвращает resend_from_missing', async () => {
        paramValues.RESEND_API_KEY = 're_test_key';
        delete paramValues.ADMIN_EMAIL_FROM;
        const result = await callSend({ to: 'user@gmail.com', subject: 'Тема', text: 'Тело письма' });
        expect(result).toEqual({ ok: false, error: 'resend_from_missing' });
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
    it('passes a validated optional idempotency key only as the Resend HTTP header', async () => {
        paramValues.RESEND_API_KEY = 're_test_key';
        const result = await callSend({
            to: 'user@gmail.com', subject: 'subject', text: 'body',
            idempotencyKey: 'recovery/challenge_123/generation_456',
        });
        expect(result).toEqual({ ok: true, id: 'em_123' });
        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers['Idempotency-Key']).toBe('recovery/challenge_123/generation_456');
        expect(init.body).not.toContain('idempotencyKey');
    });
    it.each(['bad\r\nheader', 'x'.repeat(257)])('rejects unsafe idempotency key %p without transport', async (key) => {
        paramValues.RESEND_API_KEY = 're_test_key';
        await expect(callSend({
            to: 'user@gmail.com', subject: 'subject', text: 'body', idempotencyKey: key,
        })).resolves.toEqual({ ok: false, error: 'resend_idempotency_key_invalid' });
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('не-200 от Resend → ok:false с текстом ошибки', async () => {
        paramValues.RESEND_API_KEY = 're_test_key';
        fetchMock.mockResolvedValueOnce({
            ok: false,
            text: async () => '{"error":"bad request for private.user@example.com"}',
        });
        const result = await callSend({ to: 'user@gmail.com', subject: 's', text: 't' });
        expect(result).toEqual({ ok: false, error: 'resend_http_failed' });
        expect(JSON.stringify(result)).not.toContain('private.user@example.com');
    });
    it.each([408, 429, 500, 503])('classifies transient Resend HTTP %i as retryable', async (status) => {
        paramValues.RESEND_API_KEY = 're_test_key';
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status,
            text: async () => '{"error":"temporary"}',
        });
        await expect(callSend({ to: 'user@gmail.com', subject: 's', text: 't' }))
            .resolves.toEqual({ ok: false, error: 'resend_http_retryable' });
    });
    it('classifies only concurrent Resend idempotency 409 as retryable without leaking its body', async () => {
        paramValues.RESEND_API_KEY = 're_test_key';
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 409,
            text: async () => JSON.stringify({
                name: 'concurrent_idempotent_requests',
                message: 'retry private.user@example.com later',
            }),
        });
        const result = await callSend({ to: 'user@gmail.com', subject: 's', text: 't' });
        expect(result).toEqual({ ok: false, error: 'resend_http_retryable' });
        expect(JSON.stringify(result)).not.toContain('private.user@example.com');
    });
    it('keeps invalid Resend idempotency 409 terminal without leaking its body', async () => {
        paramValues.RESEND_API_KEY = 're_test_key';
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 409,
            text: async () => JSON.stringify({
                name: 'invalid_idempotent_request',
                message: 'conflict for private.user@example.com',
            }),
        });
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
//# sourceMappingURL=admin_email.test.js.map