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

const DEFAULT_BOT_COUNT = 200;
const MAX_BOT_COUNT = 1000;
const BOT_SEED = 'tournament-bots-v1';

export const adminSeedBotProfiles = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const count = Math.min(
    MAX_BOT_COUNT,
    Math.max(1, Math.trunc(Number(request.data?.count)) || DEFAULT_BOT_COUNT),
  );
  const overwrite = request.data?.overwrite === true;

  const db = admin.firestore();
  const profiles = generateBotProfiles(count, BOT_SEED);
  const nowMs = Date.now();

  let written = 0;
  for (let i = 0; i < profiles.length; i += 400) {
    const batch = db.batch();
    for (const profile of profiles.slice(i, i + 400)) {
      const ref = db.collection(BOT_PROFILES_COLLECTION).doc(profile.botId);
      batch.set(ref, {
        ...profile,
        isBot: true,
        seedVersion: BOT_SEED,
        updatedAt: nowMs,
      }, { merge: overwrite });
      written += 1;
    }
    await batch.commit();
  }

  console.log('[tournaments] bot profiles seeded', { count: written, overwrite });
  return { ok: true, count: written, overwrite };
});
