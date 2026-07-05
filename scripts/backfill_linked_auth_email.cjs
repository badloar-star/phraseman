/**
 * Backfill users/{uid}.linkedAuth.email (и .displayName) из Firebase Auth.
 *
 * Проблема: у части юзеров с provider-привязкой (google/apple) поле
 * linkedAuth.email пустое/null, хотя в Firebase Auth email есть. Из-за этого
 * админ-поиск по email (вкладки «Юзеры»/«Бета тестеры») не находит человека.
 *
 * Firebase Auth — достоверный источник email для google/apple. Скрипт читает
 * сломанные документы, батчом достаёт их auth-записи и проставляет email.
 *
 * Запуск (из корня проекта, где лежит service-account.json и node_modules):
 *   node scripts/backfill_linked_auth_email.cjs            # DRY-RUN (только показать)
 *   node scripts/backfill_linked_auth_email.cjs --apply    # реально записать
 *
 * Идемпотентен: повторный запуск ничего не трогает у уже заполненных.
 */
'use strict';

const admin = require('firebase-admin');
const sa = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const auth = admin.auth();

const APPLY = process.argv.includes('--apply');
const AUTH_BATCH = 100; // getUsers лимит

function isEmpty(v) {
  return v == null || String(v).trim() === '';
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE (запись) ===' : '=== DRY-RUN (только показать, без записи) ===');

  // 1) собираем сломанные документы — только Firestore, быстро
  const snap = await db.collection('users').where('linkedAuth.provider', 'in', ['google', 'apple']).get();
  console.log('users с provider-привязкой:', snap.size);

  const broken = []; // { stableId, authUid }
  for (const d of snap.docs) {
    const la = d.data().linkedAuth || {};
    if (!isEmpty(la.email)) continue; // уже заполнено — пропуск
    const authUid = String(d.data().firebaseAuthUid || la.providerUid || '').trim();
    if (!authUid) continue; // нечем чинить
    broken.push({ stableId: d.id, authUid });
  }
  console.log('сломанных (пустой linkedAuth.email):', broken.length);
  if (!broken.length) { console.log('нечего чинить.'); process.exit(0); }

  // 2) батчом достаём auth-записи (email/displayName)
  const authEmailByUid = new Map();
  for (let i = 0; i < broken.length; i += AUTH_BATCH) {
    const chunk = broken.slice(i, i + AUTH_BATCH);
    const res = await auth.getUsers(chunk.map((b) => ({ uid: b.authUid }))).catch(() => null);
    (res?.users || []).forEach((u) => {
      authEmailByUid.set(u.uid, { email: u.email || null, displayName: u.displayName || null });
    });
  }

  // 3) применяем
  let fixed = 0, noAuthEmail = 0;
  let batch = db.batch();
  let inBatch = 0;
  for (const b of broken) {
    const info = authEmailByUid.get(b.authUid);
    if (!info || isEmpty(info.email)) { noAuthEmail++; continue; }
    console.log(`  ${b.stableId.slice(0, 8)}  ->  ${info.email}${info.displayName ? '  (' + info.displayName + ')' : ''}`);
    fixed++;
    if (APPLY) {
      const patch = { 'linkedAuth.email': info.email };
      if (!isEmpty(info.displayName)) patch['linkedAuth.displayName'] = info.displayName;
      patch.linked_auth_email_backfilled_at = new Date().toISOString();
      batch.update(db.collection('users').doc(b.stableId), patch);
      inBatch++;
      if (inBatch >= 400) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
  }
  if (APPLY && inBatch > 0) await batch.commit();

  console.log('---');
  console.log('к починке (есть email в Auth):', fixed);
  console.log('без email в Auth (не чиним) :', noAuthEmail);
  console.log(APPLY ? `ЗАПИСАНО: ${fixed}` : 'DRY-RUN: ничего не записано. Прогони с --apply, чтобы применить.');
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
