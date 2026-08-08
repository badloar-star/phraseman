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
exports.adminReferralHealth = exports.adminSetReferralRouletteEmergencyStop = exports.adminSetReferralRouletteEnabled = exports.adminSetSpinWeights = exports.adminSpinLogs = exports.adminSpinStats = exports.adminListReferrals = void 0;
/**
 * Admin-callables для раздела «Рефералы» админки: список приглашений, статистика
 * и лог рулетки, запись весов в «Пульт», health-проверки работоспособности.
 *
 * Гейт: custom claim `admin` в auth token.
 * TODO(verify): в extract нет существующего admin-gate — сверить имя claim'а и
 * механизм выдачи с реальным проектом (возможно, там свой assertAdmin / allowlist
 * email'ов). Точка одна — функция assertAdmin ниже.
 *
 * Все функции read-mostly; adminSetSpinWeights — единственная пишущая (валидация
 * суммы 100 через validateSpinWeights из referral_spin_logic.ts — та же, что в тестах).
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const referral_spin_logic_1 = require("./referral_spin_logic");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const referral_admin_drain_metrics_1 = require("./referral_admin_drain_metrics");
const referral_admin_soft_toggle_1 = require("./referral_admin_soft_toggle");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const SPINS_SUBCOLLECTION = 'referral_spins';
const MAX_PAGE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_QUALIFIED_DAYS = 30;
/** Health-выборки ограничены сверху — дешёвые проверки, а не полный скан. */
const HEALTH_SAMPLE_USERS = 500;
/** TODO(verify): сверить с реальным admin-гейтом проекта. */
function assertAdmin(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    if (request.auth.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'ADMIN_REQUIRED');
    }
}
function adminRoleFromToken(token) {
    const role = token?.adminRole;
    return (0, roles_1.hasAdminRole)(role) ? role : null;
}
function clampLimit(raw, fallback) {
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n <= 0)
        return fallback;
    return Math.min(MAX_PAGE, n);
}
function tsToMs(v) {
    if (v && typeof v.toMillis === 'function') {
        return v.toMillis();
    }
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : 0;
}
async function countOf(query) {
    const snap = await query.count().get();
    return Number(snap.data().count ?? 0);
}
// ── a) Список приглашений ─────────────────────────────────────────────────────
exports.adminListReferrals = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const status = String(request.data?.status ?? '').trim();
    const limit = clampLimit(request.data?.limit, 50);
    const cursorMs = tsToMs(request.data?.cursor);
    const db = admin.firestore();
    let query = db.collection(REFERRAL_ATTRIBUTIONS).orderBy('createdAt', 'desc');
    if (status === 'pending' || status === 'qualified' || status === 'rewarded' || status === 'skipped_referrer_cap') {
        query = db
            .collection(REFERRAL_ATTRIBUTIONS)
            .where('status', '==', status)
            .orderBy('createdAt', 'desc');
    }
    if (cursorMs > 0) {
        query = query.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }
    const snap = await query.limit(limit).get();
    // Имена referrer/referee одной пачкой (как в referralListMyInvites).
    const uids = new Set();
    for (const d of snap.docs) {
        const row = d.data();
        uids.add(d.id);
        if (row.referrerStableId)
            uids.add(String(row.referrerStableId));
    }
    const uidList = [...uids].slice(0, 200);
    const userSnaps = uidList.length ? await db.getAll(...uidList.map((id) => db.collection(USERS).doc(id))) : [];
    const nameByUid = new Map();
    for (const u of userSnaps) {
        const data = u.data();
        const name = String(data?.displayName ?? data?.name ?? '').trim();
        if (name)
            nameByUid.set(u.id, name);
    }
    const rows = snap.docs.map((d) => {
        const row = d.data();
        return {
            refereeStableId: d.id,
            refereeName: nameByUid.get(d.id) ?? null,
            referrerStableId: String(row.referrerStableId ?? ''),
            referrerName: row.referrerStableId ? (nameByUid.get(String(row.referrerStableId)) ?? null) : null,
            status: String(row.status ?? 'pending'),
            refCode: String(row.refCode ?? ''),
            rewardKind: String(row.rewardKind ?? ''),
            createdAtMs: tsToMs(row.createdAt),
            qualifiedAtMs: tsToMs(row.qualifiedAt),
        };
    });
    const counts = {
        total: await countOf(db.collection(REFERRAL_ATTRIBUTIONS)),
        pending: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'pending')),
        qualified: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified')),
        rewarded: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'rewarded')),
    };
    return {
        ok: true,
        rows,
        counts,
        nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null,
    };
});
// ── b) Статистика рулетки ─────────────────────────────────────────────────────
exports.adminSpinStats = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const db = admin.firestore();
    const spinsCol = db.collectionGroup(SPINS_SUBCOLLECTION);
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [total, today, week] = await Promise.all([
        countOf(spinsCol),
        countOf(spinsCol.where('createdAtMs', '>=', dayStart.getTime())),
        countOf(spinsCol.where('createdAtMs', '>=', now - 7 * DAY_MS)),
    ]);
    // Распределение призов: 6 count-запросов (по одному на prizeDays).
    const byPrize = {};
    for (const days of referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS) {
        // eslint-disable-next-line no-await-in-loop
        byPrize[String(days)] = await countOf(spinsCol.where('prizeDays', '==', days));
    }
    const daysGranted = referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS.reduce((s, d) => s + d * (byPrize[String(d)] ?? 0), 0);
    // Кредиты на руках: точная сумма по map-полю progress.* агрегацией не считается —
    // выборка HEALTH_SAMPLE_USERS юзеров с кредитами (помечаем sampled: true).
    const creditsSnap = await db
        .collection(USERS)
        .where('progress.referral_spin_credits', '>', 0)
        .limit(HEALTH_SAMPLE_USERS)
        .get();
    let creditsOnHandSampled = 0;
    for (const u of creditsSnap.docs) {
        const p = u.data().progress ?? {};
        creditsOnHandSampled += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
    }
    const weights = await (async () => {
        try {
            const snap = await db.collection('remote_config').doc('app').get();
            const data = snap.data();
            return (0, referral_spin_logic_1.referralSpinWeightsFromData)(data?.numbers);
        }
        catch {
            return (0, referral_spin_logic_1.referralSpinWeightsFromData)(undefined);
        }
    })();
    return {
        ok: true,
        spins: { total, today, week },
        daysGranted,
        creditsOnHand: creditsOnHandSampled,
        creditsSampled: creditsSnap.size >= HEALTH_SAMPLE_USERS,
        byPrize,
        weights,
        expectedShares: Object.fromEntries(referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS.map((d, i) => [String(d), (weights[i] ?? 0) / 100])),
    };
});
// ── b) Лог спинов ─────────────────────────────────────────────────────────────
exports.adminSpinLogs = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const limit = clampLimit(request.data?.limit, 50);
    const cursorMs = tsToMs(request.data?.cursor);
    const db = admin.firestore();
    let query = db.collectionGroup(SPINS_SUBCOLLECTION).orderBy('createdAtMs', 'desc');
    if (cursorMs > 0)
        query = query.startAfter(cursorMs);
    const snap = await query.limit(limit).get();
    const rows = snap.docs.map((d) => {
        // path: users/{uid}/referral_spins/{spinRequestId}
        const uid = d.ref.path.split('/')[1] ?? '';
        const row = d.data();
        return {
            uid,
            spinRequestId: d.id,
            prizeIndex: Math.max(0, Math.floor(Number(row.prizeIndex ?? 0))),
            prizeDays: Math.max(0, Math.floor(Number(row.prizeDays ?? 0))),
            reroll: row.reroll === true,
            pity: row.pity === true,
            createdAtMs: tsToMs(row.createdAtMs),
        };
    });
    return { ok: true, rows, nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null };
});
// ── b) Запись весов в «Пульт» ─────────────────────────────────────────────────
exports.adminSetSpinWeights = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const v = (0, referral_spin_logic_1.validateSpinWeights)(request.data?.weights);
    if (!v.ok) {
        throw new https_1.HttpsError('invalid-argument', v.error);
    }
    const db = admin.firestore();
    await db.collection('remote_config').doc('app').set({ numbers: { referral_spin_weights: v.weights } }, { merge: true });
    console.log(JSON.stringify({ event: 'admin_set_spin_weights', weights: v.weights, by: request.auth?.uid }));
    return { ok: true, weights: v.weights };
});
// ── b2) Мастер-флаг «Рулетка Plus + реферальная программа» ────────────────────
/**
 * Вкл/выкл всей связки рулетка+рефералка из админки БЕЗ релиза.
 * Пишет remote_config/app.numbers.referral_roulette_enabled (boolean) — тот же ключ,
 * что читают referralSpin/referralClaimSpin (resolveReferralRouletteEnabled) и клиент
 * (remote_flags → isReferralRouletteEnabled). Дефолт при отсутствии ключа = ON.
 */
