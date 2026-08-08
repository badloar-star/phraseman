#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CAPCUT_ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'CapCut',
  'User Data',
  'Projects',
  'com.lveditor.draft',
);
const DEFAULT_DRAFT = 'LINGMAN_WEDNESDAY_VIRAL_60X5_20260703';
const DEFAULT_MANIFEST = path.join(ROOT, '.codex-tmp', 'lingman-wednesday-viral-backgrounds', 'manifest.json');
const DEFAULT_REPORT = path.join(ROOT, '.codex-tmp', 'reports', 'lingman-wednesday-viral-backgrounds-qa.json');
const DEFAULT_ASSET_SUBDIR = 'lingman_wednesday_viral_phrase_backgrounds_20260703';
const DEFAULT_PHRASE_VIDEO_TRACK_INDEX = 1;
const REQUIRED_WIDTH = 1080;
const REQUIRED_HEIGHT = 1920;
const REQUIRED_ROWS = 300;
const DEFAULT_PHRASE_DURATION_US = 6_333_333;
const BANNED_GENERIC_QUERIES = new Set([
  'person talking close up',
  'dramatic reaction close up',
  'confused person thinking',
  'angry argument close up',
]);

const rawArgs = process.argv.slice(2);

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

function argValues(name) {
  const values = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg.startsWith(`${name}=`)) values.push(arg.slice(name.length + 1));
    else if (arg === name && rawArgs[index + 1]) values.push(rawArgs[index + 1]);
  }
  return values;
}

function splitArgList(values) {
  return values
    .flatMap((value) => String(value || '').split(/[;,]/))
    .map((value) => value.trim())
    .filter(Boolean);
}

const DRAFT_NAME = argValue('--draft-name', DEFAULT_DRAFT);
const DRAFT_DIR = path.join(CAPCUT_ROOT, DRAFT_NAME);
const MANIFEST_PATH = path.resolve(argValue('--manifest', DEFAULT_MANIFEST));
const REPORT_PATH = path.resolve(argValue('--report', DEFAULT_REPORT));
const ASSET_SUBDIR = argValue('--asset-subdir', DEFAULT_ASSET_SUBDIR);
const EXCLUDE_MANIFESTS = splitArgList([...argValues('--exclude-manifest'), ...argValues('--exclude-manifests')]).map((value) =>
  path.resolve(value),
);
const TRACK_INDEX_ARG = argValue('--track-index', '');
const TRACK_INDEX = TRACK_INDEX_ARG === '' ? DEFAULT_PHRASE_VIDEO_TRACK_INDEX : Number(TRACK_INDEX_ARG);
const MAX_PROVIDER_REUSE = Math.max(1, Number(argValue('--max-provider-reuse', '1')) || 1);
const CHECK_ONLY = rawArgs.includes('--check-only');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

