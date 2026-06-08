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
exports.INACTIVE_EXTENDED_MAX_DAYS = exports.INACTIVE_EXTENDED_MIN_DAYS = exports.REENGAGE_COOLDOWN_DAYS = exports.STREAK_RISK_INACTIVE_HOURS = exports.STREAK_AT_RISK_MIN = exports.INACTIVE_MAX_DAYS = exports.INACTIVE_MIN_DAYS = void 0;
exports.parseReEngageUser = parseReEngageUser;
exports.getLocalHour = getLocalHour;
exports.isInQuietHours = isInQuietHours;
exports.isValidExpoPushToken = isValidExpoPushToken;
exports.classifyReEngageUser = classifyReEngageUser;
exports.selectReEngageCandidates = selectReEngageCandidates;
exports.buildExpoPushMessage = buildExpoPushMessage;
exports.chunkMessages = chunkMessages;
exports.fetchExpiredTokenUids = fetchExpiredTokenUids;
exports.pruneExpiredPushTokens = pruneExpiredPushTokens;
exports.runReEngagePush = runReEngagePush;
/**
 * re_engage_push.ts — серверный «возврат пропавших».
 *
 * Проблема (из аудита удержания): все локальные уведомления планируются только
 * когда юзер открывает приложение. Если он пропал на 3+ дня — телефон молчит,
 * сервер не может достучаться. Это дыра в дне воронки удержания.
 *
 * Решение: ежедневный cron сканирует users/, находит тех, кто давно не заходил
 * или у кого вот-вот сгорит стрик, и шлёт им push через Expo Push API
 * (тот же канал, что уже используется в арене). Expo доставляет через FCM/APNs
 * даже в закрытое приложение.
 *
 * Архитектура: чистая логика отбора и текстов (selectReEngageCandidates,
 * buildExpoPushMessage, chunkMessages) отделена от I/O (runReEngagePush) —
 * чистые функции покрыты unit-тестами без сети и Firestore.
 */
const admin = __importStar(require("firebase-admin"));
// ── Константы политики ────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
/** Не трогаем тех, кто заходил совсем недавно (им не нужен «возврат»). */
exports.INACTIVE_MIN_DAYS = 3;
/** И не спамим «мёртвых» бесконечно — после 14 дней молчания прекращаем. */
exports.INACTIVE_MAX_DAYS = 14;
/** Стрик под угрозой: есть серия и сегодня ещё не заходил (>20ч). */
exports.STREAK_AT_RISK_MIN = 3;
exports.STREAK_RISK_INACTIVE_HOURS = 20;
/** Не слать один и тот же тип чаще, чем раз в N дней (анти-спам). */
exports.REENGAGE_COOLDOWN_DAYS = 2;
/** Расширенное окно возврата: 15-30 дней (второй шанс для ушедших). */
exports.INACTIVE_EXTENDED_MIN_DAYS = 15;
exports.INACTIVE_EXTENDED_MAX_DAYS = 30;
// ── Парсинг полей юзер-документа ───────────────────────────────────────────────
function num(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/** Достаёт нужные поля из сырого Firestore-документа в типизированный ReEngageUser. */
function parseReEngageUser(uid, data) {
    const progress = (data?.progress ?? {});
    return {
        uid,
        expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
        pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
        pushTokenTimezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
        lastActiveAt: num(data?.last_active_at),
        streakCount: num(progress.streak_count),
        lastReEngagePushAt: num(data?.lastReEngagePushAt),
        userName: typeof progress.user_name === 'string' ? progress.user_name : null,
    };
}
/** Возвращает локальный час пользователя (0-23) по его IANA timezone. */
function getLocalHour(nowMs, timezone) {
    try {
        if (!timezone)
            return new Date(nowMs).getUTCHours();
        const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone });
        const hourStr = formatter.format(new Date(nowMs));
        const h = parseInt(hourStr, 10);
        return Number.isFinite(h) ? h % 24 : new Date(nowMs).getUTCHours();
    }
    catch {
        return new Date(nowMs).getUTCHours();
    }
}
/** Тихие часы 22:00–09:00 по локальному времени пользователя. */
function isInQuietHours(nowMs, timezone) {
    const h = getLocalHour(nowMs, timezone);
    return h >= 22 || h < 9;
}
/** Валиден ли Expo push token (формат ExponentPushToken[...] или ExpoPushToken[...]). */
function isValidExpoPushToken(token) {
    return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token.trim());
}
// ── Чистая логика отбора ───────────────────────────────────────────────────────
/**
 * Решает, нужно ли слать юзеру re-engage push и по какой причине.
 * Возвращает причину или null (слать не надо).
 *
 * Приоритет: стрик под угрозой важнее «давно не заходил» (потеря серии больнее).
 */
