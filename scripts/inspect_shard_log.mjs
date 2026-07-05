#!/usr/bin/env node
/** Читает users/{uid}/shard_log — ленту транзакций осколков. Только чтение. */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const UID = process.argv[2];
if (!UID) { console.error('Usage: node scripts/inspect_shard_log.mjs <uid>'); process.exit(1); }

function readProjectId() {
  try { return JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch { return undefined; }
}
if (admin.apps.length === 0) {
  const projectId = readProjectId();
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

const snap = await db.collection('users').doc(UID).collection('shard_log').get();
const rows = snap.docs.map((d) => d.data()).filter(Boolean);
rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
console.log(`\nshard_log для ${UID}: ${rows.length} записей\n`);
let runningSeen = null;
for (const r of rows) {
  const before = r.balanceBefore ?? '?';
  const after = r.balanceAfter ?? '?';
  // помечаем скачки, где after не равен предыдущему after (признак рассинхрона)
  let flag = '';
  if (runningSeen !== null && typeof r.balanceBefore === 'number' && r.balanceBefore !== runningSeen) {
    flag = `  ⚠ before(${r.balanceBefore}) ≠ предыдущий after(${runningSeen})  [скачок ${r.balanceBefore - runningSeen}]`;
  }
  runningSeen = typeof after === 'number' ? after : runningSeen;
  const sign = r.type === 'spend' ? '-' : '+';
  console.log(`${String(r.ts).slice(0, 19)}  ${r.type.padEnd(5)} ${sign}${r.amount}  ${String(before).padStart(4)}→${String(after).toString().padStart(4)}  ${r.reason ?? ''}${flag}`);
}
console.log('');
process.exit(0);
