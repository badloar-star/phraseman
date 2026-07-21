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
exports.V2_PROGRESS_CALLABLE_OPTIONS = void 0;
exports.createProgressEventProductionHandler = createProgressEventProductionHandler;
exports.createProgressEventProductionCallable = createProgressEventProductionCallable;
exports.normalizeProgressAuthUid = normalizeProgressAuthUid;
exports.requireProgressAuth = requireProgressAuth;
exports.normalizeProgressStableUid = normalizeProgressStableUid;
exports.readProgressAccountBinding = readProgressAccountBinding;
exports.createProgressEventAuthorization = createProgressEventAuthorization;
exports.createProgressEventHandler = createProgressEventHandler;
exports.createProgressEventCallable = createProgressEventCallable;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const progress_event_1 = require("./progress_event");
const progress_event_2 = require("./progress_event");
const firestore_progress_event_store_1 = require("./firestore_progress_event_store");
const server_score_policy_catalog_1 = require("./server_score_policy_catalog");
const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
const AUTH_LINKS = 'auth_links';
/**
 * Progress events are an authenticated, App Check-protected write surface.
 * App Check is deliberately fail-closed here; local emulator/test callers can
 * opt out explicitly with ENFORCE_APP_CHECK_V2_PROGRESS=false.
 */
exports.V2_PROGRESS_CALLABLE_OPTIONS = {
    region: 'us-central1',
    enforceAppCheck: process.env.ENFORCE_APP_CHECK_V2_PROGRESS !== 'false',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
};
/**
 * Server-only executor. Identity and account generation come from the
 * authorization result; request projection/candidate stars are never trusted.
 * Without an immutable template reader (or an explicitly code-owned scorer)
 * the store remains fail-closed and cannot award positive stars.
 */
function createProgressEventProductionHandler(dependencies = {}) {
    const db = dependencies.db ?? admin.firestore();
    const createStore = dependencies.createStore ?? firestore_progress_event_store_1.createFirestoreProgressEventStore;
    return async ({ authUid, stableUid, accountGeneration, input }) => {
        if (!accountGeneration)
            throw new https_1.HttpsError('failed-precondition', 'account_generation_unavailable');
        const store = createStore({
            db,
            authUid,
            stableUid,
            accountGeneration,
            accountScopeHash: input.accountScopeHash,
            scoringTemplates: dependencies.scoringTemplates,
            scoringPolicies: dependencies.scoringPolicies ?? server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG,
            resolveServerScore: dependencies.resolveServerScore,
        });
        return (0, progress_event_2.applyProgressEvent)(store, input);
    };
}
/** Compose the authenticated callable only at the deployment boundary. */
function createProgressEventProductionCallable(dependencies = {}, authorize = createProgressEventAuthorization(dependencies.db)) {
    return createProgressEventCallable(createProgressEventProductionHandler(dependencies), authorize);
}
/** Firebase Auth UIDs are opaque, but must be non-empty and bounded. */
function normalizeProgressAuthUid(value) {
    if (typeof value !== 'string') {
        throw new https_1.HttpsError('unauthenticated', 'authentication_required');
    }
    const uid = value.trim();
    if (!uid || uid.length > 128) {
        throw new https_1.HttpsError('unauthenticated', 'authentication_required');
    }
    return uid;
}
function requireProgressAuth(request) {
    return normalizeProgressAuthUid(request.auth?.uid);
}
function normalizeProgressStableUid(value) {
    if (typeof value !== 'string') {
        throw new https_1.HttpsError('failed-precondition', 'stable_id_required');
    }
    const stableUid = value.trim();
    if (!stableUid || stableUid.length > 160) {
        throw new https_1.HttpsError('failed-precondition', 'stable_id_required');
    }
    return stableUid;
}
function normalizeProgressGeneration(value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new https_1.HttpsError('failed-precondition', 'account_generation_unavailable');
    }
    return value;
}
/** Read a strict server-owned auth anchor, generation, and deletion barrier. */
async function readProgressAccountBinding(db, authUid) {
    const normalizedAuthUid = normalizeProgressAuthUid(authUid);
    const authLinkSnapshot = await db.collection(AUTH_LINKS).doc(normalizedAuthUid).get();
    if (!authLinkSnapshot.exists) {
        throw new https_1.HttpsError('failed-precondition', 'progress_identity_anchor_missing');
    }
    const stableUid = normalizeProgressStableUid(authLinkSnapshot.data()?.stable_id);
    const [userSnap, tombstoneSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get(),
        db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid).get(),
    ]);
    if (tombstoneSnap.exists)
        throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
    const data = userSnap.data() ?? {};
    // accountGeneration is the V2 spelling; generation is accepted only as a legacy server field.
    const accountGeneration = normalizeProgressGeneration(data.accountGeneration ?? data.generation);
    return Object.freeze({ stableUid, accountGeneration });
}
/**
 * Default identity seam. It reads the canonical auth anchor without trusting a
 * client-provided stable_id and disables link repair: progress submission must
 * not mutate identity as a side effect of an attempt.
 */
function createProgressEventAuthorization(db = admin.firestore()) {
    return async (authUid) => readProgressAccountBinding(db, authUid);
}
/**
 * Testable handler seam. The parser runs before authorization's downstream
 * executor, and the executor receives server-derived identity only.
 */
function createProgressEventHandler(authorize, execute) {
    return async (request) => {
        const authUid = requireProgressAuth(request);
        const input = (0, progress_event_1.parseProgressEventRequest)(request.data);
        const result = await authorize(authUid);
        if (typeof result === 'string') {
            throw new https_1.HttpsError('failed-precondition', 'account_generation_unavailable');
        }
        const binding = {
            stableUid: normalizeProgressStableUid(result?.stableUid),
            accountGeneration: normalizeProgressGeneration(result?.accountGeneration),
        };
        const expectedScope = (0, progress_event_1.deriveProgressAccountScopeHash)(binding.stableUid, binding.accountGeneration);
        if (input.accountScopeHash !== expectedScope) {
            throw new https_1.HttpsError('failed-precondition', 'account_generation_mismatch');
        }
        return execute({ authUid, ...binding, input });
    };
}
/**
 * Callable factory kept out of index.ts until the transactional store is wired.
 * This prevents an unconfigured endpoint from being deployed accidentally while
 * allowing emulator and contract tests to exercise the real App Check options.
 */
function createProgressEventCallable(execute, authorize = createProgressEventAuthorization()) {
    const handler = createProgressEventHandler(authorize, execute);
    return (0, https_1.onCall)(exports.V2_PROGRESS_CALLABLE_OPTIONS, async (request) => handler(request));
}
//# sourceMappingURL=progress_event_callable.js.map