// Сторож почты: тесты закрывают класс бага «почта умерла молча» (21.09.2026).
// Перенесено 01.10.2026 из ветки claude/sad-cannon-876ae9 и дополнено тестами
// ретрая (runActivationEmailRetry), крона живости ключа (runResendKeyHealthCheck)
// и алерта владельцу (notifyActivationEmailFailure).

const sendTelegramAlertMock = jest.fn(async (_token: string, _text: string) => true);
jest.mock('./admin_alerts', () => ({
  ADMIN_ALERT_BOT_TOKEN: { value: () => 'test-bot-token' },
  sendTelegramAlert: (token: string, text: string) => sendTelegramAlertMock(token, text),
}));

const watchdogDoc: Record<string, unknown> = {};
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
  getFirestore: () => ({
    doc: () => ({ path: 'admin_config/email_watchdog' }),
    runTransaction: async (fn: (tx: unknown) => Promise<boolean>) => fn({
      get: async () => ({ data: () => ({ ...watchdogDoc }) }),
      set: (_ref: unknown, patch: Record<string, unknown>) => { Object.assign(watchdogDoc, patch); },
    }),
  }),
}));

import {
  FAILED_EMAIL_STATUSES,
  formatEmailFailureAlert,
  formatKeyDeadAlert,
  isAuthFailure,
  isFailedEmailStatus,
  isLookupSafeCode,
  isPaidOrderStatus,
  isSendOnlyKeyResponse,
  notifyActivationEmailFailure,
  probeResendKey,
  runActivationEmailRetry,
  runResendKeyHealthCheck,
  shouldAlertOnProbe,
  shouldRetryOrder,
  MAX_RETRY_ATTEMPTS,
  RETRY_BATCH_LIMIT,
} from './email_delivery_watchdog';

beforeEach(() => {
  sendTelegramAlertMock.mockClear();
  for (const key of Object.keys(watchdogDoc)) delete watchdogDoc[key];
});

describe('isAuthFailure — отличает мёртвый ключ от разового сбоя', () => {
  it('401 и 403 считает проблемой ключа', () => {
    expect(isAuthFailure(401, '')).toBe(true);
    expect(isAuthFailure(403, '')).toBe(true);
  });

  it('ловит боевой ответ Resend из инцидента, даже если код другой', () => {
    expect(isAuthFailure(400, '{"statusCode":400,"message":"API key is invalid","name":"validation_error"}')).toBe(true);
  });

  it('пустой ключ — тоже проблема ключа', () => {
    expect(isAuthFailure(null, 'RESEND_API_KEY пуст')).toBe(true);
  });

  it('обычную ошибку отправки проблемой ключа НЕ считает', () => {
    expect(isAuthFailure(422, 'invalid recipient address')).toBe(false);
    expect(isAuthFailure(500, 'internal error')).toBe(false);
    expect(isAuthFailure(null, 'network timeout')).toBe(false);
  });
});

describe('статусы заявки и письма', () => {
  it('оплаченными считает все три статуса «деньги получены»', () => {
    expect(isPaidOrderStatus('paid_pending_activation')).toBe(true);
    expect(isPaidOrderStatus('paid_pending_manual_activation')).toBe(true);
    expect(isPaidOrderStatus('activated')).toBe(true);
    expect(isPaidOrderStatus('created')).toBe(false);
    expect(isPaidOrderStatus(undefined)).toBe(false);
  });

  it('провалом считает и старый облачный статус, и все статусы текущего web_checkout', () => {
    // 'failed' — облачная версия писала его до выкладки; заявки с ним тоже дошлём.
    expect(isFailedEmailStatus('failed')).toBe(true);
    // resendFailureOutcomeForHttpStatus + сетевой сбой + не настроенная почта.
    expect(isFailedEmailStatus('provider_rejected')).toBe(true);
    expect(isFailedEmailStatus('transport_unknown')).toBe(true);
    expect(isFailedEmailStatus('skipped_no_resend_key')).toBe(true);
    expect(isFailedEmailStatus('skipped_no_resend_from')).toBe(true);
    expect(isFailedEmailStatus('sent')).toBe(false);
    expect(FAILED_EMAIL_STATUSES.length).toBeLessThanOrEqual(10); // лимит оператора 'in' в Firestore
  });
});

