const {
  MANUAL_ACTIVATION_MESSAGE_RU,
  buildInvoicePayload,
  buildMainMenu,
  buildPlanMenu,
  buildPremiumInvoice,
  buildStartReplyKeyboard,
  createInitialState,
  handleTelegramUpdate,
  PAY_SUPPORT_MESSAGE_RU,
  PAY_BUTTON_TEXT_RU,
  PRIVACY_MESSAGE_RU,
  readOrders,
  parseInvoicePayload,
  TERMS_MESSAGE_RU,
} = require('../tools/telegram-premium-bot/core.cjs');

const MOJIBAKE_NO_ACCESS = 'ÃÂÃÂµÃ‘â€š ÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃ‘Æ’ÃÂ¿ÃÂ°';

describe('telegram premium bot core', () => {
  const config = {
    monthlyStars: 500,
    yearlyStars: 2500,
    adminChatId: 999,
    adminSetupCode: 'owner-code',
  };

  function makeHarness() {
    const calls: Array<{ method: string; args: any[] }> = [];
    const api = {
      sendMessage: async (...args: any[]) => calls.push({ method: 'sendMessage', args }),
      sendPhoto: async (...args: any[]) => calls.push({ method: 'sendPhoto', args }),
      sendInvoice: async (...args: any[]) => calls.push({ method: 'sendInvoice', args }),
      createInvoiceLink: async (...args: any[]) => {
        calls.push({ method: 'createInvoiceLink', args });
        return 'https://t.me/$invoice/monthly-link';
      },
      answerCallbackQuery: async (...args: any[]) => calls.push({ method: 'answerCallbackQuery', args }),
      answerPreCheckoutQuery: async (...args: any[]) => calls.push({ method: 'answerPreCheckoutQuery', args }),
    };
    const orders: any[] = [];
    const storage = {
      appendOrder: async (order: any) => orders.push(order),
      readOrders: async () => orders,
    };
    return { api, calls, orders, storage };
  }

  it('asks for an app nickname before showing premium plans', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: '/start' },
    }, { config, state, api, storage });

    expect(calls[0].method).toBe('sendPhoto');
    expect(calls[0].args[1]).toEqual(expect.objectContaining({
      caption: expect.stringContaining('Напишите ваш ник'),
      reply_markup: buildStartReplyKeyboard(),
    }));
  });

  it('starts the nickname flow from the visible pay button', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: PAY_BUTTON_TEXT_RU },
    }, { config, state, api, storage });

    expect(state.sessions['456'].step).toBe('awaiting_nickname');
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].args[1]).toBe('Напишите Ваш ник ниже');
    expect(calls[0].args[2]).toEqual(expect.objectContaining({
      reply_markup: buildStartReplyKeyboard(),
    }));
  });

  it('starts the nickname flow from the inline premium button with a short prompt', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      callback_query: {
        id: 'cb-premium-start',
        data: 'premium:start',
        from: { id: 456 },
        message: { chat: { id: 123 } },
      },
    }, { config, state, api, storage });

    expect(state.sessions['456'].step).toBe('awaiting_nickname');
    expect(calls.find((call) => call.method === 'sendMessage')?.args[1]).toBe('Напишите Ваш ник ниже');
  });

  it('shows payment support instructions from /paysupport', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: '/paysupport' },
    }, { config, state, api, storage });

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].args[1]).toBe(PAY_SUPPORT_MESSAGE_RU);
    expect(calls[0].args[1]).toContain('support.phraseman@gmail.com');
    expect(calls[0].args[1]).toContain('Stars');
  });

  it('shows legal links from /terms and /privacy commands', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: '/terms@PhrasemanPremiumBot' },
    }, { config, state, api, storage });
    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: '/privacy' },
    }, { config, state, api, storage });

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].args[1]).toBe(TERMS_MESSAGE_RU);
    expect(calls[0].args[1]).toContain('https://knowlyapps.com/legal/terms/');
    expect(calls[0].args[2].reply_markup.inline_keyboard[0][0].url).toBe('https://knowlyapps.com/legal/terms/');
    expect(calls[1].method).toBe('sendMessage');
    expect(calls[1].args[1]).toBe(PRIVACY_MESSAGE_RU);
    expect(calls[1].args[1]).toContain('https://knowlyapps.com/legal/privacy/');
    expect(calls[1].args[2].reply_markup.inline_keyboard[0][0].url).toBe('https://knowlyapps.com/legal/privacy/');
  });

  it('stores the app nickname and offers monthly and yearly plan buttons', async () => {
    const state = createInitialState();
    state.sessions['456'] = { step: 'awaiting_nickname' };
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456 }, text: '  Player One  ' },
    }, { config, state, api, storage });

    expect(state.sessions['456'].appNickname).toBe('Player One');
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].args[1]).toContain('Player One');
    expect(calls[0].args[1]).toContain('500 Stars');
    expect(calls[0].args[1]).toContain('2500 Stars');
    expect(calls[0].args[1]).toContain('Подписку можно отменить в любой момент');
    expect(calls[0].args[1]).not.toContain('5.99');
    expect(calls[0].args[1]).not.toContain('34.99');
    expect(calls[0].args[1]).not.toContain('499');
    expect(calls[0].args[1]).not.toContain('2990');
    expect(calls[0].args[1]).not.toContain('€');
    expect(calls[0].args[2]).toEqual(expect.objectContaining({ reply_markup: buildPlanMenu(config) }));
  });

  it('builds Telegram Stars invoices with XTR and exactly one price item', () => {
    const payload = buildInvoicePayload({
      plan: 'monthly',
      userId: 456,
      chatId: 123,
      appNickname: 'Player One',
    });
    const invoice = buildPremiumInvoice({
      config,
      chatId: 123,
      userId: 456,
      plan: 'monthly',
      appNickname: 'Player One',
      payload,
    });

    expect(invoice.currency).toBe('XTR');
    expect(invoice).not.toHaveProperty('provider_token');
    expect(invoice.description).toContain('500 Stars');
    expect(invoice.description).toContain('Подписку можно отменить в любой момент');
    expect(invoice.description).not.toContain('5.99');
    expect(invoice.description).not.toContain('499');
    expect(invoice.prices).toEqual([{ label: 'Phraseman Premium: месяц', amount: 500 }]);
    expect(invoice.subscription_period).toBe(2592000);
    expect(invoice).not.toHaveProperty('photo_url');
    expect(invoice).not.toHaveProperty('photo_width');
    expect(invoice).not.toHaveProperty('photo_height');
    expect(parseInvoicePayload(payload)).toEqual(expect.objectContaining({
      plan: 'monthly',
      userId: 456,
      chatId: 123,
      appNickname: 'Player One',
    }));
  });

  it('keeps the yearly invoice as a one-time payment', () => {
    const invoice = buildPremiumInvoice({
      config,
      chatId: 123,
      userId: 456,
      plan: 'yearly',
      appNickname: 'Player One',
    });

    expect(invoice.currency).toBe('XTR');
    expect(invoice).not.toHaveProperty('provider_token');
    expect(invoice.description).toContain('2500 Stars');
    expect(invoice.description).not.toContain('34.99');
    expect(invoice.description).not.toContain('2990');
    expect(invoice.prices).toEqual([{ label: 'Phraseman Premium: год', amount: 2500 }]);
    expect(invoice).not.toHaveProperty('subscription_period');
    expect(invoice).not.toHaveProperty('photo_url');
    expect(invoice).not.toHaveProperty('photo_width');
    expect(invoice).not.toHaveProperty('photo_height');
  });

  it('creates a monthly recurring invoice link only after a nickname is known', async () => {
    const state = createInitialState();
    state.sessions['456'] = { step: 'choosing_plan', appNickname: 'Player One' };
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      callback_query: {
        id: 'cb-monthly',
        data: 'plan:monthly',
        from: { id: 456 },
        message: { chat: { id: 123 } },
      },
    }, { config, state, api, storage });

    const linkCall = calls.find((call) => call.method === 'createInvoiceLink');
    expect(linkCall).toBeTruthy();
    expect(linkCall?.args[0]).toEqual(expect.objectContaining({
      currency: 'XTR',
      prices: [{ label: 'Phraseman Premium: месяц', amount: 500 }],
      subscription_period: 2592000,
    }));
    expect(linkCall?.args[0]).not.toHaveProperty('provider_token');
    const messageCall = calls.find((call) => call.method === 'sendMessage');
    expect(messageCall?.args[1]).toContain('Месяц');
    expect(messageCall?.args[1]).toContain('Подписку можно отменить в любой момент');
    expect(messageCall?.args[2].reply_markup.inline_keyboard[0][0].url).toBe('https://t.me/$invoice/monthly-link');
  });

  it('sends a yearly one-time invoice only after a nickname is known', async () => {
    const state = createInitialState();
    state.sessions['456'] = { step: 'choosing_plan', appNickname: 'Player One' };
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      callback_query: {
        id: 'cb1',
        data: 'plan:yearly',
        from: { id: 456 },
        message: { chat: { id: 123 } },
      },
    }, { config, state, api, storage });

    const invoiceCall = calls.find((call) => call.method === 'sendInvoice');
    expect(invoiceCall).toBeTruthy();
    expect(invoiceCall?.args[1]).toEqual(expect.objectContaining({
      chat_id: 123,
      currency: 'XTR',
      prices: [{ label: 'Phraseman Premium: год', amount: 2500 }],
    }));
  });

  it('approves valid pre-checkout queries and rejects wrong currency', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();
    const payload = buildInvoicePayload({
      plan: 'monthly',
      userId: 456,
      chatId: 123,
      appNickname: 'Player One',
    });

    await handleTelegramUpdate({
      pre_checkout_query: {
        id: 'pre1',
        from: { id: 456 },
        currency: 'XTR',
        total_amount: 500,
        invoice_payload: payload,
      },
    }, { config, state, api, storage });

    await handleTelegramUpdate({
      pre_checkout_query: {
        id: 'pre2',
        from: { id: 456 },
        currency: 'USD',
        total_amount: 500,
        invoice_payload: payload,
      },
    }, { config, state, api, storage });

    expect(calls.filter((call) => call.method === 'answerPreCheckoutQuery').map((call) => ({
      id: call.args[0],
      options: call.args[1],
    })))
      .toEqual([
        { id: 'pre1', options: { ok: true } },
        { id: 'pre2', options: { ok: false, error_message: expect.stringContaining('Stars') } },
      ]);
  });

  it('records successful payments and tells the user activation is manual', async () => {
    const state = createInitialState();
    const { api, calls, orders, storage } = makeHarness();
    const payload = buildInvoicePayload({
      plan: 'monthly',
      userId: 456,
      chatId: 123,
      appNickname: 'Player One',
    });

    await handleTelegramUpdate({
      message: {
        chat: { id: 123 },
        from: { id: 456, username: 'tg_user' },
        successful_payment: {
          currency: 'XTR',
          total_amount: 500,
          invoice_payload: payload,
          telegram_payment_charge_id: 'charge-1',
        },
      },
    }, { config, state, api, storage });

    expect(orders).toHaveLength(1);
    expect(orders[0]).toEqual(expect.objectContaining({
      plan: 'monthly',
      appNickname: 'Player One',
      telegramUserId: 456,
      telegramPaymentChargeId: 'charge-1',
      status: 'paid_pending_manual_activation',
      isRecurring: false,
      isFirstRecurring: false,
      subscriptionExpirationDate: null,
      subscriptionExpiresAtIso: null,
    }));
    expect(orders[0]).not.toHaveProperty('telegramUsername');
    expect(orders[0]).not.toHaveProperty('chatId');
    expect(orders[0]).not.toHaveProperty('providerPaymentChargeId');
    expect(orders[0]).not.toHaveProperty('invoicePayload');
    const activationText = calls.find((call) => call.method === 'sendMessage')?.args[1];
    expect(activationText).toContain(MANUAL_ACTIVATION_MESSAGE_RU);
    expect(activationText).toContain('Ник: Player One');
    expect(activationText).toContain('Продление: автоматически каждые 30 дней');
  });

  it('records recurring subscription metadata for monthly renewals', async () => {
    const state = createInitialState();
    const { api, orders, storage } = makeHarness();
    const payload = buildInvoicePayload({
      plan: 'monthly',
      userId: 456,
      chatId: 123,
      appNickname: 'Player One',
    });

    await handleTelegramUpdate({
      message: {
        chat: { id: 123 },
        from: { id: 456 },
        successful_payment: {
          currency: 'XTR',
          total_amount: 500,
          invoice_payload: payload,
          telegram_payment_charge_id: 'charge-subscription',
          is_recurring: true,
          is_first_recurring: true,
          subscription_expiration_date: 1790000000,
        },
      },
    }, { config, state, api, storage });

    expect(orders[0]).toEqual(expect.objectContaining({
      isRecurring: true,
      isFirstRecurring: true,
      subscriptionExpirationDate: 1790000000,
      subscriptionExpiresAtIso: new Date(1790000000 * 1000).toISOString(),
    }));
  });

  it('shows the current Telegram id so the owner can configure admin access', async () => {
    const state = createInitialState();
    const { api, calls, storage } = makeHarness();

    await handleTelegramUpdate({
      message: { chat: { id: 123 }, from: { id: 456, username: 'owner' }, text: '/myid' },
    }, { config, state, api, storage });

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].args[1]).toContain('456');
    expect(calls[0].args[1]).not.toContain('admin');
    expect(calls[0].args[1]).not.toContain('/admin_setup');
  });

  it('lists recent paid orders for the configured admin only', async () => {
    const state = createInitialState();
    const { api, calls, orders, storage } = makeHarness();
    orders.push({
      status: 'paid_pending_manual_activation',
      paidAt: '2026-06-02T12:00:00.000Z',
      plan: 'monthly',
      planDuration: '1 месяц',
      appNickname: 'Player One',
      telegramUserId: 456,
      totalAmount: 500,
      currency: 'XTR',
      telegramPaymentChargeId: 'charge-1',
    });

    await handleTelegramUpdate({
      message: { chat: { id: 999 }, from: { id: 999 }, text: '/orders' },
    }, { config, state, api, storage });

    await handleTelegramUpdate({
      message: { chat: { id: 111 }, from: { id: 111 }, text: '/orders' },
    }, { config, state, api, storage });

    expect(calls[0].args[1]).toContain('Последние оплаты Premium');
    expect(calls[0].args[1]).toContain('Player One');
    expect(calls[0].args[1]).toContain('500 XTR');
    expect(calls[0].args[1]).toContain('456');
    expect(calls[1].args[1]).toContain('Нет доступа');
  });

  it('allows the owner to claim admin access with the setup code', async () => {
    const state = createInitialState();
    const { api, calls, orders, storage } = makeHarness();
    orders.push({
      status: 'paid_pending_manual_activation',
      paidAt: '2026-06-02T12:00:00.000Z',
      plan: 'monthly',
      planDuration: '1 месяц',
      appNickname: 'Setup Owner Order',
      telegramUserId: 456,
      totalAmount: 500,
      currency: 'XTR',
      telegramPaymentChargeId: 'charge-setup',
    });

    await handleTelegramUpdate({
      message: { chat: { id: 777 }, from: { id: 777 }, text: '/admin_setup owner-code' },
    }, { config: { ...config, adminChatId: null }, state, api, storage });
    await handleTelegramUpdate({
      message: { chat: { id: 777 }, from: { id: 777 }, text: '/orders' },
    }, { config: { ...config, adminChatId: null }, state, api, storage });

    expect(state.adminUserIds).toEqual([777]);
    expect(calls[0].args[1]).toContain('Админ-доступ включен');
    expect(calls[1].args[1]).toContain('Setup Owner Order');
  });

  it('lets the setup owner use admin menu buttons immediately', async () => {
    const state = createInitialState();
    const { api, calls, orders, storage } = makeHarness();
    orders.push({
      status: 'paid_pending_manual_activation',
      paidAt: '2026-06-02T12:00:00.000Z',
      plan: 'yearly',
      planDuration: '1 год',
      appNickname: 'Immediate Button Order',
      telegramUserId: 456,
      totalAmount: 2500,
      currency: 'XTR',
      telegramPaymentChargeId: 'charge-button',
    });

    await handleTelegramUpdate({
      message: { chat: { id: 777 }, from: { id: 777 }, text: '/admin_setup owner-code' },
    }, { config: { ...config, adminChatId: null }, state, api, storage });
    await handleTelegramUpdate({
      callback_query: {
        id: 'cb-admin-orders',
        data: 'admin:orders',
        from: { id: 777 },
        message: { chat: { id: 777 } },
      },
    }, { config: { ...config, adminChatId: null }, state, api, storage });

    const messageTexts = calls
      .filter((call) => call.method === 'sendMessage')
      .map((call) => String(call.args[1]));
    expect(state.adminUserIds.map(String)).toContain('777');
    expect(messageTexts.join('\n')).toContain('Immediate Button Order');
    expect(messageTexts.join('\n')).not.toContain(MOJIBAKE_NO_ACCESS);
  });

  it('shows a single order by Telegram charge id for the configured admin', async () => {
    const state = createInitialState();
    const { api, calls, orders, storage } = makeHarness();
    orders.push({
      status: 'paid_pending_manual_activation',
      paidAt: '2026-06-02T12:00:00.000Z',
      plan: 'yearly',
      planDuration: '1 год',
      appNickname: 'Yearly Player',
      telegramUserId: 456,
      totalAmount: 2500,
      currency: 'XTR',
      telegramPaymentChargeId: 'charge-yearly',
    });

    await handleTelegramUpdate({
      message: { chat: { id: 999 }, from: { id: 999 }, text: '/order charge-yearly' },
    }, { config, state, api, storage });

    expect(calls[0].args[1]).toContain('Yearly Player');
    expect(calls[0].args[1]).toContain('2500 XTR');
    expect(calls[0].args[1]).toContain('charge-yearly');
  });

  it('reads JSONL order files while ignoring blank or invalid lines', () => {
    const lines = [
      JSON.stringify({ telegramPaymentChargeId: 'charge-1' }),
      '',
      'not-json',
      JSON.stringify({ telegramPaymentChargeId: 'charge-2' }),
    ].join('\n');

    expect(readOrders(lines).map((order: any) => order.telegramPaymentChargeId))
      .toEqual(['charge-1', 'charge-2']);
  });
});
