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
exports.recordAgeConsentSnapshot = void 0;
exports.parseAgeConsentSnapshot = parseAgeConsentSnapshot;
exports.applyAgeConsentSnapshot = applyAgeConsentSnapshot;
exports.handleRecordAgeConsentSnapshot = handleRecordAgeConsentSnapshot;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const auth_identity_1 = require("./auth_identity");
const MAX_COHORT_TEXT = 64;
const INTENT_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const TIMESTAMP_FIELDS = new Set([
    'createdAt',
    'consentGrantedAt',
    'consentRevokedAt',
    'legalAcceptedAt',
    'updatedAt',
]);
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function invalid(message) {
    throw new https_1.HttpsError('invalid-argument', message);
}
function requiredText(value, field) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || normalized.length > MAX_COHORT_TEXT)
        invalid(`Invalid ${field}`);
    return normalized;
}
function parseAgeConsentSnapshot(value) {
    if (!isPlainObject(value))
        invalid('Object payload required');
    const allowed = new Set([
        'schemaVersion',
        'intentId',
        'ageBracket',
        'analyticsConsent',
        'legalAccepted',
        'appVersion',
        'build',
        'platform',
    ]);
    if (Object.keys(value).some((key) => !allowed.has(key)))
        invalid('Unexpected field');
    if (value.schemaVersion !== 1)
        invalid('Unsupported consent schema');
    const intentId = typeof value.intentId === 'string' ? value.intentId.trim() : '';
    if (!INTENT_ID_RE.test(intentId))
        invalid('Invalid intent id');
    if (value.ageBracket !== 'adult' && value.ageBracket !== 'unknown') {
        invalid('Unsupported age bracket');
    }
    if (value.analyticsConsent !== 'granted'
        && value.analyticsConsent !== 'denied'
        && value.analyticsConsent !== 'unset')
        invalid('Unsupported analytics consent');
    if (typeof value.legalAccepted !== 'boolean')
        invalid('Invalid legal acceptance');
    if (value.platform !== 'ios' && value.platform !== 'android' && value.platform !== 'web') {
        invalid('Unsupported platform');
    }
    return {
        schemaVersion: 1,
        intentId,
        ageBracket: value.ageBracket,
        analyticsConsent: value.analyticsConsent,
        legalAccepted: value.legalAccepted,
        appVersion: requiredText(value.appVersion, 'app version'),
        build: requiredText(value.build, 'build'),
        platform: value.platform,
    };
}
function intentHash(stableUid, intentId) {
    return (0, node_crypto_1.createHash)('sha256')
        .update(`age-consent-v1|${stableUid}|${intentId}`)
        .digest('hex');
}
function missing(row, field) {
    return row?.[field] == null;
}
async function applyAgeConsentSnapshot(repository, stableUid, rawInput, nowMs = Date.now()) {
    const input = parseAgeConsentSnapshot(rawInput);
    const receiptHash = intentHash(stableUid, input.intentId);
    return repository.runTransaction(stableUid, async (current) => {
        if (current?.lastIntentHash === receiptHash) {
            return { result: { ok: true, duplicate: true }, patch: null };
        }
        const patch = {
            schemaVersion: 1,
            ageBracket: input.ageBracket,
            analyticsConsent: input.analyticsConsent,
            legalAccepted: input.legalAccepted,
            appVersion: input.appVersion,
            build: input.build,
            platform: input.platform,
            updatedAt: nowMs,
            lastIntentHash: receiptHash,
        };
        if (missing(current, 'createdAt'))
            patch.createdAt = nowMs;
        if (missing(current, 'firstAppVersion'))
            patch.firstAppVersion = input.appVersion;
        if (missing(current, 'firstBuild'))
            patch.firstBuild = input.build;
        if (missing(current, 'firstPlatform'))
            patch.firstPlatform = input.platform;
        if (input.analyticsConsent === 'granted' && missing(current, 'consentGrantedAt')) {
            patch.consentGrantedAt = nowMs;
        }
        if (input.analyticsConsent === 'denied')
            patch.consentRevokedAt = nowMs;
        if (input.legalAccepted && missing(current, 'legalAcceptedAt'))
            patch.legalAcceptedAt = nowMs;
        return { result: { ok: true, duplicate: false }, patch };
    });
}
async function handleRecordAgeConsentSnapshot(dependencies, request) {
    const authUid = request.authUid.trim();
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    parseAgeConsentSnapshot(request.data);
    const stableUid = await dependencies.resolveStableUid(authUid);
    if (!stableUid.trim())
        throw new https_1.HttpsError('failed-precondition', 'Stable identity required');
    return applyAgeConsentSnapshot(dependencies.repository, stableUid, request.data, dependencies.nowMs());
}
function firestoreRepository(db) {
    return {
        runTransaction: (stableUid, work) => db.runTransaction(async (transaction) => {
            const ref = db.collection('user_consents').doc(stableUid);
            const snapshot = await transaction.get(ref);
            const outcome = await work(snapshot.exists ? (snapshot.data() ?? {}) : null);
            if (outcome.patch) {
                const firestorePatch = Object.fromEntries(Object.entries(outcome.patch).map(([key, value]) => [
                    key,
                    TIMESTAMP_FIELDS.has(key) && typeof value === 'number'
                        ? admin.firestore.Timestamp.fromMillis(value)
                        : value,
                ]));
                transaction.set(ref, firestorePatch, { merge: true });
            }
            return outcome.result;
        }),
    };
}
exports.recordAgeConsentSnapshot = (0, https_1.onCall)({
    region: 'us-central1',
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 40,
}, async (request) => {
    const authUid = request.auth?.uid ?? '';
    const db = admin.firestore();
    return handleRecordAgeConsentSnapshot({
        repository: firestoreRepository(db),
        resolveStableUid: (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, {
            requireKnownIdentity: true,
            repairLinks: false,
        }),
        nowMs: () => Date.now(),
    }, { authUid, data: request.data });
});
//# sourceMappingURL=record_age_consent_snapshot.js.map