import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { explainPrepositionChoice } from '../app/preposition_explanations';

type Slot = { text: string; correct: string; category: string };
type Phrase = { idx: number; id: string; english: string; slots: Slot[] };
type Candidate = { answer: string; phrase: Phrase; occurrenceIndex: number; source: 'tagged' | 'auto' };
type DrillItem = { lessonId: number; phrase: Phrase; answer: string; template: string; options: string[] };

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
const LESSON_WORDS = path.join(ROOT, 'app', 'lesson_words.tsx');
const LESSON_HELP = path.join(ROOT, 'app', 'lesson_help.tsx');
const REPORT = path.join(ROOT, 'tools', 'audit', 'lesson_drill_quality_audit.md');
const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);
const ITEM_CAP = 12;

const PREPOSITION_CATEGORY_ALIASES = new Set(['preposition', 'prepositions', 'preposicion', 'preposiciones']);
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

const directionSet = new Set(['to', 'into', 'onto', 'from', 'toward', 'towards', 'through', 'across', 'along', 'up', 'down', 'out', 'off']);
const placeSet = new Set(['in', 'on', 'at', 'under', 'over', 'between', 'among', 'inside', 'outside', 'near', 'behind', 'opposite', 'beside', 'around', 'next to', 'in front of']);
const timeSet = new Set(['during', 'before', 'after', 'since', 'until', 'for', 'by', 'on', 'in', 'at']);

function normalizeText(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/\bwi[\s-]?fi\b/g, 'wifi')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategory(s: string): string {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokensFromEnglish(english: string): string[] {
  return normalizeText(english).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

function findMatching(src: string, openIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let quote: string | null = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i]!;
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

function readStringAt(src: string, quoteIndex: number): { value: string; end: number } {
  const quote = src[quoteIndex]!;
  let value = '';
  let escape = false;
  for (let i = quoteIndex + 1; i < src.length; i++) {
    const ch = src[i]!;
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

function readStringProp(obj: string, prop: string): string {
  const re = new RegExp(`\\b${prop}\\s*:\\s*(['"\`])`);
  const m = re.exec(obj);
  if (!m) return '';
  return readStringAt(obj, m.index + m[0].length - 1).value;
}

function extractArrayProp(obj: string, prop: string): string | null {
  const re = new RegExp(`\\b${prop}\\s*:\\s*\\[`);
  const m = re.exec(obj);
  if (!m) return null;
  const open = m.index + m[0].lastIndexOf('[');
  const close = findMatching(obj, open, '[', ']');
  return obj.slice(open + 1, close);
}

function splitTopLevelObjects(body: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') {
      const close = findMatching(body, i, '{', '}');
      out.push(body.slice(i, close + 1));
      i = close;
    }
  }
  return out;
}

function parsePhraseData(): Map<number, Phrase[]> {
  const result = new Map<number, Phrase[]>();
  for (const file of DATA_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /export\s+const\s+LESSON_(\d+)_PHRASES[^=]*=\s*\[/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const lessonId = Number(m[1]);
      const open = m.index + m[0].lastIndexOf('[');
      const close = findMatching(src, open, '[', ']');
      const body = src.slice(open + 1, close);
      const phrases = splitTopLevelObjects(body)
        .map((obj, idx) => {
          const wordsEn = extractArrayProp(obj, 'wordsEn');
          const words = wordsEn ?? extractArrayProp(obj, 'words');
          const slots = words
            ? splitTopLevelObjects(words).map((wordObj) => ({
                text: readStringProp(wordObj, 'text'),
                correct: readStringProp(wordObj, 'correct'),
                category: readStringProp(wordObj, 'category'),
              })).filter((slot) => slot.text || slot.correct)
            : [];
          return { idx: idx + 1, id: readStringProp(obj, 'id'), english: readStringProp(obj, 'english'), slots };
        })
        .filter((phrase) => phrase.english);
      result.set(lessonId, phrases);
      re.lastIndex = close + 1;
    }
  }
  return result;
}

function isPrepositionCategory(category: string): boolean {
  return PREPOSITION_CATEGORY_ALIASES.has(normalizeCategory(category));
}

function taggedPrepositionAnswers(phrase: Phrase): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slot of phrase.slots) {
    const answer = normalizeText(slot.correct || slot.text);
    if (!answer || !isPrepositionCategory(slot.category) || seen.has(answer)) continue;
    seen.add(answer);
    out.push(answer);
  }
  return out;
}

