"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// support_inbox.ts — входящая почта поддержки (support.phraseman@gmail.com) в
// админке + ИИ-черновики ответов. Спека: specs/gmail-support-inbox.md.
//
// Поток: раз в сутки крон (или кнопка) читает НЕПРОЧИТАННЫЕ письма из INBOX по
// IMAP (App Password, секрет GMAIL_SUPPORT_APP_PASSWORD), кладёт в Firestore
// (support_inbox), помечает прочитанными. В админке — список, фильтр статусов,
// ИИ-черновик по кнопке (дешёвая модель, job 'support'), правка руками, отправка
// через тот же Gmail по SMTP (встаёт в тред). Подпись из admin_config хранится
// отдельно и цепляется в конец при отправке (ИИ её не видит).
//
// Архитектура как в re_engage_push/admin_daily_digest: ЧИСТАЯ логика (парсинг,
// дедуп, обрезка, сборка ответа с подписью, отбор для «всем») отделена от I/O
// (IMAP/SMTP/OpenAI) — чистое покрыто unit-тестами без сети.
//
// НЕ трогает Support (site) (website_contact_inbox) и Resend-рассылку (admin_email).
// ═══════════════════════════════════════════════════════════════════════════
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
exports.adminSupportSetStatus = exports.adminSupportSaveSignature = exports.adminSupportSendReply = exports.adminSupportGenerateReply = exports.adminSupportPull = exports.FIRST_PULL_LIMIT = exports.GENERATE_BATCH_LIMIT = exports.BODY_MAX_CHARS = exports.SUPPORT_CONFIG_DOC = exports.INBOX_COLLECTION = exports.SUPPORT_MAILBOX = exports.GMAIL_SUPPORT_APP_PASSWORD = void 0;
exports.truncateBody = truncateBody;
exports.docIdForMessageId = docIdForMessageId;
exports.hasUsableBody = hasUsableBody;
exports.isHumanEmail = isHumanEmail;
exports.rawEmailToDoc = rawEmailToDoc;
exports.composeReplyWithSignature = composeReplyWithSignature;
exports.escapeHtml = escapeHtml;
exports.plainToHtmlEmail = plainToHtmlEmail;
exports.selectForBatchGenerate = selectForBatchGenerate;
exports.selectForBatchSend = selectForBatchSend;
exports.buildReplyPrompt = buildReplyPrompt;
exports.runSupportInboxPull = runSupportInboxPull;
exports.runSupportInboxPullCron = runSupportInboxPullCron;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const explain_provider_1 = require("./explain/explain_provider");
const openai_jobs_config_1 = require("./openai_jobs_config");
const REGION = 'us-central1';
exports.GMAIL_SUPPORT_APP_PASSWORD = (0, params_1.defineSecret)('GMAIL_SUPPORT_APP_PASSWORD');
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
// ── Константы ─────────────────────────────────────────────────────────────────
exports.SUPPORT_MAILBOX = 'support.phraseman@gmail.com';
exports.INBOX_COLLECTION = 'support_inbox';
exports.SUPPORT_CONFIG_DOC = 'admin_config/support_inbox';
/** Обрезка тела письма перед сохранением и перед отправкой в ИИ (экономия). */
exports.BODY_MAX_CHARS = 20000;
/** «Сгенерировать всем» / первичный забор — не больше за один заход. */
exports.GENERATE_BATCH_LIMIT = 25;
exports.FIRST_PULL_LIMIT = 50;
// ── Чистые утилиты ─────────────────────────────────────────────────────────────
function clip(value, max) {
    return String(value ?? '').slice(0, max);
}
/** Обрезает тело письма до лимита (чистая). */
function truncateBody(body) {
    return clip(body, exports.BODY_MAX_CHARS);
}
/**
 * Стабильный docId из Gmail Message-ID: детерминированный, безопасный для
 * Firestore (без '/'). Дедуп строится на нём — один Message-ID = один документ.
 */
