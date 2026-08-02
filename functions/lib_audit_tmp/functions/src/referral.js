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
exports.referralClaimVipReward = exports.referralListMyInvites = exports.referralOnUserProgressUpdated = exports.referralApply = exports.referralEnsureMyCode = exports.LESSON1_LIVE_PASS_KEYS = exports.REFERRAL_DEFAULTS = exports.MAX_REFERRER_CLAIMS_PER_DAY = exports.MAX_REFERRER_CLAIMS_PER_MONTH = exports.REFERRAL_REWARD_DAYS = void 0;
exports.referralConfigFromData = referralConfigFromData;
exports.resolveReferralConfig = resolveReferralConfig;
exports.resolveReferralRouletteEnabled = resolveReferralRouletteEnabled;
exports.resolveReferralRoulettePolicy = resolveReferralRoulettePolicy;
exports.referralClaimSlotsLeft = referralClaimSlotsLeft;
exports.hasLiveFirstLessonPass = hasLiveFirstLessonPass;
exports.hasCompletedFirstLesson = hasCompletedFirstLesson;
exports.cleanReferralDisplayName = cleanReferralDisplayName;
exports.referralDisplayNameFromUserData = referralDisplayNameFromUserData;
exports.isReferralAccountTooEstablishedForApply = isReferralAccountTooEstablishedForApply;
exports.isSnapshotMigrationWrite = isSnapshotMigrationWrite;
exports.vipUntilFromProgress = vipUntilFromProgress;
exports.stackVipUntilMs = stackVipUntilMs;
exports.buildReferralVipProgressPatch = buildReferralVipProgressPatch;
exports.prunePeriodCounter = prunePeriodCounter;
exports.markRefereeQualified = markRefereeQualified;
exports.assertAuthStableLink = assertAuthStableLink;
/**
 * Вирусный реферал с рулеткой Plus (экономия Firebase-лимитов).
 * Крючок: «друг установил приложение, ввёл код и КУПИЛ Plus или Pro — пригласивший получает 1 прокрут рулетки (приз — Plus от 1 до 365 дней)».
 *
 * Поток:
 *   1. referralEnsureMyCode — referrer получает публичный код (referral_codes/{code}).
 *   2. referralApply — referee вводит код (deeplink/manual). Идемпотентно, антифрод по возрасту аккаунта.
 *      Создаёт referral_attributions/{refereeStableId} со status='pending'.
 *   3. referee покупает Plus или Pro: вебхук RevenueCat/Telegram пишет store-план в
 *      users/{id}.progress.premium_plan (клиент эти поля писать не может — firestore.rules:
 *      progressHasNoPremiumWrites). Триггер referralOnUserProgressUpdated ловит переход
 *      «не было store-премиума → есть» и помечает attribution status='qualified'.
 *      Приглашённый НЕ получает бонусных дней — он уже оплатил доступ.
 *   4. referrer в /referrals конвертирует qualified-приглашения в прокруты →
 *      referralClaimSpin (детерминированный леджер, месячный/дневной капы).
 *
 * VIP-механику НЕ меняем: пишем те же поля vip_* в users/{id}.progress, что и admin-grant.
 * Авторитетный источник premium/vip — только Admin SDK (firestore.rules: progressHasNoPremiumWrites).
 */
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const functions = __importStar(require("firebase-functions/v2"));
const callable_options_1 = require("./callable_options");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const premium_status_1 = require("./premium_status");
const REGION = 'us-central1';
const CODE_LEN = 6;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 12;
// ── Тюнинг реферальной программы (крутится из «Пульта» без релиза) ───────────
// Дефолты = прежние хардкоды. Читаются из remote_config/app.numbers тем же
// async-резолвером, что у арены/карточек (см. resolveReferralConfig). Денежная
// математика: при отсутствии/мусоре → дефолт по полю, поведение не меняется.
/** Referral reward: 7 days for the invited friend and 7 days for the referrer. */
exports.REFERRAL_REWARD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * зачем: лимиты сняты по решению владельца (2026-07-25). Раньше условие награды было
 * «друг прошёл урок 1» — бесплатно и накручиваемо, поэтому нужен был анти-фарм throttle
 * (3/день, 30/мес). Теперь ключ выдаётся ТОЛЬКО когда приглашённый КУПИЛ Plus или Pro
 * (см. qualifiedBy: 'premium_purchase'), то есть накрутка требует реальных платежей —
 * она сама себя наказывает и в антифроде не нуждается. Дневной кап при этом бил по
 * самым ценным юзерам: привёл 5 платящих друзей — получил 3 ключа.
 *
 * Значения остаются НЕ-нулевыми и настраиваемыми из «Пульта»
 * (referral_max_claims_month / referral_max_claims_day, clamp 0..100000): это защитный
 * потолок на случай, если понадобится срочно вернуть throttle без деплоя функций.
 * 0 в этой схеме означал бы «запретить всё», поэтому ставим заведомо недостижимый предел.
 */
