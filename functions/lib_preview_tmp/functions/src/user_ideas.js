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
exports.adminDraftIdeaDecision = exports.adminDecideUserIdea = exports.adminListUserIdeas = exports.submitUserIdea = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const explain_provider_1 = require("./explain/explain_provider");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const IDEAS_COLLECTION = 'user_ideas';
const RATE_COLLECTION = 'user_idea_rate_limits';
const IDEA_INBOX = 'idea_inbox';
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
const IDEAS_MAX_LIST_LIMIT = 50;
const IDEAS_CURSOR_RE = /^[A-Za-z0-9_-]{1,200}$/;
/** 1 идея в сутки на пользователя (защита от спама в админ-очереди). */
const MAX_IDEAS_PER_DAY = 1;
const IDEA_CATEGORIES = ['feature', 'improvement', 'monetization', 'content', 'other'];
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function nullableText(value, max) {
    const out = text(value, max);
    return out || null;
}
function enumText(value, allowed, fallback) {
    const out = text(value, 80);
    return allowed.includes(out) ? out : fallback;
}
function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
// ─────────────────────────────────────────────────────────────────────────────
// 1) Пользователь отправляет идею
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Пользователь присылает креативную идею (4 графы: название, как работает, чем
 * поможет, категория). Пишем в коллекцию user_ideas со status='pending'.
 * Никаких наград при отправке — год полного доступа выдаёт АДМИН при одобрении
 * через adminDecideUserIdea. Паттерн — копия submitClientReport.
 */
exports.submitUserIdea = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    const payload = asRecord(request.data?.payload ?? request.data);
    const title = text(payload.title, 120);
    const description = text(payload.description, 2000);
    const benefit = text(payload.benefit, 1000);
    const category = enumText(payload.category, IDEA_CATEGORIES, 'other');
    if (title.length < 3)
        throw new https_1.HttpsError('invalid-argument', 'title_required');
    if (description.length < 10)
        throw new https_1.HttpsError('invalid-argument', 'description_required');
    const now = Date.now();
    const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc();
    return db.runTransaction(async (tx) => {
        const rateSnap = await tx.get(rateRef);
        const rate = rateSnap.data() || {};
        const windowStartMs = numeric(rate.windowStartMs);
        const sameWindow = now - windowStartMs < DAY_MS;
        const count = sameWindow ? numeric(rate.count) : 0;
        if (count >= MAX_IDEAS_PER_DAY) {
            throw new https_1.HttpsError('resource-exhausted', 'rate_limited');
        }
        tx.set(rateRef, {
            stableUid,
            authUid,
            windowStartMs: sameWindow ? windowStartMs : now,
            count: count + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: now,
        }, { merge: true });
        tx.create(ideaRef, {
            uid: stableUid,
            authUid,
            title,
            description,
            benefit,
            category,
            status: 'pending',
            userName: nullableText(payload.userName, 120),
            lang: nullableText(payload.lang, 16),
            platform: text(payload.platform, 40) || 'unknown',
            appVersion: text(payload.appVersion, 80) || 'unknown',
            createdAt: new Date(now).toISOString(),
            createdAtMs: now,
            serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, id: ideaRef.id };
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 1b) Админ: список идей с фильтрами по статусу/категории и пагинацией
// ─────────────────────────────────────────────────────────────────────────────
/**
 * зачем: в новой админке раздел "Идеи" был урезан до 3 карточек без фильтров и
 * действий (владелец продукта провёл аудит и попросил вернуть полноценный
 * воркфлоу, как в старой админке — фильтр по статусу/категории, пагинация,
 * список для дальнейшего принять/отклонить через adminDecideUserIdea).
 * Курсор — id последнего документа предыдущей страницы (сортировка по
 * createdAtMs desc, тот же паттерн, что и adminListReportQueue).
 */
exports.adminListUserIdeas = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !(0, roles_1.hasAdminRole)(role) || !(0, permissions_1.hasPermission)(role, 'ideas.read')) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const status = enumText(request.data?.status, ['pending', 'approved', 'rejected', 'all'], 'pending');
    const category = text(request.data?.category, 40);
    const cursor = text(request.data?.cursor, 200);
    if (cursor && !IDEAS_CURSOR_RE.test(cursor))
        throw new https_1.HttpsError('invalid-argument', 'cursor_invalid');
    const requestedLimit = Number(request.data?.limit);
    const limit = Math.max(1, Math.min(IDEAS_MAX_LIST_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20));
    const db = admin.firestore();
    let query = db.collection(IDEAS_COLLECTION);
    if (status !== 'all')
        query = query.where('status', '==', status);
    query = query.orderBy('createdAtMs', 'desc');
    if (cursor) {
        const cursorDoc = await db.collection(IDEAS_COLLECTION).doc(cursor).get();
        if (!cursorDoc.exists)
            throw new https_1.HttpsError('failed-precondition', 'cursor_not_found');
        query = query.startAfter(cursorDoc);
    }
    // Категория не индексирована вместе со статусом — фильтруем в памяти на разумном окне,
    // не вытягивая всю коллекцию (Firebase-экономия: страница остаётся маленькой).
    const fetchLimit = category ? Math.min(200, limit * 5) : limit + 1;
    const snap = await query.limit(fetchLimit).get();
    let docs = snap.docs;
    if (category)
        docs = docs.filter((doc) => String(doc.data().category ?? '') === category);
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit);
    const items = page.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            title: text(data.title, 120),
            description: text(data.description, 2000),
            benefit: text(data.benefit, 1000),
            category: text(data.category, 40),
            status: text(data.status, 20),
            userName: nullableText(data.userName, 120),
            uid: text(data.uid, 180),
            lang: nullableText(data.lang, 16),
            createdAtMs: numeric(data.createdAtMs),
            decidedAtMs: data.decidedAt != null ? numeric(data.decidedAt) : null,
            decidedBy: nullableText(data.decidedBy, 160),
        };
    });
    return {
        ok: true,
        items,
        nextCursor: hasMore && page.length ? page[page.length - 1].id : '',
    };
});
/**
 * Локализованные дефолтные тексты модалки решения. Админ может переопределить любой
 * текст (titleRu/Uk + messageRu/Uk) — тогда показываем его. По Библии Phraseman:
 * approve = Стиль ИГРА+ИНВЕСТОР («год полного доступа»), reject = Стиль ЧЕЛОВЕК+ТРЕНЕР.
 */
