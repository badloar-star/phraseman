/**
 * Удаляет встроенные LESSON_9…16_PHRASES из lesson_data_9_16.ts и вставляет реэкспорт из gen.
 * Запуск из корня: node scripts/splice-lesson-9-16-phrases.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const TARGET = path.join(ROOT, 'app', 'lesson_data_9_16.ts');

const RANGES = [
  [6299, 7287],
  [5442, 6260],
  [4565, 5403],
  [3655, 4526],
  [2789, 3616],
  [1874, 2653],
  [1018, 1783],
  [98, 926],
];

const EXPORT_BLOCK = `
export {
  LESSON_9_PHRASES,
  LESSON_10_PHRASES,
  LESSON_11_PHRASES,
  LESSON_12_PHRASES,
  LESSON_13_PHRASES,
  LESSON_14_PHRASES,
  LESSON_15_PHRASES,
  LESSON_16_PHRASES,
} from './lesson_data_9_16_phrases_es.gen';
`;

function main() {
  let lines = fs.readFileSync(TARGET, 'utf8').split(/\r?\n/);
  const sorted = [...RANGES].sort((a, b) => b[0] - a[0]);
  for (const [start, end] of sorted) {
    const s = start - 1;
    const e = end;
    lines = [...lines.slice(0, s), ...lines.slice(e)];
  }
  const joined = lines.join('\n');
  const needle = "import { LessonIntroScreen, LessonPhrase } from './lesson_data_types';\n";
  if (!joined.includes(needle)) throw new Error('import needle not found');
  const out = joined.replace(
    needle,
    `${needle}\n${EXPORT_BLOCK.trim()}\n`,
  );

  fs.writeFileSync(TARGET, out, 'utf8');
  console.log('Patched', TARGET);
}

main();
