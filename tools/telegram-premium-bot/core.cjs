const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(process.cwd(), '.codex-tmp', 'telegram-premium-bot');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_DATA_DIR, 'config.json');
const DEFAULT_STATE_PATH = path.join(DEFAULT_DATA_DIR, 'state.json');
const DEFAULT_ORDERS_PATH = path.join(DEFAULT_DATA_DIR, 'orders.jsonl');
const MONTHLY_PRICE_RU_LABEL = '300 Stars';
const YEARLY_PRICE_RU_LABEL = '1800 Stars';
const CANCEL_SUBSCRIPTION_MESSAGE_RU = 'Подписку можно отменить в любой момент.';

const PLANS = {
  monthly: {
    title: 'Phraseman Premium',
    label: 'Phraseman Premium: месяц',
    description: `Месячная подписка Phraseman Premium. ${MONTHLY_PRICE_RU_LABEL}. Продлевается автоматически каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
    durationLabel: 'месяц',
  },
  yearly: {
    title: 'Phraseman Premium',
    label: 'Phraseman Premium: год',
    description: `Годовой доступ Phraseman Premium. ${YEARLY_PRICE_RU_LABEL}. Разовая оплата на 12 месяцев.`,
    durationLabel: 'год',
  },
};

const START_MESSAGE_RU = [
  'Phraseman Premium',
  '',
  'Напишите ваш ник из приложения Phraseman.',
  'Важно: напишите ник точно так же, как он указан в приложении.',
  '',
  'После ника выберите вариант:',
  'месяц — подписка с автопродлением',
  'год — разовая оплата на 12 месяцев',
].join('\n');

const NICKNAME_PROMPT_RU = 'Просто отправьте ник одним сообщением.';
const SHORT_NICKNAME_PROMPT_RU = 'Напишите Ваш ник ниже';

const MANUAL_ACTIVATION_MESSAGE_RU = [
  'Спасибо, оплата прошла.',
  '',
  'Мы активируем Premium вручную.',
  'Если доступ появился не сразу, не переживайте: иногда это занимает несколько часов.',
].join('\n');

const PAY_BUTTON_TEXT_RU = 'Оплатить Premium';
const DEFAULT_HERO_IMAGE_URL = 'https://phraseman-ea0b3.web.app/assets/telegram-premium/phraseman-premium-hero.png';
const MONTHLY_SUBSCRIPTION_PERIOD_SECONDS = 2592000;

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonFile(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  ensureDirFor(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function positiveInteger(value, fallback) {
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeId(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : String(value);
}

function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  const fileConfig = readJsonFile(configPath, {});
  return {
    botToken: process.env.PHRASEMAN_PREMIUM_BOT_TOKEN || fileConfig.botToken || '',
    adminChatId: normalizeId(process.env.PHRASEMAN_PREMIUM_ADMIN_CHAT_ID || fileConfig.adminChatId),
    adminSetupCode: process.env.PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE || fileConfig.adminSetupCode || '',
    monthlyStars: positiveInteger(process.env.PHRASEMAN_PREMIUM_MONTHLY_STARS || fileConfig.monthlyStars, 300),
    yearlyStars: positiveInteger(process.env.PHRASEMAN_PREMIUM_YEARLY_STARS || fileConfig.yearlyStars, 1800),
    heroImageUrl: process.env.PHRASEMAN_PREMIUM_HERO_IMAGE_URL || fileConfig.heroImageUrl || DEFAULT_HERO_IMAGE_URL,
    pollTimeoutSeconds: positiveInteger(process.env.PHRASEMAN_PREMIUM_POLL_TIMEOUT_SECONDS || fileConfig.pollTimeoutSeconds, 20),
    statePath: fileConfig.statePath || DEFAULT_STATE_PATH,
    ordersPath: fileConfig.ordersPath || DEFAULT_ORDERS_PATH,
  };
}

function createInitialState() {
  return {
    lastUpdateId: 0,
    sessions: {},
    adminUserIds: [],
  };
}

function loadState(statePath = DEFAULT_STATE_PATH) {
  const state = readJsonFile(statePath, null);
  if (!state || typeof state !== 'object') return createInitialState();
  return {
    lastUpdateId: Number(state.lastUpdateId || 0),
    sessions: state.sessions && typeof state.sessions === 'object' ? state.sessions : {},
    adminUserIds: Array.isArray(state.adminUserIds) ? state.adminUserIds : [],
  };
}

function saveState(statePath, state) {
  writeJsonFile(statePath || DEFAULT_STATE_PATH, state);
}

function appendJsonLine(filePath, value) {
  ensureDirFor(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function readOrders(jsonlText) {
  return String(jsonlText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((order) => order && typeof order === 'object');
}

function createFileStorage(config) {
  return {
    appendOrder: async (order) => appendJsonLine(config.ordersPath || DEFAULT_ORDERS_PATH, order),
    readOrders: async () => {
      const ordersPath = config.ordersPath || DEFAULT_ORDERS_PATH;
      if (!fs.existsSync(ordersPath)) return [];
      return readOrders(fs.readFileSync(ordersPath, 'utf8'));
    },
  };
}

function buildMainMenu() {
  return {
    inline_keyboard: [
      [{ text: 'Оплатить Premium', callback_data: 'premium:start' }],
    ],
  };
}

function buildStartReplyKeyboard() {
  return {
    keyboard: [[{ text: PAY_BUTTON_TEXT_RU }]],
    resize_keyboard: true,
    one_time_keyboard: false,
    input_field_placeholder: 'Ник в Phraseman',
  };
}

function buildPlanMenu(config) {
  return {
    inline_keyboard: [
      [{ text: `Месяц - ${config.monthlyStars} Stars`, callback_data: 'plan:monthly' }],
      [{ text: `Год - ${config.yearlyStars} Stars`, callback_data: 'plan:yearly' }],
      [{ text: 'Изменить ник', callback_data: 'premium:start' }],
    ],
  };
}

function buildAdminMenu() {
  return {
    inline_keyboard: [
      [{ text: 'Последние оплаты', callback_data: 'admin:orders' }],
      [{ text: 'Команды', callback_data: 'admin:help' }],
    ],
  };
}

function sessionKeyFromUserId(userId) {
  return String(userId || '');
}

function getSession(state, userId) {
  const key = sessionKeyFromUserId(userId);
  if (!state.sessions[key]) state.sessions[key] = { step: 'idle' };
  return state.sessions[key];
}

function sanitizeNickname(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

function getStarsForPlan(config, plan) {
  return plan === 'yearly' ? config.yearlyStars : config.monthlyStars;
}

function assertKnownPlan(plan) {
  if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
    throw new Error(`Unknown premium plan: ${plan}`);
  }
}

function buildInvoicePayload({ plan, userId, chatId, appNickname }) {
  assertKnownPlan(plan);
  const payload = {
    v: 1,
    p: plan === 'yearly' ? 'y' : 'm',
    u: userId,
    c: chatId,
    n: sanitizeNickname(appNickname),
    t: Math.floor(Date.now() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  if (Buffer.byteLength(encoded, 'utf8') > 128) {
    throw new Error('Telegram invoice payload is too long.');
  }
  return encoded;
}

function parseInvoicePayload(payload) {
  const parsed = JSON.parse(Buffer.from(String(payload || ''), 'base64url').toString('utf8'));
  const plan = parsed.plan || (parsed.p === 'y' ? 'yearly' : 'monthly');
  assertKnownPlan(plan);
  return {
    v: parsed.v,
    plan,
    userId: parsed.userId || parsed.u,
    chatId: parsed.chatId || parsed.c,
    appNickname: sanitizeNickname(parsed.appNickname || parsed.n),
    issuedAt: parsed.issuedAt || parsed.t,
  };
}

function buildPremiumInvoice({ config, chatId, userId, plan, appNickname, payload }) {
  assertKnownPlan(plan);
  const planInfo = PLANS[plan];
  const invoice = {
    chat_id: chatId,
    title: planInfo.title,
    description: planInfo.description,
    payload: payload || buildInvoicePayload({ plan, userId, chatId, appNickname }),
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: planInfo.label, amount: getStarsForPlan(config, plan) }],
    start_parameter: `phraseman-premium-${plan}`,
  };
  if (plan === 'monthly') {
    invoice.subscription_period = MONTHLY_SUBSCRIPTION_PERIOD_SECONDS;
  }
  return invoice;
}

function getTelegramUser(updatePart) {
  return updatePart?.from || updatePart?.message?.from || {};
}

function isAdmin(config, state, userId) {
  const configAdmin = config.adminChatId !== null
    && config.adminChatId !== undefined
    && String(config.adminChatId) === String(userId);
  const stateAdmin = Array.isArray(state.adminUserIds)
    && state.adminUserIds.map(String).includes(String(userId));
  return configAdmin || stateAdmin;
}

function formatTelegramUser(order) {
  return String(order.telegramUserId || '-');
}

function formatOrderShort(order, index) {
  const paidAt = order.paidAt ? new Date(order.paidAt).toLocaleString('ru-RU') : '-';
  return [
    `${index}. ${order.appNickname || '-'}`,
    `Тариф: ${order.planDuration || order.plan || '-'}`,
    `Оплата: ${order.totalAmount || 0} ${order.currency || 'XTR'}`,
    `Telegram: ${formatTelegramUser(order)}`,
    `Дата: ${paidAt}`,
    `Charge ID: ${order.telegramPaymentChargeId || '-'}`,
    `Статус: ${order.status || '-'}`,
  ].join('\n');
}

function formatOrderFull(order) {
  const paidAt = order.paidAt ? new Date(order.paidAt).toLocaleString('ru-RU') : '-';
  return [
    'Оплата Phraseman Premium',
    '',
    `Ник в Phraseman: ${order.appNickname || '-'}`,
    `Тариф: ${order.planDuration || order.plan || '-'}`,
    `Stars: ${order.totalAmount || 0} ${order.currency || 'XTR'}`,
    `Дата: ${paidAt}`,
    `Статус: ${order.status || '-'}`,
    '',
    `Telegram user id: ${order.telegramUserId || '-'}`,
    '',
    `Telegram charge id: ${order.telegramPaymentChargeId || '-'}`,
  ].join('\n');
}

function getAdminChatIds(config, state) {
  const ids = [];
  if (config.adminChatId !== null && config.adminChatId !== undefined && config.adminChatId !== '') {
    ids.push(config.adminChatId);
  }
  if (Array.isArray(state.adminUserIds)) {
    ids.push(...state.adminUserIds);
  }
  return [...new Set(ids.map(String))];
}

async function sendMyId(api, chatId, user) {
  await api.sendMessage(chatId, [
    `Ваш Telegram id: ${user.id}`,
    user.username ? `Username: @${user.username}` : 'Username: -',
  ].join('\n'));
}

async function sendAdminHelp(api, chatId) {
  await api.sendMessage(chatId, [
    'Админ-меню Phraseman Premium',
    '',
    '/admin - открыть меню',
    '/orders - последние 10 оплат',
    '/order <charge_id> - детали одной оплаты',
    '/myid - показать ваш Telegram id',
    '',
    'После каждой успешной оплаты бот пришлет вам отчет в личку, если админ-доступ включен.',
  ].join('\n'), { reply_markup: buildAdminMenu() });
}

async function sendAdminSetup(api, chatId, context, userId, text) {
  const { config, state } = context;
  const setupCode = String(text || '').replace(/^\/admin_setup\s+/i, '').trim();
  if (!config.adminSetupCode) {
    await api.sendMessage(chatId, 'Админ-код не настроен. Укажите adminSetupCode в config.json.');
    return;
  }
  if (!setupCode || setupCode === '/admin_setup' || setupCode !== String(config.adminSetupCode)) {
    await api.sendMessage(chatId, 'Неверный админ-код.');
    return;
  }
  if (!Array.isArray(state.adminUserIds)) state.adminUserIds = [];
  if (!state.adminUserIds.map(String).includes(String(userId))) {
    state.adminUserIds.push(userId);
  }
  await api.sendMessage(chatId, 'Админ-доступ включен. Теперь используйте /admin или /orders.', {
    reply_markup: buildAdminMenu(),
  });
}

async function sendOrdersList(api, chatId, context, userId) {
  const { config, state, storage } = context;
  if (!isAdmin(config, state, userId)) {
    await api.sendMessage(chatId, 'Нет доступа. Для админ-доступа укажите ваш Telegram id в adminChatId.');
    return;
  }
  const orders = await storage.readOrders();
  const recent = orders.slice(-10).reverse();
  if (recent.length === 0) {
    await api.sendMessage(chatId, 'Оплат пока нет.');
    return;
  }
  await api.sendMessage(chatId, [
    'Последние оплаты Premium',
    '',
    ...recent.map((order, index) => formatOrderShort(order, index + 1)),
  ].join('\n\n'));
}

async function sendOrderDetails(api, chatId, context, userId, text) {
  const { config, state, storage } = context;
  if (!isAdmin(config, state, userId)) {
    await api.sendMessage(chatId, 'Нет доступа. Для админ-доступа укажите ваш Telegram id в adminChatId.');
    return;
  }
  const chargeId = String(text || '').replace(/^\/order\s+/i, '').trim();
  if (!chargeId || chargeId === '/order') {
    await api.sendMessage(chatId, 'Напишите так: /order <telegram_charge_id>');
    return;
  }
  const orders = await storage.readOrders();
  const order = [...orders].reverse().find((item) => String(item.telegramPaymentChargeId || '') === chargeId);
  if (!order) {
    await api.sendMessage(chatId, `Оплата с charge id "${chargeId}" не найдена.`);
    return;
  }
  await api.sendMessage(chatId, formatOrderFull(order));
}

async function sendStart(api, chatId, state, userId) {
  const session = getSession(state, userId);
  session.step = 'awaiting_nickname';
  const caption = `${START_MESSAGE_RU}\n\n${NICKNAME_PROMPT_RU}`;
  if (typeof api.sendPhoto === 'function') {
    try {
      await api.sendPhoto(chatId, {
        photo: DEFAULT_HERO_IMAGE_URL,
        caption,
        reply_markup: buildStartReplyKeyboard(),
      });
      return;
    } catch {
      // Fall back to text so the purchase flow still starts if the image is unavailable.
    }
  }
  await api.sendMessage(chatId, caption, { reply_markup: buildStartReplyKeyboard() });
}

async function sendShortNicknamePrompt(api, chatId, state, userId) {
  const session = getSession(state, userId);
  session.step = 'awaiting_nickname';
  await api.sendMessage(chatId, SHORT_NICKNAME_PROMPT_RU, { reply_markup: buildStartReplyKeyboard() });
}

async function sendPlanChoice(api, chatId, config, state, userId, appNickname) {
  const session = getSession(state, userId);
  session.step = 'choosing_plan';
  session.appNickname = appNickname;
  await api.sendMessage(
    chatId,
    [
      `Ник: ${appNickname}`,
      '',
      'Проверьте, что ник написан точно так же, как в Phraseman.',
      '',
      `Месяц: ${MONTHLY_PRICE_RU_LABEL}, автопродление каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
      `Год: ${YEARLY_PRICE_RU_LABEL}, разовая оплата на 12 месяцев.`,
      '',
      'Выберите вариант:',
    ].join('\n'),
    { reply_markup: buildPlanMenu(config) }
  );
}

