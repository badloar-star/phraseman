/**
 * One-shot: собирает ONLY LESSON_[1-8]_PHRASES из app/lesson_data_1_8.ts
 * перед разбиением на legacy source + ген.
 * Запуск: npx tsx tools/extract_lesson_1_8_phrases_source.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dir, '..', 'app', 'lesson_data_1_8.ts');
const OUT = path.join(__dir, '..', 'app', 'lesson_data_1_8_phrases_source.ts');

const hdr = `// AUTO-EXTRACTED from lesson_data_1_8.ts — EN-токены + метаданные; не править руками.
// Генерация ES L2: npx tsx tools/prompt006_es_phrase_words.ts

import type { LessonPhrase } from './lesson_data_types';

`;

function main() {
  const raw = readFileSync(SRC, 'utf8');
  const chunks: string[] = [];
  for (let n = 1; n <= 8; n++) {
    const re = new RegExp(
      `export const LESSON_${n}_PHRASES:\\s*LessonPhrase\\[]\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`,
      'm',
    );
    const m = raw.match(re);
    if (!m) throw new Error(`LESSON_${n}_PHRASES block not found`);
    chunks.push(`export const LESSON_${n}_PHRASES: LessonPhrase[] = ${m[1]}\n`);
  }
  writeFileSync(OUT, hdr + chunks.join('\n'), 'utf8');
  console.log('Wrote', OUT);
}

main();
