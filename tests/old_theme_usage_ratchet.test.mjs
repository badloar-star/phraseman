// зачем (закон владельца 22.10: «цвета строго оттенки ТЕКУЩЕЙ темы»; координатор: храповик старой темы): число обращений к полям СТАРОЙ темы (`t.correct`, `t.wrong`, `t.accent`, `t.textMuted`…
// из constants/theme.ts ← cinemaThemes.ts, она не следует за выбранной liquid-темой) в экранах не растёт; новые файлы стартуют с нуля — только токены текущей темы (`g.*`: useShadowGlass / useLv2Glass).
// Замены и контраст: docs/work/old_theme_colors_audit_2026-10-22.md. Обновить базу после пачки замен: node tests/old_theme_usage_ratchet.test.mjs --update
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'old-theme-usage-baseline.json');
const TOKENS = ['correct', 'wrong', 'accent', 'gold', 'onAccent', 'onCorrect', 'onGold', 'bloomA', 'bloomB', 'textMuted', 'textGhost', 'btnShadow', 'cardGradient', 'bgGradient3', 'borderLight', 'second', 'surface2', 'surface', 'card'];
const RE = new RegExp(`\\b(?:t|theme)\\.(?:${TOKENS.join('|')})\\b`, 'g');
const SKIP = /(^|\/)dev\/|dev_hub|DevHub|DevBots|motion_showcase|_preview|^app\/_|learning-v2-lab|TabBarHybridPreview|\.test\./;

function walk(dir, out) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx$/.test(name) && !SKIP.test(rel)) out.push(rel);
  }
  return out;
}

function count() {
  const res = {};
  for (const file of [...walk('components', []), ...walk('app', [])]) {
    let n = 0;
    for (const line of readFileSync(join(ROOT, file), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      n += (line.match(RE) || []).length;
    }
    if (n > 0) res[relative(ROOT, join(ROOT, file)).split(sep).join('/')] = n;
  }
  return res;
}

const current = count();
const total = Object.values(current).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, files: current }, null, 2)}\n`);
  console.log(`old theme usage baseline updated: ${total} in ${Object.keys(current).length} files`);
}

test('экраны не берут новые цвета СТАРОЙ темы: обращения к t.* / theme.* не растут, новые файлы — только токены текущей темы', () => {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8').replace(/\r\n/g, '\n'));
  const grown = Object.entries(current).filter(([file, n]) => n > (base.files[file] ?? 0));
  assert.deepEqual(grown, [], `новые обращения к старой теме: ${JSON.stringify(grown)} — берите g.* (useShadowGlass / useLv2Glass), таблица замен в docs/work/old_theme_colors_audit_2026-10-22.md`);
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});
