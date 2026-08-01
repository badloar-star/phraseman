// ═══════════════════════════════════════════════════════════════════════════
// tournament_bots.ts — генерация/сид бот-персон режима «Турниры» (§3).
// adminSeedBotProfiles — admin-callable, пишет N детерминированных профилей
// в botProfiles/. Тот же набор даёт скрипт functions/scripts/seed_tournament_bots.js.
// Боты — постоянные «персонажи»: имя, аватар-эмодзи, ранг, титулы, винрейт
// из реалистичного (треугольного) распределения.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { BOT_PROFILES_COLLECTION, generateBotProfiles } from './tournament_core';
import {
  TOURNAMENT_REDDIT_BOT_PROFILE_COUNT,
  TOURNAMENT_REDDIT_BOT_SEED_VERSION,
} from './tournament_reddit_bot_names';

export const adminSeedBotProfiles = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const requestedCount = request.data?.count;
  if (requestedCount !== undefined
    && Math.trunc(Number(requestedCount)) !== TOURNAMENT_REDDIT_BOT_PROFILE_COUNT) {
    throw new HttpsError('invalid-argument', 'bot_count_must_equal_200');
  }
  const count = TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;
  const overwriteRequested = request.data?.overwrite === true;

  const db = admin.firestore();
  const profiles = generateBotProfiles(count, TOURNAMENT_REDDIT_BOT_SEED_VERSION);
  const nowMs = Date.now();

  let written = 0;
  for (let i = 0; i < profiles.length; i += 400) {
    const batch = db.batch();
    for (const profile of profiles.slice(i, i + 400)) {
      const ref = db.collection(BOT_PROFILES_COLLECTION).doc(profile.botId);
      batch.set(ref, {
        ...profile,
        isBot: true,
        seedVersion: TOURNAMENT_REDDIT_BOT_SEED_VERSION,
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