async function sendMonthlyInvoiceLink(api, chatId, invoice) {
  if (typeof api.createInvoiceLink !== 'function') {
    await api.sendInvoice(chatId, invoice);
    return;
  }
  const link = await api.createInvoiceLink(invoice);
  await api.sendMessage(
    chatId,
    `Месяц: подписка с автопродлением каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: 'Оплатить месяц', url: link }]],
      },
    }
  );
}

async function handleMessage(update, context) {
  const { api, config, state } = context;
  const message = update.message;
  const chatId = message?.chat?.id;
  const user = getTelegramUser(message);
  const userId = user.id;
  if (!chatId || !userId) return;

  if (message.successful_payment) {
    await handleSuccessfulPayment(message, context);
    return;
  }

  const text = String(message.text || '').trim();
  if (text === '/myid') {
    await sendMyId(api, chatId, user);
    return;
  }
  if (text.startsWith('/admin_setup')) {
    await sendAdminSetup(api, chatId, context, userId, text);
    return;
  }
  if (text === '/admin') {
    if (!isAdmin(config, state, userId)) {
      await api.sendMessage(chatId, 'Нет доступа. Сначала включите админ-доступ через /admin_setup <код>.');
      return;
    }
    await sendAdminHelp(api, chatId);
    return;
  }
  if (text === '/orders') {
    await sendOrdersList(api, chatId, context, userId);
    return;
  }
  if (text.startsWith('/order')) {
    await sendOrderDetails(api, chatId, context, userId, text);
    return;
  }
  if (text === '/start' || text === '/premium') {
    await sendStart(api, chatId, state, userId);
    return;
  }
  if (text === PAY_BUTTON_TEXT_RU) {
    await sendShortNicknamePrompt(api, chatId, state, userId);
    return;
  }

  const session = getSession(state, userId);
  if (session.step === 'awaiting_nickname') {
    const appNickname = sanitizeNickname(text);
    if (appNickname.length < 2) {
      await api.sendMessage(chatId, 'Ник слишком короткий. Введите ник из приложения Phraseman.');
      return;
    }
    await sendPlanChoice(api, chatId, config, state, userId, appNickname);
    return;
  }

  await api.sendMessage(chatId, START_MESSAGE_RU, { reply_markup: buildStartReplyKeyboard() });
}

async function handleCallbackQuery(update, context) {
  const { api, config, state } = context;
  const callbackQuery = update.callback_query;
  const data = String(callbackQuery?.data || '');
  const chatId = callbackQuery?.message?.chat?.id;
  const userId = callbackQuery?.from?.id;
  if (!chatId || !userId) return;

  await api.answerCallbackQuery(callbackQuery.id);

  if (data === 'premium:start') {
    await sendShortNicknamePrompt(api, chatId, state, userId);
    return;
  }

  if (data === 'admin:orders') {
    await sendOrdersList(api, chatId, context, userId);
    return;
  }

  if (data === 'admin:help') {
    if (!isAdmin(config, state, userId)) {
      await api.sendMessage(chatId, 'Нет доступа.');
      return;
    }
    await sendAdminHelp(api, chatId);
    return;
  }

  if (data.startsWith('plan:')) {
    const plan = data.slice('plan:'.length);
    const session = getSession(state, userId);
    const appNickname = sanitizeNickname(session.appNickname);
    if (!appNickname) {
      await sendStart(api, chatId, state, userId);
      return;
    }
    const payload = buildInvoicePayload({ plan, userId, chatId, appNickname });
    const invoice = buildPremiumInvoice({
      config,
      chatId,
      userId,
      plan,
      appNickname,
      payload,
    });
    if (plan === 'monthly') {
      await sendMonthlyInvoiceLink(api, chatId, invoice);
      return;
    }
    await api.sendInvoice(chatId, invoice);
  }
}

async function handlePreCheckoutQuery(update, context) {
  const { api, config } = context;
  const query = update.pre_checkout_query;
  try {
    const payload = parseInvoicePayload(query.invoice_payload);
    const expectedAmount = getStarsForPlan(config, payload.plan);
    if (query.currency !== 'XTR') {
      await api.answerPreCheckoutQuery(query.id, {
        ok: false,
        error_message: 'Оплата Premium принимается только в Telegram Stars.',
      });
      return;
    }
    if (query.total_amount !== expectedAmount) {
      await api.answerPreCheckoutQuery(query.id, {
        ok: false,
        error_message: 'Сумма оплаты не совпадает с выбранным тарифом. Попробуйте создать счет заново.',
      });
      return;
    }
    await api.answerPreCheckoutQuery(query.id, { ok: true });
  } catch {
    await api.answerPreCheckoutQuery(query.id, {
      ok: false,
      error_message: 'Не удалось проверить заказ. Попробуйте начать оплату заново.',
    });
  }
}

async function handleSuccessfulPayment(message, context) {
  const { api, config, state, storage } = context;
  const payment = message.successful_payment;
  const payload = parseInvoicePayload(payment.invoice_payload);
  const user = message.from || {};
  const chatId = message.chat?.id || payload.chatId;
  const order = {
    status: 'paid_pending_manual_activation',
    paidAt: new Date().toISOString(),
    plan: payload.plan,
    planDuration: PLANS[payload.plan].durationLabel,
    appNickname: payload.appNickname,
    telegramUserId: user.id || payload.userId,
    currency: payment.currency,
    totalAmount: payment.total_amount,
    telegramPaymentChargeId: payment.telegram_payment_charge_id,
    isRecurring: payment.is_recurring === true,
    isFirstRecurring: payment.is_first_recurring === true,
    subscriptionExpirationDate: payment.subscription_expiration_date || null,
    subscriptionExpiresAtIso: payment.subscription_expiration_date
      ? new Date(payment.subscription_expiration_date * 1000).toISOString()
      : null,
  };

  await storage.appendOrder(order);
  await api.sendMessage(chatId, [
    MANUAL_ACTIVATION_MESSAGE_RU,
    '',
    `Ник: ${order.appNickname}`,
    `Вариант: ${order.planDuration}`,
    order.plan === 'monthly'
      ? 'Продление: автоматически каждые 30 дней'
      : 'Продление: нет, это разовая оплата на год',
  ].join('\n'));

  const adminChatIds = getAdminChatIds(config, state);
  for (const adminChatId of adminChatIds) {
    await api.sendMessage(adminChatId, [
      'Новая оплата Phraseman Premium',
      `Ник: ${order.appNickname}`,
      `Тариф: ${order.planDuration}`,
      `Stars: ${order.totalAmount}`,
      `Telegram id: ${order.telegramUserId}`,
      `Charge ID: ${order.telegramPaymentChargeId}`,
      '',
      'Статус: ожидает ручной активации',
    ].join('\n'));
  }
}

async function handleTelegramUpdate(update, context) {
  if (update.message) return handleMessage(update, context);
  if (update.callback_query) return handleCallbackQuery(update, context);
  if (update.pre_checkout_query) return handlePreCheckoutQuery(update, context);
  return undefined;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  DEFAULT_ORDERS_PATH,
  DEFAULT_STATE_PATH,
  MANUAL_ACTIVATION_MESSAGE_RU,
  NICKNAME_PROMPT_RU,
  PAY_BUTTON_TEXT_RU,
  PLANS,
  START_MESSAGE_RU,
  buildInvoicePayload,
  buildAdminMenu,
  buildMainMenu,
  buildPlanMenu,
  buildPremiumInvoice,
  buildStartReplyKeyboard,
  createFileStorage,
  createInitialState,
  handleTelegramUpdate,
  loadConfig,
  loadState,
  parseInvoicePayload,
  readOrders,
  saveState,
};
