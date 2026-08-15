#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function evaluateDeployConfiguration(firebaseConfig) {
  const hosting = Array.isArray(firebaseConfig?.hosting)
    ? firebaseConfig.hosting
    : [firebaseConfig?.hosting].filter(Boolean);
  const adminTarget = hosting.find((entry) => entry?.target === "admin");
  if (adminTarget?.public !== "admin/v2") {
    return {
      ok: false,
      error:
        "Firebase admin hosting must publish the canonical admin/v2 directory.",
    };
  }
  return { ok: true, error: null };
}

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

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "firebase.json"), "utf8"),
);
const deployConfiguration = evaluateDeployConfiguration(firebaseConfig);
if (!deployConfiguration.ok) {
  console.error(`[deploy-lock-guard] ${deployConfiguration.error}`);
  process.exitCode = 1;
}
