/**
 * scripts/backfill_rand_a1_firestore.mjs — точечный бэкфилл поля `rand` для
 * A1-вопросов В FIRESTORE (prod), у которых его нет.
 *
 * Контекст: A1 заливался без `rand` (см. add_rand_to_a1.mjs). Запросы выборки
 * фильтруют `.where('rand','>=',pivot).orderBy('rand')` — документы без `rand`
 * не возвращаются вовсе → A1-комнаты падали в FALLBACK, рейтинг bronze ломался.
 *
 * Этот скрипт читает все level==A1 и проставляет `rand` тем, у кого его нет.
 * rand детерминированный из id (тот же randFromId, что в JSON-сборщиках), так
 * что Firestore и assets/arena_questions_a1.json получают ОДИНАКОВЫЕ значения.
 * Идемпотентен: уже проставленные пропускаются (merge update только rand).
 *
 * Запуск: node scripts/backfill_rand_a1_firestore.mjs
 * Креды: ./service-account.json если есть, иначе Application Default Credentials
 * (firebase CLI / GOOGLE_APPLICATION_CREDENTIALS) — как backfill_unique_name_index.mjs.
 */
import { existsSync, readFileSync } from 'fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SA_PATH = './service-account.json';
const credential = existsSync(SA_PATH)
  ? cert(JSON.parse(readFileSync(SA_PATH, 'utf8')))
  : applicationDefault();

initializeApp({ credential, projectId: 'phraseman-ea0b3' });
const db = getFirestore();

function randFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

const snap = await db.collection('arena_questions').where('level', '==', 'A1').get();
console.log(`A1 docs in Firestore: ${snap.size}`);

let need = 0;
const BATCH_SIZE = 400;
let batch = db.batch();
let inBatch = 0;

for (const doc of snap.docs) {
  const data = doc.data() || {};
  if (typeof data.rand === 'number' && Number.isFinite(data.rand)) continue;
  need += 1;
  batch.update(doc.ref, { rand: randFromId(String(data.id ?? doc.id)) });
  inBatch += 1;
  if (inBatch >= BATCH_SIZE) {
    await batch.commit();
    console.log(`  committed ${need}`);
    batch = db.batch();
    inBatch = 0;
  }
}
if (inBatch > 0) await batch.commit();

console.log(`Done. Backfilled rand for ${need} A1 docs (skipped ${snap.size - need} already-set).`);
process.exit(0);