function docIdForMessageId(messageId) {
    const raw = String(messageId || '').trim();
    if (!raw)
        return '';
    // messageId вида <abc.def@mail.gmail.com>; заменяем всё небезопасное.
    return raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 400);
}
/** Есть ли у письма пригодное для ИИ тело (не пустое). Чистая. */
function hasUsableBody(doc) {
    return String(doc.bodyText ?? '').trim().length > 0 || String(doc.subject ?? '').trim().length > 0;
}
/** Служебные/рассыльные локальные части адреса — заведомо не человек. */
const NON_HUMAN_LOCALPARTS = [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'no_reply',
    'mailer-daemon', 'postmaster', 'bounce', 'bounces', 'notification', 'notifications',
    'mailer', 'auto', 'automated', 'newsletter', 'news', 'info', 'support-noreply',
];
/**
 * Решает, письмо ли это от ЖИВОГО человека (а не рассылка/промо/служебное Google).
 * Чистая функция — на вход адрес отправителя + релевантные заголовки.
 *
 * Отсекаем:
 *  - есть List-Unsubscribe → массовая рассылка/промо/уведомление;
 *  - Precedence: bulk/list/junk или Auto-Submitted: auto-* → авто-письмо;
 *  - служебная локальная часть адреса (noreply и пр.);
 *  - домен google.com / accounts.google.com / *.google.com и подобные сервисные.
 */
function isHumanEmail(input) {
    const email = String(input.fromEmail ?? '').toLowerCase().trim();
    if (!email || !email.includes('@'))
        return false;
    const h = input.headers ?? {};
    if (String(h.listUnsubscribe ?? '').trim())
        return false;
    const prec = String(h.precedence ?? '').toLowerCase();
    if (prec === 'bulk' || prec === 'list' || prec === 'junk')
        return false;
    const auto = String(h.autoSubmitted ?? '').toLowerCase();
    if (auto && auto !== 'no')
        return false;
    const [localPart, domain] = email.split('@');
    // Служебные адреса Google (безопасность, уведомления и т.п.).
    if (domain === 'google.com' || domain === 'accounts.google.com' || domain.endsWith('.google.com')) {
        return false;
    }
    for (const bad of NON_HUMAN_LOCALPARTS) {
        if (localPart === bad || localPart.startsWith(bad + '-') || localPart.startsWith(bad + '.') || localPart.startsWith(bad + '+')) {
            return false;
        }
    }
    return true;
}
/**
 * Превращает RawEmail в документ Firestore со статусом 'new' (чистая).
 * Тело обрезается здесь.
 */
function rawEmailToDoc(raw) {
    return {
        messageId: String(raw.messageId || ''),
        fromEmail: String(raw.fromEmail || '').toLowerCase().trim(),
        fromName: clip(raw.fromName, 200),
        subject: clip(raw.subject, 500),
        bodyText: truncateBody(raw.bodyText),
        receivedAt: new Date(raw.receivedAtMs || Date.now()).toISOString(),
        receivedAtMs: raw.receivedAtMs || Date.now(),
        status: 'new',
    };
}
/**
 * Собирает финальный текст письма-ответа: тело ответа + подпись в конце.
 * Подпись цепляется отдельно (ИИ её не пишет). Пустая подпись → только тело.
 * Чистая функция.
 */
function composeReplyWithSignature(replyBody, signature) {
    const body = String(replyBody ?? '').trim();
    const sig = String(signature ?? '').trim();
    if (!sig)
        return body;
    return `${body}\n\n${sig}`;
}
/**
 * Экранирует спецсимволы HTML, чтобы текст пользователя/подписи не сломал разметку
 * и не стал вектором инъекции. Чистая функция.
 */
