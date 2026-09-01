// ════════════════════════════════════════════════════════════════════════════
// ЭТАП 2: выдача одного имени каждому аккаунту (владелец, 01.09.2026)
//
// зачем: у человека девять имён, и каждая их пара — место расхождения. Здесь
// каждому живому аккаунту выдаётся ОДНО имя (accountId), а все старые имена
// записываются в таблицу соответствия account_id_index. Старое продолжает
// работать: это добавление, а не замена.
//
// ТРИ ЗАЩИТЫ (это самое опасное место всего плана — трогает 4700 аккаунтов):
//   1. Сухой прогон по умолчанию. Боевой — только с --apply.
//   2. Идемпотентность: аккаунт с уже выданным именем пропускается. Повторный
//      запуск не создаёт вторых имён и безопасен.
//   3. Только добавление. Ни одно существующее поле не перезаписывается,
//      ничего не удаляется, прогресс не трогается вовсе.
//
// Запуск ТОЛЬКО из functions/ (там firebase-admin):
//   cd functions && node ../scripts/identity/assign_account_ids.js
//   cd functions && node ../scripts/identity/assign_account_ids.js --apply
// ════════════════════════════════════════════════════════════════════════════
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('C:/appsprojects/phraseman/service-account.json')),
});
const db = admin.firestore();

const {
  newAccountId, accountIdIndexDocId, cleanAliases, ACCOUNT_ID_INDEX, ACCOUNT_ID_FIELD,
} = require('C:/appsprojects/phraseman/functions/lib/functions/src/account_id');

const APPLY = process.argv.includes('--apply');
const s = (v) => String(v ?? '').trim();
const xpOf = (x) => parseInt(String((x?.progress || {}).user_total_xp ?? '0'), 10) || 0;

