/**
 * Removes LESSON_*_INTRO_SCREENS arrays from lesson_data_1_8.ts and adds re-export from lesson_intro_screens_es_l2.ts
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '..', 'app', 'lesson_data_1_8.ts');
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const out = [];
let skipping = false;
let bracket = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^export const LESSON_\d+_INTRO_SCREENS/.test(line)) {
    skipping = true;
    bracket = 0;
    for (const ch of line) {
      if (ch === '[') bracket++;
      if (ch === ']') bracket--;
    }
    continue;
  }
  if (skipping) {
    for (const ch of line) {
      if (ch === '[') bracket++;
      if (ch === ']') bracket--;
    }
    if (bracket <= 0 && line.trim() === '];') {
      skipping = false;
    }
    continue;
  }
  out.push(line);
}

const importIdx = out.findIndex(
  (l) => l.includes("from './lesson_data_types'") || l.includes('from "./lesson_data_types"'),
);
if (importIdx < 0) throw new Error('import lesson_data_types not found');

const exportBlock = `
export {
  LESSON_1_INTRO_SCREENS,
  LESSON_2_INTRO_SCREENS,
  LESSON_3_INTRO_SCREENS,
  LESSON_4_INTRO_SCREENS,
  LESSON_5_INTRO_SCREENS,
  LESSON_6_INTRO_SCREENS,
  LESSON_7_INTRO_SCREENS,
  LESSON_8_INTRO_SCREENS,
} from './lesson_intro_screens_es_l2';
`.trim();

out.splice(importIdx + 1, 0, '', exportBlock);

fs.writeFileSync(path, out.join('\n'), 'utf8');
console.log('Patched', path);
