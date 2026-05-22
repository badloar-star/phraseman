/**
 * Генерирует пул ников для ботов (BOT_NAMES — RU/LAT mix, BOT_NAMES_LATIN — только латиница).
 * Запуск: node scripts/gen-bot-names.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT = path.join(__dirname, '..', 'app', 'constants', 'bot_names.ts');

const TARGET_MAIN = 300;
const TARGET_ES = 300;
const MIN_LEN = 3;
const MAX_LEN = 14;

const ruCore = [
  'тыква', 'шипит', 'ничего', 'кофеин', 'мем', 'лаги', 'баги', 'фича', 'код', 'пинг',
  'фпс', 'юзер', 'чат', 'кря', 'печ', 'суп', 'рис', 'чай', 'дождь', 'снег',
  'ёж', 'кот', 'пёс', 'лис', 'волк', 'мед', 'сова', 'утка', 'краб', 'устрица',
  'пельмень', 'блин', 'вафля', 'зефир', 'печенька', 'кофеёк', 'чаёк', 'сахар', 'перец', 'лук',
  'ночь', 'утро', 'день', 'град', 'ветер', 'искра', 'искин', 'пульс', 'ритм', 'шум',
  'нуля', 'лифт', 'этаж', 'ключ', 'замок', 'рулон', 'шнур', 'экран', 'кабель', 'розетка',
];

const enCore = [
  'glitch', 'pixel', 'lag', 'heap', 'sudo', 'melon', 'rust', 'zero', 'ctrl', 'npc',
  'buff', 'nerf', 'crit', 'afk', 'lol', 'bruh', 'vibe', 'wave', 'byte', 'void',
  'null', 'sync', 'patch', 'flake', 'lint', 'prod', 'vim', 'nano', 'grep', 'curl',
  'spam', 'mute', 'ping', 'dash', 'flip', 'zoom', 'blur', 'tone', 'hue', 'sepia',
  'neon', 'retro', 'mono', 'quad', 'beta', 'alfa', 'demo', 'stub', 'mock', 'fake',
  'cyan', 'teal', 'iris', 'opal', 'onyx', 'jade', 'lime', 'mint', 'plum', 'sand',
];

const enShort = [
  'gl', 'px', 'zk', 'rx', 'vx', 'hx', 'fx', 'kx', 'nx', 'mx',
  'oz', 'ozone', 'zip', 'ray', 'sol', 'kai', 'rex', 'jax', 'fox', 'owl',
];

const tailsRu = ['_ru', '_ok', '_ya', 'x', '_x', '_pro', '_gg', '_v3', '_v2', '_qt'];

/** Латиница и кириллица; только буквы, цифры, _. */
function sanitizeNick(s) {
  const raw = [...String(s).replace(/\uFEFF/g, '')];
  let t = '';
  for (const c of raw) {
    const u = c.codePointAt(0);
    if (
      c === '_'
      || (u >= 0x30 && u <= 0x39)
      || (u >= 0x41 && u <= 0x5a)
      || (u >= 0x61 && u <= 0x7a)
      || (u >= 0x0400 && u <= 0x04ff)
      || u === 0x0451
      || u === 0x0401
    ) {
      t += c;
    }
  }
  return t.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
}

function rndDigits() {
  const r = Math.random();
  if (r < 0.18) return '';
  if (r < 0.55) return String((Math.random() * 90 + 10) | 0);
  return String((Math.random() * 900 + 100) | 0);
}

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function clampNick(n) {
  let out = sanitizeNick(n).toLowerCase();
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN).replace(/_+$/g, '');
  while (out.length < MIN_LEN) out += String((Math.random() * 10) | 0);
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN);
  return out;
}

function genOneMain() {
  const mode = Math.random();
  let raw = '';

  if (mode < 0.22) {
    raw = pick(ruCore) + rndDigits();
  } else if (mode < 0.42) {
    raw = pick(enCore) + rndDigits();
  } else if (mode < 0.58) {
    raw = `${pick(ruCore)}_${pick(enShort)}${rndDigits()}`;
  } else if (mode < 0.72) {
    raw = `${pick(enShort)}_${pick(ruCore)}${rndDigits()}`;
  } else if (mode < 0.82) {
    raw = `${pick(enCore)}${pick(tailsRu)}${rndDigits()}`;
  } else if (mode < 0.92) {
    raw = `${pick(ruCore)}${pick(tailsRu)}${rndDigits()}`;
  } else {
    raw = `${pick(enShort)}_${pick(enShort)}${rndDigits()}`;
  }

  return clampNick(raw);
}

const latinEsPrefixes = [
  'glitch', 'pixel', 'lag', 'heap', 'sudo', 'melon', 'rust', 'zero', 'ctrl', 'npc',
  'buff', 'nerf', 'crit', 'afk', 'lol', 'bruh', 'vibe', 'wave', 'byte', 'void',
  'null', 'sync', 'patch', 'flake', 'lint', 'spam', 'mute', 'ping', 'dash', 'flip',
  'neon', 'retro', 'mono', 'beta', 'alfa', 'demo', 'stub', 'cyan', 'teal', 'iris',
  'opal', 'onyx', 'jade', 'lime', 'mint', 'plum', 'sand', 'volt', 'grid', 'node',
];

