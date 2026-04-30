// Импорт arena-вопросов в Firestore
// Использование: node scripts/import_duel_questions.mjs questions_A1_fill_blank.json
//
// Требует: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
// Скачать service account: Firebase Console → Project Settings → Service Accounts

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node import_duel_questions.mjs <file.json>');
  process.exit(1);
}

const questions = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(questions)) {
  console.error('File must contain a JSON array');
  process.exit(1);
}

initializeApp({ credential: cert('./service-account.json') });
const db = getFirestore();

const BATCH_SIZE = 500;
let imported = 0;
let skipped = 0;

for (let i = 0; i < questions.length; i += BATCH_SIZE) {
  const chunk = questions.slice(i, i + BATCH_SIZE);
  const batch = db.batch();

  for (const q of chunk) {
    if (!q.id || !q.level || !q.type || !q.question || !q.correct) {
      console.warn(`Skipping invalid question: ${JSON.stringify(q).slice(0, 80)}`);
      skipped++;
      continue;
    }

    const ref = db.collection('arena_questions').doc(q.id);
    batch.set(ref, q, { merge: false });
    imported++;
  }

  await batch.commit();
  console.log(`Imported ${imported} / ${questions.length}...`);
}

console.log(`Done. Imported: ${imported}, skipped: ${skipped}`);
