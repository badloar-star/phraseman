/**
 * Heuristic audit: LessonPhrase objects in app/lesson_data_*.ts missing `spanish:` before `words:`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'app');
const files = fs
  .readdirSync(appDir)
  .filter((f) => /^lesson_data_\d+_\d+\.ts$/.test(f))
  .map((f) => path.join(appDir, f));

const missing = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  // Split by phrase id pattern
  const re = /\{\s*\n\s*id:\s*['"]([^'"]+)['"]/g;
  let m;
  const starts = [];
  while ((m = re.exec(text)) !== null) {
    starts.push({ id: m[1], index: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    if (!chunk.includes('words:')) continue;
    if (!/\bspanish\s*:/.test(chunk)) {
      missing.push({ file: path.basename(file), id: starts[i].id });
    }
  }
}

missing.sort((a, b) => a.file.localeCompare(b.file) || a.id.localeCompare(b.id));
console.log(JSON.stringify({ totalMissing: missing.length, samples: missing.slice(0, 50), byFile: countByFile(missing) }, null, 2));

function countByFile(rows) {
  const o = {};
  for (const r of rows) {
    o[r.file] = (o[r.file] || 0) + 1;
  }
  return o;
}
