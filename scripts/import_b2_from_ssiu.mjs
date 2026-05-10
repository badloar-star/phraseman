/**
 * Импорт B2 из SSIU/ARENA B2 МАССИВЫ 1.txt → scripts/b2_seed.json + build_arena_b2.mjs
 * Логика как import_b1_from_ssiu.mjs (массивы JSON, префиксы A–D, / → ·, без quiz_logic).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const EXPECT_LEVEL = 'B2';

const ALLOWED = new Set([
  'fill_blank',
  'complete_phrasal',
  'find_error',
  'translate_meaning',
  'choose_phrasal',
]);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[`'']/g, "'")
    .replace(/[?.!,:;]/g, '')
    .trim();
}

function normSpaces(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripChoicePrefix(s) {
  let t = normSpaces(s);
  t = t.replace(/^\(?[A-Da-d]\)?[.)]\s+/, '');
  return normSpaces(t);
}

function normSlashesToDot(s) {
  return String(s || '').replace(/\s*\/\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}

function leadingSegment(s) {
  const parts = normSlashesToDot(s).split('·');
  return parts[0].trim().toLowerCase();
}

function extractJsonArrays(text) {
  const items = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('[', i);
    if (start < 0) break;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let j = start;
    for (; j < text.length; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') {
        inStr = true;
        continue;
      }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) {
          const slice = text.slice(start, j + 1);
          try {
            const parsed = JSON.parse(slice);
            if (Array.isArray(parsed)) {
              for (const el of parsed) items.push(el);
            }
          } catch {
            /* битый блок */
          }
          i = j + 1;
          break;
        }
      }
    }
    if (j >= text.length && depth !== 0) {
      i = start + 1;
    }
  }
  return items;
}

function loadAllRaw() {
  const p = path.join(root, 'SSIU', 'ARENA B2 МАССИВЫ 1.txt');
  if (!fs.existsSync(p)) {
    console.error('Missing', p);
    return [];
  }
  return extractJsonArrays(fs.readFileSync(p, 'utf8'));
}

function alignCorrect(type, options, correctRaw) {
  const c = normSlashesToDot(stripChoicePrefix(String(correctRaw)));
  if (options.includes(c)) return { correct: c, ok: true };

  if (type === 'translate_meaning') {
    const lead = leadingSegment(c);
    if (lead) {
      const cands = options.filter((o) => leadingSegment(o) === lead);
      if (cands.length === 1) return { correct: cands[0], ok: true };
    }
  }

  return { correct: c, ok: false };
}

function toSeedItem(raw, stats) {
  if (raw == null || typeof raw !== 'object') {
    stats.dropBad++;
    return null;
  }
  if (Array.isArray(raw)) {
    stats.dropNested++;
    return null;
  }
  if (String(raw.level || '').toUpperCase().replace(/\s/g, '') !== EXPECT_LEVEL) {
    stats.dropLevel++;
    return null;
  }
  const type = raw.type;
  if (type === 'quiz_logic') {
    stats.dropQuiz++;
    return null;
  }
  if (!ALLOWED.has(type)) {
    stats.dropType++;
    return null;
  }

  const questionRaw = raw.question;
  if (typeof questionRaw !== 'string' || questionRaw.trim().length < 8) {
    stats.dropQuestion++;
    return null;
  }
  const question = normSpaces(questionRaw.replace(/\n+/g, ' '));

  if (!Array.isArray(raw.options) || raw.options.length !== 4) {
    stats.dropOptions++;
    return null;
  }

  const options = raw.options.map((o) => normSlashesToDot(stripChoicePrefix(String(o))));
  if (options.some((o) => !o)) {
    stats.dropEmptyOption++;
    return null;
  }
  if (new Set(options).size !== 4) {
    stats.dropDupOption++;
    return null;
  }

  const { correct, ok } = alignCorrect(type, options, raw.correct);
  if (!ok || !options.includes(correct)) {
    stats.dropCorrect++;
    return null;
  }

  if (type === 'fill_blank' || type === 'complete_phrasal') {
    if (!question.includes('___') && !question.includes('…')) {
      stats.dropNoGap++;
      return null;
    }
  }

  let rule = typeof raw.rule === 'string' ? normSlashesToDot(raw.rule) : '';
  let task = typeof raw.task === 'string' ? normSlashesToDot(raw.task) : '';

  return {
    type,
    task,
    question,
    options,
    correct,
    rule,
  };
}

const stats = {
  rawObjects: 0,
  dropBad: 0,
  dropNested: 0,
  dropLevel: 0,
  dropQuiz: 0,
  dropType: 0,
  dropQuestion: 0,
  dropOptions: 0,
  dropEmptyOption: 0,
  dropDupOption: 0,
  dropCorrect: 0,
  dropNoGap: 0,
  dropDedupe: 0,
  kept: 0,
};

const rawList = loadAllRaw();
stats.rawObjects = rawList.length;

const seen = new Set();
const seed = [];

for (const raw of rawList) {
  const q = toSeedItem(raw, stats);
  if (!q) continue;

  const optKey = [...q.options].map((o) => norm(o)).sort().join('|');
  const k = `${norm(q.question)}||${optKey}`;
  if (seen.has(k)) {
    stats.dropDedupe++;
    continue;
  }
  seen.add(k);
  seed.push(q);
  stats.kept++;
}

stats.dropTotal =
  stats.dropBad +
  stats.dropNested +
  stats.dropLevel +
  stats.dropQuiz +
  stats.dropType +
  stats.dropQuestion +
  stats.dropOptions +
  stats.dropEmptyOption +
  stats.dropDupOption +
  stats.dropCorrect +
  stats.dropNoGap +
  stats.dropDedupe;

const seedPath = path.join(__dirname, 'b2_seed.json');
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');

console.log(
  JSON.stringify(
    {
      seedPath,
      parsedFlat: stats.rawObjects,
      kept: stats.kept,
      ...stats,
    },
    null,
    2,
  ),
);

const r = spawnSync(process.execPath, [path.join(__dirname, 'build_arena_b2.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
