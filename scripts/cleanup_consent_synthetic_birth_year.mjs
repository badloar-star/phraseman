#!/usr/bin/env node
/**
 * Разовая очистка: удаляет синтетический birthYear из user_consents.
 *
 * Причина: онбординг спрашивает только «есть ли тебе 16» (бинарный self-attestation),
 * года рождения приложение НЕ спрашивает. Но старые сборки синтезировали фиктивный
 * год (текущий год − 16) и писали его в user_consents как персональные данные:
 * у всех прошедших онбординг он одинаковый, для учёта бесполезен, а в админке
 * выглядел как настоящий возраст. По GDPR ст. 5(1)(c) (минимизация данных) хранить
 * такое поле нечем оправдать.
 *
 * Клиент уже исправлен (app/age_consent_cloud.ts пишет birthYear: null), но затрёт
 * значение только у тех, кто заново обновит согласие. Этот скрипт чистит историю.
 *
 * Возрастную метку ageBracket НЕ трогаем — это и есть законное основание
 * (accountability по GDPR ст. 8), её терять нельзя.
 *
 *   node scripts/cleanup_consent_synthetic_birth_year.mjs           # dry-run (только показывает)
 *   node scripts/cleanup_consent_synthetic_birth_year.mjs --apply   # реально удалить
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');

if (admin.apps.length === 0) {
  let projectId; try { projectId = JSON.parse(readFileSync('.firebaserc','utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json','utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

const PAGE = 300;          // размер страницы чтения
const BATCH_LIMIT = 400;   // запас под лимит Firestore в 500 операций на батч

// зачем: считаем распределение годов — если все записи несут один и тот же год,
// это прямое подтверждение, что значение синтетическое, а не введённое человеком.
const yearHistogram = new Map();

let scanned = 0, toClear = 0, cleared = 0;
let lastDoc = null;
let batch = db.batch();
let batchOps = 0;

async function flushBatch() {
  if (batchOps === 0) return;
  if (APPLY) await batch.commit();
  cleared += batchOps;
  batch = db.batch();
  batchOps = 0;
}

while (true) {
  // зачем: постранично по __name__ вместо выкачивания всей коллекции — держим
  // память и стоимость чтений под контролем на любом размере базы.
  let q = db.collection('user_consents').orderBy('__name__').limit(PAGE);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;
  lastDoc = snap.docs[snap.docs.length - 1];

  for (const doc of snap.docs) {
    scanned++;
    const birthYear = doc.data()?.birthYear;
    // null/отсутствие — уже чисто (новый клиент или прошлая прогонка).
    if (birthYear === null || birthYear === undefined) continue;

    toClear++;
    yearHistogram.set(birthYear, (yearHistogram.get(birthYear) ?? 0) + 1);
    console.log(`  ${doc.id.slice(0, 14)}… birthYear=${birthYear} → удаляем`);

    batch.update(doc.ref, { birthYear: admin.firestore.FieldValue.delete() });
    batchOps++;
    if (batchOps >= BATCH_LIMIT) await flushBatch();
  }

  if (snap.size < PAGE) break;
}
await flushBatch();

console.log(`\nПросмотрено документов: ${scanned}. С синтетическим годом: ${toClear}.`);
if (yearHistogram.size > 0) {
  const rows = [...yearHistogram.entries()].sort((a, b) => b[1] - a[1]);
  console.log('Распределение значений birthYear:');
  for (const [year, count] of rows) console.log(`  ${year}: ${count}`);
  if (rows.length <= 2) {
    console.log('  ↑ значений один-два на всю базу — подтверждает, что год синтетический.');
  }
}
console.log(APPLY
  ? `✓ Применено. Поле birthYear удалено у ${cleared} документов. ageBracket не тронут.`
  : '\n[dry-run] Ничего не записано. Добавь --apply, чтобы применить.');
process.exit(0);