function taggedAnswerCoversToken(token: string, phraseText: string, taggedAnswers: string[]): boolean {
  const paddedPhrase = ` ${normalizeText(phraseText)} `;
  return taggedAnswers.some((answer) => {
    if (answer === token) return true;
    const parts = answer.split(/\s+/).filter(Boolean);
    return parts.includes(token) && paddedPhrase.includes(` ${answer} `);
  });
}

function compoundAt(tokens: string[], index: number): string | null {
  for (const compound of COMPOUND_PREPOSITIONS) {
    const parts = compound.split(' ');
    if (parts.every((part, offset) => tokens[index + offset] === part)) return compound;
  }
  return null;
}

function occurrenceIndexForToken(tokens: string[], index: number, answer: string): number {
  return tokens.slice(0, index).filter((token) => token === answer).length;
}

function occurrenceIndexForCompound(tokens: string[], index: number, answer: string): number {
  const parts = answer.split(' ');
  let count = 0;
  for (let i = 0; i < index; i++) {
    if (parts.every((part, offset) => tokens[i + offset] === part)) count++;
  }
  return count;
}

function isInfinitiveTo(tokens: string[], index: number): boolean {
  const prev = tokens[index - 1] ?? '';
  const next = tokens[index + 1] ?? '';
  if (!next) return false;
  if (MOVEMENT_OR_TRANSFER_PREV.has(prev)) return false;
  if (prev === 'used' && next.endsWith('ing')) return false;
  if (INFINITIVE_TO_PREV.has(prev)) return true;
  if (DESTINATION_NOUNS.has(next)) return false;
  return COMMON_BASE_VERBS.has(next) && prev !== 'listen' && prev !== 'go';
}

function isDrillPrepositionOccurrence(tokens: string[], index: number): boolean {
  const token = tokens[index]!;
  const next = tokens[index + 1] ?? '';
  const prev = tokens[index - 1] ?? '';
  if (!TRUE_PREPOSITIONS.has(token)) return false;
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

function candidatesForPhrase(phrase: Phrase): Candidate[] {
  const result: Candidate[] = [];
  const seen = new Set<string>();
  const taggedAnswers = taggedPrepositionAnswers(phrase);
  for (const answer of taggedAnswers) {
    const key = `tagged:${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ answer, phrase, occurrenceIndex: 0, source: 'tagged' });
  }

  const tokens = tokensFromEnglish(phrase.english);
  const compoundCovered = new Set<number>();
  for (let index = 0; index < tokens.length; index++) {
    const compound = compoundAt(tokens, index);
    if (!compound) continue;
    const parts = compound.split(' ');
    if (parts.some((part) => taggedAnswerCoversToken(part, phrase.english, taggedAnswers))) continue;
    const key = `auto:${index}:${compound}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ answer: compound, phrase, occurrenceIndex: occurrenceIndexForCompound(tokens, index, compound), source: 'auto' });
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
    result.push({ answer: token, phrase, occurrenceIndex: occurrenceIndexForToken(tokens, index, token), source: 'auto' });
  });
  return result;
}

function lessonPrepositions(lessonId: number, phrasesByLesson: Map<number, Phrase[]>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phrase of phrasesByLesson.get(lessonId) ?? []) {
    for (const candidate of candidatesForPhrase(phrase)) {
      if (seen.has(candidate.answer)) continue;
      seen.add(candidate.answer);
      out.push(candidate.answer);
    }
  }
  return out;
}

