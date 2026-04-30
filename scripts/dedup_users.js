// Безопасная дедупликация аккаунтов в users/{uid}
// Стратегия:
// 1) группируем по user_name (из progress),
// 2) считаем confidence для каждого кандидата на удаление,
// 3) удаляем только high-confidence + whitelist,
// 4) перед удалением архивируем в users_dedup_archive.
//
// Примеры:
// - Отчет (по умолчанию): node scripts/dedup_users.js
// - Dry-run: node scripts/dedup_users.js --dry-run
// - Экспорт отчета: node scripts/dedup_users.js --export-json scripts/out/dedup-report.json
// - Боевое удаление: node scripts/dedup_users.js --execute --confirm DELETE_DUPLICATES
// - Боевое + whitelist: node scripts/dedup_users.js --execute --confirm DELETE_DUPLICATES --whitelist scripts/dedup_whitelist.txt

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
const fs = require('fs');
const path = require('path');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');
const CONFIRM_TOKEN = readArgValue('--confirm');
const EXPORT_PATH = readArgValue('--export-json');
const WHITELIST_PATH = readArgValue('--whitelist');
const REQUIRED_CONFIRM_TOKEN = 'DELETE_DUPLICATES';

function readArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function isUuidV4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isAuthLikeUid(value) {
  return /^[A-Za-z0-9]{28}$/.test(value);
}

function parseSemver(version) {
  if (!version || version === '?') return [0, 0, 0];
  const parts = String(version).split('.').map(x => parseInt(x, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewerVersion(a, b) {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] > bv[i]) return true;
    if (av[i] < bv[i]) return false;
  }
  return false;
}

function computeConfidence(keep, dupe) {
  let score = 0.0;
  const reasons = [];

  if (isUuidV4(keep.id) && isAuthLikeUid(dupe.id)) {
    score += 0.55;
    reasons.push('uuid-v4 keep vs auth-like dupe');
  }
  if (keep.xp >= dupe.xp) {
    score += 0.15;
    reasons.push('keep xp >= dupe xp');
  }
  if (isNewerVersion(keep.version, dupe.version)) {
    score += 0.15;
    reasons.push('keep app version is newer');
  }
  if ((keep.xp - dupe.xp) >= 500) {
    score += 0.10;
    reasons.push('xp gap >= 500');
  }
  if (keep.updatedAt >= dupe.updatedAt && keep.updatedAt > 0) {
    score += 0.05;
    reasons.push('keep updatedAt is newer');
  }

  return { score, reasons };
}

function readWhitelist() {
  if (!WHITELIST_PATH) return new Set();
  if (!fs.existsSync(WHITELIST_PATH)) {
    throw new Error(`Whitelist file not found: ${WHITELIST_PATH}`);
  }
  const raw = fs.readFileSync(WHITELIST_PATH, 'utf8');
  const ids = raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith('#'));
  return new Set(ids);
}

async function archiveUsers(records) {
  if (records.length === 0) return 0;
  const BATCH_SIZE = 300;
  let archived = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const rec of records.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection('users_dedup_archive').doc(rec.id);
      batch.set(ref, {
        archivedAt: Date.now(),
        sourceCollection: 'users',
        ...rec,
      }, { merge: true });
      archived++;
    }
    await batch.commit();
  }
  return archived;
}