function draftFiles() {
  const files = ['draft_content.json', 'template-2.tmp'];
  const timelineRoot = path.join(DRAFT_DIR, 'Timelines');
  if (fs.existsSync(timelineRoot)) {
    for (const item of fs.readdirSync(timelineRoot, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      for (const name of ['draft_content.json', 'template-2.tmp']) {
        const rel = path.join('Timelines', item.name, name);
        if (fs.existsSync(path.join(DRAFT_DIR, rel))) files.push(rel);
      }
    }
  }
  return files;
}

function backupFiles(files) {
  const backupDir = path.join(ROOT, '.codex-tmp', 'capcut-backups', `${DRAFT_NAME}_BEFORE_PHRASE_BACKGROUNDS_${stamp()}`);
  for (const rel of files) {
    const src = path.join(DRAFT_DIR, rel);
    const dest = path.join(backupDir, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
  return backupDir;
}

function restoreFilesFromBackup(backupDir, files) {
  for (const rel of files) {
    const source = path.join(backupDir, rel);
    const destination = path.join(DRAFT_DIR, rel);
    if (fs.existsSync(source)) fs.copyFileSync(source, destination);
  }
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(manifest.rows)) throw new Error('Manifest has no rows array');
  if (manifest.rows.length !== REQUIRED_ROWS) throw new Error(`Expected ${REQUIRED_ROWS} manifest rows, got ${manifest.rows.length}`);
  const rows = [...manifest.rows].sort((a, b) => a.index - b.index);
  rows.forEach((row, index) => {
    if (row.index !== index + 1) throw new Error(`Manifest row index mismatch at ${index + 1}`);
    if (!row.localPath) throw new Error(`Manifest row ${row.index} has no localPath`);
    if (!fs.existsSync(row.localPath)) throw new Error(`Missing asset for row ${row.index}: ${row.localPath}`);
    if (row.width !== REQUIRED_WIDTH || row.height !== REQUIRED_HEIGHT) {
      throw new Error(`Bad dimensions for row ${row.index}: ${row.width}x${row.height}`);
    }
    if (!Array.isArray(row.visualElements) || row.visualElements.length < 2) {
      throw new Error(`Manifest row ${row.index} has no strict visualElements`);
    }
    if (BANNED_GENERIC_QUERIES.has(String(row.query || '').toLowerCase())) {
      throw new Error(`Manifest row ${row.index} uses banned generic query: ${row.query}`);
    }
    if (!Array.isArray(row.queryMatches) || row.queryMatches.length < 2) {
      throw new Error(`Manifest row ${row.index} failed visual query-element gate: ${row.query}`);
    }
    if (Array.isArray(row.blockedMatches) && row.blockedMatches.length) {
      throw new Error(`Manifest row ${row.index} failed blocked metadata gate: ${row.blockedMatches.join(', ')}`);
    }
    if (!row.visualGate || row.visualGate.status !== 'ready') {
      throw new Error(`Manifest row ${row.index} visualGate is not ready`);
    }
  });
  const sourceCounts = new Map();
  for (const row of rows) {
    const sourceKey = `${row.provider || 'unknown'}:${row.providerId || row.sourceUrl || row.localPath}`;
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) || 0) + 1);
  }
  const overReuse = [...sourceCounts.entries()].filter(([, count]) => count > MAX_PROVIDER_REUSE);
  if (overReuse.length) {
    throw new Error(
      `Provider source reuse exceeds cap ${MAX_PROVIDER_REUSE}: ${overReuse
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => `${key} x${count}`)
        .join(', ')}`,
    );
  }
  const excludedSources = loadExcludedSources();
  const overlaps = rows.filter((row) => excludedSources.ids.has(sourceKey(row)));
  if (overlaps.length) {
    throw new Error(
      `Manifest reuses provider sources from excluded manifests: ${overlaps
        .slice(0, 20)
        .map((row) => `${row.index}:${sourceKey(row)}`)
        .join(', ')}`,
    );
  }
  return { ...manifest, rows, excludedManifests: excludedSources.manifests };
}

function sourceKey(row) {
  return row?.provider && row?.providerId ? `${row.provider}:${row.providerId}` : '';
}

