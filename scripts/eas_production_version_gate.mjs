/**
 * EAS production gate: fail the build if app store metadata was not bumped vs main.
 * Runs only when EAS_BUILD_PROFILE=production (set by EAS for that profile).
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

if (process.env.EAS_BUILD_PROFILE !== 'production') {
  process.exit(0);
}

function requireEnvPrefix(name, expectedPrefix) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`[eas-production-version-gate] ${name} is missing for production build`);
  }
  if (!value.startsWith(expectedPrefix)) {
    throw new Error(
      `[eas-production-version-gate] ${name} must start with ${expectedPrefix} for production build`,
    );
  }
}

function requireEnvEquals(name, expectedValue) {
  const value = String(process.env[name] ?? '').trim();
  if (value !== expectedValue) {
    throw new Error(
      `[eas-production-version-gate] ${name} must be ${expectedValue} for production build`,
    );
  }
}

requireEnvEquals('EXPO_PUBLIC_STORE_RELEASE', '1');

if (String(process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS ?? '').trim() === '1') {
  throw new Error('[eas-production-version-gate] EXPO_PUBLIC_ENABLE_DEV_TOOLS must not be enabled for production build');
}

const platform = String(process.env.EAS_BUILD_PLATFORM ?? process.env.EAS_BUILD_PLATFORM_NAME ?? '').trim();
const isIosBuild = platform === 'ios' || !platform;
const isAndroidBuild = platform === 'android' || !platform;

if (isIosBuild) {
  requireEnvPrefix('EXPO_PUBLIC_RC_IOS', 'appl_');
}
if (isAndroidBuild) {
  requireEnvPrefix('EXPO_PUBLIC_RC_ANDROID', 'goog_');
}

function readAppSnapshot(raw) {
  const j = JSON.parse(raw);
  const e = j.expo;
  const vc = e.android?.versionCode;
  const bn = parseInt(String(e.ios?.buildNumber ?? '0'), 10);
  if (typeof e.version !== 'string' || !e.version.trim()) {
    throw new Error('expo.version missing');
  }
  if (typeof vc !== 'number' || !Number.isFinite(vc) || vc < 1) {
    throw new Error('expo.android.versionCode invalid');
  }
  if (!Number.isFinite(bn) || bn < 1) {
    throw new Error('expo.ios.buildNumber invalid');
  }
  return { version: e.version.trim(), versionCode: vc, buildNumber: bn };
}

const DEFAULT_BRANCH_CANDIDATES = ['origin/main', 'main', 'origin/master', 'master'];

function gitShow(ref) {
  return execFileSync('git', ['show', `${ref}:app.json`], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 2 * 1024 * 1024,
  });
}

function revParse(ref) {
  return execFileSync('git', ['rev-parse', ref], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function firstParentHistory(ref) {
  return execFileSync('git', ['rev-list', '--first-parent', ref], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 2 * 1024 * 1024,
  })
    .split(/\r?\n/u)
    .map((commit) => commit.trim())
    .filter(Boolean);
}

function sameReleaseSnapshot(left, right) {
  return (
    left.version === right.version &&
    left.versionCode === right.versionCode &&
    left.buildNumber === right.buildNumber
  );
}

function resolvePreviousReleaseSnapshot(ref, currentSnapshot) {
  const [, ...ancestors] = firstParentHistory(ref);

  for (const commit of ancestors) {
    let raw;
    try {
      raw = gitShow(commit);
    } catch {
      continue;
    }

    const snapshot = readAppSnapshot(raw);
    if (!sameReleaseSnapshot(snapshot, currentSnapshot)) {
      return { ref: commit, raw };
    }
  }

  return null;
}

function resolveDefaultBranchRef() {
  for (const ref of DEFAULT_BRANCH_CANDIDATES) {
    try {
      revParse(ref);
      gitShow(ref);
      return ref;
    } catch {
      /* try next */
    }
  }
  return null;
}

const mainRef = resolveDefaultBranchRef();
if (!mainRef) {
  console.warn('[eas-production-version-gate] no default branch app.json baseline — skip');
  process.exit(0);
}

let baselineRef = mainRef;
let baselineRaw;
try {
  baselineRaw = gitShow(baselineRef);
} catch {
  console.warn('[eas-production-version-gate] cannot read app.json from', baselineRef, '— skip');
  process.exit(0);
}

const current = readAppSnapshot(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const mainSnapshot = readAppSnapshot(baselineRaw);

let head;
let headRaw;
try {
  head = revParse('HEAD');
  headRaw = gitShow(head);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error('[eas-production-version-gate] cannot read HEAD release snapshot:', detail);
  process.exit(1);
}

const headSnapshot = readAppSnapshot(headRaw);

if (!sameReleaseSnapshot(current, headSnapshot)) {
  baselineRef = head;
  baselineRaw = headRaw;
} else if (sameReleaseSnapshot(headSnapshot, mainSnapshot)) {
  try {
    const previous = resolvePreviousReleaseSnapshot(head, headSnapshot);
    if (!previous) {
      throw new Error('no previous release snapshot in first-parent history');
    }
    baselineRef = previous.ref;
    baselineRaw = previous.raw;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[eas-production-version-gate] cannot resolve previous release snapshot:', detail);
    process.exit(1);
  }
}

const baseline = readAppSnapshot(baselineRaw);

const versionOk = current.version !== baseline.version;
const androidOk = current.versionCode > baseline.versionCode;
const iosOk = current.buildNumber > baseline.buildNumber;

if (!versionOk || (isAndroidBuild && !androidOk) || (isIosBuild && !iosOk)) {
  console.error(
    '[eas-production-version-gate] Для EAS production обновите в app.json относительно baseline',
    baselineRef,
    ':',
    JSON.stringify(baseline),
    '→ сейчас:',
    JSON.stringify(current),
    '| нужно: version изменена, versionCode > baseline, ios.buildNumber > baseline',
  );
  process.exit(1);
}

console.log('[eas-production-version-gate] OK vs', baselineRef, baseline, 'platform:', platform || 'unknown');
