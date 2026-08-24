#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_NAME = 'asset-hygiene-safe';
const SCRIPT_VERSION = '2.0.0';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);
const COMPRESSIBLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SOURCE_ROOTS = ['app', 'components', 'constants', 'hooks', 'contexts', 'lib', 'modules'];
const CONFIG_FILES = ['app.json', 'app.config.js', 'app.config.ts', 'eas.json', 'package.json'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.cjs', '.mjs']);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  'source', 'sources', 'singles', 'dalle', 'dalli', 'dalle_sources', 'dalli_sources',
  'original', 'originals', 'draft', 'drafts', 'raw', 'backup', 'backups', 'output',
  'qa-artifacts', 'history',
]);
const FIXED_GEOMETRY_DIRS = [
  'assets/images/levels/league-v6-icons/',
  'assets/images/weekly_boon_icons/',
  'assets/images/weekly_compass_icons/',
];
// Read-only runtime guard: tests/android_bundle_hygiene_contract.test.ts keeps
// these WebP replacements present even where current source no longer has a
// literal require. They are not deletion candidates unless that contract is
// intentionally changed in the same owner-approved task.
const PROTECTED_RUNTIME_ASSETS = new Set([
  'assets/images/onboarding_icon_cutout.webp',
  'assets/images/flow_clean_202607/logo_cutout.webp',
  'assets/images/flow_clean_202607/source_tiktok.webp',
  'assets/images/flow_clean_202607/source_store.webp',
  'assets/images/flow_clean_202607/source_social.webp',
  'assets/images/flow_clean_202607/source_youtube.webp',
  'assets/images/flow_clean_202607/source_google.webp',
  'assets/images/flow_clean_202607/source_friends.webp',
  'assets/images/flow_clean_202607/source_other.webp',
  'assets/images/flow_clean_202607/level_a0.webp',
  'assets/images/flow_clean_202607/level_a1.webp',
  'assets/images/flow_clean_202607/level_a2.webp',
  'assets/images/flow_clean_202607/level_b1.webp',
  'assets/images/flow_clean_202607/level_b2.webp',
  'assets/images/flow_clean_202607/goal_series.webp',
  'assets/images/flow_clean_202607/goal_everyday.webp',
  'assets/images/flow_clean_202607/goal_travel.webp',
  'assets/images/flow_clean_202607/goal_words.webp',
  'assets/images/flow_clean_202607/goal_mind.webp',
  'assets/images/flow_clean_202607/minutes_5.webp',
  'assets/images/flow_clean_202607/minutes_10.webp',
  'assets/images/flow_clean_202607/minutes_15.webp',
  'assets/images/flow_clean_202607/minutes_20.webp',
  'assets/images/flow_clean_202607/intro_compass.webp',
  'assets/images/flow_clean_202607/notifications.webp',
  'assets/images/flow_clean_202607/plan_result.webp',
  'assets/images/flow_clean_202607/start_plus.webp',
  'assets/images/flow_clean_202607/start_free.webp',
  'assets/images/flow_clean_202607/benefit_plan.webp',
  'assets/images/flow_clean_202607/benefit_speech.webp',
  'assets/images/flow_clean_202607/benefit_repeat.webp',
  'assets/images/flow_clean_202607/benefit_flow.webp',
  'assets/images/flow_clean_202607/paywall_yearly.webp',
  'assets/images/flow_clean_202607/paywall_monthly.webp',
  'assets/images/flow_clean_202607/paywall_lifetime.webp',
  'assets/images/update_modal/update-modal-premium-emblem.webp',
  'assets/images/splash-glyph.webp',
  'assets/images/splash-wordmark.webp',
]);
const MAX_LONG_SIDE = 512;
const WEBP_QUALITY = 82;
const WEBP_ALPHA_QUALITY = 90;
const MIN_WEBP_SAVING_BYTES = 1024;
const TOKEN_CHAR_CLASS = 'A-Za-z0-9_.-';
const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

function parseArguments(argv) {
  const result = {
    root: SCRIPT_ROOT,
    json: false,
    delete: false,
    write: false,
    backupDir: null,
    reportPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') result.json = true;
    else if (argument === '--delete') result.delete = true;
    else if (argument === '--write') result.write = true;
    else if (argument === '--root' || argument === '--backup-dir' || argument === '--report') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === '--root') result.root = value;
      if (argument === '--backup-dir') result.backupDir = value;
      if (argument === '--report') result.reportPath = value;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (result.delete && result.write) throw new Error('--delete and --write are separate operations');
  return result;
}

function toPosix(value) {
  return String(value).replace(/\\/g, '/');
}

function relativeTo(root, absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

function assertInside(parent, candidate, label) {
  const parentAbsolute = path.resolve(parent);
  const candidateAbsolute = path.resolve(candidate);
  const relative = path.relative(parentAbsolute, candidateAbsolute);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    return candidateAbsolute;
  }
  throw new Error(`${label} escapes ${parentAbsolute}: ${candidateAbsolute}`);
}