exports.MAX_REFERRER_CLAIMS_PER_MONTH = 100000;
exports.MAX_REFERRER_CLAIMS_PER_DAY = 100000;
exports.REFERRAL_DEFAULTS = {
    rewardDays: exports.REFERRAL_REWARD_DAYS,
    maxClaimsPerMonth: exports.MAX_REFERRER_CLAIMS_PER_MONTH,
    maxClaimsPerDay: exports.MAX_REFERRER_CLAIMS_PER_DAY,
};
function referralClampInt(value, min, max, fallback) {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
/**
 * Чистый парсер конфига рефералов из remote_config/app.numbers. Отсутствие/мусор/
 * вне границ → дефолт по полю. НИКОГДА не бросает. Экспортируется для тестов.
 */
function referralConfigFromData(numbers) {
    const n = numbers ?? {};
    const d = exports.REFERRAL_DEFAULTS;
    return {
        // rewardDays min=1: 0 дней = бессмысленная награда, которая всё равно сожгла бы
        // слот капа и пометила реферал 'rewarded' без эффекта. Минимум — 1 день.
        rewardDays: referralClampInt(n.referral_reward_days, 1, 3650, d.rewardDays),
        maxClaimsPerMonth: referralClampInt(n.referral_max_claims_month, 0, 100000, d.maxClaimsPerMonth),
        maxClaimsPerDay: referralClampInt(n.referral_max_claims_day, 0, 100000, d.maxClaimsPerDay),
    };
}
/**
 * Читает конфиг рефералов из remote_config/app.numbers. НИКОГДА не бросает:
 * при ошибке/отсутствии → дефолты (поведение как до фичи).
 */
async function resolveReferralConfig(db) {
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        return referralConfigFromData(data?.numbers);
    }
    catch (e) {
        console.warn('resolveReferralConfig failed, using defaults', e);
        return { ...exports.REFERRAL_DEFAULTS };
    }
}
/**
 * Мастер-флаг «Рулетка Plus + реферальная программа» (remote_config/app.numbers
 * .referral_roulette_enabled, boolean). Kill-switch семантика: дефолт ON —
 * выключена фича только при явном `false`. Ошибка чтения закрывает критичный путь
 * (fail-closed), а отсутствие самого ключа сохраняет обратную совместимость и даёт ON.
 * Управляется из админки
 * (adminSetReferralRouletteEnabled), клиент читает тот же ключ (remote_flags).
 */
async function resolveReferralRouletteEnabled(db) {
    const policy = await resolveReferralRoulettePolicy(db);
    return policy.softEnabled && !policy.emergencyStop;
}
/** Read errors fail closed as an emergency stop for every mutating path. */
async function resolveReferralRoulettePolicy(db) {
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        return (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(data);
    }
    catch (e) {
        console.warn('resolveReferralRoulettePolicy failed, fail closed', e);
        return { softEnabled: false, emergencyStop: true, softOffAtMs: 0 };
    }
}
/**
 * Чистая функция: сколько наград можно выдать прямо сейчас с учётом дневного И месячного капов.
 * Берёт минимум из остатков, не уходит в минус. Капы по умолчанию = дефолтные (обратная
 * совместимость и тесты); вызовы из callable передают значения из «Пульта». Экспортируется.
 */
function referralClaimSlotsLeft(usedThisMonth, usedToday, maxPerMonth = exports.MAX_REFERRER_CLAIMS_PER_MONTH, maxPerDay = exports.MAX_REFERRER_CLAIMS_PER_DAY) {
    const monthLeft = maxPerMonth - Math.max(0, Math.floor(usedThisMonth));
    const dayLeft = maxPerDay - Math.max(0, Math.floor(usedToday));
    return Math.max(0, Math.min(monthLeft, dayLeft));
}
/** Сколько qualified-друзей обрабатываем за один claim-вызов (защита от гигантских транзакций). */
const MAX_CLAIMS_PER_CALL = 20;
/**
 * Квалификация СРАЗУ при apply — только по live-маркеру (LESSON1_LIVE_PASS_KEYS).
 * Голому lesson1_pass_count при apply НЕ доверяем: его мог подсунуть progressMigrateSnapshot
 * (клиентский снапшот), что давало бы free-премиум без прохождения. Live-маркер пишет только
 * сервер при живом passed-событии урока 1 — ему доверять можно. Кейс «прошёл урок 1 ДО ввода
 * кода» теперь квалифицируется мгновенно, а не застревает в pending навсегда.
 */
/**
 * Антифрод: код принимаем только от «нового» пользователя — того, у кого, по сути,
 * раньше не было приложения. Точный device-level признак «было/не было приложение»
 * недоступен (App Store/Play запрещают аппам стабильные device-id: IDFV сбрасывается,
 * SSAID меняется при factory reset). Поэтому опираемся на stableId, который СПЕЦИАЛЬНО
 * переживает переустановку (iOS Keychain AFTER_FIRST_UNLOCK + iCloud Keychain; Android
 * AsyncStorage в Google Drive Auto Backup — см. app/stable_id.ts). Если у человека когда-то
 * было приложение, у него уже есть stableId и users/{id}.created_at — он отсекается.
 *
 * Окно = 72ч, синхронно с intro-доступом новичка (intro_full_access ~72ч): пока у друга
 * идёт бесплатное полное окно — он точно новенький. НЕ ставим «created_at отсутствует»:
 * created_at пишется при ПЕРВОМ облачном синке прогресса (cloud_sync.ts), т.е. РАНЬШЕ,
 * чем друг успеет ввести код (особенно iOS — ручной ввод позже) — иначе резали бы честных.
 * 0 = проверка выключена.
 */
