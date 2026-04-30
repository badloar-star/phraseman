/**
 * Fills Spanish gloss map for vocabulary entries in app/lesson_words.tsx that omit inline `es:`.
 * Uses undocumented Google Translate gtx helper (same pattern as browser widget).
 *
 * Usage: node scripts/generate-lesson-word-es-google.mjs
 *
 * Generates: app/lesson_words_es_by_en.generated.ts (gitignored optional) — we write stable app path below.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'app', 'lesson_words.tsx');
const OUT = path.join(ROOT, 'app', 'lesson_words_es_by_en.ts');

const LINE_RE =
  /^\s*\{ en: '((?:\\.|[^'\\])*)',\s*ru: '((?:\\.|[^'\\])*)',\s*uk: '((?:\\.|[^'\\])*)'(?:,\s*es: '((?:\\.|[^'\\])*)')?\s*,\s*pos:/;

function unquote(str) {
  return str.replace(/\\(.)/g, '$1');
}

async function gtxTranslateEnToEs(query) {
  const u = new URL('https://translate.googleapis.com/translate_a/single');
  u.searchParams.set('client', 'gtx');
  u.searchParams.set('sl', 'en');
  u.searchParams.set('tl', 'es');
  u.searchParams.set('dt', 't');
  u.searchParams.set('q', query);
  const res = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 PhrasemanLessonWordsES/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const chunk = json?.[0]?.[0]?.[0];
  if (typeof chunk !== 'string' || !chunk.trim()) throw new Error(`Bad response for ${JSON.stringify(query)}`);
  return chunk.trim();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function collectMissingEn() {
  const s = fs.readFileSync(SRC, 'utf8');
  /** @type {Map<string, string>} en -> first ru (for comments / debugging) */
  const out = new Map();
  for (const line of s.split('\n')) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const en = unquote(m[1]);
    if (m[4]) continue;
    if (!out.has(en)) out.set(en, unquote(m[2]));
  }
  return out;
}

async function main() {
  const missing = collectMissingEn();
  const keys = [...missing.keys()].sort((a, b) => a.localeCompare(b, 'en'));
  console.log(`Translating ${keys.length} unique English keys missing inline es…`);
  const translated = {};
  let i = 0;
  for (const en of keys) {
    try {
      translated[en] = await gtxTranslateEnToEs(en);
    } catch (e) {
      console.error(`FAIL ${en}:`, e.message);
      process.exitCode = 1;
      return;
    }
    i++;
    if (i % 50 === 0) console.log(`… ${i}/${keys.length}`);
    await sleep(110);
  }

  const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const body = keys.map(k => `  '${esc(k)}': '${esc(translated[k])}',`).join('\n');
  const hdr = `/**\n * AUTO-GENERATED FILE — do not edit by hand.\n * Regenerate: node scripts/generate-lesson-word-es-google.mjs\n * Source: ${path.relative(ROOT, SRC)}\n */\nexport const LESSON_WORD_ES_BY_EN: Record<string, string> = {\n`;
  fs.writeFileSync(OUT, `${hdr}${body}\n};\n`, 'utf8');
  console.log(`Wrote ${OUT} (${keys.length} entries)`);
}

main();
