import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('release preserves authored whole expression tiles in builders and dictation', (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'learning-chunks-'));
  t.after(() => {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith('learning-chunks-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, 'pipeline'));
  for (const name of ['build_release.mjs', 'session_readiness.mjs', 'owner_quality.mjs', 'progression_quality_gate.mjs']) fs.copyFileSync(path.join(here, name), path.join(root, 'pipeline', name));
  const dir = path.join(root, 'sessions/en/l02/s51');
  fs.mkdirSync(dir, { recursive: true });
  const intro = [1, 2, 3].map(n => `## Интро ${n}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n- ❌ am — *Про себя.*\n\n---`).join('\n\n');
  fs.writeFileSync(path.join(dir, 'final.ru.md'), `# Test\n\n${intro}\n\n## Практика\n\n**1 · Соберите фразу**\nПлитки: \`far\` \`Excuse me\` \`it\` \`Is\` → **Excuse me. Is it far?**\n\n**2 · Послушайте и соберите**\n🔊 *Excuse me. Are you ready?* Плитки: \`ready\` \`Excuse me\` \`you\` \`Are\` → **Excuse me. Are you ready?**\n\n**3 · Соберите фразу**\nПлитки: \`is\` \`This\` \`fine\` \`is fine now\` → **This is fine.**\n\nmodes: 1=phrase_builder, 2=listen_build_dictation, 3=phrase_builder\n`);
  const out = path.join(root, 'preview');
  const source = path.join(dir, 'final.ru.md');
  let markdown = fs.readFileSync(source, 'utf8');
  markdown = markdown.replace('`is fine now` →', '`is fine now` `his is` →');
  markdown = markdown.replace('modes: 1=', '**4 · Соберите фразу**\nПлитки: `She` `is` `ready` `he` → **She is ready.**\n\nmodes: 1=');
  markdown = markdown.replace('3=phrase_builder', '3=phrase_builder, 4=phrase_builder');
  fs.writeFileSync(source, markdown);
  const result = spawnSync(process.execPath, [path.join(root, 'pipeline/build_release.mjs'), '--session', 'en/l02/s51', '--locales', 'ru', '--out', out], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const learner = JSON.parse(fs.readFileSync(path.join(out, 'en/l02/s51/learner.json'), 'utf8'));
  assert.deepEqual(learner.interactions[0].modePayload.orderedTokens, ['Excuse me.', 'Is', 'it', 'far']);
  assert.deepEqual(learner.interactions[1].modePayload.orderedTokens, ['Excuse me.', 'Are', 'you', 'ready']);
  assert.deepEqual(learner.interactions[2].modePayload.orderedTokens, ['This', 'is', 'fine']);
  assert.deepEqual(learner.interactions[2].modePayload.authoredDistractorTokens, ['is fine now', 'his is']);
  assert.deepEqual(learner.interactions[3].modePayload.authoredDistractorTokens, ['he']);
});