const REFEREE_MAX_ACCOUNT_AGE_MS = 72 * 60 * 60 * 1000;
const REFERRAL_CODES = 'referral_codes';
const REFERRAL_OWNERS = 'referral_owners';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
/**
 * Ключи «урок 1 реально пройден» (pass_count >= 1), которые сервер пишет ТОЛЬКО при
 * passed (score >= 2.5) — см. functions/src/progress_events.ts:applyLessonFields.
 *  - EN/legacy:  lesson1_pass_count
 *  - FR (scoped): lesson_progress_v2::fr::lesson1_pass_count
 * НЕ используем unlocked_lessons: урок 2 открывается и без прохождения (premium/intro-триал
 * открывает весь уровень, сдача зачёта уровня, fallback-открытие) — это давало ложную
 * квалификацию (C2) и не видело fr-курс (C3).
 */
const LESSON1_PASS_KEYS = ['lesson1_pass_count', 'lesson_progress_v2::fr::lesson1_pass_count'];
/**
 * Live-маркер «урок 1 пройден ЖИВЫМ событием» (progressSubmitEvent → applyLessonFields).
 * Пишет ТОЛЬКО сервер при passed-событии урока 1; миграция снапшота его НЕ ставит,
 * клиентская запись заблокирована firestore.rules (server-authoritative список).
 * Поэтому маркеру можно доверять для мгновенной квалификации при apply: честный кейс
 * «прошёл урок 1 ДО ввода кода» больше не застревает в pending навсегда, а фрод через
 * progressMigrateSnapshot (подсунутый lesson1_pass_count) маркера не имеет.
 */
exports.LESSON1_LIVE_PASS_KEYS = ['lesson1_pass_live', 'lesson_progress_v2::fr::lesson1_pass_live'];
/** Чистая функция: урок 1 пройден живым серверным событием (не миграцией). */
function hasLiveFirstLessonPass(progress) {
    if (!progress)
        return false;
    return exports.LESSON1_LIVE_PASS_KEYS.some((key) => {
        const v = progress[key];
        return v != null && String(v) !== '' && String(v) !== '0' && String(v) !== 'false';
    });
}
/**
 * Чистая функция: пройден ли РЕАЛЬНО первый урок (любого курса). Экспортируется для тестов.
 * `progress` — это users/{id}.progress (map строк).
 */
function hasCompletedFirstLesson(progress) {
    if (!progress)
        return false;
    for (const key of LESSON1_PASS_KEYS) {
        const n = Number(progress[key]);
        if (Number.isFinite(n) && n >= 1)
            return true;
    }
    return false;
}
function parseMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.floor(value);
    if (typeof value === 'string' && value.trim()) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.floor(n) : 0;
    }
    if (value instanceof Date) {
        const n = value.getTime();
        return Number.isFinite(n) ? Math.floor(n) : 0;
    }
    if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
        const n = Number(value.toMillis());
        return Number.isFinite(n) ? Math.floor(n) : 0;
    }
    return 0;
}
function cleanReferralDisplayName(value) {
    const s = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!s)
        return '';
    if (/^(?:user|юзер|player|игрок|friend|друг)\s*#?\s*[a-z0-9_-]{3,}$/i.test(s))
        return '';
    return s;
}
function referralDisplayNameFromUserData(userData) {
    if (!userData || typeof userData !== 'object')
        return null;
    const progress = userData.progress && typeof userData.progress === 'object'
        ? userData.progress
        : {};
    return cleanReferralDisplayName(progress.user_name)
        || cleanReferralDisplayName(userData.displayName)
        || cleanReferralDisplayName(userData.name)
        || null;
}
/**
 * «Аккаунт слишком старый для реферального кода» (антифрод referralApply).
 *
 * Два независимых сигнала возраста, отсекаем по ЛЮБОМУ:
 *  - `docCreateTimeMs` — Firestore-метаданные createTime документа users/{stableId}.
 *    Ставится сервером при создании документа и НЕ переписывается клиентом никогда —
 *    главный, неподделываемый сигнал «когда этот stableId появился».
 *  - `created_at` — прикладное поле (пишет клиент при первом синке). Клиент может его
 *    переписать, но оно ловит случаи, когда в СВЕЖИЙ документ смержили старую личность
 *    (auth-merge переносит created_at) — createTime дока при этом свежий.
 *
 * Проверку «есть любая учебная активность» УБРАЛИ (2026-07-04): она не ловила
 * умышленного фарм-бота (он просто заводит чистый аккаунт), зато резала главный честный
 * сценарий — друг установил по ссылке, прошёл урок-другой и только потом ввёл код
 * (apply часто задерживается: auth_links создаётся асинхронно). Фактические защиты от
 * фарма — окно 72ч по неподделываемому createTime, live-маркер урока 1 для квалификации
 * (см. LESSON1_LIVE_PASS_KEYS) и дневной/месячный капы обналичивания.
 */
function isReferralAccountTooEstablishedForApply(userData, nowMs, maxAccountAgeMs = REFEREE_MAX_ACCOUNT_AGE_MS, docCreateTimeMs) {
    if (maxAccountAgeMs <= 0)
        return false;
    if (typeof docCreateTimeMs === 'number' &&
        Number.isFinite(docCreateTimeMs) &&
        docCreateTimeMs > 0 &&
        nowMs - docCreateTimeMs > maxAccountAgeMs) {
        return true;
    }
    if (!userData)
        return false;
    const createdAtMs = parseMs(userData.created_at);
    return createdAtMs > 0 && nowMs - createdAtMs > maxAccountAgeMs;
}
/**
 * Был ли это записью МИГРАЦИИ снапшота прогресса (progressMigrateSnapshot), а не живым
 * событием урока. Миграция доверяет клиентскому lesson1_pass_count (progress_events.ts:
 * buildMigrationPatch) и могла бы фиктивно «зачесть» урок 1 → выдать 7 дней без прохождения.
 * Реальное прохождение приходит через progressSubmitEvent и НЕ трогает progressMigratedAt.
 * Отличаем по появлению/изменению поля progressMigratedAt в корне users/{id}.
 * Экспортируется для тестов. `beforeRoot`/`afterRoot` — корневые данные документа.
 */
