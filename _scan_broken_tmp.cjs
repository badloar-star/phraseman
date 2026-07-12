const admin = require('firebase-admin');
const sa = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const auth = admin.auth();
(async () => {
  // все юзеры с provider-привязкой (linkedAuth.provider != null)
  const snap = await db.collection('users').where('linkedAuth.provider', 'in', ['google','apple']).get();
  console.log('users with provider link:', snap.size);
  let broken = 0, fixable = 0, noAuthEmail = 0;
  const sample = [];
  for (const d of snap.docs) {
    const la = d.data().linkedAuth || {};
    const emailEmpty = !la.email || String(la.email).trim() === '';
    if (!emailEmpty) continue;
    broken++;
    const authUid = d.data().firebaseAuthUid || la.providerUid;
    let authEmail = null;
    if (authUid) { try { authEmail = (await auth.getUser(authUid)).email || null; } catch {} }
    if (authEmail) { fixable++; if (sample.length<8) sample.push({uid:d.id.slice(0,8), authEmail}); }
    else noAuthEmail++;
  }
  console.log('broken (empty linkedAuth.email):', broken);
  console.log('  fixable from Firebase Auth   :', fixable);
  console.log('  no email in Auth either      :', noAuthEmail);
  console.log('sample fixable:', JSON.stringify(sample, null, 2));
  process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
