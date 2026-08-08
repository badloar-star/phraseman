"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_bots.ts — генерация/сид бот-персон режима «Турниры» (§3).
// adminSeedBotProfiles — admin-callable, пишет N детерминированных профилей
// в botProfiles/. Тот же набор даёт скрипт functions/scripts/seed_tournament_bots.js.
// Боты — постоянные «персонажи»: имя, аватар-эмодзи, ранг, титулы, винрейт
// из реалистичного (треугольного) распределения.
// ═══════════════════════════════════════════════════════════════════════════
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
exports.adminSeedBotProfiles = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const tournament_core_1 = require("./tournament_core");
const tournament_reddit_bot_names_1 = require("./tournament_reddit_bot_names");
exports.adminSeedBotProfiles = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const requestedCount = request.data?.count;
    if (requestedCount !== undefined
        && Math.trunc(Number(requestedCount)) !== tournament_reddit_bot_names_1.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT) {
        throw new https_1.HttpsError('invalid-argument', 'bot_count_must_equal_200');
    }
    const count = tournament_reddit_bot_names_1.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;
    const overwriteRequested = request.data?.overwrite === true;
    const db = admin.firestore();
    const profiles = (0, tournament_core_1.generateBotProfiles)(count, tournament_reddit_bot_names_1.TOURNAMENT_REDDIT_BOT_PERSONA_SEED);
    const nowMs = Date.now();
    let written = 0;
    for (let i = 0; i < profiles.length; i += 400) {
        const batch = db.batch();
        for (const profile of profiles.slice(i, i + 400)) {
            const ref = db.collection(tournament_core_1.BOT_PROFILES_COLLECTION).doc(profile.botId);
            batch.set(ref, {
                ...profile,
                isBot: true,
                seedVersion: tournament_reddit_bot_names_1.TOURNAMENT_REDDIT_BOT_SEED_VERSION,
                updatedAt: nowMs,
            }, { merge: true });
            written += 1;
        }
        await batch.commit();
    }
    console.log('[tournaments] bot profiles seeded', {
        count: written,
        overwriteRequested,
        preserveUnrelatedFields: true,
    });
    return {
        ok: true,
        count: written,
        overwrite: false,
        overwriteRequested,
        preserveUnrelatedFields: true,
    };
});
//# sourceMappingURL=tournament_bots.js.map