function escapeHtml(input) {
    return String(input ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/**
 * Превращает plain-text письмо (тело + подпись) в безопасный HTML для sendMail.html.
 * Поддерживает лёгкий Markdown в подписи: **жирный** → <strong>. Переносы строк →
 * <br>. Сначала экранируем HTML (защита от инъекции), потом применяем **bold** уже
 * по экранированному тексту — звёздочки спецсимволами не являются, порядок безопасен.
 * Чистая функция (без сети/состояния).
 */
function plainToHtmlEmail(text) {
    const escaped = escapeHtml(String(text ?? ''));
    const withBold = escaped.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    const withBreaks = withBold.replace(/\r\n|\r|\n/g, '<br>');
    return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111;white-space:normal">${withBreaks}</div>`;
}
/**
 * Отбирает письма для пакетной генерации «всем»: статус 'new' и без черновика,
 * не больше limit. Чистая функция.
 */
function selectForBatchGenerate(docs, limit = exports.GENERATE_BATCH_LIMIT) {
    return docs
        .filter((d) => d.status === 'new' && !String(d.draftReply ?? '').trim())
        .slice(0, limit);
}
/**
 * Отбирает письма для пакетной отправки: статус 'new' с непустым черновиком.
 * Чистая функция.
 */
function selectForBatchSend(docs) {
    return docs.filter((d) => d.status === 'new' && String(d.draftReply ?? '').trim().length > 0);
}
// ── ИИ: системный промпт и построение запроса ──────────────────────────────────
const REPLY_SYSTEM_PROMPT = [
    'Ты пишешь ответ службы поддержки приложения для изучения английского Phraseman.',
    'Тебе дают входящее письмо пользователя (тема + текст). Напиши краткий вежливый ОТВЕТ',
    'СТРОГО на языке письма (определи по тексту). От лица команды («мы»), тепло, по-человечески,',
    'по делу. Без канцелярита, без обещаний конкретных сроков, без выдуманных фактов.',
    'НЕ добавляй подпись/имя/«с уважением» в конце — подпись добавят автоматически отдельно.',
    'Только текст ответа, без темы и без служебных пометок.',
].join('\n');
/** Payload для ИИ из письма: только тема+тело, обрезанные (экономия). Чистая. */
function buildReplyPrompt(doc) {
    const subject = clip(doc.subject, 500);
    const body = clip(doc.bodyText, exports.BODY_MAX_CHARS);
    return `Тема: ${subject}\n\nТекст письма:\n${body}`;
}
// ── I/O: генерация одного черновика через OpenAI ───────────────────────────────
async function generateDraftForDoc(apiKey, model, doc) {
    const result = await (0, explain_provider_1.openAiChat)({
        apiKey,
        model,
        messages: [
            { role: 'system', content: REPLY_SYSTEM_PROMPT },
            { role: 'user', content: buildReplyPrompt(doc) },
        ],
        maxTokens: 600,
        temperature: 0.5,
    });
    return result.text.trim();
}
// ── I/O: чтение конфигурации (подпись) ─────────────────────────────────────────
async function readSignature(db) {
    try {
        const [col, docId] = exports.SUPPORT_CONFIG_DOC.split('/');
        const snap = await db.collection(col).doc(docId).get();
        return String(snap.data()?.signature ?? '');
    }
    catch {
        return '';
    }
}
// ── I/O: IMAP-забор писем ──────────────────────────────────────────────────────
/**
 * Читает письма из INBOX по IMAP. Если firstRun — последние FIRST_PULL_LIMIT
 * (любые), иначе только НЕПРОЧИТАННЫЕ. Помечает забранные прочитанными. Бросает
 * при недоступности IMAP (ловится выше → понятная ошибка, не молчание).
 */
async function fetchEmailsViaImap(appPassword, firstRun) {
    // Ленивая загрузка тяжёлых модулей — только когда реально читаем почту.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ImapFlow } = require('imapflow');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { simpleParser } = require('mailparser');
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: exports.SUPPORT_MAILBOX, pass: appPassword },
        logger: false,
    });
    const out = [];
    await client.connect();
    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            // Первый запуск: последние N любых. Иначе: только непрочитанные.
            // ВАЖНО: search с { uid: true } возвращает UID (а не seq-номера), чтобы
            // дальнейшие fetch/messageFlagsAdd с { uid: true } работали по тем же
            // сообщениям. Без этого seq-номера трактуются как UID → не те письма.
            let uids = [];
            if (firstRun) {
                const all = await client.search({ all: true }, { uid: true });
                uids = (all || []).slice(-exports.FIRST_PULL_LIMIT);
            }
            else {
                uids = (await client.search({ seen: false }, { uid: true })) || [];
            }
            if (uids.length === 0)
                return out;
            for await (const msg of client.fetch(uids, { source: true, uid: true })) {
                try {
                    const parsed = await simpleParser(msg.source);
                    const fromAddr = parsed.from?.value?.[0];
                    const fromEmail = String(fromAddr?.address || '');
                    // Отсекаем рассылки/промо/служебные Google — только письма от людей.
                    const hdr = (name) => {
                        const v = parsed.headers?.get(name);
                        return typeof v === 'string' ? v : (v ? String(v) : '');
                    };
                    if (!isHumanEmail({
                        fromEmail,
                        headers: {
                            listUnsubscribe: hdr('list-unsubscribe'),
                            precedence: hdr('precedence'),
                            autoSubmitted: hdr('auto-submitted'),
                        },
                    })) {
                        continue; // не человек — пропускаем, в базу не сохраняем
                    }
                    const messageId = String(parsed.messageId || `uid_${msg.uid}@${exports.SUPPORT_MAILBOX}`);
                    out.push({
                        messageId,
                        fromEmail,
                        fromName: String(fromAddr?.name || ''),
                        subject: String(parsed.subject || '(без темы)'),
                        bodyText: String(parsed.text || parsed.html || '').trim(),
                        receivedAtMs: parsed.date ? parsed.date.getTime() : Date.now(),
                    });
                }
                catch (e) {
                    console.warn('support_inbox: parse failed for uid', msg.uid, e);
                }
            }
            // Помечаем забранные прочитанными, чтобы следующий крон не тянул повторно.
            // (Дубль всё равно не создастся — дедуп по Message-ID.)
            try {
                await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
            }
            catch (e) {
                console.warn('support_inbox: mark seen failed', e);
            }
        }
        finally {
            lock.release();
        }
    }
    finally {
        await client.logout().catch(() => undefined);
    }
    return out;
}
// ── I/O: SMTP-отправка ответа через тот же Gmail ───────────────────────────────
/**
 * Отправляет ответ из support-ящика по SMTP (smtp.gmail.com:465), в тред
 * исходного письма (In-Reply-To/References = messageId). Бросает при ошибке.
 */
