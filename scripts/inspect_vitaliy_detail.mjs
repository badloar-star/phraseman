#!/usr/bin/env node
/**
 * Детальный разбор конкретных uid из жалобы "Vitaliy/Vitalii" (28.08.2026).
 * Только ЧТЕНИЕ.
 *   node scripts/inspect_vitaliy_detail.mjs <uid1> [uid2] ...
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
  const uids = process.argv.slice(2);

  for (const uid of uids) {
    console.log(`\n\n████████ uid=${uid} ████████`);
    const snap = await db.collection('users').doc(uid).get().catch(() => null);
    if (!snap?.exists) { console.log('нет документа'); continue; }
    const d = snap.data() ?? {};
    const p = d.progress ?? {};
    console.log(`root keys: ${Object.keys(d).join(', ')}`);
    console.log(`createdAt: ${fmtTs(d.createdAt)}   lastActive: ${fmtTs(d.lastActive ?? p.last_active_ms)}`);
    console.log(`email: ${d.email ?? '—'}   authProvider: ${d.authProvider ?? '—'}`);
    console.log(`user_name: "${p.user_name}"  level: ${p.user_level}  totalXp: ${p.user_total_xp}`);
    console.log('--- ВСЕ поля progress с "streak" или "day" ---');
    for (const k of Object.keys(p).filter(k => /streak|day|дн[ья]/i.test(k)).sort()) {
      console.log(`  ${k.padEnd(40)} = ${JSON.stringify(p[k])}`);
    }
    console.log('--- ВСЕ поля progress с "league" ---');
    for (const k of Object.keys(p).filter(k => /league/i.test(k)).sort()) {
      const v = p[k];
      console.log(`  ${k.padEnd(40)} = ${typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : JSON.stringify(v)}`);
    }
    console.log('--- ВСЕ поля progress с "flashcard" или "deck" или "pack" ---');
    for (const k of Object.keys(p).filter(k => /flashcard|deck|pack|card/i.test(k)).sort()) {
      console.log(`  ${k.padEnd(40)} = ${JSON.stringify(p[k]).slice(0, 200)}`);
    }
    console.log('--- ВСЕ поля progress с "achievement" или "award" или "reward" ---');
    const achKeys = Object.keys(p).filter(k => /achievement|award|reward/i.test(k)).sort();
    console.log(`  всего таких полей: ${achKeys.length}, из них не-null: ${achKeys.filter(k => p[k] != null).length}`);
    for (const k of achKeys.filter(k => p[k] != null)) {
      console.log(`  ${k.padEnd(50)} = ${JSON.stringify(p[k]).slice(0, 150)}`);
    }
  }
  console.log('\n=== готово ===\n');
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
