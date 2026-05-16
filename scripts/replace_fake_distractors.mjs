import fs from 'node:fs';
import { createRequire } from 'node:module';

const requireCJS = createRequire(import.meta.url);
const WORDS = new Set(requireCJS('an-array-of-english-words'));

const FILES = ['app/lesson_data_17_24.ts', 'app/lesson_data_25_32.ts'];
const TARGET_LESSONS = new Set([22, 23, 24, 25, 26, 27, 28, 29, 30, 32]);
const EXCEPTIONS = new Set([
  'i', "i'm", "i'd", "i've", "i'll", 'ok', 'okay', 'tv', 'pc',
  "isn't", "aren't", "wasn't", "weren't", "doesn't", "don't", "didn't",
  "won't", "wouldn't", "can't", "couldn't", "shouldn't", "haven't", "hasn't",
  "hadn't", "mustn't", "needn't", "let's", "you're", "you've", "you'll",
  "he's", "she's", "it's", "they're", "we're", "what's", "who's", "that's",
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
]);

const strip = (value) => {
  const raw = String(value ?? '');
  const suffix = raw.match(/[.,!?;:]+$/)?.[0] ?? '';
  const core = raw.slice(0, raw.length - suffix.length);
  return { core, suffix };
};

const normalize = (value) => strip(value).core.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const hasCyrillic = (value) => /[А-Яа-яЁёІіЇїЄєҐґ]/.test(value);
const hasSpanish = (value) => /[áéíóúñü¿¡ÁÉÍÓÚÑÜ]/.test(value);

function isRealEnglish(value) {
  const n = normalize(value);
  if (!n || /^\d+$/.test(n)) return true;
  if (EXCEPTIONS.has(n)) return true;
  if (WORDS.has(n)) return true;
  if (n.includes('-')) return n.split('-').every((p) => WORDS.has(p) || EXCEPTIONS.has(p));
  if (n.includes(' ')) return n.split(/\s+/).every((p) => WORDS.has(p) || EXCEPTIONS.has(p));
  return false;
}

function literals(src) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(src))) out.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  return out;
}

function quoteLike(value, quote) {
  return quote + String(value).replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`) + quote;
}

function candidatePool(correct, category) {
  const c = normalize(correct);
  const cat = String(category ?? '').toLowerCase();
  const pools = [];

  const pronouns = ['I', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'myself', 'yourself', 'himself', 'herself', 'ourselves', 'yourselves', 'themselves'];
  const determiners = ['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their'];
  const preps = ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'under', 'over', 'near', 'behind', 'between', 'through'];
  const be = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did'];
  const gerunds = ['working', 'reading', 'writing', 'cooking', 'waiting', 'watching', 'learning', 'driving', 'talking', 'cleaning', 'speaking', 'studying', 'sleeping', 'running'];
  const verbs = ['work', 'works', 'worked', 'do', 'does', 'did', 'make', 'makes', 'made', 'go', 'goes', 'went', 'come', 'comes', 'came', 'take', 'takes', 'took', 'get', 'gets', 'got', 'finish', 'finishes', 'finished', 'study', 'studies', 'studied', 'speak', 'speaks', 'spoke', 'write', 'writes', 'wrote', 'eat', 'eats', 'ate'];
  const nouns = ['time', 'day', 'work', 'home', 'room', 'door', 'phone', 'message', 'email', 'letter', 'note', 'document', 'ticket', 'book', 'question', 'answer', 'plan', 'task', 'idea', 'problem'];
  const adjectives = ['good', 'new', 'old', 'busy', 'ready', 'hard', 'easy', 'useful', 'important', 'late', 'early', 'tired', 'dangerous', 'safe'];
  const adverbs = ['now', 'today', 'yesterday', 'always', 'never', 'often', 'here', 'there', 'well', 'late', 'early'];
  const relatives = ['who', 'which', 'that', 'whose', 'whom', 'where', 'when'];

  if (['this', 'that', 'these', 'those'].includes(c)) pools.push(['these', 'that', 'those', 'this', 'it']);
  if (c.endsWith('self') || c.endsWith('selves')) pools.push(['myself', 'yourself', 'himself', 'herself', 'ourselves', 'yourselves', 'themselves']);
  if (c.endsWith('ing')) pools.push(gerunds, verbs);
  if (cat.includes('pronoun')) pools.push(pronouns);
  if (cat.includes('article') || cat.includes('determiner') || ['a', 'an', 'the'].includes(c)) pools.push(determiners);
  if (cat.includes('prepos')) pools.push(preps);
  if (cat.includes('verb') || cat.includes('irregular')) pools.push(be, verbs, gerunds);
  if (cat.includes('noun')) pools.push(nouns);
  if (cat.includes('adj')) pools.push(adjectives);
  if (cat.includes('adverb')) pools.push(adverbs);
  if (['who', 'which', 'that', 'where', 'when'].includes(c)) pools.push(relatives);

  pools.push(determiners, pronouns, preps, be, gerunds, verbs, nouns, adjectives, adverbs, relatives);
  return pools.flat();
}

function replacementFor(correct, category, used, suffix) {
  for (const raw of candidatePool(correct, category)) {
    if (!raw || raw.includes(' ')) continue;
    const value = strip(raw).core + suffix;
    const key = normalize(value);
    if (!key || used.has(key) || key === normalize(correct)) continue;
    if (!isRealEnglish(value)) continue;
    used.add(key);
    return value;
  }
  return null;
}

function repairFile(file) {
  let lesson = null;
  let changed = 0;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const next = lines.map((line) => {
    const lessonMatch = line.match(/id:\s*['"]lesson(\d+)_phrase_\d+['"]/);
    if (lessonMatch) lesson = Number(lessonMatch[1]);
    if (!TARGET_LESSONS.has(lesson) || !line.includes('distractors:')) return line;

    const correctMatch = line.match(/correct:\s*(['"])((?:\\.|(?!\1).)*?)\1/);
    const distractorMatch = line.match(/distractors:\s*\[([^\]]*)\]/);
    if (!correctMatch || !distractorMatch) return line;
    const correct = correctMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (hasCyrillic(correct) || hasSpanish(correct)) return line;

    const quote = distractorMatch[1].trim().startsWith('"') ? '"' : "'";
    const category = line.match(/category:\s*(['"])((?:\\.|(?!\1).)*?)\1/)?.[2] ?? '';
    const current = literals(distractorMatch[1]);
    const used = new Set([normalize(correct)]);
    for (const item of current) {
      if (isRealEnglish(item)) used.add(normalize(item));
    }

    let touched = false;
    const repaired = current.map((item) => {
      if (isRealEnglish(item)) return item;
      const { suffix } = strip(item);
      const replacement = replacementFor(correct, category, used, suffix);
      if (!replacement) return item;
      touched = true;
      return replacement;
    });
    if (!touched) return line;
    changed += 1;
    return line.replace(/distractors:\s*\[[^\]]*\]/, `distractors: [${repaired.map((v) => quoteLike(v, quote)).join(', ')}]`);
  });
  fs.writeFileSync(file, next.join('\n'), 'utf8');
  return changed;
}

for (const file of FILES) {
  console.log(`${file}: repaired ${repairFile(file)} arrays`);
}
