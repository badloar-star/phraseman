/**
 * Экспорт банка арены в Markdown-батчи для ручной проверки в ИИ (грамматика, ключ, калька).
 *
 *   node scripts/export_arena_llm_review.mjs
 *   node scripts/export_arena_llm_review.mjs --level a2
 *   node scripts/export_arena_llm_review.mjs --level all --batch 12 --out review/arena_llm
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

const levelArg = (argVal('--level', 'all') || 'all').toLowerCase();
const batchSize = Math.max(1, parseInt(argVal('--batch', '15'), 10) || 15);
const outDir = path.resolve(root, argVal('--out', path.join('review', 'arena_llm')));

const FILES = {
  a1: path.join(root, 'assets', 'arena_questions_a1.json'),
  a2: path.join(root, 'assets', 'arena_questions_a2.json'),
  b1: path.join(root, 'assets', 'arena_questions_b1.json'),
  b2: path.join(root, 'assets', 'arena_questions_b2.json'),
};

function load(level) {
  const p = FILES[level];
  if (!p || !fs.existsSync(p)) return [];
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  return rows.map((q) => ({ ...q, _pool: level.toUpperCase() }));
}

let all = [];
if (levelArg === 'all') {
  all = [...load('a1'), ...load('a2'), ...load('b1'), ...load('b2')];
} else if (FILES[levelArg]) {
  all = load(levelArg);
} else {
  console.error('Unknown --level. Use: a1 | a2 | b1 | b2 | all');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const preamble = `# Батч проверки банка арены (${stamp})

Для каждого вопроса внизу смотри блок: сначала **что проверить**, потом данные карточки.
Скопируй один или несколько блоков в чат с ИИ вместе с промптом из \`scripts/ARENA_LLM_REVIEW_PROMPT_RU.md\`.

---

`;

let fileIdx = 0;
let buf = preamble;
let nInFile = 0;

function flush() {
  if (nInFile === 0) return;
  fileIdx++;
  const name = `arena_review_${levelArg.replace(/[^a-z0-9]/gi, '_')}_${String(fileIdx).padStart(3, '0')}.md`;
  fs.writeFileSync(path.join(outDir, name), buf, 'utf8');
  buf = preamble;
  nInFile = 0;
}

for (let i = 0; i < all.length; i++) {
  const q = all[i];
  if (nInFile >= batchSize) flush();

  const opts = q.options.map((o, j) => `${j + 1}. ${o}`).join('\n');

  buf += `### ${q.id} · пул ${q._pool} · тип \`${q.type}\`

**Проверь:** грамматику английского в вопросе и во всех вариантах; что ровно один вариант однозначно верен; для «найди ошибку» — что помеченный \`correct\` действительно единственный с ошибкой; для перевода значения / двуязычных строк — нет кальки и нет взаимозаменяемых «верных» формулировок; правило (rule) не врёт.

**Вопрос:** ${q.question}

**Варианты:**  
${opts}

**В банке отмечено верным:** \`${q.correct}\`

**Подсказка rule:** ${q.rule || '—'}

**task:** ${q.task || '—'}

---

`;
  nInFile++;
}

flush();

console.log(
  JSON.stringify(
    {
      outDir,
      level: levelArg,
      totalCards: all.length,
      batchSize,
      filesWritten: fileIdx,
    },
    null,
    2,
  ),
);
