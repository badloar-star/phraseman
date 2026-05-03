/**
 * EAS production gate: fail the build if app store metadata was not bumped vs main.
 * Runs only when EAS_BUILD_PROFILE=production (set by EAS for that profile).
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (process.env.EAS_BUILD_PROFILE !== 'production') {
  process.exit(0);
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
  return execSync(`git show ${ref}:app.json`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 2 * 1024 * 1024,
  });
}

function revParse(ref) {
  return execSync(`git rev-parse ${ref}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
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

let head;
let mainTip;
try {
  head = revParse('HEAD');
  mainTip = revParse(mainRef);
} catch {
  console.warn('[eas-production-version-gate] git rev-parse failed — skip');
  process.exit(0);
}

if (head === mainTip) {
  try {
    baselineRef = `${mainRef}~1`;
    baselineRaw = gitShow(baselineRef);
  } catch {
    console.warn('[eas-production-version-gate] single commit repo — skip');
    process.exit(0);
  }
}

const current = readAppSnapshot(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const baseline = readAppSnapshot(baselineRaw);

const versionOk = current.version !== baseline.version;
const androidOk = current.versionCode > baseline.versionCode;
const iosOk = current.buildNumber > baseline.buildNumber;

if (!versionOk || !androidOk || !iosOk) {
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

console.log('[eas-production-version-gate] OK vs', baselineRef, baseline);
