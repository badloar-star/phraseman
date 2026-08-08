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
exports.adminGetOnboardingFunnel = exports.recordOnboardingFunnelEvent = exports.MAX_EVENTS_PER_AUTH_DAY = void 0;
exports.parseOnboardingFunnelEventInput = parseOnboardingFunnelEventInput;
exports.buildOnboardingFunnelPrivacyKeys = buildOnboardingFunnelPrivacyKeys;
exports.applyOnboardingFunnelEvent = applyOnboardingFunnelEvent;
exports.summarizeOnboardingFunnelRows = summarizeOnboardingFunnelRows;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const REGION = 'us-central1';
const DAILY_COLLECTION = 'onboarding_funnel_daily';
const RECEIPT_COLLECTION = 'onboarding_funnel_receipts';
const RATE_COLLECTION = 'onboarding_funnel_rate_limits';
const RECEIPT_TTL_DAYS = 120;
const RATE_TTL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
exports.MAX_EVENTS_PER_AUTH_DAY = 3;
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function requireExactKeys(value, allowed) {
    const allowedSet = new Set(allowed);
    if (Object.keys(value).some((key) => !allowedSet.has(key))) {
        throw new https_1.HttpsError('invalid-argument', 'Unexpected field');
    }
}
function parseOnboardingFunnelEventInput(value) {
    if (!isPlainObject(value))
        throw new https_1.HttpsError('invalid-argument', 'Object payload required');
    requireExactKeys(value, ['event', 'platform', 'attemptId', 'analyticsConsent']);
    const event = value.event;
    if (event !== 'started' && event !== 'completed') {
        throw new https_1.HttpsError('invalid-argument', 'Unsupported onboarding event');
    }
    const platform = value.platform;
    if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
        throw new https_1.HttpsError('invalid-argument', 'Unsupported platform');
    }
    const attemptId = typeof value.attemptId === 'string' ? value.attemptId.trim() : '';
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(attemptId)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid attempt id');
    }
    // Строгий allowlist: 'unset' сюда не попадает — решение снимается только когда
    // пользователь его фактически принял, иначе счётчик врал бы знаменателем.
    if (value.analyticsConsent === undefined)
        return { event, platform, attemptId };
    if (value.analyticsConsent !== 'granted' && value.analyticsConsent !== 'denied') {
        throw new https_1.HttpsError('invalid-argument', 'Unsupported analytics consent decision');
    }
    return { event, platform, attemptId, analyticsConsent: value.analyticsConsent };
}
function privacyHash(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function buildOnboardingFunnelPrivacyKeys(authUid, input, utcDay) {
    return {
        receiptKey: privacyHash(`onboarding-funnel-v1|receipt|${authUid}|${input.event}|${input.attemptId}`),
        startReceiptKey: privacyHash(`onboarding-funnel-v1|receipt|${authUid}|started|${input.attemptId}`),
        rateKey: privacyHash(`onboarding-funnel-v1|rate|${authUid}|${utcDay}`),
    };
}
function utcDay(date) {
    return date.toISOString().slice(0, 10);
}
function nextUtcDay(day) {
    return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}
function addUtcDays(day, delta) {
    return new Date(Date.parse(`${day}T00:00:00.000Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}
function safeCount(value) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
async function applyOnboardingFunnelEvent(repository, authUid, rawInput, now = new Date()) {
    if (!authUid.trim())
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const input = parseOnboardingFunnelEventInput(rawInput);
    const day = utcDay(now);
    const keys = buildOnboardingFunnelPrivacyKeys(authUid, input, day);
    return repository.runTransaction(async (tx) => {
        if (await tx.hasReceipt(keys.receiptKey))
            return { ok: true, duplicate: true };
        if (input.event === 'completed' && !(await tx.hasReceipt(keys.startReceiptKey))) {
            throw new https_1.HttpsError('failed-precondition', 'Onboarding start receipt required');
        }
        const rate = await tx.getRate(keys.rateKey) ?? { started: 0, completed: 0, expiresAtMs: 0 };
        const eventCount = rate[input.event];
        if (eventCount >= exports.MAX_EVENTS_PER_AUTH_DAY) {
            throw new https_1.HttpsError('resource-exhausted', 'Daily onboarding event limit reached');
        }
        const nowMs = now.getTime();
        tx.createReceipt(keys.receiptKey, {
            createdAtMs: nowMs,
            expiresAtMs: nowMs + RECEIPT_TTL_DAYS * DAY_MS,
        });
        tx.setRate(keys.rateKey, {
            started: rate.started + (input.event === 'started' ? 1 : 0),
            completed: rate.completed + (input.event === 'completed' ? 1 : 0),
            expiresAtMs: nowMs + RATE_TTL_DAYS * DAY_MS,
        });
        tx.incrementDaily(`${day}_${input.platform}`, day, input.platform, input.event, input.analyticsConsent);
        return { ok: true, duplicate: false };
    });
}
function summarizeOnboardingFunnelRows(rows, platform) {
    const selected = platform === 'all' ? rows : rows.filter((row) => row.platform === platform);
    const started = selected.reduce((sum, row) => sum + safeCount(row.started), 0);
    const completed = selected.reduce((sum, row) => sum + safeCount(row.completed), 0);
    const consentGranted = selected.reduce((sum, row) => sum + safeCount(row.consentGranted), 0);
    const consentDenied = selected.reduce((sum, row) => sum + safeCount(row.consentDenied), 0);
    const consentDecisions = consentGranted + consentDenied;
    return {
        started,
        completed,
        conversionPercent: started > 0 ? Math.round((completed / started) * 1000) / 10 : null,
        consentGranted,
        consentDenied,
        consentDecisions,
        // null, а не 0 — пока решений нет (или документы старые), доля неизвестна, и
        // показывать «0%» значило бы соврать в вердикте A/B.
        consentRatePercent: consentDecisions > 0
            ? Math.round((consentGranted / consentDecisions) * 1000) / 10
            : null,
    };
}
function firestoreRepository(db) {
    return {
        runTransaction: (work) => db.runTransaction(async (firestoreTx) => work({
            hasReceipt: async (key) => (await firestoreTx.get(db.collection(RECEIPT_COLLECTION).doc(key))).exists,
            getRate: async (key) => {
                const snapshot = await firestoreTx.get(db.collection(RATE_COLLECTION).doc(key));
                if (!snapshot.exists)
                    return null;
                const value = snapshot.data() ?? {};
                return {
                    started: safeCount(value.started),
                    completed: safeCount(value.completed),
                    expiresAtMs: value.expiresAt?.toMillis?.() ?? 0,
                };
            },
            createReceipt: (key, value) => {
                firestoreTx.create(db.collection(RECEIPT_COLLECTION).doc(key), {
                    createdAt: admin.firestore.Timestamp.fromMillis(value.createdAtMs),
                    expiresAt: admin.firestore.Timestamp.fromMillis(value.expiresAtMs),
                });
            },
            setRate: (key, value) => {
                firestoreTx.set(db.collection(RATE_COLLECTION).doc(key), {
                    started: value.started,
                    completed: value.completed,
                    expiresAt: admin.firestore.Timestamp.fromMillis(value.expiresAtMs),
                });
            },
            incrementDaily: (docId, date, platform, event, analyticsConsent) => {
                // Решение превращается в счётчик прямо здесь: в документ попадает только
                // consentGranted/consentDenied +1, само значение 'granted'/'denied' не хранится.
                const consentField = analyticsConsent === 'granted' ? 'consentGranted'
                    : analyticsConsent === 'denied' ? 'consentDenied' : null;
                firestoreTx.set(db.collection(DAILY_COLLECTION).doc(docId), {
                    date,
                    platform,
                    [event]: admin.firestore.FieldValue.increment(1),
                    ...(consentField ? { [consentField]: admin.firestore.FieldValue.increment(1) } : {}),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            },
        })),
        listDaily: async (fromDay, toDayExclusive) => {
            const snapshot = await db.collection(DAILY_COLLECTION)
                .where(admin.firestore.FieldPath.documentId(), '>=', `${fromDay}_`)
                .where(admin.firestore.FieldPath.documentId(), '<', `${toDayExclusive}_`)
                .limit(400)
                .get();
            return snapshot.docs.flatMap((doc) => {
                const value = doc.data() ?? {};
                if (typeof value.date !== 'string'
                    || (value.platform !== 'ios' && value.platform !== 'android' && value.platform !== 'web'))
                    return [];
                return [{
                        date: value.date,
                        platform: value.platform,
                        started: safeCount(value.started),
                        completed: safeCount(value.completed),
                        consentGranted: safeCount(value.consentGranted),
                        consentDenied: safeCount(value.consentDenied),
                    }];
            });
        },
    };
}
function parseAdminFilter(value) {
    if (!isPlainObject(value))
        throw new https_1.HttpsError('invalid-argument', 'Object payload required');
    requireExactKeys(value, ['rangeDays', 'platform']);
    const rawRange = Number(value.rangeDays);
    if (rawRange !== 7 && rawRange !== 28 && rawRange !== 90) {
        throw new https_1.HttpsError('invalid-argument', 'Unsupported date range');
    }
    const platform = value.platform;
    if (platform !== 'all' && platform !== 'ios' && platform !== 'android' && platform !== 'web') {
        throw new https_1.HttpsError('invalid-argument', 'Unsupported platform filter');
    }
    return { rangeDays: rawRange, platform };
}
exports.recordOnboardingFunnelEvent = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 40,
}, async (request) => {
    const authUid = request.auth?.uid ?? '';
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    return applyOnboardingFunnelEvent(firestoreRepository(admin.firestore()), authUid, request.data);
});
exports.adminGetOnboardingFunnel = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
}, async (request) => {
    if (!(0, permissions_1.hasClaimedPermission)(request.auth?.token, 'diagnostics.read')) {
        throw new https_1.HttpsError('permission-denied', 'diagnostics.read permission required');
    }
    const filter = parseAdminFilter(request.data);
    const today = utcDay(new Date());
    const fromDay = addUtcDays(today, -(filter.rangeDays - 1));
    const toDayExclusive = nextUtcDay(today);
    const rows = await firestoreRepository(admin.firestore()).listDaily(fromDay, toDayExclusive);
    return {
        ...summarizeOnboardingFunnelRows(rows, filter.platform),
        rangeDays: filter.rangeDays,
        platform: filter.platform,
        fromDay,
        throughDay: today,
        cohortDefinition: 'onboarding_funnel_server_aggregates_v1',
        generatedAtMs: Date.now(),
        limitations: [
            'available_from_counter_release_only',
            'client_platform_is_allowlisted_but_client_reported',
            'offline_events_may_arrive_late_or_be_missing',
        ],
    };
});
//# sourceMappingURL=onboarding_funnel.js.map