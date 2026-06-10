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
exports.vipRevokeMine = void 0;
exports.vipRevokeProgressFields = vipRevokeProgressFields;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const REGION = 'us-central1';
/**
 * Self-service отзыв СВОЕГО VIP.
 *
 * Появился, когда progressHasNoPremiumWrites в firestore.rules закрыл прямую
 * клиентскую запись vip_* и premium_* — QA-кнопка «Снять премиум» больше не может
 * чистить серверный VIP сама. Endpoint безопасен публично: он только ПОНИЖАЕТ
 * права владельца (grant остаётся за админкой/ботом/RevenueCat), identity берём
 * исключительно из request.auth (никаких stableId из body).
 */
function vipRevokeProgressFields(nowMs) {
    const now = String(nowMs);
    // Зеркало «Снять VIP» из admin/index.html: vip_plan/vip_from не трогаем —
    // getVipProgressState гасит VIP по falsy vip_active/vip_admin_override,
    // а наличие vip-shape не даёт упасть в legacy admin-premium ветку.
    return {
        vip_active: 'false',
        vip_admin_override: 'false',
        vip_until: now,
        vip_revoked_at: now,
    };
}
exports.vipRevokeMine = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    }
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid);
    const nowMs = Date.now();
    await db.collection('users').doc(stableUid).set({
        progress: vipRevokeProgressFields(nowMs),
        updatedAt: nowMs,
    }, { merge: true });
    return { ok: true };
});
//# sourceMappingURL=vip_revoke.js.map