function loadExcludedSources() {
  const ids = new Set();
  const manifests = [];
  for (const manifestPath of EXCLUDE_MANIFESTS) {
    if (!fs.existsSync(manifestPath)) {
      manifests.push({ path: manifestPath, rows: 0, sources: 0, missing: true });
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    let sources = 0;
    for (const row of rows) {
      const key = sourceKey(row);
      if (!key) continue;
      ids.add(key);
      sources += 1;
    }
    manifests.push({ path: manifestPath, rows: rows.length, sources });
  }
  return { ids, manifests };
}

function findPhraseVideoTrack(draft, { allowSingleSegment = false } = {}) {
  const track = draft.tracks?.[TRACK_INDEX];
  if (!track) throw new Error(`Track ${TRACK_INDEX} does not exist`);
  if (track.type !== 'video') throw new Error(`Track ${TRACK_INDEX} is ${track.type}, expected video`);
  const segmentCount = (track.segments || []).length;
  if (segmentCount !== REQUIRED_ROWS && !(allowSingleSegment && segmentCount === 1)) {
    throw new Error(`Track ${TRACK_INDEX} has ${track.segments?.length || 0} segments, expected ${REQUIRED_ROWS}`);
  }
  return { track, trackIndex: TRACK_INDEX };
}

function findPhraseTimingTrack(draft) {
  const candidates = (draft.tracks || [])
    .map((track, trackIndex) => ({ track, trackIndex }))
    .filter(({ track }) => track.type === 'text' && (track.segments || []).length === REQUIRED_ROWS)
    .filter(({ track }) => {
      const segments = track.segments || [];
      return segments.every((segment) => {
        const range = segment.target_timerange;
        return Number.isFinite(range?.start) && Number.isFinite(range?.duration) && range.duration > 0;
      });
    });
  const preferred = candidates.find(({ track }) => track.segments?.[0]?.target_timerange?.start === 0) || candidates[0];
  if (!preferred) throw new Error('Could not find a 300-segment text track to anchor phrase background timing');
  return {
    trackIndex: preferred.trackIndex,
    timings: preferred.track.segments.map((segment, index) => ({
      index: index + 1,
      start: Number(segment.target_timerange.start),
      duration: Number(segment.target_timerange.duration),
    })),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function positiveDuration(value, fallback = DEFAULT_PHRASE_DURATION_US) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : fallback;
}

function buildTopologyPlan(referenceDraft, rows) {
  const { track } = findPhraseVideoTrack(referenceDraft, { allowSingleSegment: true });
  if ((track.segments || []).length === REQUIRED_ROWS) return null;
  const timing = findPhraseTimingTrack(referenceDraft);
  return {
    timingTrackIndex: timing.trackIndex,
    entries: rows.map((row, index) => ({
      index: row.index,
      segmentId: randomUUID().toUpperCase(),
      materialId: randomUUID().toUpperCase(),
      sourceDuration: positiveDuration(row.durationUs),
      targetStart: timing.timings[index].start,
      targetDuration: timing.timings[index].duration,
    })),
  };
}

function applyRowToMaterial(material, row, durationUs) {
  material.duration = durationUs;
  material.path = posix(row.draftLocalPath);
  material.media_path = '';
  material.local_id = '';
  material.has_audio = false;
  material.reverse_path = '';
  material.intensifies_path = '';
  material.intensifies_audio_path = '';
  material.cartoon_path = '';
  material.material_id = '';
  material.material_name = row.fileName || path.basename(row.draftLocalPath);
  material.width = REQUIRED_WIDTH;
  material.height = REQUIRED_HEIGHT;
  material.source = 0;
  material.source_platform = 0;
  material.category_id = '';
  material.category_name = '';
  material.material_url = '';
  material.request_id = '';
  material.extra_type_option = 0;
  material.is_ai_generate_content = false;
  material.aigc_type = 'none';
  material.check_flag = 62977791;
}

function applyRowToSegment(segment, timing, sourceDuration) {
  const targetDuration = positiveDuration(timing?.targetDuration, sourceDuration);
  segment.source_timerange = { start: 0, duration: sourceDuration };
  segment.target_timerange = { start: Number(timing?.targetStart || 0), duration: targetDuration };
  segment.render_timerange = { start: 0, duration: 0 };
  segment.speed = sourceDuration / targetDuration;
  segment.is_loop = false;
  segment.volume = 0;
  segment.last_nonzero_volume = 1;
  segment.visible = true;
  segment.clip = segment.clip || {};
  segment.clip.alpha = 1;
  segment.extra_material_refs = [];
}

function copyAssetsToDraft(rows) {
  const destDir = path.join(DRAFT_DIR, 'Resources', ASSET_SUBDIR);
  ensureDir(destDir);
  return rows.map((row) => {
    const dest = path.join(destDir, path.basename(row.localPath));
    if (path.resolve(row.localPath) !== path.resolve(dest)) fs.copyFileSync(row.localPath, dest);
    return { ...row, draftLocalPath: dest };
  });
}

function patchDraftJson(draft, rows, topologyPlan) {
  const videos = new Map((draft.materials?.videos || []).map((item) => [item.id, item]));
  const { track, trackIndex } = findPhraseVideoTrack(draft, { allowSingleSegment: Boolean(topologyPlan) });
  if (topologyPlan) {
    if ((track.segments || []).length !== 1) {
      throw new Error(`Track ${trackIndex} is not eligible for phrase-background expansion`);
    }
    const timing = findPhraseTimingTrack(draft);
    if (timing.trackIndex !== topologyPlan.timingTrackIndex) {
      throw new Error(`Phrase timing track mismatch: expected ${topologyPlan.timingTrackIndex}, found ${timing.trackIndex}`);
    }
    const templateSegment = track.segments[0];
    const templateMaterial = videos.get(templateSegment.material_id);
    if (!templateMaterial) throw new Error(`Missing background template material: ${templateSegment.material_id}`);
    const allMaterialIds = new Set((draft.materials?.videos || []).map((item) => item.id));
    const allSegmentIds = new Set((draft.tracks || []).flatMap((item) => (item.segments || []).map((segment) => segment.id)));
    for (const entry of topologyPlan.entries) {
      if (allMaterialIds.has(entry.materialId) || allSegmentIds.has(entry.segmentId)) {
        throw new Error(`Generated CapCut id collision for phrase ${entry.index}`);
      }
    }
    const newMaterials = [];
    track.segments = rows.map((row, index) => {
      const entry = topologyPlan.entries[index];
      const material = clone(templateMaterial);
      material.id = entry.materialId;
      applyRowToMaterial(material, row, entry.sourceDuration);
      newMaterials.push(material);
      videos.set(material.id, material);
      const segment = clone(templateSegment);
      segment.id = entry.segmentId;
      segment.material_id = entry.materialId;
      applyRowToSegment(segment, entry, entry.sourceDuration);
      return segment;
    });
    draft.materials = draft.materials || {};
    draft.materials.videos = [...(draft.materials.videos || []), ...newMaterials];
  }
  if ((track.segments || []).length !== rows.length) throw new Error(`Track ${trackIndex} has ${track.segments?.length || 0} segments, expected ${rows.length}`);
  const timing = findPhraseTimingTrack(draft);
  const touched = [];
  for (const [index, segment] of track.segments.entries()) {
    const row = rows[index];
    const material = videos.get(segment.material_id);
    if (!material) throw new Error(`Missing video material for segment ${index + 1}: ${segment.material_id}`);
    const durationUs = positiveDuration(row.durationUs);
    applyRowToMaterial(material, row, durationUs);
    applyRowToSegment(segment, {
      targetStart: timing.timings[index].start,
      targetDuration: timing.timings[index].duration,
    }, durationUs);
    touched.push({
      index: row.index,
      phraseEn: row.phraseEn,
      segmentId: segment.id,
      materialId: material.id,
      path: material.path,
      durationUs: material.duration,
    });
  }
  return { trackIndex, touched };
}

function writeReport(report) {
  ensureDir(path.dirname(REPORT_PATH));
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

function checkPatched(files, manifestRows) {
  const errors = [];
  const summaries = [];
  for (const rel of files) {
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, rel), 'utf8'));
    const videos = new Map((draft.materials?.videos || []).map((item) => [item.id, item]));
    let trackInfo;
    try {
      trackInfo = findPhraseVideoTrack(draft);
    } catch (error) {
      errors.push({ file: rel, type: 'track_missing', message: error.message });
      continue;
    }
    const timing = findPhraseTimingTrack(draft);
    const paths = [];
    for (const [index, segment] of (trackInfo.track.segments || []).entries()) {
      const material = videos.get(segment.material_id);
      const row = manifestRows[index];
      if (!material) {
        errors.push({ file: rel, index: index + 1, type: 'material_missing' });
        continue;
      }
      paths.push(material.path || '');
      if (!material.path) errors.push({ file: rel, index: index + 1, type: 'path_missing' });
      if (material.path && !fs.existsSync(material.path)) errors.push({ file: rel, index: index + 1, type: 'file_missing', path: material.path });
      if (material.width !== REQUIRED_WIDTH || material.height !== REQUIRED_HEIGHT) {
        errors.push({ file: rel, index: index + 1, type: 'bad_dimensions', width: material.width, height: material.height });
      }
      if (!material.material_name?.includes(String(row.index).padStart(3, '0'))) {
        errors.push({ file: rel, index: index + 1, type: 'material_name_not_indexed', material_name: material.material_name });
      }
      const expected = timing.timings[index];
      if (segment.target_timerange?.start !== expected.start || segment.target_timerange?.duration !== expected.duration) {
        errors.push({ file: rel, index: index + 1, type: 'timing_mismatch', expected, actual: segment.target_timerange });
      }
      if (!segment.visible || Number(segment.clip?.alpha) !== 1 || Number(segment.volume) !== 0) {
        errors.push({ file: rel, index: index + 1, type: 'visibility_or_audio_gate', visible: segment.visible, alpha: segment.clip?.alpha, volume: segment.volume });
      }
      if (material.media_path) errors.push({ file: rel, index: index + 1, type: 'draft_placeholder_media_path', media_path: material.media_path });
    }
    const uniquePaths = new Set(paths.filter(Boolean));
    if (uniquePaths.size !== REQUIRED_ROWS) {
      errors.push({ file: rel, type: 'unique_path_count', expected: REQUIRED_ROWS, actual: uniquePaths.size });
    }
    if ([...uniquePaths].some((value) => value.includes('/Cache/onlineMaterial/') || value.includes('\\Cache\\onlineMaterial\\'))) {
      errors.push({ file: rel, type: 'cache_path_used' });
    }
    summaries.push({ file: rel, trackIndex: trackInfo.trackIndex, segments: trackInfo.track.segments.length, uniquePaths: uniquePaths.size });
  }
  return { errors, summaries };
}