function classifyReEngageUser(u, now) {
    if (!isValidExpoPushToken(u.expoPushToken))
        return null;
    if (u.lastActiveAt == null)
        return null;
    // Тихие часы: не будим пользователя ночью (22:00–09:00 по его локальному времени).
    if (isInQuietHours(now, u.pushTokenTimezone))
        return null;
    // Анти-спам: недавно уже слали — пропускаем.
    if (u.lastReEngagePushAt != null && now - u.lastReEngagePushAt < exports.REENGAGE_COOLDOWN_DAYS * DAY_MS) {
        return null;
    }
    const msInactive = now - u.lastActiveAt;
    const hoursInactive = msInactive / (60 * 60 * 1000);
    const streak = u.streakCount ?? 0;
    // 1) Стрик под угрозой: есть серия, сегодня не заходил, но ещё в пределах суток
    //    (иначе серия уже сгорела — это уже кейс inactive_return).
    if (streak >= exports.STREAK_AT_RISK_MIN && hoursInactive >= exports.STREAK_RISK_INACTIVE_HOURS && hoursInactive < 24) {
        return 'streak_at_risk';
    }
    const daysInactive = msInactive / DAY_MS;
    // 2) Давно не заходил: основное окно [3, 14 дней].
    if (daysInactive >= exports.INACTIVE_MIN_DAYS && daysInactive <= exports.INACTIVE_MAX_DAYS) {
        return 'inactive_return';
    }
    // 3) Расширенный возврат: [15, 30 дней] — повторная попытка с другим текстом.
    if (daysInactive > exports.INACTIVE_EXTENDED_MIN_DAYS && daysInactive <= exports.INACTIVE_EXTENDED_MAX_DAYS) {
        return 'inactive_long';
    }
    return null;
}
/** Отбирает всех кандидатов на push из списка юзеров (чистая функция). */
function selectReEngageCandidates(users, now) {
    const out = [];
    for (const u of users) {
        const reason = classifyReEngageUser(u, now);
        if (!reason)
            continue;
        out.push({
            uid: u.uid,
            token: u.expoPushToken,
            lang: u.pushTokenLang || 'ru',
            reason,
            streakCount: u.streakCount ?? 0,
            userName: u.userName || '',
        });
    }
    return out;
}
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
function normLang(lang) {
    return SUPPORTED_LANGS.includes(lang) ? lang : 'ru';
}
const STREAK_AT_RISK_COPY = {
    ru: (s) => ({ title: `🔥 Серия ${s} дней под угрозой!`, body: 'Один урок сегодня — и цепочка цела. Не теряй прогресс!' }),
    uk: (s) => ({ title: `🔥 Серія ${s} днів під загрозою!`, body: 'Один урок сьогодні — і ланцюжок цілий. Не втрачай прогрес!' }),
    es: (s) => ({ title: `🔥 ¡Tu racha de ${s} días está en peligro!`, body: 'Una lección hoy y la mantienes viva. ¡No pierdas tu progreso!' }),
    'pt-BR': (s) => ({ title: `🔥 Sua sequência de ${s} dias está em risco!`, body: 'Uma lição hoje e a corrente continua. Não perca seu progresso!' }),
    vi: (s) => ({ title: `🔥 Chuỗi ${s} ngày sắp mất!`, body: 'Một bài học hôm nay là giữ được chuỗi. Đừng để mất tiến độ!' }),
    id: (s) => ({ title: `🔥 Streak ${s} hari dalam bahaya!`, body: 'Satu pelajaran hari ini menjaga streak. Jangan hilangkan progresmu!' }),
    tr: (s) => ({ title: `🔥 ${s} günlük serin tehlikede!`, body: 'Bugün bir ders ve seri devam eder. İlerlemeni kaybetme!' }),
    pl: (s) => ({ title: `🔥 Twoja seria ${s} dni jest zagrożona!`, body: 'Jedna lekcja dziś i seria trwa. Nie trać postępu!' }),
};
const INACTIVE_RETURN_COPY = {
    ru: { title: `👋 Давно тебя не было!`, body: `Пять минут практики вернут тебя в форму. Продолжим?` },
    uk: { title: `👋 Давно тебе не було!`, body: `П'ять хвилин практики повернуть тебе у форму. Продовжимо?` },
    es: { title: `👋 ¡Cuánto tiempo!`, body: `Cinco minutos de práctica y vuelves a tu ritmo. ¿Seguimos?` },
    'pt-BR': { title: `👋 Quanto tempo!`, body: `Cinco minutos de prática e você volta ao ritmo. Vamos?` },
    vi: { title: `👋 Lâu rồi không gặp!`, body: `Năm phút luyện tập là bạn trở lại phong độ. Tiếp tục nhé?` },
    id: { title: `👋 Sudah lama tidak bertemu!`, body: `Lima menit latihan dan kamu kembali ke ritme. Lanjut?` },
    tr: { title: `👋 Seni özledik!`, body: `Beş dakikalık pratikle eski formuna dönersin. Devam edelim mi?` },
    pl: { title: `👋 Dawno cię nie było!`, body: `Pięć minut praktyki i wracasz do formy. Kontynuujemy?` },
};
const INACTIVE_LONG_COPY = {
    ru: { title: `💡 Всё ещё помним тебя!`, body: `Давай с чистого листа — пара фраз, и слова снова начнут оседать.` },
    uk: { title: `💡 Ми всі ще пам'ятаємо тебе!`, body: `Давай з чистого аркуша — пара фраз, і слова знову почнуть осідати.` },
    es: { title: `💡 ¡Aún te recordamos!`, body: `Empecemos de cero — un par de frases y las palabras vuelven a fluir.` },
    'pt-BR': { title: `💡 Ainda lembramos de você!`, body: `Vamos recomeçar — algumas frases e as palavras voltam a fazer sentido.` },
    vi: { title: `💡 Chúng tôi vẫn nhớ bạn!`, body: `Bắt đầu lại thôi — vài câu là từ ngữ lại quen tay ngay.` },
    id: { title: `💡 Kami masih ingat kamu!`, body: `Mulai lagi dari awal — beberapa frasa dan kata-kata langsung terasa familiar.` },
    tr: { title: `💡 Seni hâlâ hatırlıyoruz!`, body: `Sıfırdan başlayalım — birkaç cümle ve kelimeler tekrar yerli yerine oturur.` },
    pl: { title: `💡 Wciąż o Tobie pamiętamy!`, body: `Zacznijmy od nowa — kilka zdań i słowa znów wejdą w pamięć.` },
};
/** Локализованное сообщение для кандидата (чистая функция). */
function buildExpoPushMessage(c) {
    const lang = normLang(c.lang);
    const copy = c.reason === 'streak_at_risk'
        ? STREAK_AT_RISK_COPY[lang](c.streakCount)
        : c.reason === 'inactive_long'
            ? INACTIVE_LONG_COPY[lang]
            : INACTIVE_RETURN_COPY[lang];
    return {
        to: c.token,
        title: copy.title,
        body: copy.body,
        sound: 'default',
        data: { type: c.reason },
    };
}
/** Разбивка сообщений на чанки (Expo Push API принимает до 100 за раз). */
function chunkMessages(messages, size = 100) {
    const chunks = [];
    for (let i = 0; i < messages.length; i += size) {
        chunks.push(messages.slice(i, i + size));
    }
    return chunks;
}
// ── I/O: отправка через Expo Push API ──────────────────────────────────────────
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';
/**
 * Отправляет чанк и возвращает ticket-ids для последующей проверки receipts.
 */
