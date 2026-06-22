// ============================================================================
// ⛔ STRICT POLICY — Telegram premium bot. ОБЯЗАТЕЛЬНО К СОБЛЮДЕНИЮ ВО ВСЕХ СЕССИЯХ.
// ----------------------------------------------------------------------------
// 1. ВЫДАЧА ПРЕМИУМА/VIP ПО TELEGRAM-ОПЛАТЕ — ТОЛЬКО ВРУЧНУЮ (через admin/testers.html).
//    НЕ автоматизировать активацию по successful_payment. Бот пишет ТОЛЬКО заявку
//    (telegram_premium_orders, status='paid_pending_manual_activation') и уведомляет
//    админов. Реальную выдачу делает человек. Это осознанное требование владельца.
// 2. В КЛИЕНТСКОМ ПРИЛОЖЕНИИ (app/, components/) — НИКАКИХ упоминаний оплаты в
//    Telegram: ни кнопок, ни текста, ни ссылок, ни «оплатить в Telegram». App Store /
//    Google Play БАНЯТ за внешние способы оплаты. Любой код/текст про Telegram-оплату
//    в приложении = риск бана. Telegram-оплата существует ТОЛЬКО здесь, на сервере/в боте.
// 3. Деньги не должны теряться: при сбое записи заявки апдейт уходит в dead-letter
//    (telegram_premium_dead_letter) и webhook возвращает 500, чтобы Telegram повторил.
// ============================================================================
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import {
  SUPPORT_BUTTON_TEXT_RU,
  SUPPORT_CALLBACK_START,
  SupportDeps,
  clearSupportState,
  tryHandleSupportCallback,
  tryHandleSupportMessage,
} from './telegram_support';

const TELEGRAM_API = 'https://api.telegram.org';
const REGION = 'us-central1';

const PHRASEMAN_PREMIUM_BOT_TOKEN = defineSecret('PHRASEMAN_PREMIUM_BOT_TOKEN');
const PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE = defineSecret('PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE');
const PHRASEMAN_PREMIUM_WEBHOOK_SECRET = defineSecret('PHRASEMAN_PREMIUM_WEBHOOK_SECRET');

type PremiumPlan = 'monthly' | 'yearly';

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  chat?: { id?: number | string };
  from?: TelegramUser;
  text?: string;
  reply_to_message?: { message_id?: number };
  successful_payment?: {
    currency?: string;
    total_amount?: number;
    invoice_payload?: string;
    telegram_payment_charge_id?: string;
    provider_payment_charge_id?: string;
    subscription_expiration_date?: number;
    is_recurring?: true;
    is_first_recurring?: true;
  };
};

type TelegramCallbackQuery = {
  id?: string;
  data?: string;
  from?: TelegramUser;
  message?: TelegramMessage;
};

type TelegramPreCheckoutQuery = {
  id?: string;
  from?: TelegramUser;
  currency?: string;
  total_amount?: number;
  invoice_payload?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  pre_checkout_query?: TelegramPreCheckoutQuery;
};

type BotSession = {
  step?: 'idle' | 'awaiting_nickname' | 'choosing_plan';
  appNickname?: string;
  updatedAt?: number;
};

type InvoicePayload = {
  v?: number;
  plan: PremiumPlan;
  userId: number | string;
  chatId: number | string;
  appNickname: string;
  issuedAt?: number;
};

const MONTHLY_SUBSCRIPTION_PERIOD_SECONDS = 2592000;
const CANCEL_SUBSCRIPTION_MESSAGE_RU = 'Подписку можно отменить в любой момент.';
const SHORT_NICKNAME_PROMPT_RU = 'Напишите Ваш ник ниже';

// Ярлык цены строится из конфигурируемой суммы Stars (monthlyStars/yearlyStars),
// чтобы текст, который видит пользователь, всегда совпадал с реально списываемой
// суммой (env PHRASEMAN_PREMIUM_*_STARS). Никаких вшитых чисел.
function priceLabelForPlan(plan: PremiumPlan): string {
  return `${starsForPlan(plan)} Stars`;
}

