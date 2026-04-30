import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SPANISH_LINES } from './lesson-17-24-spanish-lines.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const phrases = JSON.parse(fs.readFileSync(join(__dirname, '..', 'phrases-export.json'), 'utf8'));
if (SPANISH_LINES.length !== 400) {
  console.error('Expected 400 lines, got', SPANISH_LINES.length);
  process.exit(1);
}
const obj = {};
phrases.forEach((p, i) => {
  obj[p.id] = SPANISH_LINES[i];
});
fs.writeFileSync(join(__dirname, 'lesson-17-24-spanish.json'), JSON.stringify(obj, null, 2), 'utf8');
console.error('wrote', Object.keys(obj).length, 'keys');
