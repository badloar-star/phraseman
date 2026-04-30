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
exports.processLobbyAfterChoice = processLobbyAfterChoice;
exports.expireStaleAcceptanceSessions = expireStaleAcceptanceSessions;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Коли гравець змінює lobbyChoice, перевіряємо: усі accept → get_ready, хтось decline → aborted.
 */
async function processLobbyAfterChoice(sessionId) {
    const sessionRef = db.collection('arena_sessions').doc(sessionId);
    await db.runTransaction(async (tx) => {
        const sSnap = await tx.get(sessionRef);
        if (!sSnap.exists)
            return;
        const session = sSnap.data();
        if (session.state !== 'acceptance')
            return;
        const pids = session.playerIds;
        if (!pids?.length)
            return;
        let hasDecline = false;
        let allAccepted = true;
        for (const pid of pids) {
            const pSnap = await tx.get(db.collection('session_players').doc(`${sessionId}_${pid}`));
            const ch = pSnap.exists
                ? pSnap.data().lobbyChoice ?? 'none'
                : 'none';
            if (ch === 'decline') {
                hasDecline = true;
                allAccepted = false;
                break;
            }
            if (ch !== 'accept') {
                allAccepted = false;
            }
        }
        if (hasDecline) {
            const now = Date.now();
            tx.update(sessionRef, {
                state: 'aborted',
                abortReason: 'decline',
                abortedAt: now,
            });
            return;
        }
        if (allAccepted && pids.length > 0) {
            const now = Date.now();
            tx.update(sessionRef, {
                state: 'get_ready',
                getReadyEndsAt: now + 2500,
                getReadyStartedAt: now,
            });
        }
    });
}
/**
 * Сесії, що залишилися в acceptance після дедлайну.
 */
async function expireStaleAcceptanceSessions() {
    const now = Date.now();
    let snap;
    try {
        snap = await db
            .collection('arena_sessions')
            .where('state', '==', 'acceptance')
            .where('acceptDeadlineAt', '<=', now)
            .limit(20)
            .get();
    }
    catch {
        return;
    }
    for (const doc of snap.docs) {
        const ref = doc.ref;
        try {
            const cur = await ref.get();
            if (!cur.exists)
                continue;
            const d = cur.data();
            if (d.state !== 'acceptance')
                continue;
            await ref.update({
                state: 'aborted',
                abortReason: 'accept_timeout',
                abortedAt: Date.now(),
            });
        }
        catch {
            // ignore
        }
    }
}
//# sourceMappingURL=arena_pregame.js.map