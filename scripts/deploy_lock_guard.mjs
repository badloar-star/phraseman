#!/usr/bin/env node

/*
 * Deploy guard — no active lock.
 *
 * Phased rollout strategy (2026-06-13):
 *   1. Firestore rules check `progressServerAuthoritative` flag before blocking
 *      client XP/streak/lesson writes. Old clients (flag absent) pass through.
 *   2. progressSubmitEvent / progressMigrateSnapshot CFs set the flag on first
 *      server event. From that moment rules protect that user's progress.
 *   3. No force-update needed — protection activates per-user automatically.
 *
 * Safe to deploy in any order:
 *   - Cloud Functions (progressSubmitEvent, progressMigrateSnapshot)
 *   - Firestore rules
 *   - Admin panel hosting
 *   - OTA / EAS client update (when ready)
 */
import fs from 'node:fs';

const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
const adminHosting = firebaseConfig.hosting?.find((entry) => entry?.target === 'admin');

if (adminHosting?.public !== 'admin') {
  console.error('Deploy blocked: Firebase Hosting target "admin" must publish the root admin directory; admin/v2 is permanently banned.');
  process.exit(1);
}

const blocksV2 = adminHosting.redirects?.some((redirect) => redirect?.source === '/v2/**' && redirect?.destination === '/legacy.html');
if (!blocksV2) {
  console.error('Deploy blocked: Firebase Hosting must redirect /v2/** away from permanently banned admin/v2.');
  process.exit(1);
}

const adminEntry = fs.readFileSync(new URL('../admin/index.html', import.meta.url), 'utf8');
if (/admin\/v2|["']\/v2\/?["']/u.test(adminEntry)) {
  console.error('Deploy blocked: admin/index.html still routes to permanently banned admin/v2.');
  process.exit(1);
}
