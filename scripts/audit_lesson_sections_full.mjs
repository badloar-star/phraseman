import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DATA_FILES = [
  path.join(ROOT, 'app', 'lesson_data_1_8_phrases_es.gen.ts'),
  path.join(ROOT, 'app', 'lesson_data_1_8.ts'),
  path.join(ROOT, 'app', 'lesson_data_9_16_phrases_es.gen.ts'),
  path.join(ROOT, 'app', 'lesson_data_9_16.ts'),
  path.join(ROOT, 'app', 'lesson_data_17_24.ts'),
  path.join(ROOT, 'app', 'lesson_data_25_32.ts'),
];
const LEGACY_DATA_FILES = [
  path.join(ROOT, 'app', 'lesson_data_1_8.ts'),
  path.join(ROOT, 'app', 'lesson_data_9_16.ts'),
  path.join(ROOT, 'app', 'lesson_data_17_24.ts'),
  path.join(ROOT, 'app', 'lesson_data_25_32.ts'),
];
const LESSON_WORDS = path.join(ROOT, 'app', 'lesson_words.tsx');
const IRREGULAR = path.join(ROOT, 'app', 'irregular_verbs_data.ts');
const PREPOSITIONS = path.join(ROOT, 'app', 'lesson_prepositions.ts');
const MENU = path.join(ROOT, 'app', 'lesson_menu.tsx');
const REPORT = path.join(ROOT, 'tools', 'audit', 'lesson_sections_audit.md');

const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);
const ITEM_CAP = 12;

const PREPOSITION_CATEGORY_ALIASES = new Set([
  'preposition',
  'prepositions',
  'preposicion',
  'preposiciones',
]);

const PREPOSITION_WORDS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beside', 'between', 'by', 'during',
  'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'onto',
  'opposite', 'out', 'outside', 'over', 'through', 'to', 'toward', 'towards',
  'under', 'until', 'up', 'with', 'without',
]);
const COMPOUND_PREPOSITIONS = ['in front of', 'next to', 'because of', 'instead of'];
const PARTICLE_WORDS = new Set(['away', 'back', 'off', 'out', 'up', 'down']);
const PRONOUNS = new Set(['it', 'me', 'you', 'him', 'her', 'us', 'them']);
const COMMON_BASE_VERBS = new Set([
  'answer', 'ask', 'be', 'bring', 'buy', 'call', 'change', 'check', 'choose',
  'clean', 'come', 'cook', 'do', 'drink', 'drive', 'eat', 'feel', 'find',
  'finish', 'fix', 'forget', 'get', 'give', 'go', 'have', 'hear', 'help',
  'keep', 'know', 'learn', 'leave', 'listen', 'look', 'make', 'meet', 'need',
  'open', 'order', 'pay', 'put', 'read', 'remember', 'repair', 'rest', 'save',
  'say', 'see', 'sell', 'send', 'show', 'sleep', 'speak', 'start', 'stay',
  'take', 'talk', 'tell', 'try', 'understand', 'use', 'wait', 'wake', 'want',
  'wear', 'work', 'write',
]);
const INFINITIVE_TO_PREV = new Set([
  'able', 'afford', 'agree', 'ask', 'decide', 'expect', 'forget', 'going',
  'have', 'has', 'had', 'help', 'hope', 'learn', 'like', 'likes', 'liked',
  'need', 'needs', 'needed', 'plan', 'plans', 'planned', 'remember', 'try',
  'tries', 'tried', 'trying', 'use', 'used', 'want', 'wants', 'wanted', 'would',
]);
const MOVEMENT_OR_TRANSFER_PREV = new Set([
  'bring', 'brings', 'brought', 'come', 'comes', 'came', 'deliver', 'delivers',
  'delivered', 'drive', 'drives', 'drove', 'driven', 'get', 'gets', 'got',
  'give', 'gives', 'gave', 'go', 'goes', 'went', 'gone', 'move', 'moves',
  'moved', 'pass', 'passes', 'passed', 'return', 'returns', 'returned', 'send',
  'sends', 'sent', 'show', 'shows', 'showed', 'take', 'takes', 'took', 'taken',
  'travel', 'travels', 'traveled', 'travelled', 'walk', 'walks', 'walked',
]);
const DESTINATION_NOUNS = new Set([
  'airport', 'bank', 'bed', 'class', 'doctor', 'home', 'hospital', 'meeting',
  'office', 'park', 'school', 'shop', 'station', 'store', 'university', 'work',
]);
const TIME_FOLLOWERS = new Set([
  'today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'night',
  'noon', 'midnight', 'hour', 'hours', 'minute', 'minutes', 'week', 'month',
  'year', 'this', 'last', 'next', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten',
]);