// Статичная часть плана (без цены — цена подставляется в planDescription лениво,
// когда уже доступны monthly/yearlyStars()).
const PLANS: Record<PremiumPlan, { label: string; durationLabel: string }> = {
  monthly: { label: 'Phraseman Premium: месяц', durationLabel: 'месяц' },
  yearly: { label: 'Phraseman Premium: год', durationLabel: 'год' },
};

/** Описание счёта для пользователя с актуальной ценой из конфига. */
function planDescription(plan: PremiumPlan): string {
  if (plan === 'monthly') {
    return `Месячная подписка Phraseman Premium. ${priceLabelForPlan('monthly')}. Продлевается автоматически каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`;
  }
  return `Годовой доступ Phraseman Premium. ${priceLabelForPlan('yearly')}. Разовая оплата на 12 месяцев.`;
}

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

const MANUAL_ACTIVATION_MESSAGE_RU = [
  'Спасибо, оплата прошла.',
  '',
  'Мы активируем Premium вручную.',
  'Если доступ появился не сразу, не переживайте: иногда это занимает несколько часов.',
].join('\n');

function userActivatedMessageRu(order: FirebaseFirestore.DocumentData): string {
  const until = activationUntilLabel(order);
  return [
    'Premium активирован! 🎉',
    '',
    'Откройте Phraseman и перезайдите в приложение — доступ уже открыт.',
    until && until !== '-' ? `Действует до: ${until}` : null,
    '',
    'Если доступа всё ещё нет, нажмите «Связаться с поддержкой» ниже.',
  ].filter(Boolean).join('\n');
}

function monthlyStars(): number {
  const value = Number(process.env.PHRASEMAN_PREMIUM_MONTHLY_STARS || 500);
  return Number.isSafeInteger(value) && value > 0 ? value : 500;
}

function yearlyStars(): number {
  const value = Number(process.env.PHRASEMAN_PREMIUM_YEARLY_STARS || 2500);
  return Number.isSafeInteger(value) && value > 0 ? value : 2500;
}

function starsForPlan(plan: PremiumPlan): number {
  return plan === 'yearly' ? yearlyStars() : monthlyStars();
}

function sanitizeNickname(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

function assertPlan(plan: unknown): asserts plan is PremiumPlan {
  if (plan !== 'monthly' && plan !== 'yearly') throw new Error('unknown plan');
}

function buildInvoicePayload(input: InvoicePayload): string {
  assertPlan(input.plan);
  const payload = {
    v: 1,
    p: input.plan === 'yearly' ? 'y' : 'm',
    u: input.userId,
    c: input.chatId,
    n: sanitizeNickname(input.appNickname),
    t: Math.floor(Date.now() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  if (Buffer.byteLength(encoded, 'utf8') > 128) throw new Error('invoice payload too long');
  return encoded;
}

function parseInvoicePayload(payload: string | undefined): InvoicePayload {
  const parsed = JSON.parse(Buffer.from(String(payload || ''), 'base64url').toString('utf8')) as Record<string, unknown>;
  const plan = parsed.plan || (parsed.p === 'y' ? 'yearly' : 'monthly');
  assertPlan(plan);
  return {
    v: Number(parsed.v || 1),
    plan,
    userId: (parsed.userId || parsed.u) as number | string,
    chatId: (parsed.chatId || parsed.c) as number | string,
    appNickname: sanitizeNickname(parsed.appNickname || parsed.n),
    issuedAt: Number(parsed.issuedAt || parsed.t || 0),
  };
}

const PAY_BUTTON_TEXT_RU = 'Оплатить Premium';
const HERO_IMAGE_URL = 'https://phraseman-ea0b3.web.app/assets/telegram-premium/phraseman-premium-hero.png';

function mainMenu() {
  return { inline_keyboard: [[{ text: 'Оплатить Premium', callback_data: 'premium:start' }]] };
}

function startReplyKeyboard() {
  return {
    keyboard: [[{ text: PAY_BUTTON_TEXT_RU }], [{ text: SUPPORT_BUTTON_TEXT_RU }]],
    resize_keyboard: true,
    one_time_keyboard: false,
    input_field_placeholder: 'Ник в Phraseman',
  };
}

function planMenu() {
  return {
    inline_keyboard: [
      [{ text: `Месяц - ${monthlyStars()} Stars`, callback_data: 'plan:monthly' }],
      [{ text: `Год - ${yearlyStars()} Stars`, callback_data: 'plan:yearly' }],
      [{ text: 'Изменить ник', callback_data: 'premium:start' }],
    ],
  };
}

function adminMenu() {
  return {
    inline_keyboard: [
      [{ text: 'Последние оплаты', callback_data: 'admin:orders' }],
      [{ text: 'Команды', callback_data: 'admin:help' }],
    ],
  };
}

async function telegramRequest(token: string, method: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null) as { ok?: boolean; description?: string; result?: unknown } | null;
  if (!response.ok || !data?.ok) {
    throw new Error(`Telegram ${method} failed: ${data?.description || `HTTP ${response.status}`}`);
  }
  return data.result;
}

function sendMessage(token: string, chatId: number | string, text: string, options: Record<string, unknown> = {}) {
  return telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options,
  });
}