async function sendReplyViaSmtp(appPassword, to, subject, text, inReplyToMessageId, fromName) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: exports.SUPPORT_MAILBOX, pass: appPassword },
    });
    const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    await transporter.sendMail({
        from: fromName ? `${fromName} <${exports.SUPPORT_MAILBOX}>` : exports.SUPPORT_MAILBOX,
        to,
        subject: replySubject,
        text,
        html: plainToHtmlEmail(text),
        inReplyTo: inReplyToMessageId || undefined,
        references: inReplyToMessageId || undefined,
    });
}
/**
 * Читает почту и апсертит в support_inbox. Идемпотентно: существующий Message-ID
 * пропускается (skip, не перетирает статус/черновик). firstRun определяется по
 * пустоте коллекции.
 */
async function runSupportInboxPull(appPassword) {
    const db = admin.firestore();
    // firstRun = коллекция пуста.
    const existingProbe = await db.collection(exports.INBOX_COLLECTION).limit(1).get();
    const firstRun = existingProbe.empty;
    const raws = await fetchEmailsViaImap(appPassword, firstRun);
    let saved = 0;
    let skipped = 0;
    for (const raw of raws) {
        const id = docIdForMessageId(raw.messageId);
        if (!id)
            continue;
        const ref = db.collection(exports.INBOX_COLLECTION).doc(id);
        const existing = await ref.get();
        if (existing.exists) {
            skipped++;
            continue;
        }
        await ref.set(rawEmailToDoc(raw));
        saved++;
    }
    return { fetched: raws.length, saved, skippedDuplicates: skipped, firstRun };
}
// ── Admin helpers ──────────────────────────────────────────────────────────────
function requireAdmin(request) {
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
}
function readAppPassword() {
    const pass = String(exports.GMAIL_SUPPORT_APP_PASSWORD.value() || process.env.GMAIL_SUPPORT_APP_PASSWORD || '').trim();
    if (!pass)
        throw new https_1.HttpsError('failed-precondition', 'GMAIL_SUPPORT_APP_PASSWORD not configured');
    return pass;
}
function readOpenAiKey() {
    // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
    const key = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!key)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    return key;
}
// ── Callable: проверить почту вручную ──────────────────────────────────────────
exports.adminSupportPull = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [exports.GMAIL_SUPPORT_APP_PASSWORD] }, async (request) => {
    requireAdmin(request);
    const pass = readAppPassword();
    try {
        return { ok: true, ...(await runSupportInboxPull(pass)) };
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        console.error('adminSupportPull failed', e);
        throw new https_1.HttpsError('unavailable', e instanceof Error ? e.message : 'imap_failed');
    }
});
// ── Callable: сгенерировать ИИ-черновик (одно письмо или пачка 'new') ──────────
/**
 * data: { messageDocId?: string }
 *   messageDocId задан → черновик для этого письма;
 *   не задан → пачка до GENERATE_BATCH_LIMIT писем 'new' без черновика.
 * Возвращает { ok, generated, remaining }.
 */