function isSnapshotMigrationWrite(beforeRoot, afterRoot) {
    const a = afterRoot?.progressMigratedAt;
    if (a == null)
        return false;
    const b = beforeRoot?.progressMigratedAt;
    // Сравниваем по строковому виду — serverTimestamp материализуется в Timestamp/число.
    return String(a) !== String(b ?? '');
}
/** Текущее VIP-окно referrer'а из users/{id}.progress (ms). Не активные/пустые → 0. */
function parseVipUntilMs(data) {
    const p = data?.progress;
    return vipUntilFromProgress(p);
}
/** Чистая функция: читает vip_until/vip_expiry из объекта progress (ms). Экспортируется для тестов. */
function vipUntilFromProgress(progress) {
    const raw = progress?.vip_until ?? progress?.vip_expiry;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return 0;
    return Math.floor(n);
}
/**
 * Чистая функция стакинга VIP-дней. Ключевое решение «копить на потом»:
 * стак считается от max(текущее_окно, now), поэтому уже накопленные дни НЕ сгорают,
 * а новые добавляются к концу окна. Экспортируется для тестов.
 */
function stackVipUntilMs(currentUntilMs, nowMs, addDays, dayMs = DAY_MS) {
    const base = Math.max(currentUntilMs > 0 ? currentUntilMs : 0, nowMs);
    return base + Math.max(0, Math.floor(addDays)) * dayMs;
}
function buildReferralVipProgressPatch(currentProgress, nowMs, addDays, source) {
    const currentUntil = vipUntilFromProgress(currentProgress);
    const vipUntil = stackVipUntilMs(currentUntil, nowMs, addDays);
    return {
        vip_active: 'true',
        vip_plan: 'referral',
        vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
        vip_until: String(vipUntil),
        vip_admin_override: 'true',
        vip_admin_grant_at: String(nowMs),
        referral_vip_last_source: source,
    };
}
function randomCode() {
    let s = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
        s += CHARSET[crypto.randomInt(0, CHARSET.length)];
    }
    return s;
}
function yyyymmNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function yyyymmddNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/**
 * Оставляет только N самых свежих периодов. Ключи дат (YYYY-MM-DD или YYYY-MM)
 * сортируются лексикографически = хронологически. Используется и для дневного
 * (keepDays=10), и для месячного (keepMonths=3) счётчика — иначе map растёт в
 * progress-документе бесконечно (M1).
 */
function prunePeriodCounter(map, keep) {
    const keys = Object.keys(map).sort().reverse().slice(0, keep);
    const out = {};
    for (const k of keys)
        out[k] = map[k];
    return out;
}
/** @deprecated имя оставлено для совместимости тестов — делегирует prunePeriodCounter. */
function pruneDailyCounter(map, keepDays = 10) {
    return prunePeriodCounter(map, keepDays);
}
/**
 * Referee купил Plus или Pro ⇒ помечаем его attribution как 'qualified'.
 *
 * Приглашённый НЕ получает бонусных дней — он уже оплатил доступ. Пригласивший
 * конвертирует qualified-приглашение в прокрут рулетки по кнопке (referralClaimSpin).
 */
async function markRefereeQualified(db, userId) {
    const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(userId);
    const attSnap = await attRef.get();
    if (!attSnap.exists)
        return;
    const att0 = attSnap.data();
    // Уже qualified/rewarded — ничего не делаем (идемпотентность).
    if (att0?.status && att0.status !== 'pending')
        return;
    const referrerId = String(att0.referrerStableId ?? '').trim();
    if (!referrerId)
        return;
    const uref = (uid) => db.collection(USERS).doc(uid);
    const configRef = db.collection('remote_config').doc('app');
    await db.runTransaction(async (tx) => {
        const [configSnap, attR, refeeSnap] = await Promise.all([
            tx.get(configRef),
            tx.get(attRef),
            tx.get(uref(userId)),
        ]);
        if (!attR.exists)
            return;
        const refereeProgressNow = refeeSnap.data()?.progress;
        if (!(0, premium_status_1.isStorePremiumActive)(refereeProgressNow, Date.now()))
            return;
        const row = attR.data();
        if (row?.status && row.status !== 'pending')
            return;
        const nowMs = Date.now();
        const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
        if (policy.emergencyStop) {
            console.warn(JSON.stringify({ event: 'referral_qualification_blocked', reason: 'emergency_stop', userId, atMs: nowMs }));
            return;
        }
        const createdAtMs = (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAtMs);
        const deadlineAtMs = (0, referral_roulette_policy_1.attributionDeadlineMs)(createdAtMs);
        if (!(0, referral_roulette_policy_1.canQualifyAt)(policy, createdAtMs, nowMs)) {
            tx.set(attRef, {
                status: 'expired',
                deadlineAtMs,
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                expiredAtMs: nowMs,
                expiryReason: 'qualification_deadline',
            }, { merge: true });
            console.log(JSON.stringify({
                event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.attributionExpired,
                attributionId: userId,
                createdAtMs,
                deadlineAtMs,
                atMs: nowMs,
            }));
            return;
        }
        // Помечаем attribution готовым к конвертации в прокрут рулетки referrer'ом.
        // Приглашённому НИЧЕГО не начисляем — он уже оплатил Plus/Pro.
        tx.set(attRef, {
            status: 'qualified',
            qualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            qualifiedAtMs: nowMs,
            qualifiedBy: 'premium_purchase',
            deadlineAtMs,
            rewardKind: 'referrer_spin',
        }, { merge: true });
        console.log(JSON.stringify({
            event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.attributionQualified,
            attributionId: userId,
            createdAtMs,
            deadlineAtMs,
            atMs: nowMs,
            softEnabled: policy.softEnabled,
        }));
    });
}
async function assertAuthStableLink(db, authUid, clientStableId) {
    const linkRef = db.collection(AUTH_LINKS).doc(authUid);
    const linkSnap = await linkRef.get();
    if (!linkSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'LINK_ACCOUNT_REQUIRED');
    }
    const stableId = String(linkSnap.data()?.stable_id ?? '').trim();
    if (!stableId || stableId !== clientStableId) {
        throw new https_1.HttpsError('permission-denied', 'STABLE_ID_MISMATCH');
    }
}
/**
 * App Check: клиент инициализирует в app/app_check_init.ts.
 * После проверки токенов в Firebase Console → true (иначе callables вернут 401).
 */
