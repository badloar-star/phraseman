import fs from 'fs';

const LESSON_WORDS = 'app/lesson_words.tsx';
const MANUAL_MAP = 'app/lesson_words_es_map.ts';
const GENERATED_MAP = 'app/lesson_words_es_by_en.ts';

const LINE_RE =
  /^\s*\{ en: '((?:\\.|[^'\\])*)',\s*ru: '((?:\\.|[^'\\])*)',\s*uk: '((?:\\.|[^'\\])*)'(?:,\s*es: '((?:\\.|[^'\\])*)')?\s*,\s*pos:/;

function unquote(str) {
  return str.replace(/\\(.)/g, '$1');
}

function loadMapKeys(path) {
  const src = fs.readFileSync(path, 'utf8');
  const keys = new Set();
  for (const m of src.matchAll(/\n\s*('(?:[^'\\]|\\.)*'|[A-Za-z0-9_-]+)\s*:/g)) {
    let key = m[1];
    if (key.startsWith("'")) key = key.slice(1, -1).replace(/\\'/g, "'");
    keys.add(key);
  }
  return keys;
}

const manualKeys = loadMapKeys(MANUAL_MAP);
const generatedKeys = loadMapKeys(GENERATED_MAP);
const covered = new Set([...manualKeys, ...generatedKeys]);
const rows = [];
const missing = [];

for (const line of fs.readFileSync(LESSON_WORDS, 'utf8').split('\n')) {
  const m = line.match(LINE_RE);
  if (!m) continue;
  const en = unquote(m[1]);
  const inlineEs = m[4] ? unquote(m[4]) : '';
  rows.push(en);
  if (inlineEs.trim()) continue;
  if (covered.has(en)) continue;
  missing.push(en);
}

const uniqueRows = [...new Set(rows)];
const uniqueMissing = [...new Set(missing)].sort((a, b) => a.localeCompare(b, 'en'));
console.log(
  `lesson words: ${rows.length} rows, ${uniqueRows.length} unique EN, manual keys: ${manualKeys.size}, generated keys: ${generatedKeys.size}, missing ES gloss: ${uniqueMissing.length}`,
);
if (uniqueMissing.length <= 40) console.log('missing:', uniqueMissing.join(', '));
else console.log('first 25 missing:', uniqueMissing.slice(0, 25).join(', '));