function sendPhoto(token: string, chatId: number | string, photo: string, options: Record<string, unknown> = {}) {
  return telegramRequest(token, 'sendPhoto', {
    chat_id: chatId,
    photo,
    ...options,
  });
}

function answerCallbackQuery(token: string, callbackQueryId: string, options: Record<string, unknown> = {}) {
  return telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...options,
  });
}

function answerPreCheckoutQuery(token: string, preCheckoutQueryId: string, options: Record<string, unknown>) {
  return telegramRequest(token, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ...options,
  });
}

function sendInvoice(token: string, chatId: number | string, input: InvoicePayload) {
  const plan = input.plan;
  const planInfo = PLANS[plan];
  const invoice: Record<string, unknown> = {
    chat_id: chatId,
    title: 'Phraseman Premium',
    description: planDescription(plan),
    payload: buildInvoicePayload(input),
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: planInfo.label, amount: starsForPlan(plan) }],
    start_parameter: `phraseman-premium-${plan}`,
  };
  if (plan === 'monthly') {
    invoice.subscription_period = MONTHLY_SUBSCRIPTION_PERIOD_SECONDS;
  }
  return telegramRequest(token, 'sendInvoice', invoice);
}

async function createInvoiceLink(token: string, input: InvoicePayload): Promise<string> {
  const invoice = sendInvoicePayload(input);
  const result = await telegramRequest(token, 'createInvoiceLink', invoice);
  return String(result || '');
}

function sendInvoicePayload(input: InvoicePayload): Record<string, unknown> {
  const plan = input.plan;
  const planInfo = PLANS[plan];
  const invoice: Record<string, unknown> = {
    title: 'Phraseman Premium',
    description: planDescription(plan),
    payload: buildInvoicePayload(input),
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: planInfo.label, amount: starsForPlan(plan) }],
    start_parameter: `phraseman-premium-${plan}`,
  };
  if (plan === 'monthly') {
    invoice.subscription_period = MONTHLY_SUBSCRIPTION_PERIOD_SECONDS;
  }
  return invoice;
}

async function sendPremiumWelcome(token: string, chatId: number | string): Promise<void> {
  const caption = `${START_MESSAGE_RU}\n\nПросто отправьте ник одним сообщением.`;
  try {
    await sendPhoto(token, chatId, HERO_IMAGE_URL, {
      caption,
      reply_markup: startReplyKeyboard(),
    });
  } catch {
    await sendMessage(token, chatId, caption, {
      reply_markup: startReplyKeyboard(),
    });
  }
}

async function sendShortNicknamePrompt(token: string, chatId: number | string): Promise<void> {
  await sendMessage(token, chatId, SHORT_NICKNAME_PROMPT_RU, {
    reply_markup: startReplyKeyboard(),
  });
}

async function sendMonthlyInvoiceLink(token: string, chatId: number | string, input: InvoicePayload): Promise<void> {
  const link = await createInvoiceLink(token, input);
  await sendMessage(token, chatId, `Месяц: подписка с автопродлением каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`, {
    reply_markup: {
      inline_keyboard: [[{ text: 'Оплатить месяц', url: link }]],
    },
  });
}

