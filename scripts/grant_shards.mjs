#!/usr/bin/env node
/**
 * Разовая компенсация осколков конкретному пользователю.
 * Пишет тем же контрактом, что admin_grant.ts (shards + shards_updated_at_ms +
 * op/reason + запись в shard_log). БЕЗ флага --apply только показывает, что сделает.
 *
 *   node scripts/grant_shards.mjs <uid> <amount> "<comment>"          # dry-run
 *   node scripts/grant_shards.mjs <uid> <amount> "<comment>" --apply  # реально начислить
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const UID = process.argv[2];
const AMOUNT = Math.floor(Number(process.argv[3]));
const COMMENT = process.argv[4] || 'compensation';
const APPLY = process.argv.includes('--apply');

if (!UID || !Number.isFinite(AMOUNT) || AMOUNT <= 0) {
  console.error('Usage: node scripts/grant_shards.mjs <uid> <amount> "<comment>" [--apply]');
  process.exit(1);
}
if (admin.apps.length === 0) {
  let projectId;
  try { projectId = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();
const userRef = db.collection('users').doc(UID);

const snap = await userRef.get();
if (!snap.exists) { console.error(`User ${UID} not found`); process.exit(1); }
const before = Number(snap.data()?.shards) || 0;
const after = before + AMOUNT;
const name = snap.data()?.progress?.user_name ?? '(?)';

console.log(`\nПользователь: ${name}  (${UID})`);
console.log(`Баланс: ${before} → ${after}   (+${AMOUNT})`);
console.log(`Комментарий: ${COMMENT}`);

if (!APPLY) {
  console.log('\n[dry-run] Ничего не записано. Добавь --apply, чтобы начислить.\n');
  process.exit(0);
}

const grantedAtIso = new Date().toISOString();
const now = Date.now();
await db.runTransaction(async (tx) => {
  const s = await tx.get(userRef);
  const b = Number(s.data()?.shards) || 0;
  const a = b + AMOUNT;
  tx.set(userRef, {
    shards: a,
    shards_updated_at_ms: now,
    shards_updated_op: 'earn',
    shards_updated_reason: 'admin_grant',
    updatedAt: now,
  }, { merge: true });
  const logRef = userRef.collection('shard_log').doc();
  tx.set(logRef, {
    ts: grantedAtIso,
    type: 'earn',
    amount: AMOUNT,
    reason: 'admin_grant',
    balanceBefore: b,
    balanceAfter: a,
    adminEmail: 'script:grant_shards.mjs',
    comment: COMMENT,
  });
});
const check = await userRef.get();
console.log(`\n✓ Начислено. Новый баланс: ${Number(check.data()?.shards)}\n`);
process.exit(0);