describe('probeResendKey — проверка живости ключа', () => {
  it('пустой ключ = мёртвый, без единого сетевого запроса', async () => {
    const fetchSpy = jest.fn();
    const result = await probeResendKey('', fetchSpy as unknown as typeof fetch);
    expect(result.alive).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('живой ключ: 200 → alive', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '[]' });
    const result = await probeResendKey('re_live_key', fetchImpl as unknown as typeof fetch);
    expect(result.alive).toBe(true);
    expect(result.httpStatus).toBe(200);
  });

  it('БОЕВОЙ СЛУЧАЙ 21.09.2026: отозванный ключ → alive=false', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"statusCode":401,"name":"validation_error","message":"API key is invalid"}',
    });
    const result = await probeResendKey('re_dead_key', fetchImpl as unknown as typeof fetch);
    expect(result.alive).toBe(false);
    expect(result.httpStatus).toBe(401);
    expect(result.reason).toContain('API key is invalid');
  });

  // зачем (Ядро 11.10, логи прода с 08.10): боевой ключ ограничен «только отправкой» — проба видела 401 и считала его
  // мёртвым, досылка писем оплатившим пропускалась на каждом запуске.
  it('БОЕВОЙ СЛУЧАЙ 08.10.2026: ключ «только отправка» (401 restricted_api_key) → alive', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"statusCode":401,"message":"This API key is restricted to only send emails","name":"restricted_api_key"}',
    });
    const result = await probeResendKey('re_send_only_key', fetchImpl as unknown as typeof fetch);
    expect(result.alive).toBe(true);
    expect(result.httpStatus).toBe(401);
    expect(result.reason).toBe('send_only_key');
    expect(shouldAlertOnProbe(result)).toBe(false);
  });

  it('isSendOnlyKeyResponse: только 401/403 с признаком ограниченного ключа', () => {
    expect(isSendOnlyKeyResponse(401, '{"name":"restricted_api_key"}')).toBe(true);
    expect(isSendOnlyKeyResponse(403, 'This API key is restricted to only send emails')).toBe(true);
    expect(isSendOnlyKeyResponse(401, '{"message":"API key is invalid"}')).toBe(false);
    expect(isSendOnlyKeyResponse(500, 'restricted_api_key')).toBe(false);
    expect(isSendOnlyKeyResponse(401, '')).toBe(false);
  });

  it('сетевой сбой не выдаёт себя за ответ сервиса (httpStatus=null)', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const result = await probeResendKey('re_key', fetchImpl as unknown as typeof fetch);
    expect(result.alive).toBe(false);
    expect(result.httpStatus).toBeNull();
  });

  it('запрос к Resend идёт на api-keys и НЕ отправляет письмо', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '[]' });
    await probeResendKey('re_key', fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/api-keys');
    expect(init.method).toBe('GET');
  });
});

describe('formatEmailFailureAlert — алерт без PII', () => {
  const alert = formatEmailFailureAlert({
    orderId: '2F5y8CixQ2R3P6LObvKk',
    plan: 'месяц',
    amountCents: 399,
    currency: 'eur',
    httpStatus: 401,
    authFailure: true,
  });

  it('содержит то, по чему владелец найдёт заявку', () => {
    expect(alert).toContain('2F5y8CixQ2R3P6LObvKk');
    expect(alert).toContain('3.99 EUR');
    expect(alert).toContain('месяц');
  });

  it('при мёртвом ключе зовёт чинить ключ, а не «попробовать ещё раз»', () => {
    expect(alert).toContain('КЛЮЧ ПОЧТЫ НЕ РАБОТАЕТ');
  });

  // зачем: владелец дважды клал новый ключ, и это не помогало — ключ лежал
  // в Secret Manager, а код читал .env. Алерт обязан называть ОБЕ причины.
  it('называет и ключ, и деплой — иначе подсказка отправит чинить не то', () => {
    expect(alert).toContain('resend.com');
    expect(alert).toContain('RESEND_API_KEY');
  });

  it('НИКОГДА не содержит email, имя или код активации — PII во внешний канал запрещён', () => {
    expect(alert).not.toContain('@');
    expect(alert.toLowerCase()).not.toContain('gmail');
    expect(alert).not.toContain('WEB-');
  });

  it('разовый сбой не пугает владельца сообщением про ключ', () => {
    const soft = formatEmailFailureAlert({
      orderId: 'order2', plan: 'год', amountCents: 2799, currency: 'eur', httpStatus: 500, authFailure: false,
    });
    expect(soft).not.toContain('КЛЮЧ ПОЧТЫ');
    expect(soft).toContain('Разовый сбой');
  });
});

