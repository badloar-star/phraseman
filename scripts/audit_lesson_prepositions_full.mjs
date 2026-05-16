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

const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);
const REPORT = path.join(ROOT, 'tools', 'audit', 'lesson_prepositions_audit.md');
const ITEM_CAP = 12;

const PREPOSITION_CATEGORY_ALIASES = new Set([
  'preposition',
  'prepositions',
  'preposicion',
  'preposiciones',
]);

const TRUE_PREPOSITIONS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beside', 'between', 'by', 'during',
  'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'onto',
  'opposite', 'out', 'outside', 'over', 'through', 'to', 'toward', 'towards',
  'under', 'until', 'up', 'with', 'within', 'without',
]);

const COMPOUND_PREPOSITIONS = ['in front of', 'next to', 'because of', 'instead of'];
const PARTICLE_WORDS = new Set(['away', 'back', 'off', 'out', 'up', 'down']);
const PRONOUNS = new Set(['it', 'me', 'you', 'him', 'her', 'us', 'them']);

const COMMON_BASE_VERBS = new Set([
  'answer', 'ask', 'be', 'bring', 'buy', 'call', 'change', 'check', 'choose',
  'clean', 'come', 'cook', 'do', 'drink', 'drive', 'eat', 'feel', 'find',
  'finish', 'fix', 'forget', 'get', 'give', 'go', 'have', 'hear', 'help',
  'keep', 'know', 'learn', 'leave', 'listen', 'look', 'make', 'meet', 'need',
  'open', 'order', 'pay', 'put', 'read', 'remember', 'repair', 'save', 'say',
  'rest', 'see', 'sell', 'send', 'show', 'sleep', 'speak', 'start', 'stay', 'take',
  'talk', 'tell', 'try', 'understand', 'use', 'wait', 'wake', 'want', 'wear',
  'work', 'write',
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

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[â€™]/g, "'")
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

function tokensFromEnglish(english) {
  return normalizeText(english).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
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

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function templateIncludesBlank(english, answer) {
  return new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'i').test(english);
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

function classifyOccurrence(tokens, index) {
  const token = tokens[index];
  const next = tokens[index + 1] ?? '';
  const prev = tokens[index - 1] ?? '';

  if (!TRUE_PREPOSITIONS.has(token)) return null;
  if (token === 'to' && isInfinitiveTo(tokens, index)) {
    return { drill: false, kind: 'infinitive-to' };
  }
  if ((token === 'inside' || token === 'outside' || token === 'near') && (!next || TIME_FOLLOWERS.has(next))) {
    return { drill: false, kind: 'place-adverb' };
  }
  if (token === 'in' && ['come', 'comes', 'came'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'on' && ['put', 'puts', 'putting', 'turn', 'turns', 'turned', 'turning'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'off' && ['take', 'takes', 'took', 'taking', 'turn', 'turns', 'turned', 'turning'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'out' && ['find', 'finds', 'found', 'finding'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'up' && ['clean', 'cleans', 'cleaned', 'cleaning', 'get', 'gets', 'got', 'getting', 'wake', 'wakes', 'woke', 'waking'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'back' && ['bring', 'brings', 'brought', 'give', 'gives', 'gave', 'go', 'goes', 'went'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (token === 'of' && ['out', 'kind', 'sort', 'lot', 'lots'].includes(prev)) {
    return { drill: false, kind: 'phrasal-particle' };
  }
  if (PARTICLE_WORDS.has(token)) {
    if (!next || PRONOUNS.has(next)) {
      return { drill: false, kind: 'phrasal-particle' };
    }
    if (['get', 'gets', 'got', 'put', 'puts', 'take', 'takes', 'give', 'gives', 'find', 'go', 'goes', 'wake', 'wakes'].includes(prev)) {
      return { drill: false, kind: 'phrasal-particle' };
    }
  }
  return { drill: true, kind: 'true-preposition' };
}

function addExample(bucket, key, phrase) {
  if (!bucket.has(key)) bucket.set(key, []);
  const examples = bucket.get(key);
  if (examples.length < 6) examples.push(`${phrase.idx}: ${phrase.english}`);
}

function taggedPrepositionAnswers(phrase) {
  const seen = new Set();
  const out = [];
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
    result.push({ answer, source: 'tagged' });
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
      result.push({ answer: compound, source: 'auto' });
      for (let i = 0; i < parts.length; i++) compoundCovered.add(index + i);
    }
  }

  tokens.forEach((token, index) => {
    if (compoundCovered.has(index)) return;
    const occurrence = classifyOccurrence(tokens, index);
    if (!occurrence?.drill) return;
    if (taggedAnswerCoversToken(token, phrase.english, taggedAnswers)) return;
    const key = `auto:${index}:${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ answer: token, source: 'auto' });
  });

  return result;
}

function auditLesson(lessonId, phrases) {
  const lessonPhrases = phrases.get(lessonId) ?? [];
  let taggedSlots = 0;
  let generatedDrillItemsRaw = 0;
  let actualPrepositionOccurrences = 0;
  let autoGeneratedOccurrences = 0;
  let ignoredOccurrences = 0;
  const actualByToken = new Map();
  const autoByToken = new Map();
  const ignoredByKind = new Map();

  for (const phrase of lessonPhrases) {
    for (const slot of phrase.slots) {
      const answer = normalizeText(slot.correct || slot.text);
      if (!answer || !isPrepositionCategory(slot.category)) continue;
      taggedSlots++;
    }

    const candidates = generatedPrepositionCandidates(phrase);
    for (const candidate of candidates) {
      actualPrepositionOccurrences++;
      addExample(actualByToken, candidate.answer, phrase);
      if (candidate.source === 'auto') {
        autoGeneratedOccurrences++;
        addExample(autoByToken, candidate.answer, phrase);
      }
      if (templateIncludesBlank(phrase.english, candidate.answer)) generatedDrillItemsRaw++;
    }

    const tokens = tokensFromEnglish(phrase.english);
    tokens.forEach((token, index) => {
      const occurrence = classifyOccurrence(tokens, index);
      if (!occurrence) return;
      if (!occurrence.drill) {
        ignoredOccurrences++;
        addExample(ignoredByKind, `${occurrence.kind}:${token}`, phrase);
        return;
      }

    });
  }

  return {
    lessonId,
    phrases: lessonPhrases.length,
    taggedSlots,
    drillItems: Math.min(generatedDrillItemsRaw, ITEM_CAP),
    actualPrepositionOccurrences,
    autoGeneratedOccurrences,
    ignoredOccurrences,
    actualByToken,
    autoByToken,
    ignoredByKind,
  };
}

function compactMapKeys(map) {
  return [...map.keys()].sort().join(', ') || '-';
}

function actionFor(row) {
  if (row.actualPrepositionOccurrences > 0 && row.drillItems === 0) return 'NEEDS DRILL';
  if (row.actualPrepositionOccurrences > 0 || row.taggedSlots > 0) return 'OK';
  return 'NO PREP';
}

function main() {
  const phrases = parsePhraseData();
  const rows = LESSONS.map((lessonId) => auditLesson(lessonId, phrases));
  const out = [];

  out.push('# Lesson Prepositions Audit');
  out.push('');
  out.push(`Generated: ${new Date().toISOString()}`);
  out.push('');
  out.push('This report models the app generator: tagged preposition slots plus auto-detected drill-worthy prepositions, while ignoring infinitive `to`, phrasal particles, and sentence-final place adverbs.');
  out.push('');
  out.push('| Lesson | Phrases | Tagged slots | Generated drill | Drill-worthy uses | Auto-generated | Ignored grammar | Action |');
  out.push('|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const row of rows) {
    out.push(`| ${row.lessonId} | ${row.phrases} | ${row.taggedSlots} | ${row.drillItems} | ${row.actualPrepositionOccurrences} | ${row.autoGeneratedOccurrences} | ${row.ignoredOccurrences} | ${actionFor(row)} |`);
  }

  out.push('');
  out.push('## Lessons Needing Preposition Drill');
  out.push('');
  const needs = rows.filter((row) => row.actualPrepositionOccurrences > 0 && row.drillItems === 0);
  if (!needs.length) {
    out.push('None.');
  } else {
    for (const row of needs) {
      out.push(`- L${row.lessonId}: ${row.actualPrepositionOccurrences} drill-worthy preposition use(s), but no generated drill item.`);
    }
  }

  out.push('');
  out.push('## Details');
  for (const row of rows) {
    if (!row.autoByToken.size && !row.ignoredByKind.size) continue;
    out.push('');
    out.push(`### Lesson ${row.lessonId}`);
    if (row.autoByToken.size) {
      out.push('');
      out.push('Auto-generated drill targets:');
      for (const [token, examples] of [...row.autoByToken.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        out.push(`- ${token}: ${examples.join(' | ')}`);
      }
    }
    if (row.ignoredByKind.size) {
      out.push('');
      out.push('Ignored as grammar/particle, not a preposition drill target:');
      for (const [key, examples] of [...row.ignoredByKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        out.push(`- ${key}: ${examples.join(' | ')}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, out.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${path.relative(ROOT, REPORT)}`);
  console.log(`Lessons needing drill: ${needs.map((row) => row.lessonId).join(', ') || 'none'}`);
}

main();