// App Check env-gated (ENFORCE_APP_CHECK=true) — как в callable_options/account_delete.
// По умолчанию off, чтобы не ломать клиентов без App Check-токена; включается на проде через env.
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
/** Возвращает/создаёт публичный рефкод, привязанный к users/{stableId} через auth_links. */
exports.referralEnsureMyCode = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const stableId = String(request.data?.stableId ?? '').trim();
    if (!stableId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId required');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, stableId);
    const ownerRef = db.collection(REFERRAL_OWNERS).doc(stableId);
    const configRef = db.collection('remote_config').doc('app');
    const existing = await ownerRef.get();
    if (existing.exists && existing.data()?.code) {
        return { code: String(existing.data().code) };
    }
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
        const code = randomCode();
        const codeRef = db.collection(REFERRAL_CODES).doc(code);
        // eslint-disable-next-line no-await-in-loop
        const created = await db.runTransaction(async (tx) => {
            const [oSnap, configSnap] = await Promise.all([tx.get(ownerRef), tx.get(configRef)]);
            if (oSnap.exists && oSnap.data()?.code) {
                return { code: String(oSnap.data().code), created: false };
            }
            const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
            if (policy.emergencyStop) {
                throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
            }
            if (!(0, referral_roulette_policy_1.canCreateNewReferral)(policy)) {
                throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_OFF');
            }
            const cSnap = await tx.get(codeRef);
            if (cSnap.exists) {
                return null;
            }
            const now = admin.firestore.FieldValue.serverTimestamp();
            tx.set(codeRef, { ownerStableId: stableId, createdAt: now, normalized: code });
            tx.set(ownerRef, { code, ownerStableId: stableId, createdAt: now }, { merge: true });
            return { code, created: true };
        });
        if (created && 'code' in created) {
            return { code: created.code };
        }
    }
    throw new https_1.HttpsError('resource-exhausted', 'CODE_GENERATION_FAILED');
});
/**
 * Первичная фиксация: приглашённый (referee) вводит код до/после sign-in. Идемпотентно.
 * Антифрод: код принимаем только от нового пользователя (у кого, по сути, не было
 * приложения) — аккаунт старше REFEREE_MAX_ACCOUNT_AGE_MS (72ч, по users.created_at,
 * stableId переживает переустановку) не принимаем.
 */
