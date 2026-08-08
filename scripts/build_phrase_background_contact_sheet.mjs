#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const rawArgs = process.argv.slice(2);
const manifestPath = path.resolve(argValue('--manifest'));
const framesDir = path.resolve(argValue('--frames-dir'));
const outputPath = path.resolve(argValue('--output'));
const columns = 20;
const frameWidth = 108;
const frameHeight = 192;

if (!manifestPath || !framesDir || !outputPath) {
  throw new Error('Usage: node scripts/build_phrase_background_contact_sheet.mjs --manifest <manifest.json> --frames-dir <dir> --output <sheet.jpg>');
}

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const rows = [...(manifest.rows || [])].sort((a, b) => a.index - b.index);
if (rows.length !== 300) throw new Error(`Expected 300 manifest rows, got ${rows.length}`);
fs.mkdirSync(framesDir, { recursive: true });

const frames = [];
for (const row of rows) {
  if (!row.localPath || !fs.existsSync(row.localPath)) throw new Error(`Missing background for row ${row.index}: ${row.localPath}`);
  const framePath = path.join(framesDir, `${String(row.index).padStart(3, '0')}.jpg`);
  execFileSync(
    'ffmpeg',
    ['-y', '-v', 'error', '-ss', '1.5', '-i', row.localPath, '-frames:v', '1', '-vf', `scale=${frameWidth}:${frameHeight}`, framePath],
    { stdio: 'pipe' },
  );
  frames.push(framePath);
}

const rowsCount = Math.ceil(frames.length / columns);
const composites = await Promise.all(
  frames.map(async (framePath, index) => ({ input: await sharp(framePath).jpeg().toBuffer(), left: (index % columns) * frameWidth, top: Math.floor(index / columns) * frameHeight })),
);
await sharp({ create: { width: columns * frameWidth, height: rowsCount * frameHeight, channels: 3, background: '#000000' } })
  .composite(composites)
  .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
  .toFile(outputPath);

console.log(JSON.stringify({ status: 'ready', rows: rows.length, framesDir, outputPath, width: columns * frameWidth, height: rowsCount * frameHeight }, null, 2));
