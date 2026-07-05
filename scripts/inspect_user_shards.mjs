#!/usr/bin/env node
/**
 * Разовый диагностический скрипт: отследить пользователя по нику и показать
 * всё, что относится к балансу осколков (shards) — для расследования откатов.
 *
 * Использование:
 *   node scripts/inspect_user_shards.mjs "Vitalii"
 *
 * Только ЧТЕНИЕ. Ничего не пишет в базу.
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const QUERY = process.argv[2];
if (!QUERY) {
  console.error('Usage: node scripts/inspect_user_shards.mjs "<nickname>"');
  process.exit(1);
}

function readProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    const firebaserc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
    return firebaserc?.projects?.default || undefined;
  } catch {
    return undefined;
  }
}

function initAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = readProjectId();
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}

function clean(v, max = 64) {
  return String(v ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}
const nameLower = clean(QUERY, 32).replace(/^@+/, '').toLowerCase();

async function loadVisible(db, uid) {
  const snap = await db.collection('users').doc(uid).get().catch(() => null);
  return snap?.exists ? { uid, data: snap.data() ?? {} } : null;
}

// Повторяем логику friend_lookup.ts: name_index → legacy → prefix.
async function resolveCandidates(db) {
  const found = new Map();
  const add = (uid, via) => {
    if (uid && !found.has(uid)) found.set(uid, via);
  };

  // 1) name_index (точный)
  const idx = await db.collection('name_index').doc(nameLower).get().catch(() => null);
  if (idx?.exists) add(clean(idx.data()?.uid, 180), 'name_index');

  // 2) legacy exact
  const legacy = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(10),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(10),
    db.collection('users').where('progress.user_name', '==', clean(QUERY, 32)).limit(10),
  ];
  for (const q of legacy) {
    const snap = await q.get().catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'legacy_exact');
  }

  // 3) prefix
  if (nameLower.length >= 2) {
    const end = nameLower.slice(0, -1) + String.fromCharCode(nameLower.charCodeAt(nameLower.length - 1) + 1);
    const snap = await db
      .collection('users')
      .where('progress.user_name_lower', '>=', nameLower)
      .where('progress.user_name_lower', '<', end)
      .orderBy('progress.user_name_lower')
      .limit(25)
      .get()
      .catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'prefix');
  }
  return found;
}

function fmtTs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n} (${new Date(n).toISOString()})`;
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  console.log(`\n=== Поиск ника "${QUERY}" (nameLower="${nameLower}") ===`);
  const candidates = await resolveCandidates(db);
  if (candidates.size === 0) {
    console.log('Ничего не найдено ни в name_index, ни в legacy, ни по префиксу.');
    process.exit(0);
  }

  for (const [uid, via] of candidates) {
    const rec = await loadVisible(db, uid);
    if (!rec) {
      console.log(`\n--- uid=${uid} (via ${via}) — документ users отсутствует`);
      continue;
    }
    const d = rec.data;
    const p = d.progress ?? {};
    console.log('\n========================================================');
    console.log(`uid: ${uid}   (найден через: ${via})`);
    console.log(`имя: "${clean(p.user_name, 40)}"  уровень: ${p.user_level ?? '—'}  XP: ${p.user_total_xp ?? '—'}`);
    console.log(`premium_plan: ${p.premium_plan ?? '—'}  banned: ${d.banned ?? false}  identityHidden: ${d.identityHidden ?? false}`);
    console.log('--- ОСКОЛКИ (shards) ---');
    console.log(`  shards (баланс):          ${d.shards ?? '—'}`);
    console.log(`  shardsUpdatedAtMs:        ${fmtTs(d.shardsUpdatedAtMs)}`);
    console.log(`  shards_updated_at_ms:     ${fmtTs(d.shards_updated_at_ms)}`);
    console.log(`  shards_lifetime_earned_v1:${p.shards_lifetime_earned_v1 ?? '—'}`);
    console.log(`  shards_lifetime_spent_v1: ${p.shards_lifetime_spent_v1 ?? '—'}`);
    console.log(`  shards_balance (progress):${p.shards_balance ?? '—'}`);
    console.log(`  achievement_shards_spent_total: ${p.achievement_shards_spent_total ?? '—'}`);
    console.log(`  shards_arena_wins_total:  ${p.shards_arena_wins_total ?? '—'}`);
    // Консистентность: earned - spent должно ≈ balance
    const earned = Number(p.shards_lifetime_earned_v1);
    const spent = Number(p.shards_lifetime_spent_v1);
    const bal = Number(d.shards);
    if (Number.isFinite(earned) && Number.isFinite(spent) && Number.isFinite(bal)) {
      const expected = earned - spent;
      console.log(`  → earned - spent = ${expected}  vs  balance = ${bal}  (расхождение: ${bal - expected})`);
    }
    console.log(`  updatedAt (doc):          ${fmtTs(d.updatedAt)}`);
    // Метаданные последней записи, если хранятся
    if (d.shardsMeta) console.log(`  shardsMeta: ${JSON.stringify(d.shardsMeta)}`);
  }
  console.log('\n=== готово ===\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