exports.referralApply = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const refereeStableId = String(request.data?.refereeStableId ?? '').trim();
    const refCode = String(request.data?.refCode ?? '')
        .trim()
        .toUpperCase();
    if (!refereeStableId || !refCode) {
        throw new https_1.HttpsError('invalid-argument', 'refereeStableId and refCode required');
    }
    if (refCode.length < 4) {
        throw new https_1.HttpsError('invalid-argument', 'REF_CODE_INVALID');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, refereeStableId);
    const codeRef = db.collection(REFERRAL_CODES).doc(refCode);
    const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(refereeStableId);
    const userRef = db.collection(USERS).doc(refereeStableId);
    const configRef = db.collection('remote_config').doc('app');
    const result = await db.runTransaction(async (tx) => {
        const [att0, configSnap] = await Promise.all([tx.get(attRef), tx.get(configRef)]);
        if (att0.exists) {
            const d = att0.data();
            return {
                ok: true,
                already: true,
                refCode: d?.refCode ?? refCode,
                referrerStableId: d?.referrerStableId,
                status: d?.status,
                hasStorePremium: false,
            };
        }
        const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
        if (policy.emergencyStop) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
        }
        if (!(0, referral_roulette_policy_1.canCreateNewReferral)(policy)) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_OFF');
        }
        const userSnap = await tx.get(userRef);
        if (REFEREE_MAX_ACCOUNT_AGE_MS > 0) {
            // createTime — метаданные Firestore (сервер), клиент подделать не может.
            const docCreateTimeMs = userSnap.exists && userSnap.createTime
                ? userSnap.createTime.toMillis()
                : undefined;
            if (userSnap.exists && isReferralAccountTooEstablishedForApply(userSnap.data(), Date.now(), REFEREE_MAX_ACCOUNT_AGE_MS, docCreateTimeMs)) {
                throw new https_1.HttpsError('failed-precondition', 'REFERRAL_REFEREE_ACCOUNT_TOO_OLD');
            }
        }
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
            throw new https_1.HttpsError('not-found', 'REF_CODE_UNKNOWN');
        }
        const ownerStableId = String(codeSnap.data()?.ownerStableId ?? '').trim();
        if (!ownerStableId) {
            throw new https_1.HttpsError('failed-precondition', 'REF_CODE_BROKEN');
        }
        if (ownerStableId === refereeStableId) {
            throw new https_1.HttpsError('invalid-argument', 'SELF_REFERRAL');
        }
        const nowMs = Date.now();
        const now = admin.firestore.FieldValue.serverTimestamp();
        tx.set(attRef, {
            referrerStableId: ownerStableId,
            refCode,
            status: 'pending',
            createdAt: now,
            createdAtMs: nowMs,
            deadlineAtMs: (0, referral_roulette_policy_1.attributionDeadlineMs)(nowMs),
            updatedAt: now,
        });
        console.log(JSON.stringify({
            event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.attributionCreated,
            attributionId: refereeStableId,
            referrerStableId: ownerStableId,
            createdAtMs: nowMs,
            deadlineAtMs: (0, referral_roulette_policy_1.attributionDeadlineMs)(nowMs),
        }));
        const refereeProgress = userSnap.data()?.progress;
        return {
            ok: true,
            already: false,
            referrerStableId: ownerStableId,
            refCode,
            hasStorePremium: (0, premium_status_1.isStorePremiumActive)(refereeProgress, Date.now()),
        };
    });
    // Мгновенная квалификация, если приглашённый УЖЕ купил Plus/Pro до ввода кода
    // (вебхук успел записать store-план раньше apply). markRefereeQualified сам
    // перепроверяет всё в транзакции (идемпотентно).
    if (result?.ok && !result.already && result.hasStorePremium) {
        await markRefereeQualified(db, refereeStableId).catch((e) => {
            console.warn('[referral] qualify after apply failed', e);
        });
    }
    const { hasStorePremium: _hasStorePremium, ...response } = result;
    return response;
});
/**
 * Когда referee покупает Plus или Pro (вебхук RevenueCat/Telegram пишет store-план в
 * progress.premium_plan) — помечаем attribution referee как 'qualified'. referrer'у
 * НИЧЕГО не пишем (pull): он конвертирует приглашение в прокрут (referralClaimSpin).
 * Отсекаем запись миграции снапшота (isSnapshotMigrationWrite). onDocumentWritten: и create, и update.
 */
exports.referralOnUserProgressUpdated = functions.firestore.onDocumentWritten({ document: `${USERS}/{userId}`, region: REGION }, async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after.data();
    if (!after)
        return;
    const beforeExists = event.data?.before?.exists;
    const before = beforeExists ? event.data?.before.data() : undefined;
    // Анти-обход: миграция снапшота (progressMigrateSnapshot) доверяет клиентским
    // полям прогресса. store-план она подделать не может (firestore.rules: клиенту
    // premium_* запрещены), но гард оставляем как дешёвую защиту от гонок миграции.
    if (isSnapshotMigrationWrite(before, after))
        return;
    const pA = after?.progress;
    const pB = before?.progress;
    // Дёшево выходим: реагируем только на переход «не было store-премиума → есть».
    // store-план пишет только сервер (RevenueCat/Telegram webhook) — firestore.rules
    // запрещает клиенту premium_* (progressHasNoPremiumWrites), подделать нельзя.
    if (!(0, premium_status_1.isStorePremiumActive)(pA, Date.now()))
        return;
    if ((0, premium_status_1.isStorePremiumActive)(pB, Date.now()))
        return;
    const db = admin.firestore();
    await markRefereeQualified(db, userId);
});
const LIST_MY_INVITES_SERVER_CACHE_TTL_MS = 60000;
const listMyInvitesServerCache = new Map();
function cacheListMyInvites(referrerStableId, data) {
    const now = Date.now();
    listMyInvitesServerCache.set(referrerStableId, {
        expiresAtMs: now + LIST_MY_INVITES_SERVER_CACHE_TTL_MS,
        data,
    });
    if (listMyInvitesServerCache.size > 1000) {
        for (const [key, entry] of listMyInvitesServerCache) {
            if (entry.expiresAtMs <= now || listMyInvitesServerCache.size > 900) {
                listMyInvitesServerCache.delete(key);
            }
        }
    }
}
/**
 * Список приглашений этого referrer'а для экрана друзей (бейджи + кнопка «Получить»).
 * Читаем attributions на сервере (rules держим закрытыми: isAdmin only), отдаём только
 * безопасные поля. Один read на открытие /friends; клиент кеширует через SWR.
 */
