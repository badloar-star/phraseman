/**
 * fix_olga.js — восстановление cloud-sync доступа для OlgaZ (#1c2b).
 *
 * Диагноз (см. сессию):
 *   users/18274995-0d6b-4fe5-b92b-078f51ab1c2b — её настоящий stable_id.
 *   В облаке xp=0, но локально на её iPhone лежит 356374 XP / Lv42 / streak 8.
 *   Облачный док прибит к СТАРОЙ Firebase-сессии (firebaseAuthUid=HJ9FV4kPHYag1nxsC2COKinkcmj2).
 *   Её текущая (после обновления) анонимная сессия имеет ДРУГОЙ auth.uid →
 *   server-side authEnsureStableLink/assertStableOwner упирается в mismatch,
 *   а клиентский cloud_sync.set() блокируется firestore.rules (firebaseAuthUid != auth.uid).
 *   Итог: её прогресс НЕ заливается в облако. «Потеряла полный доступ».
 *
 * Лечение (минимально-инвазивное, выбрано владельцем):
 *   Стереть firebaseAuthUid (+ updatedAt) в users/{stableId} и в leaderboard/{stableId}.
 *   После этого assertStableOwner (functions/src/auth_identity.ts:152) при пустом
 *   userAuthUid БЕЗУСЛОВНО разрешает перепривязку любой сессии. При следующем запуске
 *   приложения её телефон вызовет authEnsureStableLink → перепривяжет её текущий
 *   auth.uid к этому stable_id → cloud_sync зальёт локальные 356374 XP в облако.
 *
 * НЕ трогаем: progress (xp/vip/premium), shards, VIP. Только identity-привязку.
 *
 * Бэкап текущего состояния пишется в scripts/_recovery/backup_olga_<ts>.json ДО записи.
 *
 * Запуск:
 *   node scripts/_recovery/fix_olga.js            # dry-run (только покажет план)
 *   node scripts/_recovery/fix_olga.js --execute  # реальная запись
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const STABLE_ID = '18274995-0d6b-4fe5-b92b-078f51ab1c2b';
const EXPECTED_NAME = 'OlgaZ';
const EXECUTE = process.argv.includes('--execute');

async function main() {
  console.log('=== fix_olga.js ===');
  console.log(`stableId: ${STABLE_ID}`);
  console.log(`режим: ${EXECUTE ? 'EXECUTE (реальная запись)' : 'DRY-RUN (без записи)'}\n`);

  const userRef = db.collection('users').doc(STABLE_ID);
  const lbRef = db.collection('leaderboard').doc(STABLE_ID);
  const [userSnap, lbSnap] = await Promise.all([userRef.get(), lbRef.get()]);

  if (!userSnap.exists) {
    console.error('❌ users-док не найден — СТОП. Проверь stableId.');
    process.exit(1);
  }
  const u = userSnap.data() || {};
  const p = u.progress || {};
  const name = String(p.user_name || u.name || u.displayName || '').trim();

  // Safety check — это точно ОНА?
  console.log('--- Текущее состояние ---');
  console.log(`name=${JSON.stringify(name)} (ожидали "${EXPECTED_NAME}")`);
  console.log(`progress.user_total_xp=${p.user_total_xp}  streak=${p.streak_count}  level=${p.level}`);
  console.log(`firebaseAuthUid=${u.firebaseAuthUid}`);
  console.log(`vip_active=${p.vip_active}  vip_plan=${p.vip_plan}  vip_until=${p.vip_until}  had_premium_ever=${p.had_premium_ever}`);
  console.log(`identityHidden=${u.identityHidden}  canonicalStableId=${u.canonicalStableId}`);
  console.log(`leaderboard-док существует: ${lbSnap.exists}  firebaseAuthUid=${lbSnap.data()?.firebaseAuthUid}`);
  console.log('');

  if (name.toLowerCase() !== EXPECTED_NAME.toLowerCase()) {
    console.error(`❌ Имя "${name}" != "${EXPECTED_NAME}" — СТОП, чтобы не задеть чужой аккаунт.`);
    process.exit(1);
  }
  if (u.identityHidden === true) {
    console.error('❌ Этот док помечен identityHidden (tombstone) — СТОП, нужен другой подход.');
    process.exit(1);
  }

  // Backup ДО записи.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, `backup_olga_${ts}.json`);
  const backup = {
    backedUpAtISO: new Date().toISOString(),
    stableId: STABLE_ID,
    users_doc: u,
    leaderboard_doc: lbSnap.exists ? lbSnap.data() : null,
  };
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`📦 Бэкап текущего состояния: ${backupPath}\n`);

  console.log('--- План записи ---');
  console.log(`users/${STABLE_ID}: УДАЛИТЬ поле firebaseAuthUid (FieldValue.delete), set updatedAt=now`);
  if (lbSnap.exists && lbSnap.data()?.firebaseAuthUid) {
    console.log(`leaderboard/${STABLE_ID}: УДАЛИТЬ поле firebaseAuthUid, set updatedAt=now`);
  } else {
    console.log(`leaderboard/${STABLE_ID}: firebaseAuthUid пуст/нет дока — пропуск`);
  }
  console.log('progress / vip / shards: НЕ ТРОГАЕМ\n');

  if (!EXECUTE) {
    console.log('DRY-RUN: ничего не записано. Запусти с --execute чтобы применить.');
    process.exit(0);
  }

  const now = Date.now();
  await userRef.set({
    firebaseAuthUid: admin.firestore.FieldValue.delete(),
    updatedAt: now,
    identityRecoveryAt: now,
    identityRecoveryReason: 'olga_1c2b_cloud_sync_unblock',
  }, { merge: true });
  console.log('✅ users-док: firebaseAuthUid стёрт.');

  if (lbSnap.exists && lbSnap.data()?.firebaseAuthUid) {
    await lbRef.set({
      firebaseAuthUid: admin.firestore.FieldValue.delete(),
      updatedAt: now,
    }, { merge: true });
    console.log('✅ leaderboard-док: firebaseAuthUid стёрт.');
  }

  // verify
  const after = (await userRef.get()).data() || {};
  console.log(`\n--- После записи ---`);
  console.log(`firebaseAuthUid=${after.firebaseAuthUid}  (должно быть undefined)`);
  console.log(`progress.user_total_xp=${(after.progress || {}).user_total_xp}  vip_plan=${(after.progress || {}).vip_plan}`);
  console.log('\n✅ ГОТОВО. Теперь Ольге нужно ОДИН раз открыть приложение на iPhone (с интернетом).');
  console.log('   Её телефон перепривяжет сессию и зальёт 356374 XP в облако.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
