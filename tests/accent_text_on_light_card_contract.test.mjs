// зачем (координатор 11.10; кадр CHK_w_light_session: перевод бледно-мятным на белой карточке): цвет АКЦЕНТА как ТЕКСТ или ЗНАЧОК
// (свойство color / проп color=) берётся из токена accentText (≥ 4.5:1 на карточке, в светлой он темнее), а не из заливочных
// textSecond / accent / cta / gold / accentBright — те в светлом оформлении при высокой насыщенности бледные (1.4–1.8:1).
// Тени (boxShadow с offsetX) и строки с пометкой `accent-text-ok: <причина>` не считаются. Обходит все файлы стор-сборки.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectStoreSurfaceFiles } from './helpers/typography_store_surface.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BS = String.fromCharCode(92);
const TOKEN = new RegExp(`${BS}b(?:t|theme|g|glass|swipeGlass|recallGlass|blitzGlass)${BS}.(?:textSecond|accent|cta|gold|accentBright)${BS}b`);
const START = new RegExp(`(?<![A-Za-z])color(=${BS}{|:${BS}s*)`, 'g');

function exprEnd(s, i, colon) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth === 0) return j; depth--; }
    else if (c === ',' && depth === 0 && colon) return j;
  }
  return s.length;
}

test('no accent fill token paints text or icons: use accentText', () => {
  const bad = [];
  for (const file of collectStoreSurfaceFiles(ROOT)) {
    if (/^constants\//.test(file)) continue;
    normalizeEol(readFileSync(join(ROOT, file), 'utf8')).split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line) || /accent-text-ok:/.test(line) || /offsetX|boxShadow|shadowColor/.test(line)) return;
      for (const m of line.matchAll(START)) {
        const a = m.index + m[0].length;
        const seg = line.slice(a, exprEnd(line, a, !m[1].startsWith('=')));
        if (TOKEN.test(seg)) { bad.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`); break; }
      }
    });
  }
  assert.deepEqual(bad, [], 'текст/значок цветом акцента — t.accentText (g.accentText); заливка accent/cta/gold остаётся заливкой');
});

test('accentText is part of the theme object', () => {
  const src = normalizeEol(readFileSync(join(ROOT, 'constants', 'liquidGlassThemePalette.ts'), 'utf8'));
  assert.match(src, /accentText:\s*t\.accentText/);
  assert.match(normalizeEol(readFileSync(join(ROOT, 'constants', 'theme.ts'), 'utf8')), /accentText:\s*'#47C870'/);
});
