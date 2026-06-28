/**
 * find_olga2.js — углублённый поиск НАСТОЯЩЕГО аккаунта Ольги (356374 XP).
 *
 * Из find_olga.js видно: под #1c2b сидит ПУСТОЙ профиль OlgaZ (xp=0), но
 * bug-report заявляет 356374 XP. Значит настоящий аккаунт — другой документ.
 * Ищем по XP=356374 во ВСЕХ возможных местах + все доки с именем/почтой Ольги +
 * проверяем leaderboard (там XP дублируется) + bug_reports (там может быть
 * её реальный uid и история).
 *
 * Только чтение. Ничего не меняет.
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const XP = 356374;
const NAME_HINTS = ['olga', 'зарниц', 'ольга', 'zarn'];

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : 0; }
function shortId(id) { return String(id || '').replace(/-/g, '').slice(-4).toLowerCase(); }
function nameOf(d) {
  const p = d.progress || {};
  return String(p.user_name || d.name || d.displayName || '').trim();
}

async function main() {
  console.log('=== Углублённый поиск аккаунта Ольги (XP=356374) ===\n');

  const snap = await db.collection('users').get();
  console.log(`users total: ${snap.size}\n`);

  // 1) Все доки, где ГДЕ-ЛИБО встречается число 356374 (xp в разных полях).
  console.log('--- [A] Документы с XP=356374 (любое xp-поле) ---');
  const xpFields = ['user_total_xp', 'total_xp', 'xp', 'lifetime_xp', 'all_time_xp', 'weekly_xp'];
  let foundXp = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const p = d.progress || {};
    let hit = null;
    for (const f of xpFields) {
      if (Math.abs(num(p[f]) - XP) < 50) { hit = `progress.${f}`; break; }
      if (Math.abs(num(d[f]) - XP) < 50) { hit = f; break; }
    }
    // в окне 350k–360k тоже покажем (вдруг XP чуть изменился с момента репорта)
    const near = Math.abs(num(p.user_total_xp) - XP) < 6000;
    if (hit || near) {
      foundXp.push({ uid: doc.id, sid: shortId(doc.id), name: nameOf(d), hit: hit || 'near',
        xp: num(p.user_total_xp), streak: num(p.streak_count), lvl: num(p.level),
        vip: p.vip_plan || null, vipActive: p.vip_active || null,
        premium: p.premium_plan || null, hadPremium: p.had_premium_ever || null,
        hidden: d.identityHidden === true, canon: d.canonicalStableId || null,
        authUid: d.firebaseAuthUid || null,
        linked: d.linkedAuth ? `${d.linkedAuth.provider}/${d.linkedAuth.email}` : null,
        updated: num(p.updatedAt || d.updatedAt) });
    }
  }
  foundXp.sort((a, b) => b.xp - a.xp);
  for (const c of foundXp) {
    console.log(`  ${c.uid} (#${c.sid}) [${c.hit}] name=${JSON.stringify(c.name)} xp=${c.xp} streak=${c.streak} lvl=${c.lvl}`);
    console.log(`     vip=${c.vip}/${c.vipActive} premium=${c.premium} hadPremium=${c.hadPremium} hidden=${c.hidden} canon=${c.canon}`);
    console.log(`     authUid=${c.authUid} linked=${c.linked} updated=${new Date(c.updated).toISOString?.() || c.updated}`);
  }
  if (!foundXp.length) console.log('  (ничего не найдено с таким XP)');

  // 2) Все доки, связанные с Ольгой по имени/почте.
  console.log('\n--- [B] Все доки Ольги (имя/почта) ---');
  let olgas = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const name = nameOf(d).toLowerCase();
    const email = String(d.email || d.linkedAuth?.email || (d.progress || {}).email || '').toLowerCase();
    if (NAME_HINTS.some(h => name.includes(h) || email.includes(h))) {
      const p = d.progress || {};
      olgas.push({ uid: doc.id, sid: shortId(doc.id), name: nameOf(d), email,
        xp: num(p.user_total_xp), streak: num(p.streak_count), lvl: num(p.level),
        vip: p.vip_plan || null, vipActive: p.vip_active || null,
        premium: p.premium_plan || null, hadPremium: p.had_premium_ever || null,
        hidden: d.identityHidden === true, canon: d.canonicalStableId || null,
        authUid: d.firebaseAuthUid || null,
        linked: d.linkedAuth ? `${d.linkedAuth.provider}/${d.linkedAuth.email}/${d.linkedAuth.devicePlatform}` : null,
        updated: num(p.updatedAt || d.updatedAt) });
    }
  }
  olgas.sort((a, b) => b.xp - a.xp);
  for (const c of olgas) {
    console.log(`  ${c.uid} (#${c.sid}) name=${JSON.stringify(c.name)} email=${c.email}`);
    console.log(`     xp=${c.xp} streak=${c.streak} lvl=${c.lvl} vip=${c.vip}/${c.vipActive} premium=${c.premium} hadPremium=${c.hadPremium}`);
    console.log(`     hidden=${c.hidden} canon=${c.canon} authUid=${c.authUid} linked=${c.linked} updated=${new Date(c.updated).toISOString?.() || c.updated}`);
  }
  if (!olgas.length) console.log('  (никого по имени/почте)');

  // 3) leaderboard — там XP дублируется, можно найти uid по XP.
  console.log('\n--- [C] leaderboard с XP≈356374 ---');
  try {
    const lb = await db.collection('leaderboard').get();
    let lbHits = [];
    for (const doc of lb.docs) {
      const d = doc.data() || {};
      const xp = num(d.xp || d.user_total_xp || d.score || d.weekly_xp);
      if (Math.abs(xp - XP) < 6000) {
        lbHits.push({ uid: doc.id, sid: shortId(doc.id), name: String(d.name || d.user_name || ''), xp });
      }
    }
    lbHits.sort((a, b) => b.xp - a.xp);
    for (const h of lbHits) console.log(`  ${h.uid} (#${h.sid}) name=${JSON.stringify(h.name)} xp=${h.xp}`);
    if (!lbHits.length) console.log('  (нет в leaderboard)');
  } catch (e) { console.log('  leaderboard read error:', e.message); }

  // 4) bug_reports от Ольги — там точный uid отправителя + история.
  console.log('\n--- [D] bug_reports с тегом OlgaZ / 1c2b / зарниц ---');
  for (const coll of ['bug_reports', 'reports', 'bugReports', 'feedback']) {
    try {
      const br = await db.collection(coll).get();
      if (br.empty) continue;
      console.log(`  коллекция "${coll}": ${br.size} доков`);
      let shown = 0;
      for (const doc of br.docs) {
        const d = doc.data() || {};
        const blob = JSON.stringify(d).toLowerCase();
        if (blob.includes('olgaz') || blob.includes('1c2b') || blob.includes('зарниц') || blob.includes('zarn')) {
          console.log(`    [${coll}/${doc.id}] uid=${d.uid || d.userId || d.user_id} name=${d.userName || d.name} short=${d.shortId} screen=${d.screen} comment=${String(d.comment || d.text || '').slice(0, 80)}`);
          if (++shown >= 10) { console.log('    …(ещё есть)'); break; }
        }
      }
      if (!shown) console.log('    (совпадений нет)');
    } catch (e) { /* коллекции может не быть */ }
  }

  console.log('\n=== ГОТОВО ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
