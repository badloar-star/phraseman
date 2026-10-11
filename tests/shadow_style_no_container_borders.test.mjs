// зачем (владелец 12.10, «ВТОРОЙ ВАРИАНТ ДЕЛАЕМ!», стиль «Тень»): КОНТЕЙНЕРЫ БЕЗ ОБВОДОК. Исключение PhraseMan 2.0 от 24.09 (тонкие hairline-обводки и
// внутренние кромки) для контейнеров снято. Сторож-«храповик»: считает в боевом коде места, где контейнер получает обводку или внутреннюю кромку, и не даёт числу
// расти — базу можно только уменьшать. Плашку делают PlateFill + plateBoxShadow (components/v2/ShadowSurface.tsx), а не рамка.
//
// Что считается нарушением (в строке нет метки `shadow-ok: <причина>`):
//   1) borderColor с токеном контейнерной кромки: glassEdge / hairline* / line / border / stroke / outline;
//   2) внутренняя тень-кромка: `inset: true` (кольцо, фаски bevelHi/bevelLo);
//   3) bevelHi / bevelLo / ringShadow( / bevelShadow( — помощники кромки;
//   4) borderWidth ≥ 1 (в т.ч. hairlineWidth). Разделитель-линия делается высотой View, а не рамкой.
// Что можно оставить, пометив `shadow-ok: <причина>`: кольца исхода ответа верно/неверно, радио/чекбокс-индикатор, дорожки и кольца прогресса,
// аватар-кольцо, трек переключателя, пунктир, граница внутри арта — это не обводка контейнера.
// Обновить базу после пачки правок: node tests/shadow_style_no_container_borders.test.mjs --update
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'shadow-style-borders-baseline.json');
const DIRS = ['app', 'components', 'modules'];
// ОНБОРДИНГ ЗАМОРОЖЕН (приказ владельца 12.10: «дизайн онбординга не должен меняться вообще»): его файлы вне правила «Тень».
const SKIP = [/(^|\/)dev\//, /onboarding/i, /CleanOnboarding/, /language_welcome/, /AuthProviderButtons/, /AccountDeletedNotice/, /\.test\./, /_dev_/, /dev_hub/i, /motion_showcase/, /learning-v2-lab\//, /(^|\/)_[a-z_]+\.tsx$/, /DevBotsSheet/, /TabBarHybridPreview/, /_preview\.tsx$/, /_smoke\.tsx$/];
const OK_MARK = /shadow-ok:\s*\S/;
const RULES = [
  { id: 'borderColor-token', re: /borderColor:[^\n]*\b(glassEdge|hairline\w*|line|border|stroke|outline)\b/ },
  { id: 'inset-rim', re: /inset:\s*true/ },
  { id: 'bevel-helper', re: /\b(bevelHi|bevelLo|ringShadow\(|bevelShadow\()/ },
  { id: 'borderWidth', re: /\bborder(Top|Bottom|Left|Right)?Width:\s*([1-9]|0\.[1-9]|StyleSheet\.hairlineWidth)/ },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function offenders() {
  const counts = {};
  for (const d of DIRS) {
    for (const f of walk(join(ROOT, d), [])) {
      const rel = relative(ROOT, f).split(sep).join('/');
      if (SKIP.some((re) => re.test(rel))) continue;
      const lines = normalizeEol(readFileSync(f, 'utf8')).split('\n');
      let n = 0;
      for (const line of lines) {
        const code = line.trim();
        if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) continue;
        if (OK_MARK.test(line)) continue;
        if (RULES.some((r) => r.re.test(line))) n++;
      }
      if (n > 0) counts[rel] = n;
    }
  }
  return counts;
}

const current = offenders();
const total = Object.values(current).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify({ total, files: current }, null, 2) + '\n');
  console.log(`shadow-style borders baseline updated: ${total}`);
}

test('containers get no borders or inner rims in new code — the count only shrinks (стиль «Тень», 12.10)', () => {
  const base = JSON.parse(normalizeEol(readFileSync(BASELINE, 'utf8')));
  const grown = Object.entries(current).filter(([f, n]) => n > (base.files[f] ?? 0));
  assert.deepEqual(grown, [], `новые обводки/кромки у контейнеров: ${JSON.stringify(grown)} — плашка = PlateFill + plateBoxShadow (ShadowSurface); семантическое кольцо пометь «shadow-ok: причина»`);
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});

test('the shared kit itself draws no borders or rims', () => {
  for (const f of [
    'components/v2/ShadowSurface.tsx', 'components/cards-grid/CardsKit.tsx', 'components/v2/KitLiquidGlass.tsx',
    'components/mistakes-panel/GlassRim.tsx', 'components/mistakes-panel/PanelKit.tsx', 'components/packs/PackRow.tsx',
  ]) {
    assert.equal(current[f] ?? 0, 0, `${f} — kit без обводок и кромок`);
  }
});
