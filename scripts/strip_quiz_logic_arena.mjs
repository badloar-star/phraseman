/**
 * Удаляет type === 'quiz_logic' из A1 JSON, из a2_seed.json; перенумеровывает a1 id; пересобирает A2.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function stripA1() {
  const p = path.join(root, 'assets', 'arena_questions_a1.json');
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  const f = arr.filter((q) => q.type !== 'quiz_logic');
  const out = f.map((q, i) => ({
    ...q,
    id: `a1_${String(i + 1).padStart(3, '0')}`,
  }));
  fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('a1:', arr.length, '->', out.length, '(−' + (arr.length - out.length) + ')');
}

function stripA2Seed() {
  const p = path.join(__dirname, 'a2_seed.json');
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  const f = arr.filter((q) => q.type !== 'quiz_logic');
  fs.writeFileSync(p, JSON.stringify(f, null, 2) + '\n', 'utf8');
  console.log('a2_seed:', arr.length, '->', f.length, '(−' + (arr.length - f.length) + ')');
}

stripA1();
stripA2Seed();
const r = spawnSync(process.execPath, ['scripts/build_arena_a2.mjs'], { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