exports.adminSupportGenerateReply = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] }, async (request) => {
    requireAdmin(request);
    const apiKey = readOpenAiKey();
    const db = admin.firestore();
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'support');
    (0, openai_jobs_config_1.assertJobEnabled)(cfg, 'support');
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    // Один документ.
    if (messageDocId) {
        const ref = db.collection(exports.INBOX_COLLECTION).doc(messageDocId);
        const snap = await ref.get();
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'message_not_found');
        const doc = snap.data();
        if (!hasUsableBody(doc))
            throw new https_1.HttpsError('failed-precondition', 'empty_body');
        const draft = await generateDraftForDoc(apiKey, cfg.model, doc);
        await ref.set({ draftReply: draft, draftLang: '' }, { merge: true });
        return { ok: true, generated: 1, remaining: 0 };
    }
    // Пачка: 'new' без черновика, до лимита.
    const newSnap = await db
        .collection(exports.INBOX_COLLECTION)
        .where('status', '==', 'new')
        .limit(exports.GENERATE_BATCH_LIMIT * 4)
        .get();
    const docs = newSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const batch = selectForBatchGenerate(docs, exports.GENERATE_BATCH_LIMIT);
    let generated = 0;
    for (const d of batch) {
        if (!hasUsableBody(d))
            continue;
        try {
            const draft = await generateDraftForDoc(apiKey, cfg.model, d);
            await db.collection(exports.INBOX_COLLECTION).doc(d.id).set({ draftReply: draft, draftLang: '' }, { merge: true });
            generated++;
        }
        catch (e) {
            console.warn('support_inbox: draft gen failed', d.id, e);
        }
    }
    const remaining = docs.filter((d) => d.status === 'new' && !String(d.draftReply ?? '').trim()).length - generated;
    return { ok: true, generated, remaining: Math.max(0, remaining) };
});
// ── Callable: отправить ответ (одно письмо или все готовые черновики) ──────────
/**
 * data: { messageDocId?: string; replyText?: string }
 *   messageDocId задан → отправить этому (replyText = отредактированный текст,
 *     иначе draftReply). Не задан → отправить все 'new' с непустым черновиком.
 * Подпись из admin_config цепляется в конец. Возвращает { ok, sent, failed }.
 */