function classifyPreposition(text: string): 'time' | 'place' | 'direction' | 'other' {
  const t = normalizeText(text);
  if (directionSet.has(t)) return 'direction';
  if (timeSet.has(t)) return 'time';
  if (placeSet.has(t)) return 'place';
  return 'other';
}

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function uniqueOptions(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map(normalizeText).filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function pickFalsePrepDistractors(correct: string, seed: string): string[] {
  const c = normalizeText(correct);
  const pools = {
    time: ['at', 'on', 'in', 'before', 'after', 'during', 'by', 'until', 'for'],
    place: ['in', 'on', 'at', 'under', 'near', 'behind', 'inside', 'outside', 'next to', 'between'],
    direction: ['to', 'from', 'into', 'onto', 'through', 'across', 'along', 'toward'],
    other: ['for', 'of', 'with', 'by', 'about', 'without', 'from', 'to'],
  } as const;
  const pool = pools[classifyPreposition(c)];
  return deterministicShuffle(uniqueOptions(pool.filter((p) => p !== c)), seed).slice(0, 3);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function answerPattern(answer: string): RegExp {
  return new RegExp(`\\b${normalizeText(answer).split(/\s+/).map(escapeRegExp).join('\\s+')}\\b`, 'gi');
}

function templateForCandidate(candidate: Candidate): string {
  let seen = 0;
  return candidate.phrase.english.replace(answerPattern(candidate.answer), (match) => {
    if (seen === candidate.occurrenceIndex) {
      seen++;
      return '__';
    }
    seen++;
    return match;
  });
}

function buildItems(lessonId: number, phrasesByLesson: Map<number, Phrase[]>): DrillItem[] {
  const prior = new Set<string>();
  for (let i = 1; i < lessonId; i++) {
    for (const prep of lessonPrepositions(i, phrasesByLesson)) prior.add(prep);
  }

  const all: DrillItem[] = [];
  for (const phrase of phrasesByLesson.get(lessonId) ?? []) {
    for (const candidate of candidatesForPhrase(phrase)) {
      const template = templateForCandidate(candidate);
      const options = deterministicShuffle(uniqueOptions([candidate.answer, ...pickFalsePrepDistractors(candidate.answer, `${lessonId}|${phrase.id}|${candidate.answer}`)]), `${lessonId}|${phrase.id}|${template}`);
      all.push({ lessonId, phrase, answer: candidate.answer, template, options });
    }
  }

  all.sort((a, b) => {
    const aNew = !prior.has(a.answer);
    const bNew = !prior.has(b.answer);
    if (aNew === bNew) return 0;
    return aNew ? -1 : 1;
  });
  return all.slice(0, ITEM_CAP);
}

function parseGlossaryEnglish(): Set<string> {
  const src = fs.readFileSync(LESSON_WORDS, 'utf8');
  const out = new Set<string>();
  const enRe = /\ben\s*:\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = enRe.exec(src))) out.add(normalizeText(m[2] ?? ''));
  return out;
}

function parseTheoryEntries(): Map<number, string> {
  const src = fs.readFileSync(LESSON_HELP, 'utf8');
  const marker = src.indexOf('const THEORY:');
  if (marker < 0) throw new Error('THEORY object not found');
  const open = src.indexOf('{', marker);
  const close = findMatching(src, open, '{', '}');
  const body = src.slice(open + 1, close);
  const result = new Map<number, string>();
  const re = /(?:^|[\n\r])\s*(\d+):\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const id = Number(m[1]);
    const entryOpen = m.index + m[0].lastIndexOf('{');
    const entryClose = findMatching(body, entryOpen, '{', '}');
    result.set(id, normalizeText(body.slice(entryOpen, entryClose + 1)));
    re.lastIndex = entryClose + 1;
  }
  return result;
}

function isGenericFallback(answer: string, sentence: string): boolean {
  const exp = explainPrepositionChoice(answer, sentence);
  return exp.ru.includes('Здесь нужен предлог') || exp.uk.includes('Тут потрібен прийменник') || exp.es.includes('corresponde la preposición');
}