exports.referralListMyInvites = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
    if (!referrerStableId) {
        throw new https_1.HttpsError('invalid-argument', 'referrerStableId required');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, referrerStableId);
    const cacheKey = referrerStableId;
    const force = request.data?.force === true;
    const cached = force ? undefined : listMyInvitesServerCache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now())
        return cached.data;
    const userRef = db.collection(USERS).doc(referrerStableId);
    const ledgerCollection = userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER);
    const [snap, configSnap, userSnap, ledgerSnap, migrationMarkerSnap, anyLedgerSnap] = await Promise.all([
        db.collection(REFERRAL_ATTRIBUTIONS)
            .where('referrerStableId', '==', referrerStableId)
            .limit(200)
            .get(),
        db.collection('remote_config').doc('app').get(),
        userRef.get(),
        ledgerCollection.where('status', '==', 'available').get(),
        ledgerCollection.doc(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID).get(),
        ledgerCollection.limit(1).get(),
    ]);
    const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
    const serverNowMs = Date.now();
    const profileSnaps = snap.docs.length
        ? await db.getAll(...snap.docs.map((d) => db.collection(USERS).doc(d.id)))
        : [];
    const nameByStableId = new Map();
    for (const userSnap of profileSnaps) {
        const name = referralDisplayNameFromUserData(userSnap.data());
        if (name)
            nameByStableId.set(userSnap.id, name);
    }
    const invites = snap.docs.map((d) => {
        const row = d.data();
        const createdAtMs = (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAtMs);
        const qualifiedAtMs = (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAtMs);
        const deadlineAtMs = (0, referral_roulette_policy_1.policyTimestampMs)(row.deadlineAtMs) || (0, referral_roulette_policy_1.attributionDeadlineMs)(createdAtMs);
        const storedStatus = row.status ?? 'pending';
        const status = storedStatus === 'pending' && !(0, referral_roulette_policy_1.canQualifyAt)(policy, createdAtMs, serverNowMs)
            ? 'expired'
            : storedStatus;
        const refereeName = nameByStableId.get(d.id);
        return {
            refereeStableId: d.id,
            status,
            ...(refereeName ? { refereeName } : {}),
            createdAtMs,
            deadlineAtMs,
            ...(qualifiedAtMs > 0 ? { qualifiedAtMs } : {}),
        };
    });
    const eligibleQualifiedCount = snap.docs.filter((doc) => {
        const row = doc.data();
        if (row.status !== 'qualified' && row.status !== 'skipped_referrer_cap')
            return false;
        return (0, referral_roulette_policy_1.existingQualifiedDrainEligible)({
            createdAtMs: (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAtMs),
            qualifiedAtMs: (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAtMs),
        }, policy);
    }).length;
    const activePending = invites.filter((invite) => invite.status === 'pending');
    const ledgerRows = ledgerSnap.docs
        .map((doc) => (0, referral_spin_ledger_1.ledgerRowFromData)(doc.id, doc.data()))
        .filter((row) => row !== null);
    const ledgerSummary = (0, referral_spin_ledger_1.reconcileLedgerRows)(ledgerRows, serverNowMs, policy);
    const progress = userSnap.data()?.progress ?? {};
    const aggregateCredits = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
    const legacyAvailable = (0, referral_spin_ledger_1.shouldMigrateLegacyAggregate)({
        migrationMarkerExists: migrationMarkerSnap.exists,
        anyLedgerDocumentExists: !anyLedgerSnap.empty,
    })
        && (0, referral_roulette_policy_1.legacyCreditExpiryMs)() >= serverNowMs
        && !policy.emergencyStop
        ? aggregateCredits
        : 0;
    const legacyExpiry = legacyAvailable > 0 ? (0, referral_roulette_policy_1.legacyCreditExpiryMs)() : 0;
    const availableCreditCount = policy.emergencyStop
        ? 0
        : ledgerSummary.availableCount + legacyAvailable;
    const earliestCreditExpiryMs = [ledgerSummary.earliestExpiryMs, legacyExpiry]
        .filter((value) => value > 0)
        .reduce((earliest, value) => earliest === 0 ? value : Math.min(earliest, value), 0);
    const qualifiedCount = invites.filter((i) => i.status === 'qualified').length;
    const cfg = referralConfigFromData(configSnap.data()?.numbers);
    const result = {
        ok: true,
        invites,
        qualifiedCount,
        claimableVipDays: qualifiedCount * cfg.rewardDays,
        drain: {
            softEnabled: policy.softEnabled,
            emergencyStop: policy.emergencyStop,
            serverNowMs,
            activePendingCount: policy.emergencyStop ? 0 : activePending.length,
            claimableQualifiedCount: policy.emergencyStop ? 0 : eligibleQualifiedCount,
            availableCreditCount,
            latestPendingDeadlineMs: activePending.reduce((latest, invite) => Math.max(latest, invite.deadlineAtMs), 0),
            earliestCreditExpiryMs,
        },
    };
    cacheListMyInvites(cacheKey, result);
    return result;
});
/**
 * Pull-обналичивание: referrer жмёт «Получить 7 дней». Начисляем +7 дней VIP за каждого
 * qualified-друга (стак vip_until), помечаем attribution 'rewarded'. Идемпотентно: повторный
 * вызов без новых qualified вернёт granted=0. Месячный кап от абьюза.
 *
 * VIP пишем теми же полями, что admin-grant (vip_* в users/{id}.progress) — механику не трогаем.
 */