const db = admin.firestore();

// Dead-letter: сырой апдейт Telegram, который не удалось обработать (особенно
// successful_payment, где Stars уже списаны). Пишем ДО проброса ошибки, чтобы факт
// оплаты не пропал, даже если основная запись заявки упала. Best-effort: если и
// сюда не записалось — ошибка всё равно пробросится и webhook вернёт 500 → Telegram
// повторит апдейт. См. STRICT POLICY п.3 в шапке файла.
async function writeDeadLetter(
  reason: string,
  update: TelegramUpdate,
  error: unknown,
): Promise<void> {
  try {
    const charge = update.message?.successful_payment?.telegram_payment_charge_id;
    const id = charge ? `charge-${charge}` : `dl-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await db.collection('telegram_premium_dead_letter').doc(id).set({
      reason,
      hasSuccessfulPayment: Boolean(update.message?.successful_payment),
      rawUpdate: update,
      errorMessage: String((error as { message?: unknown })?.message ?? error).slice(0, 500),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtIso: new Date().toISOString(),
      resolved: false,
    }, { merge: true });
  } catch (dlError) {
    console.error('telegramPremium writeDeadLetter failed', dlError);
  }
}

function sessionRef(userId: number | string) {
  return db.collection('telegram_premium_bot_sessions').doc(String(userId));
}

function configRef() {
  return db.collection('telegram_premium_bot').doc('config');
}

async function readSession(userId: number | string): Promise<BotSession> {
  const snap = await sessionRef(userId).get();
  return snap.exists ? (snap.data() as BotSession) : { step: 'idle' };
}

async function writeSession(userId: number | string, session: BotSession): Promise<void> {
  await sessionRef(userId).set({ ...session, updatedAt: Date.now() }, { merge: true });
}

async function readAdminUserIds(): Promise<string[]> {
  const snap = await configRef().get();
  const ids = snap.exists && Array.isArray(snap.data()?.adminUserIds) ? snap.data()?.adminUserIds : [];
  return ids.map(String);
}

async function isAdmin(userId: number | string): Promise<boolean> {
  return (await readAdminUserIds()).includes(String(userId));
}

async function addAdmin(userId: number | string): Promise<void> {
  await configRef().set({
    adminUserIds: admin.firestore.FieldValue.arrayUnion(String(userId)),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// Чат поддержки (telegram_support.ts) использует тот же Telegram-клиент и
// реестр админов, что и остальной бот.
const supportDeps: SupportDeps = { sendMessage, isAdmin, readAdminUserIds };

function formatTelegramUser(order: FirebaseFirestore.DocumentData): string {
  return String(order.telegramUserId || '-');
}

function formatOrderShort(order: FirebaseFirestore.DocumentData, index: number): string {
  const paidAt = order.paidAtIso || '-';
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

async function sendOrdersList(token: string, chatId: number | string, userId: number | string): Promise<void> {
  if (!(await isAdmin(userId))) {
    await sendMessage(token, chatId, 'Нет доступа. Сначала включите админ-доступ через /admin_setup <код>.');
    return;
  }
  const snap = await db.collection('telegram_premium_orders')
    .orderBy('paidAt', 'desc')
    .limit(10)
    .get();
  if (snap.empty) {
    await sendMessage(token, chatId, 'Оплат пока нет.');
    return;
  }
  await sendMessage(token, chatId, [
    'Последние оплаты Premium',
    '',
    ...snap.docs.map((doc, index) => formatOrderShort(doc.data(), index + 1)),
  ].join('\n\n'));
}

async function sendAdminHelp(token: string, chatId: number | string): Promise<void> {
  await sendMessage(token, chatId, [
    'Админ-меню Phraseman Premium',
    '',
    '/admin - открыть меню',
    '/orders - последние 10 оплат',
    '/order <charge_id> - детали одной оплаты',
    '/myid - показать ваш Telegram id',
    '',
    'После каждой успешной оплаты бот пришлет вам отчет в личку.',
  ].join('\n'), { reply_markup: adminMenu() });
}

async function sendOrderDetails(token: string, chatId: number | string, userId: number | string, text: string): Promise<void> {
  if (!(await isAdmin(userId))) {
    await sendMessage(token, chatId, 'Нет доступа. Сначала включите админ-доступ через /admin_setup <код>.');
    return;
  }
  const chargeId = text.replace(/^\/order\s+/i, '').trim();
  if (!chargeId || chargeId === '/order') {
    await sendMessage(token, chatId, 'Напишите так: /order <telegram_charge_id>');
    return;
  }
  const doc = await db.collection('telegram_premium_orders').doc(chargeId).get();
  if (!doc.exists) {
    await sendMessage(token, chatId, `Оплата с charge id "${chargeId}" не найдена.`);
    return;
  }
  const order = doc.data() || {};
  await sendMessage(token, chatId, [
    'Оплата Phraseman Premium',
    '',
    `Ник в Phraseman: ${order.appNickname || '-'}`,
    `Тариф: ${order.planDuration || order.plan || '-'}`,
    `Stars: ${order.totalAmount || 0} ${order.currency || 'XTR'}`,
    `Дата: ${order.paidAtIso || '-'}`,
    `Статус: ${order.status || '-'}`,
    '',
    `Telegram user id: ${formatTelegramUser(order)}`,
    '',
    `Telegram charge id: ${order.telegramPaymentChargeId || '-'}`,
  ].join('\n'));
}

async function handleAdminSetup(token: string, chatId: number | string, userId: number | string, text: string): Promise<void> {
  const expectedCode = PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE.value();
  const actualCode = text.replace(/^\/admin_setup\s+/i, '').trim();
  if (!expectedCode) {
    await sendMessage(token, chatId, 'Админ-код не настроен в Firebase Secret.');
    return;
  }
  if (!actualCode || actualCode === '/admin_setup' || actualCode !== expectedCode) {
    await sendMessage(token, chatId, 'Неверный админ-код.');
    return;
  }
  await addAdmin(userId);
  await sendMessage(token, chatId, 'Админ-доступ включен. Теперь используйте /admin или /orders.', { reply_markup: adminMenu() });
}

async function notifyAdmins(token: string, order: FirebaseFirestore.DocumentData): Promise<void> {
  const adminIds = await readAdminUserIds();
  const text = [
    'Новая оплата Phraseman Premium',
    `Ник: ${order.appNickname}`,
    `Тариф: ${order.planDuration}`,
    `Stars: ${order.totalAmount}`,
    `Telegram id: ${order.telegramUserId}`,
    `Charge ID: ${order.telegramPaymentChargeId}`,
    '',
    'Статус: ожидает ручной активации',
  ].join('\n');
  await Promise.all(adminIds.map((adminId) => sendMessage(token, adminId, text).catch(() => undefined)));
}

function activationUntilLabel(order: FirebaseFirestore.DocumentData): string {
  const value = order.activatedUntil || order.subscriptionExpiresAtIso || '';
  if (!value) return '-';
  const millis = Number(value);
  if (Number.isFinite(millis) && millis > 0) {
    return new Date(millis).toLocaleString('ru-RU');
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ru-RU');
}

async function notifyUserActivated(token: string, order: FirebaseFirestore.DocumentData): Promise<boolean> {
  const userId = order.telegramUserId;
  if (!userId) return false;
  await sendMessage(token, userId, userActivatedMessageRu(order), {
    reply_markup: {
      inline_keyboard: [[{ text: SUPPORT_BUTTON_TEXT_RU, callback_data: SUPPORT_CALLBACK_START }]],
    },
  });
  return true;
}

async function notifyTesterActivationAdmins(token: string, order: FirebaseFirestore.DocumentData): Promise<void> {
  const adminIds = await readAdminUserIds();
  const text = [
    'Premium активирован',
    `Ник: ${order.appNickname || '-'}`,
    `Тариф: ${order.planDuration || order.activatedPeriod || order.plan || '-'}`,
    `Статус: VIP выдан через админку`,
    `Срок до: ${activationUntilLabel(order)}`,
    order.totalAmount ? `Stars: ${order.totalAmount}` : null,
    order.telegramUserId ? `Telegram id: ${order.telegramUserId}` : null,
    order.telegramPaymentChargeId ? `Charge ID: ${order.telegramPaymentChargeId}` : null,
  ].filter(Boolean).join('\n');
  await Promise.all(adminIds.map((adminId) => sendMessage(token, adminId, text).catch(() => undefined)));
}

async function handleMessage(token: string, message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id;
  const userId = message.from?.id;
  if (!chatId || !userId) return;

  if (message.successful_payment) {
    const payment = message.successful_payment;
    const payload = parseInvoicePayload(payment.invoice_payload);
    const chargeId = String(payment.telegram_payment_charge_id || `${userId}-${Date.now()}`);
    const order = {
      status: 'paid_pending_manual_activation',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAtIso: new Date().toISOString(),
      plan: payload.plan,
      planDuration: PLANS[payload.plan].durationLabel,
      appNickname: payload.appNickname,
      telegramUserId: userId,
      currency: payment.currency,
      totalAmount: payment.total_amount,
      telegramPaymentChargeId: chargeId,
      isRecurring: payment.is_recurring === true,
      isFirstRecurring: payment.is_first_recurring === true,
      subscriptionExpirationDate: payment.subscription_expiration_date || null,
      subscriptionExpiresAtIso: payment.subscription_expiration_date
        ? new Date(payment.subscription_expiration_date * 1000).toISOString()
        : null,
    };
    // КРИТИЧНО: запись заявки = единственный след оплаты (Stars уже списаны). Если
    // упадёт — пробрасываем ошибку, чтобы webhook вернул 500 и Telegram повторил
    // доставку (выдача всё равно ручная — см. STRICT POLICY п.1/п.3 в шапке файла).
    try {
      await db.collection('telegram_premium_orders').doc(chargeId).set(order, { merge: true });
    } catch (orderError) {
      console.error('telegramPremium order write failed', orderError);
      throw orderError;
    }
    // Сообщение юзеру и админам — best-effort: заявка уже записана, сбой уведомления
    // не должен ронять webhook в 500 (иначе Telegram повторит апдейт и создаст дубль
    // обработки на уже записанной заявке).
    await sendMessage(token, chatId, [
      MANUAL_ACTIVATION_MESSAGE_RU,
      '',
      `Ник: ${payload.appNickname}`,
      `Вариант: ${PLANS[payload.plan].durationLabel}`,
      payload.plan === 'monthly'
        ? 'Продление: автоматически каждые 30 дней'
        : 'Продление: нет, это разовая оплата на год',
    ].join('\n'), {
      reply_markup: {
        inline_keyboard: [[{ text: SUPPORT_BUTTON_TEXT_RU, callback_data: SUPPORT_CALLBACK_START }]],
      },
    }).catch((e) => console.error('telegramPremium user notify failed', e));
    await notifyAdmins(token, order).catch((e) => console.error('telegramPremium admin notify failed', e));
    return;
  }

  const text = String(message.text || '').trim();
  if (text === '/myid') {
    await sendMessage(token, chatId, [
      `Ваш Telegram id: ${userId}`,
      message.from?.username ? `Username: @${message.from.username}` : 'Username: -',
    ].join('\n'));
    return;
  }
  if (text.startsWith('/admin_setup')) {
    await handleAdminSetup(token, chatId, userId, text);
    return;
  }
  if (text === '/admin') {
    if (!(await isAdmin(userId))) {
      await sendMessage(token, chatId, 'Нет доступа. Сначала включите админ-доступ через /admin_setup <код>.');
      return;
    }
    await sendAdminHelp(token, chatId);
    return;
  }
  if (text === '/orders') {
    await sendOrdersList(token, chatId, userId);
    return;
  }
  if (text.startsWith('/order')) {
    await sendOrderDetails(token, chatId, userId, text);
    return;
  }
  if (text === '/start' || text === '/premium') {
    await clearSupportState(userId);
    await writeSession(userId, { step: 'awaiting_nickname' });
    await sendPremiumWelcome(token, chatId);
    return;
  }
  if (text === PAY_BUTTON_TEXT_RU) {
    await clearSupportState(userId);
    await writeSession(userId, { step: 'awaiting_nickname' });
    await sendShortNicknamePrompt(token, chatId);
    return;
  }

  // Чат поддержки: кнопка//support, /reply и reply-роутинг админа,
  // пересылка сообщений юзера в режиме поддержки.
  if (await tryHandleSupportMessage(token, message, supportDeps)) return;

  const session = await readSession(userId);
  if (session.step === 'awaiting_nickname') {
    const appNickname = sanitizeNickname(text);
    if (appNickname.length < 2) {
      await sendMessage(token, chatId, 'Ник слишком короткий. Введите ник из приложения Phraseman.');
      return;
    }
    await writeSession(userId, { step: 'choosing_plan', appNickname });
    await sendMessage(token, chatId, [
      `Ник: ${appNickname}`,
      '',
      'Проверьте, что ник написан точно так же, как в Phraseman.',
      '',
      `Месяц: ${priceLabelForPlan('monthly')}, автопродление каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
      `Год: ${priceLabelForPlan('yearly')}, разовая оплата на 12 месяцев.`,
      '',
      'Выберите вариант:',
    ].join('\n'), {
      reply_markup: planMenu(),
    });
    return;
  }

  await sendPremiumWelcome(token, chatId);
}