describe('formatKeyDeadAlert', () => {
  it('показывает, сколько оплативших сидят без письма', () => {
    const text = formatKeyDeadAlert({ httpStatus: 401, pendingFailedOrders: 3, reason: 'API key is invalid' });
    expect(text).toContain('Ключ почты Resend не работает');
    expect(text).toContain('3');
    expect(text).toContain('RESEND_API_KEY');
    expect(text).not.toContain('@');
  });

  it('без зависших заявок говорит об этом прямо', () => {
    const text = formatKeyDeadAlert({ httpStatus: 401, pendingFailedOrders: 0, reason: 'API key is invalid' });
    expect(text).toContain('пока нет');
  });
});

describe('notifyActivationEmailFailure — алерт владельцу о проваленном письме', () => {
  const paidFailure = {
    orderId: 'order-paid-1',
    orderStatus: 'paid_pending_activation',
    plan: 'yearly',
    amountCents: 2799,
    currency: 'eur',
    httpStatus: 401,
    errorText: '{"message":"API key is invalid"}',
  };

  it('оплаченная заявка с мёртвым ключом → алерт ушёл, без PII', async () => {
    const sent = await notifyActivationEmailFailure(paidFailure);
    expect(sent).toBe(true);
    expect(sendTelegramAlertMock).toHaveBeenCalledTimes(1);
    const text = sendTelegramAlertMock.mock.calls[0][1];
    expect(text).toContain('order-paid-1');
    expect(text).toContain('КЛЮЧ ПОЧТЫ НЕ РАБОТАЕТ');
    expect(text).not.toContain('@');
  });

  it('второй провал в течение часа не спамит (дедуп через admin_config/email_watchdog)', async () => {
    await notifyActivationEmailFailure(paidFailure);
    const second = await notifyActivationEmailFailure({ ...paidFailure, orderId: 'order-paid-2' });
    expect(second).toBe(false);
    expect(sendTelegramAlertMock).toHaveBeenCalledTimes(1);
    expect(typeof watchdogDoc.lastEmailFailureAlertMs).toBe('number');
  });

  it('неоплаченная заявка / подарочная доставка не будит владельца', async () => {
    expect(await notifyActivationEmailFailure({ ...paidFailure, orderStatus: 'created' })).toBe(false);
    expect(await notifyActivationEmailFailure({ ...paidFailure, orderStatus: 'sending' })).toBe(false);
    expect(sendTelegramAlertMock).not.toHaveBeenCalled();
  });

  it('без orderId алерт не шлётся', async () => {
    expect(await notifyActivationEmailFailure({ ...paidFailure, orderId: '' })).toBe(false);
    expect(sendTelegramAlertMock).not.toHaveBeenCalled();
  });

  it('сбой Telegram не бросает наружу — оплата не ломается', async () => {
    sendTelegramAlertMock.mockRejectedValueOnce(new Error('telegram down'));
    await expect(notifyActivationEmailFailure(paidFailure)).resolves.toBe(false);
  });
});

describe('runResendKeyHealthCheck — крон живости ключа', () => {
  function deps(probe: { alive: boolean; httpStatus: number | null; reason: string }, slot = true) {
    return {
      probe: jest.fn(async () => probe),
      recordProbe: jest.fn(async () => undefined),
      claimSlot: jest.fn(async () => slot),
      countPending: jest.fn(async () => 3),
      alert: jest.fn(async (_text: string) => true),
    };
  }

  it('живой ключ: записали пробу, алерта нет', async () => {
    const d = deps({ alive: true, httpStatus: 200, reason: 'ok' });
    const r = await runResendKeyHealthCheck(d);
    expect(r).toEqual({ alive: true, alerted: false, httpStatus: 200 });
    expect(d.recordProbe).toHaveBeenCalled();
    expect(d.alert).not.toHaveBeenCalled();
  });

  it('битый ключ (401) → алерт владельцу с числом зависших заявок', async () => {
    const d = deps({ alive: false, httpStatus: 401, reason: 'API key is invalid' });
    const r = await runResendKeyHealthCheck(d);
    expect(r.alerted).toBe(true);
    expect(d.alert).toHaveBeenCalledTimes(1);
    expect(d.alert.mock.calls[0][0]).toContain('Оплаченных заявок без письма: <b>3</b>');
  });

  it('пустой ключ → алерт', async () => {
    const d = deps({ alive: false, httpStatus: null, reason: 'ключ не задан (RESEND_API_KEY пуст)' });
    expect((await runResendKeyHealthCheck(d)).alerted).toBe(true);
  });

  it('сетевой сбой без HTTP-кода → без алерта', async () => {
    const d = deps({ alive: false, httpStatus: null, reason: 'сетевая ошибка: ECONNRESET' });
    expect((await runResendKeyHealthCheck(d)).alerted).toBe(false);
    expect(d.alert).not.toHaveBeenCalled();
    expect(shouldAlertOnProbe({ alive: false, httpStatus: null, reason: 'сетевая ошибка' })).toBe(false);
  });

  it('дедуп раз в сутки: слот занят → алерта нет', async () => {
    const d = deps({ alive: false, httpStatus: 401, reason: 'x' }, false);
    expect((await runResendKeyHealthCheck(d)).alerted).toBe(false);
    expect(d.alert).not.toHaveBeenCalled();
  });

  it('сбой записи пробы не глушит алерт', async () => {
    const d = deps({ alive: false, httpStatus: 401, reason: 'x' });
    d.recordProbe.mockRejectedValueOnce(new Error('firestore down'));
    expect((await runResendKeyHealthCheck(d)).alerted).toBe(true);
  });
});

