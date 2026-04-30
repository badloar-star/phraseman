/**
 * Dumps { id, english } for each phrase in lesson_data_25_32.ts (file order).
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ts = fs.readFileSync(join(__dirname, '..', 'app', 'lesson_data_25_32.ts'), 'utf8');

const lessons = ts.split(/export const LESSON_(\d+)_PHRASES/);
const out = [];

for (let i = 1; i < lessons.length; i += 2) {
  const lessonNum = lessons[i];
  const body = lessons[i + 1];
  const phraseBlocks = body.split(/\},\s*\{/);
  for (let j = 0; j < phraseBlocks.length; j++) {
    let block = phraseBlocks[j];
    if (j > 0) block = '{' + block;
    if (j < phraseBlocks.length - 1) block = block + '}';

    const idM = block.match(/\bid:\s*['"]([^'"]+)['"]/);
    const enM =
      block.match(/\benglish:\s*"((?:[^"\\]|\\.)*)"/) ||
      block.match(/\benglish:\s*'((?:[^'\\]|\\.)*)'/);
    if (!idM || !enM) continue;
    out.push({ lesson: Number(lessonNum), id: idM[1], en: enM[1].replace(/\\'/g, "'").replace(/\\"/g, '"') });
  }
}

fs.writeFileSync(join(__dirname, 'lesson-25-32-phrases-en.json'), JSON.stringify(out, null, 2), 'utf8');
console.error('wrote', out.length, 'rows');
