#!/usr/bin/env node
/**
 * Разовая диагностика: почему у пользователя пропал премиум.
 * Только ЧТЕНИЕ. Ничего не пишет в базу.
 *
 * зачем: два обращения в поддержку (Eddie, Vlad) — «купил премиум, не работает».
 * Нужно увидеть связку «оплата RevenueCat → premium_* в users/{uid}».
 *
 *   node scripts/inspect_user_premium.mjs "Eddie" "Vlad"
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const QUERIES = process.argv.slice(2);
if (QUERIES.length === 0) {
  console.error('Usage: node scripts/inspect_user_premium.mjs "<nickname>" [...]');
  process.exit(1);
}

function readProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try { return JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch { return undefined; }
}
function initAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = readProjectId();
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const clean = (v, max = 64) => String(v ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
const fmtTs = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${new Date(n).toISOString()}  (${n})`;
};

async function resolveCandidates(db, QUERY) {
  const nameLower = clean(QUERY, 32).replace(/^@+/, '').toLowerCase();
  const found = new Map();
  const add = (uid, via) => { if (uid && !found.has(uid)) found.set(uid, via); };

  const idx = await db.collection('name_index').doc(nameLower).get().catch(() => null);
  if (idx?.exists) add(clean(idx.data()?.uid, 180), 'name_index');

  const legacy = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(10),
    db.collection('users').where('progress.user_name', '==', clean(QUERY, 32)).limit(10),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(10),
  ];
  for (const q of legacy) {
    const snap = await q.get().catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'legacy_exact');
  }

  if (nameLower.length >= 2) {
    const end = nameLower.slice(0, -1) + String.fromCharCode(nameLower.charCodeAt(nameLower.length - 1) + 1);
    const snap = await db.collection('users')
      .where('progress.user_name_lower', '>=', nameLower)
      .where('progress.user_name_lower', '<', end)
      .orderBy('progress.user_name_lower').limit(25).get().catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'prefix');
  }
  return found;
}

async function dumpRcTraces(db, uid) {
  const probes = [
    ['revenuecat_premium_events', 'appUserId'],
    ['revenuecat_premium_events', 'uid'],
    ['revenuecat_premium_denials', 'appUserId'],
    ['revenuecat_premium_denials', 'uid'],
    ['revenuecat_premium_lineages', 'uid'],
  ];
  for (const [col, field] of probes) {
    const snap = await db.collection(col).where(field, '==', uid).limit(10).get().catch(() => null);
    if (snap && !snap.empty) {
      console.log(`  ▸ ${col} [${field}] → ${snap.size} записей:`);
      for (const d of snap.docs) console.log(`      ${d.id}: ${JSON.stringify(d.data()).slice(0, 500)}`);
    }
  }
  // lineage doc по uid
  const lin = await db.collection('revenuecat_premium_lineages').doc(uid).get().catch(() => null);
  if (lin?.exists) console.log(`  ▸ lineage doc: ${JSON.stringify(lin.data()).slice(0, 800)}`);
  // auth_links (смена аккаунта)
  const al = await db.collection('auth_links').doc(uid).get().catch(() => null);
  if (al?.exists) console.log(`  ▸ auth_links: ${JSON.stringify(al.data()).slice(0, 500)}`);
  const owner = await db.collection('account_identity_owner_map').doc(uid).get().catch(() => null);
  if (owner?.exists) console.log(`  ▸ owner_map: ${JSON.stringify(owner.data()).slice(0, 500)}`);
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const now = Date.now();

  for (const QUERY of QUERIES) {
    console.log(`\n\n████████ ПОИСК: "${QUERY}" ████████`);
    const candidates = await resolveCandidates(db, QUERY);
    if (candidates.size === 0) { console.log('❌ Ничего не найдено.'); continue; }
    console.log(`Найдено кандидатов: ${candidates.size}`);

    for (const [uid, via] of candidates) {
      const snap = await db.collection('users').doc(uid).get().catch(() => null);
      if (!snap?.exists) { console.log(`\n--- uid=${uid} (${via}) — документа нет`); continue; }
      const d = snap.data() ?? {};
      const p = d.progress ?? {};
      console.log('\n════════════════════════════════════════════════');
      console.log(`uid: ${uid}   (via ${via})`);
      console.log(`имя: "${clean(p.user_name, 40)}"  уровень ${p.user_level ?? '—'}  XP ${p.user_total_xp ?? '—'}  стрик ${p.streak_days ?? '—'}`);
      console.log(`email: ${d.email ?? p.email ?? '—'}   создан: ${fmtTs(d.createdAt ?? p.created_at_ms)}`);
      console.log('--- ПРЕМИУМ ---');
      const keys = Object.keys(p).filter(k => /premium|vip|subscri|rc_|entitle|plan|max_/i.test(k)).sort();
      for (const k of keys) console.log(`  ${k.padEnd(36)} = ${JSON.stringify(p[k])}`);
      if (keys.length === 0) console.log('  (нет НИ ОДНОГО премиум-поля в progress)');
      console.log(`  premium_expiry (читаемо):            ${fmtTs(p.premium_expiry)}`);
      console.log(`  premium_rc_expiry_ms (читаемо):      ${fmtTs(p.premium_rc_expiry_ms)}`);
      console.log(`  now = ${fmtTs(now)}`);
      const topKeys = Object.keys(d).filter(k => /premium|vip|subscri|rc_|entitle/i.test(k));
      for (const k of topKeys) console.log(`  [root] ${k} = ${JSON.stringify(d[k])}`);
      console.log('--- СЛЕДЫ REVENUECAT / СМЕНА АККАУНТА ---');
      await dumpRcTraces(db, uid);
    }
  }
  console.log('\n=== готово ===\n');
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