async function handleCallbackQuery(token: string, callbackQuery: TelegramCallbackQuery): Promise<void> {
  const callbackId = callbackQuery.id;
  const data = String(callbackQuery.data || '');
  const chatId = callbackQuery.message?.chat?.id;
  const userId = callbackQuery.from?.id;
  if (!callbackId || !chatId || !userId) return;

  await answerCallbackQuery(token, callbackId);

  if (await tryHandleSupportCallback(token, data, chatId, callbackQuery.from, supportDeps)) return;

  if (data === 'premium:start') {
    await clearSupportState(userId);
    await writeSession(userId, { step: 'awaiting_nickname' });
    await sendShortNicknamePrompt(token, chatId);
    return;
  }
  if (data === 'admin:orders') {
    await sendOrdersList(token, chatId, userId);
    return;
  }
  if (data === 'admin:help') {
    if (await isAdmin(userId)) await sendAdminHelp(token, chatId);
    else await sendMessage(token, chatId, 'Нет доступа.');
    return;
  }
  if (data.startsWith('plan:')) {
    const plan = data.slice('plan:'.length);
    assertPlan(plan);
    const session = await readSession(userId);
    const appNickname = sanitizeNickname(session.appNickname);
    if (!appNickname) {
      await writeSession(userId, { step: 'awaiting_nickname' });
      await sendMessage(token, chatId, 'Сначала введите ник в приложении Phraseman.');
      return;
    }
    try {
      if (plan === 'monthly') {
        await sendMonthlyInvoiceLink(token, chatId, { plan, userId, chatId, appNickname });
        return;
      }
      await sendInvoice(token, chatId, { plan, userId, chatId, appNickname });
    } catch (error) {
      console.error('telegramPremiumInvoice failed', error);
      await sendMessage(token, chatId, 'Не удалось открыть оплату. Попробуйте выбрать вариант еще раз.');
    }
  }
}