describe('shouldRetryOrder — кого дошлём после починки ключа', () => {
  const base = {
    status: 'paid_pending_activation',
    customerEmailStatus: 'provider_rejected',
    activationCode: 'WEB-ABCDEFGHJK',
  };

  it('боевая заявка из инцидента попадает в дорассылку', () => {
    expect(shouldRetryOrder(base)).toBe(true);
  });

  it('заявка со старым облачным статусом failed тоже дошлётся', () => {
    expect(shouldRetryOrder({ ...base, customerEmailStatus: 'failed' })).toBe(true);
  });

  it('неоплаченную заявку не трогает', () => {
    expect(shouldRetryOrder({ ...base, status: 'created' })).toBe(false);
  });

  it('уже активированную заявку не трогает — код у человека есть', () => {
    expect(shouldRetryOrder({ ...base, status: 'activated' })).toBe(false);
  });

  it('уже доставленное письмо повторно НЕ шлёт', () => {
    expect(shouldRetryOrder({ ...base, customerEmailStatus: 'sent' })).toBe(false);
  });

  it('без кода активации слать нечего', () => {
    expect(shouldRetryOrder({ ...base, activationCode: '' })).toBe(false);
  });

  it('битый адрес не долбится вечно — после лимита попыток выпадает', () => {
    expect(shouldRetryOrder({ ...base, customerEmailRetryCount: MAX_RETRY_ATTEMPTS - 1 })).toBe(true);
    expect(shouldRetryOrder({ ...base, customerEmailRetryCount: MAX_RETRY_ATTEMPTS })).toBe(false);
  });
});