const AUXILIARY_IRREGULARS = new Set([
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'done', 'doing',
  'have', 'has', 'had', 'having',
]);
const KEEP_VERB_SURFACE_FORMS = new Set(['is', 'does', 'has', 'was']);
const IRREGULAR_SURFACE_TO_BASE = new Map(Object.entries({
  went: 'go',
  gone: 'go',
  left: 'leave',
  brought: 'bring',
  got: 'get',
  gotten: 'get',
  chose: 'choose',
  chosen: 'choose',
  wrote: 'write',
  written: 'write',
  saw: 'see',
  seen: 'see',
  said: 'say',
  gave: 'give',
  given: 'give',
  woke: 'wake',
  woken: 'wake',
  sat: 'sit',
  slept: 'sleep',
  ran: 'run',
  did: 'do',
  done: 'do',
  forgot: 'forget',
  forgotten: 'forget',
}));

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’]/g, "'")
    .replace(/\bwi[\s-]?fi\b/g, 'wifi')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategory(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isPrepositionCategory(category) {
  return PREPOSITION_CATEGORY_ALIASES.has(normalizeCategory(category));
}

function isVerbCategory(category) {
  const c = normalizeCategory(category);
  return c === 'verb'
    || c === 'verbo'
    || c === 'verbs'
    || c === 'irregular_verbs'
    || c === 'to-be'
    || c === 'modal'
    || c === 'imperativo'
    || c === 'exhortativo'
    || c.startsWith('verbo');
}

function findMatching(src, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`No matching ${closeChar} for ${openChar} at ${openIndex}`);
}

function readStringAt(src, quoteIndex) {
  const quote = src[quoteIndex];
  let value = '';
  let escape = false;
  for (let i = quoteIndex + 1; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      value += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === quote) return { value, end: i };
    value += ch;
  }
  throw new Error(`Unclosed string at ${quoteIndex}`);
}

function readStringProp(obj, prop) {
  const re = new RegExp(`\\b${prop}\\s*:\\s*(['"\`])`);
  const m = re.exec(obj);
  if (!m) return '';
  const quoteIndex = m.index + m[0].length - 1;
  return readStringAt(obj, quoteIndex).value;
}

function extractArrayProp(obj, prop) {
  const re = new RegExp(`\\b${prop}\\s*:\\s*\\[`);
  const m = re.exec(obj);
  if (!m) return null;
  const open = m.index + m[0].lastIndexOf('[');
  const close = findMatching(obj, open, '[', ']');
  return obj.slice(open + 1, close);
}

function splitTopLevelObjects(body) {
  const out = [];
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const next = body[i + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      const close = findMatching(body, i, '{', '}');
      out.push(body.slice(i, close + 1));
      i = close;
    }
  }
  return out;
}

function extractConstObject(src, constName) {
  const marker = constName;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`${constName} not found`);
  const open = src.indexOf('{', start);
  const close = findMatching(src, open, '{', '}');
  return src.slice(open + 1, close);
}