exports.referralClaimVipReward = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
    if (!referrerStableId) {
        throw new https_1.HttpsError('invalid-argument', 'referrerStableId required');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, referrerStableId);
    listMyInvitesServerCache.delete(referrerStableId);
    // This callable belongs to the pre-roulette VIP contract. Keep it for old
    // clients while admissions are open, but never let it consume a qualified
    // attribution after the soft sunset (the ledger claim owns that drain) or
    // while the emergency stop is active.
    const entryPolicy = await resolveReferralRoulettePolicy(db);
    if (entryPolicy.emergencyStop) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }
    if (!entryPolicy.softEnabled) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_SUNSET');
    }
    // Тюнинг из «Пульта» (дней награды + капы). Читаем ДО транзакции (отд. документ).
    const cfg = await resolveReferralConfig(db);
    // Какие приглашения этого referrer'а готовы к обналичиванию (ещё не rewarded).
    // Включаем и legacy 'skipped_referrer_cap' — раньше эти строки застревали навсегда (M1);
    // теперь они тоже claimable (восстановление ранее потерянных наград).
    const qualifiedSnap = await db
        .collection(REFERRAL_ATTRIBUTIONS)
        .where('referrerStableId', '==', referrerStableId)
        .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
        .limit(MAX_CLAIMS_PER_CALL)
        .get();
    if (qualifiedSnap.empty) {
        // Возвращаем текущее окно, чтобы клиент мог синхронизировать состояние без начисления.
        const u = await db.collection(USERS).doc(referrerStableId).get();
        return {
            ok: true,
            granted: 0,
            claimed: [],
            vipUntilMs: parseVipUntilMs(u.data()),
            cappedThisMonth: false,
            cappedToday: false,
        };
    }
    const ym = yyyymmNow();
    const ymd = yyyymmddNow();
    const userRef = db.collection(USERS).doc(referrerStableId);
    const configRef = db.collection('remote_config').doc('app');
    return db.runTransaction(async (tx) => {
        // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
        const attRefs = qualifiedSnap.docs.map((d) => db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id));
        const [userSnap, configSnap, ...attSnaps] = await Promise.all([
            tx.get(userRef),
            tx.get(configRef),
            ...attRefs.map((r) => tx.get(r)),
        ]);
        const transactionPolicy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
        if (transactionPolicy.emergencyStop) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
        }
        if (!transactionPolicy.softEnabled) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_SUNSET');
        }
        const userData = userSnap.data() ?? {};
        const progressData = userData.progress;
        const monthly = progressData?.referral_vip_claims_monthly ?? {};
        const daily = progressData?.referral_vip_claims_daily ?? {};
        let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
        let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        let vipUntil = Math.max(parseVipUntilMs(userData), nowMs);
        const claimed = [];
        let cappedThisMonth = false;
        let cappedToday = false;
        for (let i = 0; i < attSnaps.length; i += 1) {
            const snap = attSnaps[i];
            if (!snap.exists)
                continue;
            const row = snap.data();
            // Принимаем qualified и legacy skipped_referrer_cap; 'rewarded'/прочее — пропуск (гонка).
            if (row?.status !== 'qualified' && row?.status !== 'skipped_referrer_cap')
                continue;
            if (referralClaimSlotsLeft(usedThisMonth, usedToday, cfg.maxClaimsPerMonth, cfg.maxClaimsPerDay) <= 0) {
                // Достигнут кап (день или месяц). НЕ понижаем статус — оставляем 'qualified',
                // эти 7 дней не теряются: дожмёт «Открыть» позже (на след. день / след. месяц).
                // Раньше ставили 'skipped_referrer_cap' и они терялись НАВСЕГДА (M1).
                if (usedThisMonth >= cfg.maxClaimsPerMonth)
                    cappedThisMonth = true;
                else
                    cappedToday = true; // дневной throttle (анти-фарм свежими аккаунтами)
                tx.set(attRefs[i], { lastCappedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                break; // остаток qualified-друзей сейчас тоже за капом — выходим.
            }
            // Стак: +N дней от текущего конца окна (или от now, если окна не было).
            vipUntil = stackVipUntilMs(vipUntil, nowMs, cfg.rewardDays);
            usedThisMonth += 1;
            usedToday += 1;
            claimed.push({ refereeStableId: snap.id, daysGranted: cfg.rewardDays });
            tx.set(attRefs[i], {
                status: 'rewarded',
                rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
                referrerVipDays: cfg.rewardDays,
                rewardKind: 'vip_days_both',
            }, { merge: true });
        }
        if (claimed.length > 0) {
            // Пишем VIP теми же полями, что admin-grant — премиум-механику не меняем.
            // vip_admin_grant_at — маркер для клиентской анимации (vip_celebration_state).
            const referrerVipPatch = buildReferralVipProgressPatch(userData.progress, nowMs, claimed.length * cfg.rewardDays, 'referrer');
            tx.set(userRef, {
                progress: {
                    ...referrerVipPatch,
                    // Месячный счётчик: чистим старые месяцы (храним ~3 последних), иначе
                    // map рос бесконечно в progress-документе (M1, аудит 2026-06-21).
                    referral_vip_claims_monthly: prunePeriodCounter({ ...monthly, [ym]: usedThisMonth }, 3),
                    // Дневной счётчик: чистим старые дни, чтобы map не рос бесконечно (храним ~10 последних).
                    referral_vip_claims_daily: prunePeriodCounter({ ...daily, [ymd]: usedToday }, 10),
                },
                updatedAt: nowMs,
            }, { merge: true });
            const rewardRef = userRef.collection('shard_rewards').doc();
            tx.set(rewardRef, {
                ts: nowIso,
                reason: 'referral_referrer_vip',
                rewardType: 'vip_days',
                amount: 0,
                days: claimed.length * cfg.rewardDays,
                friends: claimed.length,
                label: `💎 +${claimed.length * cfg.rewardDays} дней VIP`,
                seen: false,
            });
        }
        return {
            ok: true,
            granted: claimed.length * cfg.rewardDays,
            claimed,
            vipUntilMs: vipUntil,
            cappedThisMonth,
            cappedToday,
        };
    });
});
//# sourceMappingURL=referral.js.map