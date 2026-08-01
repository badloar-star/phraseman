#!/usr/bin/env node

// Production-safe seeder for the reviewed 200-name Reddit tournament bot corpus.
// Default mode is read-only. Applying requires --apply, an environment guard,
// the exact reviewed corpus SHA, and credentials for the pinned Firebase project.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

require('tsx/cjs');
const { generateBotProfiles } = require('../src/tournament_core.ts');
const {
  TOURNAMENT_REDDIT_BOT_NAMES_SHA256,
  TOURNAMENT_REDDIT_BOT_PROFILE_COUNT,
  TOURNAMENT_REDDIT_BOT_SEED_VERSION,
} = require('../src/tournament_reddit_bot_names.ts');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const EXPECTED_NAMES_SHA256 = TOURNAMENT_REDDIT_BOT_NAMES_SHA256;
const SEED_VERSION = TOURNAMENT_REDDIT_BOT_SEED_VERSION;
const EXPECTED_COUNT = TOURNAMENT_REDDIT_BOT_PROFILE_COUNT;
const APPLY_GUARD = 'PHRASEMAN_TOURNAMENT_REDDIT_BOT_APPLY';

function argValue(name, argv = process.argv.slice(2)) {
  const exact = `--${name}`;
  const prefix = `${exact}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(exact);
  return index >= 0 ? argv[index + 1] : undefined;
}

function resolveApplyIntent(argv = process.argv.slice(2), env = process.env) {
  const requested = argv.includes('--apply');
  if (!requested) return false;
  assert.equal(env[APPLY_GUARD], '1', 'reddit_bot_apply_guard_missing');
  return true;
}

function hashNames(names) {
  return crypto.createHash('sha256').update(`${names.join('\n')}\n`).digest('hex');
}

function buildExpectedProfiles() {
  const profiles = generateBotProfiles(EXPECTED_COUNT, SEED_VERSION).map((profile) => ({
    ...profile,
    isBot: true,
    seedVersion: SEED_VERSION,
  }));
  assert.equal(profiles.length, EXPECTED_COUNT, 'reddit_bot_profile_count_mismatch');
  assert.equal(
    new Set(profiles.map((profile) => profile.name.toLowerCase())).size,
    EXPECTED_COUNT,
    'reddit_bot_names_not_unique',
  );
  assert.equal(
    hashNames(profiles.map((profile) => profile.name)),
    EXPECTED_NAMES_SHA256,
    'reddit_bot_embedded_names_sha256_mismatch',
  );
  return profiles;
}

function assertExpectedNamesHash(argv = process.argv.slice(2)) {
  const supplied = argValue('expected-names-sha256', argv);
  assert.ok(supplied, 'expected_names_sha256_missing');
  assert.equal(supplied, EXPECTED_NAMES_SHA256, 'expected_names_sha256_mismatch');
}

function sameValue(actual, expected) {
  if (Array.isArray(expected)) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => sameValue(value, expected[index]));
  }
  if (expected && typeof expected === 'object') {
    return actual && typeof actual === 'object'
      && Object.keys(expected).every((key) => sameValue(actual[key], expected[key]));
  }
  return Object.is(actual, expected);
}

function planProfileChanges(expectedProfiles, existingById) {
  const changed = [];
  const unchangedIds = [];
  for (const profile of expectedProfiles) {
    const existing = existingById.get(profile.botId);
    if (existing && sameValue(existing, profile)) {
      unchangedIds.push(profile.botId);
      continue;
    }
    changed.push({
      id: profile.botId,
      reason: existing ? 'different' : 'missing',
      writeData: profile,
    });
  }
  return { changed, unchangedIds };
}

function buildBackupPayload(expectedProfiles, existingById, generatedAt = new Date().toISOString()) {
  return {
    kind: 'tournament_reddit_bot_seed_backup_v1',
    generatedAt,
    projectId: EXPECTED_PROJECT_ID,
    targetSeedVersion: SEED_VERSION,
    targetNamesSha256: EXPECTED_NAMES_SHA256,
    entries: expectedProfiles.map((profile) => ({
      id: profile.botId,
      exists: existingById.has(profile.botId),
      data: existingById.get(profile.botId) ?? null,
    })),
  };
}

function writeBackupFile(reportPath, expectedProfiles, existingById) {
  const payload = buildBackupPayload(expectedProfiles, existingById);
  const immutableBackupStamp = payload.generatedAt.replace(/[^0-9A-Za-z]+/g, '-');
  const reportStem = reportPath.toLowerCase().endsWith('.json')
    ? reportPath.slice(0, -5)
    : reportPath;
  const backupPath = `${reportStem}.${immutableBackupStamp}.before.json`;
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, serialized, { encoding: 'utf8', flag: 'wx' });
  return {
    backupPath,
    backupSha256: crypto.createHash('sha256').update(serialized).digest('hex'),
  };
}

function resolveReportPath(argv = process.argv.slice(2)) {
  const requested = argValue('report', argv)
    || `.codex-tmp/tournament-reddit-bots/seed-${Date.now()}.json`;
  const absolute = path.resolve(process.cwd(), requested);
  const allowedRoot = `${path.resolve(process.cwd(), '.codex-tmp')}${path.sep}`;
  assert.ok(absolute.startsWith(allowedRoot), 'report_path_must_be_under_codex_tmp');
  return absolute;
}

function loadServiceAccount(argv = process.argv.slice(2)) {
  const requested = argValue('service-account', argv);
  assert.ok(requested, 'service_account_path_missing');
  const absolute = path.resolve(process.cwd(), requested);
  const account = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  assert.equal(account.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  return account;
}

async function readProfiles(db, expectedProfiles) {
  const refs = expectedProfiles.map((profile) => db.collection('botProfiles').doc(profile.botId));
  const snapshots = await db.getAll(...refs);
  return new Map(snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [snapshot.id, snapshot.data()]));
}

async function applyChanges(db, changes, nowMs) {
  let written = 0;
  for (let index = 0; index < changes.length; index += 400) {
    const batch = db.batch();
    for (const change of changes.slice(index, index + 400)) {
      batch.set(
        db.collection('botProfiles').doc(change.id),
        { ...change.writeData, updatedAt: nowMs },
        { merge: true },
      );
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const apply = resolveApplyIntent(argv, env);
  assertExpectedNamesHash(argv);
  const expectedProfiles = buildExpectedProfiles();
  const serviceAccount = loadServiceAccount(argv);
  const reportPath = resolveReportPath(argv);

  const admin = require('firebase-admin');
  const app = admin.apps.length > 0
    ? admin.app()
    : admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: EXPECTED_PROJECT_ID,
    });
  const db = admin.firestore(app);
  const before = await readProfiles(db, expectedProfiles);
  const plan = planProfileChanges(expectedProfiles, before);
  const report = {
    kind: 'tournament_reddit_bot_seed_report_v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    mode: apply ? 'apply' : 'dry-run',
    seedVersion: SEED_VERSION,
    namesSha256: EXPECTED_NAMES_SHA256,
    expectedCount: EXPECTED_COUNT,
    existingTargetDocs: before.size,
    plannedWrites: plan.changed.length,
    unchangedTargetDocs: plan.unchangedIds.length,
    plannedIds: plan.changed.map((change) => change.id),
    productionWrites: 0,
    verifiedCount: 0,
    verifiedNoFurtherWrites: false,
    backupPath: null,
    backupSha256: null,
  };

  if (apply && plan.changed.length > 0) {
    const backup = writeBackupFile(reportPath, expectedProfiles, before);
    report.backupPath = path.relative(process.cwd(), backup.backupPath).replaceAll('\\', '/');
    report.backupSha256 = backup.backupSha256;
    report.productionWrites = await applyChanges(db, plan.changed, Date.now());
  }

  const after = await readProfiles(db, expectedProfiles);
  const verification = planProfileChanges(expectedProfiles, after);
  report.verifiedCount = after.size;
  report.verifiedNoFurtherWrites = verification.changed.length === 0;

  if (apply) {
    assert.equal(report.productionWrites, plan.changed.length, 'reddit_bot_write_count_mismatch');
    assert.equal(after.size, EXPECTED_COUNT, 'reddit_bot_post_apply_count_mismatch');
    assert.equal(verification.changed.length, 0, 'reddit_bot_post_apply_verification_failed');
  } else {
    assert.equal(report.productionWrites, 0, 'dry_run_must_not_write');
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ ...report, reportPath })}\n`);
  return report;
}

module.exports = {
  APPLY_GUARD,
  EXPECTED_COUNT,
  EXPECTED_NAMES_SHA256,
  EXPECTED_PROJECT_ID,
  SEED_VERSION,
  argValue,
  assertExpectedNamesHash,
  buildBackupPayload,
  buildExpectedProfiles,
  hashNames,
  loadServiceAccount,
  main,
  planProfileChanges,
  resolveApplyIntent,
  resolveReportPath,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  });
}
