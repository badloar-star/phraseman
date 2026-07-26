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
exports.webLeadNudgeCron = exports.webLeadCapture = void 0;
exports.planSummaryFromAnswers = planSummaryFromAnswers;
// ============================================================================
// web_leads.ts — email-лиды из квиз-воронки knowlyapps.com/start/.
//
// Идея: человек прошёл квиз, но ещё не оплатил. Забираем email ДО пейвола
// («куда прислать ваш план?»), сразу шлём письмо с собранным планом, а если
// оплаты так и не случилось — максимум ДВА догоняющих письма и тишина.
//
//   - webLeadCapture (public POST): пишет лид в web_leads (1 док = 1 email),
//     регистрирует контакт в email_contacts и шлёт письмо «ваш план готов».
//     Анти-абьюз: не больше одного письма на адрес в сутки (эндпоинт публичный).
//   - webLeadNudgeCron (каждые 6 часов): находит лиды без оплаты и досылает
//     письмо №2 (через ~20ч) и письмо №3 (ещё через ~48ч). Отписанных и
//     купивших не трогает. После двух догонялок лид закрывается навсегда.
//
// Все письма — с ссылкой отписки (email_unsubscribe.ts) и заголовком
// List-Unsubscribe: это маркетинговая, а не транзакционная почта.
// ============================================================================
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const email_contacts_1 = require("./email_contacts");
const email_unsubscribe_1 = require("./email_unsubscribe");
const REGION = 'us-central1';
const LEADS_COLLECTION = 'web_leads';
const ORDERS_COLLECTION = 'web_premium_orders';
const SUPPRESSIONS_COLLECTION = 'email_suppressions';
const SITE_ORIGIN = 'https://knowlyapps.com';
const resendApiKey = (0, params_1.defineString)('RESEND_API_KEY', { default: '' });
const webCheckoutEmailFrom = (0, params_1.defineString)('WEB_CHECKOUT_EMAIL_FROM', { default: 'Phraseman <onboarding@resend.dev>' });
const webCheckoutSupportEmail = (0, params_1.defineString)('WEB_CHECKOUT_SUPPORT_EMAIL', { default: 'support.phraseman@gmail.com' });
const PAID_STATUSES = new Set(['paid_pending_activation', 'paid_pending_manual_activation', 'activated']);
/** Пауза перед письмом №2 и между №2 и №3. Не в часах «ровно» — крон дискретный. */
const FIRST_NUDGE_AFTER_MS = 20 * 60 * 60 * 1000;
const SECOND_NUDGE_AFTER_MS = 48 * 60 * 60 * 1000;
const PLAN_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_NUDGES = 2;
function pickAllowOrigin(origin) {
    const allow = new Set([
        'https://knowlyapps.com',
        'https://www.knowlyapps.com',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:8841',
        'http://127.0.0.1:8841',
    ]);
    if (!origin)
        return '*';
    if (allow.has(origin))
        return origin;
    if (/\.web\.app$/.test(origin) || /\.firebaseapp\.com$/.test(origin))
        return origin;
    return '*';
}
function applyCors(req, res) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    res.set('Access-Control-Allow-Origin', pickAllowOrigin(origin));
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return true;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return true;
    }
    return false;
}
/** Сайт шлёт fetch без Content-Type (text/plain, без preflight) — тело приходит строкой. */
function parseJsonBody(req) {
    if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
        return req.body;
    }
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        try {
            return JSON.parse(String(req.body) || '{}');
        }
        catch {
            return null;
        }
    }
    return {};
}
function cleanShortText(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function htmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Маленький безопасный JSON-слепок ответов квиза/UTM для атрибуции. */
function cleanAttribution(value) {
    if (typeof value !== 'object' || value === null)
        return null;
    try {
        const raw = JSON.stringify(value);
        if (raw.length > 4000)
            return { truncated: true };
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/* ───────────────────────── План из ответов квиза (зеркало start.js) ───────────────────────── */
const GOAL_META = {
    travel: { name: 'Поездка', scen: 'аэропорту, отеле и кафе' },
    work: { name: 'Работа', scen: 'собеседовании, звонках и переписке' },
    move: { name: 'Переезд', scen: 'быту новой страны' },
    self: { name: 'Разговорный', scen: 'сериалах и живых разговорах' },
};
const LEVEL_META = {
    zero: 'с самых основ',
    understand: 'с разговорного минимума — понимать вы уже умеете',
    mistakes: 'с уверенной речи — чистим ошибки',
    confident: 'с продвинутых живых фраз',
};
function planSummaryFromAnswers(answers) {
    const a = answers ?? {};
    const goal = GOAL_META[String(a.goal)] ?? GOAL_META.self;
    const level = LEVEL_META[String(a.level)] ?? LEVEL_META.understand;
    const time = String(a.time);
    const minutes = time === '5' ? '5–10' : time === '30' ? '30' : '15';
    const speakScared = String(a.speak) === 'yes';
    const painQuit = String(a.pain) === 'quit';
    return {
        planName: goal.name,
        rows: [
            { emoji: '🎯', bold: `План «${goal.name}»`, rest: `фразы, которые нужны в ${goal.scen}` },
            { emoji: '📍', bold: `Старт: ${level}`, rest: '' },
            { emoji: '⏱️', bold: `${minutes} минут в день`, rest: 'короткие уроки: фразы, произношение, карточки' },
            {
                emoji: '🎙️',
                bold: speakScared ? 'Речь — наедине с телефоном' : 'Речь — с первого дня',
                rest: 'произношение оценивается на устройстве, голос никуда не уходит',
            },
            {
                emoji: '🛡️',
                bold: painQuit ? 'Серия и лиги против «брошу»' : 'Умные повторения против забывания',
                rest: 'механики, ради которых возвращаются каждый день',
            },
        ],
    };
}
/* ───────────────────────── Письма ───────────────────────── */
function emailShellHtml(inner, unsubscribeUrl) {
    return [
        '<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;max-width:560px">',
        inner,
        `<p style="margin-top:28px;font-size:12px;color:#9ca3af">Вы получили это письмо, потому что запросили план на knowlyapps.com. `
            + `Не хотите писем? <a href="${htmlEscape(unsubscribeUrl)}" style="color:#9ca3af">Отписаться в один клик</a>.</p>`,
        '</div>',
    ].join('');
}
function ctaButtonHtml(href, label) {
    return `<p style="margin:22px 0"><a href="${htmlEscape(href)}" `
        + 'style="background:#c8a24a;color:#101319;text-decoration:none;font-weight:700;'
        + `padding:13px 26px;border-radius:12px;display:inline-block">${htmlEscape(label)}</a></p>`;
}
async function sendResendEmail(params) {
    const key = resendApiKey.value();
    if (!key)
        return false;
    try {
        const unsubscribeUrl = (0, email_unsubscribe_1.unsubscribeUrlFor)(params.to);
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: webCheckoutEmailFrom.value() || 'Phraseman <onboarding@resend.dev>',
                to: [params.to],
                subject: params.subject,
                text: params.text,
                html: params.html,
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            }),
        });
        if (!response.ok) {
            logger.warn('web_leads email send failed', (await response.text()).slice(0, 500));
            return false;
        }
        return true;
    }
    catch (e) {
        logger.warn('web_leads email send error', e);
        return false;
    }
}
function planEmail(email, answers) {
    const summary = planSummaryFromAnswers(answers);
    const unsubscribeUrl = (0, email_unsubscribe_1.unsubscribeUrlFor)(email);
    const subject = `Ваш план английского «${summary.planName}» готов`;
    const rowsText = summary.rows
        .map((r) => `- ${r.bold}${r.rest ? ` — ${r.rest}` : ''}`)
        .join('\n');
    const text = [
        'Вы собрали план на knowlyapps.com — вот он, чтобы не потерялся:',
        '',
        rowsText,
        '',
        `Открыть план целиком (Premium): ${SITE_ORIGIN}/premium/`,
        `Или начните бесплатно — установите приложение: ${SITE_ORIGIN}/download/`,
        '',
        `Вопросы? Просто ответьте на это письмо или напишите: ${webCheckoutSupportEmail.value()}`,
        `Отписаться: ${unsubscribeUrl}`,
    ].join('\n');
    const rowsHtml = summary.rows
        .map((r) => `<li style="margin:6px 0">${r.emoji} <b>${htmlEscape(r.bold)}</b>${r.rest ? ` — ${htmlEscape(r.rest)}` : ''}</li>`)
        .join('');
    const html = emailShellHtml([
        '<h1 style="font-size:22px;margin:0 0 12px">Ваш план английского готов</h1>',
        '<p>Вы собрали его на knowlyapps.com — сохраняем письмом, чтобы не потерялся:</p>',
        `<ul style="padding-left:6px;list-style:none;margin:16px 0">${rowsHtml}</ul>`,
        ctaButtonHtml(`${SITE_ORIGIN}/premium/`, 'Открыть план целиком →'),
        `<p style="color:#4b5563">Или начните бесплатно: <a href="${SITE_ORIGIN}/download/">установите приложение</a> — первый урок займёт три минуты.</p>`,
    ].join(''), unsubscribeUrl);
    return { subject, text, html };
}
function nudgeEmail(email, answers, nudgeNumber) {
    const summary = planSummaryFromAnswers(answers);
    const unsubscribeUrl = (0, email_unsubscribe_1.unsubscribeUrlFor)(email);
    if (nudgeNumber === 1) {
        const subject = `План «${summary.planName}» ждёт — и 7 дней гарантии`;
        const text = [
            `Ваш план «${summary.planName}» никуда не делся.`,
            '',
            'Если сомневаетесь, вот что снимает риск: у Premium 7 дней гарантии —',
            'не подойдёт, вернём деньги без вопросов, одним письмом в поддержку.',
            '',
            `Открыть план целиком: ${SITE_ORIGIN}/premium/`,
            `Начать бесплатно: ${SITE_ORIGIN}/download/`,
            '',
            `Отписаться: ${unsubscribeUrl}`,
        ].join('\n');
        const html = emailShellHtml([
            `<h1 style="font-size:22px;margin:0 0 12px">План «${htmlEscape(summary.planName)}» ждёт</h1>`,
            '<p>Если сомневаетесь — у Premium <b>7 дней гарантии</b>: не подойдёт, вернём деньги без вопросов, одним письмом в поддержку.</p>',
            ctaButtonHtml(`${SITE_ORIGIN}/premium/`, 'Открыть план целиком →'),
            `<p style="color:#4b5563">Или без оплаты: <a href="${SITE_ORIGIN}/download/">начните бесплатно</a> — уроки, фразы дня и дуэли доступны и так.</p>`,
        ].join(''), unsubscribeUrl);
        return { subject, text, html };
    }
    const subject = 'Последнее письмо: начните бесплатно';
    const text = [
        'Больше писем не будет — только одна мысль напоследок.',
        '',
        'Необязательно ничего покупать: скачайте Phraseman бесплатно,',
        'пройдите первый урок за три минуты и решите на месте.',
        '',
        `Скачать бесплатно: ${SITE_ORIGIN}/download/`,
        '',
        `Отписаться: ${unsubscribeUrl}`,
    ].join('\n');
    const html = emailShellHtml([
        '<h1 style="font-size:22px;margin:0 0 12px">Последнее письмо — и одна мысль</h1>',
        '<p>Необязательно ничего покупать: скачайте Phraseman бесплатно, пройдите первый урок за три минуты и решите на месте.</p>',
        ctaButtonHtml(`${SITE_ORIGIN}/download/`, 'Скачать бесплатно →'),
    ].join(''), unsubscribeUrl);
    return { subject, text, html };
}
/* ───────────────────────── Захват лида ───────────────────────── */
async function isSuppressed(db, email) {
    try {
        const snap = await db.collection(SUPPRESSIONS_COLLECTION).doc((0, email_unsubscribe_1.suppressionDocId)(email)).get();
        return snap.exists;
    }
    catch {
        return false;
    }
}
async function hasPaidOrder(db, email) {
    try {
        const snap = await db.collection(ORDERS_COLLECTION).where('email', '==', email).limit(10).get();
        return snap.docs.some((doc) => PAID_STATUSES.has(String(doc.data()?.status)));
    }
    catch {
        return false;
    }
}
exports.webLeadCapture = (0, https_1.onRequest)({
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 20,
    maxInstances: 3,
    invoker: 'public',
}, async (req, res) => {
    if (applyCors(req, res))
        return;
    const body = parseJsonBody(req);
    if (!body) {
        res.status(400).json({ ok: false, error: 'invalid_json' });
        return;
    }
    const email = (0, email_contacts_1.normalizeEmailContactEmail)(body.email);
    if (!email) {
        res.status(400).json({ ok: false, error: 'invalid_email' });
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const answers = cleanAttribution(body.answers);
    const ref = db.collection(LEADS_COLLECTION).doc((0, email_contacts_1.emailContactDocId)(email));
    try {
        const [snap, suppressed] = await Promise.all([ref.get(), isSuppressed(db, email)]);
        const existing = snap.exists ? (snap.data() ?? {}) : null;
        const nowMs = Date.now();
        const lastPlanEmailMs = Number(existing?.planEmailSentAtMs) || 0;
        // Кулдаун письма: эндпоинт публичный, нельзя позволить бомбить чужой ящик.
        const shouldEmail = !suppressed && nowMs - lastPlanEmailMs > PLAN_EMAIL_COOLDOWN_MS;
        await ref.set({
            email,
            answers: answers ?? existing?.answers ?? null,
            utm: cleanAttribution(body.utm) ?? existing?.utm ?? null,
            page: cleanShortText(body.page, 120) || null,
            status: suppressed ? 'unsubscribed' : String(existing?.status ?? 'active'),
            ...(existing ? {} : { createdAtMs: nowMs, createdAt: firestore_1.FieldValue.serverTimestamp(), nudgeCount: 0 }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAtIso: new Date().toISOString(),
        }, { merge: true });
        await (0, email_contacts_1.upsertEmailContact)(db, { email, source: 'site', provider: 'quiz_lead' }).catch((e) => {
            logger.warn('web_leads contact upsert failed', e);
        });
        let emailed = false;
        if (shouldEmail) {
            const message = planEmail(email, answers ?? existing?.answers ?? null);
            emailed = await sendResendEmail({ to: email, ...message });
            if (emailed) {
                await ref.set({ planEmailSentAtMs: nowMs, planEmailSentAtIso: new Date().toISOString() }, { merge: true });
            }
        }
        res.status(200).json({ ok: true, emailed });
    }
    catch (e) {
        logger.error('webLeadCapture failed', e);
        res.status(502).json({ ok: false, error: 'lead_capture_failed' });
    }
});
/* ───────────────────────── Догоняющие письма ───────────────────────── */
exports.webLeadNudgeCron = (0, scheduler_1.onSchedule)({ schedule: '17 */6 * * *', timeZone: 'Etc/UTC', region: REGION, memory: '256MiB', timeoutSeconds: 300 }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection(LEADS_COLLECTION).where('status', '==', 'active').limit(300).get();
    if (snap.empty)
        return;
    const nowMs = Date.now();
    let sent = 0;
    for (const doc of snap.docs) {
        const lead = doc.data();
        const email = (0, email_contacts_1.normalizeEmailContactEmail)(lead.email);
        if (!email)
            continue;
        const nudgeCount = Number(lead.nudgeCount) || 0;
        if (nudgeCount >= MAX_NUDGES) {
            await doc.ref.set({ status: 'done' }, { merge: true });
            continue;
        }
        const createdAtMs = Number(lead.createdAtMs) || 0;
        const lastNudgeAtMs = Number(lead.lastNudgeAtMs) || 0;
        const due = nudgeCount === 0
            ? createdAtMs > 0 && nowMs - createdAtMs > FIRST_NUDGE_AFTER_MS
            : lastNudgeAtMs > 0 && nowMs - lastNudgeAtMs > SECOND_NUDGE_AFTER_MS;
        if (!due)
            continue;
        if (await isSuppressed(db, email)) {
            await doc.ref.set({ status: 'unsubscribed' }, { merge: true });
            continue;
        }
        if (await hasPaidOrder(db, email)) {
            await doc.ref.set({ status: 'purchased' }, { merge: true });
            continue;
        }
        const nudgeNumber = nudgeCount + 1;
        const message = nudgeEmail(email, lead.answers ?? null, nudgeNumber);
        const ok = await sendResendEmail({ to: email, ...message });
        if (!ok)
            continue; // не двигаем счётчик: попробуем в следующий запуск
        sent += 1;
        await doc.ref.set({
            nudgeCount: nudgeNumber,
            lastNudgeAtMs: nowMs,
            lastNudgeAtIso: new Date().toISOString(),
            status: nudgeNumber >= MAX_NUDGES ? 'done' : 'active',
        }, { merge: true });
    }
    logger.info('webLeadNudgeCron done', { checked: snap.size, sent });
});
//# sourceMappingURL=web_leads.js.map