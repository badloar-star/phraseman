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
exports.__giftAccessTestHooks = exports.introFullAccessClaim = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const auth_identity_1 = require("./auth_identity");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const INTRO_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;
const INTRO_ENABLED_KEY = 'intro_full_access_enabled';
function positiveInteger(value) {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function decideIntroFullAccessClaim(enabled, progress, nowMs) {
    const rawGrantedAtMs = progress.intro_access_granted_at_ms;
    const rawEndsAtMs = progress.intro_access_until_ms;
    if (rawGrantedAtMs === undefined && rawEndsAtMs === undefined) {
        if (!enabled)
            throw new Error('intro_full_access_disabled');
        if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
            throw new Error('intro_full_access_state_invalid');
        }
        return {
            kind: 'grant',
            grantedAtMs: nowMs,
            endsAtMs: nowMs + INTRO_ACCESS_DURATION_MS,
        };
    }
    const grantedAtMs = positiveInteger(rawGrantedAtMs);
    const endsAtMs = positiveInteger(rawEndsAtMs);
    if (grantedAtMs === null
        || endsAtMs === null
        || endsAtMs - grantedAtMs !== INTRO_ACCESS_DURATION_MS) {
        throw new Error('intro_full_access_state_invalid');
    }
    return { kind: 'replay', grantedAtMs, endsAtMs };
}
function callablePolicyError(error) {
    if (error instanceof Error && error.message === 'intro_full_access_disabled') {
        throw new https_1.HttpsError('failed-precondition', error.message);
    }
    if (error instanceof Error && error.message === 'intro_full_access_state_invalid') {
        throw new https_1.HttpsError('failed-precondition', error.message);
    }
    throw error;
}
exports.introFullAccessClaim = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, {
        repairLinks: false,
        requireKnownIdentity: true,
    });
    const configRef = db.collection('remote_config').doc('app');
    const userRef = db.collection('users').doc(stableUid);
    return db.runTransaction(async (transaction) => {
        const [configSnapshot, userSnapshot] = await Promise.all([
            transaction.get(configRef),
            transaction.get(userRef),
        ]);
        const config = configSnapshot.data();
        const bools = config && typeof config.bools === 'object' && config.bools !== null
            ? config.bools
            : undefined;
        const enabled = bools?.[INTRO_ENABLED_KEY] === true;
        const user = userSnapshot.data() ?? {};
        const progress = user.progress && typeof user.progress === 'object'
            ? user.progress
            : {};
        let decision;
        try {
            decision = decideIntroFullAccessClaim(enabled, progress, Date.now());
        }
        catch (error) {
            return callablePolicyError(error);
        }
        if (decision.kind === 'grant') {
            transaction.update(userRef, {
                'progress.intro_access_granted_at_ms': decision.grantedAtMs,
                'progress.intro_access_until_ms': decision.endsAtMs,
            });
        }
        return {
            grantedAtMs: decision.grantedAtMs,
            endsAtMs: decision.endsAtMs,
            alreadyGranted: decision.kind === 'replay',
        };
    });
});
exports.__giftAccessTestHooks = {
    decideIntroFullAccessClaim,
};
//# sourceMappingURL=gift_access.js.map