function parseLessonArraysFromObject(body) {
  const result = new Map();
  const re = /(?:^|[\n\r])\s*(\d+):\s*\[/g;
  let m;
  while ((m = re.exec(body))) {
    const id = Number(m[1]);
    const open = m.index + m[0].lastIndexOf('[');
    const close = findMatching(body, open, '[', ']');
    result.set(id, body.slice(open + 1, close));
    re.lastIndex = close + 1;
  }
  return result;
}

function parseWordRows(arrayBody) {
  return splitTopLevelObjects(arrayBody).map((obj) => ({
    en: readStringProp(obj, 'en'),
    pos: readStringProp(obj, 'pos'),
  })).filter((row) => row.en);
}

function parseObjectWordMap(body) {
  const result = new Map();
  const re = /(?:^|[,\n\r]\s*)(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|([A-Za-z_$][\w$]*))\s*:\s*\{/g;
  let m;
  while ((m = re.exec(body))) {
    const key = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1');
    const open = m.index + m[0].lastIndexOf('{');
    const close = findMatching(body, open, '{', '}');
    const obj = body.slice(open, close + 1);
    const en = readStringProp(obj, 'en') || key;
    const pos = readStringProp(obj, 'pos');
    result.set(key, { en, pos });
    re.lastIndex = close + 1;
  }
  return result;
}

function parsePhraseData() {
  const result = new Map();
  for (const file of DATA_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /export\s+const\s+LESSON_(\d+)_PHRASES[^=]*=\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
      const lessonId = Number(m[1]);
      const open = m.index + m[0].lastIndexOf('[');
      const close = findMatching(src, open, '[', ']');
      const body = src.slice(open + 1, close);
      const phrases = splitTopLevelObjects(body).map((obj, idx) => {
        const wordsEn = extractArrayProp(obj, 'wordsEn');
        const words = wordsEn ?? extractArrayProp(obj, 'words');
        const slots = words
          ? splitTopLevelObjects(words).map((wordObj) => ({
              text: readStringProp(wordObj, 'text'),
              correct: readStringProp(wordObj, 'correct'),
              category: readStringProp(wordObj, 'category'),
            })).filter((slot) => slot.text || slot.correct)
          : [];
        return {
          idx: idx + 1,
          id: readStringProp(obj, 'id'),
          english: readStringProp(obj, 'english'),
          slots,
        };
      }).filter((phrase) => phrase.english);
      result.set(lessonId, phrases);
      re.lastIndex = close + 1;
    }
  }
  return result;
}

function parseWordsByLesson() {
  const src = fs.readFileSync(LESSON_WORDS, 'utf8');
  const rawBody = extractConstObject(src, 'WORDS_BY_LESSON');
  const raw = new Map();
  for (const [lessonId, body] of parseLessonArraysFromObject(rawBody)) {
    raw.set(lessonId, parseWordRows(body));
  }
  return {
    raw,
    functionWords: parseObjectWordMap(extractConstObject(src, 'FUNCTION_WORDS')),
    grammarChunks: parseObjectWordMap(extractConstObject(src, 'GRAMMAR_CHUNKS')),
  };
}

function parseIrregularByLesson() {
  const src = fs.readFileSync(IRREGULAR, 'utf8');
  if (src.includes('LESSON_IRREGULAR_BASES')) {
    const glossaryBody = extractConstObject(src, 'IRREGULAR_VERB_GLOSSARY');
    const glossary = new Map();
    const rowRe = /(?:^|[,\n\r]\s*)(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|([A-Za-z_$][\w$]*))\s*:\s*\{/g;
    let rowMatch;
    while ((rowMatch = rowRe.exec(glossaryBody))) {
      const key = (rowMatch[1] ?? rowMatch[2] ?? rowMatch[3] ?? '').replace(/\\(.)/g, '$1');
      const open = rowMatch.index + rowMatch[0].lastIndexOf('{');
      const close = findMatching(glossaryBody, open, '{', '}');
      const obj = glossaryBody.slice(open, close + 1);
      glossary.set(key, {
        base: readStringProp(obj, 'base') || key,
        past: readStringProp(obj, 'past'),
        pp: readStringProp(obj, 'pp'),
      });
      rowRe.lastIndex = close + 1;
    }

    const result = new Map();
    const basesBody = extractConstObject(src, 'LESSON_IRREGULAR_BASES');
    for (const [lessonId, arrayBody] of parseLessonArraysFromObject(basesBody)) {
      const bases = [...arrayBody.matchAll(/(['"])((?:\\.|(?!\1).)*?)\1/g)].map((m) => m[2]);
      result.set(lessonId, bases.map((base) => glossary.get(base) ?? { base, past: '', pp: '' }));
    }
    return result;
  }

  const body = extractConstObject(src, 'IRREGULAR_VERBS_BY_LESSON');
  const result = new Map();
  for (const [lessonId, arrayBody] of parseLessonArraysFromObject(body)) {
    const rows = splitTopLevelObjects(arrayBody).map((obj) => ({
      base: readStringProp(obj, 'base'),
      past: readStringProp(obj, 'past'),
      pp: readStringProp(obj, 'pp'),
    })).filter((row) => row.base);
    result.set(lessonId, rows);
  }
  return result;
}

function parseLegacyIrregularArrays() {
  const result = new Map();
  for (const file of LEGACY_DATA_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /export\s+const\s+LESSON_(\d+)_IRREGULAR_VERBS[^=]*=\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
      const lessonId = Number(m[1]);
      const open = m.index + m[0].lastIndexOf('[');
      const close = findMatching(src, open, '[', ']');
      const body = src.slice(open + 1, close);
      const rows = splitTopLevelObjects(body).map((obj) => ({
        base: readStringProp(obj, 'base') || readStringProp(obj, 'english'),
        past: readStringProp(obj, 'past'),
        pp: readStringProp(obj, 'pp') || readStringProp(obj, 'pastParticiple'),
      })).filter((row) => row.base);
      result.set(lessonId, rows);
      re.lastIndex = close + 1;
    }
  }
  return result;
}

function canonicalLemmaNoun(lower) {
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('oes') && lower.length > 4) return lower.slice(0, -1);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function canonicalLemmaVerb(lower, verbLex) {
  if (verbLex.has(lower)) return lower;
  const candidates = [];
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) candidates.push(lower.slice(0, -3) + 'y');
  if (lower.endsWith('es') && lower.length > 4) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) candidates.push(lower.slice(0, -1));
  if (lower.endsWith('ied') && lower.length > 4) candidates.push(lower.slice(0, -3) + 'y');
  if (lower.endsWith('ed') && lower.length > 4) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
    if (lower.length > 5 && lower.at(-3) === lower.at(-4)) candidates.push(lower.slice(0, -3));
  }
  if (lower.endsWith('ing') && lower.length > 5) {
    candidates.push(lower.slice(0, -3));
    candidates.push(lower.slice(0, -3) + 'e');
    if (lower.length > 6 && lower.at(-4) === lower.at(-5)) candidates.push(lower.slice(0, -4));
  }
  return candidates.find((c) => verbLex.has(c)) ?? lower;
}

function bankKey(row, verbLex) {
  const lower = row.en.trim().toLowerCase();
  if (row.pos === 'verbs') return canonicalLemmaVerb(lower, verbLex);
  if (row.pos === 'nouns') return canonicalLemmaNoun(lower);
  return lower;
}

function supplementalRowsForLesson(lessonId, phrases, functionWords, grammarChunks) {
  const found = new Map();
  for (const phrase of phrases.get(lessonId) ?? []) {
    const text = normalizeText(phrase.english);
    const padded = ` ${text} `;
    for (const [chunk, row] of grammarChunks) {
      if (padded.includes(` ${chunk} `)) found.set(row.en.toLowerCase(), row);
    }
    for (const token of text.split(' ')) {
      const row = functionWords.get(token);
      if (row) found.set(row.en.toLowerCase(), row);
    }
  }
  return [...found.values()];
}

function knownSupplementalRowsForLesson(lessonId, phrases, globalGlosses) {
  const found = new Map();
  for (const phrase of phrases.get(lessonId) ?? []) {
    const text = normalizeText(phrase.english);
    if (!text) continue;
    const padded = ` ${text} `;

    for (const [key, row] of globalGlosses) {
      if (key.includes(' ') && padded.includes(` ${key} `)) found.set(key, row);
    }

    for (const token of tokensFromEnglish(phrase.english)) {
      for (const candidate of lemmaCandidates(token, new Map())) {
        const row = globalGlosses.get(candidate);
        if (row) {
          found.set(row.en.toLowerCase(), row);
          break;
        }
      }
    }
  }
  return [...found.values()];
}

function buildLiveWordBank(wordsByLesson, phrases, functionWords, grammarChunks) {
  const verbLex = new Set();
  for (const rows of wordsByLesson.raw.values()) {
    for (const row of rows) {
      if (row.pos === 'verbs') verbLex.add(row.en.trim().toLowerCase());
    }
  }

  const globalGlosses = new Map();
  for (const lessonId of [...wordsByLesson.raw.keys()].sort((a, b) => a - b)) {
    for (const row of wordsByLesson.raw.get(lessonId) ?? []) {
      if (row.pos === 'irregular_verbs') continue;
      const key = bankKey(row, verbLex);
      if (!globalGlosses.has(key)) globalGlosses.set(key, { ...row, key });
      const compactKey = normalizeText(row.en).replace(/\s+/g, '');
      if (compactKey && !globalGlosses.has(compactKey)) globalGlosses.set(compactKey, { ...row, key: compactKey });
    }
  }
  for (const row of functionWords.values()) globalGlosses.set(row.en.toLowerCase(), { ...row, key: row.en.toLowerCase() });
  for (const row of grammarChunks.values()) globalGlosses.set(row.en.toLowerCase(), { ...row, key: row.en.toLowerCase() });

  const banks = new Map();
  for (const lessonId of LESSONS) {
    const rows = [
      ...(wordsByLesson.raw.get(lessonId) ?? []),
      ...supplementalRowsForLesson(lessonId, phrases, functionWords, grammarChunks),
      ...knownSupplementalRowsForLesson(lessonId, phrases, globalGlosses),
    ];
    const seen = new Set();
    const deduped = [];
    for (const row of rows) {
      const key = bankKey(row, verbLex);
      if (seen.has(key)) continue;
      seen.add(key);
      if (row.pos !== 'irregular_verbs') deduped.push({ ...row, key });
    }
    const keys = new Set(deduped.map((row) => row.key));
    const visible = deduped.filter((row) => {
      if (row.pos !== 'verbs') return true;
      const l = row.key;
      if (KEEP_VERB_SURFACE_FORMS.has(l) || l.length <= 3) return true;
      if (!l.endsWith('s') || l.endsWith('ss')) return true;
      if (keys.has(l.slice(0, -1))) return false;
      if (l.endsWith('ies') && keys.has(l.slice(0, -3) + 'y')) return false;
      if (l.endsWith('es') && keys.has(l.slice(0, -2))) return false;
      return true;
    });
    banks.set(lessonId, visible);
  }
  return { banks, verbLex };
}

function expandToken(token) {
  const t = token.toLowerCase();
  const contractions = {
    "i'm": ['i', 'am'],
    "you're": ['you', 'are'],
    "we're": ['we', 'are'],
    "they're": ['they', 'are'],
    "he's": ['he', 'is', 'has'],
    "she's": ['she', 'is', 'has'],
    "it's": ['it', 'is', 'has'],
    "that's": ['that', 'is'],
    "there's": ['there', 'is'],
    "don't": ['do', 'not'],
    "doesn't": ['does', 'not'],
    "didn't": ['did', 'not'],
    "can't": ['can', 'not'],
    "cannot": ['can', 'not'],
    "won't": ['will', 'not'],
    "isn't": ['is', 'not'],
    "aren't": ['are', 'not'],
    "wasn't": ['was', 'not'],
    "weren't": ['were', 'not'],
    "haven't": ['have', 'not'],
    "hasn't": ['has', 'not'],
    "hadn't": ['had', 'not'],
    "wouldn't": ['would', 'not'],
    "couldn't": ['could', 'not'],
    "shouldn't": ['should', 'not'],
    "mustn't": ['must', 'not'],
  };
  if (contractions[t]) return contractions[t];
  if (t.endsWith("'ll")) return [t.slice(0, -3), 'will'];
  if (t.endsWith("'ve")) return [t.slice(0, -3), 'have'];
  if (t.endsWith("'re")) return [t.slice(0, -3), 'are'];
  if (t.endsWith("'d")) return [t.slice(0, -2), 'would', 'had'];
  if (t.endsWith("'s")) return [t.slice(0, -2), 'is', 'has'];
  return [t];
}

function tokensFromEnglish(english) {
  const raw = normalizeText(english).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
  return raw.flatMap(expandToken).filter(Boolean);
}

function lemmaCandidates(token, irregularFormToBases) {
  const out = new Set([token]);
  const irregularBases = irregularFormToBases.get(token);
  if (irregularBases) for (const base of irregularBases) out.add(base);
  const mappedBase = IRREGULAR_SURFACE_TO_BASE.get(token);
  if (mappedBase) out.add(mappedBase);
  out.add(canonicalLemmaNoun(token));

  if (/[^aeiou]ies$/.test(token) && token.length > 4) out.add(token.slice(0, -3) + 'y');
  if (token.endsWith('es') && token.length > 4) {
    out.add(token.slice(0, -2));
    out.add(token.slice(0, -1));
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) out.add(token.slice(0, -1));
  if (token.endsWith('ied') && token.length > 4) out.add(token.slice(0, -3) + 'y');
  if (token.endsWith('ed') && token.length > 4) {
    out.add(token.slice(0, -2));
    out.add(token.slice(0, -1));
    if (token.length > 5 && token.at(-3) === token.at(-4)) out.add(token.slice(0, -3));
  }
  if (token.endsWith('ing') && token.length > 4) {
    out.add(token.slice(0, -3));
    out.add(token.slice(0, -3) + 'e');
    if (token.length > 6 && token.at(-4) === token.at(-5)) out.add(token.slice(0, -4));
  }
  if (token.endsWith('ier') && token.length > 4) out.add(token.slice(0, -3) + 'y');
  if (token.endsWith('iest') && token.length > 5) out.add(token.slice(0, -4) + 'y');
  if (token.endsWith('er') && token.length > 4) out.add(token.slice(0, -2));
  if (token.endsWith('est') && token.length > 5) out.add(token.slice(0, -3));
  return out;
}

function wordBoundaryTemplate(english, answer) {
  return String(english).replace(new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '__');
}

function isInfinitiveTo(tokens, index) {
  const prev = tokens[index - 1] ?? '';
  const next = tokens[index + 1] ?? '';
  if (!next) return false;
  if (MOVEMENT_OR_TRANSFER_PREV.has(prev)) return false;
  if (prev === 'used' && next.endsWith('ing')) return false;
  if (INFINITIVE_TO_PREV.has(prev)) return true;
  if (DESTINATION_NOUNS.has(next)) return false;
  return COMMON_BASE_VERBS.has(next) && prev !== 'listen' && prev !== 'go';
}

function isDrillPrepositionOccurrence(tokens, index) {
  const token = tokens[index];
  const next = tokens[index + 1] ?? '';
  const prev = tokens[index - 1] ?? '';

  if (!PREPOSITION_WORDS.has(token)) return false;
  if (token === 'to' && isInfinitiveTo(tokens, index)) return false;
  if ((token === 'inside' || token === 'outside' || token === 'near') && (!next || TIME_FOLLOWERS.has(next))) return false;
  if (token === 'in' && ['come', 'comes', 'came'].includes(prev)) return false;
  if (token === 'on' && ['put', 'puts', 'putting', 'turn', 'turns', 'turned', 'turning'].includes(prev)) return false;
  if (token === 'off' && ['take', 'takes', 'took', 'taking', 'turn', 'turns', 'turned', 'turning'].includes(prev)) return false;
  if (token === 'out' && ['find', 'finds', 'found', 'finding'].includes(prev)) return false;
  if (token === 'up' && ['clean', 'cleans', 'cleaned', 'cleaning', 'get', 'gets', 'got', 'getting', 'wake', 'wakes', 'woke', 'waking'].includes(prev)) return false;
  if (token === 'back' && ['bring', 'brings', 'brought', 'give', 'gives', 'gave', 'go', 'goes', 'went'].includes(prev)) return false;
  if (token === 'of' && ['out', 'kind', 'sort', 'lot', 'lots'].includes(prev)) return false;
  if (PARTICLE_WORDS.has(token)) {
    if (!next || PRONOUNS.has(next)) return false;
    if (['get', 'gets', 'got', 'put', 'puts', 'take', 'takes', 'give', 'gives', 'find', 'go', 'goes', 'wake', 'wakes'].includes(prev)) return false;
  }
  return true;
}

function taggedPrepositionAnswers(phrase) {
  const out = [];
  const seen = new Set();
  for (const slot of phrase.slots) {
    const answer = normalizeText(slot.correct || slot.text);
    if (!answer || !isPrepositionCategory(slot.category) || seen.has(answer)) continue;
    seen.add(answer);
    out.push(answer);
  }
  return out;
}

function taggedAnswerCoversToken(token, phraseText, taggedAnswers) {
  const paddedPhrase = ` ${normalizeText(phraseText)} `;
  for (const answer of taggedAnswers) {
    if (answer === token) return true;
    const parts = answer.split(/\s+/).filter(Boolean);
    if (parts.includes(token) && paddedPhrase.includes(` ${answer} `)) return true;
  }
  return false;
}

function compoundAt(tokens, index) {
  for (const compound of COMPOUND_PREPOSITIONS) {
    const parts = compound.split(' ');
    let matches = true;
    for (let i = 0; i < parts.length; i++) {
      if (tokens[index + i] !== parts[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return compound;
  }
  return null;
}

function generatedPrepositionCandidates(phrase) {
  const result = [];
  const seen = new Set();
  const taggedAnswers = taggedPrepositionAnswers(phrase);

  for (const answer of taggedAnswers) {
    const key = `tagged:${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(answer);
  }

  const tokens = tokensFromEnglish(phrase.english);
  const compoundCovered = new Set();
  for (let index = 0; index < tokens.length; index++) {
    const compound = compoundAt(tokens, index);
    if (!compound) continue;
    const parts = compound.split(' ');
    if (parts.some((part) => taggedAnswerCoversToken(part, phrase.english, taggedAnswers))) continue;
    const key = `auto:${index}:${compound}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(compound);
      for (let i = 0; i < parts.length; i++) compoundCovered.add(index + i);
    }
  }

  tokens.forEach((token, index) => {
    if (compoundCovered.has(index)) return;
    if (!isDrillPrepositionOccurrence(tokens, index)) return;
    if (taggedAnswerCoversToken(token, phrase.english, taggedAnswers)) return;
    const key = `auto:${index}:${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(token);
  });

  return result;
}

function prepositionStats(phrases) {
  const stats = new Map();
  for (const lessonId of LESSONS) {
    const lessonPhrases = phrases.get(lessonId) ?? [];
    const unique = new Set();
    let slots = 0;
    let items = 0;
    const templateGaps = new Set();

    for (const phrase of lessonPhrases) {
      for (const slot of phrase.slots) {
        const answer = normalizeText(slot.correct || slot.text);
        if (!answer) continue;
        if (isPrepositionCategory(slot.category)) {
          slots++;
        }
      }

      for (const answer of generatedPrepositionCandidates(phrase)) {
        unique.add(answer);
        const template = wordBoundaryTemplate(phrase.english, answer);
        if (template.includes('__')) items++;
        else templateGaps.add(answer);
      }
    }

    stats.set(lessonId, {
      slots,
      unique: [...unique].sort(),
      rawItems: items,
      menuItems: Math.min(items, ITEM_CAP),
      looksUntagged: [...templateGaps].sort(),
    });
  }
  return stats;
}

function buildIrregularIndexes(irregularByLesson) {
  const formToBases = new Map();
  const baseToForms = new Map();
  for (const rows of irregularByLesson.values()) {
    for (const row of rows) {
      const base = row.base.toLowerCase();
      const forms = [row.base, row.past, row.pp]
        .flatMap((v) => String(v || '').split('/'))
        .map((v) => normalizeText(v))
        .filter(Boolean);
      if (!baseToForms.has(base)) baseToForms.set(base, new Set());
      for (const form of forms) {
        baseToForms.get(base).add(form);
        if (!formToBases.has(form)) formToBases.set(form, new Set());
        formToBases.get(form).add(base);
      }
    }
  }
  return { formToBases, baseToForms };
}

function main() {
  const phrases = parsePhraseData();
  const wordsByLesson = parseWordsByLesson();
  const irregularByLesson = parseIrregularByLesson();
  const legacyIrregular = parseLegacyIrregularArrays();
  const { formToBases } = buildIrregularIndexes(irregularByLesson);
  const { banks } = buildLiveWordBank(wordsByLesson, phrases, wordsByLesson.functionWords, wordsByLesson.grammarChunks);
  const prep = prepositionStats(phrases);

  const critical = [];
  const warnings = [];
  const report = [];
  const push = (line = '') => report.push(line);

  const menuSrc = fs.readFileSync(MENU, 'utf8');
  const prepSrc = fs.readFileSync(PREPOSITIONS, 'utf8');
  if (!menuSrc.includes('hasLessonPrepositionDrill') || !menuSrc.includes('lesson-menu-prepositions')) {
    critical.push('Menu does not render the preposition drill row from hasLessonPrepositionDrill.');
  }
  for (const alias of ['preposicion', 'preposiciones']) {
    if (!prepSrc.includes(alias)) critical.push(`lesson_prepositions.ts does not recognize category alias ${alias}.`);
  }

  push('# Lesson Sections Audit');
  push('');
  push(`Generated: ${new Date().toISOString()}`);
  push('');
  push('| Lesson | Phrases | Vocab | Irregular | Prep slots | Prep drill | Status |');
  push('|---:|---:|---:|---:|---:|---:|---|');

  for (const lessonId of LESSONS) {
    const lessonPhrases = phrases.get(lessonId) ?? [];
    const bank = banks.get(lessonId) ?? [];
    const bankSingle = new Set(bank.map((row) => row.key).filter((key) => !key.includes(' ')));
    const bankChunks = bank.map((row) => row.key).filter((key) => key.includes(' '));
    const irregularRows = irregularByLesson.get(lessonId) ?? [];
    const irregularLessonBases = new Set(irregularRows.map((row) => row.base.toLowerCase()));

    const issues = [];
    if (lessonPhrases.length !== 50) issues.push(`phrases=${lessonPhrases.length}`);
    if (!wordsByLesson.raw.has(lessonId)) issues.push('missing vocabulary source');

    const missing = new Map();
    for (const phrase of lessonPhrases) {
      const phraseText = normalizeText(phrase.english);
      const padded = ` ${phraseText} `;
      const chunkWords = new Set();
      for (const chunk of bankChunks) {
        if (padded.includes(` ${chunk} `)) {
          for (const token of chunk.split(' ')) chunkWords.add(token);
        }
      }

      for (const token of tokensFromEnglish(phrase.english)) {
        if (/^\d+$/.test(token)) continue;
        if (chunkWords.has(token)) continue;

        const candidates = lemmaCandidates(token, formToBases);
        let covered = false;
        for (const candidate of candidates) {
          if (bankSingle.has(candidate)) covered = true;
          if (irregularLessonBases.has(candidate)) covered = true;
        }
        if (!covered) {
          if (!missing.has(token)) missing.set(token, []);
          missing.get(token).push(`${phrase.idx}:${phrase.english}`);
        }
      }
    }
    if (missing.size) {
      issues.push(`vocab gaps=${missing.size}`);
      const sample = [...missing.entries()].slice(0, 200).map(([word, examples]) => {
        const one = examples[0] ?? '';
        return `L${lessonId} missing "${word}" at ${one}`;
      });
      critical.push(...sample);
      if (missing.size > sample.length) critical.push(`L${lessonId} has ${missing.size - sample.length} more vocab gaps.`);
    }

    const lessonPrep = prep.get(lessonId);
    if (lessonPrep.unique.length > 0 && lessonPrep.menuItems === 0) issues.push('prep drill hidden despite drill-worthy prepositions');
    if (lessonPrep.unique.length > 0 && lessonPrep.menuItems === 0) {
      critical.push(`L${lessonId}: ${lessonPrep.unique.length} drill-worthy preposition target(s) but no drill items.`);
    }
    if (lessonPrep.looksUntagged.length) {
      warnings.push(`L${lessonId}: generated preposition targets could not be blanked in phrase text: ${lessonPrep.looksUntagged.join(', ')}`);
    }

    const liveLegacy = legacyIrregular.get(lessonId);
    if (liveLegacy) {
      const live = new Set(irregularRows.map((row) => row.base.toLowerCase()));
      const legacy = new Set(liveLegacy.map((row) => row.base.toLowerCase()));
      const onlyLegacy = [...legacy].filter((base) => !live.has(base));
      const onlyLive = [...live].filter((base) => !legacy.has(base));
      if (onlyLegacy.length || onlyLive.length) {
        warnings.push(`L${lessonId}: legacy LESSON_${lessonId}_IRREGULAR_VERBS differs from IRREGULAR_VERBS_BY_LESSON (legacy-only: ${onlyLegacy.join(', ') || '-'}; live-only: ${onlyLive.join(', ') || '-'}).`);
      }
    }

    for (const phrase of lessonPhrases) {
      for (const slot of phrase.slots) {
        if (!isVerbCategory(slot.category)) continue;
        for (const token of tokensFromEnglish(slot.correct || slot.text)) {
          if (AUXILIARY_IRREGULARS.has(token)) continue;
          const bases = formToBases.get(token);
          if (!bases) continue;
          for (const base of bases) {
            if (!irregularLessonBases.has(base)) {
              warnings.push(`L${lessonId}: irregular-looking verb "${token}" (${base}) in phrase ${phrase.idx} is not in the lesson irregular section.`);
            }
          }
        }
      }
    }

    push(`| ${lessonId} | ${lessonPhrases.length} | ${bank.length} | ${irregularRows.length} | ${lessonPrep.slots} | ${lessonPrep.menuItems} | ${issues.length ? issues.join('; ') : 'OK'} |`);
  }

  const staleIrregularSourceRefs = [];
  for (const file of [path.join(ROOT, 'app', 'lesson_data_all.ts'), ...DATA_FILES, path.join(ROOT, 'app', 'lesson_verbs.tsx')]) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, 'utf8');
    if (/LESSON_\d+_IRREGULAR_VERBS|LESSON_IRREGULAR_VERBS|const VERBS_BY_LESSON/.test(text)) {
      staleIrregularSourceRefs.push(rel);
    }
  }
  if (staleIrregularSourceRefs.length) {
    warnings.push(`Stale/duplicate irregular verb sources still present: ${staleIrregularSourceRefs.join(', ')}`);
  }

  push('');
  push('## Critical');
  push('');
  if (critical.length === 0) push('None.');
  else for (const issue of critical) push(`- ${issue}`);

  push('');
  push('## Warnings');
  push('');
  if (warnings.length === 0) push('None.');
  else for (const issue of [...new Set(warnings)].slice(0, 250)) push(`- ${issue}`);
  if (new Set(warnings).size > 250) push(`- ... ${new Set(warnings).size - 250} more warnings`);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, report.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${path.relative(ROOT, REPORT)}`);
  if (critical.length) {
    console.log(`FAIL: ${critical.length} critical issue(s).`);
    process.exit(1);
  }
  console.log(`OK: all lessons passed critical section checks. Warnings: ${new Set(warnings).size}.`);
}

main();