async function handlePreCheckoutQuery(token: string, query: TelegramPreCheckoutQuery): Promise<void> {
  if (!query.id) return;
  try {
    const payload = parseInvoicePayload(query.invoice_payload);
    if (query.currency !== 'XTR') {
      await answerPreCheckoutQuery(token, query.id, {
        ok: false,
        error_message: 'Оплата Premium принимается только в Telegram Stars.',
      });
      return;
    }
    if (query.total_amount !== starsForPlan(payload.plan)) {
      await answerPreCheckoutQuery(token, query.id, {
        ok: false,
        error_message: 'Сумма оплаты не совпадает с выбранным тарифом. Попробуйте создать счет заново.',
      });
      return;
    }
    await answerPreCheckoutQuery(token, query.id, { ok: true });
  } catch {
    await answerPreCheckoutQuery(token, query.id, {
      ok: false,
      error_message: 'Не удалось проверить заказ. Попробуйте начать оплату заново.',
    });
  }
}

async function handleUpdate(token: string, update: TelegramUpdate): Promise<void> {
  if (update.message) await handleMessage(token, update.message);
  else if (update.callback_query) await handleCallbackQuery(token, update.callback_query);
  else if (update.pre_checkout_query) await handlePreCheckoutQuery(token, update.pre_checkout_query);
}

