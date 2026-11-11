// U35: ТОЛЬКО ЧТЕНИЕ боевой базы — итог недели Пика аккаунта владельца. Ничего не пишет.
// Запуск из корня репозитория: node <этот файл> <email> [<email>…]
const path = require('path');
const root = process.cwd();
const admin = require(path.join(root, 'functions/node_modules/firebase-admin'));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(root, 'service-account.json'))) });
const db = admin.firestore();
const mask = (s) => (typeof s === 'string' && s.length > 8 ? `${s.slice(0, 6)}…` : String(s));
const initial = (s) => (typeof s === 'string' && s ? `${s.slice(0, 1)}*` : '—');
let reads = 0;

async function inspect(email) {
  let authUid;
  try { authUid = (await admin.auth().getUserByEmail(email)).uid; }
  catch (e) { console.log(`\n[${email.replace(/(.).*@/, '$1…@')}] в Auth не найден: ${e.code || e.message}`); return; }
  const link = await db.collection('auth_links').doc(authUid).get(); reads += 1;
  const linkData = link.exists ? link.data() : null;
  const stable = (linkData && (linkData.stable_id || linkData.stableUid || linkData.stableId)) || authUid;
  console.log(`\n[${email.replace(/(.).*@/, '$1…@')}] authUid=${mask(authUid)} auth_links=${link.exists ? 'есть' : 'нет'} stable=${mask(stable)} (ключи ссылки: ${linkData ? Object.keys(linkData).join(',') : '—'})`);
  const [userSnap] = await db.getAll(db.collection('users').doc(stable), { fieldMask: ['stars', 'identityHidden'] }); reads += 1;
  const s = (userSnap.exists && userSnap.get('stars')) || {};
  console.log(`  журнал: weekKey=${s.weekKey} weekEarned=${s.weekEarned} | prevWeekKey=${s.prevWeekKey} prevWeekEarned=${s.prevWeekEarned} | balance=${s.balance} earnedTotal=${s.earnedTotal} grantedTotal=${s.grantedTotal} seq=${s.seq} hidden=${userSnap.get('identityHidden')}`);
  const lb = await db.collection('leaderboard').doc(stable).get(); reads += 1;
  console.log(`  leaderboard: spireTiers=${JSON.stringify(lb.get('spireTiers') || null)} группы=${JSON.stringify(Object.fromEntries(Object.entries(lb.get('spireGroups') || {}).map(([k, v]) => [k, { weekId: v && v.weekId, tier: v && v.tier, groupId: mask(v && v.groupId) }])))}`);
  const results = await db.collection('users').doc(stable).collection('spire_week_results').limit(12).get(); reads += Math.max(1, results.size);
  console.log(`  итогов недели: ${results.size}`);
  for (const doc of results.docs) {
    const r = doc.data();
    console.log(`  ── ${doc.id}: место ${r.roomRank}/${r.roomTotal} (живых ${r.liveRank}/${r.liveTotal}) rankBy=${r.rankBy} weekCoins=${r.weekCoins} capped=${r.weekCoinsCapped} steps=${r.steps} zone=${r.zoneSize} promoted=${r.promoted} demoted=${r.demoted} tier ${r.prevTier}→${r.newTier} reward=${JSON.stringify(r.rewardCoins)} status=${r.rewardStatus}/${r.settlementStatus} линия=${r.promotionLineCoins} freeze=${r.decisionHash ? 'да' : 'нет'} finalizedAt=${r.finalizedAt && r.finalizedAt.toDate ? r.finalizedAt.toDate().toISOString() : r.finalizedAt} group=${mask(r.groupId)}`);
    if (Array.isArray(r.ladder)) console.log(`     лестница: ${r.ladder.map((x) => `${x.place}.${x.isMe ? 'Я' : initial(x.name)}=${x.coins}м/${x.steps ?? '?'}ст`).join('  ')}`);
  }
  // зачем: «место на экране» живой недели считается по снимкам в документе комнаты — одно чтение на комнату самой свежей недели.
  const groups = Object.entries(lb.get('spireGroups') || {}).filter(([, v]) => v && v.groupId && v.weekId).sort((a, b) => String(b[1].weekId).localeCompare(String(a[1].weekId)));
  if (groups.length > 0) {
    const [lang, g] = groups[0];
    const room = await db.collection('spire_groups').doc(g.groupId).get(); reads += 1;
    const members = Object.entries((room.exists && room.get('members')) || {}).filter(([uid, m]) => m && typeof m === 'object' && !uid.startsWith('res_') && m.isBot !== true);
    const rows = members.map(([uid, m]) => ({ me: uid === stable, name: initial(m.name), coins: Number(m.weekCoins) || 0, steps: Number(m.steps) || 0, reached: Number(m.reachedAtMs) || Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => b.coins - a.coins || b.steps - a.steps || a.reached - b.reached);
    const mine = rows.find((r) => r.me);
    const better = mine ? rows.filter((r) => r.coins > mine.coins || (r.coins === mine.coins && r.steps > mine.steps)).length : -1;
    console.log(`  ── комната ${g.weekId}_${lang}: существует=${room.exists} живых=${rows.length} tier=${room.get('tier')} finalizedAt=${room.get('finalizedAt') ? 'есть' : 'нет'} freeze=${room.get('finalizationFreeze') ? 'есть' : 'нет'} с монетами>0: ${rows.filter((r) => r.coins > 0).length}`);
    console.log(`     снимки: ${rows.slice(0, 12).map((r, i) => `${i + 1}.${r.me ? 'Я' : r.name}=${r.coins}м/${r.steps}ст`).join('  ')}${rows.length > 12 ? ' …' : ''}`);
    console.log(`     я в комнате: ${mine ? `снимок ${mine.coins}м/${mine.steps}ст, позиция в сортировке экрана ${rows.indexOf(mine) + 1}, место по правилу сервера ${better + 1} (строго выше ${better})` : 'НЕТ'}; мои монеты этой недели по журналу: ${s.weekKey === g.weekId ? s.weekEarned : s.prevWeekKey === g.weekId ? s.prevWeekEarned : 0}`);
  }
  return { stable, results: results.docs.map((d) => ({ id: d.id, groupId: d.get('groupId') })) };
}

(async () => {
  const cfg = await db.collection('config').doc('spire_v1').get(); reads += 1;
  console.log(`config/spire_v1: rankBy=${cfg.get('rankBy')} weekCoinsCap=${cfg.get('weekCoinsCap')} promotionBonus=${cfg.get('coins') && cfg.get('coins').promotionBonus} updatedAtMs=${cfg.get('updatedAtMs') ? new Date(cfg.get('updatedAtMs')).toISOString() : '—'}`);
  for (const email of process.argv.slice(2)) await inspect(email);
  console.log(`\nвсего чтений документов: ~${reads}`);
  process.exit(0);
})().catch((e) => { console.error('СБОЙ ЧТЕНИЯ:', e && (e.stack || e.message || e)); process.exit(1); });
