// ════════════════════════════════════════════════════════════════════════════
// ПОЧИНКА КАРТЫ ИМЁН ПО ЖИВОЙ ПРИВЯЗКЕ (аудит 2026-09-02)
//
// зачем: миграция этапа 2 разрешала «один uid → два живых аккаунта» правилом
// «больше прогресса», а при ничьей — по алфавиту id, потому что поле updatedAt
// не попадало в выборку. В итоге у 62 auth uid карта account_id_index вела не
// на тот документ, на который ведёт auth_links (то, чем человек реально
// входит). Серверный код теперь ставит привязку выше карты, но карту всё равно
// надо привести в согласие: этап 4 (accountClaimMine) и любое новое опознание
// без привязки читают именно её.
//
// Правило: для каждого auth uid, чья привязка auth_links ведёт на ЖИВОЙ
// аккаунт, запись карты обязана вести туда же. Записи только добавляются или
// перезаписываются в карте — документы users не трогаются вовсе.
//
// ТРИ ЗАЩИТЫ:
//   1. Сухой прогон по умолчанию. Боевой — только с --apply.
//   2. Спорные пары (сторона карты богаче по XP) по умолчанию ПРОПУСКАЮТСЯ и
//      печатаются — это решение владельца. Включить их: --include-richer.
//   3. Каждая правка помечена полями indexRepairAt / indexRepairReason.
//
// Запуск ТОЛЬКО из functions/ (там firebase-admin):
//   cd functions && node ../scripts/identity/repair_index_to_auth_links.js
//   cd functions && node ../scripts/identity/repair_index_to_auth_links.js --apply
//   cd functions && node ../scripts/identity/repair_index_to_auth_links.js --apply --include-richer
// ════════════════════════════════════════════════════════════════════════════
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('C:/appsprojects/phraseman/service-account.json')),
});
const db = admin.firestore();

const {
  accountIdIndexDocId, ACCOUNT_ID_INDEX, ACCOUNT_ID_FIELD,
} = require('C:/appsprojects/phraseman/functions/lib/functions/src/account_id');

const APPLY = process.argv.includes('--apply');
const INCLUDE_RICHER = process.argv.includes('--include-richer');
const s = (v) => String(v ?? '').trim();
const xpOf = (x) => parseInt(String((x?.progress || {}).user_total_xp ?? '0'), 10) || 0;

(async () => {
  console.log(APPLY ? '### БОЕВОЙ ПРОГОН ###\n' : '### СУХОЙ ПРОГОН (ничего не пишется) ###\n');

  // Разовый аудит: три полных чтения намеренны, как и в остальных скриптах папки.
  const [usersSnap, linksSnap, indexSnap] = await Promise.all([
    db.collection('users').select('identityHidden', 'progress', ACCOUNT_ID_FIELD).get(),
    db.collection('auth_links').select('stable_id').get(),
    db.collection(ACCOUNT_ID_INDEX).select('alias', 'stableId', 'accountId').get(),
  ]);
  const byId = new Map(); const live = new Set();
  usersSnap.forEach((d) => { const x = d.data() || {}; byId.set(d.id, x); if (x.identityHidden !== true) live.add(d.id); });
  const index = new Map();
  indexSnap.forEach((d) => { const x = d.data() || {}; index.set(s(x.alias), { docId: d.id, stableId: s(x.stableId), accountId: s(x.accountId) }); });

  const plan = []; const richer = []; const noName = [];
  linksSnap.forEach((d) => {
    const authUid = d.id;
    const target = s((d.data() || {}).stable_id);
    if (!live.has(target)) return;
    const targetDoc = byId.get(target);
    const accountId = s(targetDoc[ACCOUNT_ID_FIELD]);
    if (!accountId) { noName.push({ authUid, target }); return; }
    const hit = index.get(authUid);
    if (hit && hit.stableId === target && hit.accountId === accountId) return;
    const row = {
      authUid, target, accountId,
      op: hit ? 'REWRITE' : 'CREATE',
      from: hit ? { stableId: hit.stableId, xp: xpOf(byId.get(hit.stableId)) } : null,
      toXp: xpOf(targetDoc),
    };
    if (row.from && row.from.xp > row.toXp) { richer.push(row); if (!INCLUDE_RICHER) return; }
    plan.push(row);
  });

  console.log('записей к правке:', plan.length, ' CREATE:', plan.filter((p) => p.op === 'CREATE').length,
    ' REWRITE:', plan.filter((p) => p.op === 'REWRITE').length);
  console.log('спорных (сторона карты богаче по XP):', richer.length, INCLUDE_RICHER ? '— ВКЛЮЧЕНЫ в правку' : '— пропущены, решает владелец');
  richer.forEach((r) => console.log(`   ${r.authUid}  карта→${r.from.stableId} xp=${r.from.xp}  |  привязка→${r.target} xp=${r.toXp}`));
  if (noName.length) console.log('привязка ведёт на живой аккаунт БЕЗ имени (сначала assign_account_ids.js):', noName.length);
  plan.slice(0, 8).forEach((p) => console.log(`   ${p.op} ${p.authUid} → ${p.target}${p.from ? ` (было ${p.from.stableId})` : ''}`));

  if (!APPLY) { console.log('\n(сухой прогон — ничего не записано)'); process.exit(0); }

  const now = Date.now();
  for (let i = 0; i < plan.length; i += 400) {
    const batch = db.batch();
    for (const p of plan.slice(i, i + 400)) {
      batch.set(db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(p.authUid)), {
        accountId: p.accountId, alias: p.authUid, kind: 'auth', stableId: p.target,
        updatedAt: now, indexRepairAt: now, indexRepairReason: 'index_to_auth_links_2026_09_02',
      }, { merge: true });
    }
    await batch.commit();
  }
  console.log('ПРИМЕНЕНО:', plan.length, 'записей карты');
  process.exit(0);
})().catch((e) => { console.error('ОШИБКА:', e.stack || e.message); process.exit(1); });
