#!/usr/bin/env node

/*
 * DEPLOY LOCK - 2026-06-13
 *
 * Do not deploy from another chat/session right now.
 *
 * Reason: the server-authoritative progress cutover is only partially wired.
 * Deploying Firestore rules, Cloud Functions, or OTA/EAS out of order can make
 * old production clients lose permission to sync XP/streak/progress or can
 * route new clients to functions that are not deployed yet.
 *
 * Safe release order must be reviewed in one controlled session before this
 * guard is removed:
 *   1. Deploy required Cloud Functions.
 *   2. Release/OTA client that calls those functions.
 *   3. Only then tighten Firestore rules for server-owned progress keys.
 */

console.error('');
console.error('DEPLOY BLOCKED: Phraseman deploy lock is active.');
console.error('Reason: server-authoritative progress cutover must not be deployed out of order.');
console.error('Do not bypass this from another chat/session. Review scripts/deploy_lock_guard.mjs first.');
console.error('');
process.exit(1);