async function run() {
  const mode = EXECUTE ? 'EXECUTE' : (DRY_RUN ? 'DRY RUN' : 'REPORT');
  console.log(`=== ${mode} ===`);
  console.log('Читаем коллекцию users...');

  const snap = await db.collection('users').get();
  console.log(`Всего документов: ${snap.size}`);
  const whitelist = readWhitelist();
  if (whitelist.size > 0) {
    console.log(`Whitelist UID: ${whitelist.size}`);
  }

  // Группируем по имени (нормализованному)
  const byName = new Map();
  for (const doc of snap.docs) {
    const data = doc.data();
    const p = data.progress || {};
    const name = (p.user_name || '').trim();
    if (!name) continue; // пропускаем безымянных
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({
      id: doc.id,
      name,
      xp: parseInt(p.user_total_xp) || 0,
      version: p.app_version || '?',
      updatedAt: data.updatedAt || 0,
      data,
    });
  }

  let duplicateGroups = 0;
  const highConfidence = [];
  const ambiguous = [];
  const whitelisted = [];
  const reportGroups = [];

  for (const [, entries] of byName) {
    if (entries.length < 2) continue;
    duplicateGroups++;

    // Оставляем запись с наибольшим XP (при равном XP — с более поздним updatedAt)
    entries.sort((a, b) => b.xp - a.xp || b.updatedAt - a.updatedAt);
    const keep = entries[0];
    const dupes = entries.slice(1);

    console.log(`\n👥 Группа: "${keep.name}" (${entries.length} записей)`);
    console.log(`  ✅ Оставляем: ${keep.id} | XP=${keep.xp} | v${keep.version}`);
    dupes.forEach(d => {
      const confidence = computeConfidence(keep, d);
      const candidate = {
        id: d.id,
        name: d.name,
        xp: d.xp,
        version: d.version,
        updatedAt: d.updatedAt,
        keepId: keep.id,
        keepXp: keep.xp,
        confidence: Number(confidence.score.toFixed(2)),
        reasons: confidence.reasons,
        data: d.data,
      };
      const forced = whitelist.has(d.id);
      if (forced) {
        whitelisted.push(candidate);
        console.log(`  ⚠️  WHITELIST: ${d.id} | XP=${d.xp} | v${d.version} | conf=${candidate.confidence}`);
      } else if (candidate.confidence >= 0.75) {
        highConfidence.push(candidate);
        console.log(`  🗑️  CANDIDATE: ${d.id} | XP=${d.xp} | v${d.version} | conf=${candidate.confidence}`);
      } else {
        ambiguous.push(candidate);
        console.log(`  ⏸️  AMBIGUOUS: ${d.id} | XP=${d.xp} | v${d.version} | conf=${candidate.confidence}`);
      }
    });
    reportGroups.push({
      name: keep.name,
      size: entries.length,
      keep: { id: keep.id, xp: keep.xp, version: keep.version, updatedAt: keep.updatedAt },
      dupes: dupes.map(d => ({ id: d.id, xp: d.xp, version: d.version, updatedAt: d.updatedAt })),
    });
  }

  const selectedForDeleteMap = new Map();
  for (const item of highConfidence) selectedForDeleteMap.set(item.id, item);
  for (const item of whitelisted) selectedForDeleteMap.set(item.id, item);
  const selectedForDelete = [...selectedForDeleteMap.values()];

  console.log(`\n──────────────────────────────────────`);
  console.log(`Групп с дублями: ${duplicateGroups}`);
  console.log(`High-confidence кандидатов: ${highConfidence.length}`);
  console.log(`Whitelist кандидатов: ${whitelisted.length}`);
  console.log(`Неоднозначных (не трогаем): ${ambiguous.length}`);
  console.log(`Итого выбрано к удалению: ${selectedForDelete.length}`);

  if (EXPORT_PATH) {
    const payload = {
      generatedAt: new Date().toISOString(),
      duplicateGroups,
      highConfidence: highConfidence.map(x => ({ ...x, data: undefined })),
      whitelisted: whitelisted.map(x => ({ ...x, data: undefined })),
      ambiguous: ambiguous.map(x => ({ ...x, data: undefined })),
      groups: reportGroups,
    };
    ensureDirForFile(EXPORT_PATH);
    fs.writeFileSync(EXPORT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`📄 Report exported: ${EXPORT_PATH}`);
  }

  if (selectedForDelete.length === 0) {
    console.log('✅ Дублей не найдено.');
    process.exit(0);
  }

  if (!EXECUTE || DRY_RUN) {
    console.log('\n🔍 REPORT/DRY RUN — удаление не выполнено.');
    console.log(`Для удаления запустите: node scripts/dedup_users.js --execute --confirm ${REQUIRED_CONFIRM_TOKEN}`);
    process.exit(0);
  }

  if (CONFIRM_TOKEN !== REQUIRED_CONFIRM_TOKEN) {
    console.log('\n🛑 Неверный confirm token.');
    console.log(`Для удаления используйте: --confirm ${REQUIRED_CONFIRM_TOKEN}`);
    process.exit(0);
  }

  console.log('\nАрхивируем кандидатов в users_dedup_archive...');
  const archived = await archiveUsers(selectedForDelete.map(item => ({
    id: item.id,
    name: item.name,
    xp: item.xp,
    version: item.version,
    updatedAt: item.updatedAt,
    keepId: item.keepId,
    keepXp: item.keepXp,
    confidence: item.confidence,
    reasons: item.reasons,
    data: item.data,
  })));
  console.log(`  Архивировано: ${archived}`);

  // Удаляем батчами по 300
  console.log('\nУдаляем...');
  const BATCH_SIZE = 300;
  for (let i = 0; i < selectedForDelete.length; i += BATCH_SIZE) {
    const batch = db.batch();
    selectedForDelete.slice(i, i + BATCH_SIZE).forEach(item => {
      batch.delete(db.collection('users').doc(item.id));
    });
    await batch.commit();
    console.log(`  Удалено ${Math.min(i + BATCH_SIZE, selectedForDelete.length)} / ${selectedForDelete.length}`);
  }

  // Также чистим leaderboard от тех же UID
  console.log('\nЧистим leaderboard...');
  let lbDeleted = 0;
  for (let i = 0; i < selectedForDelete.length; i += BATCH_SIZE) {
    const lbBatch = db.batch();
    for (const item of selectedForDelete.slice(i, i + BATCH_SIZE)) {
      lbBatch.delete(db.collection('leaderboard').doc(item.id));
      lbDeleted++;
    }
    await lbBatch.commit();
  }
  console.log(`  Удалено ${lbDeleted} записей из leaderboard`);

  console.log('\n✅ Готово!');
  process.exit(0);
}

run().catch(e => { console.error('Ошибка:', e); process.exit(1); });
