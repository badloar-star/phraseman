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

// локальные псевдонимы вида `const accent = t.accent`, которыми потом красят color: тот же дефект, что и прямой t.accent
const ALIAS_DEF = new RegExp(`(?:const|let)${BS}s+(${BS}w+)${BS}s*(?::[^=]+)?=${BS}s*(?:[^;]*?[?:]${BS}s*)?(?:t|theme|g|glass)${BS}.(?:accent|cta|textSecond|gold|accentBright)${BS}b`);
// осознанные исключения: цвет набора (не тема), семантика оценки, заливка кнопки с белым текстом
const ALIAS_OK = new Set(['app/flashcards/PhraseCard.tsx:accent', 'app/pack_opening.tsx:accent', 'app/streak_stats.tsx:scoreAccent', 'components/VipSurveyModal.tsx:accent']);

test('no local alias of an accent fill token paints text or icons', () => {
  const bad = [];
  for (const file of collectStoreSurfaceFiles(ROOT)) {
    if (/^constants\//.test(file)) continue;
    const lines = normalizeEol(readFileSync(join(ROOT, file), 'utf8')).split(String.fromCharCode(10));
    const names = new Set();
    lines.forEach((line) => {
      if (/^\s*(\/\/|\*)/.test(line) || /accentText/.test(line)) return;
      const m = ALIAS_DEF.exec(line);
      if (m && !ALIAS_OK.has(`${file}:${m[1]}`)) names.add(m[1]);
    });
    for (const name of names) {
      const use = new RegExp(`(?<![A-Za-z.])color(?:=${BS}{|:${BS}s*)[^,}]*?${BS}b${name}${BS}b`);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line) || /accent-text-ok:/.test(line)) return;
        if (use.test(line)) bad.push(`${file}:${i + 1} [${name}] ${line.trim().slice(0, 110)}`);
      });
    }
  }
  assert.deepEqual(bad, [], 'псевдоним заливочного токена красит текст/значок — определи его через accentText');
});

test('accentText is part of the theme object', () => {
  const src = normalizeEol(readFileSync(join(ROOT, 'constants', 'liquidGlassThemePalette.ts'), 'utf8'));
  assert.match(src, /accentText:\s*t\.accentText/);
  assert.match(normalizeEol(readFileSync(join(ROOT, 'constants', 'theme.ts'), 'utf8')), /accentText:\s*'#47C870'/);
});
