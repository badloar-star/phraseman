// зачем (владелец 11.10, журнал 12, капсом: «раздела «Умная очередь» такого не должно существовать в приложении — требование удалить»):
// в коде интерфейса нет пользовательского названия раздела ни на одном из 9 языков и нет ключа smartQueue. Механика подбора карточек
// (smartSortCards и т. п.) остаётся — запрещено только называть её пользователю. Сторож обходит app/components/constants/hooks/modules/lib.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NAMES = [
  'умная очередь', 'розумна черга', 'smart queue', 'cola inteligente', 'fila inteligente',
  'hàng đợi thông minh', 'antrean pintar', 'akıllı sıra', 'inteligentna kolejka',
];
const KEYS = /smartQueue|smart_queue/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(tsx?|jsx?|json)$/.test(name)) out.push(p);
  }
  return out;
}

test('no user-facing «Smart queue» section in any language and no smartQueue key', () => {
  const offenders = [];
  for (const dir of ['app', 'components', 'constants', 'hooks', 'modules', 'lib']) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const file of walk(join(ROOT, dir), [])) {
      const rel = relative(ROOT, file).split(sep).join('/');
      const src = normalizeEol(readFileSync(file, 'utf8'));
      const lower = src.toLowerCase();
      const hit = NAMES.find((n) => lower.includes(n)) ?? (KEYS.test(src) ? 'smartQueue' : null);
      if (hit) offenders.push(`${rel}: ${hit}`);
    }
  }
  assert.deepEqual(offenders, []);
});