function validateRoot(rootValue) {
  const root = path.resolve(rootValue);
  const assetsRoot = path.join(root, 'assets', 'images');
  if (!fs.existsSync(assetsRoot) || !fs.statSync(assetsRoot).isDirectory()) {
    throw new Error(`assets/images directory not found under --root: ${root}`);
  }
  let gitRoot;
  try {
    gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: GIT_MAX_BUFFER_BYTES,
    }).trim();
  } catch {
    throw new Error(`--root is not a Git worktree: ${root}`);
  }
  if (path.resolve(gitRoot) !== root) {
    throw new Error(`--root must be the Git worktree root: expected ${path.resolve(gitRoot)}`);
  }
  return { root, assetsRoot: path.resolve(assetsRoot) };
}

function validateBackup(root, assetsRoot, backupValue) {
  if (!backupValue) throw new Error('destructive mode requires an explicit --backup-dir');
  if (!path.isAbsolute(backupValue)) throw new Error('--backup-dir must be an absolute path');
  const backupDir = path.resolve(backupValue);
  const relativeFromAssets = path.relative(assetsRoot, backupDir);
  if (!relativeFromAssets.startsWith('..') && !path.isAbsolute(relativeFromAssets)) {
    throw new Error('--backup-dir must not be inside assets/images');
  }
  if (backupDir === root) throw new Error('--backup-dir must not be the worktree root');
  return backupDir;
}

function walkFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function isExcludedAsset(relativePath) {
  const segments = toPosix(relativePath).split('/');
  const fileStem = path.posix.basename(segments.at(-1), path.posix.extname(segments.at(-1)));
  if (/(?:_|-)source$/i.test(fileStem)) return true;
  const directorySegments = segments.slice(0, -1);
  return directorySegments.some(segment => {
    const normalized = segment.toLowerCase();
    if (EXCLUDED_DIRECTORY_NAMES.has(normalized)) return true;
    return (
      /(?:^|[-_.])(dalle|dalli)(?:[-_.]sources?)?(?:$|[-_.])/i.test(normalized)
      || /(?:^|[-_.])(sources?|raw|originals?|drafts?|backups?|history)(?:$|[-_.])/i.test(normalized)
    );
  });
}

function isRecoveryArtifact(relativePath) {
  const name = path.posix.basename(toPosix(relativePath));
  return /\.asset-hygiene-[^.\/]+(?:-[^.\/]*)?\.(?:quarantine|tmp|partial)$/i.test(name);
}

function collectMutationRecoveryArtifacts(root, assetFiles) {
  const candidates = [...assetFiles];
  for (const sourceRoot of SOURCE_ROOTS) {
    candidates.push(...walkFiles(path.join(root, sourceRoot)).map(absolute => relativeTo(root, absolute)));
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const configArtifact = CONFIG_FILES.some(configFile => (
      entry.name.startsWith(`${configFile}.asset-hygiene-`)
      || entry.name.startsWith(`.${configFile}.asset-hygiene-`)
    ));
    if (configArtifact) candidates.push(relativeTo(root, path.join(root, entry.name)));
  }
  return uniqueSorted(candidates.filter(isRecoveryArtifact));
}

function readSourceEntries(root) {
  const paths = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    for (const absolute of walkFiles(path.join(root, sourceRoot))) {
      if (SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase())) paths.push(absolute);
    }
  }
  for (const configFile of CONFIG_FILES) {
    const absolute = path.join(root, configFile);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) paths.push(absolute);
  }
  return [...new Set(paths)].sort().map(absolute => {
    const buffer = fs.readFileSync(absolute);
    const rawContent = buffer.toString('utf8');
    return {
      absolute,
      relative: relativeTo(root, absolute),
      rawContent,
      searchContent: normalizeSearchContent(rawContent),
      snapshot: { buffer, ...bufferSnapshot(buffer) },
    };
  });
}

