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
