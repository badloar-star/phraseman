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
exports.submitClientReport = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const REGION = 'us-central1';
const RATE_COLLECTION = 'client_report_rate_limits';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const REPORT_CONFIG = {
    user_report: { collection: 'user_reports', max: 5, windowMs: HOUR_MS },
    community_pack_report: { collection: 'community_pack_reports', max: 5, windowMs: HOUR_MS },
    error_report: { collection: 'error_reports', max: 10, windowMs: HOUR_MS },
    app_error: { collection: 'app_errors', max: 20, windowMs: HOUR_MS },
    app_activity: { collection: 'app_activity', max: 60, windowMs: HOUR_MS },
    subscription_cancel_survey: { collection: 'subscription_cancel_surveys', max: 5, windowMs: DAY_MS },
    review_promo_claim: { collection: 'review_promo_claims', max: 20, windowMs: DAY_MS },
};
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
function cleanTags(value) {
    const source = asRecord(value);
    const out = {};
    Object.entries(source).slice(0, 24).forEach(([key, raw]) => {
        const cleanKey = text(key, 80);
        if (!cleanKey)
            return;
        if (typeof raw === 'string')
            out[cleanKey] = raw.slice(0, 220);
        else if (typeof raw === 'number' || typeof raw === 'boolean' || raw === null)
            out[cleanKey] = raw;
        else if (raw !== undefined)
            out[cleanKey] = String(raw).slice(0, 220);
    });
    return out;
}
function rateDocId(kind, authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`${kind}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `${kind}_${hash}`;
}
function baseDoc(payload, stableUid, authUid, now) {
    return {
        uid: stableUid,
        authUid,
        platform: text(payload.platform, 40) || 'unknown',
        appVersion: text(payload.appVersion, 80) || 'unknown',
        buildNumber: nullableText(payload.buildNumber, 80),
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}
function buildReportDoc(kind, payload, stableUid, authUid, now) {
    const base = baseDoc(payload, stableUid, authUid, now);
    if (kind === 'user_report') {
        const reportedUid = text(payload.reportedUid, 180);
        if (!reportedUid)
            throw new https_1.HttpsError('invalid-argument', 'reported_uid_required');
        return {
            ...base,
            reportedUid,
            reportedName: text(payload.reportedName, 120),
            reason: enumText(payload.reason, ['offensive_nickname'], 'offensive_nickname'),
            screen: enumText(payload.screen, ['leaderboard', 'arena'], 'leaderboard'),
            reporterUid: stableUid,
            reporterAuthUid: authUid,
            reporterName: text(payload.reporterName, 120) || 'unknown',
            status: 'new',
        };
    }
    if (kind === 'community_pack_report') {
        const packId = text(payload.packId, 180);
        if (!packId)
            throw new https_1.HttpsError('invalid-argument', 'pack_id_required');
        return {
            ...base,
            packId,
            packTitle: text(payload.packTitle, 220),
            authorStableId: nullableText(payload.authorStableId, 180),
            studyTarget: enumText(payload.studyTarget, ['en', 'fr'], 'en'),
            reason: enumText(payload.reason, ['offensive', 'sexual', 'spam', 'copyright', 'wrong_translation', 'other'], 'other'),
            comment: text(payload.comment, 500),
            reporterUid: stableUid,
            reporterAuthUid: authUid,
            reporterName: text(payload.reporterName, 120) || 'unknown',
            status: 'new',
        };
    }
    if (kind === 'error_report') {
        return {
            ...base,
            screen: text(payload.screen, 120),
            category: text(payload.category, 120) || 'free_text',
            dataId: text(payload.dataId, 180),
            dataText: text(payload.dataText, 5000),
            userAnswer: text(payload.userAnswer, 1000),
            comment: text(payload.comment, 2000),
            deviceModel: nullableText(payload.deviceModel, 160),
            deviceOS: nullableText(payload.deviceOS, 80),
            deviceOSVersion: nullableText(payload.deviceOSVersion, 80),
            screenWidth: numeric(payload.screenWidth),
            screenHeight: numeric(payload.screenHeight),
            pixelRatio: numeric(payload.pixelRatio, 1),
            userName: nullableText(payload.userName, 120),
            userLevel: numeric(payload.userLevel),
            userXP: numeric(payload.userXP),
            userStreak: numeric(payload.userStreak),
            userPremium: !!payload.userPremium,
            userLanguage: nullableText(payload.userLanguage, 16),
            userDaysInApp: numeric(payload.userDaysInApp),
            copyText: text(payload.copyText, 7000),
            status: 'new',
        };
    }
    if (kind === 'app_error') {
        return {
            ...base,
            context: text(payload.context, 180),
            feature: text(payload.feature, 120) || 'app',
            screen: nullableText(payload.screen, 120),
            severity: enumText(payload.severity, ['warning', 'critical'], 'warning'),
            fingerprint: text(payload.fingerprint, 80),
            errorName: text(payload.errorName, 120),
            message: text(payload.message, 2000),
            stack: nullableText(payload.stack, 8000),
            tags: cleanTags(payload.tags),
            userName: nullableText(payload.userName, 120),
            osVersion: nullableText(payload.osVersion, 80),
            deviceName: nullableText(payload.deviceName, 160),
            status: 'new',
        };
    }
    if (kind === 'app_activity') {
        return {
            ...base,
            action: text(payload.action, 120),
            feature: text(payload.feature, 120) || text(payload.action, 120).split(':')[0] || 'app',
            screen: nullableText(payload.screen, 120),
            result: enumText(payload.result, ['start', 'success', 'blocked', 'error', 'info'], 'info'),
            tags: cleanTags(payload.tags),
            userName: nullableText(payload.userName, 120),
            osVersion: nullableText(payload.osVersion, 80),
            appState: nullableText(payload.appState, 40),
        };
    }
    if (kind === 'subscription_cancel_survey') {
        return {
            ...base,
            reason: text(payload.reason, 80) || 'unknown',
            reasonText: text(payload.reasonText, 1000),
            context: text(payload.context, 80) || 'manage',
            userName: nullableText(payload.userName, 120),
            lang: nullableText(payload.lang, 16),
            premiumPlan: nullableText(payload.premiumPlan, 80),
            osVersion: nullableText(payload.osVersion, 80),
        };
    }
    return {
        ...base,
        broadcastId: text(payload.broadcastId, 180),
        status: 'clicked',
    };
}
exports.submitClientReport = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 40,
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const kind = text(request.data?.kind, 80);
    const config = REPORT_CONFIG[kind];
    if (!config)
        throw new https_1.HttpsError('invalid-argument', 'unknown_report_kind');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    const payload = asRecord(request.data?.payload);
    const now = Date.now();
    const doc = buildReportDoc(kind, payload, stableUid, authUid, now);
    const rateRef = db.collection(RATE_COLLECTION).doc(rateDocId(kind, authUid, stableUid));
    const reportRef = db.collection(config.collection).doc();
    return db.runTransaction(async (tx) => {
        const rateSnap = await tx.get(rateRef);
        const rate = rateSnap.data() || {};
        const windowStartMs = numeric(rate.windowStartMs);
        const sameWindow = now - windowStartMs < config.windowMs;
        const count = sameWindow ? numeric(rate.count) : 0;
        if (count >= config.max) {
            throw new https_1.HttpsError('resource-exhausted', 'rate_limited');
        }
        tx.set(rateRef, {
            kind,
            stableUid,
            authUid,
            windowStartMs: sameWindow ? windowStartMs : now,
            count: count + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: now,
        }, { merge: true });
        tx.create(reportRef, doc);
        return { ok: true, id: reportRef.id, collection: config.collection };
    });
});
//# sourceMappingURL=client_reports.js.map