function main() {
  if (!fs.existsSync(DRAFT_DIR)) throw new Error(`Draft not found: ${DRAFT_DIR}`);
  const files = draftFiles();
  const manifest = loadManifest();
  const running = capCutIsRunning();
  if (!CHECK_ONLY && running.length) {
    throw new Error(`CapCut is running (${[...new Set(running)].join(', ')}). Close it before patching draft files.`);
  }
  let backupDir = '';
  const patched = [];
  if (!CHECK_ONLY) {
    backupDir = backupFiles(files);
    try {
      const rows = copyAssetsToDraft(manifest.rows);
      const referenceDraft = JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, files[0]), 'utf8'));
      const topologyPlan = buildTopologyPlan(referenceDraft, rows);
      const drafts = files.map((rel) => ({
        rel,
        draft: JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, rel), 'utf8')),
      }));
      const prepared = drafts.map(({ rel, draft }) => ({ rel, draft, result: patchDraftJson(draft, rows, topologyPlan) }));
      for (const { rel, draft, result } of prepared) {
        fs.writeFileSync(path.join(DRAFT_DIR, rel), JSON.stringify(draft), 'utf8');
        patched.push({ file: rel, trackIndex: result.trackIndex, touched: result.touched.length });
      }
      const check = checkPatched(files, rows);
      const report = {
        status: check.errors.length ? 'failed' : 'ready',
        draftDir: DRAFT_DIR,
        manifest: MANIFEST_PATH,
        assetSubdir: ASSET_SUBDIR,
        maxProviderReuse: MAX_PROVIDER_REUSE,
        backupDir,
        patched,
        topology: topologyPlan ? { createdSegments: topologyPlan.entries.length, timingTrackIndex: topologyPlan.timingTrackIndex } : { createdSegments: 0 },
        summaries: check.summaries,
        errors: check.errors,
        sample: rows.slice(0, 12).map((row) => ({
          index: row.index,
          phraseEn: row.phraseEn,
          query: row.query,
          provider: row.provider,
          providerId: row.providerId,
          path: row.draftLocalPath || row.localPath,
        })),
      };
      if (check.errors.length) {
        restoreFilesFromBackup(backupDir, files);
        report.rolledBack = true;
        writeReport(report);
        console.log(JSON.stringify(report, null, 2));
        process.exit(1);
      }
      writeReport(report);
      console.log(JSON.stringify(report, null, 2));
      return;
    } catch (error) {
      restoreFilesFromBackup(backupDir, files);
      throw error;
    }
  }
  const check = checkPatched(files, manifest.rows);
  const report = {
    status: check.errors.length ? 'failed' : 'ready',
    draftDir: DRAFT_DIR,
    manifest: MANIFEST_PATH,
    assetSubdir: ASSET_SUBDIR,
    maxProviderReuse: MAX_PROVIDER_REUSE,
    backupDir,
    patched,
    summaries: check.summaries,
    errors: check.errors,
    sample: manifest.rows.slice(0, 12).map((row) => ({
      index: row.index,
      phraseEn: row.phraseEn,
      query: row.query,
      provider: row.provider,
      providerId: row.providerId,
      path: row.draftLocalPath || row.localPath,
    })),
  };
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (check.errors.length) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
