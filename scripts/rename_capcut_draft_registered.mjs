#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

const FROM_NAME = argValue('--from-name');
const TO_NAME = argValue('--to-name');
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
  if (!isShortCodeNumberName(TO_NAME)) {
    die(`Target draft name must be short CODEWORD_NUMBER, e.g. SPARK_4. Got: ${TO_NAME}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function walkStrings(value, replacer) {
  if (typeof value === 'string') return replacer(value);
  if (Array.isArray(value)) return value.map((item) => walkStrings(item, replacer));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = walkStrings(value[key], replacer);
  }
  return value;
}

function allJsonLikeFiles(draftDir) {
  const names = [
    'draft_content.json',
    'template-2.tmp',
    'draft_meta_info.json',
    'draft_biz_config.json',
    'draft_virtual_store.json',
    'key_value.json',
    'attachment_pc_common.json',
    'attachment_editing.json',
    'timeline_layout.json',
  ];
  const files = names.filter((name) => fs.existsSync(path.join(draftDir, name)));
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

function backupDraft(fromDir, rootMetaPath) {
  const backupDir = path.join(ROOT, '.codex-tmp', 'capcut-backups', `${FROM_NAME}_BEFORE_RENAME_TO_${TO_NAME}_${stamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const rel of allJsonLikeFiles(fromDir)) {
    const src = path.join(fromDir, rel);
    const dest = path.join(backupDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  fs.copyFileSync(rootMetaPath, path.join(backupDir, 'root_meta_info.json'));
  return backupDir;
}

function verifyHomeProjectsRegistration(rootMetaPath, toDir) {
  const rootMeta = readJson(rootMetaPath);
  const entries = (rootMeta.all_draft_store || []).filter((entry) => entry.draft_name === TO_NAME);
  const errors = [];
  if (entries.length !== 1) errors.push(`expected exactly one root_meta entry for ${TO_NAME}, got ${entries.length}`);
  const entry = entries[0];
  if (entry) {
    const expectedDraftJson = posix(path.join(toDir, 'draft_content.json'));
    const expectedCover = posix(path.join(toDir, 'draft_cover.jpg'));
    if (entry.draft_is_invisible !== false) errors.push(`draft_is_invisible must be false, got ${entry.draft_is_invisible}`);
    if (Number(entry.tm_draft_removed || 0) !== 0) errors.push(`tm_draft_removed must be 0, got ${entry.tm_draft_removed}`);
    if (posix(String(entry.draft_fold_path || '')) !== posix(toDir)) errors.push(`draft_fold_path mismatch: ${entry.draft_fold_path}`);
    if (posix(String(entry.draft_json_file || '')) !== expectedDraftJson) {
      errors.push(`draft_json_file mismatch: ${entry.draft_json_file}`);
    }
    if (posix(String(entry.draft_cover || '')) !== expectedCover) errors.push(`draft_cover mismatch: ${entry.draft_cover}`);
    if (!fs.existsSync(entry.draft_json_file || path.join(toDir, 'draft_content.json'))) {
      errors.push(`draft_json_file does not exist: ${entry.draft_json_file}`);
    }
    if (!fs.existsSync(entry.draft_cover || path.join(toDir, 'draft_cover.jpg'))) {
      errors.push(`draft_cover does not exist: ${entry.draft_cover}`);
    }
  }
  if (!fs.existsSync(path.join(toDir, 'draft_content.json'))) {
    errors.push(`target draft_content.json does not exist: ${path.join(toDir, 'draft_content.json')}`);
  }
  if (errors.length) die(`Home -> Projects registration gate failed:\n${errors.join('\n')}`);
  return entry;
}

function renameDraft() {
  if (!FROM_NAME || !TO_NAME) die('Usage: node scripts/rename_capcut_draft_registered.mjs --from-name <draft> --to-name <draft>');
  if (FROM_NAME === TO_NAME) die('from-name and to-name are the same');
  validateTargetName();
  const running = capCutIsRunning();
  if (running.length) die(`CapCut is running (${[...new Set(running)].join(', ')}). Close it only after render/export is finished.`);

  const fromDir = path.join(CAPCUT_ROOT, FROM_NAME);
  const toDir = path.join(CAPCUT_ROOT, TO_NAME);
  const rootMetaPath = path.join(CAPCUT_ROOT, 'root_meta_info.json');
  if (!fs.existsSync(path.join(fromDir, 'draft_content.json'))) die(`Source draft not found: ${fromDir}`);
  const rootMetaBefore = readJson(rootMetaPath);
  const existingTargetEntries = (rootMetaBefore.all_draft_store || []).filter((entry) => entry.draft_name === TO_NAME);
  if (existingTargetEntries.length) {
    die(`Target name already exists in root_meta_info.json: ${TO_NAME}. Choose the next sequential CODEWORD_N instead of replacing it.`);
  }
  if (fs.existsSync(toDir)) {
    if (!FORCE) die(`Target draft already exists: ${toDir}`);
    fs.rmSync(toDir, { recursive: true, force: true });
  }

  const backupDir = backupDraft(fromDir, rootMetaPath);
  fs.renameSync(fromDir, toDir);

  const replace = (text) =>
    text
      .replaceAll(posix(fromDir), posix(toDir))
      .replaceAll(fromDir, toDir)
      .replaceAll(FROM_NAME, TO_NAME);

  for (const rel of allJsonLikeFiles(toDir)) {
    const filePath = path.join(toDir, rel);
    try {
      const payload = walkStrings(readJson(filePath), replace);
      if (rel === 'draft_meta_info.json') {
        payload.draft_name = TO_NAME;
        payload.draft_fold_path = posix(toDir);
        payload.draft_root_path = posix(CAPCUT_ROOT);
        payload.draft_json_file = posix(path.join(toDir, 'draft_content.json'));
        payload.draft_cover = posix(path.join(toDir, 'draft_cover.jpg'));
        payload.tm_draft_modified = Date.now() * 1000;
        payload.draft_is_invisible = false;
        payload.tm_draft_removed = 0;
      } else if (payload && typeof payload === 'object' && Object.hasOwn(payload, 'name')) {
        payload.name = TO_NAME;
        payload.update_time = Date.now() * 1000;
      }
      writeJson(filePath, payload);
    } catch {
      // Some sidecars can contain transient editor state; skip unreadable JSON-like files.
    }
  }

  const rootMeta = readJson(rootMetaPath);
  const entries = rootMeta.all_draft_store || [];
  const entry = entries.find((item) => item.draft_name === FROM_NAME || posix(item.draft_fold_path || '') === posix(fromDir));
  if (!entry) die(`Root meta entry not found for ${FROM_NAME}. Backup is at ${backupDir}`);
  walkStrings(entry, replace);
  entry.draft_name = TO_NAME;
  entry.draft_fold_path = posix(toDir);
  entry.draft_root_path = posix(CAPCUT_ROOT);
  entry.draft_json_file = posix(path.join(toDir, 'draft_content.json'));
  entry.draft_cover = posix(path.join(toDir, 'draft_cover.jpg'));
  entry.tm_draft_modified = Date.now() * 1000;
  entry.draft_is_invisible = false;
  entry.tm_draft_removed = 0;
  writeJson(rootMetaPath, rootMeta);
  const registeredEntry = verifyHomeProjectsRegistration(rootMetaPath, toDir);

  console.log(
    JSON.stringify(
      {
        status: 'ready',
        fromName: FROM_NAME,
        toName: TO_NAME,
        toDir,
        backupDir,
        homeProjectsRegistration: {
          status: 'ready',
          draftName: registeredEntry.draft_name,
          draftFoldPath: registeredEntry.draft_fold_path,
          draftJsonFile: registeredEntry.draft_json_file,
          draftCover: registeredEntry.draft_cover,
          draftIsInvisible: registeredEntry.draft_is_invisible,
          tmDraftRemoved: registeredEntry.tm_draft_removed,
        },
      },
      null,
      2,
    ),
  );
}

renameDraft();
