// зачем (решение координатора 25.10, перепись цветов docs/work/color-literal-census-2026-10-25.md): онбординг идёт ДО выбора темы, поэтому
// красится своей фиксированной палитрой, а не оттенками темы. В этом OTA его не перекрашиваем (≈ 6400 строк, первый экран каждого
// нового пользователя); перевод на тему по умолчанию — после OTA, через макет владельцу. Общий сканер цветов
// (tests/helpers/hardcoded_colors_scan.mjs) пропускает ЛЮБОЙ путь с «onboarding» — так исключение могло расползтись на новые файлы.
// Сторож: литералы цвета в файлах онбординга живут только в перечисленных файлах и не растут; файлы палитры несут пометку с причиной.
// Число может только падать: после перекраски уменьшите базу (или удалите файл из списка).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REASON = 'theme-exempt: до выбора темы; перевод на тему по умолчанию — после OTA, через макет владельцу';
// база на 25.10: литералы цвета в строках кода (комментарии не считаются)
const ALLOWED = {
  'components/CleanOnboarding.tsx': 64,
  'components/onboarding_palette.ts': 1,
  // 28.10: онбординг «ага» (aha_theme, aha_ui, SpeechBeat) переведён в цвета темы по умолчанию (решение владельца) — литералов 0, из списка убран;
  // страж палитры — tests/onboarding_aha_theme_palette.test.ts. CleanOnboarding.tsx — файл Codex, остаётся до его правки.
};
const MUST_DECLARE = ['components/CleanOnboarding.tsx'];

const reColor = /#[0-9A-Fa-f]{8}\b|#[0-9A-Fa-f]{6}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}
function countLiterals(abs) {
  let n = 0;
  let inBlock = false;
  for (const raw of readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const t = raw.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
    if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; continue; }
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    n += (raw.replace(/\/\/.*$/, '').match(reColor) || []).length;
  }
  return n;
}

test('онбординг: цвета вне темы только в перечисленных файлах и не растут', () => {
  const found = {};
  for (const dir of ['app', 'components', 'modules']) {
    for (const abs of walk(join(ROOT, dir), [])) {
      const rel = relative(ROOT, abs).split(sep).join('/');
      if (!/onboarding/i.test(rel)) continue;
      const n = countLiterals(abs);
      if (n > 0) found[rel] = n;
    }
  }
  const grown = Object.entries(found).filter(([f, n]) => n > (ALLOWED[f] ?? 0));
  assert.deepEqual(grown, [], `цвета вне темы в онбординге растут или появились в новом файле: ${JSON.stringify(grown)} — берите токены темы; исключение только у списка ALLOWED`);
});

test('файлы палитры онбординга несут пометку исключения с причиной', () => {
  for (const f of MUST_DECLARE) assert.ok(readFileSync(join(ROOT, f), 'utf8').includes(REASON), `${f}: нет пометки «${REASON}»`);
});
