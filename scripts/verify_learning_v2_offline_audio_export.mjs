import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_FILENAMES = Object.freeze([
  'he-is-sick.m4a',
  'i-am-here.m4a',
  'it-is-cheap.m4a',
  'we-are-safe.m4a',
]);

const exportDir = path.resolve(process.argv[2] || 'dist');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'assets/audio/learning-v2/lesson1');
const assetMapPath = path.join(exportDir, 'assetmap.json');
const metadataPath = path.join(exportDir, 'metadata.json');

const fail = (message) => {
  throw new Error(`learning_v2_offline_audio_export_invalid:${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const md5 = (bytes) => crypto.createHash('md5').update(bytes).digest('hex');

if (!fs.existsSync(assetMapPath) || !fs.existsSync(metadataPath)) fail('manifest_missing');
const assetMap = readJson(assetMapPath);
const metadata = readJson(metadataPath);
const iosAssets = metadata?.fileMetadata?.ios?.assets;
if (!Array.isArray(iosAssets)) fail('ios_metadata_missing');

const exported = [];
for (const filename of EXPECTED_FILENAMES) {
  const sourcePath = path.join(sourceDir, filename);
  if (!fs.existsSync(sourcePath)) fail(`source_missing:${filename}`);
  const sourceHash = md5(fs.readFileSync(sourcePath));
  const record = assetMap[sourceHash];
  if (!record || record.type !== 'm4a') fail(`assetmap_missing:${filename}`);
  const recordFiles = Array.isArray(record.files) ? record.files : [];
  if (!recordFiles.some((candidate) => path.basename(candidate) === filename)) {
    fail(`assetmap_filename_mismatch:${filename}`);
  }
  const relativeExportPath = `assets/${sourceHash}`;
  if (!iosAssets.some((candidate) => candidate?.path === relativeExportPath)) {
    fail(`metadata_missing:${filename}`);
  }
  const exportedPath = path.join(exportDir, relativeExportPath);
  if (!fs.existsSync(exportedPath)) fail(`bytes_missing:${filename}`);
  if (md5(fs.readFileSync(exportedPath)) !== sourceHash) fail(`bytes_mismatch:${filename}`);
  exported.push({ filename, sourceHash });
}

const lessonAudioRecords = Object.values(assetMap).filter((record) =>
  record?.httpServerLocation === '/assets/assets/audio/learning-v2/lesson1' && record?.type === 'm4a');
if (lessonAudioRecords.length !== EXPECTED_FILENAMES.length) fail('unexpected_asset_count');

process.stdout.write(`${JSON.stringify({ status: 'PASS', exportDir, exported })}\n`);
