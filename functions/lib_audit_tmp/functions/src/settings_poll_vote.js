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
exports.submitSettingsPollVote = void 0;
exports.normalizeSettingsPollVoteInput = normalizeSettingsPollVoteInput;
exports.validateSettingsPollCampaign = validateSettingsPollCampaign;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const REGION = 'us-central1';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boundedId(value, name, max) {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.length > max || !/^[A-Za-z0-9._:-]+$/.test(normalized)) {
        throw new https_1.HttpsError('invalid-argument', `${name}_invalid`);
    }
    return normalized;
}
function normalizeSettingsPollVoteInput(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request_object_required');
    return {
        messageId: boundedId(data.messageId, 'message_id', 160),
        optionId: boundedId(data.optionId, 'option_id', 80),
        requestId: boundedId(data.requestId, 'request_id', 160),
        stableId: boundedId(data.stableId, 'stable_id', 160),
    };
}
function validateSettingsPollCampaign(data, optionId, nowMs) {
    if (data.active !== true)
        throw new https_1.HttpsError('failed-precondition', 'settings_poll_inactive');
    if (data.deliverySurface !== 'settings' || (data.settingsSlot !== 'top' && data.settingsSlot !== 'bottom')) {
        throw new https_1.HttpsError('failed-precondition', 'settings_poll_surface_invalid');
    }
    if (data.kind !== 'poll' || data.voteMode !== 'fixed') {
        throw new https_1.HttpsError('failed-precondition', 'settings_poll_mode_invalid');
    }
    const expiresAtMs = Number(data.expiresAtMs ?? 0);
    if (expiresAtMs > 0 && expiresAtMs <= nowMs)
        throw new https_1.HttpsError('failed-precondition', 'settings_poll_expired');
    const poll = isRecord(data.poll) ? data.poll : {};
    const optionIds = Array.isArray(poll.optionIds) ? poll.optionIds.map(String) : [];
    if (!optionIds.includes(optionId))
        throw new https_1.HttpsError('invalid-argument', 'settings_poll_option_invalid');
}
exports.submitSettingsPollVote = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const authUid = String(request.auth?.uid ?? '').trim();
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'authentication_required');
    const input = normalizeSettingsPollVoteInput(request.data);
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, input.stableId);
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const voteRef = messageRef.collection('fixed_poll_votes').doc(stableUid);
    return db.runTransaction(async (transaction) => {
        const [messageSnap, voteSnap] = await Promise.all([
            transaction.get(messageRef),
            transaction.get(voteRef),
        ]);
        if (voteSnap.exists) {
            return {
                accepted: false,
                alreadyVoted: true,
                optionId: String(voteSnap.data()?.optionId ?? ''),
            };
        }
        if (!messageSnap.exists)
            throw new https_1.HttpsError('not-found', 'settings_poll_not_found');
        const campaign = messageSnap.data() ?? {};
        validateSettingsPollCampaign(campaign, input.optionId, Date.now());
        transaction.create(voteRef, {
            messageId: input.messageId,
            userId: stableUid,
            optionId: input.optionId,
            requestId: input.requestId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtMs: Date.now(),
        });
        transaction.update(messageRef, {
            [`poll.counts.${input.optionId}`]: admin.firestore.FieldValue.increment(1),
            [`pollCounts.${input.optionId}`]: admin.firestore.FieldValue.increment(1),
            'poll.voteCount': admin.firestore.FieldValue.increment(1),
            pollVoteCount: admin.firestore.FieldValue.increment(1),
            pollCountUpdatedAtMs: Date.now(),
        });
        return { accepted: true, alreadyVoted: false, optionId: input.optionId };
    });
});
//# sourceMappingURL=settings_poll_vote.js.map