export const telegramPremiumWebhook = onRequest({
  region: REGION,
  secrets: [
    PHRASEMAN_PREMIUM_BOT_TOKEN,
    PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE,
    PHRASEMAN_PREMIUM_WEBHOOK_SECRET,
  ],
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const expectedSecret = PHRASEMAN_PREMIUM_WEBHOOK_SECRET.value().trim();
  if (!expectedSecret) {
    console.error('telegramPremiumWebhook missing PHRASEMAN_PREMIUM_WEBHOOK_SECRET');
    res.status(500).send('Webhook secret is not configured');
    return;
  }
  if (req.get('X-Telegram-Bot-Api-Secret-Token') !== expectedSecret) {
    res.status(401).send('Unauthorized');
    return;
  }
  const update = (req.body || {}) as TelegramUpdate;
  try {
    await handleUpdate(PHRASEMAN_PREMIUM_BOT_TOKEN.value(), update);
    res.status(200).send('ok');
  } catch (error) {
    console.error('telegramPremiumWebhook failed', error);
    // Сохраняем сырой апдейт, чтобы факт оплаты не пропал (см. STRICT POLICY п.3).
    await writeDeadLetter('webhook_handler_failed', update, error);
    // Если в апдейте была успешная оплата — отвечаем 500, чтобы Telegram ПОВТОРИЛ
    // доставку (Stars списаны, заявку нужно записать). Для прочих апдейтов — 200,
    // чтобы не зацикливать неплатёжные ошибки бесконечными ретраями.
    if (update.message?.successful_payment) {
      res.status(500).send('payment update retry requested');
    } else {
      res.status(200).send('ok');
    }
  }
});

