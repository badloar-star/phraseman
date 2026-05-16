import fs from 'node:fs';

const FILE = 'app/lesson_data_17_24.ts';
const TARGET = new Set([22, 23]);
const GENERIC_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
const PRONOUN_CORRECT = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
]);

const CURATED = {
  I: ['you', 'he', 'she', 'we', 'they'],
  You: ['I', 'he', 'she', 'we', 'they'],
  He: ['I', 'you', 'she', 'we', 'they'],
  She: ['I', 'you', 'he', 'we', 'they'],
  We: ['I', 'you', 'he', 'she', 'they'],
  They: ['I', 'you', 'he', 'she', 'we'],
  i: ['you', 'he', 'she', 'we', 'they'],
  you: ['I', 'he', 'she', 'we', 'they'],
  he: ['I', 'you', 'she', 'we', 'they'],
  she: ['I', 'you', 'he', 'we', 'they'],
  we: ['I', 'you', 'he', 'she', 'they'],
  they: ['I', 'you', 'he', 'she', 'we'],
  me: ['him', 'her', 'us', 'them', 'you'],
  him: ['me', 'her', 'us', 'them', 'you'],
  her: ['me', 'him', 'us', 'them', 'you'],
  us: ['me', 'him', 'her', 'them', 'you'],
  them: ['me', 'him', 'her', 'us', 'you'],
  my: ['your', 'his', 'her', 'our', 'their'],
  your: ['my', 'his', 'her', 'our', 'their'],
  his: ['my', 'your', 'her', 'our', 'their'],
  our: ['my', 'your', 'his', 'her', 'their'],
  their: ['my', 'your', 'his', 'her', 'our'],

  every: ['each', 'any', 'some', 'this', 'that', 'all'],
  day: ['night', 'morning', 'week', 'month', 'time'],
  morning: ['evening', 'night', 'day', 'afternoon', 'week'],
  night: ['morning', 'evening', 'day', 'week', 'month'],
  week: ['day', 'month', 'year', 'morning', 'night'],
  time: ['day', 'hour', 'minute', 'week', 'moment'],
  today: ['yesterday', 'tomorrow', 'now', 'later', 'tonight'],
  yesterday: ['today', 'tomorrow', 'now', 'later', 'tonight'],
  now: ['today', 'later', 'soon', 'yesterday', 'tomorrow'],
  later: ['now', 'soon', 'today', 'yesterday', 'tomorrow'],

  here: ['there', 'inside', 'outside', 'nearby', 'upstairs'],
  inside: ['outside', 'here', 'there', 'upstairs', 'downstairs'],
  outside: ['inside', 'here', 'there', 'upstairs', 'downstairs'],
  online: ['offline', 'here', 'there', 'inside', 'outside'],

  room: ['door', 'window', 'kitchen', 'office', 'classroom'],
  door: ['window', 'room', 'gate', 'wall', 'floor'],
  window: ['door', 'room', 'wall', 'floor', 'gate'],
  documents: ['tickets', 'messages', 'letters', 'files', 'papers'],
  document: ['ticket', 'message', 'letter', 'file', 'paper'],
  tickets: ['documents', 'messages', 'cards', 'receipts', 'passes'],
  food: ['coffee', 'tea', 'water', 'bread', 'meal'],
  coffee: ['tea', 'water', 'food', 'milk', 'juice'],
  app: ['website', 'program', 'service', 'tool', 'system'],
  password: ['code', 'login', 'account', 'email', 'username'],
  people: ['students', 'workers', 'users', 'friends', 'guests'],
  money: ['cash', 'card', 'price', 'payment', 'change'],
  cash: ['money', 'card', 'price', 'payment', 'change'],
  phone: ['message', 'email', 'call', 'screen', 'number'],
  message: ['email', 'call', 'letter', 'note', 'text'],
  call: ['message', 'email', 'letter', 'note', 'text'],
  plan: ['rule', 'idea', 'task', 'project', 'schedule'],
  problem: ['question', 'answer', 'task', 'issue', 'mistake'],
  work: ['job', 'task', 'project', 'plan', 'office'],
  English: ['Spanish', 'French', 'grammar', 'lesson', 'language'],
  TV: ['radio', 'phone', 'screen', 'video', 'movie'],
  music: ['sound', 'song', 'radio', 'voice', 'video'],
  body: ['hand', 'head', 'arm', 'leg', 'back'],

  not: ['never', 'always', 'also', 'still', 'already'],
  too: ['also', 'very', 'so', 'enough', 'quite'],
  many: ['much', 'few', 'some', 'several', 'all'],
  often: ['always', 'never', 'sometimes', 'rarely', 'usually'],
  quickly: ['slowly', 'carefully', 'clearly', 'quietly', 'easily'],
  carefully: ['quickly', 'clearly', 'slowly', 'quietly', 'easily'],
  clearly: ['quickly', 'carefully', 'slowly', 'quietly', 'easily'],

  good: ['bad', 'well', 'better', 'useful', 'easy'],
  hard: ['easy', 'hardly', 'harder', 'difficult', 'simple'],
  easy: ['hard', 'difficult', 'easily', 'simple', 'useful'],
  useful: ['useless', 'helpful', 'good', 'important', 'easy'],
  cold: ['hot', 'warm', 'cool', 'fresh', 'dry'],
  late: ['early', 'later', 'soon', 'ready', 'busy'],

  enjoy: ['like', 'hate', 'avoid', 'finish', 'practice'],
  like: ['enjoy', 'hate', 'avoid', 'need', 'prefer'],
  hate: ['like', 'enjoy', 'avoid', 'prefer', 'need'],
  avoid: ['enjoy', 'like', 'hate', 'need', 'prefer'],
  finish: ['start', 'continue', 'stop', 'complete', 'practice'],
  keep: ['stop', 'start', 'continue', 'avoid', 'finish'],
  learn: ['study', 'practice', 'read', 'write', 'speak'],
  practice: ['learn', 'study', 'repeat', 'read', 'write'],
  check: ['send', 'use', 'open', 'close', 'clean'],
  using: ['use', 'uses', 'used', 'working', 'opening'],
  Stop: ['Start', 'Continue', 'Keep', 'Try', 'Avoid'],
  Thank: ['Ask', 'Tell', 'Call', 'Help', 'Leave'],

  cleaned: ['clean', 'cleans', 'cleaning', 'checked', 'opened'],
  checked: ['check', 'checks', 'checking', 'cleaned', 'sent'],
  sold: ['sell', 'sells', 'selling', 'sent', 'checked'],
  cooked: ['cook', 'cooks', 'cooking', 'made', 'cleaned'],
  made: ['make', 'makes', 'making', 'cooked', 'used'],
  closed: ['close', 'closes', 'closing', 'opened', 'checked'],
  opened: ['open', 'opens', 'opening', 'closed', 'checked'],
  sent: ['send', 'sends', 'sending', 'checked', 'used'],
  used: ['use', 'uses', 'using', 'checked', 'sent'],
  kept: ['keep', 'keeps', 'keeping', 'checked', 'closed'],
};

