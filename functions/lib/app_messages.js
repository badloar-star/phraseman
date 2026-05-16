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
exports.onAppMessageReactionWritten = void 0;
exports.cleanupExpiredAppMessages = cleanupExpiredAppMessages;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
const APP_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function toMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.floor(value);
    if (typeof value === 'string') {
        const n = Number(value);
        if (Number.isFinite(n))
            return Math.floor(n);
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    if (value && typeof value.toDate === 'function') {
        return value.toDate().getTime();
    }
    return 0;
}
async function deleteMessageWithReactions(db, doc) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const reactions = await doc.ref.collection('reactions').limit(400).get();
        if (reactions.empty)
            break;
        const batch = db.batch();
        reactions.docs.forEach((reaction) => batch.delete(reaction.ref));
        await batch.commit();
    }
    while (true) {
        const states = await db.collectionGroup('app_message_states').where('messageId', '==', doc.id).limit(400).get();
        if (states.empty)
            break;
        const batch = db.batch();
        states.docs.forEach((state) => batch.delete(state.ref));
        await batch.commit();
    }
    await doc.ref.delete();
}
async function cleanupExpiredAppMessages() {
    const db = admin.firestore();
    const now = Date.now();
    const cutoff = now - APP_MESSAGE_TTL_MS;
    const snap = await db.collection('app_messages').orderBy('createdAtMs', 'asc').limit(200).get();
    let deleted = 0;
    for (const doc of snap.docs) {
        const data = doc.data() || {};
        const createdAtMs = toMs(data.createdAtMs ?? data.createdAt);
        const expiresAtMs = toMs(data.expiresAtMs ?? data.expiresAt);
        const expired = (expiresAtMs > 0 && expiresAtMs <= now) || (createdAtMs > 0 && createdAtMs <= cutoff);
        if (!expired)
            continue;
        await deleteMessageWithReactions(db, doc);
        deleted += 1;
    }
    return { deleted, scanned: snap.size };
}
function reactionDelta(reaction) {
    if (reaction === 'like')
        return { like: 1, dislike: 0 };
    if (reaction === 'dislike')
        return { like: 0, dislike: 1 };
    return { like: 0, dislike: 0 };
}
exports.onAppMessageReactionWritten = functions.firestore.onDocumentWritten('app_messages/{messageId}/reactions/{userId}', async (event) => {
    const before = reactionDelta(event.data?.before.exists ? event.data.before.data()?.reaction : null);
    const after = reactionDelta(event.data?.after.exists ? event.data.after.data()?.reaction : null);
    const likeDelta = after.like - before.like;
    const dislikeDelta = after.dislike - before.dislike;
    if (likeDelta === 0 && dislikeDelta === 0)
        return;
    const messageId = String(event.params.messageId || '');
    if (!messageId)
        return;
    try {
        await admin.firestore().collection('app_messages').doc(messageId).update({
            likeCount: admin.firestore.FieldValue.increment(likeDelta),
            dislikeCount: admin.firestore.FieldValue.increment(dislikeDelta),
            reactionCountUpdatedAtMs: Date.now(),
        });
    }
    catch (e) {
        const code = e?.code;
        if (code !== 5 && code !== 'not-found') {
            console.error('onAppMessageReactionWritten failed', { messageId, likeDelta, dislikeDelta, e });
        }
    }
});
//# sourceMappingURL=app_messages.js.map