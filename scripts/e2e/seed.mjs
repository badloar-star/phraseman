// E2E-сидинг в ЭМУЛЯТОРЫ (Auth+Firestore) проекта demo-phraseman. Боевой проект недостижим: адреса эмуляторов заданы переменными окружения.
//   node scripts/e2e/seed.mjs
// Создаёт: «ветеран» (уроки 1–9 пройдены, открыты 1–10) и «новичок» (пустой). Пароль — только для эмулятора.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(root, 'functions', 'package.json'));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'demo-phraseman' });

const PASSWORD = process.env.E2E_PASSWORD || 'e2e-local-emulator-only'; // guard-ok: пароль тестовых аккаунтов ЭМУЛЯТОРА, не секрет
async function ensureUser(email, displayName) {
  try { return await admin.auth().getUserByEmail(email); }
  catch { return admin.auth().createUser({ email, password: PASSWORD, displayName, emailVerified: true }); }
}

const veteran = await ensureUser('veteran@e2e.test', 'E2E Ветеран');
const newbie = await ensureUser('newbie@e2e.test', 'E2E Новичок');
const db = admin.firestore();
const progress = { unlocked_lessons: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) };
for (let i = 1; i <= 9; i += 1) { progress[`lesson${i}_best_score`] = '5'; progress[`lesson${i}_pass_count`] = '1'; }
await db.collection('users').doc(veteran.uid).set({ progress, onboarding_done: true, studyTarget: 'en', createdAt: Date.now() }, { merge: true });
await db.collection('users').doc(newbie.uid).set({ progress: {}, createdAt: Date.now() }, { merge: true });
await db.collection('config').doc('spire_v1').set({ rankBy: 'coins', coins: { promotionBonus: 1000 } }, { merge: true });
console.log('[E2E-SEED] готово', JSON.stringify({ veteran: veteran.uid, newbie: newbie.uid, project: 'demo-phraseman' }));
process.exit(0);
