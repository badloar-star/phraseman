import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const questions = JSON.parse(readFileSync('./assets/arena_questions_a1.json', 'utf8'));

console.log(`Uploading ${questions.length} A1 questions to Firestore...`);

const BATCH_SIZE = 500;
let uploaded = 0;

for (let i = 0; i < questions.length; i += BATCH_SIZE) {
  const batch = db.batch();
  const chunk = questions.slice(i, i + BATCH_SIZE);

  for (const q of chunk) {
    const ref = db.collection('arena_questions').doc(q.id);
    batch.set(ref, q);
  }

  await batch.commit();
  uploaded += chunk.length;
  console.log(`  ${uploaded}/${questions.length} uploaded`);
}

console.log('Done!');
process.exit(0);
