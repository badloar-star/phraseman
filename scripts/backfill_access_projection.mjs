#!/usr/bin/env node

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';

const TARGET_PROJECT = 'phraseman-ea0b3';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const help = args.includes('--help') || args.includes('-h');
const confirmation = args[args.indexOf('--confirm-project') + 1] ?? '';
const pageSizeArg = Number(args[args.indexOf('--page-size') + 1] ?? 200);
const pageSize = Number.isSafeInteger(pageSizeArg) ? Math.min(400, Math.max(1, pageSizeArg)) : 200;

if (help) {
  console.log('Usage: node scripts/backfill_access_projection.mjs [--page-size N] [--apply --confirm-project phraseman-ea0b3]');
  process.exit(0);
}
if (apply && confirmation !== TARGET_PROJECT) {
  throw new Error(`apply_requires_--confirm-project_${TARGET_PROJECT}`);
}

function text(value, max = 80) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function ms(value) {
  if (value && typeof value.toMillis === 'function') return ms(value.toMillis());
  if (value && typeof value.seconds === 'number') return ms(value.seconds * 1000);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
function truthy(value) {
  return value === true || text(value).toLowerCase() === 'true';
}
function falsy(value) {
  const normalized = text(value).toLowerCase();
  return value === false || normalized === 'false' || normalized === '0' || normalized === 'no';
}
function projectionFor(user, nowMs) {
  const progress = user?.progress && typeof user.progress === 'object' ? user.progress : {};
  const premiumPlan = text(progress.premium_plan).toLowerCase();
  const premiumExpiresAtMs = Math.max(ms(progress.premium_expiry), ms(progress.premium_rc_expiry_ms));
  const storePlan = ['monthly', 'yearly', 'annual', 'lifetime'].includes(premiumPlan);
  const premiumRevoked = falsy(progress.admin_premium_override) && !storePlan;
  const premiumSentinel = premiumPlan === 'lifetime'
    || truthy(progress.admin_premium_override)
    || truthy(progress.premium_active);
  const vipExpiresAtMs = ms(progress.vip_until ?? progress.vip_expiry);
  const vipStartsAtMs = ms(progress.vip_from);
  const vipPlan = text(progress.vip_plan).toLowerCase();
  const vipRevoked = falsy(progress.vip_active) || falsy(progress.vip_admin_override);
  const vipGranted = truthy(progress.vip_active) || truthy(progress.vip_admin_override) || Boolean(vipPlan);
  return {
    schemaVersion: 'access-projection.v1',
    premiumActive: Boolean(premiumPlan && !premiumRevoked
      && (premiumSentinel || premiumExpiresAtMs === 0 || premiumExpiresAtMs > nowMs)),
    premiumPlan,
    premiumExpiresAtMs,
    vipActive: !vipRevoked && vipGranted
      && (vipStartsAtMs === 0 || vipStartsAtMs <= nowMs)
      && (vipExpiresAtMs === 0 || vipExpiresAtMs > nowMs),
    updatedAtMs: ms(user?.updatedAt),
  };
}
function equalProjection(left, right) {
  return left?.schemaVersion === right.schemaVersion
    && left?.premiumActive === right.premiumActive
    && left?.premiumPlan === right.premiumPlan
    && Number(left?.premiumExpiresAtMs) === right.premiumExpiresAtMs
    && left?.vipActive === right.vipActive
    && Number(left?.updatedAtMs) === right.updatedAtMs;
}

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: TARGET_PROJECT });
const db = getFirestore(app);
const stats = { mode: apply ? 'apply' : 'dry-run', scanned: 0, eligible: 0, projected: 0, unchanged: 0, errors: 0 };
const nowMs = Date.now();
let cursor = null;

for (;;) {
  let query = db.collection('users').orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  if (page.empty) break;
  const batch = apply ? db.batch() : null;
  let pageWrites = 0;
  for (const userDoc of page.docs) {
    stats.scanned += 1;
    try {
      const user = userDoc.data() ?? {};
      if (!user.progress || typeof user.progress !== 'object') continue;
      stats.eligible += 1;
      const desired = projectionFor(user, nowMs);
      const targetRef = userDoc.ref.collection('access_projection').doc('current');
      const current = await targetRef.get();
      if (current.exists && equalProjection(current.data(), desired)) {
        stats.unchanged += 1;
        continue;
      }
      stats.projected += 1;
      if (batch) {
        batch.set(targetRef, desired, { merge: false });
        pageWrites += 1;
      }
    } catch {
      stats.errors += 1;
    }
  }
  if (batch && pageWrites > 0) await batch.commit();
  cursor = page.docs.at(-1);
  if (page.size < pageSize) break;
}

console.log(JSON.stringify(stats));
if (stats.errors > 0) process.exitCode = 1;