function normalizeSearchContent(rawContent) {
  return rawContent.replace(/\\+/g, '/').replace(/\/{2,}/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactTokenRegex(value, flags = '') {
  return new RegExp(`(^|[^${TOKEN_CHAR_CLASS}])${escapeRegex(value)}(?![${TOKEN_CHAR_CLASS}])`, flags);
}

function exactAssetLiteralMatches(rawContent, assetRelative) {
  const literalPattern = assetRelative
    .split('/')
    .map(escapeRegex)
    .join('(?:/|\\\\+)');
  const expression = new RegExp(
    `(^|[^${TOKEN_CHAR_CLASS}])(${literalPattern})(?![${TOKEN_CHAR_CLASS}])`,
    'g',
  );
  const matches = [];
  let match;
  while ((match = expression.exec(rawContent)) !== null) {
    const start = match.index + match[1].length;
    matches.push({ start, end: start + match[2].length, rawText: match[2] });
  }
  return matches;
}

function sourceReferences(assetRelative, sourceEntries) {
  const tail = toPosix(assetRelative);
  const base = path.posix.basename(tail);
  const baseRegex = exactTokenRegex(base);
  const tailReferences = [];
  const baseOnlyReferences = [];
  for (const entry of sourceEntries) {
    const matches = exactAssetLiteralMatches(entry.rawContent, tail);
    if (matches.length > 0) tailReferences.push({ entry, matches });
    else if (baseRegex.test(entry.searchContent)) baseOnlyReferences.push(entry);
  }
  return { tailReferences, baseOnlyReferences, used: tailReferences.length > 0 || baseOnlyReferences.length > 0 };
}

function sourceInventorySha256(sourceEntries) {
  const inventory = sourceEntries
    .map(entry => `${entry.relative}\0${entry.snapshot.sha256}`)
    .sort();
  return sha256(inventory.join('\0'));
}

function referenceMapSha256(sourceEntries, imagePaths, metrics) {
  metrics.referenceMapComputations += 1;
  const referenceMap = imagePaths.map(assetRelative => {
    const references = sourceReferences(assetRelative, sourceEntries);
    return JSON.stringify({
      asset: assetRelative,
      tails: references.tailReferences.map(reference => ({
        source: reference.entry.relative,
        literals: reference.matches.map(match => match.rawText),
      })),
      basenames: references.baseOnlyReferences.map(entry => entry.relative),
    });
  });
  return sha256(referenceMap.join('\0'));
}

function sourceState(sourceEntries, imagePaths, metrics) {
  return {
    inventorySha256: sourceInventorySha256(sourceEntries),
    referenceMapSha256: referenceMapSha256(sourceEntries, imagePaths, metrics),
  };
}

function assertSourceState(root, expectedInventorySha256, metrics) {
  metrics.boundaryChecks += 1;
  const actualEntries = readSourceEntries(root);
  if (sourceInventorySha256(actualEntries) !== expectedInventorySha256) {
    throw new Error('source inventory changed after preflight');
  }
}

function readGitState(root) {
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  }).toString('utf8');
  const records = raw.split('\0').filter(Boolean);
  const state = new Map();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const relative = toPosix(record.slice(3));
    state.set(relative, status === '??' ? 'untracked' : 'dirty');
    if (status.includes('R') || status.includes('C')) index += 1;
  }
  return state;
}

function readGitBuffer(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readTrackedPaths(root) {
  const raw = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  }).toString('utf8');
  return new Set(raw.split('\0').filter(Boolean).map(toPosix));
}

function findAssetPatterns(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value.assetPatternsToBeBundled)) return value.assetPatternsToBeBundled;
  for (const child of Object.values(value)) {
    const found = findAssetPatterns(child);
    if (found) return found;
  }
  return null;
}

function globToRegex(pattern) {
  let expression = '';
  const normalized = toPosix(pattern).replace(/^\.\//, '');
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '*') {
      if (normalized[index + 1] === '*') {
        if (normalized[index + 2] === '/') {
          expression += '(?:[^/]+/)*';
          index += 2;
        } else {
          expression += '.*';
          index += 1;
        }
      } else expression += '[^/]*';
    } else if ('.+^${}()|[]\\?'.includes(character)) expression += `\\${character}`;
    else expression += character;
  }
  return new RegExp(`^${expression}$`);
}

function collectConfigPngs(sourceEntries, imagePaths) {
  const configNames = new Set(CONFIG_FILES);
  const configEntries = sourceEntries.filter(entry => configNames.has(entry.relative));
  const pngs = new Set();
  for (const relative of imagePaths) {
    if (path.extname(relative).toLowerCase() !== '.png') continue;
    if (sourceReferences(relative, configEntries).used) pngs.add(relative);
  }
  return pngs;
}

