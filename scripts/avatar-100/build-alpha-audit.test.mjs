import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('audits every requested dark/light variant and writes a tier contact sheet', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-alpha-audit-'));
  const inputDir = path.join(temp, 'input');
  const outDir = path.join(temp, 'output');
  const reportPath = path.join(temp, 'report.json');
  fs.mkdirSync(inputDir, { recursive: true });

  const svg = Buffer.from('<svg width="512" height="512"><circle cx="256" cy="256" r="120" fill="#f4efe6"/></svg>');
  for (const id of [63, 64]) {
    for (const variant of ['black', 'white']) {
      await sharp(svg).webp({ quality: 76, alphaQuality: 100 }).toFile(
        path.join(inputDir, `custom-idea-${id}-${variant}.webp`),
      );
    }
  }

  execFileSync(process.execPath, [
    'scripts/avatar-100/build-alpha-audit.mjs',
    '--input-dir', inputDir,
    '--start', '63',
    '--end', '64',
    '--out-dir', outDir,
    '--json', reportPath,
  ], { cwd: ROOT });

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.checked, 4);
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.rejected, []);
  assert.deepEqual(
    report.entries.map(({ id, variant }) => [id, variant]),
    [[63, 'black'], [63, 'white'], [64, 'black'], [64, 'white']],
  );
  assert.equal(fs.existsSync(path.join(outDir, 'tier-50-alpha-audit.png')), true);
});
