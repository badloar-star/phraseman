import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('local release preserves seven pairs and five choices for later lessons', t => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'learning-ladder-release-'));
  t.after(() => {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith('learning-ladder-release-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, 'pipeline'));
  for (const name of ['build_release.mjs', 'session_readiness.mjs', 'owner_quality.mjs', 'progression_quality_gate.mjs']) fs.copyFileSync(path.join(here, name), path.join(root, 'pipeline', name));
  const intro = [1, 2, 3].map(n => `## Интро ${n}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n- ❌ am — *Про себя.*\n\n---`).join('\n\n');
  for (const [lesson, count] of [[3, 4], [5, 5], [13, 6], [25, 7]]) {
    const session = `en/l${String(lesson).padStart(2, '0')}/s01`;
    const dir = path.join(root, 'sessions', session);
    fs.mkdirSync(dir, { recursive: true });
    const pairs = Array.from({ length: count }, (_, i) => `word${i} — значение ${i}`).join(' · ');
    fs.writeFileSync(path.join(dir, 'final.ru.md'), `# Test\n\n${intro}\n\n## Практика\n\n**1 · Соедините пары (Speed Match, ${count} ${count === 4 ? 'пары' : 'пар'})**\n${pairs}\n\n**2 · Вставьте слово**\nShe ___ ready. → **is** · am · are · be · been\n\n## Для сборщика\n\nmodes: 1=speed_match, 2=context_gap_grammar\n`);
    const result = spawnSync(process.execPath, [path.join(root, 'pipeline/build_release.mjs'), '--session', session, '--locales', 'ru', '--out', path.join(root, 'preview')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.doesNotMatch(result.stdout + result.stderr, /проблем сборки:|нужно 4|больше четырёх/);
    const learner = JSON.parse(fs.readFileSync(path.join(root, 'preview', session, 'learner.json'), 'utf8'));
    assert.equal(learner.interactions[0].modePayload.pairGrid.length, count);
    assert.equal(learner.interactions[0].prompt, 'Соедините пары');
    assert.equal(learner.interactions[1].responseOptions.length, 5);
  }
});