(async () => {
  console.log(APPLY ? '### БОЕВОЙ ПРОГОН ###\n' : '### СУХОЙ ПРОГОН (ничего не пишется) ###\n');

  const [usersSnap, linksSnap, ownerSnap, indexSnap] = await Promise.all([
    db.collection('users').select(
      'firebaseAuthUid', 'linkedAuth', 'identityHidden', 'canonicalStableId', 'progress', ACCOUNT_ID_FIELD,
    ).get(),
    db.collection('auth_links').select('stable_id').get(),
    db.collection('account_identity_owner_map').select('canonicalStableId').get(),
    db.collection(ACCOUNT_ID_INDEX).select('accountId').get(),
  ]);

  const byId = new Map();
  const live = new Set();
  usersSnap.forEach((d) => {
    const x = d.data() || {};
    byId.set(d.id, x);
    if (x.identityHidden !== true) live.add(d.id);
  });

  // Обратная карта: живой аккаунт → все его псевдонимы.
  const aliasesOf = new Map();
  const addAlias = (stableId, alias, kind) => {
    if (!live.has(stableId)) return;
    if (!aliasesOf.has(stableId)) aliasesOf.set(stableId, []);
    aliasesOf.get(stableId).push({ alias, kind });
  };

  // 1. Сам stable_id — главный псевдоним.
  for (const id of live) addAlias(id, id, 'stable');

  // 2. Оба uid из самого документа.
  for (const [id, x] of byId) {
    if (x.identityHidden === true) continue;
    addAlias(id, s(x.firebaseAuthUid), 'auth');
    addAlias(id, s((x.linkedAuth || {}).providerUid), 'provider');
  }

  // 3. Провайдерские uid из таблицы привязок.
  linksSnap.forEach((d) => addAlias(s((d.data() || {}).stable_id), d.id, 'auth'));

  // 4. Скрытые следы слияний: их id тоже должны вести к победителю, иначе
  //    старые ссылки после перехода станут «никуда».
  const resolveFinal = (start) => {
    let cur = start; const seen = new Set();
    for (let i = 0; i < 8; i += 1) {
      if (!cur || seen.has(cur)) return null;
      seen.add(cur);
      if (live.has(cur)) return cur;
      const x = byId.get(cur);
      if (!x) return null;
      cur = s(x.canonicalStableId);
    }
    return null;
  };
  for (const [id, x] of byId) {
    if (x.identityHidden !== true) continue;
    const final = resolveFinal(s(x.canonicalStableId));
    if (final) addAlias(final, id, 'merged_stable');
  }
  ownerSnap.forEach((d) => {
    const final = resolveFinal(s((d.data() || {}).canonicalStableId));
    if (final) addAlias(final, d.id, 'merged_stable');
  });

  // ── ПЛАН ──────────────────────────────────────────────────────────────────
  const alreadyNamed = [...live].filter((id) => s(byId.get(id)[ACCOUNT_ID_FIELD]));
  const toName = [...live].filter((id) => !s(byId.get(id)[ACCOUNT_ID_FIELD]));

  // ── РАЗРЕШЕНИЕ КОНФЛИКТОВ ──────────────────────────────────────────────
  // Один uid ведёт к двум живым аккаунтам: человек ставил приложение дважды, и
  // каждый раз заводился отдельный аккаунт под тем же входом. Разбор 01.09
  // показал: из 447 таких uid у 151 обе стороны пустые, у 295 прогресс только
  // у одной, и лишь 1 спорный (тестовый аккаунт владельца).
  //
  // Правило: псевдоним ведёт к аккаунту с БОЛЬШИМ прогрессом. При равенстве —
  // к недавно обновлённому. Это тот же аккаунт, который человек и считает
  // своим: пустой дубль он никогда не видел.
  const claimants = new Map();
  for (const [stableId, list] of aliasesOf) {
    for (const { alias } of cleanAliases(list)) {
      if (!claimants.has(alias)) claimants.set(alias, []);
      claimants.get(alias).push(stableId);
    }
  }
  const aliasOwner = new Map();
  const conflicts = [];
  const resolved = [];
  // Пары, где прогресс есть у обеих сторон: решаются тем же правилом, но
  // считаются отдельно — владелец должен видеть их число.
  const contestedResolved = [];
  for (const [alias, ids] of claimants) {
    const unique = [...new Set(ids)];
    if (unique.length === 1) { aliasOwner.set(alias, unique[0]); continue; }
    const ranked = unique
      .map((id) => ({ id, xp: xpOf(byId.get(id)), at: Number(byId.get(id)?.updatedAt) || 0 }))
      .sort((a, b) => (b.xp - a.xp) || (b.at - a.at) || a.id.localeCompare(b.id));
    const winner = ranked[0];
    const contested = ranked.filter((r) => r.xp > 0).length > 1;
    // РЕШЕНИЕ ВЛАДЕЛЬЦА 01.09.2026: правило «больше прогресса» применяется и к
    // спорным парам. Разбор показал, что 29 из 30 таких пар — ОДИН человек с
    // двумя поколениями аккаунта: под UUID (новая схема) и под собственным uid
    // входа (старая, до введения UUID). Человек считает своим тот, где больше
    // его труда; пустой или заброшенный дубль он никогда не видел. Проигравший
    // аккаунт остаётся в базе нетронутым — ничего не удаляется.
    aliasOwner.set(alias, winner.id);
    (contested ? contestedResolved : resolved).push({
      alias, winner: winner.id, xp: winner.xp, losers: ranked.slice(1).map((r) => `${r.id}:${r.xp}`),
    });
  }

  // Записываем псевдоним ТОЛЬКО его разрешённому владельцу.
  let aliasWrites = 0;
  for (const id of toName) {
    aliasWrites += cleanAliases(aliasesOf.get(id) || [])
      .filter(({ alias }) => aliasOwner.get(alias) === id).length;
  }

  console.log('живых аккаунтов:            ', live.size);
  console.log('  уже с именем (пропускаем):', alreadyNamed.length);
  console.log('  получат имя:              ', toName.length);
  console.log('записей в таблицу соответствия:', aliasWrites);
  console.log('уже в таблице:              ', indexSnap.size);
  console.log('');
  console.log('общих uid разрешено по прогрессу:', resolved.length);
  console.log('  из них с прогрессом у обеих сторон:', contestedResolved.length,
    '(два поколения одного аккаунта)');
  contestedResolved.slice(0, 5).forEach((c) => {
    console.log(`   ${c.alias.slice(0, 24)} → XP ${c.xp} (уступили: ${c.losers.join(', ')})`);
  });
  console.log('');

  const sample = toName.slice(0, 3);
  console.log('пример (первые 3):');
  for (const id of sample) {
    const list = cleanAliases(aliasesOf.get(id) || []);
    console.log(`   ${id} XP=${xpOf(byId.get(id))} псевдонимов: ${list.length} [${list.map((a) => a.kind).join(', ')}]`);
  }

  if (!APPLY) {
    console.log('(сухой прогон — ничего не записано)');
    process.exit(0);
  }

  // ── СНИМОК ДО ЗАПИСИ ──────────────────────────────────────────────────────
  // зачем: единственный шаг плана, трогающий все 4700 аккаунтов. Записи только
  // добавляющие, но снимок делает откат тривиальным: удалить accountId у
  // перечисленных id и очистить индекс.
  const fs = require('fs');
  fs.mkdirSync('C:/appsprojects/phraseman/.codex-tmp', { recursive: true });
  const snapshotPath = 'C:/appsprojects/phraseman/.codex-tmp/account_id_assignment_snapshot.json';
  fs.writeFileSync(snapshotPath, JSON.stringify({
    takenAtMs: Date.now(), liveAccounts: live.size, plannedNames: toName.length, targets: toName,
  }), 'utf8');
  console.log('снимок до записи: ' + snapshotPath);

  // ── ПРИМЕНЕНИЕ ────────────────────────────────────────────────────────────
  const now = Date.now();
  const conflicted = new Set(conflicts.map((c) => c.alias));
  let named = 0; let aliased = 0;
  const skipped = [];

  // зачем поштучно, а не одним батчем (найдено 01.09): три документа уже
  // ПЕРЕПОЛНЕНЫ (>1 МБ), и Firestore отказывает им в любой записи. В общем
  // батче один такой отказ ронял всю пачку из 400 и весь прогон. Теперь сбой
  // одного аккаунта не мешает остальным, а причина попадает в отчёт.
  for (const stableId of toName) {
    const accountId = newAccountId();
    try {
      // Имя пишется В ДОБАВЛЕНИЕ: merge и только новые поля.
      await db.collection('users').doc(stableId).set({
        [ACCOUNT_ID_FIELD]: accountId,
        accountIdAssignedAt: now,
        accountIdAssignedReason: 'stage2_identity_rebuild_2026_09_01',
      }, { merge: true });
      named += 1;
    } catch (e) {
      // зачем не глотаем молча (правило проекта): аккаунт без имени остаётся
      // вне новой схемы, и это обязано быть видно в отчёте.
      skipped.push({ stableId, why: String(e && e.message ? e.message : e).slice(0, 140) });
      continue;
    }

    // Псевдонимы кладём батчем: они в отдельной коллекции, лимит им не грозит.
    const aliases = cleanAliases(aliasesOf.get(stableId) || [])
      .filter(({ alias }) => !conflicted.has(alias) && aliasOwner.get(alias) === stableId);
    for (let i = 0; i < aliases.length; i += 400) {
      const batch = db.batch();
      for (const { alias, kind } of aliases.slice(i, i + 400)) {
        batch.set(db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(alias)), {
          accountId, alias, kind, stableId, updatedAt: now,
        }, { merge: true });
      }
      await batch.commit();
      aliased += Math.min(400, aliases.length - i);
    }
  }

  console.log('ПРИМЕНЕНО: имён выдано ' + named + ', записей соответствия ' + aliased);
  if (skipped.length) {
    console.log('ПРОПУЩЕНО (документ не принимает записи): ' + skipped.length);
    skipped.forEach((x) => console.log('   ' + x.stableId + ' :: ' + x.why));
  }
  process.exit(0);
})().catch((e) => { console.error('ОШИБКА:', e.stack || e.message); process.exit(1); });
