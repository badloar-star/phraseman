/**
 * Одноразовый импорт: SSIU/ARENA B2 GPT.txt (+ опционально - 2.txt) → дополняет scripts/a2_seed.json
 * Удаляет дубли по question (нормализация как в build_arena_a2.mjs), отбрасывает битые карточки.
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

function normTask(t) {
  return String(t || '')
    .replace(/\s*\/\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TYPES = new Set([
  'fill_blank',
  'complete_phrasal',
  'find_error',
  'translate_meaning',
  'choose_phrasal',
]);

/** Карточки с заведомо кривой постановкой — не импортировать */
function isBlocked(q) {
  const nq = norm(q.question);
  // "break ___ his leg" с ответом «без частицы» — неверная логика phrasal
  if (nq.includes('broke') && nq.includes('leg') && q.options?.includes('-')) return true;
  return false;
}

function parseConcatenatedJsonArrays(text) {
  const chunks = text.split(/\]\s*\n\s*\[/g);
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    let s = chunks[i].trim();
    if (!s) continue;
    if (i > 0) s = '[' + s;
    if (i < chunks.length - 1) s = s + ']';
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) out.push(...arr);
    } catch {
      // one array whole file
    }
  }
  if (out.length === 0 && text.trim().startsWith('[')) {
    try {
      return JSON.parse(text.trim());
    } catch {
      return [];
    }
  }
  return out;
}

function loadQuestionsFromFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const cut = raw.indexOf('\nНет.');
  const jsonPart = cut >= 0 ? raw.slice(0, cut) : raw;
  let items = parseConcatenatedJsonArrays(jsonPart.trim());
  if (!Array.isArray(items) || items.length === 0) {
    try {
      items = JSON.parse(jsonPart.trim());
    } catch {
      items = [];
    }
  }
  return items;
}

function toSeedShape(q) {
  const type = q.type;
  if (!TYPES.has(type)) return null;
  if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) return null;
  if (!q.options.includes(q.correct)) return null;
  if (isBlocked(q)) return null;

  let rule = String(q.rule ?? '').trim();
  rule = rule.replace(/\s*\/\s*/g, ' · ');

  return {
    type,
    task: normTask(q.task),
    question: String(q.question).trim(),
    options: q.options.map((o) => String(o).trim()),
    correct: String(q.correct).trim(),
    rule,
  };
}

const gptMain = path.join(root, 'SSIU', 'ARENA B2 GPT.txt');
const gpt2 = path.join(root, 'SSIU', 'ARENA B2 GPT - 2.txt');
const seedPath = path.join(__dirname, 'a2_seed.json');

const existing = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
function dedupeKey(q) {
  const base = norm(q.question);
  const optKey = Array.isArray(q.options)
    ? [...q.options].map((o) => norm(o)).sort().join('|')
    : '';
  return `${base}||${optKey}`;
}
const seen = new Set(existing.map(dedupeKey));

const fromFiles = [];
if (fs.existsSync(gptMain)) fromFiles.push(...loadQuestionsFromFile(gptMain));
if (fs.existsSync(gpt2)) fromFiles.push(...loadQuestionsFromFile(gpt2));

let added = 0;
let skippedDup = 0;
let skippedBad = 0;

const merged = [...existing];

for (const q of fromFiles) {
  const s = toSeedShape(q);
  if (!s) {
    skippedBad++;
    continue;
  }
  if (!norm(s.question)) {
    skippedBad++;
    continue;
  }
  const k = dedupeKey(s);
  if (seen.has(k)) {
    skippedDup++;
    continue;
  }
  seen.add(k);
  merged.push(s);
  added++;
}

fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(
  JSON.stringify({
    seedTotal: merged.length,
    added,
    skippedDup,
    skippedBad,
    sources: [gptMain, gpt2].filter((p) => fs.existsSync(p)),
  }),
);