function defaultDecisionTexts(decision) {
    if (decision === 'approve') {
        return {
            titleRu: 'Поздравляем — твоя идея принята! 🎉',
            titleUk: 'Вітаємо — твою ідею прийнято! 🎉',
            titleEs: '¡Felicidades! Tu idea ha sido aceptada 🎉',
            messageRu: 'Твоя идея одобрена и взята в разработку.\n\nВ благодарность мы открываем тебе Premium на целый год. Спасибо, что делаешь Phraseman лучше.',
            messageUk: 'Твою ідею схвалено та взято в розробку.\n\nНа подяку ми відкриваємо тобі Premium на цілий рік. Дякуємо, що робиш Phraseman кращим.',
            messageEs: 'Tu idea ha sido aprobada y pasa a desarrollo.\n\nComo agradecimiento, te abrimos Premium durante todo un año. Gracias por ayudar a mejorar Phraseman.',
        };
    }
    return {
        titleRu: 'Спасибо за идею',
        titleUk: 'Дякуємо за ідею',
        titleEs: 'Gracias por la idea',
        messageRu: 'Мы внимательно прочитали твою идею, но пока не берём её в работу.\n\nЭто не повод останавливаться — присылай ещё. Каждая идея помогает нам расти.',
        messageUk: 'Ми уважно прочитали твою ідею, але поки не беремо її в роботу.\n\nЦе не привід зупинятися — надсилай ще. Кожна ідея допомагає нам зростати.',
        messageEs: 'Leímos tu idea con atención, pero por ahora no la vamos a tomar en desarrollo.\n\nNo es motivo para detenerse: envíanos más. Cada idea nos ayuda a crecer.',
    };
}
/**
 * Кладёт в персональный инбокс пользователя документ-решение, который приложение
 * покажет модалкой на следующем открытии (см. app/idea_decision_modals.ts).
 */
function writeIdeaInbox(tx, db, uid, decision, texts, ideaId, now) {
    const inboxRef = db.collection('users').doc(uid).collection(IDEA_INBOX).doc();
    tx.set(inboxRef, {
        type: 'idea_decision',
        decision,
        ideaId,
        titleRu: texts.titleRu,
        titleUk: texts.titleUk,
        titleEs: texts.titleEs,
        messageRu: texts.messageRu,
        messageUk: texts.messageUk,
        messageEs: texts.messageEs,
        createdAt: now,
        seen: false,
    });
}
/**
 * Админ: принять (approve) или отклонить (reject) идею.
 * approve → выдаём 1 год полного доступа (VIP-грант с конкретным сроком now+365д,
 *   крон погасит ровно через год) + персональная модалка-поздравление.
 * reject → персональная модалка с объяснением (текст редактируется в админке).
 * Тексты модалки можно переопределить (titleRu/Uk, messageRu/Uk).
 */
