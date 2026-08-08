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
exports.jarvisGetQualitySnapshot = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("../admin/permissions");
const roles_1 = require("../admin/roles");
const callable_options_1 = require("../callable_options");
const quality_firestore_fetcher_1 = require("./quality_firestore_fetcher");
const quality_snapshot_1 = require("./quality_snapshot");
/**
 * Callable Р2: панель в admin/v2/legacy.html читает департамент «Качество».
 *
 * зачем: владелец решил 2026-08-01 не заводить отдельную роль владельца на
 * этом шаге (approve/reject ещё не реализованы) — та же диагностика,
 * которую сейчас видит admin_reports_center.ts под diagnostics.read.
 * Каждый вызов панели — trigger: 'owner_request', никогда 'scheduled':
 * панель не заменяет суточный планировщик, только показывает по требованию.
 */
const REGION = 'us-central1';
const REQUIRED_PERMISSION = 'diagnostics.read';
const MAX_QUESTION_LEN = 300;
const OPTIONS = Object.freeze({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 20,
    memory: '256MiB',
});
function requireDiagnosticsRead(request) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const claimedRole = request.auth.token.adminRole;
    if (!(0, roles_1.hasAdminRole)(claimedRole))
        throw new https_1.HttpsError('permission-denied', 'Valid adminRole required');
    const role = claimedRole;
    if (!(0, permissions_1.hasPermission)(role, REQUIRED_PERMISSION)) {
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${REQUIRED_PERMISSION}`);
    }
}
function parseQuestion(data) {
    if (!data || typeof data !== 'object')
        return undefined;
    const question = data.question;
    return typeof question === 'string' && question.trim() ? question.trim().slice(0, MAX_QUESTION_LEN) : undefined;
}
function firestoreFetchers() {
    const db = admin.firestore();
    const nowMs = Date.now();
    return {
        error_reports: () => (0, quality_firestore_fetcher_1.fetchQualitySource)({ sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
        user_reports: () => (0, quality_firestore_fetcher_1.fetchQualitySource)({ sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
        app_errors: () => (0, quality_firestore_fetcher_1.fetchQualitySource)({ sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
    };
}
exports.jarvisGetQualitySnapshot = (0, https_1.onCall)(OPTIONS, async (request) => {
    requireDiagnosticsRead(request);
    const question = parseQuestion(request.data);
    const snapshot = await (0, quality_snapshot_1.buildQualitySnapshot)({
        fetchers: firestoreFetchers(),
        trigger: 'owner_request',
        question,
        nowMs: Date.now(),
    });
    return { ok: true, generatedAtMs: snapshot.generatedAtMs, decisions: snapshot.decisions };
});
//# sourceMappingURL=callables.js.map