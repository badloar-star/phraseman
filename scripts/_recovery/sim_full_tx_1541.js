/**
 * sim_full_tx_1541.js — READ-ONLY симуляция ВСЕХ операций транзакции входа 1.5.41
 * против реальных данных Yuraus и текущих firestore.rules (после фикса R1).
 *
 * Цель: доказать, что с разрешением read несуществующего дока (R1) транзакция
 * 1.5.41 проходит ЦЕЛИКОМ (все read + все write), и старый аккаунт подхватывается.
 * Плюс контроль безопасности: чтение/запись ЧУЖОГО существующего дока остаётся DENIED.
 *
 * Это логический симулятор (не реальный rules-engine): он применяет те же условия,
 * что в firestore.rules, к фактическим данным из Firestore. Запись НЕ выполняется.
 */
const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const AUTH_UID = 'OQ6sKFWdL0gfknUzQX4sQhFNMOE2'; // request.auth.uid (Google) Yuraus
const REMOTE = 'ae9fee12-34e8-46c8-8c17-d88e27268a5e'; // старый аккаунт (linked)
const LOCAL_FAKE = '00000000-aaaa-bbbb-cccc-1234567890ab'; // НОВЫЙ localStableId свежей установки (не существует)
const SOMEONE_ELSE = null; // заполним ниже реальным чужим доком для контроля

async function userDoc(id) {
  const s = await db.collection('users').doc(id).get().catch(() => null);
  return s && s.exists ? s.data() : null;
}
async function authLink(uid) {
  const s = await db.collection('auth_links').doc(uid).get().catch(() => null);
  return s && s.exists ? s.data() : null;
}

// Реплики условий из firestore.rules
function isOwner(userId) { return AUTH_UID === userId; }
function stableUserMatchesAuth(userDocData) {
  return !!userDocData && typeof userDocData.firebaseAuthUid === 'string' && userDocData.firebaseAuthUid === AUTH_UID;
}
function authLinkMapsToUser(userId, linkOfAuth) {
  return !!linkOfAuth && linkOfAuth.stable_id === userId;
}
function userDocOwnerMatchesAuth(userId, userDocData, linkOfAuth) {
  return isOwner(userId) || stableUserMatchesAuth(userDocData) || authLinkMapsToUser(userId, linkOfAuth);
}
function userDocMissing(userDocData) { return userDocData === null; } // R1

