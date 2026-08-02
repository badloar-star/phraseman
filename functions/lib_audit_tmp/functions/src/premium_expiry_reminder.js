"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// premium_expiry_reminder.ts — заботливое напоминание «твой Plus скоро истекает».
//
// Зачем: premium_expiry_cron.ts ГАСИТ уже просроченный доступ — это уборка
// постфактум. А тут — наоборот, ПРОФИЛАКТИКА оттока: за ~3 дня до конца платной
// подписки/VIP шлём тёплый push, чтобы человек успел осознанно продлить. Возврат
// уходящего подписчика дешевле привлечения нового — это самый быстрый рычаг MRR.
//
// Инвариант (зеркало premium_status/ premium_expiry_cron): напоминаем ТОЛЬКО про
// доступ с КОНКРЕТНЫМ серверным сроком в будущем. Бессрочное (lifetime, ручная
// выдача без срока, premium_expiry='0' без rc-срока, vip_until<=0) — НЕ трогаем:
// ему нечего «продлевать». Триал в это окно тоже попадёт (у него есть срок) — и
// это правильно: «после триала спишется» — честное, ожидаемое напоминание.
//
// Архитектура повторяет re_engage_push.ts: чистые функции отбора/текстов
// (unit-тестируемы без сети и Firestore) отделены от I/O (runPremiumExpiryReminder).
// Отправка — общий sendExpoPushMessages из admin_push_jobs.ts (тот же канал Expo).
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
exports.REMINDER_COOLDOWN_DAYS = exports.REMIND_MAX_MS = exports.REMIND_MIN_MS = void 0;
exports.parseExpiryReminderUser = parseExpiryReminderUser;
exports.resolveExpiringAccess = resolveExpiringAccess;
exports.classifyExpiryReminder = classifyExpiryReminder;
exports.selectExpiryReminderCandidates = selectExpiryReminderCandidates;
exports.buildExpiryReminderMessage = buildExpiryReminderMessage;
exports.runPremiumExpiryReminder = runPremiumExpiryReminder;
const admin = __importStar(require("firebase-admin"));
const premium_status_1 = require("./premium_status");
const re_engage_push_1 = require("./re_engage_push");
const admin_push_jobs_1 = require("./admin_push_jobs");
const DAY_MS = 24 * 60 * 60 * 1000;
// ── Политика окна напоминания ─────────────────────────────────────────────────
/** Нижняя граница: не раньше чем за 3 дня до конца (72ч). */
exports.REMIND_MIN_MS = 3 * DAY_MS;
/** Верхняя граница: не позже чем за 4 дня (96ч) — окно ровно в одни сутки скана. */
exports.REMIND_MAX_MS = 4 * DAY_MS;
/** Не повторять напоминание про один и тот же срок чаще раза в N дней (анти-спам). */
exports.REMINDER_COOLDOWN_DAYS = 5;
const STORE_PLANS = new Set(['monthly', 'yearly', 'annual']);
function cleanStr(value) {
    return String(value ?? '').trim();
}
function cleanPlan(value) {
    return cleanStr(value).toLowerCase();
}
function isTruthyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
}
function isFalsyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'false' || v === '0' || v === 'no';
}
function num(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/** Достаёт нужные поля из сырого Firestore-документа users/{uid}. */
function parseExpiryReminderUser(uid, data) {
    return {
        uid,
        expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
        pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
        pushTokenTimezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
        progress: (data?.progress ?? {}),
        lastExpiryReminderAt: num(data?.lastPremiumExpiryReminderAt),
    };
}
/**
 * Ближайший КОНКРЕТНЫЙ срок окончания платного доступа в БУДУЩЕМ (ms) и его тип,
 * либо null, если продлевать нечего (всё бессрочное / уже истекло / нет доступа).
 *
 * Зеркало семантики premium_status: store-план со сроком, либо VIP со сроком.
 * Бессрочное (expiry<=0 без rc-срока, vip_until<=0) осознанно исключаем.
 */
function resolveExpiringAccess(progress, now) {
    const data = progress ?? {};
    // ── Store-подписка (RevenueCat monthly/yearly/annual; НЕ lifetime — он бессрочный) ──
    const plan = cleanPlan(data.premium_plan);
    const override = cleanStr(data.admin_premium_override).toLowerCase();
    if (STORE_PLANS.has(plan) && override !== 'true') {
        const expiryMs = (0, premium_status_1.parseProgressMs)(data.premium_expiry);
        if (expiryMs > now) {
            // Конкретный собственный срок (напр. Telegram-оплата на период) в будущем.
            return { kind: 'subscription', expiryMs };
        }
        if (expiryMs <= 0) {
            // premium_expiry='0' = срок ведёт вебхук; авторитет — premium_rc_expiry_ms.
            // rc<=0 = бессрочный store-премиум (lifetime) → продлевать нечего.
            const rcExpiryMs = (0, premium_status_1.parseProgressMs)(data.premium_rc_expiry_ms);
            if (rcExpiryMs > now)
                return { kind: 'subscription', expiryMs: rcExpiryMs };
        }
    }
    // ── VIP со сроком (рефералка / опрос / ручная выдача на период) ────────────────
    const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
    const vipGranted = isTruthyFlag(data.vip_active) ||
        isTruthyFlag(data.vip_admin_override) ||
        (cleanPlan(data.vip_plan) !== '' && cleanPlan(data.vip_plan) !== 'null');
    const vipUntilMs = (0, premium_status_1.parseProgressMs)(data.vip_until ?? data.vip_expiry);
    if (!vipRevoked && vipGranted && vipUntilMs > now) {
        return { kind: 'vip', expiryMs: vipUntilMs };
    }
    return null;
}
/**
 * Решает, слать ли юзеру напоминание об истечении и по какому доступу.
 * Возвращает кандидата или null. Чистая функция.
 */
function classifyExpiryReminder(u, now) {
    if (!(0, re_engage_push_1.isValidExpoPushToken)(u.expoPushToken))
        return null;
    // Тихие часы 22:00–09:00 по локальному времени пользователя — не будим ночью.
    if ((0, re_engage_push_1.isInQuietHours)(now, u.pushTokenTimezone))
        return null;
    const access = resolveExpiringAccess(u.progress, now);
    if (!access)
        return null;
    // Окно [3, 4 дня) до конца: точечно за ~3 дня, ровно раз в сутки скана.
    const msLeft = access.expiryMs - now;
    if (msLeft < exports.REMIND_MIN_MS || msLeft >= exports.REMIND_MAX_MS)
        return null;
    // Анти-спам: уже напоминали недавно (в пределах cooldown) — пропускаем.
    // Cooldown (5 дней) > ширины окна (1 день), так что про один срок шлём один раз.
    if (u.lastExpiryReminderAt != null &&
        now - u.lastExpiryReminderAt < exports.REMINDER_COOLDOWN_DAYS * DAY_MS) {
        return null;
    }
    return {
        uid: u.uid,
        token: u.expoPushToken,
        lang: u.pushTokenLang || 'ru',
        kind: access.kind,
        expiryMs: access.expiryMs,
    };
}
/** Отбирает всех кандидатов на напоминание (чистая функция). */
function selectExpiryReminderCandidates(users, now) {
    const out = [];
    for (const u of users) {
        const c = classifyExpiryReminder(u, now);
        if (c)
            out.push(c);
    }
    return out;
}
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
function normLang(lang) {
    return SUPPORTED_LANGS.includes(lang) ? lang : 'ru';
}
// Подписка: мягко напоминаем, что скоро продление/списание — без давления и угроз.
const SUBSCRIPTION_COPY = {
    ru: { title: '💛 Твой Plus скоро продлится', body: 'Осталось около 3 дней. Если всё нравится — ничего делать не нужно, продолжаем вместе.' },
    uk: { title: '💛 Твій Plus скоро подовжиться', body: 'Лишилось близько 3 днів. Якщо все подобається — робити нічого не треба, продовжуємо разом.' },
    es: { title: '💛 Tu Plus se renovará pronto', body: 'Quedan unos 3 días. Si todo va bien, no tienes que hacer nada: seguimos juntos.' },
    'pt-BR': { title: '💛 Seu Plus vai renovar em breve', body: 'Faltam uns 3 dias. Se está tudo certo, não precisa fazer nada: seguimos juntos.' },
    vi: { title: '💛 Gói Plus của bạn sắp gia hạn', body: 'Còn khoảng 3 ngày. Nếu mọi thứ ổn, bạn không cần làm gì — ta tiếp tục cùng nhau.' },
    id: { title: '💛 Plus kamu akan segera diperpanjang', body: 'Tersisa sekitar 3 hari. Kalau semua baik, kamu tak perlu melakukan apa pun — kita lanjut bersama.' },
    tr: { title: '💛 Plus üyeliğin yakında yenilenecek', body: 'Yaklaşık 3 gün kaldı. Her şey yolundaysa bir şey yapmana gerek yok, birlikte devam ediyoruz.' },
    pl: { title: '💛 Twój Plus wkrótce się odnowi', body: 'Zostały około 3 dni. Jeśli wszystko gra, nie musisz nic robić — kontynuujemy razem.' },
};
// VIP-доступ: не продлевается сам — мягко предупреждаем, что скоро закончится.
const VIP_COPY = {
    ru: { title: '💛 Твой доступ Plus скоро закончится', body: 'Осталось около 3 дней. Успей взять максимум — а захочешь остаться, продлить легко.' },
    uk: { title: '💛 Твій доступ Plus скоро завершиться', body: 'Лишилось близько 3 днів. Встигни взяти максимум — а схочеш лишитися, подовжити легко.' },
    es: { title: '💛 Tu acceso Plus termina pronto', body: 'Quedan unos 3 días. Aprovéchalo al máximo, y si quieres quedarte, renovar es fácil.' },
    'pt-BR': { title: '💛 Seu acesso Plus termina em breve', body: 'Faltam uns 3 dias. Aproveite ao máximo, e se quiser ficar, renovar é fácil.' },
    vi: { title: '💛 Quyền Plus của bạn sắp kết thúc', body: 'Còn khoảng 3 ngày. Tận dụng tối đa nhé, và nếu muốn ở lại, gia hạn rất dễ.' },
    id: { title: '💛 Akses Plus kamu akan segera berakhir', body: 'Tersisa sekitar 3 hari. Manfaatkan sepenuhnya, dan kalau mau tetap, memperpanjang itu mudah.' },
    tr: { title: '💛 Plus erişimin yakında sona erecek', body: 'Yaklaşık 3 gün kaldı. En iyi şekilde değerlendir; kalmak istersen yenilemek çok kolay.' },
    pl: { title: '💛 Twój dostęp Plus wkrótce się skończy', body: 'Zostały około 3 dni. Wykorzystaj go w pełni, a jeśli zechcesz zostać, odnowienie jest łatwe.' },
};
/** Локализованное сообщение для кандидата (чистая функция). */
function buildExpiryReminderMessage(c) {
    const lang = normLang(c.lang);
    const copy = c.kind === 'vip' ? VIP_COPY[lang] : SUBSCRIPTION_COPY[lang];
    return {
        to: c.token,
        title: copy.title,
        body: copy.body,
        sound: 'default',
        data: { type: 'premium_expiry_reminder', kind: c.kind },
    };
}
/**
 * Постраничный скан users/ (cursor по __name__, как в premium_expiry_cron.ts):
 * отбирает кандидатов, шлёт push общим sendExpoPushMessages, штампует
 * lastPremiumExpiryReminderAt на успешных (идемпотентность + анти-спам).
 */
async function runPremiumExpiryReminder(now = Date.now()) {
    const db = admin.firestore();
    const PAGE_SIZE = 500;
    const STAMP_BATCH = 400;
    let scanned = 0;
    const allCandidates = [];
    let lastDoc = null;
    // 1) Scan + отбор.
    for (;;) {
        let q = db.collection('users').orderBy('__name__').limit(PAGE_SIZE);
        if (lastDoc)
            q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
        const pageUsers = snap.docs.map((d) => parseExpiryReminderUser(d.id, d.data()));
        scanned += pageUsers.length;
        allCandidates.push(...selectExpiryReminderCandidates(pageUsers, now));
        if (snap.size < PAGE_SIZE)
            break;
    }
    if (allCandidates.length === 0) {
        return { scanned, candidates: 0, sent: 0, failed: 0 };
    }
    // 2) Отправка (общий хелпер сам чанкует по 100 и собирает сводку).
    const messages = allCandidates.map(buildExpiryReminderMessage);
    const uids = allCandidates.map((c) => c.uid);
    const sendSummary = await (0, admin_push_jobs_1.sendExpoPushMessages)(messages, uids);
    // 3) Штампуем ВСЕХ кандидатов (важно: штампуем и тех, чей токен протух —
    //    иначе на следующем прогоне зря пересчитаем; пере-слать в это же 1-дневное
    //    окно всё равно не дадут cooldown и сдвиг expiry). Пишем и expiry-срок,
    //    про который напомнили, — для форензики.
    let batch = db.batch();
    let stamped = 0;
    for (const c of allCandidates) {
        batch.set(db.collection('users').doc(c.uid), { lastPremiumExpiryReminderAt: now, lastPremiumExpiryReminderForMs: c.expiryMs }, { merge: true });
        stamped++;
        if (stamped % STAMP_BATCH === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (stamped % STAMP_BATCH !== 0)
        await batch.commit();
    return {
        scanned,
        candidates: allCandidates.length,
        sent: sendSummary.sentCount,
        failed: sendSummary.failedCount,
    };
}
//# sourceMappingURL=premium_expiry_reminder.js.map