export const telegramPremiumActivationNotifier = onDocumentUpdated({
  region: REGION,
  document: 'telegram_premium_orders/{orderId}',
  secrets: [PHRASEMAN_PREMIUM_BOT_TOKEN],
}, async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.data() || {};
  const after = change.after.data() || {};
  if (before.testerActivationStatus === 'activated') return;
  if (!(after.testerActivationStatus === 'activated')) return;
  if (after.activationNotificationStatus === 'sent') return;

  const token = PHRASEMAN_PREMIUM_BOT_TOKEN.value();

  // 1) Сообщаем ПОЛЬЗОВАТЕЛЮ, что Premium выдан (best-effort — сбой не должен
  //    блокировать админ-уведомление; статус пишем отдельным полем).
  let userNotified: 'sent' | 'skipped' | 'error' = 'skipped';
  let userNotifyError: string | null = null;
  try {
    userNotified = (await notifyUserActivated(token, after)) ? 'sent' : 'skipped';
  } catch (error) {
    userNotified = 'error';
    userNotifyError = error instanceof Error ? error.message : String(error);
    console.error('telegramPremiumActivationNotifier user notify failed', error);
  }

  // 2) Отчёт админам + отметка, что весь нотификатор отработал.
  try {
    await notifyTesterActivationAdmins(token, after);
    await change.after.ref.set({
      activationNotificationStatus: 'sent',
      activationNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
      userActivationNotifyStatus: userNotified,
      ...(userNotifyError ? { userActivationNotifyError: userNotifyError } : {}),
    }, { merge: true });
  } catch (error) {
    console.error('telegramPremiumActivationNotifier failed', error);
    await change.after.ref.set({
      activationNotificationStatus: 'error',
      activationNotificationError: error instanceof Error ? error.message : String(error),
      activationNotificationErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      userActivationNotifyStatus: userNotified,
      ...(userNotifyError ? { userActivationNotifyError: userNotifyError } : {}),
    }, { merge: true });
  }
});