async function main() {
  const linkOfAuth = await authLink(AUTH_UID); // auth_links/{OQ6sKFWd}
  const remoteData = await userDoc(REMOTE);
  const localData = await userDoc(LOCAL_FAKE); // должен быть null

  console.log('=== Контекст ===');
  console.log('auth_links/{OQ6sKFWd}.stable_id =', linkOfAuth && linkOfAuth.stable_id);
  console.log('users/ae9fee12 firebaseAuthUid =', remoteData && remoteData.firebaseAuthUid, ' xp=', (remoteData&&remoteData.progress&&remoteData.progress.user_total_xp));
  console.log('users/{LOCAL_FAKE} exists =', localData !== null, '(ожидаем false)');
  console.log('');

  console.log('=== Транзакция 1.5.41: проверяем КАЖДУЮ операцию ===');

  // tx.get(linkRef = auth_links/{OQ6sKFWd}) — read auth_links own
  const readLink = (linkOfAuth !== null) && (AUTH_UID === AUTH_UID); // ownsAuthLinkDoc
  console.log(`1) tx.get(auth_links/{OQ6sKFWd})  → read ${readLink ? 'OK' : 'DENIED'} (ownsAuthLinkDoc)`);

  // tx.get(users/{localStableId}) — БЫЛ корнем падения
  const readLocalOld = userDocOwnerMatchesAuth(LOCAL_FAKE, localData, linkOfAuth);
  const readLocalNew = readLocalOld || userDocMissing(localData);
  console.log(`2) tx.get(users/{localStableId}) → ДО фикса: ${readLocalOld ? 'OK' : 'DENIED ❌'} | ПОСЛЕ R1: ${readLocalNew ? 'OK ✅' : 'DENIED'}`);

  // tx.get(users/{remoteStableId=ae9fee12}) — read через authLinkMapsToUser
  const readRemote = userDocOwnerMatchesAuth(REMOTE, remoteData, linkOfAuth);
  console.log(`3) tx.get(users/ae9fee12)        → read ${readRemote ? 'OK ✅' : 'DENIED ❌'} (authLinkMapsToUser/stableUserMatchesAuth)`);

  // remoteXP >= localXP → ветка merged_swap_to_remote
  const remoteXP = parseInt((remoteData&&remoteData.progress&&remoteData.progress.user_total_xp) || '0', 10) || 0;
  const localXP = 0; // нового дока нет
  const swap = remoteXP >= localXP;
  console.log(`   remoteXP=${remoteXP} >= localXP=${localXP} → ветка ${swap ? 'merged_swap_to_remote' : 'merged_keep_local'}`);

  // tx.update(auth_links/{OQ6sKFWd}, {email,displayName,lastSignInAt,devicePlatform})
  const updFields = ['email','displayName','lastSignInAt','devicePlatform'];
  const allowedLinkFields = ['stable_id','email','displayName','lastSignInAt','devicePlatform','providerUid','provider','linkedAt'];
  const linkUpdateHasOnly = updFields.every(f => allowedLinkFields.includes(f));
  const linkUpdateOwns = AUTH_UID === AUTH_UID;
  console.log(`4) tx.update(auth_links/{OQ6sKFWd}) → ${(linkUpdateOwns && linkUpdateHasOnly) ? 'OK ✅' : 'DENIED ❌'} (ownsAuthLinkDoc + hasOnly whitelist)`);

  // tx.set(users/ae9fee12, {linkedAuth, firebaseAuthUid, updatedAt}, {merge}) → update
  // allow update: userDocOwnerMatchesAuth(ae9fee12) && progressHasNoPremiumWrites && hasNoShardWrites
  const writeRemoteOwner = userDocOwnerMatchesAuth(REMOTE, remoteData, linkOfAuth);
  const touchesProgress = false; // пишем только linkedAuth/firebaseAuthUid/updatedAt
  const touchesShards = false;
  const writeRemote = writeRemoteOwner && !touchesProgress && !touchesShards;
  console.log(`5) tx.set(users/ae9fee12,{linkedAuth,firebaseAuthUid,updatedAt}) → ${writeRemote ? 'OK ✅' : 'DENIED ❌'} (owner + no premium/shard writes)`);

  const txPasses = readLink && readLocalNew && readRemote && (linkUpdateOwns && linkUpdateHasOnly) && writeRemote;
  console.log('');
  console.log(`>>> ИТОГ ТРАНЗАКЦИИ (после R1): ${txPasses ? 'ПРОХОДИТ ЦЕЛИКОМ ✅ — Yuraus попадёт в свой аккаунт' : 'ВСЁ ЕЩЁ ПАДАЕТ ❌'}`);
  console.log(`>>> ДО R1 транзакция падала на шаге 2 (read нового localStableId).`);

  console.log('');
  console.log('=== Контроль безопасности: чужой СУЩЕСТВУЮЩИЙ док ===');
  // Берём любой существующий чужой док (НЕ ae9fee12, с непустым firebaseAuthUid != AUTH_UID)
  const others = await db.collection('users').where('firebaseAuthUid', '!=', AUTH_UID).limit(1).get().catch(() => null);
  if (others && !others.empty) {
    const od = others.docs[0];
    const odData = od.data();
    const odLink = linkOfAuth; // наша auth_links/{OQ6sKFWd}
    const readOther = userDocOwnerMatchesAuth(od.id, odData, odLink) || userDocMissing(odData);
    console.log(`Чужой users/${od.id} (firebaseAuthUid=${String(odData.firebaseAuthUid).slice(0,8)}…, exists=true):`);
    console.log(`  read нашим uid (OQ6sKFWd) = ${readOther ? 'OK ❌ УТЕЧКА!' : 'DENIED ✅ (R1 не раскрывает существующие чужие доки)'}`);
  } else {
    console.log('  (не нашёл чужой док для контроля — пропуск)');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