exports.adminSetReferralRouletteEnabled = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const role = adminRoleFromToken(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
    }
    const enabled = request.data?.enabled;
    if (typeof enabled !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'enabled (boolean) required');
    }
    const reason = String(request.data?.reason ?? '').trim().slice(0, 500);
    const requestId = String(request.data?.requestId ?? '').trim().slice(0, 160);
    const idempotencyKey = String(request.data?.idempotencyKey ?? '').trim().slice(0, 120);
    if (!reason || !requestId || !idempotencyKey) {
        throw new https_1.HttpsError('invalid-argument', 'reason, requestId and idempotencyKey required');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc('app');
    const operationRef = db.collection('admin_command_operations').doc(`referral_roulette_${idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ enabled });
    const actorUid = request.auth.uid;
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== fingerprint || previous.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return (0, referral_admin_soft_toggle_1.referralSoftToggleReplayResult)(previous);
        }
        const config = (configSnap.data() ?? {});
        const beforeEnabled = config.numbers?.referral_roulette_enabled !== false;
        const beforeSoftOffAtMs = tsToMs(config.numbers?.referral_roulette_soft_off_at_ms);
        const nowMs = Date.now();
        const softOffAtMs = (0, referral_admin_soft_toggle_1.resolveReferralSoftOffAtMs)({
            enabled,
            beforeEnabled,
            beforeSoftOffAtMs,
            nowMs,
        });
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral_roulette.enabled.set',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: 'app' },
            reason,
            before: { enabled: beforeEnabled, softOffAtMs: beforeSoftOffAtMs },
            after: { enabled, softOffAtMs },
            requestId,
            timestamp: new Date().toISOString(),
        });
        tx.set(configRef, {
            numbers: {
                referral_roulette_enabled: enabled,
                referral_roulette_soft_off_at_ms: softOffAtMs,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: actorUid,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral_roulette.enabled.set',
            actorUid,
            requestFingerprint: fingerprint,
            enabled,
            softOffAtMs,
            auditId: auditRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, enabled, softOffAtMs, auditId: auditRef.id, replayed: false };
    });
});
/** True kill switch: blocks qualification, credit award, claim, and spin for everyone. */
exports.adminSetReferralRouletteEmergencyStop = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const role = adminRoleFromToken(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
    }
    const emergencyStop = request.data?.emergencyStop;
    if (typeof emergencyStop !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'emergencyStop (boolean) required');
    }
    const reason = String(request.data?.reason ?? '').trim().slice(0, 500);
    const requestId = String(request.data?.requestId ?? '').trim().slice(0, 160);
    const idempotencyKey = String(request.data?.idempotencyKey ?? '').trim().slice(0, 120);
    if (!reason || !requestId || !idempotencyKey) {
        throw new https_1.HttpsError('invalid-argument', 'reason, requestId and idempotencyKey required');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc('app');
    const operationRef = db.collection('admin_command_operations').doc(`referral_roulette_emergency_${idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ emergencyStop });
    const actorUid = request.auth.uid;
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== fingerprint || previous.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return {
                ok: true,
                emergencyStop: previous.emergencyStop === true,
                auditId: String(previous.auditId ?? ''),
                replayed: true,
            };
        }
        const config = (configSnap.data() ?? {});
        const beforeEmergencyStop = config.numbers?.referral_roulette_emergency_stop === true;
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral_roulette.emergency_stop.set',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: 'app' },
            reason,
            before: { emergencyStop: beforeEmergencyStop },
            after: { emergencyStop },
            requestId,
            timestamp: new Date().toISOString(),
        });
        tx.set(configRef, {
            numbers: { referral_roulette_emergency_stop: emergencyStop },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: actorUid,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral_roulette.emergency_stop.set',
            actorUid,
            requestFingerprint: fingerprint,
            emergencyStop,
            auditId: auditRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, emergencyStop, auditId: auditRef.id, replayed: false };
    });
});
exports.adminReferralHealth = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const db = admin.firestore();
    const checks = [];
    // 1. Функции задеплоены: сам факт ответа этого callable + соседние считаем по
    // доступности данных. Точная проверка деплоя — внешняя (CI/консоль), TODO.
    checks.push({
        id: 'functions_deployed',
        status: 'ok',
        detail: 'adminReferralHealth отвечает; referralSpin/referralClaimSpin/feed_fanout деплоятся тем же пакетом (проверка CI — TODO)',
    });
    // 2. Весы валидны (мягкий парсер → если дефолт вместо конфига, значит мусор/отсутствует).
    let weightsValid = true;
    // Мастер-флаг: отсутствие ключа = ON, ошибка чтения = fail-closed.
    let rouletteEnabled = false;
    let emergencyStop = true;
    let softOffAtMs = 0;
    let roulettePolicy = {
        softEnabled: false,
        emergencyStop: true,
        softOffAtMs: 0,
    };
    let rouletteFlagReadable = false;
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        weightsValid = (0, referral_spin_logic_1.validateSpinWeights)(data?.numbers?.referral_spin_weights).ok;
        roulettePolicy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(data);
        rouletteEnabled = roulettePolicy.softEnabled;
        emergencyStop = roulettePolicy.emergencyStop;
        softOffAtMs = roulettePolicy.softOffAtMs;
        rouletteFlagReadable = true;
    }
    catch {
        weightsValid = false;
    }
    checks.push({
        id: 'roulette_feature_flag',
        status: !rouletteFlagReadable ? 'fail' : rouletteEnabled ? 'ok' : 'warn',
        detail: !rouletteFlagReadable
            ? 'Не удалось прочитать referral_roulette_enabled — серверные spin/claim закрыты fail-closed'
            : rouletteEnabled
                ? 'referral_roulette_enabled: ON — рулетка и рефералка работают'
                : 'referral_roulette_enabled: OFF — новые приглашения и dev-выдача закрыты; grandfathered claim/spin работают до своих дедлайнов',
    });
    checks.push({
        id: 'roulette_emergency_stop',
        status: emergencyStop ? 'fail' : 'ok',
        detail: emergencyStop
            ? 'Аварийная остановка активна: qualification, award, claim и spin заблокированы для всех'
            : 'Аварийная остановка выключена',
    });
    checks.push({
        id: 'weights_valid',
        status: weightsValid ? 'ok' : 'warn',
        detail: weightsValid
            ? 'remote_config/app.numbers.referral_spin_weights: 6 призов, сумма 100'
            : 'Весы отсутствуют/битые — runtime работает на дефолтах (55/30/11.5/2.9/0.55/0.05)',
    });
    // 3. Спины с призом вне конфигурации (должно быть 0).
    const outOfConfig = await countOf(db.collectionGroup(SPINS_SUBCOLLECTION).where('prizeDays', 'not-in', [...referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS]));
    checks.push({
        id: 'no_out_of_config_prizes',
        status: outOfConfig === 0 ? 'ok' : 'fail',
        detail: outOfConfig === 0 ? 'Все prizeDays ∈ [1,7,30,90,180,365]' : `${outOfConfig} спинов с призом вне конфигурации!`,
    });
    // 4. Qualified-атрибуции старше 30 дней (застрявшие прокруты).
    const staleCutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_QUALIFIED_DAYS * DAY_MS);
    const staleQualified = await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified').where('createdAt', '<', staleCutoff));
    checks.push({
        id: 'no_stale_qualified',
        status: staleQualified === 0 ? 'ok' : 'warn',
        detail: staleQualified === 0
            ? 'Нет qualified-приглашений старше 30 дней'
            : `${staleQualified} приглашений ждут клейма > ${STALE_QUALIFIED_DAYS}д — напомнить юзерам/проверить UI`,
    });
    // 5. Баланс кредитов (выборка): issued ≈ used + onHand. Точный аудит — отдельная
    // джоба (агрегации по map-полям недоступны), TODO.
    const creditsSnap = await db
        .collection(USERS)
        .where('progress.referral_spin_credits', '>', 0)
        .limit(HEALTH_SAMPLE_USERS)
        .get();
    let onHand = 0;
    let used = 0;
    for (const u of creditsSnap.docs) {
        const p = u.data().progress ?? {};
        onHand += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
        used += Math.max(0, Math.floor(Number(p.referral_spins_total ?? 0)));
    }
    checks.push({
        id: 'credits_balance_sampled',
        status: 'ok',
        detail: `Выборка ${creditsSnap.size} юзеров: на руках ${onHand}, использовано ${used}. Точный баланс issued=used+onHand — отдельная reconcile-джоба (TODO)`,
    });
    const drainSampleLimit = HEALTH_SAMPLE_USERS + 1;
    const serverNowMs = Date.now();
    const [pendingDrainSnap, qualifiedDrainSnap, ledgerAvailableSnap] = await Promise.all([
        db.collection(REFERRAL_ATTRIBUTIONS)
            .where('status', '==', 'pending')
            .limit(drainSampleLimit)
            .get(),
        db.collection(REFERRAL_ATTRIBUTIONS)
            .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
            .limit(drainSampleLimit)
            .get(),
        db.collectionGroup(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER)
            .where('status', '==', 'available')
            .limit(drainSampleLimit)
            .get(),
    ]);
    const sampledAttributions = [...pendingDrainSnap.docs, ...qualifiedDrainSnap.docs]
        .slice(0, HEALTH_SAMPLE_USERS * 2)
        .map((doc) => {
        const row = doc.data();
        return {
            status: String(row.status ?? ''),
            createdAtMs: tsToMs(row.createdAt) || tsToMs(row.createdAtMs),
            qualifiedAtMs: tsToMs(row.qualifiedAt) || tsToMs(row.qualifiedAtMs),
        };
    });
    const sampledCredits = ledgerAvailableSnap.docs
        .slice(0, HEALTH_SAMPLE_USERS)
        .map((doc) => {
        const row = doc.data();
        return {
            status: String(row.status ?? ''),
            source: String(row.source ?? ''),
            expiresAtMs: tsToMs(row.expiresAt) || tsToMs(row.expiresAtMs),
        };
    });
    const semanticDrain = (0, referral_admin_drain_metrics_1.summarizeReferralAdminDrain)({
        policy: roulettePolicy,
        nowMs: serverNowMs,
        attributions: sampledAttributions,
        credits: sampledCredits,
    });
    const drainMetrics = {
        ...semanticDrain,
        aggregateCreditsSampled: onHand,
        softOffAtMs,
        legacyCreditExpiryMs: (0, referral_roulette_policy_1.legacyCreditExpiryMs)(),
        serverNowMs,
        sampleLimit: HEALTH_SAMPLE_USERS,
        truncated: pendingDrainSnap.size > HEALTH_SAMPLE_USERS
            || qualifiedDrainSnap.size > HEALTH_SAMPLE_USERS
            || ledgerAvailableSnap.size > HEALTH_SAMPLE_USERS,
    };
    // 6. Отставание feed: последнее событие my_events vs последняя feed-копия (по выборке).
    let feedLagMinutes = -1;
    try {
        const [latestEvent, latestFeed] = await Promise.all([
            db.collectionGroup('my_events').orderBy('ts', 'desc').limit(1).get(),
            db.collectionGroup('feed').orderBy('ts', 'desc').limit(1).get(),
        ]);
        const eTs = Number(latestEvent.docs[0]?.data()?.ts ?? 0);
        const fTs = Number(latestFeed.docs[0]?.data()?.ts ?? 0);
        if (eTs > 0 && fTs > 0)
            feedLagMinutes = Math.max(0, Math.round((eTs - fTs) / 60000));
    }
    catch {
        /* индексы collectionGroup могут отсутствовать до backfill — тогда warn ниже */
    }
    checks.push({
        id: 'feed_lag',
        status: feedLagMinutes < 0 ? 'warn' : feedLagMinutes < 5 ? 'ok' : 'warn',
        detail: feedLagMinutes < 0
            ? 'Не удалось оценить (нет данных/индекса collectionGroup) — проверить после backfill'
            : `Отставание fan-out ≈ ${feedLagMinutes} мин (порог 5 мин)`,
    });
    const worst = checks.some((c) => c.status === 'fail')
        ? 'fail'
        : checks.some((c) => c.status === 'warn')
            ? 'warn'
            : 'ok';
    return {
        ok: true,
        status: worst,
        checks,
        rouletteEnabled,
        emergencyStop,
        softOffAtMs,
        drainMetrics,
        checkedAtMs: Date.now(),
    };
});
//# sourceMappingURL=admin_referrals.js.map