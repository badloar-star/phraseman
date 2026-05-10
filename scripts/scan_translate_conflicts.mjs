import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function normQ(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['’]/g, "'")
    .trim();
}

for (const rel of ['assets/arena_questions_a1.json', 'assets/arena_questions_a2.json', 'assets/arena_questions_b1.json', 'assets/arena_questions_b2.json']) {
  const j = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const by = new Map();
  for (const q of j) {
    if (q.type !== 'translate_meaning') continue;
    const k = normQ(q.question);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push({ id: q.id, correct: q.correct, opts: q.options });
  }
  const conflicts = [...by.entries()].filter(([, arr]) => {
    const cs = new Set(arr.map((x) => x.correct));
    return cs.size > 1;
  });
  if (conflicts.length) {
    console.log('\n', rel, 'translate_meaning conflicts:', conflicts.length);
    for (const [k, arr] of conflicts.slice(0, 15)) {
      console.log(' Q:', k.slice(0, 70));
      for (const x of arr) console.log('  ', x.id, '=>', x.correct);
    }
  }
}
