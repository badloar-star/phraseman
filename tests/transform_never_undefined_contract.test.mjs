// зачем (координатор 12.10, 🔴 краш смены языка в Настройках, журнал Сверки dp_deuk.log): стиль `transform: cond ? [...] : undefined`
// при смене cond → false оставляет ключ transform со значением undefined; дифф Fabric (React Native 0.81) превращает его в null и
// зовёт processTransform(null), а он в __DEV__ падает на null.forEach → ErrorBoundary «Щось пішло не так». Так падали смена языка
// (app/settings_language.tsx) и, тем же классом, выбор ответа в экзамене и Learning V2. Правило: transform — всегда массив
// (пустой [] = «без сдвига») или ключа нет вовсе.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['app', 'components', 'hooks', 'modules'];
const SKIP = /^(node_modules|__tests__|_archive|\.git)$/;
// `transform: X ? [...] : undefined`, `transform: X ? undefined : [...]`, `transform: undefined` — в одной строке или с переносом.
const UNDEFINED_TRANSFORM = /\btransform:\s*(?:undefined\b|[^,;}\n]*?\?[^\n]*?:\s*undefined\b|[^,;}\n]*?\?\s*undefined\s*:)/;

// Исключений нет: последнее место (опрос, закреплённый контрольной суммой) исправлено по разрешению координатора 12.10.
// Новое исключение — только с условием выхода и записью причины.
const KNOWN_PENDING = new Map();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!SKIP.test(entry.name)) walk(path.join(dir, entry.name), out); }
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(path.join(dir, entry.name));
  }
  return out;
}

function findings(source) {
  const hits = [];
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    const joined = /\btransform:\s*$/.test(line) ? `${line} ${lines[i + 1] ?? ''}` : line;
    if (UNDEFINED_TRANSFORM.test(joined)) hits.push(i + 1);
  });
  return hits;
}

test('правило ловит все формы и не трогает массив / отсутствие ключа', () => {
  assert.deepEqual(findings('style={{ transform: active ? [{ translateY: -3 }] : undefined }}'), [1]);
  assert.deepEqual(findings('  transform: lifted ? undefined : [{ scale: 2 }],'), [1]);
  assert.deepEqual(findings('  transform: undefined,'), [1]);
  assert.deepEqual(findings('  transform:\n    lifted ? [{ translateY: -3 }] : undefined,'), [1]);
  assert.deepEqual(findings('style={{ transform: active ? [{ translateY: -3 }] : [] }}'), []);
  assert.deepEqual(findings('style={[a, active ? { transform: [{ translateY: -3 }] } : null]}'), []);
  assert.deepEqual(findings('const label = ok ? undefined : "x"; const t = { transform: [{ scale }] };'), []);
});

test('в исходниках нет transform со значением undefined (кроме закреплённого файла с условием выхода)', () => {
  const offenders = [];
  for (const dir of DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      const hits = findings(normalizeEol(fs.readFileSync(file, 'utf8')));
      const allowed = KNOWN_PENDING.get(rel) ?? 0;
      if (hits.length > allowed) offenders.push(`${rel}:${hits.join(',')}`);
    }
  }
  assert.deepEqual(offenders, [], 'transform: … : undefined — замени на [] (пустой массив) или не ставь ключ');
});

test('исключение не протухло: в закреплённом файле правка ещё не сделана', () => {
  for (const [rel, count] of KNOWN_PENDING) {
    const hits = findings(normalizeEol(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    assert.equal(hits.length, count, `${rel}: исключение больше не нужно — удали его из KNOWN_PENDING`);
  }
});
