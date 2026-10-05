// зачем (PM-216-A1/A2): отчёт о размере сборки разделяет JS / assets / native по платформам и не
// выдаёт размер репозитория за размер приложения. Запуск: node --test tests/pm216_release_size_report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderReport, summarizeExport } from '../scripts/pm216_release_size_report.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

function fakeExport() {
  const dir = mkdtempSync(join(tmpdir(), 'pm216-'));
  mkdirSync(join(dir, '_expo/static/js/ios'), { recursive: true });
  mkdirSync(join(dir, '_expo/static/js/android'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, '_expo/static/js/ios/entry.hbc'), Buffer.alloc(3000, 1));
  writeFileSync(join(dir, '_expo/static/js/android/entry.hbc'), Buffer.alloc(2000, 1));
  writeFileSync(join(dir, 'assets/a1'), Buffer.alloc(500));
  writeFileSync(join(dir, 'assets/a2'), Buffer.alloc(700));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    fileMetadata: {
      ios: { bundle: '_expo/static/js/ios/entry.hbc', assets: [{ path: 'assets/a1', ext: 'png' }, { path: 'assets/a2', ext: 'mp3' }] },
      android: { bundle: '_expo/static/js/android/entry.hbc', assets: [{ path: 'assets/a1', ext: 'png' }, { path: 'assets/gone', ext: 'webp' }] },
    },
  }));
  return dir;
}

test('summarizeExport splits JS and assets per platform and reports missing files instead of zeroing them', () => {
  const dir = fakeExport();
  try {
    const s = summarizeExport(dir);
    assert.equal(s.ios.bundleBytes, 3000);
    assert.equal(s.ios.assetBytes, 1200);
    assert.deepEqual(Object.keys(s.ios.assetsByExt).sort(), ['mp3', 'png']);
    assert.equal(s.android.bundleBytes, 2000);
    assert.equal(s.android.assetsMissing, 1);
    assert.equal(s.android.assetBytes, 500);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renderReport computes native as install minus JS minus assets, and says n/a when install size is not given', () => {
  const dir = fakeExport();
  try {
    const s = summarizeExport(dir);
    const withInstall = renderReport(s, { ios: 10_000_000 });
    assert.match(withInstall, /\| ios \|/);
    assert.match(withInstall, /9\.\d\d МБ/);
    const without = renderReport(s, {});
    assert.match(without, /н\/д \| н\/д \|\n/);
    assert.match(without, /не выдаём|оценка/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the report text never presents repository size as app size', () => {
  const dir = fakeExport();
  try {
    const text = renderReport(summarizeExport(dir), {});
    assert.match(text, /Размер репозитория.*за размер приложения не выдаются/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PM-009 inventory keeps sources, archive and bundle as three different columns (A2)', () => {
  const md = normalizeEol(readFileSync(new URL('../docs/phraseman-2.0/evidence/PM-009_asset_bundle_inventory.md', import.meta.url), 'utf8'));
  assert.match(md, /исходники\*\* — все байты файлов в `assets\/`/);
  assert.match(md, /\*\*в архиве EAS\*\*/);
  assert.match(md, /\*\*в бандле\*\*/);
  const runtime = normalizeEol(readFileSync(new URL('../docs/phraseman-2.0/docs/RUNTIME.md', import.meta.url), 'utf8'));
  assert.match(runtime, /PM-216/);
});
