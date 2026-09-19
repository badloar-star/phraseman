import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));

test('gap at the beginning survives the real source to mockup build', () => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'learning-v2-gap-'));
  try {
    fs.mkdirSync(path.join(root, 'pipeline'));
    for (const name of ['build_release.mjs', 'build_mockup.mjs', 'write_mockup_file.mjs', 'session_readiness.mjs', 'owner_quality.mjs', 'progression_quality_gate.mjs']) {
      fs.copyFileSync(path.join(here, name), path.join(root, 'pipeline', name));
    }
    const source = path.join(root, 'sessions/en/l02/s08');
    fs.mkdirSync(source, { recursive: true });
    fs.copyFileSync(path.join(here, '../sessions/en/l02/s08/final.ru.md'), path.join(source, 'final.ru.md'));
    const build = spawnSync(process.execPath, [path.join(root, 'pipeline/build_release.mjs'), '--session', 'en/l02/s08', '--locales', 'ru'], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const child = JSON.parse(fs.readFileSync(path.join(root, 'release/en/l02/s08/learner.json'), 'utf8'));
    const gap = child.interactions.find(i => i.interactionId.endsWith(':i02'));
    assert.equal(gap.modePayload.gappedTargetPhrase, '___ you awake?');
    assert.equal(child.interactions.find(i => i.interactionId.endsWith(':i05')).modePayload.gappedTargetPhrase, 'Are you ___ ?');
    const preview = spawnSync(process.execPath, [path.join(root, 'pipeline/build_mockup.mjs')], { encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr || preview.stdout);
    const html = fs.readFileSync(path.join(root, 'mockup/index.html'), 'utf8');
    const data = JSON.parse(/<script id="data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
    assert.equal(data[0].learner.interactions.find(i => i.interactionId.endsWith(':i02')).modePayload.gappedTargetPhrase, '___ you awake?');
  } finally {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith('learning-v2-gap-'));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
