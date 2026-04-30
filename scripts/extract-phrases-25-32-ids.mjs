/**
 * Prints phrase ids in file order from lesson_data_25_32.ts (for Spanish JSON keys).
 * Run: node scripts/extract-phrases-25-32-ids.mjs
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ts = fs.readFileSync(join(__dirname, '..', 'app', 'lesson_data_25_32.ts'), 'utf8');

const ids = [];
for (const m of ts.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)) {
  ids.push(m[1]);
}

console.log(JSON.stringify(ids, null, 0));
console.error('count', ids.length);
