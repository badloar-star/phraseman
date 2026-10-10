// зачем (замечание владельца 10.10): «на ряде экранов цвета зашиты под скриншоты макета и не следуют выбранной теме».
// Храповик считает захардкоженные цвета (#HEX, rgb/rgba, именованные) в экранах и компонентах 2.0 вне файлов токенов
// и не даёт их числу расти: базу можно только уменьшать. Нужный цвет — токен темы (liquidGlassTokens: bg, opaque*, glassEdge,
// text/secondary/mutedText, accent*, а также deepBase/mediaInk/bevelHi/bevelLo/dropShadow/hairlineSoft); нужного токена нет —
// запросить у сессии «Темы», свой HEX не вводить. Исключение — тёмные скримы под шторками, DEV-кнопки, запасные значения:
// строка с «// theme-exempt: <причина>».
// Обновить базу после пачки замен: node tests/theme_hardcoded_colors_ratchet.test.mjs --update
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { countByFile, scanHardcodedColors } from './helpers/hardcoded_colors_scan.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'theme-hardcoded-colors-baseline.json');

const current = countByFile(scanHardcodedColors(ROOT));
const total = Object.values(current).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, files: current }, null, 2)}\n`);
  console.log(`theme colors baseline updated: ${total} in ${Object.keys(current).length} files`);
}

test('hardcoded colors in screens never grow — they come from the selected theme tokens', () => {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8').replace(/\r\n/g, '\n'));
  const grown = Object.entries(current).filter(([file, n]) => n > (base.files[file] ?? 0));
  assert.deepEqual(
    grown,
    [],
    `новые захардкоженные цвета: ${JSON.stringify(grown)} — берите токены темы (g.text, g.opaqueCard, g.hairlineSoft, g.mediaInk…) или поставьте «// theme-exempt: причина»`,
  );
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});