async function sendExpoPushChunk(chunk) {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
    });
    if (!res.ok) {
        throw new Error(`expo_push_http_${res.status}`);
    }
    const json = (await res.json());
    const ticketIds = [];
    for (const ticket of json.data ?? []) {
        if (ticket.status === 'ok' && ticket.id)
            ticketIds.push(ticket.id);
    }
    return ticketIds;
}
/**
 * Запрашивает receipts по ticket-ids и возвращает uid пользователей
 * с DeviceNotRegistered — их токены нужно удалить из Firestore.
 */
async function fetchExpiredTokenUids(ticketIds, uidByTicket) {
    if (ticketIds.length === 0)
        return [];
    try {
        const res = await fetch(EXPO_RECEIPTS_ENDPOINT, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: ticketIds }),
        });
        if (!res.ok)
            return [];
        const json = (await res.json());
        const expiredUids = [];
        for (const [id, receipt] of Object.entries(json.data ?? {})) {
            if (receipt.status === 'error' &&
                receipt.details?.error === 'DeviceNotRegistered') {
                const uid = uidByTicket.get(id);
                if (uid)
                    expiredUids.push(uid);
            }
        }
        return expiredUids;
    }
    catch {
        return [];
    }
}
/**
 * Удаляет expoPushToken из Firestore для пользователей с устаревшими токенами.
 * Вызывается через 30+ минут после отправки (Expo обрабатывает receipts не мгновенно).
 */
