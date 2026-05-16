import fs from 'node:fs';

const FILES = ['app/lesson_data_17_24.ts', 'app/lesson_data_25_32.ts'];
const TARGET = new Set([24, 25, 26, 27, 28, 29, 30, 32]);
const GENERIC_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
const PRONOUN_CORRECT = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their', 'its',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
]);

const CURATED = {
  I: ['you', 'he', 'she', 'we', 'they'],
  You: ['I', 'he', 'she', 'we', 'they'],
  He: ['I', 'you', 'she', 'we', 'they'],
  She: ['I', 'you', 'he', 'we', 'they'],
  We: ['I', 'you', 'he', 'she', 'they'],
  They: ['I', 'you', 'he', 'she', 'we'],
  it: ['this', 'that', 'them', 'him', 'her'],
  me: ['him', 'her', 'us', 'them', 'you'],
  her: ['me', 'him', 'us', 'them', 'you'],
  your: ['my', 'his', 'her', 'our', 'their'],
  yourselves: ['yourself', 'ourselves', 'themselves', 'himself', 'herself'],

  a: ['an', 'the', 'this', 'that', 'some'],
  an: ['a', 'the', 'this', 'that', 'some'],
  the: ['a', 'an', 'this', 'that', 'these'],
  The: ['A', 'An', 'This', 'That', 'These'],
  This: ['That', 'These', 'Those', 'The', 'A'],
  These: ['This', 'That', 'Those', 'The', 'A'],
  that: ['which', 'who', 'what', 'this', 'those'],

  have: ['has', 'had', 'having', 'do', 'did'],
  has: ['have', 'had', 'having', 'is', 'was'],
  had: ['have', 'has', 'having', 'did', 'was'],
  Have: ['Has', 'Had', 'Having', 'Do', 'Did'],
  Has: ['Have', 'Had', 'Having', 'Is', 'Was'],
  will: ['would', 'can', 'could', 'should', 'did'],
  would: ['will', 'can', 'could', 'should', 'did'],
  could: ['can', 'will', 'would', 'should', 'did'],
  can: ['could', 'will', 'would', 'should', 'did'],
  Can: ['Could', 'Will', 'Would', 'Should', 'Did'],
  cannot: ['can', 'could', 'will not', 'should not', 'did not'],
  Should: ['Can', 'Could', 'Would', 'Will', 'Did'],

  just: ['already', 'yet', 'ever', 'never', 'still'],
  already: ['just', 'yet', 'ever', 'never', 'still'],
  yet: ['already', 'just', 'ever', 'never', 'still'],
  ever: ['never', 'already', 'just', 'yet', 'always'],
  never: ['ever', 'already', 'just', 'yet', 'always'],
  not: ['never', 'already', 'still', 'also', 'yet'],

  If: ['When', 'Unless', 'Because', 'Although', 'Whether'],
  if: ['when', 'unless', 'because', 'although', 'whether'],
  while: ['when', 'because', 'although', 'unless', 'if'],
  before: ['after', 'while', 'when', 'until', 'since'],
  but: ['and', 'or', 'so', 'because', 'although'],
  without: ['with', 'before', 'after', 'because', 'although'],
  then: ['now', 'later', 'after', 'before', 'soon'],

  said: ['told', 'asked', 'says', 'say', 'tell'],
  told: ['said', 'asked', 'tells', 'tell', 'says'],
  ask: ['tell', 'say', 'answer', 'explain', 'report'],
  tell: ['say', 'ask', 'answer', 'explain', 'report'],
  Remind: ['Tell', 'Ask', 'Call', 'Warn', 'Help'],

  who: ['which', 'that', 'whose', 'whom', 'where'],
  which: ['who', 'that', 'whose', 'whom', 'where'],
  where: ['when', 'which', 'that', 'who', 'why'],
  whose: ['who', 'whom', 'which', 'that', 'where'],
  What: ['Which', 'Who', 'Where', 'When', 'Why'],
  Why: ['What', 'Where', 'When', 'Who', 'How'],
  How: ['What', 'Where', 'When', 'Who', 'Why'],

  used: ['use', 'uses', 'using', 'would', 'did'],
  use: ['used', 'uses', 'using', 'would', 'did'],
  using: ['use', 'uses', 'used', 'working', 'opening'],

  every: ['each', 'any', 'some', 'this', 'that'],
  day: ['night', 'morning', 'week', 'month', 'time'],
  night: ['morning', 'evening', 'day', 'week', 'month'],
  summer: ['winter', 'spring', 'autumn', 'year', 'month'],
  time: ['day', 'hour', 'minute', 'week', 'moment'],
  today: ['yesterday', 'tomorrow', 'now', 'later', 'tonight'],
  yesterday: ['today', 'tomorrow', 'now', 'later', 'tonight'],
  now: ['today', 'later', 'soon', 'yesterday', 'tomorrow'],
  later: ['now', 'soon', 'today', 'yesterday', 'tomorrow'],
  soon: ['now', 'later', 'today', 'tomorrow', 'tonight'],
  noon: ['midnight', 'morning', 'evening', 'night', "o'clock"],
  midnight: ['noon', 'morning', 'evening', 'night', "o'clock"],
  "o'clock": ['noon', 'midnight', 'morning', 'evening', 'night'],
  six: ['seven', 'eight', 'nine', 'noon', "o'clock"],
  eight: ['six', 'seven', 'nine', 'noon', "o'clock"],

  here: ['there', 'inside', 'outside', 'nearby', 'upstairs'],
  there: ['here', 'inside', 'outside', 'nearby', 'upstairs'],
  outside: ['inside', 'here', 'there', 'nearby', 'upstairs'],
  home: ['work', 'school', 'office', 'room', 'house'],
  near: ['far', 'inside', 'outside', 'here', 'there'],
  up: ['down', 'back', 'out', 'in', 'away'],
  back: ['up', 'down', 'out', 'in', 'away'],

  room: ['door', 'window', 'kitchen', 'office', 'classroom'],
  door: ['window', 'room', 'gate', 'wall', 'floor'],
  dinner: ['breakfast', 'lunch', 'food', 'meal', 'coffee'],
  coffee: ['tea', 'water', 'food', 'milk', 'juice'],
  food: ['coffee', 'tea', 'water', 'bread', 'meal'],
  money: ['cash', 'card', 'price', 'payment', 'change'],
  bag: ['box', 'case', 'pocket', 'wallet', 'backpack'],
  phone: ['message', 'email', 'call', 'screen', 'number'],
  message: ['email', 'call', 'letter', 'note', 'text'],
  email: ['message', 'call', 'letter', 'note', 'text'],
  app: ['website', 'program', 'service', 'tool', 'system'],
  TV: ['radio', 'phone', 'screen', 'video', 'movie'],
  music: ['sound', 'song', 'radio', 'voice', 'video'],
  movie: ['video', 'show', 'music', 'story', 'game'],
  password: ['code', 'login', 'account', 'email', 'username'],
  people: ['students', 'workers', 'users', 'friends', 'guests'],
  question: ['answer', 'problem', 'task', 'idea', 'mistake'],
  answer: ['question', 'problem', 'task', 'idea', 'mistake'],
  problem: ['question', 'answer', 'task', 'issue', 'mistake'],
  option: ['choice', 'answer', 'question', 'plan', 'idea'],
  truth: ['lie', 'answer', 'fact', 'story', 'reason'],
  light: ['heat', 'sound', 'power', 'door', 'window'],
  bus: ['train', 'car', 'taxi', 'ticket', 'station'],
  English: ['Spanish', 'French', 'grammar', 'lesson', 'language'],

  quickly: ['slowly', 'carefully', 'clearly', 'quietly', 'easily'],
  slowly: ['quickly', 'carefully', 'clearly', 'quietly', 'easily'],
  confidently: ['carefully', 'clearly', 'quickly', 'slowly', 'quietly'],
  often: ['always', 'never', 'sometimes', 'rarely', 'usually'],
  together: ['alone', 'apart', 'here', 'there', 'inside'],
  much: ['many', 'more', 'less', 'some', 'enough'],
  more: ['less', 'much', 'many', 'some', 'enough'],
  less: ['more', 'much', 'many', 'some', 'enough'],

  ready: ['busy', 'late', 'early', 'patient', 'afraid'],
  busy: ['ready', 'late', 'early', 'patient', 'afraid'],
  late: ['early', 'later', 'soon', 'ready', 'busy'],
  early: ['late', 'later', 'soon', 'ready', 'busy'],
  hot: ['cold', 'warm', 'cool', 'fresh', 'dry'],
  afraid: ['ready', 'busy', 'shy', 'patient', 'okay'],
  shy: ['afraid', 'ready', 'busy', 'patient', 'okay'],
  patient: ['busy', 'ready', 'afraid', 'shy', 'okay'],
  okay: ['ready', 'busy', 'fine', 'good', 'wrong'],
  fast: ['slow', 'quick', 'faster', 'early', 'late'],
  faster: ['slower', 'fast', 'quickly', 'early', 'late'],

  work: ['job', 'task', 'project', 'plan', 'office'],
  help: ['call', 'ask', 'support', 'work', 'answer'],
  call: ['message', 'email', 'phone', 'ask', 'tell'],
  open: ['close', 'start', 'leave', 'keep', 'bring'],
  start: ['finish', 'stop', 'continue', 'begin', 'open'],
  finish: ['start', 'continue', 'stop', 'complete', 'practice'],
  wait: ['stay', 'leave', 'start', 'stop', 'rest'],
  stay: ['leave', 'wait', 'go', 'come', 'rest'],
  rest: ['work', 'wait', 'stay', 'sleep', 'stop'],
  study: ['learn', 'practice', 'read', 'write', 'work'],
  learn: ['study', 'practice', 'read', 'write', 'speak'],
  read: ['write', 'study', 'learn', 'speak', 'see'],
  write: ['read', 'study', 'learn', 'speak', 'send'],
  teach: ['learn', 'study', 'explain', 'help', 'show'],
  live: ['work', 'stay', 'travel', 'come', 'go'],
  travel: ['stay', 'go', 'come', 'drive', 'walk'],
  drive: ['walk', 'travel', 'ride', 'go', 'come'],
  walk: ['drive', 'run', 'go', 'come', 'travel'],
  cook: ['clean', 'eat', 'drink', 'prepare', 'make'],
  drink: ['eat', 'cook', 'make', 'prepare', 'take'],
  prepare: ['cook', 'make', 'plan', 'start', 'finish'],
  bring: ['take', 'give', 'leave', 'keep', 'carry'],
  Take: ['Give', 'Bring', 'Leave', 'Keep', 'Send'],
  Give: ['Take', 'Bring', 'Leave', 'Keep', 'Send'],
  send: ['sent', 'sends', 'sending', 'write', 'call'],
  sent: ['send', 'sends', 'sending', 'wrote', 'called'],
  find: ['found', 'look', 'search', 'lose', 'see'],
  found: ['find', 'finding', 'lost', 'seen', 'met'],
  see: ['seen', 'saw', 'watch', 'look', 'find'],
  seen: ['see', 'saw', 'seeing', 'found', 'met'],
  met: ['meet', 'meeting', 'seen', 'found', 'knew'],
  made: ['make', 'makes', 'making', 'done', 'used'],
  paid: ['pay', 'pays', 'paying', 'bought', 'spent'],
  bought: ['buy', 'buys', 'buying', 'paid', 'spent'],
  lost: ['lose', 'losing', 'found', 'missed', 'forgot'],
  knew: ['know', 'knows', 'knowing', 'understood', 'remembered'],
  done: ['do', 'does', 'doing', 'made', 'finished'],
  doing: ['do', 'does', 'done', 'making', 'working'],
  come: ['go', 'came', 'coming', 'arrive', 'leave'],
  came: ['come', 'coming', 'went', 'arrived', 'left'],
  go: ['come', 'went', 'going', 'leave', 'arrive'],
  arrive: ['come', 'go', 'leave', 'stay', 'travel'],
  leave: ['stay', 'come', 'go', 'arrive', 'wait'],
  wake: ['sleep', 'rest', 'start', 'get', 'rise'],
  hurt: ['help', 'heal', 'fix', 'break', 'damage'],
  heat: ['cool', 'warm', 'light', 'burn', 'freeze'],
  control: ['manage', 'change', 'fix', 'hold', 'keep'],
  protect: ['save', 'help', 'keep', 'guard', 'cover'],
  save: ['protect', 'keep', 'spend', 'lose', 'help'],
  spend: ['save', 'pay', 'buy', 'use', 'lose'],
  blame: ['forgive', 'help', 'ask', 'tell', 'trust'],
  forgive: ['blame', 'help', 'trust', 'forget', 'remember'],
  force: ['help', 'ask', 'invite', 'allow', 'tell'],
  invite: ['ask', 'call', 'tell', 'bring', 'send'],
  trust: ['believe', 'know', 'help', 'tell', 'ask'],
  Trust: ['Believe', 'Know', 'Help', 'Tell', 'Ask'],
  Believe: ['Trust', 'Know', 'Think', 'Ask', 'Tell'],
  remember: ['forget', 'know', 'learn', 'repeat', 'keep'],
  forget: ['remember', 'know', 'learn', 'miss', 'lose'],
  understand: ['know', 'learn', 'hear', 'remember', 'explain'],
  hear: ['listen', 'see', 'know', 'understand', 'answer'],
  speak: ['talk', 'write', 'read', 'listen', 'say'],
  talk: ['speak', 'write', 'read', 'listen', 'say'],
  watch: ['see', 'look', 'read', 'listen', 'hear'],
  play: ['watch', 'work', 'study', 'practice', 'start'],
  order: ['buy', 'ask', 'send', 'prepare', 'take'],
  press: ['push', 'open', 'close', 'start', 'stop'],
  restart: ['start', 'stop', 'open', 'close', 'fix'],
  miss: ['lose', 'forget', 'missed', 'find', 'remember'],
  happen: ['occur', 'start', 'finish', 'change', 'stop'],
  want: ['need', 'like', 'prefer', 'ask', 'use'],
  need: ['want', 'use', 'ask', 'have', 'take'],
  like: ['enjoy', 'hate', 'avoid', 'need', 'prefer'],
  hate: ['like', 'enjoy', 'avoid', 'prefer', 'need'],
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

function repairFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
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

  fs.writeFileSync(file, next.join('\n'), 'utf8');
  return changed;
}

for (const file of FILES) {
  console.log(`${file}: improved ${repairFile(file)} rows`);
}