exports.adminSupportSendReply = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [exports.GMAIL_SUPPORT_APP_PASSWORD] }, async (request) => {
    requireAdmin(request);
    const pass = readAppPassword();
    const db = admin.firestore();
    const signature = await readSignature(db);
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    const nowIso = new Date().toISOString();
    const sendOne = async (docId, doc, replyBody) => {
        const finalText = composeReplyWithSignature(replyBody, signature);
        await sendReplyViaSmtp(pass, doc.fromEmail, doc.subject, finalText, doc.messageId, '');
        await db.collection(exports.INBOX_COLLECTION).doc(docId).set({ status: 'answered', sentReply: finalText, repliedAt: nowIso }, { merge: true });
    };
    // Один документ.
    if (messageDocId) {
        const ref = db.collection(exports.INBOX_COLLECTION).doc(messageDocId);
        const snap = await ref.get();
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'message_not_found');
        const doc = snap.data();
        const replyBody = String(request.data?.replyText ?? '').trim() || String(doc.draftReply ?? '').trim();
        if (!replyBody)
            throw new https_1.HttpsError('failed-precondition', 'empty_reply');
        if (!doc.fromEmail)
            throw new https_1.HttpsError('failed-precondition', 'no_recipient');
        try {
            await sendOne(messageDocId, doc, replyBody);
        }
        catch (e) {
            if (e instanceof https_1.HttpsError)
                throw e;
            console.error('adminSupportSendReply send failed', messageDocId, e);
            throw new https_1.HttpsError('unavailable', e instanceof Error ? e.message : 'smtp_failed');
        }
        return { ok: true, sent: 1, failed: 0 };
    }
    // Пачка: все 'new' с непустым черновиком.
    const newSnap = await db.collection(exports.INBOX_COLLECTION).where('status', '==', 'new').limit(200).get();
    const docs = newSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const toSend = selectForBatchSend(docs);
    let sent = 0;
    let failed = 0;
    for (const d of toSend) {
        if (!d.fromEmail) {
            failed++;
            continue;
        }
        try {
            await sendOne(d.id, d, String(d.draftReply ?? '').trim());
            sent++;
        }
        catch (e) {
            failed++;
            console.warn('support_inbox: batch send failed', d.id, e);
        }
    }
    return { ok: true, sent, failed };
});
// ── Callable: сохранить подпись ────────────────────────────────────────────────
exports.adminSupportSaveSignature = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireAdmin(request);
    const signature = String(request.data?.signature ?? '').slice(0, 2000);
    const db = admin.firestore();
    const [col, docId] = exports.SUPPORT_CONFIG_DOC.split('/');
    await db.collection(col).doc(docId).set({ signature, updatedAt: new Date().toISOString(), updatedBy: String(request.auth?.token?.email ?? 'admin') }, { merge: true });
    return { ok: true, signature };
});
// ── Callable: сменить статус письма (архив/вернуть) ────────────────────────────
exports.adminSupportSetStatus = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireAdmin(request);
    const messageDocId = String(request.data?.messageDocId ?? '').trim();
    const status = String(request.data?.status ?? '').trim();
    if (!messageDocId)
        throw new https_1.HttpsError('invalid-argument', 'messageDocId required');
    if (status !== 'new' && status !== 'answered' && status !== 'archived') {
        throw new https_1.HttpsError('invalid-argument', 'bad_status');
    }
    await admin.firestore().collection(exports.INBOX_COLLECTION).doc(messageDocId).set({ status }, { merge: true });
    return { ok: true, status };
});
// ── Крон: забор раз в сутки ─────────────────────────────────────────────────────
// (регистрируется в index.ts как gmailSupportPullCron)
async function runSupportInboxPullCron() {
    const pass = String(exports.GMAIL_SUPPORT_APP_PASSWORD.value() || process.env.GMAIL_SUPPORT_APP_PASSWORD || '').trim();
    if (!pass) {
        console.error('gmailSupportPullCron: GMAIL_SUPPORT_APP_PASSWORD not configured — skipping');
        return null;
    }
    try {
        const summary = await runSupportInboxPull(pass);
        console.log('gmailSupportPullCron', JSON.stringify(summary));
        return summary;
    }
    catch (e) {
        console.error('gmailSupportPullCron failed (IMAP?)', e);
        return null;
    }
}
//# sourceMappingURL=support_inbox.js.map