/**
 * sim_assert_owner_tailF.js — READ-ONLY: проверяем, реально ли assertStableOwner
 * ошибочно отклоняет провайдер-входы (хвост F). Сканируем users c provider-привязкой
 * и считаем, у скольких firebaseAuthUid рассинхронен с linkedAuth.providerUid, но при
 * этом auth_links указывает на них (т.е. вход ДОЛЖЕН пройти, но мог бы упасть, если бы
 * не auth_links-ветка). Это покажет, нужна ли доп. правка или текущих веток достаточно.
 */
const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Реплика логики assertStableOwner(authUid, stableId)
function assertOwnerVerdict({ stableId, authUid, userData, authLinkOfAuthUid }) {
  if (stableId === authUid) return 'OK:legacy_uid_eq_stable';
  const userAuthUid = String(userData?.firebaseAuthUid ?? '').trim();
  if (!userAuthUid || userAuthUid === authUid) return 'OK:firebaseAuthUid_match_or_empty';
  const linkedStableId = String(authLinkOfAuthUid?.stable_id ?? '').trim();
  if (linkedStableId === stableId) return 'OK:auth_links_points_here';
  const la = userData?.linkedAuth;
  const linkedAuthUid = la && typeof la === 'object' && typeof la.providerUid === 'string'
    ? String(la.providerUid).trim() : '';
  if (linkedAuthUid === authUid) return 'OK:linkedAuth_providerUid_match';
  return 'DENIED:stable_id_mismatch';
}

(async () => {
  console.log('Скан users с provider-привязкой (linkedAuth.providerUid) — выборка до 3000…');
  const snap = await db.collection('users').limit(3000).get();
  let total = 0, withProvider = 0, desync = 0, deniedIfNoAuthLinks = 0, examples = [];
  for (const doc of snap.docs) {
    total += 1;
    const d = doc.data() || {};
    const la = d.linkedAuth;
    const provUid = la && typeof la === 'object' && typeof la.providerUid === 'string' ? String(la.providerUid).trim() : '';
    if (!provUid) continue;
    withProvider += 1;
    const userAuthUid = String(d.firebaseAuthUid ?? '').trim();
    // Сценарий хвоста F: вход под providerUid (authUid=provUid), firebaseAuthUid рассинхрон
    if (userAuthUid && userAuthUid !== provUid) {
      desync += 1;
      // Проверяем, спасает ли auth_links/{provUid}
      const al = await db.collection('auth_links').doc(provUid).get().catch(() => null);
      const alData = al && al.exists ? al.data() : null;
      const verdict = assertOwnerVerdict({ stableId: doc.id, authUid: provUid, userData: d, authLinkOfAuthUid: alData });
      if (verdict.startsWith('DENIED')) {
        deniedIfNoAuthLinks += 1;
        if (examples.length < 8) examples.push({ id: doc.id.slice(0,8), userAuthUid: userAuthUid.slice(0,8), provUid: provUid.slice(0,8), authLinks: alData ? alData.stable_id?.slice(0,8) : null, verdict });
      }
    }
  }
  console.log(`\nВсего просканировано users: ${total}`);
  console.log(`С provider-привязкой (linkedAuth.providerUid): ${withProvider}`);
  console.log(`Из них firebaseAuthUid рассинхрон с providerUid: ${desync}`);
  console.log(`Из них РЕАЛЬНО упали бы (DENIED даже с учётом auth_links): ${deniedIfNoAuthLinks}`);
  if (examples.length) {
    console.log('\nПримеры реально проблемных (хвост F подтверждён):');
    for (const e of examples) console.log(`  users/${e.id}… fbAuth=${e.userAuthUid}… prov=${e.provUid}… auth_links→${e.authLinks}… ${e.verdict}`);
  } else {
    console.log('\nРеально проблемных НЕ найдено: текущие ветки (auth_links / linkedAuth) уже покрывают provider-входы.');
  }
})().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
