/**
 * Дедупликация, проверка correct ∈ options, фиксированное перемешивание вариантов.
 * Источник: scripts/a2_seed.json → assets/arena_questions_a2.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[`'']/g, "'")
    .replace(/[?.!,:;]/g, '')
    .trim();
}

/** Стабильное [0,1) для Firestore-индекса (level + rand) */
function randFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}
function shuffleOptions(opts, seedStr) {
  const a = [...opts];
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    const j = (h >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const seedPath = path.join(__dirname, 'a2_seed.json');
const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
if (!Array.isArray(raw)) {
  console.error('a2_seed.json must be a JSON array');
  process.exit(1);
}

const seen = new Set();
const out = [];
let skipped = 0;

for (const q of raw) {
  const k = norm(q.question);
  if (!k) {
    skipped++;
    continue;
  }
  if (seen.has(k)) {
    skipped++;
    continue;
  }
  seen.add(k);
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    console.error('skip bad options:', q.question?.slice(0, 60));
    skipped++;
    continue;
  }
  if (!q.options.includes(q.correct)) {
    console.error('skip correct not in options:', q.question?.slice(0, 60));
    skipped++;
    continue;
  }
  const options = shuffleOptions(q.options, k);
  out.push({
    id: `a2_${String(out.length + 1).padStart(3, '0')}`,
    level: 'A2',
    rand: randFromId(`a2_${norm(k)}`),
    type: q.type,
    task: q.task ?? '',
    question: q.question,
    options,
    correct: q.correct,
    rule: q.rule ?? '',
  });
}

const outPath = path.join(root, 'assets', 'arena_questions_a2.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Written', outPath, 'count=', out.length, 'skipped_dup_or_invalid=', skipped);
