"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramPremiumActivationNotifier = exports.telegramPremiumWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const TELEGRAM_API = 'https://api.telegram.org';
const REGION = 'us-central1';
const PHRASEMAN_PREMIUM_BOT_TOKEN = (0, params_1.defineSecret)('PHRASEMAN_PREMIUM_BOT_TOKEN');
const PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE = (0, params_1.defineSecret)('PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE');
const PHRASEMAN_PREMIUM_WEBHOOK_SECRET = (0, params_1.defineSecret)('PHRASEMAN_PREMIUM_WEBHOOK_SECRET');
const MONTHLY_SUBSCRIPTION_PERIOD_SECONDS = 2592000;
const MONTHLY_PRICE_RU_LABEL = '300 Stars';
const YEARLY_PRICE_RU_LABEL = '1800 Stars';
const CANCEL_SUBSCRIPTION_MESSAGE_RU = 'Подписку можно отменить в любой момент.';
const SHORT_NICKNAME_PROMPT_RU = 'Напишите Ваш ник ниже';
const PLANS = {
    monthly: {
        label: 'Phraseman Premium: месяц',
        description: `Месячная подписка Phraseman Premium. ${MONTHLY_PRICE_RU_LABEL}. Продлевается автоматически каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
        durationLabel: 'месяц',
    },
    yearly: {
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
const MANUAL_ACTIVATION_MESSAGE_RU = [
    'Спасибо, оплата прошла.',
    '',
    'Мы активируем Premium вручную.',
    'Если доступ появился не сразу, не переживайте: иногда это занимает несколько часов.',
].join('\n');
function monthlyStars() {
    const value = Number(process.env.PHRASEMAN_PREMIUM_MONTHLY_STARS || 300);
    return Number.isSafeInteger(value) && value > 0 ? value : 300;
}
function yearlyStars() {
    const value = Number(process.env.PHRASEMAN_PREMIUM_YEARLY_STARS || 1800);
    return Number.isSafeInteger(value) && value > 0 ? value : 1800;
}
function starsForPlan(plan) {
    return plan === 'yearly' ? yearlyStars() : monthlyStars();
}
function sanitizeNickname(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}
function assertPlan(plan) {
    if (plan !== 'monthly' && plan !== 'yearly')
        throw new Error('unknown plan');
}
function buildInvoicePayload(input) {
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
    if (Buffer.byteLength(encoded, 'utf8') > 128)
        throw new Error('invoice payload too long');
    return encoded;
}
function parseInvoicePayload(payload) {
    const parsed = JSON.parse(Buffer.from(String(payload || ''), 'base64url').toString('utf8'));
    const plan = parsed.plan || (parsed.p === 'y' ? 'yearly' : 'monthly');
    assertPlan(plan);
    return {
        v: Number(parsed.v || 1),
        plan,
        userId: (parsed.userId || parsed.u),
        chatId: (parsed.chatId || parsed.c),
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
        keyboard: [[{ text: PAY_BUTTON_TEXT_RU }]],
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
async function telegramRequest(token, method, payload) {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
        throw new Error(`Telegram ${method} failed: ${data?.description || `HTTP ${response.status}`}`);
    }
    return data.result;
}
function sendMessage(token, chatId, text, options = {}) {
    return telegramRequest(token, 'sendMessage', {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        ...options,
    });
}
function sendPhoto(token, chatId, photo, options = {}) {
    return telegramRequest(token, 'sendPhoto', {
        chat_id: chatId,
        photo,
        ...options,
    });
}
function answerCallbackQuery(token, callbackQueryId, options = {}) {
    return telegramRequest(token, 'answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...options,
    });
}
function answerPreCheckoutQuery(token, preCheckoutQueryId, options) {
    return telegramRequest(token, 'answerPreCheckoutQuery', {
        pre_checkout_query_id: preCheckoutQueryId,
        ...options,
    });
}
function sendInvoice(token, chatId, input) {
    const plan = input.plan;
    const planInfo = PLANS[plan];
    const invoice = {
        chat_id: chatId,
        title: 'Phraseman Premium',
        description: planInfo.description,
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
async function createInvoiceLink(token, input) {
    const invoice = sendInvoicePayload(input);
    const result = await telegramRequest(token, 'createInvoiceLink', invoice);
    return String(result || '');
}
function sendInvoicePayload(input) {
    const plan = input.plan;
    const planInfo = PLANS[plan];
    const invoice = {
        title: 'Phraseman Premium',
        description: planInfo.description,
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
async function sendPremiumWelcome(token, chatId) {
    const caption = `${START_MESSAGE_RU}\n\nПросто отправьте ник одним сообщением.`;
    try {
        await sendPhoto(token, chatId, HERO_IMAGE_URL, {
            caption,
            reply_markup: startReplyKeyboard(),
        });
    }
    catch {
        await sendMessage(token, chatId, caption, {
            reply_markup: startReplyKeyboard(),
        });
    }
}
async function sendShortNicknamePrompt(token, chatId) {
    await sendMessage(token, chatId, SHORT_NICKNAME_PROMPT_RU, {
        reply_markup: startReplyKeyboard(),
    });
}
async function sendMonthlyInvoiceLink(token, chatId, input) {
    const link = await createInvoiceLink(token, input);
    await sendMessage(token, chatId, `Месяц: подписка с автопродлением каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`, {
        reply_markup: {
            inline_keyboard: [[{ text: 'Оплатить месяц', url: link }]],
        },
    });
}
const db = admin.firestore();
function sessionRef(userId) {
    return db.collection('telegram_premium_bot_sessions').doc(String(userId));
}
function configRef() {
    return db.collection('telegram_premium_bot').doc('config');
}
async function readSession(userId) {
    const snap = await sessionRef(userId).get();
    return snap.exists ? snap.data() : { step: 'idle' };
}
async function writeSession(userId, session) {
    await sessionRef(userId).set({ ...session, updatedAt: Date.now() }, { merge: true });
}
async function readAdminUserIds() {
    const snap = await configRef().get();
    const ids = snap.exists && Array.isArray(snap.data()?.adminUserIds) ? snap.data()?.adminUserIds : [];
    return ids.map(String);
}
async function isAdmin(userId) {
    return (await readAdminUserIds()).includes(String(userId));
}
async function addAdmin(userId) {
    await configRef().set({
        adminUserIds: admin.firestore.FieldValue.arrayUnion(String(userId)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
function formatTelegramUser(order) {
    return String(order.telegramUserId || '-');
}
function formatOrderShort(order, index) {
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
async function sendOrdersList(token, chatId, userId) {
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
async function sendAdminHelp(token, chatId) {
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
async function sendOrderDetails(token, chatId, userId, text) {
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
async function handleAdminSetup(token, chatId, userId, text) {
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
async function notifyAdmins(token, order) {
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
function activationUntilLabel(order) {
    const value = order.activatedUntil || order.subscriptionExpiresAtIso || '';
    if (!value)
        return '-';
    const millis = Number(value);
    if (Number.isFinite(millis) && millis > 0) {
        return new Date(millis).toLocaleString('ru-RU');
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ru-RU');
}
async function notifyTesterActivationAdmins(token, order) {
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
async function handleMessage(token, message) {
    const chatId = message.chat?.id;
    const userId = message.from?.id;
    if (!chatId || !userId)
        return;
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
        await db.collection('telegram_premium_orders').doc(chargeId).set(order, { merge: true });
        await sendMessage(token, chatId, [
            MANUAL_ACTIVATION_MESSAGE_RU,
            '',
            `Ник: ${payload.appNickname}`,
            `Вариант: ${PLANS[payload.plan].durationLabel}`,
            payload.plan === 'monthly'
                ? 'Продление: автоматически каждые 30 дней'
                : 'Продление: нет, это разовая оплата на год',
        ].join('\n'));
        await notifyAdmins(token, order);
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
        await writeSession(userId, { step: 'awaiting_nickname' });
        await sendPremiumWelcome(token, chatId);
        return;
    }
    if (text === PAY_BUTTON_TEXT_RU) {
        await writeSession(userId, { step: 'awaiting_nickname' });
        await sendShortNicknamePrompt(token, chatId);
        return;
    }
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
            `Месяц: ${MONTHLY_PRICE_RU_LABEL}, автопродление каждые 30 дней. ${CANCEL_SUBSCRIPTION_MESSAGE_RU}`,
            `Год: ${YEARLY_PRICE_RU_LABEL}, разовая оплата на 12 месяцев.`,
            '',
            'Выберите вариант:',
        ].join('\n'), {
            reply_markup: planMenu(),
        });
        return;
    }
    await sendPremiumWelcome(token, chatId);
}
async function handleCallbackQuery(token, callbackQuery) {
    const callbackId = callbackQuery.id;
    const data = String(callbackQuery.data || '');
    const chatId = callbackQuery.message?.chat?.id;
    const userId = callbackQuery.from?.id;
    if (!callbackId || !chatId || !userId)
        return;
    await answerCallbackQuery(token, callbackId);
    if (data === 'premium:start') {
        await writeSession(userId, { step: 'awaiting_nickname' });
        await sendShortNicknamePrompt(token, chatId);
        return;
    }
    if (data === 'admin:orders') {
        await sendOrdersList(token, chatId, userId);
        return;
    }
    if (data === 'admin:help') {
        if (await isAdmin(userId))
            await sendAdminHelp(token, chatId);
        else
            await sendMessage(token, chatId, 'Нет доступа.');
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
        }
        catch (error) {
            console.error('telegramPremiumInvoice failed', error);
            await sendMessage(token, chatId, 'Не удалось открыть оплату. Попробуйте выбрать вариант еще раз.');
        }
    }
}
async function handlePreCheckoutQuery(token, query) {
    if (!query.id)
        return;
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
    }
    catch {
        await answerPreCheckoutQuery(token, query.id, {
            ok: false,
            error_message: 'Не удалось проверить заказ. Попробуйте начать оплату заново.',
        });
    }
}
async function handleUpdate(token, update) {
    if (update.message)
        await handleMessage(token, update.message);
    else if (update.callback_query)
        await handleCallbackQuery(token, update.callback_query);
    else if (update.pre_checkout_query)
        await handlePreCheckoutQuery(token, update.pre_checkout_query);
}
exports.telegramPremiumWebhook = (0, https_1.onRequest)({
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
    const expectedSecret = PHRASEMAN_PREMIUM_WEBHOOK_SECRET.value();
    if (expectedSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== expectedSecret) {
        res.status(401).send('Unauthorized');
        return;
    }
    try {
        await handleUpdate(PHRASEMAN_PREMIUM_BOT_TOKEN.value(), req.body);
        res.status(200).send('ok');
    }
    catch (error) {
        console.error('telegramPremiumWebhook failed', error);
        res.status(200).send('ok');
    }
});
exports.telegramPremiumActivationNotifier = (0, firestore_1.onDocumentUpdated)({
    region: REGION,
    document: 'telegram_premium_orders/{orderId}',
    secrets: [PHRASEMAN_PREMIUM_BOT_TOKEN],
}, async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (before.testerActivationStatus === 'activated')
        return;
    if (!(after.testerActivationStatus === 'activated'))
        return;
    if (after.activationNotificationStatus === 'sent')
        return;
    try {
        await notifyTesterActivationAdmins(PHRASEMAN_PREMIUM_BOT_TOKEN.value(), after);
        await change.after.ref.set({
            activationNotificationStatus: 'sent',
            activationNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error('telegramPremiumActivationNotifier failed', error);
        await change.after.ref.set({
            activationNotificationStatus: 'error',
            activationNotificationError: error instanceof Error ? error.message : String(error),
            activationNotificationErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
});
//# sourceMappingURL=telegram_premium_bot.js.map