function statusKind(relativePath, gitState, trackedPaths) {
  const normalized = toPosix(relativePath);
  return gitState.get(normalized) || (trackedPaths.has(normalized) ? 'clean' : 'untracked');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function patchExactAssetMatches(rawContent, matches, outputRelative) {
  const outputExtension = path.posix.extname(outputRelative);
  let updated = rawContent;
  for (const match of [...matches].sort((left, right) => right.start - left.start)) {
    if (updated.slice(match.start, match.end) !== match.rawText) {
      throw new Error('source reference changed before patch');
    }
    const replacement = match.rawText.replace(/\.(?:png|jpe?g)$/i, outputExtension);
    if (replacement === match.rawText) throw new Error(`unsupported source reference: ${match.rawText}`);
    updated = `${updated.slice(0, match.start)}${replacement}${updated.slice(match.end)}`;
  }
  return updated;
}

function atomicWrite(absolutePath, content) {
  const temporary = `${absolutePath}.asset-hygiene-${process.pid}-${Date.now()}.tmp`;
  fs.writeFileSync(temporary, content);
  try {
    fs.renameSync(temporary, absolutePath);
  } catch (error) {
    try { fs.rmSync(temporary, { force: true }); } catch {}
    throw error;
  }
}

function bufferSnapshot(buffer) {
  return { bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}

function readFileSnapshot(absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  return { buffer, ...bufferSnapshot(buffer) };
}

function snapshotsMatch(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function verifyFileSnapshot(absolutePath, expectedSnapshot, label) {
  const current = readFileSnapshot(absolutePath);
  if (!snapshotsMatch(current, expectedSnapshot)) {
    throw new Error(`${label} changed after preflight`);
  }
  return current;
}

function verifyGitAndSnapshot(root, relativePath, absolutePath, expectedSnapshot, trackedPaths, committedSnapshots) {
  const current = verifyFileSnapshot(absolutePath, expectedSnapshot, relativePath);
  const currentState = statusKind(relativePath, readGitState(root), trackedPaths);
  if (currentState !== 'clean') {
    const committed = committedSnapshots.get(relativePath);
    if (!committed || !snapshotsMatch(current, committed)) {
      throw new Error(`${relativePath} Git state changed after preflight (${currentState})`);
    }
  }
  return current;
}

function backupFile(root, backupDir, relativePath, sourceSnapshot) {
  const source = assertInside(root, path.join(root, relativePath), 'backup source');
  const destination = assertInside(backupDir, path.join(backupDir, relativePath), 'backup target');
  if (!fs.existsSync(source)) throw new Error(`backup source is missing: ${relativePath}`);
  const currentSource = readFileSnapshot(source);
  if (!snapshotsMatch(currentSource, sourceSnapshot)) {
    throw new Error(`backup source changed after preflight: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const reused = fs.existsSync(destination);
  if (!reused) fs.copyFileSync(source, destination);
  const backupSnapshot = readFileSnapshot(destination);
  if (!snapshotsMatch(backupSnapshot, sourceSnapshot)) {
    throw new Error(`backup mismatch for ${relativePath}`);
  }
  return {
    path: relativePath,
    bytes: sourceSnapshot.bytes,
    sourceSha256: sourceSnapshot.sha256,
    backupSha256: backupSnapshot.sha256,
    reused,
  };
}

function verifyPreparedBackup(backupDir, relativePath, sourceSnapshot) {
  const destination = assertInside(backupDir, path.join(backupDir, relativePath), 'backup target');
  verifyFileSnapshot(destination, sourceSnapshot, `backup ${relativePath}`);
}

function recoveryError(message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.recoveryRequired = true;
  return error;
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function exclusiveWriteOwned(absolutePath, content, label) {
  let descriptor;
  let ownedIdentity;
  try {
    descriptor = fs.openSync(absolutePath, 'wx');
    ownedIdentity = fs.fstatSync(descriptor);
    let offset = 0;
    while (offset < content.length) {
      const written = fs.writeSync(descriptor, content, offset, content.length - offset, null);
      if (written <= 0) throw new Error(`${label} write made no progress`);
      offset += written;
    }
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    return verifyFileSnapshot(
      absolutePath,
      { buffer: content, ...bufferSnapshot(content) },
      label,
    );
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
      descriptor = undefined;
    }
    if (ownedIdentity) {
      try {
        const currentIdentity = fs.statSync(absolutePath);
        if (!sameFileIdentity(ownedIdentity, currentIdentity)) {
          throw recoveryError(`${label} owned partial path was replaced concurrently`);
        }
        fs.unlinkSync(absolutePath);
      } catch (cleanupError) {
        if (cleanupError && typeof cleanupError === 'object' && cleanupError.code === 'ENOENT') {
          // The owned partial no longer exists.
        } else if (cleanupError && cleanupError.recoveryRequired) {
          throw cleanupError;
        } else {
          throw recoveryError(`${label} owned partial cleanup failed`, cleanupError);
        }
      }
    }
    throw error;
  }
}

function quarantinePathFor(absolutePath) {
  return path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.asset-hygiene-${process.pid}-${crypto.randomUUID()}.quarantine`,
  );
}

function restoreQuarantine(quarantinePath, absolutePath, capturedSnapshot, label) {
  const quarantineIdentity = fs.statSync(quarantinePath);
  try {
    fs.linkSync(quarantinePath, absolutePath);
  } catch (error) {
    throw recoveryError(`${label} cannot restore quarantine without replacing destination`, error);
  }
  const destinationIdentity = fs.statSync(absolutePath);
  if (!sameFileIdentity(quarantineIdentity, destinationIdentity)) {
    throw recoveryError(`${label} restored destination identity mismatch`);
  }
  try {
    verifyFileSnapshot(absolutePath, capturedSnapshot, `${label} restored quarantine`);
    fs.unlinkSync(quarantinePath);
  } catch (error) {
    throw recoveryError(`${label} restored quarantine verification or cleanup failed`, error);
  }
}

function quarantineExisting(absolutePath, expectedSnapshot, label) {
  const quarantinePath = quarantinePathFor(absolutePath);
  fs.renameSync(absolutePath, quarantinePath);
  const capturedSnapshot = readFileSnapshot(quarantinePath);
  if (!snapshotsMatch(capturedSnapshot, expectedSnapshot)) {
    try {
      restoreQuarantine(quarantinePath, absolutePath, capturedSnapshot, label);
    } catch (restoreError) {
      throw recoveryError(`${label} changed and quarantine restoration failed`, restoreError);
    }
    throw new Error(`${label} changed at final path-operation window`);
  }
  return { quarantinePath, capturedSnapshot };
}

function finalizeQuarantine(quarantine, expectedSnapshot, label) {
  verifyFileSnapshot(quarantine.quarantinePath, expectedSnapshot, `${label} quarantine`);
  fs.unlinkSync(quarantine.quarantinePath);
}

function replaceExistingWithQuarantine(absolutePath, expectedSnapshot, output, label) {
  const quarantine = quarantineExisting(absolutePath, expectedSnapshot, label);
  try {
    const writtenSnapshot = exclusiveWriteOwned(absolutePath, output, label);
    return { ...quarantine, writtenSnapshot };
  } catch (error) {
    try {
      if (!fs.existsSync(absolutePath)) {
        restoreQuarantine(quarantine.quarantinePath, absolutePath, quarantine.capturedSnapshot, label);
      } else {
        throw recoveryError(`${label} replacement destination appeared concurrently`, error);
      }
    } catch (restoreError) {
      if (restoreError && restoreError.recoveryRequired) throw restoreError;
      throw recoveryError(`${label} replacement failed and quarantine restoration failed`, restoreError);
    }
    throw error;
  }
}

function rollbackReplacement(absolutePath, replacement, label) {
  const current = quarantineExisting(absolutePath, replacement.writtenSnapshot, `${label} rollback current`);
  try {
    restoreQuarantine(
      replacement.quarantinePath,
      absolutePath,
      replacement.capturedSnapshot,
      `${label} rollback original`,
    );
    finalizeQuarantine(current, replacement.writtenSnapshot, `${label} rollback replacement`);
  } catch (error) {
    if (!fs.existsSync(absolutePath) && fs.existsSync(current.quarantinePath)) {
      try { restoreQuarantine(current.quarantinePath, absolutePath, current.capturedSnapshot, label); } catch {}
    }
    throw recoveryError(`${label} rollback failed`, error);
  }
}

function removeVerifiedExisting(absolutePath, expectedSnapshot, label) {
  const quarantine = quarantineExisting(absolutePath, expectedSnapshot, label);
  finalizeQuarantine(quarantine, expectedSnapshot, label);
}

function writeReport(reportPath, report) {
  const absolute = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  atomicWrite(absolute, `${JSON.stringify(report, null, 2)}\n`);
}

function humanReport(report) {
  const saved = report.summary.projectedBytesSaved;
  return [
    `mode: ${report.mode}${report.dryRun ? ' (dry-run)' : ''}`,
    `assets scanned: ${report.audit.scanned}`,
    `unused: ${report.audit.unused.length} (${report.audit.bytes} bytes)`,
    `compression candidates: ${report.compression.candidates.length} (${saved} bytes projected saving)`,
    `deleted: ${report.deleted.length}; compressed: ${report.compressed.length}; converted: ${report.converted.length}`,
    `skipped dirty: ${report.skipped.dirty.length}; untracked: ${report.skipped.untracked.length}`,
    `failed: ${report.failed.length}`,
  ].join('\n');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { root, assetsRoot } = validateRoot(options.root);
  const destructive = options.delete || options.write;
  const backupDir = destructive ? validateBackup(root, assetsRoot, options.backupDir) : null;
  const startHead = readGitBuffer(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const startGitStatus = readGitBuffer(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const startTrackedPaths = readGitBuffer(root, ['ls-files', '-z']);
  const sourceEntries = readSourceEntries(root);
  const gitState = readGitState(root);
  const trackedPaths = readTrackedPaths(root);
  const appJsonPath = path.join(root, 'app.json');
  const appJson = fs.existsSync(appJsonPath) ? JSON.parse(fs.readFileSync(appJsonPath, 'utf8')) : {};
  const bundledMatchers = (findAssetPatterns(appJson) || [])
    .filter(pattern => typeof pattern === 'string' && !pattern.startsWith('node_modules/'))
    .map(globToRegex);
  const allAssetFiles = walkFiles(assetsRoot).map(absolute => relativeTo(root, absolute)).sort();
  const recoveryArtifacts = collectMutationRecoveryArtifacts(root, allAssetFiles);
  const imagePaths = allAssetFiles
    .map(relative => path.join(root, relative))
    .filter(absolute => IMAGE_EXTENSIONS.has(path.extname(absolute).toLowerCase()))
    .map(absolute => relativeTo(root, absolute))
    .sort();
  const configPngs = collectConfigPngs(sourceEntries, imagePaths);
  const sourceValidation = { boundaryChecks: 0, referenceMapComputations: 0 };
  const initialSourceState = sourceState(sourceEntries, imagePaths, sourceValidation);
  let expectedSourceInventorySha256 = initialSourceState.inventorySha256;

  const report = {
    schemaVersion: 2,
    script: {
      name: SCRIPT_NAME,
      version: SCRIPT_VERSION,
      sha256: sha256(fs.readFileSync(SCRIPT_FILE)),
    },
    startedAt: new Date().toISOString(),
    startState: {
      head: startHead,
      gitStatusSha256: sha256(startGitStatus),
      trackedPathsSha256: sha256(startTrackedPaths),
      sourceFilesSha256: initialSourceState.inventorySha256,
      referenceMapSha256: initialSourceState.referenceMapSha256,
      assetInventorySha256: '',
    },
    protectedRuntimeAssets: [...PROTECTED_RUNTIME_ASSETS].sort(),
    sourceValidation,
    recoveryArtifacts,
    root,
    mode: options.delete ? 'delete' : options.write ? 'compress' : 'audit',
    dryRun: !destructive,
    backupDir,
    audit: { scanned: imagePaths.length, used: [], unused: [], deletable: [], bytes: 0 },
    compression: { candidates: [] },
    skipped: { dirty: [], untracked: [], excluded: [], configPng: [], unsafeReference: [] },
    deleted: [],
    compressed: [],
    converted: [],
    backups: [],
    recoveryRequired: false,
    failed: [],
    summary: { candidateBytesBefore: 0, projectedBytesAfter: 0, projectedBytesSaved: 0 },
  };

  if (recoveryArtifacts.length > 0) {
    report.recoveryRequired = true;
    for (const relative of recoveryArtifacts) {
      report.failed.push({ path: relative, reason: 'asset hygiene recovery artifact requires manual resolution' });
    }
  }

  const assetRecords = [];
  const assetInventory = [];
  for (const relative of imagePaths) {
    const absolute = assertInside(assetsRoot, path.join(root, relative), 'asset target');
    let snapshot;
    try {
      fs.statSync(absolute);
      snapshot = readFileSnapshot(absolute);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        assetInventory.push(`${relative}\0missing`);
        report.failed.push({ path: relative, reason: 'asset disappeared during scan' });
        continue;
      }
      throw error;
    }
    assetInventory.push(`${relative}\0${snapshot.sha256}`);
    const protectedRuntimeAsset = PROTECTED_RUNTIME_ASSETS.has(relative);
    if (!protectedRuntimeAsset && isExcludedAsset(relative)) {
      report.skipped.excluded.push(relative);
      continue;
    }
    const references = sourceReferences(relative, sourceEntries);
    const state = statusKind(relative, gitState, trackedPaths);
    if (state === 'dirty') report.skipped.dirty.push(relative);
    if (state === 'untracked') report.skipped.untracked.push(relative);
    if (references.used || protectedRuntimeAsset) report.audit.used.push(relative);
    else {
      report.audit.unused.push(relative);
      report.audit.bytes += snapshot.bytes;
      if (state === 'clean') report.audit.deletable.push(relative);
    }
    assetRecords.push({ relative, absolute, references, state, snapshot });
  }
  report.startState.assetInventorySha256 = sha256(assetInventory.join('\0'));

  if (options.delete && report.failed.length === 0) {
    const recordByRelative = new Map(assetRecords.map(record => [record.relative, record]));
    const backupGitState = readGitState(root);
    const deletionCandidates = report.audit.deletable.filter(relative => {
      const state = statusKind(relative, backupGitState, trackedPaths);
      if (state === 'clean') return true;
      report.skipped[state].push(relative);
      return false;
    });
    for (const relative of deletionCandidates) {
      const record = recordByRelative.get(relative);
      try {
        if (!record) throw new Error(`missing preflight record: ${relative}`);
        report.backups.push(backupFile(root, backupDir, relative, record.snapshot));
      } catch (error) {
        report.failed.push({ path: relative, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    for (const relative of deletionCandidates) {
      if (report.failed.length > 0) break;
      const absolute = assertInside(assetsRoot, path.join(root, relative), 'delete target');
      const record = recordByRelative.get(relative);
      const currentState = statusKind(relative, readGitState(root), trackedPaths);
      if (currentState !== 'clean') {
        report.skipped[currentState].push(relative);
        continue;
      }
      try {
        assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
        const currentSnapshot = readFileSnapshot(absolute);
        if (!record || !snapshotsMatch(currentSnapshot, record.snapshot)) {
          throw new Error(`delete target changed after preflight: ${relative}`);
        }
        verifyPreparedBackup(backupDir, relative, record.snapshot);
        const quarantine = quarantineExisting(absolute, record.snapshot, `delete target ${relative}`);
        try {
          assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          finalizeQuarantine(quarantine, record.snapshot, `delete target ${relative}`);
        } catch (error) {
          if (fs.existsSync(quarantine.quarantinePath) && !fs.existsSync(absolute)) {
            restoreQuarantine(
              quarantine.quarantinePath,
              absolute,
              quarantine.capturedSnapshot,
              `delete target ${relative}`,
            );
          }
          throw error;
        }
        report.deleted.push(relative);
      } catch (error) {
        report.failed.push({ path: relative, reason: error instanceof Error ? error.message : String(error) });
        if (error && error.recoveryRequired) report.recoveryRequired = true;
        break;
      }
    }
  }

  const compressionPlans = [];
  const recordsForCompression = options.delete ? [] : assetRecords;
  for (const record of recordsForCompression) {
    const extension = path.extname(record.relative).toLowerCase();
    if (!COMPRESSIBLE_EXTENSIONS.has(extension)) continue;
    const isBundled = bundledMatchers.some(matcher => matcher.test(record.relative));
    if (!record.references.used && !isBundled) continue;
    if (record.state !== 'clean') continue;
    if (extension === '.png' && configPngs.has(record.relative)) {
      report.skipped.configPng.push(record.relative);
      continue;
    }
    if (extension !== '.webp') {
      const referencePaths = [
        ...record.references.tailReferences.map(reference => reference.entry),
        ...record.references.baseOnlyReferences,
      ]
        .map(entry => entry.relative);
      const unsafeReferences = referencePaths.filter(relative => statusKind(relative, gitState, trackedPaths) !== 'clean');
      if (record.references.baseOnlyReferences.length > 0 || unsafeReferences.length > 0) {
        report.skipped.unsafeReference.push(record.relative);
        for (const relative of unsafeReferences) {
          const state = statusKind(relative, gitState, trackedPaths);
          if (state === 'dirty') report.skipped.dirty.push(relative);
          if (state === 'untracked') report.skipped.untracked.push(relative);
        }
        continue;
      }
    }

    const input = record.snapshot.buffer;
    let metadata;
    try {
      metadata = await sharp(input).metadata();
    } catch (error) {
      report.failed.push({ path: record.relative, reason: `metadata: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const hasFixedGeometry = FIXED_GEOMETRY_DIRS.some(directory => record.relative.startsWith(directory));
    const longSide = Math.max(metadata.width || 0, metadata.height || 0);
    const resized = isBundled && !hasFixedGeometry && longSide > MAX_LONG_SIDE;
    let pipeline = sharp(input);
    if (resized) {
      pipeline = pipeline.resize({
        width: (metadata.width || 0) >= (metadata.height || 0) ? MAX_LONG_SIDE : null,
        height: (metadata.height || 0) > (metadata.width || 0) ? MAX_LONG_SIDE : null,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    let output;
    try {
      output = await pipeline.webp({
        quality: WEBP_QUALITY,
        alphaQuality: WEBP_ALPHA_QUALITY,
        effort: 6,
      }).toBuffer();
    } catch (error) {
      report.failed.push({ path: record.relative, reason: `encode: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const converted = extension !== '.webp';
    const saving = input.length - output.length;
    if ((converted && saving <= 0) || (!converted && saving < MIN_WEBP_SAVING_BYTES)) continue;
    const outputRelative = converted
      ? record.relative.replace(/\.(?:png|jpe?g)$/i, '.webp')
      : record.relative;
    const outputAbsolute = assertInside(assetsRoot, path.join(root, outputRelative), 'compression target');
    if (converted && fs.existsSync(outputAbsolute)) {
      report.failed.push({ path: record.relative, reason: `conversion target already exists: ${outputRelative}` });
      continue;
    }
    if (converted && !record.references.used && !bundledMatchers.some(matcher => matcher.test(outputRelative))) {
      report.skipped.unsafeReference.push(record.relative);
      continue;
    }
    const candidate = {
      path: record.relative,
      outputPath: outputRelative,
      before: input.length,
      after: output.length,
      resized,
      converted,
    };
    report.compression.candidates.push(candidate);
    report.summary.candidateBytesBefore += input.length;
    report.summary.projectedBytesAfter += output.length;
    compressionPlans.push({ record, output, outputRelative, outputAbsolute, converted });
  }

  if (options.write && report.failed.length === 0) {
    const backupsToPrepare = new Map();
    for (const plan of compressionPlans) {
      backupsToPrepare.set(plan.record.relative, plan.record.snapshot);
      if (plan.converted) {
        for (const reference of plan.record.references.tailReferences) {
          backupsToPrepare.set(reference.entry.relative, reference.entry.snapshot);
        }
      }
    }
    for (const [relative, snapshot] of [...backupsToPrepare.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      try {
        report.backups.push(backupFile(root, backupDir, relative, snapshot));
      } catch (error) {
        report.failed.push({ path: relative, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (options.write && report.failed.length === 0) {
    const committedSnapshots = new Map();
    for (const plan of compressionPlans) {
      const { record, output, outputRelative, outputAbsolute, converted } = plan;
      try {
        assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
        verifyGitAndSnapshot(
          root,
          record.relative,
          record.absolute,
          record.snapshot,
          trackedPaths,
          committedSnapshots,
        );
        if (!converted) {
          verifyPreparedBackup(backupDir, record.relative, record.snapshot);
          const replacement = replaceExistingWithQuarantine(
            record.absolute,
            record.snapshot,
            output,
            record.relative,
          );
          try {
            assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
            finalizeQuarantine(replacement, record.snapshot, record.relative);
          } catch (error) {
            rollbackReplacement(record.absolute, replacement, record.relative);
            throw error;
          }
          committedSnapshots.set(record.relative, replacement.writtenSnapshot);
          report.compressed.push(record.relative);
          continue;
        }

        const referenceEntries = record.references.tailReferences;
        const transactionSnapshots = new Map();
        verifyPreparedBackup(backupDir, record.relative, record.snapshot);
        for (const reference of referenceEntries) {
          verifyPreparedBackup(backupDir, reference.entry.relative, reference.entry.snapshot);
          const expected = committedSnapshots.get(reference.entry.relative) || reference.entry.snapshot;
          transactionSnapshots.set(
            reference.entry.relative,
            verifyGitAndSnapshot(
              root,
              reference.entry.relative,
              reference.entry.absolute,
              expected,
              trackedPaths,
              committedSnapshots,
            ),
          );
        }
        fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
        let targetCreated = false;
        let targetSnapshot;
        let assetQuarantine;
        const sourceReplacements = [];
        try {
          assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          targetSnapshot = exclusiveWriteOwned(outputAbsolute, output, outputRelative);
          targetCreated = true;
          assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          for (const reference of referenceEntries) {
            const { entry } = reference;
            const currentSnapshot = committedSnapshots.get(entry.relative) || transactionSnapshots.get(entry.relative);
            assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
            verifyGitAndSnapshot(
              root,
              record.relative,
              record.absolute,
              record.snapshot,
              trackedPaths,
              committedSnapshots,
            );
            verifyGitAndSnapshot(
              root,
              entry.relative,
              entry.absolute,
              currentSnapshot,
              trackedPaths,
              committedSnapshots,
            );
            const currentRaw = currentSnapshot.buffer.toString('utf8');
            const matches = exactAssetLiteralMatches(currentRaw, record.relative);
            if (matches.length === 0) throw new Error(`reference changed before patch: ${entry.relative}`);
            const updated = patchExactAssetMatches(currentRaw, matches, outputRelative);
            if (updated === currentRaw) throw new Error(`reference update produced no change: ${entry.relative}`);
            const updatedBuffer = Buffer.from(updated, 'utf8');
            const replacement = replaceExistingWithQuarantine(
              entry.absolute,
              currentSnapshot,
              updatedBuffer,
              entry.relative,
            );
            sourceReplacements.push({ reference, replacement, originalSnapshot: currentSnapshot });
            const updatedSnapshot = replacement.writtenSnapshot;
            committedSnapshots.set(entry.relative, updatedSnapshot);
            entry.rawContent = updated;
            entry.searchContent = normalizeSearchContent(updated);
            entry.snapshot = updatedSnapshot;
            expectedSourceInventorySha256 = sourceInventorySha256(sourceEntries);
            assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          }
          assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          verifyGitAndSnapshot(
            root,
            record.relative,
            record.absolute,
            record.snapshot,
            trackedPaths,
            committedSnapshots,
          );
          for (const reference of referenceEntries) {
            const expected = committedSnapshots.get(reference.entry.relative);
            verifyGitAndSnapshot(
              root,
              reference.entry.relative,
              reference.entry.absolute,
              expected,
              trackedPaths,
              committedSnapshots,
            );
          }
          assetQuarantine = quarantineExisting(record.absolute, record.snapshot, record.relative);
          assertSourceState(root, expectedSourceInventorySha256, sourceValidation);
          finalizeQuarantine(assetQuarantine, record.snapshot, record.relative);
          assetQuarantine = undefined;
          for (const item of sourceReplacements) {
            finalizeQuarantine(item.replacement, item.originalSnapshot, item.reference.entry.relative);
          }
          report.converted.push({
            from: record.relative,
            to: outputRelative,
            references: referenceEntries.map(reference => reference.entry.relative).sort(),
          });
        } catch (error) {
          const rollbackFailures = [];
          if (assetQuarantine) {
            try {
              restoreQuarantine(
                assetQuarantine.quarantinePath,
                record.absolute,
                assetQuarantine.capturedSnapshot,
                record.relative,
              );
            } catch (rollbackError) {
              rollbackFailures.push(`${record.relative}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
            }
          }
          for (const item of [...sourceReplacements].reverse()) {
            const { reference, replacement, originalSnapshot } = item;
            try {
              rollbackReplacement(reference.entry.absolute, replacement, reference.entry.relative);
              committedSnapshots.set(reference.entry.relative, originalSnapshot);
              reference.entry.rawContent = originalSnapshot.buffer.toString('utf8');
              reference.entry.searchContent = normalizeSearchContent(reference.entry.rawContent);
              reference.entry.snapshot = originalSnapshot;
              expectedSourceInventorySha256 = sourceInventorySha256(sourceEntries);
            } catch (rollbackError) {
              rollbackFailures.push(`${reference.entry.relative}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
            }
          }
          if (targetCreated && rollbackFailures.length === 0) {
            try {
              const currentSources = readSourceEntries(root);
              if (sourceReferences(outputRelative, currentSources).used) {
                throw recoveryError(`${outputRelative} is still referenced after rollback`);
              }
              removeVerifiedExisting(outputAbsolute, targetSnapshot, `${outputRelative} rollback target`);
            } catch (rollbackError) {
              rollbackFailures.push(`${outputRelative}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
            }
          }
          if (rollbackFailures.length > 0) {
            report.recoveryRequired = true;
            throw new Error(
              `${error instanceof Error ? error.message : String(error)}; recovery-required: ${rollbackFailures.join('; ')}`,
            );
          }
          throw error;
        }
      } catch (error) {
        report.failed.push({ path: record.relative, reason: error instanceof Error ? error.message : String(error) });
        if (error && error.recoveryRequired) report.recoveryRequired = true;
        break;
      }
    }
  }

  report.audit.used = uniqueSorted(report.audit.used);
  report.audit.unused = uniqueSorted(report.audit.unused);
  report.audit.deletable = uniqueSorted(report.audit.deletable);
  for (const key of Object.keys(report.skipped)) report.skipped[key] = uniqueSorted(report.skipped[key]);
  report.deleted = uniqueSorted(report.deleted);
  report.compressed = uniqueSorted(report.compressed);
  report.compression.candidates.sort((left, right) => left.path.localeCompare(right.path));
  report.converted.sort((left, right) => left.from.localeCompare(right.from));
  report.failed.sort((left, right) => left.path.localeCompare(right.path));
  report.summary.projectedBytesSaved = report.summary.candidateBytesBefore - report.summary.projectedBytesAfter;

  if (options.reportPath) writeReport(options.reportPath, report);
  if (options.json) process.stdout.write(`${JSON.stringify(report)}\n`);
  else process.stdout.write(`${humanReport(report)}\n`);
  if (report.failed.length > 0) process.exitCode = 2;
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
