#!/usr/bin/env node
/**
 * Считает СКОЛЬКО осколков реально потерял пользователь из-за stale-перезаписи.
 * Метод: берём самый ранний надёжный `balanceBefore` как якорь и применяем ТОЛЬКО
 * дельты (amount со знаком по type). Полученный «должный» баланс сравниваем с текущим
 * реальным (users/{uid}.shards). Разница = недоначислено. Только чтение.
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const UID = process.argv[2];
if (!UID) { console.error('Usage: node scripts/reconcile_shards.mjs <uid>'); process.exit(1); }
if (admin.apps.length === 0) {
  let projectId;
  try { projectId = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

const snap = await db.collection('users').doc(UID).collection('shard_log').get();
const rows = snap.docs.map((d) => d.data()).filter(Boolean);
rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

const userSnap = await db.collection('users').doc(UID).get();
const actualNow = Number(userSnap.data()?.shards);

// Якорь: первый balanceBefore (самый ранний надёжный старт).
const first = rows.find((r) => typeof r.balanceBefore === 'number');
let intended = first ? Number(first.balanceBefore) : 0;
const anchorTs = first?.ts;

// Применяем все дельты подряд — это «идеальный» баланс без единого stale-отката.
for (const r of rows) {
  const amt = Number(r.amount) || 0;
  intended += r.type === 'spend' ? -amt : amt;
}

// Дополнительно: сумма отрицательных «скачков» (before < предыдущего after) —
// это прямые потери, зафиксированные в ленте.
let seenAfter = null;
let lostFromJumps = 0;
const losses = [];
for (const r of rows) {
  if (seenAfter !== null && typeof r.balanceBefore === 'number' && r.balanceBefore < seenAfter) {
    const drop = seenAfter - r.balanceBefore;
    lostFromJumps += drop;
    losses.push({ ts: String(r.ts).slice(0, 19), drop, from: seenAfter, to: r.balanceBefore, reason: r.reason });
  }
  if (typeof r.balanceAfter === 'number') seenAfter = r.balanceAfter;
}

console.log(`\n=== Реконсиляция осколков ${UID} ===`);
console.log(`Записей в ленте: ${rows.length}`);
console.log(`Якорь (первый balanceBefore): ${intended - rows.reduce((s, r) => s + (r.type === 'spend' ? -(Number(r.amount)||0) : (Number(r.amount)||0)), 0)} @ ${anchorTs}`);
console.log(`\n«Идеальный» баланс (якорь + все дельты, без откатов): ${intended}`);
console.log(`Фактический баланс сейчас (users.shards):            ${actualNow}`);
console.log(`→ НЕДОНАЧИСЛЕНО (ideal - actual):                     ${intended - actualNow}`);
console.log(`\nСумма отрицательных скачков в ленте (прямые потери): ${lostFromJumps}`);
console.log('Крупнейшие потери:');
losses.sort((a, b) => b.drop - a.drop).slice(0, 8).forEach((l) => {
  console.log(`  −${String(l.drop).padStart(4)}  ${l.ts}  ${l.from}→${l.to}  (${l.reason})`);
});
console.log('');
process.exit(0);