async function pruneExpiredPushTokens(expiredUids) {
    if (expiredUids.length === 0)
        return;
    const db = admin.firestore();
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let count = 0;
    for (const uid of expiredUids) {
        batch.set(db.collection('users').doc(uid), { expoPushToken: admin.firestore.FieldValue.delete() }, { merge: true });
        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % BATCH_SIZE !== 0)
        await batch.commit();
    console.log(`re_engage_push: pruned ${expiredUids.length} expired tokens`);
}
// ── I/O: главный прогон cron ────────────────────────────────────────────────────
/**
 * Сканирует users/, отбирает кандидатов, шлёт push и проставляет lastReEngagePushAt
 * (чтобы не слать повторно в пределах cooldown). Cursor-pagination по образцу
 * reset_weekly_xp.ts. Возвращает сводку для логов.
 */
async function runReEngagePush(now = Date.now()) {
    const db = admin.firestore();
    const PAGE_SIZE = 300;
    const STAMP_BATCH = 400;
    let scanned = 0;
    const allCandidates = [];
    let lastDoc = null;
    // 1) Scan + отбор кандидатов.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let query = db.collection('users').orderBy('__name__').limit(PAGE_SIZE);
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
        const pageUsers = snap.docs.map((doc) => parseReEngageUser(doc.id, doc.data()));
        scanned += pageUsers.length;
        allCandidates.push(...selectReEngageCandidates(pageUsers, now));
        if (snap.size < PAGE_SIZE)
            break;
    }
    if (allCandidates.length === 0) {
        return { scanned, candidates: 0, sent: 0, failedChunks: 0, ticketCount: 0 };
    }
    // 2) Отправка push чанками по 100.
    // Отслеживаем uid и ticket-ids успешных отправок:
    // uid → для stamping cooldown, ticketIds → для последующей проверки receipts.
    const messages = allCandidates.map(buildExpoPushMessage);
    const candidateChunks = chunkMessages(allCandidates, 100);
    const messageChunks = chunkMessages(messages, 100);
    let sent = 0;
    let failedChunks = 0;
    const successfulUids = [];
    const allTicketIds = [];
    const uidByTicket = new Map();
    for (let i = 0; i < messageChunks.length; i++) {
        try {
            const ticketIds = await sendExpoPushChunk(messageChunks[i]);
            sent += messageChunks[i].length;
            for (let j = 0; j < candidateChunks[i].length; j++) {
                const c = candidateChunks[i][j];
                successfulUids.push(c.uid);
                if (ticketIds[j]) {
                    uidByTicket.set(ticketIds[j], c.uid);
                    allTicketIds.push(ticketIds[j]);
                }
            }
        }
        catch (e) {
            failedChunks++;
            console.error('re_engage_push: chunk failed', e);
        }
    }
    // 3) Проставляем lastReEngagePushAt только тем, кому пуш реально ушёл.
    // Пользователи из упавших чанков не получают cooldown — они будут повторно
    // отобраны на следующем прогоне.
    if (successfulUids.length > 0) {
        let batch = db.batch();
        let stamped = 0;
        for (const uid of successfulUids) {
            batch.set(db.collection('users').doc(uid), { lastReEngagePushAt: now }, { merge: true });
            stamped++;
            if (stamped % STAMP_BATCH === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }
        if (stamped % STAMP_BATCH !== 0) {
            await batch.commit();
        }
    }
    // 4) Сохраняем ticket-ids в Firestore для отложенной проверки receipts (~30 мин).
    // Отдельный cron (runReEngageReceiptCheck) читает этот документ, запрашивает receipts
    // у Expo и удаляет устаревшие токены (DeviceNotRegistered).
    if (allTicketIds.length > 0) {
        const uidByTicketObj = {};
        uidByTicket.forEach((uid, ticketId) => { uidByTicketObj[ticketId] = uid; });
        await db.collection('_internal').doc('re_engage_receipts_pending').set({ ticketIds: allTicketIds, uidByTicket: uidByTicketObj, sentAt: now }, { merge: false });
    }
    return { scanned, candidates: allCandidates.length, sent, failedChunks, ticketCount: allTicketIds.length };
}
//# sourceMappingURL=re_engage_push.js.map