exports.adminDecideUserIdea = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 20,
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'], 'reject');
    if (!ideaId)
        throw new https_1.HttpsError('invalid-argument', 'ideaId_required');
    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    const adminEmail = text(request.auth.token.email, 160) || 'admin';
    // Переопределённые тексты модалки (если админ их прислал), иначе дефолт по Библии.
    const def = defaultDecisionTexts(decision);
    const texts = {
        titleRu: text(request.data?.titleRu, 200) || def.titleRu,
        titleUk: text(request.data?.titleUk, 200) || def.titleUk,
        titleEs: text(request.data?.titleEs, 200) || def.titleEs,
        messageRu: text(request.data?.messageRu, 2000) || def.messageRu,
        messageUk: text(request.data?.messageUk, 2000) || def.messageUk,
        messageEs: text(request.data?.messageEs, 2000) || def.messageEs,
    };
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ideaRef);
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'idea_not_found');
        const idea = snap.data();
        const status = String(idea.status ?? '');
        if (status === 'approved' || status === 'rejected') {
            throw new https_1.HttpsError('failed-precondition', 'already_decided');
        }
        const targetUid = text(idea.uid, 180);
        if (!targetUid)
            throw new https_1.HttpsError('failed-precondition', 'idea_missing_uid');
        if (decision === 'approve') {
            // 1 год полного доступа. VIP-грант с конкретным сроком — крон premiumExpiryCron
            // НЕ трогает grant с vip_until>0 раньше времени, но погасит ровно через год.
            const userRef = db.collection('users').doc(targetUid);
            tx.set(userRef, {
                progress: {
                    vip_active: 'true',
                    vip_plan: 'idea_reward',
                    vip_from: String(now),
                    vip_until: String(now + YEAR_MS),
                    vip_admin_override: 'true',
                    vip_admin_grant_at: String(now),
                    vip_admin_grant_reason: 'user_idea_approved',
                },
            }, { merge: true });
        }
        tx.update(ideaRef, {
            status: decision === 'approve' ? 'approved' : 'rejected',
            decidedAt: now,
            decidedAtIso: new Date(now).toISOString(),
            decidedBy: adminEmail,
            decisionTitleRu: texts.titleRu,
            decisionTitleUk: texts.titleUk,
            decisionMessageRu: texts.messageRu,
            decisionMessageUk: texts.messageUk,
            premiumGranted: decision === 'approve',
            premiumGrantUntilMs: decision === 'approve' ? now + YEAR_MS : null,
        });
        writeIdeaInbox(tx, db, targetUid, decision, texts, ideaId, now);
    });
    return { ok: true };
});
// ─────────────────────────────────────────────────────────────────────────────
// 3) Админ: ИИ-черновик текста модалки решения (СРАЗУ на языке пользователя)
// ─────────────────────────────────────────────────────────────────────────────
/** Человекочитаемое название языка для промпта (чтобы модель точно поняла). */
const IDEA_LANG_NAMES = {
    ru: 'Russian',
    uk: 'Ukrainian',
    es: 'Spanish',
    pt: 'Portuguese',
    vi: 'Vietnamese',
    id: 'Indonesian',
    tr: 'Turkish',
    pl: 'Polish',
    en: 'English',
};
const IDEA_DECISION_MSG_MAX = 900;
const IDEA_DRAFT_SYSTEM_PROMPT = [
    'You write a short in-app modal message for a user of Phraseman, an English-learning app.',
    'The user submitted a product idea. The team has made a decision on it.',
    'Write a warm, human, 2-4 sentence message addressed to the user (informal "you"),',
    'STRICTLY in the language given in the "language" field — do not mix languages.',
    'If decision is "approve": thank them warmly, say the idea is accepted and going into development,',
    'and that as a thank-you we open full Premium access for a whole year. Sound genuinely glad.',
    'If decision is "reject": thank them for the idea, gently say we are not taking it into work for now,',
    'and encourage them to keep sending ideas. No excuses, no blame, no bureaucratic tone.',
    'Speak as the team ("we"). No links, no deadlines, at most one emoji.',
    'Return STRICTLY a JSON object: {"message": "..."} with the message in the target language only.',
].join(' ');
// Максимальная длина подсказки-тона от админа. Тон задаётся на любом языке
// (обычно русском) и влияет ТОЛЬКО на стиль/содержание, но не на язык ответа —
// сообщение пользователю всё равно пишется на его языке (idea.lang).
const IDEA_TONE_HINT_MAX = 600;
/**
 * adminDraftIdeaDecision — ИИ-черновик текста модалки решения по идее.
 * Пишет текст СРАЗУ на языке пользователя (idea.lang), чтобы админу не нужно
 * было переводить. Админ может отредактировать перед отправкой в adminDecideUserIdea.
 *
 * data: { ideaId: string; decision: 'approve' | 'reject' }
 * Возвращает: { ok: true, message: string, lang: string }
 */
