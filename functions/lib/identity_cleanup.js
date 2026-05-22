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
exports.cleanupLegacyIdentityDuplicatesPage = cleanupLegacyIdentityDuplicatesPage;
const admin = __importStar(require("firebase-admin"));
const auth_identity_1 = require("./auth_identity");
const USERS = 'users';
const CURSOR_DOC = 'app_meta/identity_cleanup_cursor';
const PAGE_SIZE = 300;
async function cleanupLegacyIdentityDuplicatesPage() {
    const db = admin.firestore();
    const cursorRef = db.doc(CURSOR_DOC);
    const cursorSnap = await cursorRef.get().catch(() => null);
    const lastUserId = String(cursorSnap?.data()?.lastUserId ?? '').trim();
    let query = db.collection(USERS).orderBy('__name__').limit(PAGE_SIZE);
    if (lastUserId) {
        const lastSnap = await db.collection(USERS).doc(lastUserId).get().catch(() => null);
        if (lastSnap?.exists)
            query = query.startAfter(lastSnap);
    }
    const snap = await query.get();
    const result = {
        scanned: snap.size,
        processed: 0,
        skipped: 0,
        leaderboardHidden: 0,
        leagueGroupsTouched: 0,
        candidatesRecorded: 0,
        done: snap.empty,
    };
    for (const doc of snap.docs) {
        const stableId = doc.id;
        const authUid = String(doc.data()?.firebaseAuthUid ?? '').trim();
        if (!authUid || authUid === stableId) {
            result.skipped += 1;
            continue;
        }
        const stats = await (0, auth_identity_1.cleanupLegacyAuthIdentityDuplicates)(db, stableId, authUid, {
            reason: 'identity_cleanup_cron',
            throttleMs: 0,
        });
        if (stats.skipped) {
            result.skipped += 1;
            continue;
        }
        result.processed += 1;
        result.leaderboardHidden += stats.leaderboardHidden;
        result.leagueGroupsTouched += stats.leagueGroupsTouched;
        result.candidatesRecorded += stats.candidatesRecorded;
    }
    const nextLast = snap.docs[snap.docs.length - 1]?.id ?? '';
    if (snap.empty || snap.size < PAGE_SIZE) {
        result.done = true;
        await cursorRef.set({
            lastUserId: admin.firestore.FieldValue.delete(),
            fullPassCompletedAt: Date.now(),
            lastResult: result,
            updatedAt: Date.now(),
        }, { merge: true });
    }
    else {
        await cursorRef.set({
            lastUserId: nextLast,
            lastResult: result,
            updatedAt: Date.now(),
        }, { merge: true });
    }
    console.log(JSON.stringify({ event: 'identity_cleanup_page_done', ...result }));
    return result;
}
//# sourceMappingURL=identity_cleanup.js.map