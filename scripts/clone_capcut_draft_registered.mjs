#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPCUT_ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'CapCut',
  'User Data',
  'Projects',
  'com.lveditor.draft',
);

const rawArgs = process.argv.slice(2);

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

const SOURCE_NAME = argValue('--source-name');
const TARGET_NAME = argValue('--target-name');
const FORCE = rawArgs.includes('--force');
const ALLOW_LONG_NAME = rawArgs.includes('--allow-long-name');

function die(message) {
  console.error(message);
  process.exit(1);
}

function posix(value) {
  return value.replace(/\\/g, '/');
}

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function capCutIsRunning() {
  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        "Get-Process | Where-Object { $_.ProcessName -like '*CapCut*' -or $_.ProcessName -like '*lveditor*' } | Select-Object -ExpandProperty ProcessName",
      ],
      { encoding: 'utf8' },
    );
    return output.trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function isShortCodeNumberName(value) {
  return /^[A-Z][A-Z0-9]*_[1-9][0-9]*$/.test(value);
}

function validateTargetName() {
  if (ALLOW_LONG_NAME) return;
  if (!isShortCodeNumberName(TARGET_NAME)) {
    die(
      `Target draft name must be short CODEWORD_NUMBER for WEDNESDAY delivery drafts, e.g. SPARK_4. Got: ${TARGET_NAME}`,
    );
  }
}