exports.adminDraftIdeaDecision = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'], 'reject');
    const toneHint = text(request.data?.toneHint, IDEA_TONE_HINT_MAX);
    if (!ideaId)
        throw new https_1.HttpsError('invalid-argument', 'ideaId_required');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const db = admin.firestore();
    const snap = await db.collection(IDEAS_COLLECTION).doc(ideaId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'idea_not_found');
    const idea = snap.data();
    const langCode = (text(idea.lang, 8) || 'ru').toLowerCase();
    const languageName = IDEA_LANG_NAMES[langCode] || IDEA_LANG_NAMES[langCode.slice(0, 2)] || 'Russian';
    const userPayload = JSON.stringify({
        language: languageName,
        decision,
        // Тон — первоклассное поле payload'а: модель видит его вместе с идеей и
        // обязана применить. Пустая строка, если админ тон не задал.
        admin_tone_instruction: toneHint || '',
        idea: {
            title: text(idea.title, 120),
            description: text(idea.description, 1500),
            benefit: text(idea.benefit, 600),
            category: text(idea.category, 40),
        },
    });
    // Диагностика: видно, дошёл ли тон до функции и какой длины (в Cloud Logs).
    console.log('[draftIdeaDecision]', JSON.stringify({
        ideaId, decision, lang: langCode,
        toneLen: toneHint.length, tone: toneHint.slice(0, 200),
    }));
    // Базовый промпт. Если задан тон — он идёт ПОСЛЕДНИМ сообщением (после payload),
    // максимально императивно: модель сильнее слушает последнее указание, а базовый
    // сценарий явно объявляется переопределяемым тоном.
    const messages = [
        { role: 'system', content: IDEA_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
    ];
    if (toneHint) {
        messages.push({
            role: 'system',
            content: [
                '=== OVERRIDE: ADMIN TONE INSTRUCTION (HIGHEST PRIORITY) ===',
                'The admin explicitly set a custom instruction for THIS reply. It OVERRIDES the default',
                'thank-you/rejection wording and the suggested sentence structure above. Rewrite the',
                'message so it clearly, obviously reflects this instruction — a reader must be able to',
                'tell the tone/content changed. Do NOT fall back to the generic template.',
                'Only these hard limits still apply: write in the target language, 2-4 sentences,',
                'at most one emoji, no links.',
                'If the instruction is written in another language, apply its MEANING but still WRITE',
                'the final message in the target language.',
                'ADMIN INSTRUCTION -> ' + toneHint,
            ].join('\n'),
        });
    }
    const result = await (0, explain_provider_1.openAiChat)({
        apiKey,
        model: 'gpt-4o-mini',
        messages,
        maxTokens: 400,
        // С тоном даём модели больше свободы отклониться от шаблона; без тона —
        // сдержаннее (стабильный дефолт).
        temperature: toneHint ? 0.9 : 0.6,
        responseFormat: { type: 'json_object' },
    });
    // Модель может вернуть НЕ JSON, а прозу/отказ. Тогда JSON.parse падает, и раньше
    // админ видел глухое «INTERNAL» без причины. Отдаём понятную ошибку с обрезанным
    // сырым текстом модели, чтобы было видно её ответ (в т.ч. текст отказа), и админ
    // мог написать сообщение вручную.
    const raw = String(result.text || '').trim();
    if (!raw) {
        throw new https_1.HttpsError('failed-precondition', 'ИИ вернул пустой ответ — сформулируй сообщение вручную.');
    }
    if (toneHint)
        console.log('[draftIdeaDecision] raw ->', raw.slice(0, 400));
    let message = '';
    try {
        const parsed = JSON.parse(raw);
        message = text(parsed.message, IDEA_DECISION_MSG_MAX);
    }
    catch {
        throw new https_1.HttpsError('failed-precondition', `ИИ не вернул черновик (возможно, отказ). Ответ модели: ${raw.slice(0, 300)}`);
    }
    if (!message) {
        throw new https_1.HttpsError('failed-precondition', `ИИ вернул пустое сообщение. Ответ модели: ${raw.slice(0, 300)}`);
    }
    return { ok: true, message, lang: langCode };
});
//# sourceMappingURL=user_ideas.js.map