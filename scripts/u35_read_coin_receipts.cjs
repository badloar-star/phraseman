// U35: ТОЛЬКО ЧТЕНИЕ — расписки журнала монет аккаунта (до 40 последних).
const path = require('path');
const root = process.cwd();
const admin = require(path.join(root, 'functions/node_modules/firebase-admin'));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(root, 'service-account.json'))) });
const db = admin.firestore();
(async () => {
  for (const email of process.argv.slice(2)) {
    const authUid = (await admin.auth().getUserByEmail(email)).uid;
    const link = await db.collection('auth_links').doc(authUid).get();
    const stable = (link.exists && link.get('stable_id')) || authUid;
    const ops = await db.collection('users').doc(stable).collection('star_operations').orderBy('seq', 'desc').limit(40).get();
    console.log(`\n[${email.replace(/(.).*@/, '$1…@')}] расписок: ${ops.size}`);
    for (const d of ops.docs.reverse()) {
      const r = d.data();
      const iso = (ms) => (ms ? new Date(ms).toISOString().slice(5, 16).replace('T', ' ') : '—');
      console.log(`  seq=${String(r.seq).padStart(2)} ${iso(r.serverAtMs)} (заработано ${iso(r.earnedAtMs)}) ${String(r.delta).padStart(5)} ${String(r.opClass).padEnd(5)} ${String(r.reason).padEnd(18)} ${String(r.sourceKind).padEnd(28)} неделя=${r.weekKey} weekEarnedAfter=${r.weekEarnedAfter} баланс=${r.balanceAfter} gift=${(r.meta && r.meta.giftId) || ''}`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error('СБОЙ ЧТЕНИЯ:', e && (e.message || e)); process.exit(1); });