function walkStrings(value, replacer) {
  if (typeof value === 'string') return replacer(value);
  if (Array.isArray(value)) return value.map((item) => walkStrings(item, replacer));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = walkStrings(value[key], replacer);
  }
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function copyDraftDirectory(sourceDir, targetDir) {
  // Node's fs.cpSync can fail on long Windows CapCut resource paths after
  // creating an empty target directory. Robocopy handles those native paths.
  fs.mkdirSync(targetDir, { recursive: true });
  const result = spawnSync(
    'robocopy',
    [sourceDir, targetDir, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'],
    { encoding: 'utf8' },
  );
  if (result.error) die(`Unable to copy CapCut draft: ${result.error.message}`);
  // Robocopy treats 0..7 as successful outcomes, including copied files.
  if (result.status === null || result.status > 7) {
    die(`Robocopy failed with exit code ${result.status}: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

function allDraftJsonFiles(draftDir) {
  const files = ['draft_content.json', 'template-2.tmp'].filter((name) => fs.existsSync(path.join(draftDir, name)));
  const timelinesDir = path.join(draftDir, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const timelineName of fs.readdirSync(timelinesDir)) {
      const timelineDir = path.join(timelinesDir, timelineName);
      if (!fs.statSync(timelineDir).isDirectory()) continue;
      for (const name of ['draft_content.json', 'template-2.tmp']) {
        const rel = path.join('Timelines', timelineName, name);
        if (fs.existsSync(path.join(draftDir, rel))) files.push(rel);
      }
    }
  }
  return files;
}

function patchDraftPayload(payload, sourceDir, targetDir, updateTimeUs) {
  payload.name = TARGET_NAME;
  payload.update_time = updateTimeUs;
  return walkStrings(payload, (text) =>
    text
      .replaceAll(posix(sourceDir), posix(targetDir))
      .replaceAll(sourceDir, targetDir)
      .replaceAll(SOURCE_NAME, TARGET_NAME),
  );
}

function patchMetaPayload(meta, draftId, sourceDir, targetDir) {
  const nowUs = Date.now() * 1000;
  meta.draft_id = draftId;
  meta.draft_name = TARGET_NAME;
  meta.draft_fold_path = posix(targetDir);
  meta.draft_root_path = posix(CAPCUT_ROOT);
  meta.draft_json_file = posix(path.join(targetDir, 'draft_content.json'));
  meta.draft_cover = posix(path.join(targetDir, 'draft_cover.jpg'));
  meta.draft_is_invisible = false;
  meta.tm_draft_modified = nowUs;
  meta.tm_draft_create = meta.tm_draft_create || nowUs;
  meta.tm_draft_removed = 0;
  return walkStrings(meta, (text) =>
    text
      .replaceAll(posix(sourceDir), posix(targetDir))
      .replaceAll(sourceDir, targetDir)
      .replaceAll(SOURCE_NAME, TARGET_NAME),
    );
}

function verifyHomeProjectsRegistration(rootMetaPath, targetDir, draftId) {
  const rootMeta = readJson(rootMetaPath);
  const entries = (rootMeta.all_draft_store || []).filter((entry) => entry.draft_name === TARGET_NAME);
  const errors = [];
  if (entries.length !== 1) errors.push(`expected exactly one root_meta entry for ${TARGET_NAME}, got ${entries.length}`);
  const entry = entries[0];
  if (entry) {
    const expectedDraftJson = posix(path.join(targetDir, 'draft_content.json'));
    const expectedCover = posix(path.join(targetDir, 'draft_cover.jpg'));
    if (entry.draft_id !== draftId) errors.push(`draft_id mismatch: ${entry.draft_id} !== ${draftId}`);
    if (entry.draft_is_invisible !== false) errors.push(`draft_is_invisible must be false, got ${entry.draft_is_invisible}`);
    if (Number(entry.tm_draft_removed || 0) !== 0) errors.push(`tm_draft_removed must be 0, got ${entry.tm_draft_removed}`);
    if (posix(String(entry.draft_fold_path || '')) !== posix(targetDir)) {
      errors.push(`draft_fold_path mismatch: ${entry.draft_fold_path}`);
    }
    if (posix(String(entry.draft_json_file || '')) !== expectedDraftJson) {
      errors.push(`draft_json_file mismatch: ${entry.draft_json_file}`);
    }
    if (posix(String(entry.draft_cover || '')) !== expectedCover) {
      errors.push(`draft_cover mismatch: ${entry.draft_cover}`);
    }
    if (!fs.existsSync(entry.draft_json_file || path.join(targetDir, 'draft_content.json'))) {
      errors.push(`draft_json_file does not exist: ${entry.draft_json_file}`);
    }
    if (!fs.existsSync(entry.draft_cover || path.join(targetDir, 'draft_cover.jpg'))) {
      errors.push(`draft_cover does not exist: ${entry.draft_cover}`);
    }
  }
  if (!fs.existsSync(path.join(targetDir, 'draft_content.json'))) {
    errors.push(`target draft_content.json does not exist: ${path.join(targetDir, 'draft_content.json')}`);
  }
  if (errors.length) die(`Home -> Projects registration gate failed:\n${errors.join('\n')}`);
  return entry;
}

function copyAndPatch() {
  if (!SOURCE_NAME || !TARGET_NAME) die('Usage: node scripts/clone_capcut_draft_registered.mjs --source-name <draft> --target-name <draft>');
  validateTargetName();
  const running = capCutIsRunning();
  if (running.length) die(`CapCut is running (${[...new Set(running)].join(', ')}). Close it before cloning draft files.`);

  const sourceDir = path.join(CAPCUT_ROOT, SOURCE_NAME);
  const targetDir = path.join(CAPCUT_ROOT, TARGET_NAME);
  const rootMetaPath = path.join(CAPCUT_ROOT, 'root_meta_info.json');
  if (!fs.existsSync(path.join(sourceDir, 'draft_content.json'))) die(`Source draft not found: ${sourceDir}`);
  const rootMetaBefore = readJson(rootMetaPath);
  const existingTargetEntries = (rootMetaBefore.all_draft_store || []).filter((entry) => entry.draft_name === TARGET_NAME);
  if (existingTargetEntries.length && !FORCE) {
    die(`Target name already exists in root_meta_info.json: ${TARGET_NAME}. Choose the next sequential CODEWORD_N instead of replacing it.`);
  }
  if (fs.existsSync(targetDir)) {
    if (!FORCE) die(`Target draft already exists: ${targetDir}`);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  copyDraftDirectory(sourceDir, targetDir);
  const draftId = crypto.randomUUID().toUpperCase();

  const draftUpdateTimeUs = Date.now() * 1000;
  for (const rel of allDraftJsonFiles(targetDir)) {
    const filePath = path.join(targetDir, rel);
    writeJson(filePath, patchDraftPayload(readJson(filePath), sourceDir, targetDir, draftUpdateTimeUs));
  }

  const draftMetaPath = path.join(targetDir, 'draft_meta_info.json');
  if (fs.existsSync(draftMetaPath)) {
    writeJson(draftMetaPath, patchMetaPayload(readJson(draftMetaPath), draftId, sourceDir, targetDir));
  }

  for (const fileName of ['attachment_pc_common.json', 'draft_virtual_store.json', 'key_value.json', 'draft_biz_config.json']) {
    const filePath = path.join(targetDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    try {
      const payload = walkStrings(readJson(filePath), (text) =>
        text
          .replaceAll(posix(sourceDir), posix(targetDir))
          .replaceAll(sourceDir, targetDir)
          .replaceAll(SOURCE_NAME, TARGET_NAME),
      );
      writeJson(filePath, payload);
    } catch {
      // Non-critical CapCut sidecars sometimes contain partial JSON or transient editor state.
    }
  }

  const rootBackupPath = path.join(ROOT, '.codex-tmp', 'capcut-backups', `root_meta_info_BEFORE_CLONE_${TARGET_NAME}_${stamp()}.json`);
  fs.mkdirSync(path.dirname(rootBackupPath), { recursive: true });
  fs.copyFileSync(rootMetaPath, rootBackupPath);
  const rootMeta = rootMetaBefore;
  const sourceEntry = rootMeta.all_draft_store?.find((entry) => entry.draft_name === SOURCE_NAME);
  if (!sourceEntry) die(`Source root_meta entry not found: ${SOURCE_NAME}`);
  const targetEntry = patchMetaPayload(structuredClone(sourceEntry), draftId, sourceDir, targetDir);
  rootMeta.all_draft_store = rootMeta.all_draft_store.filter((entry) => entry.draft_name !== TARGET_NAME && entry.draft_id !== draftId);
  rootMeta.all_draft_store.push(targetEntry);
  writeJson(rootMetaPath, rootMeta);
  const registeredEntry = verifyHomeProjectsRegistration(rootMetaPath, targetDir, draftId);

  const report = {
    status: 'ready',
    sourceName: SOURCE_NAME,
    targetName: TARGET_NAME,
    draftId,
    targetDir,
    rootMetaBackup: rootBackupPath,
    homeProjectsRegistration: {
      status: 'ready',
      draftName: registeredEntry.draft_name,
      draftFoldPath: registeredEntry.draft_fold_path,
      draftJsonFile: registeredEntry.draft_json_file,
      draftCover: registeredEntry.draft_cover,
      draftIsInvisible: registeredEntry.draft_is_invisible,
      tmDraftRemoved: registeredEntry.tm_draft_removed,
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

copyAndPatch();
