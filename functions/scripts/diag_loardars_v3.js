// Поиск ВОЗМОЖНЫХ старых stable_id для "Loardars" (потеряны при первом логине через Google).
const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CURRENT = '608d8930-6a62-4349-a878-0298cdfc9104';
const LINKED_AT = 1777360600123; // первый Google sign-in: 2026-04-28T05:56:40Z

function ts(ms) { return ms ? new Date(Number(ms)).toISOString() : null; }

async function main() {
  // 1. Топ leaderboard — может быть «осиротевший» Loardars с большим прогрессом
  console.log('=== leaderboard: top 50 by points ===');
  const lb = await db.collection('leaderboard').orderBy('points', 'desc').limit(50).get();
  for (const d of lb.docs) {
    const data = d.data();
    if (!data.name) continue;
    console.log(d.id.slice(0, 8) + '… | ' + (data.name + ' '.repeat(15)).slice(0, 15) + ' | ' + String(data.points).padStart(7) + ' pts | lang:' + (data.lang || '-'));
  }

  // 2. Поиск по leaderboard любых имён содержащих "loard" (case-insensitive через nameLower range)
  console.log('\n=== leaderboard: nameLower начинается на "loard" ===');
  const lb2 = await db.collection('leaderboard').where('nameLower', '>=', 'loard').where('nameLower', '<', 'loard\uf8ff').get();
  for (const d of lb2.docs) {
    const data = d.data();
    console.log({ uid: d.id, name: data.name, points: data.points, lang: data.lang, lastActive: ts(data.lastActive) });
  }

  // 3. Поиск по leaderboard nameLower начинается на "лоар" / других вариантов — на случай ввода кириллицей
  for (const prefix of ['лоар', 'loar', 'loardar', 'loardars']) {
    const r = await db.collection('leaderboard').where('nameLower', '>=', prefix).where('nameLower', '<', prefix + '\uf8ff').get();
    if (r.size > 0) {
      console.log('\n=== leaderboard prefix "' + prefix + '" → ' + r.size + ' ===');
      for (const d of r.docs) {
        const data = d.data();
        console.log({ uid: d.id, name: data.name, points: data.points });
      }
    }
  }

  // 4. Все записи в name_index с похожими именами
  for (const prefix of ['loard', 'loar', 'лоар']) {
    const r = await db.collection('name_index').where(admin.firestore.FieldPath.documentId(), '>=', prefix).where(admin.firestore.FieldPath.documentId(), '<', prefix + '\uf8ff').get();
    if (r.size > 0) {
      console.log('\n=== name_index prefix "' + prefix + '" ===');
      for (const d of r.docs) {
        console.log({ id: d.id, ...d.data() });
      }
    }
  }

  // 5. Все users где user_total_xp > 4000 и avatar=5 (наш аватар) — чтобы найти потенциальный "старый" профиль с тем же аватаром
  console.log('\n=== users: avatar=5, premium, lang=uk (как наш Loardars) ===');
  const cand = await db.collection('users').where('progress.user_avatar', '==', '5').limit(200).get();
  console.log('avatar=5 candidates:', cand.size);
  const filtered = [];
  for (const d of cand.docs) {
    const p = d.data()?.progress || {};
    const xp = parseInt(p.user_total_xp || '0');
    if (xp > 1000 && d.id !== CURRENT) {
      filtered.push({
        id: d.id,
        name: p.user_name,
        xp,
        lang: p.app_lang,
        premium: p.premium_plan,
        streak: p.streak_count,
        unlocked: (p.unlocked_lessons || '').slice(0, 50),
        created_at: ts(d.data().created_at),
        updatedAt: ts(d.data().updatedAt),
        linkedAuth_email: d.data().linkedAuth?.email,
      });
    }
  }
  filtered.sort((a, b) => b.xp - a.xp);
  for (const u of filtered.slice(0, 25)) console.log(u);

  // 6. Все users без linkedAuth, но с большим XP, последняя активность ДО linkedAt — кандидаты на "Loardars-old"
  console.log('\n=== users: без linkedAuth, lang=uk, xp > 1000, активные до 2026-04-28T05:56 ===');
  const all = await db.collection('users').limit(500).get();
  console.log('scanned:', all.size);
  const candidatesNoAuth = [];
  for (const d of all.docs) {
    if (d.id === CURRENT) continue;
    const data = d.data();
    if (data.linkedAuth) continue;
    const p = data.progress || {};
    const xp = parseInt(p.user_total_xp || '0');
    if (xp < 1000) continue;
    if ((p.app_lang || '') !== 'uk') continue;
    candidatesNoAuth.push({
      id: d.id,
      name: p.user_name,
      xp,
      avatar: p.user_avatar,
      premium: p.premium_plan,
      streak: p.streak_count,
      created_at: ts(data.created_at),
      updatedAt: ts(data.updatedAt),
    });
  }
  candidatesNoAuth.sort((a, b) => b.xp - a.xp);
  console.log('кандидатов без linkedAuth и lang=uk и xp>1000:', candidatesNoAuth.length);
  for (const u of candidatesNoAuth.slice(0, 25)) console.log(u);
}

main().catch(e => { console.error(e); process.exit(1); });
