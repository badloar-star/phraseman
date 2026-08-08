"use strict";

// зачем: владелец 2026-08-02 — база 124000 для английского была легаси-точкой
// ДО того, как счётчик вообще завели. Решили: нечестно, убрать полностью.
// Разовый скрипт: вычитает ровно 124000 из completedByLanguage.en и из
// суммарного completed в english_test_public/totals, сохраняя реально
// накопленные завершения. Запускать один раз, вручную, из терминала владельца
// (после `gcloud auth application-default login`) — не вызывается кодом сайта.
const admin = require("firebase-admin");

const PROJECT_ID = "phraseman-ea0b3";
const BASELINE_TO_REMOVE = 124000;

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

(async () => {
  const docRef = db.collection("english_test_public").doc("totals");
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) {
      throw new Error("english_test_public/totals does not exist — nothing to migrate.");
    }
    const data = snapshot.data();
    const currentEn = data.completedByLanguage?.en;
    const currentTotal = data.completed;

    if (!Number.isSafeInteger(currentEn)) {
      throw new Error(`completedByLanguage.en is not a safe integer: ${currentEn}`);
    }
    if (!Number.isSafeInteger(currentTotal)) {
      throw new Error(`completed is not a safe integer: ${currentTotal}`);
    }
    if (currentEn < BASELINE_TO_REMOVE) {
      throw new Error(
        `completedByLanguage.en (${currentEn}) is already below ${BASELINE_TO_REMOVE} — ` +
        `looks like this migration already ran, or the baseline was never applied. Aborting.`,
      );
    }
    if (currentTotal < BASELINE_TO_REMOVE) {
      throw new Error(
        `completed (${currentTotal}) is already below ${BASELINE_TO_REMOVE} — aborting.`,
      );
    }

    const nextEn = currentEn - BASELINE_TO_REMOVE;
    const nextTotal = currentTotal - BASELINE_TO_REMOVE;

    transaction.update(docRef, {
      "completedByLanguage.en": nextEn,
      completed: nextTotal,
    });

    return { currentEn, nextEn, currentTotal, nextTotal };
  });

  console.log("Migration complete.");
  console.log(`  completedByLanguage.en: ${result.currentEn} -> ${result.nextEn}`);
  console.log(`  completed (total):      ${result.currentTotal} -> ${result.nextTotal}`);
})().catch((error) => {
  console.error("Migration FAILED:", error.message);
  process.exit(1);
});
