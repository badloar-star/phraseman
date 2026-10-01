// sendActivationEmail + сторож почты (перенос 01.10.2026 из claude/sad-cannon-876ae9).
// зачем: проверяем на ПЛАТЁЖНОМ пути, что провал письма с кодом поднимает алерт
// владельцу, успех — нет, а статус заказа (status) не перезаписывается.

const notifyMock = jest.fn(async (_params: Record<string, unknown>) => true);
jest.mock('./email_delivery_watchdog', () => ({
  notifyActivationEmailFailure: (params: Record<string, unknown>) => notifyMock(params),
}));

const writes: Array<{ path: string; patch: Record<string, unknown> }> = [];
jest.mock('firebase-admin/firestore', () => {
  const actual = jest.requireActual('firebase-admin/firestore');
  return {
    ...actual,
    FieldValue: {
      ...actual.FieldValue,
      serverTimestamp: () => ({ __ts: true }),
      delete: () => ({ __delete: true }),
    },
    getFirestore: () => ({
      collection: (name: string) => ({
        doc: (id: string) => ({
          set: async (patch: Record<string, unknown>) => { writes.push({ path: `${name}/${id}`, patch }); },
        }),
      }),
    }),
  };
});

import { sendActivationEmail } from './web_checkout';

const order = {
  orderId: 'order-1',
  status: 'paid_pending_activation',
  plan: 'yearly',
  amountCents: 2799,
  currency: 'eur',
  activationCode: 'WEB-ABCDEFGHJK',
  email: 'buyer@example.com',
};

const realFetch = global.fetch;

beforeEach(() => {
  notifyMock.mockClear();
  writes.length = 0;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.WEB_CHECKOUT_EMAIL_FROM = 'Phraseman <test@example.com>';
});

afterAll(() => {
  global.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.WEB_CHECKOUT_EMAIL_FROM;
});

function mockFetch(status: number, body: string): jest.Mock {
  const fn = jest.fn(async () => ({ ok: status >= 200 && status < 300, status, text: async () => body }));
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('sendActivationEmail → сторож почты', () => {
  it('БОЕВОЙ СЛУЧАЙ 21.09.2026: Resend 401 → статус provider_rejected и алерт владельцу', async () => {
    mockFetch(401, '{"statusCode":401,"message":"API key is invalid"}');
    const ok = await sendActivationEmail(order);
    expect(ok).toBe(false);
    expect(writes[0].path).toBe('web_premium_orders/order-1');
    expect(writes[0].patch.customerEmailStatus).toBe('provider_rejected');
    // статус заказа не трогаем — иначе заявка перестанет считаться оплаченной
    expect(writes[0].patch.status).toBeUndefined();
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      orderId: 'order-1', orderStatus: 'paid_pending_activation', httpStatus: 401, amountCents: 2799,
    });
  });

  it('сетевой сбой → transport_unknown и алерт', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    expect(await sendActivationEmail(order)).toBe(false);
    expect(writes[0].patch.customerEmailStatus).toBe('transport_unknown');
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0].httpStatus).toBeNull();
  });

  it('пустой ключ → skipped_no_resend_key, алерт, без сетевого запроса', async () => {
    process.env.RESEND_API_KEY = '';
    const fetchFn = mockFetch(200, '{}');
    expect(await sendActivationEmail(order)).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(writes[0].patch.customerEmailStatus).toBe('skipped_no_resend_key');
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0].errorText).toBe('RESEND_API_KEY пуст');
  });

  it('успех → sent, алерта нет, ключ идемпотентности уходит в Resend', async () => {
    const fetchFn = mockFetch(200, '{"id":"re_123"}');
    expect(await sendActivationEmail(order, undefined, 'activation-retry-order-1-1')).toBe(true);
    expect(writes[0].patch.customerEmailStatus).toBe('sent');
    expect(notifyMock).not.toHaveBeenCalled();
    const init = (fetchFn.mock.calls[0] as unknown as [string, { headers: Record<string, string> }])[1];
    expect(init.headers['Idempotency-Key']).toBe('activation-retry-order-1-1');
  });

  it('нет кода или адреса → ранний выход без отправки и без алерта (логируется)', async () => {
    const fetchFn = mockFetch(200, '{}');
    expect(await sendActivationEmail({ ...order, activationCode: '' })).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
