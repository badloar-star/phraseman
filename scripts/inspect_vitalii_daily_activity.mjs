#!/usr/bin/env node
/**
 * Уточнение жалобы Vitalii (vitalii.virchyk@gmail.com, uid=62615956-...):
 * пользователь утверждает, что заходит КАЖДЫЙ день, но progress.streak_count
 * застряло на "1"/старой дате. Ищем независимые следы ежедневной активности
 * (phone_state снапшот, progress_events, daily_stats, weekly_xp period) —
 * чтобы понять, где рвётся запись стрика: в самом факте активности или
 * в конкретно этом поле. Только ЧТЕНИЕ.
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

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
const fmtTs = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${new Date(n).toISOString()}  (${n})`;
};

async function main() {
  initAdmin();
  const db = admin.firestore();
  const uid = '62615956-e1e1-4b47-8fa0-caa088fff6d4';

  const snap = await db.collection('users').doc(uid).get();
  const d = snap.data() ?? {};
  const p = d.progress ?? {};

  console.log('root keys:', Object.keys(d).join(', '));
  console.log('updatedAt:', fmtTs(d.updatedAt));
  console.log('\n--- weekly_xp / week_points (меняются при каждом занятии) ---');
  for (const k of ['weekly_xp', 'weekly_xp_period_start', 'week_points', 'week_points_v2', 'user_total_xp']) {
    console.log(`  ${k.padEnd(28)} = ${JSON.stringify(p[k])}`);
  }
  console.log('\n--- daily_stats / stats_daily_breakdown_v1 (даты активности) ---');
  for (const k of ['daily_stats', 'stats_daily_breakdown_v1', 'active_days_v1']) {
    const v = p[k];
    if (v == null) { console.log(`  ${k}: null`); continue; }
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    console.log(`  ${k} (len ${s.length}):`);
    try {
      const parsed = JSON.parse(s);
      const keys = Array.isArray(parsed) ? parsed : Object.keys(parsed);
      console.log(`    последние записи: ${JSON.stringify(keys.slice(-15))}`);
    } catch {
      console.log(`    raw: ${s.slice(0, 300)}`);
    }
  }
  console.log('\n--- phone_state cutover related ---');
  for (const k of Object.keys(p).filter(k => /phone_state|cutover/i.test(k))) {
    console.log(`  ${k} = ${JSON.stringify(p[k]).slice(0, 200)}`);
  }
  console.log('\n--- progress_events (подколлекция, если есть) ---');
  const pe = await db.collection('users').doc(uid).collection('progress_events')
    .orderBy('createdAt', 'desc').limit(15).get().catch(() => null);
  if (pe && !pe.empty) {
    for (const doc of pe.docs) {
      const ed = doc.data();
      console.log(`  ${doc.id}: type=${ed.type} createdAt=${fmtTs(ed.createdAt)}`);
    }
  } else {
    console.log('  (подколлекции нет или пуста)');
  }
  console.log('\n--- energy / session logs (последняя активность иным путём) ---');
  for (const col of ['energy_session_operation_ledger', 'client_shard_operation_ledger']) {
    const q = await db.collection(col).where('uid', '==', uid).orderBy('ts', 'desc').limit(10).get().catch(() => null);
    if (q && !q.empty) {
      console.log(`  ▸ ${col}:`);
      for (const doc of q.docs) console.log(`      ${doc.id}: ${JSON.stringify(doc.data()).slice(0, 200)}`);
    } else {
      console.log(`  ▸ ${col}: пусто/нет`);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
