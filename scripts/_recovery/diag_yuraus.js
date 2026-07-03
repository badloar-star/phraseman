/**
 * diag_yuraus.js — READ-ONLY диагностика потери аккаунта (кейс Yuraus, 1.5.41).
 *
 * Контекст: после halt-rollback 1.5.44 → 1.5.41 пользователи на 1.5.41 при входе
 * через Google/Apple НЕ попадают в свой аккаунт — создаётся новый. Crashlytics:
 * `transaction_[firestore/unknown] PERMISSION_DENIED` (Feature: auth).
 * UID из репорта (это Firebase Auth uid, НЕ stable_id): ae9fee12-34e8-46c8-8c17-d88e27268a5e
 *
 * Гипотеза: клиентская транзакция 1.5.41 пишет в старый users/{remoteStableId},
 * правила режут по mismatch firebaseAuthUid. auth_links/{providerUid} либо
 * указывает на старый stableId (тогда вход должен был свапнуться, но транзакция
 * упала), либо был перезаписан на новый локальный stableId.
 *
 * Скрипт НИЧЕГО НЕ МЕНЯЕТ. Только читает и печатает реальное состояние, чтобы
 * подтвердить механику ДО изменения прод-правил.
 *
 * Запуск:
 *   node scripts/_recovery/diag_yuraus.js
 *
 * Требует: service-account.json в корне проекта.
 */

const admin = require('firebase-admin');
const path = require('path');

const SA_PATH = path.resolve(__dirname, '..', '..', 'service-account.json');
const serviceAccount = require(SA_PATH);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Из репорта. ВНИМАНИЕ: это поле UID в bug-report = текущий Firebase Auth uid
// активной (новой) сессии, под которым летел Critical. Это НЕ обязательно stable_id.
const REPORT_AUTH_UID = 'ae9fee12-34e8-46c8-8c17-d88e27268a5e';
const NAME_HINT = 'Yuraus';

function j(x) { return JSON.stringify(x, null, 2); }
function short(id) { return String(id || '').replace(/-/g, '').slice(-4).toLowerCase(); }

async function dumpUserDoc(label, id) {
  if (!id) { console.log(`  ${label}: (нет id)`); return null; }
  const snap = await db.collection('users').doc(id).get().catch((e) => { console.log(`  ${label}: read error ${e.code}`); return null; });
  if (!snap || !snap.exists) { console.log(`  ${label}: users/${id} — НЕ существует`); return null; }
  const d = snap.data() || {};
  const p = d.progress || {};
  console.log(`  ${label}: users/${id} (#${short(id)})`);
  console.log(`     firebaseAuthUid = ${d.firebaseAuthUid || null}`);
  console.log(`     linkedAuth      = ${j(d.linkedAuth || null)}`);
  console.log(`     name            = ${JSON.stringify(p.user_name || d.name || d.displayName || '')}`);
  console.log(`     xp/level/streak = ${p.user_total_xp || 0} / ${p.level || 0} / ${p.streak_count || 0}`);
  console.log(`     identityHidden  = ${d.identityHidden === true}  canonicalStableId = ${d.canonicalStableId || null}`);
  console.log(`     created_at/updatedAt = ${d.created_at || null} / ${d.updatedAt || p.updatedAt || null}`);
  return { id, data: d };
}

async function main() {
  console.log('=== READ-ONLY диагностика: Yuraus / 1.5.41 потеря аккаунта ===\n');
  console.log(`Report auth uid: ${REPORT_AUTH_UID}\n`);

  // 1) Документ напрямую по report-uid (legacy-схема: stableId == authUid)
  console.log('[1] users/{reportAuthUid} напрямую (legacy stableId==uid):');
  await dumpUserDoc('direct', REPORT_AUTH_UID);
  console.log('');

  // 2) Все users, где firebaseAuthUid == reportAuthUid (текущая сессия владеет ими)
  console.log('[2] users где firebaseAuthUid == reportAuthUid (кем владеет текущая сессия):');
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', REPORT_AUTH_UID).limit(20).get().catch(() => null);
  if (!byAuth || byAuth.empty) {
    console.log('  — НЕТ ни одного. Значит текущий uid не привязан ни к какому users-доку → новая пустая сессия.');
  } else {
    for (const doc of byAuth.docs) await dumpUserDoc('owned', doc.id);
  }
  console.log('');

  // 3) auth_links/{reportAuthUid} — куда указывает привязка текущего uid
  console.log('[3] auth_links/{reportAuthUid} (куда указывает текущий провайдер uid):');
  const linkSnap = await db.collection('auth_links').doc(REPORT_AUTH_UID).get().catch(() => null);
  if (!linkSnap || !linkSnap.exists) {
    console.log('  — auth_links/{reportAuthUid} НЕ существует.');
  } else {
    const ld = linkSnap.data() || {};
    console.log(`  stable_id=${ld.stable_id}  provider=${ld.provider}  email=${ld.email}  providerUid=${ld.providerUid}`);
    console.log(`  lastSignInAt=${ld.lastSignInAt}  linkedAt=${ld.linkedAt}`);
    console.log('  → проверяю целевой users-док привязки:');
    await dumpUserDoc('linked-target', ld.stable_id);
  }
  console.log('');

  // 4) Поиск всех auth_links, где email/displayName ~ Yuraus (другие устройства/привязки)
  console.log('[4] auth_links по имени/похожие (скан, ограниченный):');
  try {
    const links = await db.collection('auth_links').limit(5000).get();
    let hits = 0;
    for (const l of links.docs) {
      const d = l.data() || {};
      const hay = `${d.email || ''} ${d.displayName || ''}`.toLowerCase();
      if (hay.includes(NAME_HINT.toLowerCase())) {
        hits += 1;
        console.log(`  link ${l.id}: provider=${d.provider} email=${d.email} displayName=${d.displayName} stable_id=${d.stable_id}`);
        if (hits >= 15) { console.log('  …(обрезано)'); break; }
      }
    }
    if (hits === 0) console.log('  — по имени совпадений в auth_links не найдено (email мог быть пустым).');
  } catch (e) {
    console.log('  скан auth_links не удался:', e.code || e.message);
  }
  console.log('');

  console.log('=== ВЫВОД (интерпретация) ===');
  console.log('• Если [2] пусто И [3] указывает на старый users-док с БОЛЬШИМ xp, чей firebaseAuthUid');
  console.log('  != reportAuthUid → это ровно баг: привязка есть, но запись в старый док режется правилами.');
  console.log('• Если [3] нет, а старый аккаунт виден только в [4]/по имени → auth_links затёрт, нужен recovery.');
  console.log('• Если [1]/[2] показывает свежий пустой док с created_at ~ времени репорта → это «новый аккаунт».');
}

main().then(() => process.exit(0)).catch((err) => { console.error('FATAL:', err); process.exit(1); });
