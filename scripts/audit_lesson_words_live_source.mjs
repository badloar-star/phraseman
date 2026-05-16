import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LESSON_WORDS = path.join(ROOT, 'app', 'lesson_words.tsx');
const PHRASE_DUMP = path.join(ROOT, 'exports', 'lesson-theory-dump', 'lesson_phrases.json');

const FUNCTION_WORDS = new Set([
  'a', 'an', 'the',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'as',
  'at', 'before', 'behind', 'below', 'between', 'by', 'down', 'during', 'for',
  'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto',
  'out', 'outside', 'over', 'through', 'to', 'under', 'until', 'up', 'with', 'without',
  'and', 'but', 'because', 'if', 'when', 'while',
]);

const GRAMMAR_CHUNKS = [
  'there is', 'there are', 'is there', 'are there',
  'have to', 'has to', 'had to', 'do not have to', 'does not have to', "don't have to",
  'need to', 'needs to', 'used to', 'did not use to', "didn't use to", 'going to',
  'able to', 'because of', 'instead of', 'as soon as', 'in order to',
  'look forward to', 'take care of',
];

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseObjectKeys(src, objectName) {
  const start = src.indexOf(`const ${objectName}:`);
  if (start < 0) throw new Error(`${objectName} not found`);
  const bodyStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) {
      const body = src.slice(bodyStart + 1, i);
      const keys = new Set();
      const re = /^\s*(?:(['"])(.*?)\1|([a-zA-Z_$][\w$]*))\s*:/gm;
      let m;
      while ((m = re.exec(body))) keys.add(m[2] ?? m[3]);
      return keys;
    }
  }
  throw new Error(`${objectName} object is not closed`);
}

function main() {
  const src = fs.readFileSync(LESSON_WORDS, 'utf8');
  const phraseDump = JSON.parse(fs.readFileSync(PHRASE_DUMP, 'utf8')).phrasesByLessonId ?? {};
  const liveFunctionKeys = parseObjectKeys(src, 'FUNCTION_WORDS');
  const liveChunkKeys = parseObjectKeys(src, 'GRAMMAR_CHUNKS');

  const issues = [];

  for (const word of FUNCTION_WORDS) {
    if (!liveFunctionKeys.has(word)) issues.push(`FUNCTION_WORDS missing key: ${word}`);
  }
  for (const chunk of GRAMMAR_CHUNKS) {
    if (!liveChunkKeys.has(chunk)) issues.push(`GRAMMAR_CHUNKS missing key: ${chunk}`);
  }

  for (const [lessonId, phrases] of Object.entries(phraseDump)) {
    for (const phrase of phrases) {
      const text = normalizeText(phrase.english);
      if (!text) continue;
      const padded = ` ${text} `;
      for (const token of text.split(' ')) {
        if (FUNCTION_WORDS.has(token) && !liveFunctionKeys.has(token)) {
          issues.push(`L${lessonId} ${phrase.id}: function word not covered: ${token}`);
        }
      }
      for (const chunk of GRAMMAR_CHUNKS) {
        if (padded.includes(` ${chunk} `) && !liveChunkKeys.has(chunk)) {
          issues.push(`L${lessonId} ${phrase.id}: grammar chunk not covered: ${chunk}`);
        }
      }
    }
  }

  const staleRefs = [];
  for (const rel of ['app', 'tools', 'scripts', 'tests']) {
    const root = path.join(ROOT, rel);
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (p === LESSON_WORDS || p === fileURLToPath(import.meta.url)) continue;
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          stack.push(p);
          continue;
        }
        if (!/\.(ts|tsx|mjs|js|py|md)$/.test(entry.name)) continue;
        const text = fs.readFileSync(p, 'utf8');
        if (/LESSON_\d+_VOCABULARY|LESSON_VOCABULARIES/.test(text)) {
          staleRefs.push(path.relative(ROOT, p));
        }
      }
    }
  }

  if (staleRefs.length) {
    issues.push(`stale vocabulary refs: ${[...new Set(staleRefs)].sort().join(', ')}`);
  }

  if (issues.length) {
    console.log('=== live lesson_words source audit ===');
    for (const issue of issues) console.log(`- ${issue}`);
    process.exit(1);
  }

  console.log('OK: live lesson_words source covers function words/chunks and has no stale vocabulary refs.');
}

main();