describe('runActivationEmailRetry — дорассылка провалившихся писем', () => {
  const failedOrder = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    data: {
      status: 'paid_pending_activation',
      customerEmailStatus: 'provider_rejected',
      activationCode: `WEB-${id}`,
      ...extra,
    },
  });

  it('ключ мёртв → ни одного запроса к заявкам и ни одной отправки', async () => {
    const listFailed = jest.fn(async () => [failedOrder('a')]);
    const send = jest.fn(async () => true);
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: false, httpStatus: 401, reason: 'dead' }),
      listFailed,
      markAttempt: jest.fn(async () => undefined),
      send,
    });
    expect(r.skipped).toBe('key_not_alive');
    expect(listFailed).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('ключ жив → дошлёт подходящие заявки через общую отправку, счётчик до отправки', async () => {
    const calls: string[] = [];
    const markAttempt = jest.fn(async (id: string) => { calls.push(`mark:${id}`); });
    const send = jest.fn(async (order: Record<string, unknown>, key: string) => {
      calls.push(`send:${String(order.orderId)}:${key}`);
      return order.orderId !== 'b';
    });
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => [
        failedOrder('a'),
        failedOrder('b', { customerEmailRetryCount: 2 }),
        failedOrder('done', { status: 'activated' }),
        failedOrder('maxed', { customerEmailRetryCount: MAX_RETRY_ATTEMPTS }),
      ],
      markAttempt,
      send,
    });
    expect(r).toEqual({ skipped: null, scanned: 4, attempted: 2, sent: 1 });
    expect(calls).toEqual([
      'mark:a', 'send:a:activation-retry-a-1',
      'mark:b', 'send:b:activation-retry-b-3',
    ]);
  });

  it('за прогон не больше RETRY_BATCH_LIMIT отправок', async () => {
    const send = jest.fn(async () => true);
    const many = Array.from({ length: RETRY_BATCH_LIMIT + 7 }, (_, i) => failedOrder(`o${i}`));
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => many,
      markAttempt: jest.fn(async () => undefined),
      send,
    });
    expect(r.attempted).toBe(RETRY_BATCH_LIMIT);
    expect(send).toHaveBeenCalledTimes(RETRY_BATCH_LIMIT);
  });

  it('падение одной отправки не останавливает остальные', async () => {
    const send = jest.fn(async (order: Record<string, unknown>) => {
      if (order.orderId === 'a') throw new Error('boom');
      return true;
    });
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => [failedOrder('a'), failedOrder('b')],
      markAttempt: jest.fn(async () => undefined),
      send,
    });
    expect(r.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  // зачем (ревью Opus 11.10): статус заявки при активации обновлялся не всегда — досылка обязана спросить сам код.
  it('код уже введён (usedCount > 0) → письмо НЕ досылается, даже при статусе «ожидает»', async () => {
    const send = jest.fn(async () => true);
    const listRedeemedCodes = jest.fn(async () => new Set(['WEB-used']));
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 401, reason: 'send_only_key' }),
      listFailed: async () => [failedOrder('used'), failedOrder('fresh')],
      markAttempt: jest.fn(async () => undefined),
      send,
      listRedeemedCodes,
    });
    expect(listRedeemedCodes).toHaveBeenCalledWith(['WEB-used', 'WEB-fresh']);
    expect(r).toEqual({ skipped: null, scanned: 2, attempted: 1, sent: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0] as unknown as [Record<string, unknown>])[0].orderId).toBe('fresh');
  });

  it('не прочитали состояние кодов → прогон пропущен целиком, ни одной отправки и ни одной метки', async () => {
    const send = jest.fn(async () => true);
    const markAttempt = jest.fn(async () => undefined);
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => [failedOrder('a')],
      markAttempt,
      send,
      listRedeemedCodes: async () => { throw new Error('getAll failed'); },
    });
    expect(r.skipped).toBe('redeemed_lookup_failed');
    expect(send).not.toHaveBeenCalled();
    expect(markAttempt).not.toHaveBeenCalled();
  });

  it('код с «/» не валит прогон: его заявка пропускается, остальные досылаются', async () => {
    const send = jest.fn(async () => true);
    const listRedeemedCodes = jest.fn(async () => new Set<string>());
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => [failedOrder('bad', { activationCode: 'MANUAL/1' }), failedOrder('ok')],
      markAttempt: jest.fn(async () => undefined),
      send,
      listRedeemedCodes,
    });
    expect(listRedeemedCodes).toHaveBeenCalledWith(['WEB-ok']);
    expect(r).toEqual({ skipped: null, scanned: 2, attempted: 1, sent: 1 });
    expect(isLookupSafeCode('MANUAL/1')).toBe(false);
    expect(isLookupSafeCode('..')).toBe(false);
    expect(isLookupSafeCode('WEB-AB12')).toBe(true);
  });

  it('заявка старше 60 дней не досылается; без даты оплаты — досылается', async () => {
    const nowMs = Date.UTC(2026, 9, 11);
    const day = 24 * 60 * 60 * 1000;
    const send = jest.fn(async () => true);
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => [
        failedOrder('old', { paidAt: nowMs - 61 * day }),
        failedOrder('recent', { paidAtIso: new Date(nowMs - 20 * day).toISOString() }),
        failedOrder('nodate'),
      ],
      markAttempt: jest.fn(async () => undefined),
      send,
      listRedeemedCodes: async () => new Set<string>(),
      now: () => nowMs,
    });
    expect(r.attempted).toBe(2);
    expect(send.mock.calls.map((c) => (c as unknown as [Record<string, unknown>])[0].orderId)).toEqual(['recent', 'nodate']);
  });

  it('сбой запроса заявок → честный ранний выход, не исключение', async () => {
    const r = await runActivationEmailRetry({
      probe: async () => ({ alive: true, httpStatus: 200, reason: 'ok' }),
      listFailed: async () => { throw new Error('index missing'); },
      markAttempt: jest.fn(async () => undefined),
      send: jest.fn(async () => true),
    });
    expect(r.skipped).toBe('query_failed');
  });
});