const FALLBACKS = {
  ing: ['working', 'reading', 'writing', 'learning', 'practicing'],
  ed: ['clean', 'cleans', 'cleaning', 'checked', 'opened'],
  s: ['work', 'works', 'working', 'did', 'does'],
  default: ['this', 'that', 'some', 'any', 'other'],
};

function readStringLiterals(src) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(src))) out.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  return out;
}

function quoteLike(value, quote) {
  return quote + String(value).replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`) + quote;
}

function candidatesFor(correct) {
  const exact = CURATED[correct] ?? CURATED[correct.toLowerCase()];
  if (exact) return exact;
  const lower = correct.toLowerCase();
  if (lower.endsWith('ing')) return FALLBACKS.ing;
  if (lower.endsWith('ed')) return FALLBACKS.ed;
  if (lower.endsWith('s') && lower.length > 3) return FALLBACKS.s;
  return FALLBACKS.default;
}

function improve(correct, distractors) {
  if (PRONOUN_CORRECT.has(correct.toLowerCase())) {
    const curated = candidatesFor(correct);
    return curated.length >= 5 ? curated.slice(0, 5) : distractors;
  }
  if (!distractors.some((d) => GENERIC_PRONOUNS.has(d.toLowerCase()))) return distractors;

  const seen = new Set([correct.toLowerCase()]);
  const out = [];
  for (const d of distractors) {
    const key = d.toLowerCase();
    if (GENERIC_PRONOUNS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  for (const candidate of candidatesFor(correct)) {
    if (out.length >= 5) break;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out.length >= 5 ? out.slice(0, 5) : distractors;
}

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
let lesson = null;
let inWordsEn = false;
let changed = 0;

const next = lines.map((line) => {
  const lessonMatch = line.match(/id:\s*['"]lesson(\d+)_phrase_\d+['"]/);
  if (lessonMatch) {
    lesson = Number(lessonMatch[1]);
    inWordsEn = false;
  }
  if (line.includes('wordsEn:')) inWordsEn = true;
  if (!TARGET.has(lesson) || !inWordsEn || !line.includes('distractors:')) return line;

  const dMatch = line.match(/distractors:\s*\[([^\]]*)\]/);
  const cMatch = line.match(/correct:\s*(['"])((?:\\.|(?!\1).)*?)\1/);
  if (!dMatch || !cMatch) return line;

  const correct = cMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
  const distractors = readStringLiterals(dMatch[1]);
  const improved = improve(correct, distractors);
  if (improved.join('\u0000') === distractors.join('\u0000')) return line;

  changed += 1;
  const quote = dMatch[1].trim().startsWith('"') ? '"' : "'";
  return line.replace(/distractors:\s*\[[^\]]*\]/, `distractors: [${improved.map((v) => quoteLike(v, quote)).join(', ')}]`);
});

fs.writeFileSync(FILE, next.join('\n'), 'utf8');
console.log(`Improved lesson 22/23 semantic distractor rows: ${changed}`);
