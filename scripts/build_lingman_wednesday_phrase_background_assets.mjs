#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PHRASES = path.join(ROOT, 'content', 'lingman', 'viral_two_three_word_phrases_20260703.psv');
const DEFAULT_OUT_DIR = path.join(ROOT, '.codex-tmp', 'lingman-wednesday-viral-backgrounds', 'assets');
const DEFAULT_MANIFEST = path.join(ROOT, '.codex-tmp', 'lingman-wednesday-viral-backgrounds', 'manifest.json');
const ENV_PATH = path.join(ROOT, '.env.local');
const WIDTH = 1080;
const HEIGHT = 1920;
const DURATION_SEC = 6.333333;
const TARGET_DURATION_US = 6333333;

const rawArgs = process.argv.slice(2);

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

function argValues(name) {
  const values = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg.startsWith(`${name}=`)) values.push(arg.slice(name.length + 1));
    else if (arg === name && rawArgs[index + 1]) values.push(rawArgs[index + 1]);
  }
  return values;
}

function splitArgList(values) {
  return values
    .flatMap((value) => String(value || '').split(/[;,]/))
    .map((value) => value.trim())
    .filter(Boolean);
}

const PHRASES_PATH = path.resolve(argValue('--phrases', DEFAULT_PHRASES));
const OUT_DIR = path.resolve(argValue('--out-dir', DEFAULT_OUT_DIR));
const MANIFEST_PATH = path.resolve(argValue('--manifest', DEFAULT_MANIFEST));
const EXCLUDE_MANIFESTS = splitArgList([...argValues('--exclude-manifest'), ...argValues('--exclude-manifests')]).map((value) =>
  path.resolve(value),
);
const START = Math.max(1, Number(argValue('--start', '1')) || 1);
const LIMIT = Math.max(0, Number(argValue('--limit', '0')) || 0);
const ONLY_INDEXES = new Set(
  argValue('--only-indexes', '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
);
const DRY_RUN = rawArgs.includes('--dry-run');
const KEEP_SOURCE = rawArgs.includes('--keep-source');
const FORCE = rawArgs.includes('--force');
const SEARCH_PAGES = Math.max(1, Number(argValue('--pages', '2')) || 2);
const SEARCH_PER_PAGE = Math.max(10, Math.min(80, Number(argValue('--per-page', '40')) || 40));
const BLOCKED_METADATA_TERMS = [
  'animal',
  'bear',
  'berries',
  'berry',
  'bird',
  'birds',
  'bridge',
  'building',
  'bull',
  'cat',
  'cow',
  'deer',
  'dog',
  'flower',
  'flowers',
  'forest',
  'fox',
  'frog',
  'goat',
  'grass',
  'horse',
  'insect',
  'landscape',
  'leaf',
  'leaves',
  'lion',
  'meadow',
  'meerkat',
  'mountain',
  'nature',
  'ocean',
  'plant',
  'plum',
  'rabbit',
  'river',
  'sea',
  'sheep',
  'ski',
  'skier',
  'snow',
  'snake',
  'squirrel',
  'wildlife',
  'wolf',
];
const ALLOW_LITERAL_NATURE_SCENES = new Set([
  'literal bait: bull plus manure',
  'internet insult literalized',
  'literal gas light bait',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readEnvValue(name) {
  const direct = (process.env[name] || '').trim();
  if (direct) return direct;
  if (!fs.existsSync(ENV_PATH)) return '';
  for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() === name) return rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function parseRows(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift().split('|');
  const idx = Object.fromEntries(header.map((name, index) => [name, index]));
  return lines.map((line, index) => {
    const parts = line.split('|');
    return {
      index: index + 1,
      video: Number(parts[idx.video]),
      slot: Number(parts[idx.slot]),
      role: parts[idx.role],
      phraseEn: parts[idx.phrase_en],
      translationRu: parts[idx.translation_ru],
      note: parts[idx.note] || '',
    };
  });
}

function slug(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

function phraseKey(value) {
  return String(value).trim().toLowerCase().replace(/[^\w'\s-]/g, '').replace(/\s+/g, ' ');
}

function hasAny(hay, patterns) {
  return patterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(hay) : hay.includes(pattern)));
}

function spec(scene, visualElements, queryCandidates, extra = {}) {
  const candidates = [...new Set(queryCandidates.map((query) => query.trim()).filter(Boolean))];
  if (!candidates.length) throw new Error(`No query candidates for scene ${scene}`);
  return {
    scene,
    visualElements: [...new Set(visualElements.map((item) => item.trim().toLowerCase()).filter(Boolean))],
    queryCandidates: candidates,
    query: candidates[0],
    ...extra,
  };
}

function conversationSceneFor(key, hay) {
  const is = (items) => items.includes(key);
  const everyday = (scene, visualElements, queryCandidates, allowedBlockedTerms = []) =>
    spec(scene, visualElements, queryCandidates, { allowedBlockedTerms });

  const spokenSparkHooks = new Set([
    'fix this phrase',
    'sound more fluent',
    'use natural english',
    'speak with rhythm',
    'stop stiff answers',
    'say this faster',
    'upgrade this line',
    'make english click',
    'stop bad habits',
    'use better chunks',
    'say it smoother',
    'sound more relaxed',
    'reply with confidence',
    'use smarter replies',
    'fix your wording',
    'try native phrasing',
    'stop textbook speech',
    'use everyday english',
    'make it practical',
    'say this first',
    'keep it friendly',
    'ask more naturally',
    'answer more clearly',
    'use softer english',
    'sound polite fast',
    'stop long answers',
    'make it vivid',
    'use real reactions',
    'speak like people',
    'fix the tone',
    'use chat english',
    'write cleaner messages',
    'sound warmer online',
    'use work phrases',
    'sound sharper',
    'meeting phrase time',
    'plan in english',
    'calendar phrases now',
    'use travel english',
    'speak while traveling',
    'food phrase time',
    'order without panic',
    'money phrase set',
    'talk price better',
    'home english now',
    'use house phrases',
    'friend talk upgrade',
    'plans sound easy',
    'feelings in english',
    'say emotions simply',
    'study phrase set',
    'learn without stress',
    'tech english now',
    'fix device talk',
    'polite phrase set',
    'ask without pressure',
    'finish in english',
    'final useful phrases',
    'remember these chunks',
    'last speech upgrade',
  ]);
  if (spokenSparkHooks.has(key)) {
    return everyday('language speaking cue', ['language app', 'phone', 'hand'], [
      'language app phone hand close up',
      'english learning app phone hand',
      'person speaking english lesson phone',
    ]);
  }

  const lovedEverydayExact = new Map([
    [
      "i'm game",
      everyday('choice with game cue', ['game', 'choice', 'hand'], [
        'board game choice hand close up',
        'friends playing board game hand',
        'game controller hand choice close up',
      ]),
    ],
    [
      "how's life",
      everyday('friendly life check in', ['friends', 'conversation', 'phone'], [
        'friends cafe conversation phone close up',
        'friends greeting phone close up',
        'two friends talking coffee phone',
      ], ['building']),
    ],
    [
      'seriously though',
      everyday('serious conversation cue', ['serious face', 'conversation', 'hand'], [
        'serious conversation hand gesture close up',
        'person serious face talking hand gesture',
        'two people serious discussion close up',
      ], ['building']),
    ],
    [
      'please do',
      everyday('permission gesture', ['hand', 'door', 'smile'], [
        'door hand smile close up',
        'person inviting hand gesture door',
        'friendly permission hand gesture close up',
        'person holding door smile hand',
      ], ['building']),
    ],
    [
      'oh please',
      everyday('skeptical eye roll', ['eyes', 'face', 'gesture'], [
        'person rolling eyes hand gesture close up',
        'skeptical face eye roll close up',
        'annoyed person eye roll hand gesture',
      ]),
    ],
    [
      "i'm joining",
      everyday('joining group activity', ['group', 'hand', 'activity'], [
        'person joining group activity hand',
        'friends group activity hand close up',
        'hand joining group table activity',
      ], ['building']),
    ],
    [
      'forget that',
      everyday('discard note reminder', ['paper', 'trash', 'hand'], [
        'hand crumpling paper note close up',
        'person throwing note in trash hand',
        'crossing out note paper hand',
      ]),
    ],
    [
      'wait up',
      everyday('wait hand gesture', ['hand', 'wait', 'phone'], [
        'person holding hand wait gesture',
        'hand gesture wait phone close up',
        'phone call wait hand close up',
      ]),
    ],
    [
      "i'm short",
      everyday('not enough cash', ['wallet', 'cash', 'card'], [
        'empty wallet cash card close up',
        'person checking empty wallet hand',
        'wallet few coins hand close up',
      ]),
    ],
    [
      'raise this',
      everyday('raise topic in meeting', ['meeting', 'hand', 'notes'], [
        'business meeting hand notes close up',
        'person raising hand meeting notes',
        'office meeting notebook hand close up',
      ], ['building']),
    ],
    [
      'vibe well',
      everyday('friends good vibe', ['friends', 'smile', 'conversation'], [
        'friends laughing cafe conversation',
        'friends smiling conversation close up',
        'group friends positive vibe close up',
      ], ['building']),
    ],
    [
      'invite out',
      everyday('date invitation phone', ['phone', 'calendar', 'couple'], [
        'phone calendar date invitation hand',
        'couple planning date phone close up',
        'hand texting invitation phone close up',
      ]),
    ],
    [
      'fall out',
      everyday('friends argument', ['friends', 'argument', 'phone'], [
        'friends arguing phone close up',
        'two friends argument close up',
        'friendship conflict phone hand',
      ], ['building']),
    ],
    [
      'straighten up',
      everyday('tidy room action', ['room', 'cleaning', 'hand'], [
        'person tidying room hand close up',
        'cleaning messy table hand close up',
        'straightening objects on table hand',
      ], ['building']),
    ],
    [
      'almost there',
      everyday('progress nearly done', ['progress', 'phone', 'hand'], [
        'phone progress bar hand close up',
        'map route almost arrived phone hand',
        'checklist nearly complete hand close up',
      ]),
    ],
    [
      'sign in',
      everyday('login screen action', ['laptop', 'login', 'hand'], [
        'laptop login screen hand close up',
        'hand typing password laptop close up',
        'phone login screen hand close up',
      ], ['building']),
    ],
    [
      'solve this',
      everyday('puzzle problem solving', ['puzzle', 'solution', 'hand'], [
        'puzzle solution hand close up',
        'person solving puzzle hand',
        'sticky notes solution hand close up',
      ]),
    ],
    [
      'you nailed it',
      everyday('nailed success cue', ['nail', 'hammer', 'hand'], [
        'hammer nail hand close up',
        'person hammering nail hand',
        'nail in wood hammer close up',
      ]),
    ],
    [
      'manage it',
      everyday('task manager checklist', ['checklist', 'task', 'hand'], [
        'checklist task hand close up',
        'person managing tasks laptop hand',
        'to do list hand pen close up',
      ]),
    ],
    [
      'need a breather',
      everyday('short calm break', ['coffee', 'desk', 'hand'], [
        'coffee break desk hand close up',
        'person taking break coffee desk',
        'calm breathing hand chest close up',
      ], ['building']),
    ],
    [
      'make it right',
      everyday('repair mistake action', ['tools', 'repair', 'hand'], [
        'hand repairing object tools close up',
        'person fixing broken item hand',
        'tools repair table hand close up',
      ]),
    ],
    [
      "you shouldn't have",
      everyday('gift surprise thanks', ['gift', 'hands', 'smile'], [
        'gift box hands smile close up',
        'person receiving gift hands close up',
        'surprised gift box hands close up',
      ]),
    ],
    [
      'think it over',
      everyday('thinking over notes', ['notebook', 'choice', 'hand'], [
        'notebook choice hand thinking',
        'person thinking over notes hand',
        'decision notes hand close up',
      ]),
    ],
    [
      'come down with',
      everyday('getting sick medicine', ['medicine', 'tissue', 'hand'], [
        'medicine tissue hand close up',
        'sick person holding tissue medicine',
        'medicine bottle hand close up',
      ]),
    ],
    [
      'quit now',
      everyday('stop choice sign', ['stop', 'choice', 'hand'], [
        'stop sign hand close up',
        'hand choosing stop option',
        'person pressing stop button hand',
      ]),
    ],
    [
      'on the low',
      everyday('secret whisper phone', ['whisper', 'phone', 'hand'], [
        'person whispering phone hand close up',
        'secret message phone hand close up',
        'friends whispering close up phone',
      ]),
    ],
    [
      'show off',
      everyday('showing off phone', ['phone', 'hand', 'attention'], [
        'person showing phone to friends hand',
        'hand showing photo phone close up',
        'person bragging phone hand gesture',
      ]),
    ],
    [
      'looks great',
      everyday('plated food reaction', ['food', 'plate', 'table'], [
        'restaurant food plate table close up',
        'plated meal table close up',
        'restaurant dish plate table',
      ]),
    ],
  ]);
  if (lovedEverydayExact.has(key)) return lovedEverydayExact.get(key);

  const beamEverydayExact = new Map([
    [
      'everyone saves these',
      everyday('saved phrase list phone', ['phone', 'save', 'hand'], [
        'phone save list hand close up',
        'hand saving post phone close up',
        'bookmark saved phone hand',
      ]),
    ],
    [
      'works for everyone',
      everyday('group agreement cue', ['people', 'phone', 'hand'], [
        'people agreeing phone hand close up',
        'group friends phone hand close up',
        'people smiling around phone hand',
      ], ['building']),
    ],
    [
      "i'm sorted",
      everyday('organized checklist task', ['checklist', 'desk', 'hand'], [
        'checklist organized desk hand close up',
        'task list checked hand desk',
        'organized desk checklist hand',
      ], ['building']),
    ],
    [
      'come with me',
      everyday('walking together invite', ['people', 'street', 'walking'], [
        'two people walking together street',
        'friend inviting walk street hand',
        'people walking side by side street',
      ], ['building']),
    ],
    [
      "you're safe",
      everyday('reassuring support gesture', ['friend', 'hand', 'shoulder'], [
        'friend reassuring hand shoulder close up',
        'person comforting friend hand shoulder',
        'supportive hand shoulder close up',
      ], ['building']),
    ],
    [
      'bit much',
      everyday('overwhelmed notifications', ['phone', 'notifications', 'hand'], [
        'phone notifications overwhelmed hand close up',
        'too many messages phone hand',
        'person overwhelmed phone notifications',
      ], ['building']),
    ],
    [
      'please relax',
      everyday('calm down breathing', ['breathing', 'hand', 'chest'], [
        'calm breathing hand chest close up',
        'person relaxing breathing hand chest',
        'breathing exercise hand chest',
      ], ['building']),
    ],
    [
      'go right ahead',
      everyday('permission doorway gesture', ['door', 'hand', 'smile'], [
        'person holding door smile hand',
        'friendly permission hand gesture door',
        'doorway inviting hand gesture',
      ], ['building']),
    ],
    [
      'hit send',
      everyday('tap send phone', ['phone', 'send', 'hand'], [
        'finger tapping send button phone',
        'phone message send hand close up',
        'hand sending message phone close up',
      ]),
    ],
    [
      'i follow you',
      everyday('listening understanding nod', ['conversation', 'face', 'hand'], [
        'person listening nodding conversation hand',
        'calm conversation nodding face hand',
        'two people listening conversation close up',
      ], ['building']),
    ],
    [
      'close but no',
      everyday('almost correct answer', ['notebook', 'answer', 'hand'], [
        'notebook answer correction hand close up',
        'teacher checking answer notebook hand',
        'student answer almost correct notebook',
      ]),
    ],
    [
      'what changed',
      everyday('change question notes', ['question', 'notes', 'hand'], [
        'question notes hand close up',
        'before after notes hand',
        'person checking changed notes hand',
      ], ['building']),
    ],
    [
      'any reason',
      everyday('question note prompt', ['question', 'notebook', 'hand'], [
        'question notebook hand close up',
        'hand writing question mark notebook',
        'person asking question notebook hand',
      ]),
    ],
    [
      'pencil me in',
      everyday('calendar pencil scheduling', ['calendar', 'pencil', 'hand'], [
        'calendar pencil hand close up',
        'hand writing calendar pencil',
        'pencil scheduling calendar hand',
      ]),
    ],
    [
      'works perfectly',
      everyday('task success checkmark', ['checklist', 'hand', 'desk'], [
        'checklist success hand desk close up',
        'task completed checkmark hand',
        'person checking completed task desk',
      ], ['building']),
    ],
    [
      'book it',
      everyday('booking calendar phone', ['calendar', 'phone', 'hand'], [
        'phone calendar booking hand close up',
        'hand booking appointment phone',
        'calendar reservation phone hand',
      ]),
    ],
    [
      'calls stop awkwardness',
      everyday('phone call confidence', ['phone', 'call', 'hand'], [
        'phone call hand close up',
        'person speaking phone call hand',
        'video call phone hand close up',
      ], ['building']),
    ],
    [
      'retry once',
      everyday('phone retry action', ['phone', 'button', 'hand'], [
        'phone retry button hand close up',
        'hand tapping try again button phone',
        'phone error button hand',
      ]),
    ],
    [
      'lead from here',
      everyday('meeting leadership handoff', ['meeting', 'leader', 'hand'], [
        'meeting leader hand gesture close up',
        'person leading meeting hand notes',
        'office leader presenting hand close up',
      ], ['building']),
    ],
    [
      'table this',
      everyday('meeting table agenda', ['meeting', 'table', 'laptop'], [
        'meeting table laptop notes close up',
        'office agenda table laptop hand',
        'business meeting table documents hand',
      ], ['building']),
    ],
    [
      'back it up',
      everyday('computer backup drive', ['drive', 'laptop', 'hand'], [
        'external hard drive laptop hand',
        'computer backup drive hand close up',
        'hand connecting drive laptop',
      ], ['building']),
    ],
    [
      'log out fully',
      everyday('logout screen action', ['laptop', 'logout', 'hand'], [
        'laptop logout screen hand close up',
        'hand clicking logout laptop',
        'phone logout screen hand close up',
      ], ['building']),
    ],
    [
      "i'm covered",
      everyday('bill covered payment', ['wallet', 'card', 'bill'], [
        'wallet card bill hand close up',
        'person paying bill card hand',
        'receipt card wallet hand close up',
      ]),
    ],
    [
      "i'm stuffed",
      everyday('full plate restaurant', ['food', 'plate', 'hand'], [
        'empty plate restaurant hand close up',
        'restaurant plate food hand',
        'person full at restaurant table',
      ]),
    ],
    [
      'food phrases everyone',
      everyday('restaurant menu food phone', ['food', 'menu', 'phone'], [
        'restaurant food menu phone hand',
        'menu food plate phone close up',
        'restaurant table food menu phone',
      ]),
    ],
    [
      'try it on',
      everyday('trying clothes mirror', ['clothes', 'mirror', 'hand'], [
        'person trying clothes mirror hand',
        'clothes mirror hand close up',
        'shopping fitting room mirror hand',
      ], ['building']),
    ],
    [
      'any discount',
      everyday('shopping discount counter', ['shop', 'counter', 'hand'], [
        'shopping discount counter hand close up',
        'cashier counter card hand',
        'sale tag shop hand close up',
      ], ['building']),
    ],
    [
      "i'll take it",
      everyday('buying item counter', ['shop', 'hand', 'counter'], [
        'hand buying item counter close up',
        'shopping counter card hand',
        'person taking item shop counter',
      ], ['building']),
    ],
    [
      'passport ready',
      everyday('passport airport hand', ['passport', 'airport', 'hand'], [
        'passport airport hand close up',
        'hand holding passport airport',
        'passport boarding pass hand',
      ], ['building']),
    ],
    [
      'boarding now',
      everyday('airport boarding gate', ['airport', 'gate', 'hand'], [
        'airport boarding gate hand close up',
        'boarding pass airport gate hand',
        'person boarding airport gate',
      ], ['building']),
    ],
    [
      'drop luggage',
      everyday('airport baggage drop', ['luggage', 'airport', 'hand'], [
        'airport baggage drop luggage hand',
        'suitcase baggage counter airport hand',
        'person dropping luggage airport counter',
      ], ['building']),
    ],
    [
      'hotel phrases help',
      everyday('hotel reception check in', ['hotel', 'reception', 'hand'], [
        'hotel reception passport hand close up',
        'hotel front desk key card hand',
        'hotel reception check in hand',
      ], ['building']),
    ],
    [
      'room key',
      everyday('hotel key card hand', ['hotel', 'key', 'hand'], [
        'hotel key card hand close up',
        'room key card hotel hand',
        'hotel door key card hand',
      ], ['building']),
    ],
    [
      'checkout time',
      everyday('hotel checkout clock', ['hotel', 'clock', 'hand'], [
        'hotel checkout clock hand close up',
        'hotel reception checkout hand',
        'clock hotel room key hand',
      ], ['building']),
    ],
    [
      'late checkout',
      everyday('hotel checkout request', ['hotel', 'reception', 'hand'], [
        'hotel reception checkout hand close up',
        'hotel front desk key card hand',
        'person at hotel reception hand',
      ], ['building']),
    ],
    [
      'quiet room',
      everyday('quiet hotel room', ['hotel', 'room', 'bed'], [
        'quiet hotel room bed close up',
        'hotel room bed window quiet',
        'hotel room key bed close up',
      ], ['building']),
    ],
    [
      'directions stop panic',
      everyday('street map directions phone', ['map', 'street', 'phone'], [
        'street map phone hand close up',
        'person checking map phone street',
        'city directions phone hand street',
      ], ['building']),
    ],
    [
      'go straight',
      everyday('straight street direction', ['street', 'sign', 'phone'], [
        'street direction sign phone hand',
        'phone map straight route street',
        'city street sign phone hand',
      ], ['building']),
    ],
    [
      'make a right',
      everyday('right turn street map', ['right', 'street', 'phone'], [
        'right turn street phone map',
        'phone map right turn hand',
        'street corner direction phone hand',
      ], ['building']),
    ],
    [
      'across street',
      everyday('crosswalk street direction', ['crosswalk', 'street', 'phone'], [
        'crosswalk street phone hand',
        'person at crosswalk phone map',
        'street crossing direction phone',
      ], ['building']),
    ],
    [
      'near entrance',
      everyday('building entrance location', ['entrance', 'street', 'phone'], [
        'building entrance phone hand',
        'street entrance sign phone hand',
        'person near entrance phone map',
      ], ['building']),
    ],
    [
      'make tea',
      everyday('tea cup kitchen hand', ['tea', 'cup', 'hand'], [
        'tea cup kitchen hand close up',
        'hand pouring tea cup close up',
        'kettle tea cup hand',
      ], ['building']),
    ],
    [
      'pick this up',
      everyday('pickup counter bag', ['bag', 'counter', 'hand'], [
        'hand picking up bag counter',
        'pickup order bag hand close up',
        'person picking up package counter',
      ], ['building']),
    ],
    [
      'drop it off',
      everyday('delivery drop off package', ['package', 'door', 'hand'], [
        'package drop off door hand',
        'delivery package doorstep hand',
        'hand leaving package at door',
      ], ['building']),
    ],
    [
      'nearly arrived',
      everyday('route almost arrived phone', ['map', 'route', 'phone'], [
        'phone map route almost arrived hand',
        'person checking route phone hand',
        'navigation route phone hand close up',
      ], ['building']),
    ],
    [
      'need anything',
      everyday('helpful offer gesture', ['help', 'hand', 'friend'], [
        'friend offering help hand gesture',
        'person helping friend hand close up',
        'supportive help gesture conversation',
      ], ['building']),
    ],
    [
      'faint suddenly',
      everyday('dizzy health support', ['medicine', 'hand', 'phone'], [
        'dizzy person medicine phone hand',
        'health emergency phone hand close up',
        'person feeling dizzy holding phone',
      ], ['building']),
    ],
    [
      'mind out',
      everyday('warning sign caution', ['warning', 'sign', 'hand'], [
        'warning sign hand close up',
        'caution sign hand close up',
        'person pointing warning sign hand',
      ], ['building']),
    ],
    [
      'still okay',
      everyday('okay reassurance gesture', ['face', 'hand', 'gesture'], [
        'okay hand gesture face close up',
        'person reassuring okay gesture',
        'calm okay gesture hand face',
      ], ['building']),
    ],
    [
      'you have me',
      everyday('supportive friend hand', ['friend', 'hand', 'shoulder'], [
        'supportive friend hand shoulder',
        'friend comforting hand close up',
        'person supporting friend hand',
      ], ['building']),
    ],
    [
      'keep breathing',
      everyday('calm breathing support', ['breathing', 'hand', 'chest'], [
        'calm breathing hand chest close up',
        'person breathing calm hand chest',
        'breathing exercise hand chest',
      ], ['building']),
    ],
    [
      'not comfortable',
      everyday('boundary conversation', ['conversation', 'gesture', 'face'], [
        'serious boundary conversation hand gesture',
        'person saying no hand gesture conversation',
        'calm uncomfortable conversation face hand',
      ], ['building']),
    ],
    [
      'i caused it',
      everyday('apology mistake conversation', ['apology', 'conversation', 'hand'], [
        'apology conversation hand gesture',
        'person apologizing hand gesture',
        'mistake apology conversation close up',
      ], ['building']),
    ],
    [
      "won't happen again",
      everyday('promise apology gesture', ['promise', 'hand', 'face'], [
        'promise hand gesture face close up',
        'person apologizing promise gesture',
        'calm promise conversation hand',
      ], ['building']),
    ],
    [
      "i'm out",
      everyday('polite exit doorway', ['door', 'hand', 'bag'], [
        'person leaving door with bag',
        'hand opening door leaving',
        'polite exit doorway hand',
      ], ['building']),
    ],
    [
      'please stop',
      everyday('stop hand boundary', ['stop', 'hand', 'gesture'], [
        'stop hand gesture close up',
        'person saying stop hand gesture',
        'boundary stop gesture face',
      ], ['building']),
    ],
    [
      'dating sounds normal',
      everyday('date conversation phone', ['date', 'phone', 'conversation'], [
        'couple date conversation phone close up',
        'dating phone message hand table',
        'couple cafe conversation phone',
      ], ['building']),
    ],
    [
      'invite them out',
      everyday('date invitation phone', ['phone', 'calendar', 'hand'], [
        'phone calendar date invitation hand',
        'hand texting invitation phone close up',
        'couple planning date phone hand',
      ]),
    ],
    [
      'make peace',
      everyday('reconcile conversation', ['friends', 'conversation', 'hand'], [
        'friends reconcile conversation hand close up',
        'apology handshake friends close up',
        'two friends making peace conversation',
      ], ['building']),
    ],
    [
      'resemble dad',
      everyday('family resemblance photo', ['family', 'photo', 'hand'], [
        'family photo hand close up',
        'person holding family photo',
        'father child family photo hand',
      ]),
    ],
    [
      'family dinner',
      everyday('family dinner table', ['family', 'dinner', 'table'], [
        'family dinner table hands close up',
        'family dinner table conversation',
        'dinner table family hands',
      ], ['building']),
    ],
    [
      'motivation worth saving',
      everyday('saved motivation notes', ['notebook', 'goal', 'hand'], [
        'goal notebook hand close up',
        'motivation notes hand desk',
        'hand writing goal notebook',
      ], ['building']),
    ],
    [
      'start small',
      everyday('small first step', ['step', 'shoe', 'street'], [
        'first step shoe street close up',
        'person taking small step shoes',
        'walking first step shoes close up',
      ], ['building']),
    ],
    [
      "don't drop it",
      everyday('keep going practice', ['practice', 'hand', 'notebook'], [
        'practice notebook hand close up',
        'person continuing practice notes',
        'hand writing practice checklist',
      ], ['building']),
    ],
    [
      'you grew fast',
      everyday('progress growth chart', ['progress', 'chart', 'hand'], [
        'progress chart hand close up',
        'person checking growth chart hand',
        'progress graph notebook hand',
      ], ['building']),
    ],
    [
      'one step',
      everyday('one step shoes', ['step', 'shoe', 'street'], [
        'one step shoe street close up',
        'foot stepping forward street',
        'person taking step shoes close up',
      ], ['building']),
    ],
    [
      'deal with it',
      everyday('problem solving desk', ['problem', 'desk', 'hand'], [
        'problem solving desk hand notes',
        'person handling problem laptop hand',
        'sticky notes problem solution hand',
      ], ['building']),
    ],
    [
      'fixes sound simple',
      everyday('simple repair tools', ['tools', 'repair', 'hand'], [
        'simple repair tools hand close up',
        'hand fixing object tools',
        'repair tools table hand',
      ]),
    ],
    [
      'patch it',
      everyday('software update patch', ['laptop', 'update', 'hand'], [
        'laptop update screen hand close up',
        'software update laptop hand',
        'hand clicking update laptop',
      ], ['building']),
    ],
    [
      'bypass issue',
      everyday('workaround route map', ['map', 'route', 'hand'], [
        'route detour map hand close up',
        'phone map alternate route hand',
        'workaround sticky notes hand',
      ], ['building']),
    ],
    [
      'try another way',
      everyday('alternate solution notes', ['solution', 'notebook', 'hand'], [
        'alternate solution notebook hand',
        'sticky notes solution hand close up',
        'person choosing another option notes',
      ], ['building']),
    ],
    [
      'absorb quickly',
      everyday('study quickly notes', ['study', 'notebook', 'hand'], [
        'study notebook hand close up',
        'study notebook highlighter hand',
        'person learning from notebook hand',
      ]),
    ],
    [
      'repeat once',
      everyday('repeat practice notebook', ['practice', 'notebook', 'hand'], [
        'language practice notebook hand close up',
        'hand writing repeated phrase notebook',
        'student repeating notes hand',
      ]),
    ],
    [
      'refresh basics',
      everyday('review basics book', ['book', 'notes', 'hand'], [
        'study book notes hand close up',
        'review basics notebook hand',
        'person reviewing textbook notes hand',
      ]),
    ],
    [
      'check answers',
      everyday('answer check notebook', ['answers', 'notebook', 'hand'], [
        'answers notebook hand close up',
        'hand checking answers notebook',
        'student checking answers notes',
      ]),
    ],
    [
      "what's new",
      everyday('friend update phone', ['phone', 'message', 'hand'], [
        'phone update message hand close up',
        'friend message phone hand',
        'person reading new message phone',
      ]),
    ],
    [
      'busy week',
      everyday('busy week calendar', ['calendar', 'week', 'hand'], [
        'busy week calendar hand close up',
        'calendar week schedule hand',
        'phone calendar busy week hand',
      ]),
    ],
    [
      'weather talk works',
      everyday('weather phone street', ['weather', 'phone', 'hand'], [
        'weather phone hand street',
        'person checking weather phone hand',
        'rain weather phone hand close up',
      ], ['building']),
    ],
    [
      'looks chilly',
      everyday('chilly coat weather', ['coat', 'weather', 'hand'], [
        'chilly weather coat hand',
        'person holding coat cold weather',
        'coat zipper hand chilly street',
      ], ['building']),
    ],
    [
      "it's pouring",
      everyday('rain street umbrella', ['rain', 'street', 'umbrella'], [
        'rain street umbrella phone hand',
        'person with umbrella rainy street',
        'rainy street umbrella close up',
      ], ['building']),
    ],
    [
      'take a coat',
      everyday('coat weather door', ['coat', 'door', 'hand'], [
        'hand taking coat by door',
        'person putting on coat doorway',
        'coat hanger hand close up',
      ], ['building']),
    ],
    [
      'feels humid',
      everyday('humid weather window', ['window', 'weather', 'hand'], [
        'humid window hand close up',
        'person checking humid weather phone',
        'weather phone hand window',
      ], ['building']),
    ],
    [
      'great choice',
      everyday('choice approval gesture', ['choice', 'hand', 'phone'], [
        'choice approval phone hand',
        'hand choosing option phone close up',
        'person pointing choice phone hand',
      ]),
    ],
    [
      'cracks me up',
      everyday('laughing friend reaction', ['laughing', 'friend', 'phone'], [
        'friend laughing phone close up',
        'person laughing at phone message',
        'friends laughing conversation phone',
      ], ['building']),
    ],
    [
      'blow up',
      everyday('viral post phone', ['phone', 'post', 'hand'], [
        'viral social media post phone hand',
        'phone notifications viral post hand',
        'social media likes phone hand close up',
      ]),
    ],
    [
      'tag me',
      everyday('tag social phone', ['phone', 'tag', 'hand'], [
        'social media tag phone hand',
        'hand tagging person phone',
        'phone social tag hand close up',
      ]),
    ],
    [
      'sleep on it',
      everyday('sleep decision bed', ['bed', 'phone', 'hand'], [
        'bed phone hand night close up',
        'person thinking in bed phone',
        'nightstand phone bed hand',
      ], ['building']),
    ],
    [
      'negotiations feel easier',
      everyday('negotiation handshake table', ['handshake', 'meeting', 'table'], [
        'negotiation handshake table close up',
        'business meeting handshake table',
        'people agreeing handshake table',
      ], ['building']),
    ],
    [
      'burn out',
      everyday('burned out desk', ['desk', 'coffee', 'hand'], [
        'burned out office desk coffee hand',
        'tired person laptop desk hand',
        'exhausted desk coffee hand close up',
      ], ['building']),
    ],
    [
      'feel burned',
      everyday('burned out desk', ['desk', 'coffee', 'hand'], [
        'burned out office desk coffee hand',
        'tired person laptop desk hand',
        'exhausted desk coffee hand close up',
      ], ['building']),
    ],
    [
      'meet halfway',
      everyday('negotiation handshake table', ['handshake', 'table', 'meeting'], [
        'negotiation handshake table close up',
        'business handshake meeting table',
        'two people agreeing handshake table',
      ], ['building']),
    ],
    [
      'give a little',
      everyday('negotiation concession notes', ['meeting', 'notes', 'hand'], [
        'negotiation notes hand meeting table',
        'business meeting concession notes hand',
        'people discussing notes meeting hand',
      ], ['building']),
    ],
    [
      'sounds reasonable',
      everyday('agreement handshake', ['handshake', 'meeting', 'hand'], [
        'agreement handshake meeting close up',
        'business meeting handshake hand',
        'two people agree handshake close up',
      ], ['building']),
    ],
    [
      'what for',
      everyday('why question notebook', ['question', 'notebook', 'hand'], [
        'question notebook hand close up',
        'why question notes hand',
        'hand writing question mark notebook',
      ]),
    ],
    [
      "i'm leaving",
      everyday('leaving doorway bag', ['door', 'bag', 'hand'], [
        'person leaving door with bag',
        'hand opening door leaving bag',
        'leaving home doorway bag hand',
      ], ['building']),
    ],
    [
      'step inside',
      everyday('welcoming doorway', ['door', 'hand', 'home'], [
        'home door hand gesture',
        'person opening door inviting hand',
        'home door open hand close up',
      ], ['building']),
    ],
    [
      'take some',
      everyday('snacks offer hand', ['food', 'hand', 'table'], [
        'snacks on table hand offering',
        'hand offering snacks table close up',
        'food plate hand take some',
      ]),
    ],
    [
      'sit anywhere',
      everyday('living room sofa seat', ['sofa', 'room', 'hand'], [
        'living room sofa hand gesture',
        'person pointing to sofa seat',
        'home sofa room hand gesture',
      ], ['building']),
    ],
    [
      'feel at home',
      everyday('cozy home sofa', ['home', 'sofa', 'room'], [
        'cozy home sofa room',
        'person relaxing home sofa',
        'warm living room sofa close up',
      ], ['building']),
    ],
    [
      'rest well',
      everyday('bed rest alarm', ['bed', 'alarm', 'hand'], [
        'bed alarm hand close up',
        'person resting bed alarm',
        'nightstand alarm bed hand',
      ], ['building']),
    ],
    [
      'have fun',
      everyday('friends having fun phone', ['friends', 'smile', 'phone'], [
        'friends smiling phone close up',
        'friends having fun phone',
        'happy friends phone close up',
      ], ['building']),
    ],
    [
      'stay up',
      everyday('late night phone bed', ['bed', 'phone', 'hand'], [
        'late night phone bed hand',
        'person awake in bed phone',
        'night phone bed hand close up',
      ], ['building']),
    ],
    [
      'wake early',
      everyday('morning alarm bed', ['alarm', 'bed', 'hand'], [
        'morning alarm bed hand close up',
        'hand stopping alarm clock bed',
        'person waking alarm bed',
      ], ['building']),
    ],
    [
      'get dressed',
      everyday('getting dressed clothes', ['clothes', 'mirror', 'hand'], [
        'clothes mirror hand close up',
        'person getting dressed mirror',
        'hand choosing clothes closet',
      ], ['building']),
    ],
    [
      'warm up first',
      everyday('gym warm up', ['gym', 'exercise', 'hand'], [
        'gym warm up exercise hand',
        'person warming up gym close up',
        'fitness warm up mat hand',
      ], ['building']),
    ],
    [
      'train today',
      everyday('gym training workout', ['gym', 'training', 'hand'], [
        'gym training hand close up',
        'person training gym weights hand',
        'workout gym exercise hand',
      ], ['building']),
    ],
    [
      'stretch slowly',
      everyday('slow stretch mat', ['stretch', 'mat', 'hand'], [
        'person stretching mat hand close up',
        'slow stretch yoga mat hand',
        'fitness stretch mat close up',
      ], ['building']),
    ],
    [
      'have water',
      everyday('water bottle gym', ['water', 'bottle', 'hand'], [
        'water bottle hand gym close up',
        'person drinking water bottle hand',
        'water bottle workout hand',
      ], ['building']),
    ],
    [
      'wipe it down',
      everyday('cleaning surface cloth', ['cleaning', 'cloth', 'hand'], [
        'cleaning surface cloth hand close up',
        'hand wiping table cloth',
        'cleaning spray cloth hand',
      ]),
    ],
    [
      'store it away',
      everyday('storage box shelf', ['box', 'shelf', 'hand'], [
        'storage box shelf hand close up',
        'hand putting item in box',
        'person organizing shelf box hand',
      ], ['building']),
    ],
    [
      'trash it',
      everyday('trash bin hand', ['trash', 'bin', 'hand'], [
        'hand throwing paper trash bin',
        'trash bin hand close up',
        'person putting item in trash bin',
      ]),
    ],
    [
      'looks tidy',
      everyday('tidy room table', ['tidy', 'room', 'table'], [
        'tidy room table close up',
        'clean organized table room',
        'person tidying table room',
      ], ['building']),
    ],
    [
      'bus leaves',
      everyday('bus stop schedule', ['bus', 'stop', 'phone'], [
        'bus stop schedule phone hand',
        'person waiting bus stop phone',
        'bus arriving stop phone hand',
      ], ['building']),
    ],
    [
      'board now',
      everyday('bus boarding door', ['bus', 'door', 'hand'], [
        'boarding bus door hand close up',
        'person boarding bus door',
        'bus door hand rail close up',
      ], ['building']),
    ],
    [
      'missed stop',
      everyday('train station missed stop', ['station', 'phone', 'hand'], [
        'train station phone hand close up',
        'person checking station phone',
        'missed stop transit phone hand',
      ], ['building']),
    ],
    [
      'next station',
      everyday('train station sign', ['station', 'train', 'phone'], [
        'train station sign phone hand',
        'metro station phone hand close up',
        'next station train phone hand',
      ], ['building']),
    ],
    [
      'need assistance',
      everyday('service counter assistance', ['service', 'counter', 'hand'], [
        'service counter assistance hand close up',
        'customer service counter hand',
        'person asking assistance counter',
      ], ['building']),
    ],
    [
      'hold please',
      everyday('customer service phone hold', ['phone', 'hold', 'hand'], [
        'customer service phone hold hand',
        'phone call hold screen hand close up',
        'person holding phone call hand',
      ]),
    ],
    [
      'wrong order',
      everyday('wrong food order', ['order', 'food', 'hand'], [
        'wrong food order receipt hand',
        'restaurant order bag hand close up',
        'food order receipt hand table',
      ]),
    ],
    [
      'manager please',
      everyday('manager service counter', ['manager', 'counter', 'hand'], [
        'customer service counter manager hand',
        'person asking manager counter',
        'service desk conversation hand',
      ], ['building']),
    ],
    [
      'secrets sound natural',
      everyday('secret whisper friends', ['whisper', 'friends', 'phone'], [
        'friends whispering phone close up',
        'secret conversation friends phone',
        'person whispering friend phone',
      ], ['building']),
    ],
    [
      'between us',
      everyday('secret whisper friends', ['whisper', 'friends', 'phone'], [
        'friends whispering phone close up',
        'secret conversation friends phone',
        'person whispering friend phone',
      ], ['building']),
    ],
    [
      'stay silent',
      everyday('quiet gesture mouth', ['quiet', 'gesture', 'face'], [
        'quiet finger lips gesture close up',
        'person making quiet gesture face',
        'shh gesture face close up',
      ]),
    ],
    [
      'quietly though',
      everyday('quiet whisper phone', ['whisper', 'phone', 'hand'], [
        'person whispering phone hand close up',
        'quiet message phone hand',
        'secret phone message hand',
      ]),
    ],
    [
      "don't tell",
      everyday('secret no tell gesture', ['secret', 'gesture', 'face'], [
        'secret gesture face close up',
        'person whispering no tell gesture',
        'finger lips secret gesture',
      ]),
    ],
    [
      "can't make it",
      everyday('calendar decline phone', ['calendar', 'phone', 'hand'], [
        'calendar decline phone hand close up',
        'phone calendar cancel hand',
        'person declining invite phone',
      ]),
    ],
    [
      "i'll pass",
      everyday('polite decline gesture', ['gesture', 'face', 'hand'], [
        'polite decline hand gesture face',
        'person saying no hand gesture',
        'calm no gesture conversation',
      ], ['building']),
    ],
    [
      'another day maybe',
      everyday('reschedule calendar phone', ['calendar', 'phone', 'hand'], [
        'reschedule calendar phone hand',
        'phone calendar another day hand',
        'hand choosing new calendar date',
      ]),
    ],
    [
      'thanks anyway',
      everyday('thanks polite gesture', ['hand', 'smile', 'gesture'], [
        'polite thanks hand gesture smile',
        'person smiling thanks hand gesture',
        'friendly thanks gesture close up',
      ], ['building']),
    ],
    [
      'refusals stay polite',
      everyday('polite decline gesture', ['gesture', 'face', 'hand'], [
        'polite decline hand gesture face',
        'person saying no hand gesture',
        'calm no gesture conversation',
      ], ['building']),
    ],
    [
      'lands differently',
      everyday('message reaction different', ['phone', 'message', 'face'], [
        'phone message reaction face close up',
        'person reacting to phone message',
        'different reaction phone face',
      ], ['building']),
    ],
    [
      'save this batch',
      everyday('saved batch list phone', ['phone', 'save', 'hand'], [
        'phone save list hand close up',
        'hand saving list phone',
        'phone bookmark saved hand',
      ]),
    ],
    [
      'save the list',
      everyday('save list phone', ['phone', 'list', 'hand'], [
        'phone list hand close up',
        'hand saving list phone',
        'saved list phone hand',
      ]),
    ],
    [
      'stick with it',
      everyday('consistent practice notes', ['practice', 'notebook', 'hand'], [
        'consistent practice notebook hand',
        'hand writing daily practice notes',
        'study habit checklist hand',
      ], ['building']),
    ],
    [
      'repeat daily',
      everyday('daily habit calendar', ['calendar', 'habit', 'hand'], [
        'daily habit calendar hand close up',
        'hand marking calendar daily',
        'habit tracker notebook hand',
      ]),
    ],
  ]);
  if (beamEverydayExact.has(key)) return beamEverydayExact.get(key);

  if (hasAny(hay, [/hotel|room key|checkout|quiet room/])) {
    return everyday('hotel reception room', ['hotel', 'reception', 'hand'], [
      'hotel reception key card hand',
      'hotel room key card hand',
      'hotel front desk hand close up',
    ], ['building']);
  }
  if (hasAny(hay, [/direction|location|street|entrance|straight|right turn|across/])) {
    return everyday('street directions phone', ['street', 'phone', 'hand'], [
      'street directions phone hand',
      'phone map street hand close up',
      'city street sign phone hand',
    ], ['building']);
  }
  if (hasAny(hay, [/fitness|train|stretch|workout|water/])) {
    return everyday('fitness workout action', ['gym', 'hand', 'exercise'], [
      'gym exercise hand close up',
      'workout mat hand exercise',
      'person training gym hand',
    ], ['building']);
  }
  if (hasAny(hay, [/cleaning|wipe|store|trash|tidy/])) {
    return everyday('cleaning home action', ['cleaning', 'hand', 'table'], [
      'cleaning table hand close up',
      'hand wiping surface cloth',
      'home organizing table hand',
    ], ['building']);
  }
  if (hasAny(hay, [/transport|\bbus\b|boarding|\bstation\b|missed stop|next station/])) {
    return everyday('public transport stop', ['bus', 'station', 'phone'], [
      'bus stop station phone hand',
      'train station phone hand close up',
      'public transport phone hand',
    ], ['building']);
  }
  if (hasAny(hay, [/service|assistance|manager|wrong order|hold/])) {
    return everyday('customer service counter', ['service', 'counter', 'hand'], [
      'customer service counter hand',
      'service desk conversation hand',
      'person asking assistance counter',
    ], ['building']);
  }

  // Clean conversational packs need concrete everyday contexts, not the rude-pack
  // generic reaction fallback. Route by the phrase note/theme before broader slang rules.
  if (hasAny(hay, [/saveable|reply|replies|answer|chat|text|message|updates?|phone|online|social media|post|viral|keep contact|daily use/])) {
    return everyday('phone message reply', ['phone', 'message', 'hand'], [
      'phone message hand close up',
      'hand texting phone message close up',
      'social media post phone hand close up',
      'person reading chat message phone',
    ]);
  }
  if (hasAny(hay, [/\bwork\b|meeting|email|office|laptop|deadline|presentation|budget|review|status|update|question|opinion|form|account|device|tech|file|copy|login|sign in|restart|frozen|finish|arrange|responsibility|take responsibility/])) {
    return everyday('office laptop task', ['office', 'laptop', 'hand'], [
      'office laptop hand close up',
      'business meeting laptop notes hand',
      'person typing email laptop close up',
      'online form laptop hand close up',
    ], ['building']);
  }
  if (hasAny(hay, [/plan|plans|calendar|schedule|choice|decision|time|later|soon|moment|wait|delay|earlier|free|ready|preparation/])) {
    return everyday('calendar time planning', ['calendar', 'clock', 'hand'], [
      'phone calendar hand close up',
      'calendar clock hand close up',
      'person checking time phone hand',
      'hand choosing calendar date',
    ]);
  }
  if (hasAny(hay, [/travel|airport|platform|plane|boarding|seat|hotel|reservation|lost|direction|way|arrive|return|station|suitcase/])) {
    return everyday('travel suitcase airport', ['suitcase', 'airport', 'hand'], [
      'airport suitcase hand close up',
      'person with suitcase airport close up',
      'train platform suitcase hand',
      'hotel reception passport hand close up',
    ], ['building']);
  }
  if (hasAny(hay, [/food|restaurant|eat|table|plate|order|delivery|menu|towel|medicine|sick|health|throw up/])) {
    if (hasAny(hay, [/medicine|sick|health|throw up/])) {
      return everyday('medicine health help', ['medicine', 'hand', 'phone'], [
        'medicine bottle hand phone close up',
        'person holding medicine hand close up',
        'pharmacy medicine hand close up',
      ]);
    }
    return everyday('restaurant food order', ['food', 'plate', 'phone'], [
      'restaurant table food phone',
      'menu plate hand close up',
      'food delivery phone plate close up',
      'waiter bringing food plate close up',
    ]);
  }
  if (hasAny(hay, [/money|price|pay|repay|wallet|card|cash|bill|receipt|change|cost|cheap|expensive/])) {
    return everyday('wallet receipt payment', ['wallet', 'cash', 'card'], [
      'wallet cash card hand close up',
      'receipt card hand close up',
      'restaurant bill card hand close up',
      'person paying card close up',
    ]);
  }
  if (hasAny(hay, [/friend|date|relationship|support|feeling|feelings|encouragement|gratitude|thanks|apology|sorry|compliment|warm|kind|proud|nervous|moved|space|boundary|pressure|listen|curious|conversation|talk|disagree|polite|tone|soft|rude|awkward|humor|funny|laugh|crying|kidding|reaction|response|agreement|agree|point|reassurance|anxiety|interest|blame|mistake|dismiss|repair|decline|surprise|praise|confidence|problem|solution|fix mess|understanding|brag|summary|mention|look at|invite in|reduce volume/])) {
    return everyday('friends conversation support', ['friends', 'conversation', 'phone'], [
      'friends conversation phone hand close up',
      'friends comforting conversation phone close up',
      'friends conversation sofa phone',
      'friends calm conversation phone hand',
    ], ['building']);
  }
  if (hasAny(hay, [/home|door|guest|errands|busy|shopping|shop|clothes|browsing|fit|cashier|counter|pick up|grab|bag|clean|lift|morning/])) {
    if (hasAny(hay, [/shopping|shop|clothes|browsing|fit|cashier|counter/])) {
      return everyday('shopping counter clothes', ['shop', 'hand', 'counter'], [
        'shopping counter card hand close up',
        'clothes rack mirror hand close up',
        'cashier counter hand close up',
        'person browsing shop hand close up',
      ], ['building']);
    }
    return everyday('home doorway errands', ['door', 'bag', 'hand'], [
      'person at door bag hand',
      'hand picking up bag counter',
      'person leaving door with bag',
      'home doorway hand close up',
    ], ['building']);
  }
  if (hasAny(hay, [/learn|study|practice|student|notes?|example|explain|clear|search|look over|review|dictionary|language|english|summary phrase|mention|understanding/])) {
    return everyday('study notes language', ['notebook', 'phone', 'hand'], [
      'study notebook phone hand close up',
      'english learning app phone hand',
      'student writing notes hand close up',
      'person reviewing notes laptop hand',
    ]);
  }
  if (hasAny(hay, [/careful|watch out|safe|safety|alert|help|parent|child|mature|job|motivation|stop|continue|break|stress|swamped|burn out|pushing/])) {
    if (hasAny(hay, [/parent|child|mature|job/])) {
      return everyday('parent child daily care', ['child', 'hand', 'home'], [
        'parent helping child hand close up',
        'child picking up toys hand',
        'parent child conversation home',
      ], ['building']);
    }
    if (hasAny(hay, [/stress|swamped|burn out|break/])) {
      return everyday('work stress break', ['desk', 'coffee', 'hand'], [
        'office desk coffee hand close up',
        'stressed person office desk hand',
        'coffee break desk hand close up',
        'person overwhelmed laptop desk',
      ], ['building']);
    }
    return everyday('warning help phone', ['phone', 'warning', 'hand'], [
      'phone emergency call hand close up',
      'warning sign phone hand close up',
      'person holding phone alert close up',
      'hand gesture stop warning close up',
    ], ['building']);
  }

  if (is(['say this', 'real english', 'use this', 'sound natural', 'try this', 'speak easier', 'say less', 'say naturally', 'stop translating', 'use phrasals', 'sound casual', 'talk smoother', 'speak today', 'more fluent', 'talk like this', 'sound confident', 'learning phrases', 'final upgrade', 'native speakers', 'use daily', 'more human', 'use naturally', 'conversation fuel', 'useful chunk', 'better smalltalk', 'useful softeners', 'sound curious', 'say it better', 'keep this', 'say it right', 'sound less stiff', 'stop word swapping', 'use real chunks', 'speak in chunks', 'fix this mistake', 'upgrade your reply', 'stop sounding translated', 'use this answer', 'say it casually', 'stop overthinking it', 'choose this wording', 'learn this chunk', 'use it today', "don't translate that", 'say this instead', 'stop robotic english', 'make it shorter', 'speak more directly', 'remember the pattern', 'watch the verb', 'use fewer words', 'say it softer', 'use this opener', 'fix your opener', 'use this closer', "don't sound rude", 'say no nicely', 'ask like this', 'reply like this', 'use better tone', "don't say maybe", 'say maybe better', 'use emotion chunks', 'use study chunks', 'study smarter', 'use polite chunks', 'ask politely', 'use final chunks', 'last useful set'])) {
    return everyday('language speaking cue', ['language app', 'phone', 'hand'], [
      'language app phone hand close up',
      'english learning app phone hand',
      'person speaking english lesson phone',
    ]);
  }
  if (is(['stop guessing', 'quick fix', 'remember this', 'tiny difference', 'not literal', 'better wording', 'make it clear', 'try again'])) {
    return everyday('learning correction cue', ['notebook', 'question', 'hand'], [
      'notebook question mark hand close up',
      'student thinking notebook question',
      'teacher correcting notes close up',
    ]);
  }
  if (is(['look up', 'find out', 'look into', 'dig into', 'clear up', 'spell out', 'sum up'])) {
    return everyday('search or explain on screen', ['laptop', 'search', 'hand'], [
      'laptop search hand close up',
      'person searching laptop close up',
      'hand typing search laptop',
    ], ['building']);
  }
  if (is(['put off', 'set aside', 'put aside', 'maybe later', 'rain check'])) {
    return everyday('calendar delay or postpone', ['calendar', 'clock', 'hand'], [
      'calendar clock hand close up',
      'person moving calendar date',
      'phone calendar reminder hand',
    ]);
  }
  if (is(['give up', 'push through', 'keep at it', 'fall behind', 'keep going', 'keep up', 'speed up', 'slow down'])) {
    return everyday('effort and pace', ['runner', 'effort', 'timer'], [
      'runner effort timer close up',
      'person training timer effort',
      'athlete tired timer close up',
    ]);
  }
  if (is(['work out', 'figure out', 'sort out', 'pull off', 'pull it off', 'nail it', 'catch on'])) {
    return everyday('problem solved result', ['puzzle', 'solution', 'hand'], [
      'puzzle solution hand close up',
      'person solving puzzle hand',
      'sticky notes solution hand',
    ]);
  }
  if (is(['come over', 'drop by', 'stop by', 'show up', 'turn up', 'come back', 'get back', 'head out', 'get in', 'get out'])) {
    return everyday('arrival or doorway movement', ['door', 'person', 'hand'], [
      'person at door hand close up',
      'person entering door hand',
      'person leaving door hand',
    ], ['building']);
  }
  if (is(['move on', 'leave behind', 'go back', 'turn back', 'walk away', 'let go'])) {
    return everyday('moving forward or leaving behind', ['walking away', 'street', 'bag'], [
      'person walking away street bag',
      'walking away with suitcase street',
      'person leaving bag street',
    ], ['building']);
  }
  if (is(['call back', 'reach out', 'check in', 'text me', 'hit me up', 'ping me', 'keep me posted', 'send over', 'pass along', 'put through', 'loop in'])) {
    return everyday('phone message contact', ['phone', 'message', 'hand'], [
      'phone message hand close up',
      'hand texting phone close up',
      'email message laptop phone hand',
    ]);
  }
  if (is(['sign up', 'log in', 'fill out', 'hand in'])) {
    return everyday('device form or account action', ['laptop', 'form', 'hand'], [
      'laptop online form hand close up',
      'hand typing login laptop close up',
      'phone charging cable hand close up',
    ], ['building']);
  }
  if (is(['write down', 'take notes', 'go over', 'run through', 'bring up', 'follow up', 'circle back', 'touch base', 'take over', 'take charge', 'step up', 'step in', 'point out'])) {
    return everyday('office meeting action', ['office', 'laptop', 'hand'], [
      'office laptop hand meeting close up',
      'business meeting laptop hand notes',
      'person pointing at laptop office',
    ], ['building']);
  }
  if (is(['pay back', 'chip in', 'cash out', 'split it', 'pay off', 'save up', 'cut back', 'my treat'])) {
    return everyday('money wallet payment', ['wallet', 'cash', 'card'], [
      'wallet cash card hand close up',
      'restaurant bill card hand close up',
      'saving money jar cash hand',
    ]);
  }
  if (is(['eat out', 'order in', 'run out', 'take out', 'go without'])) {
    return everyday('food order or empty supply', ['food', 'phone', 'plate'], [
      'food delivery phone plate close up',
      'restaurant table food phone',
      'empty plate phone close up',
    ]);
  }
  if (is(['open up', 'talk honestly', 'break up', 'make up', 'patch things up', 'get over', 'mean well', 'cheer up', 'lighten up'])) {
    return everyday('relationship conversation', ['couple', 'conversation', 'phone'], [
      'couple conversation phone close up',
      'friends comforting conversation close up',
      'couple talking on sofa phone',
    ], ['building']);
  }
  if (is(['wake up', 'sleep in', 'warm up', 'cool down', 'chill out', 'calm down', 'loosen up', 'take it easy'])) {
    return everyday('body calm or routine', ['bed', 'alarm', 'hand'], [
      'alarm clock bed hand close up',
      'person breathing calm sofa',
      'gym warm up water hand',
    ], ['building']);
  }
  if (is(['look around', 'pick out', 'try on', 'wear out', 'dress up'])) {
    return everyday('shopping clothes action', ['clothes', 'mirror', 'hand'], [
      'clothes rack mirror hand close up',
      'person trying clothes mirror',
      'shopping clothes hand close up',
    ], ['building']);
  }
  if (is(['check bags', 'fly out', 'land safely', 'pull over', 'get on', 'get off', 'take off'])) {
    return everyday('travel transport action', ['suitcase', 'airport', 'hand'], [
      'airport suitcase hand close up',
      'person with suitcase airport',
      'train door suitcase hand',
    ], ['building']);
  }
  if (is(['turn on', 'turn off', 'turn around', 'put away', 'put together', 'take apart', 'take back', 'clean up', 'tidy up', 'cut out', 'leave out'])) {
    return everyday('hands object action', ['hand', 'object', 'table'], [
      'hand object table close up',
      'person cleaning table hand',
      'hands assembling object table',
    ]);
  }
  if (is(['ask out', 'hang out', 'go out', 'stay in', "i'm down", "i'm in", 'count me in', 'works for me', 'that works', 'whenever works', "let's pencil it"])) {
    return everyday('plans with phone calendar', ['phone', 'calendar', 'hand'], [
      'phone calendar hand close up',
      'friends planning phone calendar',
      'person checking calendar phone',
    ]);
  }
  if (is(['soft disagree', 'not really', 'not quite', 'not necessarily', 'that depends', 'i doubt it', 'fair enough', 'kind of', 'sort of', 'more or less', 'pretty much'])) {
    return everyday('calm disagreement conversation', ['conversation', 'gesture', 'face'], [
      'calm conversation hand gesture face',
      'person explaining with hand gesture',
      'two people calm discussion close up',
    ], ['building']);
  }
  if (is(['after you', 'go ahead', 'be my guest', 'no problem', 'could you help', 'would you mind', 'sorry about that'])) {
    return everyday('polite service doorway', ['door', 'smile', 'hand'], [
      'person holding door smile hand',
      'polite service counter hand smile',
      'friendly gesture doorway close up',
    ], ['building']);
  }
  if (is(["what's up", "how's it going", 'been too long', "glad you're here", 'what happened', "what's going on", 'any update', 'how come'])) {
    return everyday('greeting or question', ['phone', 'question', 'face'], [
      'phone question face close up',
      'friends greeting close up',
      'person surprised phone question',
    ], ['building']);
  }
  if (is(['rule out', "let's go with", "i'm torn", "i'm leaning yes", 'up to you', 'plan better', 'talk about plans', 'that fits', 'better choice'])) {
    return everyday('decision choice options', ['checklist', 'choice', 'hand'], [
      'checklist choice hand close up',
      'hand choosing option cards',
      'calendar checklist decision hand',
    ]);
  }
  if (is(['break down'])) {
    return everyday('broken car problem', ['broken car', 'roadside', 'hand'], [
      'broken car roadside hand close up',
      'car breakdown roadside person',
      'person calling beside broken car',
    ], ['building']);
  }
  if (is(['put up with'])) {
    return everyday('annoying noise tolerance', ['noise', 'face', 'hand'], [
      'annoyed face noise hand close up',
      'person covering ears annoyed',
      'noisy neighbor annoyed face',
    ], ['building']);
  }
  if (is(['take after'])) {
    return everyday('family resemblance photo', ['family', 'photo', 'hand'], [
      'family photo hand close up',
      'person holding family photo',
      'family looking at photo hand',
    ]);
  }
  if (is(['get by', 'get ahead', 'get around', 'work around'])) {
    return everyday('problem workaround progress', ['laptop', 'map', 'hand'], [
      'laptop problem solving hand close up',
      'phone map hand close up',
      'office planning sticky notes hand',
    ], ['building']);
  }
  if (is(['go off'])) {
    return everyday('alarm going off', ['alarm', 'phone', 'hand'], [
      'phone alarm hand close up',
      'alarm clock ringing hand',
      'person stopping phone alarm',
    ]);
  }
  if (is(['end up', 'wind up'])) {
    return everyday('unexpected final result', ['result', 'face', 'hand'], [
      'surprised face result hand close up',
      'person looking at final result laptop',
      'unexpected result phone face',
    ], ['building']);
  }
  if (is(['check out'])) {
    return everyday('shopping browse or check out', ['shop', 'hand', 'phone'], [
      'shop browsing hand phone close up',
      'person checking product phone hand',
      'shopping checkout phone hand',
    ], ['building']);
  }
  if (is(['run into'])) {
    return everyday('unexpected street meeting', ['street', 'people', 'surprise'], [
      'people meet street surprise',
      'friends bump into each other street',
      'surprised people meeting street',
    ], ['building']);
  }
  if (is(['think over'])) {
    return everyday('decision thinking notes', ['notebook', 'choice', 'hand'], [
      'notebook choice hand thinking',
      'person thinking over notes hand',
      'decision notes hand close up',
    ]);
  }
  if (is(['look after'])) {
    return everyday('care for someone', ['child', 'care', 'hand'], [
      'caring for child hand close up',
      'adult helping child hand',
      'child care hand close up',
    ]);
  }
  if (is(['take care'])) {
    return everyday('warm goodbye care', ['smile', 'wave', 'hand'], [
      'friend goodbye wave hand smile',
      'person waving goodbye smile hand',
      'warm goodbye hand wave close up',
    ], ['building']);
  }
  if (is(['right away'])) {
    return everyday('immediate time cue', ['clock', 'hand', 'phone'], [
      'clock phone hand close up',
      'person checking time phone hand',
      'hand tapping phone clock',
    ]);
  }
  if (is(['hold on', 'hang on', 'stand by'])) {
    return everyday('wait gesture phone', ['phone', 'wait', 'hand'], [
      'phone call wait hand close up',
      'person holding hand wait gesture',
      'hand gesture wait phone',
    ]);
  }
  if (is(['cut down'])) {
    return everyday('reduce habit or budget', ['snacks', 'hand', 'receipt'], [
      'snacks receipt hand close up',
      'person cutting expenses receipt hand',
      'healthy food snacks hand close up',
    ]);
  }
  if (is(["don't panic", 'hold back'])) {
    return everyday('self control calm down', ['breathing', 'hand', 'face'], [
      'calm breathing hand face close up',
      'person calming down hand on chest',
      'self control breathing face hand',
    ]);
  }
  if (is(['stand out', 'blend in'])) {
    return everyday('crowd contrast', ['crowd', 'person', 'contrast'], [
      'one person standing out crowd',
      'person blending into crowd',
      'crowd contrast person close up',
    ], ['building']);
  }
  if (is(['pick up'])) {
    return everyday('pickup bag or order', ['bag', 'hand', 'counter'], [
      'hand picking up bag counter',
      'person picking up order bag',
      'pickup bag hand close up',
    ], ['building']);
  }
  if (is(['make out'])) {
    return everyday('hard to read text', ['blurry text', 'eyes', 'screen'], [
      'blurry text screen eyes close up',
      'person trying to read blurry screen',
      'blurry document eyes close up',
    ]);
  }
  if (is(['speak up', 'speak out'])) {
    return everyday('speaking microphone', ['microphone', 'speaker', 'hand'], [
      'person speaking microphone hand close up',
      'speaker microphone hand gesture',
      'public speaking microphone close up',
    ], ['building']);
  }
  if (is(['come up', 'come up with', 'think up'])) {
    return everyday('idea appears', ['idea', 'sticky notes', 'hand'], [
      'sticky notes idea hand close up',
      'brainstorm sticky notes hand',
      'person writing idea sticky notes',
    ]);
  }
  if (is(['long story short'])) {
    return everyday('summary gesture', ['notebook', 'summary', 'hand'], [
      'notebook summary hand close up',
      'person summarizing notes hand',
      'hand drawing summary on notebook',
    ]);
  }
  if (is(['board up'])) {
    return everyday('wooden boards on window', ['wooden boards', 'window', 'hand'], [
      'wooden boards window hand',
      'boarding up window wood hand',
      'hand nailing boards window',
    ], ['building']);
  }
  if (is(['charge up'])) {
    return everyday('phone battery charging', ['phone', 'battery', 'cable'], [
      'phone battery cable charging close up',
      'hand plugging cable phone battery',
      'smartphone charging cable hand',
    ]);
  }
  if (is(['plug in'])) {
    return everyday('plugging in cable', ['cable', 'hand', 'socket'], [
      'hand plugging cable socket close up',
      'person plugging cable into socket',
      'charging cable socket hand close up',
    ]);
  }
  if (is(['shut down'])) {
    return everyday('computer shutdown', ['laptop', 'power', 'hand'], [
      'laptop power button hand close up',
      'computer shutdown screen hand',
      'hand pressing laptop power button',
    ], ['building']);
  }
  if (is(['back up'])) {
    return everyday('computer backup drive', ['hard drive', 'laptop', 'hand'], [
      'external hard drive laptop hand',
      'computer backup hard drive hand',
      'hand connecting hard drive laptop',
    ], ['building']);
  }
  if (is(['brush up'])) {
    return everyday('study review skill', ['book', 'notes', 'hand'], [
      'study book notes hand close up',
      'person reviewing notes textbook',
      'hand writing study notes book',
    ]);
  }
  if (is(["i'm on it", "you're close", "that's the one", 'a bit', 'i get it', 'makes sense'])) {
    return everyday('clear reaction gesture', ['face', 'hand', 'gesture'], [
      'reaction face hand gesture close up',
      'person nodding hand gesture',
      'person pointing yes hand gesture',
    ]);
  }

  if (hasAny(hay, [/phone/, /chat/, /message/, /call/, /slack/, /email/, /notification/, /search/, /dm/])) {
    return everyday('phone message contact', ['phone', 'message', 'hand'], [
      'phone message hand close up',
      'hand texting phone close up',
      'email message laptop phone hand',
    ]);
  }
  if (hasAny(hay, [/office/, /meeting/, /laptop/, /form/, /paper/, /desk/, /whiteboard/, /work/])) {
    return everyday('office desk action', ['office', 'laptop', 'hand'], [
      'office laptop hand close up',
      'business meeting laptop hand notes',
      'person writing notes office desk',
    ], ['building']);
  }
  if (hasAny(hay, [/money/, /payment/, /wallet/, /bill/, /receipt/, /card/, /savings/, /budget/])) {
    return everyday('money wallet payment', ['wallet', 'cash', 'card'], [
      'wallet cash card hand close up',
      'restaurant bill card hand close up',
      'saving money jar cash hand',
    ]);
  }
  if (hasAny(hay, [/airport/, /suitcase/, /travel/, /plane/, /train/, /bus/, /car/, /road/, /door/, /home/, /visit/, /leaving/, /return/])) {
    return everyday('travel or door movement', ['door', 'bag', 'hand'], [
      'person at door bag hand',
      'airport suitcase hand close up',
      'person leaving door with bag',
    ], ['building']);
  }
  if (hasAny(hay, [/food/, /restaurant/, /cafe/, /delivery/, /plate/])) {
    return everyday('food order or table', ['food', 'phone', 'plate'], [
      'food delivery phone plate close up',
      'restaurant table food phone',
      'empty plate phone close up',
    ]);
  }
  if (hasAny(hay, [/couple/, /date/, /relationship/, /friend/, /feelings/, /reconcile/, /breakup/, /comfort/])) {
    return everyday('relationship conversation', ['couple', 'conversation', 'phone'], [
      'couple conversation phone close up',
      'friends comforting conversation close up',
      'couple talking on sofa phone',
    ], ['building']);
  }
  if (hasAny(hay, [/language/, /speaking/, /phrase/, /translation/, /teacher/, /student/, /learning/, /english/, /study/])) {
    return everyday('language speaking cue', ['language app', 'phone', 'hand'], [
      'language app phone hand close up',
      'english learning app phone hand',
      'student speaking english lesson phone',
    ]);
  }
  if (hasAny(hay, [/plan/, /planning/, /calendar/, /choice/, /decision/, /schedule/])) {
    return everyday('decision choice options', ['checklist', 'choice', 'hand'], [
      'checklist choice hand close up',
      'hand choosing option cards',
      'calendar checklist decision hand',
    ]);
  }
  if (hasAny(hay, [/polite/, /tone/, /reply/, /question/, /opener/, /closing/, /final/])) {
    return everyday('calm conversation wording', ['conversation', 'gesture', 'face'], [
      'calm conversation hand gesture face',
      'person explaining with hand gesture',
      'two people calm discussion close up',
    ], ['building']);
  }
  if (hasAny(hay, [/tech/, /device/, /computer/, /screen/, /account/, /file/])) {
    return everyday('device form or account action', ['laptop', 'form', 'hand'], [
      'laptop online form hand close up',
      'hand typing login laptop close up',
      'phone charging cable hand close up',
    ], ['building']);
  }
  return null;
}

function sceneFor(row) {
  const key = phraseKey(row.phraseEn);
  const hay = `${key} ${String(row.note || '').toLowerCase()}`;
  const conversational = conversationSceneFor(key, hay);
  if (conversational) return conversational;

  const exact = new Map([
    [
      'bull shit',
      spec('literal bait: bull plus manure', ['bull', 'manure', 'farm'], [
        'bull manure farm close up',
        'cow dung farm field',
        'bull in muddy farm',
      ]),
    ],
    [
      'piss off',
      spec('profane command: angry expulsion', ['angry face', 'pointing away', 'argument'], [
        'angry person pointing away argument',
        'furious woman yelling pointing finger',
        'person telling someone to leave angry',
      ]),
    ],
    [
      'pissed drunk',
      spec('literal bait: drunk person', ['drunk', 'bottle', 'night'], [
        'drunk person holding bottle night',
        'intoxicated man bar bottle',
        'person drunk nightlife bottle',
      ]),
    ],
    [
      'pissed off',
      spec('angry adjective: furious person', ['angry face', 'furious', 'argument'], [
        'furious angry face argument close up',
        'angry man yelling close up',
        'angry woman argument close up',
      ]),
    ],
    [
      'hit on',
      spec('flirting bait', ['flirting', 'couple', 'bar'], [
        'man flirting with woman bar',
        'couple flirting close up',
        'awkward flirting conversation',
      ]),
    ],
    [
      'hit me',
      spec('text me slang', ['phone', 'message', 'hand'], [
        'phone message notification close up',
        'hand texting smartphone close up',
        'chat message phone close up',
      ]),
    ],
    [
      'make sense',
      spec('meaning clicks', ['puzzle', 'idea', 'thinking'], [
        'person thinking light bulb idea',
        'puzzle pieces fitting close up',
        'confused person understands idea',
      ]),
    ],
    [
      'take place',
      spec('event location bait', ['empty venue', 'stage', 'event'], [
        'empty event venue stage',
        'conference room empty stage',
        'event hall empty chairs',
      ]),
    ],
    [
      'work out',
      spec('literal workout bait', ['gym', 'exercise', 'sweat'], [
        'gym workout exercise close up',
        'person exercising gym sweat',
        'fitness workout close up',
      ]),
    ],
    [
      'read the room',
      spec('social awareness', ['room', 'people', 'awkward silence'], [
        'awkward room people staring',
        'people in room awkward silence',
        'group reaction uncomfortable room',
      ]),
    ],
    [
      'touch grass',
      spec('internet insult literalized', ['hand', 'grass', 'outside'], [
        'hand touching grass close up',
        'person touching grass outside',
        'green grass hand close up',
      ]),
    ],
    [
      'soft launch',
      spec('hidden relationship reveal', ['couple', 'phone', 'selfie'], [
        'couple taking selfie phone',
        'hidden couple photo smartphone',
        'couple holding hands phone close up',
      ]),
    ],
    [
      'left on read',
      spec('ignored message', ['phone', 'chat', 'ignored'], [
        'ignored chat message phone',
        'smartphone chat message ignored',
        'person waiting for text reply',
      ]),
    ],
    [
      'got receipts',
      spec('proof on phone', ['phone', 'proof', 'messages'], [
        'phone screenshots proof messages',
        'person showing text messages phone',
        'smartphone chat evidence close up',
      ]),
    ],
    [
      'check receipts',
      spec('paper receipt proof', ['receipt', 'hand', 'proof'], [
        'hand holding receipt close up',
        'checking paper receipt close up',
        'receipt on table close up',
      ]),
    ],
    [
      'red flag',
      spec('relationship warning', ['red flag', 'warning', 'relationship'], [
        'red flag warning relationship',
        'woman holding red flag',
        'red warning flag close up',
      ]),
    ],
    [
      'green flag',
      spec('positive signal', ['green flag', 'hand', 'smile'], [
        'green flag hand smile',
        'green flag waving close up',
        'happy couple green light',
      ]),
    ],
    [
      'gas light',
      spec('literal gas light bait', ['gas flame', 'light', 'dark'], [
        'gas flame light close up',
        'old gas lamp flame',
        'blue gas fire close up',
      ]),
    ],
    [
      'basic bitch',
      spec('insult attitude', ['judging face', 'fashion', 'attitude'], [
        'judgmental face fashion attitude close up',
        'mean girls judging close up',
        'woman rolling eyes attitude',
      ]),
    ],
    [
      'drama queen',
      spec('dramatic overreaction', ['crying', 'dramatic', 'gesture'], [
        'dramatic woman crying close up',
        'person overreacting drama',
        'woman dramatic gesture close up',
      ]),
    ],
    [
      'middle finger',
      spec('explicit insult gesture', ['middle finger', 'angry hand', 'gesture'], [
        'middle finger angry gesture',
        'person showing middle finger',
        'rude hand gesture close up',
      ]),
    ],
  ]);
  if (exact.has(key)) return exact.get(key);

  if (
    [
      'stop translating',
      "don't translate",
      'think english',
      'your english',
      'sounds russian',
      'sounds native',
      'speak human',
      'use this',
      'memorize this',
      'stop guessing',
    ].includes(key)
  ) {
    return spec('language learning correction', ['phone', 'translation app', 'hand'], [
      'translation app phone hand close up',
      'person pointing at phone translation app',
      'student looking at phone dictionary',
      'hand holding phone language app close up',
    ]);
  }

  if (['watch closely', 'keep watching'].includes(key)) {
    return spec('watching closely', ['eyes', 'watching', 'close up'], [
      'human eyes watching close up',
      'eyes close up watching',
      'person watching carefully close up',
      'group staring reaction',
    ]);
  }

  if (['holy shit', 'no shit'].includes(key)) {
    return spec('shocked profane reaction', ['shocked face', 'hand gesture', 'reaction'], [
      'shocked face hand gesture reaction',
      'person shocked hands on face close up',
      'surprised face hand gesture close up',
      'person reacting shocked close up',
    ]);
  }

  if (['this sucks', 'sucks hard', 'kinda sucks'].includes(key)) {
    return spec('bad situation stress', ['stressed face', 'head in hands', 'panic'], [
      'stressed face head in hands panic',
      'person head in hands stressed close up',
      'frustrated person hands on head close up',
      'panic face stressed close up',
    ]);
  }

  if (['say it', 'say what', 'real talk', 'talk less', 'say less', 'be honest', 'own it'].includes(key)) {
    return spec('speaking challenge', ['mouth', 'microphone', 'gesture'], [
      'person speaking microphone hand gesture',
      'mouth speaking close up microphone',
      'person talking serious hand gesture',
      'woman speaking into microphone close up',
    ]);
  }

  if (
    [
      'shut up',
      'cut it out',
      'calm down',
      'back off',
      'leave me',
      "don't push",
      'stop talking',
      'stop whining',
      'tone down',
      'hurry up',
      'chill out',
      'grow up',
      'wake up',
      'toughen up',
      'act normal',
      'fix it',
      'fix yourself',
    ].includes(key)
  ) {
    return spec('visible stop or boundary gesture', ['angry face', 'stop hand', 'argument'], [
      'angry face stop hand argument',
      'person showing stop hand gesture argument',
      'furious person pointing finger argument',
      'woman saying stop hand gesture close up',
    ]);
  }

  if (['hard pass', 'no way', 'get real', 'fair enough', 'my bad', "you're welcome", "i can't", "can't even"].includes(key)) {
    return spec('clear refusal or reaction', ['face', 'hand gesture', 'reaction'], [
      'shocked face hand gesture reaction',
      'person refusing with hand gesture',
      'surprised reaction face hands',
      'person apologizing hand gesture close up',
    ]);
  }

  if (
    [
      "you're cooked",
      "i'm dead",
      "i'm done",
      "we're done",
      "it's over",
      'game over',
      'never again',
      "you're doomed",
      'totally cooked',
      'burned out',
      'save yourself',
    ].includes(key)
  ) {
    return spec('doom or finished visual', ['burnt', 'timer', 'panic'], [
      'burnt food timer panic',
      'person panicking timer close up',
      'burned out exhausted person desk',
      'game over screen panic reaction',
    ]);
  }

  if (
    [
      "that's bullshit",
      'total bullshit',
      'prove it',
      'stop lying',
      "don't lie",
      'i lied',
      'sounds fake',
      'try again',
      'drop proof',
      'call bullshit',
      'no cap',
      "that's cap",
    ].includes(key)
  ) {
    return spec('lie proof confrontation', ['phone', 'proof', 'argument'], [
      'phone proof argument close up',
      'person showing evidence phone argument',
      'angry argument with phone proof',
      'text message proof close up',
    ]);
  }

  if (
    [
      'holy shit',
      'no shit',
      'fuck this',
      'screw you',
      'fuck off',
      'talk shit',
      'shit happens',
      'mid as hell',
    ].includes(key)
  ) {
    return spec('profane reaction or insult', ['angry face', 'gesture', 'argument'], [
      'angry face rude hand gesture argument',
      'furious person yelling hand gesture',
      'person pointing finger angry argument',
      'rude argument close up hand gesture',
    ]);
  }

  if (
    [
      'text back',
      'stop texting',
      'ping me',
      'ghost me',
      'she ghosted',
      'text first',
      'ghosted you',
      'delete chat',
      'left on read',
    ].includes(key)
  ) {
    return spec('phone message dating conflict', ['phone', 'message', 'hand'], [
      'phone message hand dating conflict',
      'unanswered text message phone hand',
      'person deleting chat phone close up',
      'angry texting smartphone hand close up',
    ]);
  }

  if (
    [
      'he cheated',
      'she knew',
      'cheat on',
      'mess around',
      'cut ties',
      'dump him',
      'over you',
      'need space',
      'too clingy',
      'back away',
      'down bad',
      'stop simping',
    ].includes(key)
  ) {
    return spec('dating breakup proof', ['couple', 'phone', 'argument'], [
      'couple phone argument breakup',
      'jealous couple arguing phone',
      'person walking away from couple argument',
      'breakup conversation phone close up',
    ]);
  }

  if (['lawyer up', "that's illegal", 'call them', 'call out'].includes(key)) {
    return spec('law or accusation cue', ['police', 'lawyer', 'phone'], [
      'police lawyer phone call',
      'lawyer office phone call close up',
      'police lights person calling phone',
      'person calling police phone close up',
    ]);
  }

  if (['nasty shot', 'dirty move', 'clean up', 'mess up', 'clean slate'].includes(key)) {
    return spec('dirty versus cleanup visual', ['dirty', 'hand', 'cleaning'], [
      'dirty hands cleaning close up',
      'messy room cleaning close up',
      'person cleaning dirty table',
      'dirty move sports close up',
    ]);
  }

  if (['flex harder', "don't flex", 'flexing hard', 'weird flex', 'stay humble'].includes(key)) {
    return spec('visible flex or ego cue', ['mirror', 'muscle', 'gesture'], [
      'person flexing muscles mirror gesture',
      'man flexing arm mirror close up',
      'showing off money hand gesture',
      'person bragging hand gesture close up',
    ]);
  }

  if (["don't choke", 'choke hard', 'fold under pressure', 'clutch up', 'lock in'].includes(key)) {
    return spec('pressure or clutch moment', ['sports', 'pressure', 'crowd'], [
      'basketball pressure crowd close up',
      'athlete under pressure crowd',
      'sports clutch moment crowd reaction',
      'person stressed before competition',
    ]);
  }

  if (hasAny(hay, [/fuck/, /bullshit/, /shit/, /screw/, /shut up/, /back off/, /cut it out/, /stop lying/, /dont lie/, /prove it/, /youre wrong/, /fake/, /toxic/, /pathetic/, /trash/, /annoying/, /salty/, /petty/, /messy/])) {
    return spec('rude conflict or insult', ['angry face', 'pointing finger', 'argument'], [
      'angry face pointing finger argument',
      'angry person pointing finger argument',
      'furious argument close up',
      'person yelling angry close up',
      'rude hand gesture argument',
    ]);
  }
  if (hasAny(hay, [/text/, /dm/, /ping/, /phone/, /ghost/, /message/, /reply/, /chat/, /seen/, /snitch/, /rat out/])) {
    return spec('phone conflict or ignored message', ['phone', 'message', 'hand'], [
      'phone message hand close up',
      'angry texting smartphone close up',
      'unanswered text message phone',
      'hand texting phone close up',
      'phone chat notification close up',
    ]);
  }
  if (hasAny(hay, [/cheat/, /date/, /crush/, /\bex\b/, /dump/, /clingy/, /needy/, /thirsty/, /\bsimp(?:ing|s|ed)?\b/, /flirt/, /single/, /married/, /jealous/, /breakup/, /over you/])) {
    return spec('relationship tension', ['couple', 'argument', 'phone'], [
      'couple argument phone close up',
      'couple arguing close up',
      'relationship breakup phone',
      'jealous couple argument',
      'awkward couple conversation',
    ]);
  }
  if (hasAny(hay, [/broke/, /pay/, /paid/, /cash/, /cheap/, /bill/, /money/, /wallet/, /rich/])) {
    return spec('money pressure', ['wallet', 'cash', 'card'], [
      'empty wallet cash card close up',
      'empty wallet close up',
      'credit card declined close up',
      'cash bills hand close up',
      'person paying card close up',
    ]);
  }
  if (hasAny(hay, [/fired/, /work/, /boss/, /clock out/, /show up/, /nasty work/, /office/, /deadline/])) {
    return spec('work trouble', ['office', 'boss', 'stress'], [
      'office boss stress close up',
      'angry boss office argument',
      'worker stressed office desk',
      'person fired office',
      'office meeting conflict',
    ]);
  }
  if (hasAny(hay, [/dead/, /cooked/, /doomed/, /done/, /over/, /burned out/, /late/, /choke/, /cry/, /hurt/, /stings/, /sucks/])) {
    return spec('overwhelmed reaction', ['stressed face', 'hands on head', 'panic'], [
      'stressed face hands on head panic',
      'person overwhelmed hands on head',
      'stressed person close up',
      'panic face close up',
      'person exhausted sitting alone',
    ]);
  }
  if (hasAny(hay, [/cap/, /receipts/, /sus/, /sketchy/, /proof/, /caught/, /lying/])) {
    return spec('lie caught proof', ['phone', 'proof', 'suspicious face'], [
      'phone proof suspicious face',
      'person showing evidence phone',
      'suspicious person close up',
      'caught lying argument',
      'text message proof close up',
    ]);
  }
  if (hasAny(hay, [/slaps/, /bangs/, /banger/, /fire/, /hits different/, /replay/, /louder/, /song/, /no skips/])) {
    return spec('music reaction', ['music', 'party', 'speaker'], [
      'music party speaker reaction',
      'concert crowd phone lights',
      'dj party music crowd',
      'person wearing headphones reaction',
      'speaker music close up',
    ]);
  }
  if (hasAny(hay, [/mid/, /cringe/, /awkward/, /weird/, /wild/, /savage/, /extra/, /delulu/, /basic/, /vanilla/, /loser/])) {
    return spec('judgment reaction', ['judging face', 'awkward group', 'reaction'], [
      'judgmental face awkward group reaction',
      'judgmental face close up',
      'people judging awkward',
      'person rolling eyes close up',
      'awkward group reaction',
    ]);
  }
  if (hasAny(hay, [/watch/, /look/, /see/, /notice/, /room/, /keep watching/, /closely/])) {
    return spec('watching closely', ['eyes', 'watching', 'close up'], [
      'eyes watching close up',
      'eyes close up watching',
      'person watching carefully close up',
      'group staring reaction',
    ]);
  }
  if (hasAny(hay, [/run/, /move/, /walk away/, /leave/, /back away/, /bail/, /come through/])) {
    return spec('leaving or moving away', ['walking away', 'door', 'street'], [
      'person walking away door street',
      'person walking away angry',
      'person leaving through door',
      'walking away street close up',
    ]);
  }
  if (row.role === 'bait') {
    return spec('literal translation trap reaction', ['confused face', 'thinking', 'question'], [
      'confused face thinking question',
      'confused person thinking close up',
      'person puzzled question close up',
      'awkward confused reaction',
    ]);
  }
  if (row.role === 'hook') {
    return spec('strong opening confrontation', ['direct stare', 'angry face', 'gesture'], [
      'angry face direct stare gesture',
      'dramatic angry face direct stare gesture',
      'person pointing at camera angry',
      'direct stare angry hand gesture close up',
    ]);
  }
  return spec('reaction with visible gesture', ['face', 'gesture', 'reaction'], [
    'reaction face hand gesture',
    'person reacting face hand gesture',
    'close up reaction face',
    'person refusing hand gesture',
  ]);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { version: 1, rows: [] };
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function sourceKey(row) {
  return row?.provider && row?.providerId ? `${row.provider}:${row.providerId}` : '';
}

function loadExcludedSources() {
  const ids = new Set();
  const manifests = [];
  for (const manifestPath of EXCLUDE_MANIFESTS) {
    if (!fs.existsSync(manifestPath)) {
      manifests.push({ path: manifestPath, rows: 0, sources: 0, missing: true });
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    let sources = 0;
    for (const row of rows) {
      const key = sourceKey(row);
      if (!key) continue;
      ids.add(key);
      sources += 1;
    }
    manifests.push({ path: manifestPath, rows: rows.length, sources });
  }
  return { ids, manifests };
}

function saveManifest(manifest) {
  ensureDir(path.dirname(MANIFEST_PATH));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function choosePexelsFile(video) {
  const files = (video.video_files || []).filter((file) => file.file_type === 'video/mp4' && file.link);
  const portrait = files.filter((file) => Number(file.height || 0) >= Number(file.width || 0));
  const pool = portrait.length ? portrait : files;
  return pool
    .map((file) => ({
      ...file,
      score:
        Math.abs(Number(file.height || 0) - HEIGHT) +
        Math.abs(Number(file.width || 0) - WIDTH) * 0.5 +
        (Number(file.height || 0) < 1200 ? 5000 : 0),
    }))
    .sort((a, b) => a.score - b.score)[0];
}

function choosePixabayFile(video) {
  const variants = video.videos || {};
  const files = ['large', 'medium', 'small', 'tiny']
    .map((key) => ({ key, ...(variants[key] || {}) }))
    .filter((file) => file.url);
  return files
    .map((file) => ({
      ...file,
      score:
        Math.abs(Number(file.height || 0) - HEIGHT) +
        Math.abs(Number(file.width || 0) - WIDTH) * 0.5 +
        (Number(file.height || 0) < 900 ? 5000 : 0),
    }))
    .sort((a, b) => a.score - b.score)[0];
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function searchPexels(query, usedIds, apiKey) {
  if (!apiKey) return null;
  for (let page = 1; page <= SEARCH_PAGES; page += 1) {
    const url = new URL('https://api.pexels.com/videos/search');
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', 'portrait');
    url.searchParams.set('per_page', String(SEARCH_PER_PAGE));
    url.searchParams.set('page', String(page));
    const data = await fetchJson(url, { Authorization: apiKey });
    const videos = Array.isArray(data.videos) ? data.videos : [];
    const preferred = videos.find((video) => !usedIds.has(`pexels:${video.id}`));
    if (!preferred) continue;
    const file = choosePexelsFile(preferred);
    if (!file) continue;
    return {
      provider: 'pexels',
      providerId: String(preferred.id),
      sourceUrl: preferred.url || '',
      downloadUrl: file.link,
      width: file.width || preferred.width || 0,
      height: file.height || preferred.height || 0,
      query,
    };
  }
  return null;
}

async function searchPixabay(query, usedIds, apiKey) {
  if (!apiKey) return null;
  for (let page = 1; page <= SEARCH_PAGES; page += 1) {
    const url = new URL('https://pixabay.com/api/videos/');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('video_type', 'film');
    url.searchParams.set('orientation', 'vertical');
    url.searchParams.set('per_page', String(SEARCH_PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('safesearch', 'true');
    const data = await fetchJson(url);
    const hits = Array.isArray(data.hits) ? data.hits : [];
    const preferred = hits.find((video) => !usedIds.has(`pixabay:${video.id}`));
    if (!preferred) continue;
    const file = choosePixabayFile(preferred);
    if (!file) continue;
    return {
      provider: 'pixabay',
      providerId: String(preferred.id),
      sourceUrl: preferred.pageURL || '',
      downloadUrl: file.url,
      width: file.width || 0,
      height: file.height || 0,
      query,
    };
  }
  return null;
}

async function searchVideo(query, usedIds, keys) {
  const scene = typeof query === 'string' ? { queryCandidates: [query], visualElements: [], scene: query } : query;
  const candidates = [];
  const errors = [];
  for (const [queryIndex, candidateQuery] of scene.queryCandidates.entries()) {
    for (const provider of ['pixabay', 'pexels']) {
      try {
        const results =
          provider === 'pixabay'
            ? await searchPixabayCandidates(candidateQuery, usedIds, keys.pixabay)
            : await searchPexelsCandidates(candidateQuery, usedIds, keys.pexels);
        for (const result of results) {
          candidates.push(scoreCandidate(result, scene, candidateQuery, queryIndex));
        }
      } catch (error) {
        errors.push(`${provider}:${candidateQuery}: ${error?.message || String(error)}`);
      }
    }
    const bestSoFar = candidates
      .filter((candidate) => !usedIds.has(`${candidate.provider}:${candidate.providerId}`))
      .sort((a, b) => b.score - a.score)[0];
    if (bestSoFar && bestSoFar.score >= 260) return bestSoFar;
  }
  const best = candidates
    .filter((candidate) => !usedIds.has(`${candidate.provider}:${candidate.providerId}`))
    .sort((a, b) => b.score - a.score)[0];
  if (best) return best;
  throw new Error(`No video result for "${scene.scene || scene.query}"${errors.length ? ` (${errors.slice(0, 3).join('; ')})` : ''}`);
}

async function searchPexelsCandidates(query, usedIds, apiKey) {
  if (!apiKey) return [];
  const out = [];
  for (let page = 1; page <= SEARCH_PAGES; page += 1) {
    const url = new URL('https://api.pexels.com/videos/search');
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', 'portrait');
    url.searchParams.set('per_page', String(SEARCH_PER_PAGE));
    url.searchParams.set('page', String(page));
    const data = await fetchJson(url, { Authorization: apiKey });
    const videos = Array.isArray(data.videos) ? data.videos : [];
    for (const video of videos) {
      if (usedIds.has(`pexels:${video.id}`)) continue;
      const file = choosePexelsFile(video);
      if (!file) continue;
      out.push({
        provider: 'pexels',
        providerId: String(video.id),
        sourceUrl: video.url || '',
        downloadUrl: file.link,
        width: file.width || video.width || 0,
        height: file.height || video.height || 0,
        duration: video.duration || 0,
        metadataText: [video.url || '', video.user?.name || ''].join(' '),
      });
    }
    if (out.length >= 20) break;
  }
  return out;
}

async function searchPixabayCandidates(query, usedIds, apiKey) {
  if (!apiKey) return [];
  const out = [];
  for (let page = 1; page <= SEARCH_PAGES; page += 1) {
    const url = new URL('https://pixabay.com/api/videos/');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('video_type', 'film');
    url.searchParams.set('orientation', 'vertical');
    url.searchParams.set('per_page', String(SEARCH_PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('safesearch', 'true');
    const data = await fetchJson(url);
    const hits = Array.isArray(data.hits) ? data.hits : [];
    for (const video of hits) {
      if (usedIds.has(`pixabay:${video.id}`)) continue;
      const file = choosePixabayFile(video);
      if (!file) continue;
      out.push({
        provider: 'pixabay',
        providerId: String(video.id),
        sourceUrl: video.pageURL || '',
        downloadUrl: file.url,
        width: file.width || 0,
        height: file.height || 0,
        duration: video.duration || 0,
        metadataText: [video.tags || '', video.pageURL || '', video.user || ''].join(' '),
        tags: video.tags || '',
      });
    }
    if (out.length >= 20) break;
  }
  return out;
}

function wordsFor(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function elementMatches(elements, text) {
  const hay = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')} `;
  return elements.filter((element) => {
    const words = wordsFor(element);
    if (!words.length) return false;
    return words.every((word) => hay.includes(` ${word} `));
  });
}

function blockedMetadataMatches(scene, text) {
  if (scene.allowBlockedMetadata) return [];
  if (ALLOW_LITERAL_NATURE_SCENES.has(scene.scene)) return [];
  const hay = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')} `;
  const allowed = new Set(scene.allowedBlockedTerms || []);
  const terms =
    scene.scene === 'doom or finished visual'
      ? BLOCKED_METADATA_TERMS.filter((term) => term !== 'building')
      : BLOCKED_METADATA_TERMS;
  return terms.filter((term) => !allowed.has(term) && hay.includes(` ${term} `));
}

function scoreCandidate(candidate, scene, selectedQuery, queryIndex) {
  const visualElements = scene.visualElements || [];
  const metadataMatches = elementMatches(visualElements, candidate.metadataText);
  const queryMatches = elementMatches(visualElements, selectedQuery);
  const blockedMatches = blockedMetadataMatches(scene, candidate.metadataText);
  const requiredQueryMatches = Math.min(2, visualElements.length);
  const minEdge = Math.min(Number(candidate.width || 0), Number(candidate.height || 0));
  const maxEdge = Math.max(Number(candidate.width || 0), Number(candidate.height || 0));
  const portraitBonus = Number(candidate.height || 0) >= Number(candidate.width || 0) ? 35 : 0;
  const resolutionScore = Math.min(80, Math.floor(maxEdge / 40)) + Math.min(30, Math.floor(minEdge / 40));
  const queryRankScore = Math.max(0, 80 - queryIndex * 18);
  const metadataScore = metadataMatches.length * 70;
  const queryScore = queryMatches.length * 35;
  const providerScore = candidate.provider === 'pixabay' && metadataMatches.length ? 35 : 0;
  const blockedPenalty = blockedMatches.length * 160;
  const weakMetadataPenalty = candidate.provider === 'pixabay' && metadataMatches.length < requiredQueryMatches ? 120 : 0;
  const score =
    queryRankScore + metadataScore + queryScore + providerScore + portraitBonus + resolutionScore - blockedPenalty - weakMetadataPenalty;
  return {
    ...candidate,
    query: selectedQuery,
    selectedQuery,
    scene: scene.scene,
    visualElements,
    queryCandidates: scene.queryCandidates,
    metadataMatches,
    queryMatches,
    blockedMatches,
    visualGate: {
      status: queryMatches.length >= requiredQueryMatches ? 'ready' : 'weak',
      requiredQueryMatches,
      metadataMatches,
      queryMatches,
      blockedMatches,
      score,
    },
    score,
  };
}

async function downloadFile(url, outPath) {
  let last = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 50_000) throw new Error(`download too small: ${buffer.length}`);
      fs.writeFileSync(`${outPath}.tmp`, buffer);
      fs.renameSync(`${outPath}.tmp`, outPath);
      return buffer.length;
    } catch (error) {
      last = error?.message || String(error);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(`download failed: ${last}`);
}

function transcode(sourcePath, outPath) {
  const vf = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fps=30,format=yuv420p`;
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-stream_loop',
      '-1',
      '-i',
      sourcePath,
      '-t',
      String(DURATION_SEC),
      '-an',
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-movflags',
      '+faststart',
      outPath,
    ],
    { stdio: 'pipe' },
  );
}

function probe(file) {
  const raw = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=width,height,duration', '-show_entries', 'format=duration,size', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  const data = JSON.parse(raw);
  const stream = (data.streams || []).find((item) => item.width && item.height) || {};
  return {
    width: Number(stream.width || 0),
    height: Number(stream.height || 0),
    durationSec: Number(stream.duration || data.format?.duration || 0),
    size: Number(data.format?.size || fs.statSync(file).size),
  };
}

async function main() {
  const keys = {
    pexels: readEnvValue('PEXELS_API_KEY'),
    pixabay: readEnvValue('PIXABAY_API_KEY'),
  };
  if (!keys.pexels && !keys.pixabay) throw new Error('Missing PEXELS_API_KEY and PIXABAY_API_KEY');
  ensureDir(OUT_DIR);
  const rows = parseRows(PHRASES_PATH);
  if (rows.length !== 300) throw new Error(`Expected 300 rows, got ${rows.length}`);
  const manifest = loadManifest();
  manifest.version = 1;
  manifest.generatedAt = new Date().toISOString();
  manifest.phrasesPath = PHRASES_PATH;
  manifest.outDir = OUT_DIR;
  manifest.width = WIDTH;
  manifest.height = HEIGHT;
  manifest.durationSec = DURATION_SEC;
  manifest.targetDurationUs = TARGET_DURATION_US;
  manifest.rows ||= [];
  const excludedSources = loadExcludedSources();
  manifest.excludedManifests = excludedSources.manifests;
  const stop = LIMIT ? Math.min(rows.length, START + LIMIT - 1) : rows.length;
  const isSelected = (index) => (ONLY_INDEXES.size ? ONLY_INDEXES.has(index) : index >= START && index <= stop);
  const byIndex = new Map(manifest.rows.map((row) => [row.index, row]));
  const usedIds = new Set(
    manifest.rows
      .filter((row) => row.provider && row.providerId)
      .filter((row) => !(FORCE && isSelected(row.index)))
      .map((row) => `${row.provider}:${row.providerId}`),
  );
  for (const key of excludedSources.ids) usedIds.add(key);

  for (const row of rows) {
    if (!isSelected(row.index)) continue;
    const fileName = `${String(row.index).padStart(3, '0')}_${slug(row.phraseEn)}.mp4`;
    const outPath = path.join(OUT_DIR, fileName);
    const existing = byIndex.get(row.index);
    if (!FORCE && existing && fs.existsSync(existing.localPath || outPath)) {
      console.log(`[skip] ${row.index}/300 ${row.phraseEn}`);
      continue;
    }
    const scene = sceneFor(row);
    const query = scene.query;
    const plannedQueryMatches = elementMatches(scene.visualElements, query);
    const plannedRequiredQueryMatches = Math.min(2, scene.visualElements.length);
    const planned = {
      index: row.index,
      video: row.video,
      slot: row.slot,
      role: row.role,
      phraseEn: row.phraseEn,
      translationRu: row.translationRu,
      note: row.note,
      scene: scene.scene,
      query,
      queryCandidates: scene.queryCandidates,
      visualElements: scene.visualElements,
      queryMatches: plannedQueryMatches,
      blockedMatches: [],
      visualGate: {
        status: plannedQueryMatches.length >= plannedRequiredQueryMatches ? 'ready' : 'weak',
        requiredQueryMatches: plannedRequiredQueryMatches,
        queryMatches: plannedQueryMatches,
        blockedMatches: [],
      },
      fileName,
      localPath: outPath,
    };
    if (DRY_RUN) {
      byIndex.set(row.index, planned);
      console.log(`[plan] ${row.index}/300 ${row.phraseEn} -> ${query}`);
      continue;
    }
    console.log(`[fetch] ${row.index}/300 ${row.phraseEn} -> ${query}`);
    const result = await searchVideo(scene, usedIds, keys);
    usedIds.add(`${result.provider}:${result.providerId}`);
    const sourcePath = path.join(OUT_DIR, `${fileName}.source.mp4`);
    const bytes = await downloadFile(result.downloadUrl, sourcePath);
    transcode(sourcePath, outPath);
    if (!KEEP_SOURCE) fs.rmSync(sourcePath, { force: true });
    const meta = probe(outPath);
    if (meta.width !== WIDTH || meta.height !== HEIGHT) throw new Error(`Bad output dimensions for ${fileName}: ${meta.width}x${meta.height}`);
    if (meta.durationSec < 6.1) throw new Error(`Output too short for ${fileName}: ${meta.durationSec}`);
    byIndex.set(row.index, {
      ...planned,
      provider: result.provider,
      providerId: result.providerId,
      sourceUrl: result.sourceUrl,
      sourceWidth: result.width,
      sourceHeight: result.height,
      selectedQuery: result.selectedQuery,
      query: result.selectedQuery || result.query || query,
      queryCandidates: scene.queryCandidates,
      visualElements: scene.visualElements,
      metadataMatches: result.metadataMatches || [],
      queryMatches: result.queryMatches || [],
      blockedMatches: result.blockedMatches || [],
      tags: result.tags || '',
      relevanceScore: result.score || 0,
      visualGate: result.visualGate || { status: 'unknown' },
      downloadBytes: bytes,
      width: meta.width,
      height: meta.height,
      durationSec: meta.durationSec,
      durationUs: Math.round(meta.durationSec * 1_000_000),
      size: meta.size,
    });
    manifest.rows = Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
    saveManifest(manifest);
  }

  manifest.rows = Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
  saveManifest(manifest);
  const ready = manifest.rows.filter((row) => row.localPath && (DRY_RUN || fs.existsSync(row.localPath))).length;
  console.log(
    JSON.stringify(
      {
        status: ready === 300 ? 'ready' : 'partial',
        ready,
        manifest: MANIFEST_PATH,
        outDir: OUT_DIR,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