const latinEsShort = [
  'gl', 'px', 'zk', 'rx', 'vx', 'hx', 'fx', 'nx', 'mx', 'oz',
  'zip', 'ray', 'sol', 'kai', 'rex', 'jax', 'fox', 'owl', 'hex', 'zed',
];

const latinEsTails = ['_ok', '_gg', '_qt', '_v3', '_v2', 'x', '_x', '_pro', '_es', '_eu'];

function genOneEs() {
  const mode = Math.random();
  let raw = '';

  if (mode < 0.35) {
    raw = pick(latinEsPrefixes) + rndDigits();
  } else if (mode < 0.58) {
    raw = `${pick(latinEsPrefixes)}_${pick(latinEsShort)}${rndDigits()}`;
  } else if (mode < 0.76) {
    raw = `${pick(latinEsShort)}_${pick(latinEsPrefixes)}${rndDigits()}`;
  } else if (mode < 0.88) {
    raw = `${pick(latinEsPrefixes)}${pick(latinEsTails)}${rndDigits()}`;
  } else {
    raw = `${pick(latinEsShort)}_${pick(latinEsShort)}${rndDigits()}`;
  }

  let n = String(raw).toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (n.length > MAX_LEN) n = n.slice(0, MAX_LEN).replace(/_+$/g, '');
  while (n.length < MIN_LEN) n += String((Math.random() * 10) | 0);
  if (n.length > MAX_LEN) n = n.slice(0, MAX_LEN);
  return n;
}

function generatePool(fn, target) {
  const set = new Set();
  let guard = 0;
  while (set.size < target && guard < 200_000) {
    guard += 1;
    const n = fn();
    if (n.length >= MIN_LEN && n.length <= MAX_LEN && !set.has(n)) set.add(n);
  }
  if (set.size < target) throw new Error(`only ${set.size} unique (need ${target})`);
  return [...set].sort(() => Math.random() - 0.5);
}

function chunkLines(names, perLine = 10) {
  const lines = [];
  for (let i = 0; i < names.length; i += perLine) {
    lines.push(`  ${names.slice(i, i + perLine).map((x) => `'${x}'`).join(', ')},`);
  }
  return lines.join('\n');
}

const namesMain = generatePool(genOneMain, TARGET_MAIN);
const namesEs = generatePool(genOneEs, TARGET_ES);

const content = `// ════════════════════════════════════════════════════════════════════════════
// bot_names.ts — Пул ников для ботов (RU/LAT mix: автоген scripts/gen-bot-names.mjs).
// BOT_NAMES_LATIN — только латиница / patrones neutros para planned locales.
// Para locales es/pt-BR/vi/id/tr/pl usar pickRandomBotNameForLang(); ru/uk siguen con pickRandomBotName().
// Перегенерация: node scripts/gen-bot-names.mjs
// ════════════════════════════════════════════════════════════════════════════

export const BOT_NAMES: readonly string[] = [
${chunkLines(namesMain)}
];

/** Nicks solo latinas (3–14): adecuados para planned locales (sin cirilico). */
export const BOT_NAMES_LATIN: readonly string[] = [
${chunkLines(namesEs)}
];

function assertBotPool(tag: string, pool: readonly string[], expectedLen: number, latinOnly?: boolean): void {
  const uniq = new Set(pool);
  const bad = pool.filter((n) => n.length < 3 || n.length > 14);
  if (bad.length) console.warn(\`[\${tag}] bad length:\`, bad.slice(0, 10));
  if (latinOnly) {
    const nonLatin = pool.filter((n) => /[^a-z0-9_]/.test(n));
    if (nonLatin.length) console.warn(\`[\${tag}] non-latin:\`, nonLatin.slice(0, 10));
  }
  if (uniq.size !== pool.length || pool.length !== expectedLen) {
    console.warn(\`[\${tag}] expected \${expectedLen} unique, got \${pool.length} (\${uniq.size})\`);
  }
}

if (__DEV__) {
  assertBotPool('bot_names', BOT_NAMES, ${TARGET_MAIN});
  assertBotPool('bot_names_latin', BOT_NAMES_LATIN, ${TARGET_ES}, true);
}

export function pickRandomBotName(): string {
  if (BOT_NAMES.length === 0) return 'Player';
  const pool = BOT_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pool latin-only; mismo contrato que pickRandomBotName. Backup alineado con T.es.player (“Participante”). */
export function pickRandomBotNameEs(): string {
  if (BOT_NAMES_LATIN.length === 0) return 'Participante';
  const pool = BOT_NAMES_LATIN;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickRandomBotNameForLang(lang: string): string {
  if (lang === 'ru' || lang === 'uk') return pickRandomBotName();
  return pickRandomBotNameEs();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
`;

fs.writeFileSync(OUT, content, 'utf8');
console.log('OK', OUT);
console.log('BOT_NAMES:', namesMain.length, 'sample:', namesMain.slice(0, 8).join(', '));
console.log('BOT_NAMES_LATIN:', namesEs.length, 'sample:', namesEs.slice(0, 8).join(', '));
