// Скрипт: читает все users/{uid} и обновляет leaderboard/{uid} актуальными данными
// Запуск: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/sync_leaderboard.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

function getWeekKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

async function main() {
  console.log('Читаем users...');
  const usersSnap = await db.collection('users').get();
  console.log(`Найдено ${usersSnap.size} пользователей`);

  let updated = 0;
  let skipped = 0;
  const batch_size = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const progress = doc.data()?.progress ?? {};

    const xp = parseInt(progress['user_total_xp'] ?? '0') || 0;
    const name = (progress['user_name'] ?? '').trim();
    const lang = progress['lang'] ?? 'ru';
    // Аватар вычисляется по уровню (системный, не выбирается пользователем)
    const level = Math.min(50, Math.floor(Math.sqrt(xp / 50)) + 1);
    const avatar = String(level);
    const streak = parseInt(progress['streak_count'] ?? '0') || null;

    if (!name || xp <= 0) {
      skipped++;
      continue;
    }

    const ref = db.collection('leaderboard').doc(uid);
    batch.set(ref, {
      name,
      nameLower: name.toLowerCase(),
      points: xp,
      lang,
      avatar,
      frame: null,
      streak,
      updatedAt: Date.now(),
      weekKey: getWeekKey(),
    }, { merge: true });

    updated++;
    batchCount++;

    if (batchCount >= batch_size) {
      await batch.commit();
      console.log(`Записано ${updated}...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ Готово: обновлено ${updated}, пропущено ${skipped}`);
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
