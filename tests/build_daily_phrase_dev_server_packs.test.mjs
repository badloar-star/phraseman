import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildDailyPhraseDevServerPacks } from '../scripts/build_daily_phrase_dev_server_packs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('builds six immutable accepted dev-server packs without upload or activation', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-dev-packs-'));
  try {
    const result = buildDailyPhraseDevServerPacks({
      rootDir: ROOT,
      outputRoot,
      generatedAt: '2026-10-04T00:00:00.000Z',
    });

    assert.equal(result.entries.length, 6);
    assert.equal(result.uploadPerformed, false);
    assert.equal(result.activationApproved, false);
    assert.equal(result.releaseApproved, false);

    for (const entry of result.entries) {
      assert.match(entry.payloadSha256, /^[a-f0-9]{64}$/);
      assert.match(entry.serverPath, new RegExp(`^course-packs/${entry.studyTarget}/${entry.sourceLocale}/daily_phrase/`));
      assert.ok(entry.serverPath.endsWith(`/${entry.payloadSha256}.json`));

      const payload = JSON.parse(fs.readFileSync(path.join(outputRoot, entry.serverPath), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, entry.manifestPath), 'utf8'));
      assert.equal(payload.entries.length, 176);
      assert.equal(payload.studyTarget, entry.studyTarget);
      assert.equal(payload.sourceLocale, entry.sourceLocale);
      assert.equal(payload.activationApproved, false);
      assert.ok(payload.entries.every((row) => row.studyTarget === entry.studyTarget));
      assert.ok(payload.entries.every((row) => row.sourceLocale === entry.sourceLocale));
      assert.ok(payload.entries.every((row) => row.active === false && row.activationApproved === false));
      assert.ok(payload.entries.every((row) => !Object.hasOwn(row, 'english')));
      assert.equal(manifest.sha256, entry.payloadSha256);
      assert.equal(manifest.payloadSha256, entry.payloadSha256);
      assert.equal(manifest.uploadPerformed, false);
      assert.equal(manifest.devOnly, true);
    }
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

