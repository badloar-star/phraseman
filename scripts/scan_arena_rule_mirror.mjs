/**
 * Правила вида "текст · текст" где обе половины совпадают (калька/забыли перевести UK).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function halves(s) {
  const t = String(s || '');
  const i = t.indexOf('·');
  if (i < 0) return null;
  const a = t.slice(0, i).trim();
  const b = t.slice(i + 1).trim();
  return { a, b };
}

function scanFile(rel) {
  const arr = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  let n = 0;
  for (const q of arr) {
    const r = q.rule;
    if (!r || typeof r !== 'string') continue;
    const h = halves(r);
    if (!h) continue;
    if (h.a && h.b && h.a === h.b) {
      n++;
      if (n <= 50) console.log(q.id, (q.question || '').slice(0, 55), '|', r.slice(0, 100));
    }
  }
  console.log(rel, 'mirrored_rules', n, '\n');
}

for (const rel of [
  'assets/arena_questions_a1.json',
  'assets/arena_questions_a2.json',
  'assets/arena_questions_b1.json',
  'assets/arena_questions_b2.json',
]) {
  scanFile(rel);
}