function main() {
  const phrasesByLesson = parsePhraseData();
  const glossary = parseGlossaryEnglish();
  const theory = parseTheoryEntries();
  const critical: string[] = [];
  const warnings: string[] = [];
  const rows: string[] = [];

  for (const lessonId of LESSONS) {
    const phrases = phrasesByLesson.get(lessonId) ?? [];
    const preps = lessonPrepositions(lessonId, phrasesByLesson);
    const items = buildItems(lessonId, phrasesByLesson);

    if (!theory.has(lessonId)) critical.push(`L${lessonId}: missing theory entry in lesson_help.tsx.`);
    for (const answer of preps) {
      if (!glossary.has(answer)) critical.push(`L${lessonId}: preposition drill answer "${answer}" is missing from lesson_words glossary.`);
    }

    for (const item of items) {
      const blankCount = (item.template.match(/__/g) ?? []).length;
      const optionSet = new Set(item.options);
      if (blankCount !== 1) critical.push(`L${lessonId} phrase ${item.phrase.idx}: template has ${blankCount} blanks for "${item.answer}".`);
      if (!optionSet.has(item.answer)) critical.push(`L${lessonId} phrase ${item.phrase.idx}: options do not include correct "${item.answer}".`);
      if (optionSet.size !== item.options.length) critical.push(`L${lessonId} phrase ${item.phrase.idx}: duplicate options for "${item.answer}".`);
      if (item.options.length < 4) critical.push(`L${lessonId} phrase ${item.phrase.idx}: fewer than 4 options for "${item.answer}".`);
      if (item.answer === 'to' && /\b(have|has|had|need|needs|needed|want|wants|wanted)\s+to\b/i.test(item.phrase.english)) {
        critical.push(`L${lessonId} phrase ${item.phrase.idx}: infinitive/modal "to" leaked into preposition drill.`);
      }
      if (isGenericFallback(item.answer, item.phrase.english)) {
        warnings.push(`L${lessonId} phrase ${item.phrase.idx}: generic explanation for "${item.answer}" in "${item.phrase.english}".`);
      }
    }

    if (lessonId === 8) {
      const text = theory.get(lessonId) ?? '';
      for (const answer of ['at', 'in', 'on']) {
        if (!text.includes(answer)) warnings.push(`L${lessonId}: theory does not mention core time preposition "${answer}".`);
      }
    }

    if (lessonId === 19) {
      const text = theory.get(lessonId) ?? '';
      for (const answer of preps) {
        if (!text.includes(answer)) warnings.push(`L${lessonId}: theory does not mention drill preposition "${answer}".`);
      }
    }

    rows.push(`| ${lessonId} | ${phrases.length} | ${preps.length} | ${items.length} | ${theory.has(lessonId) ? 'yes' : 'no'} |`);
  }

  const out: string[] = [];
  out.push('# Lesson Drill Quality Audit');
  out.push('');
  out.push(`Generated: ${new Date().toISOString()}`);
  out.push('');
  out.push('| Lesson | Phrases | Prep targets | Prep items | Theory |');
  out.push('|---:|---:|---:|---:|---|');
  out.push(...rows);
  out.push('');
  out.push('## Critical');
  out.push('');
  if (critical.length) critical.forEach((issue) => out.push(`- ${issue}`));
  else out.push('None.');
  out.push('');
  out.push('## Warnings');
  out.push('');
  const uniqueWarnings = [...new Set(warnings)];
  if (uniqueWarnings.length) uniqueWarnings.forEach((issue) => out.push(`- ${issue}`));
  else out.push('None.');

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, out.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${path.relative(ROOT, REPORT)}`);
  if (critical.length) {
    console.log(`FAIL: ${critical.length} critical issue(s). Warnings: ${uniqueWarnings.length}.`);
    process.exit(1);
  }
  console.log(`OK: drill quality checks passed. Warnings: ${uniqueWarnings.length}.`);
}

main();
