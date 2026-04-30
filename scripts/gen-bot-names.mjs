/**
 * Генерирует пул живых игровых ников RU / EN для bot_names.ts и перезаписывает файл.
 * Запуск: node scripts/gen-bot-names.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'app', 'constants', 'bot_names.ts');

const TARGET = 150;
const MIN_LEN = 3;
const MAX_LEN = 14;

const ruBeg = ['кот', 'лёха', 'макс', 'саша', 'дима', 'иван', 'кир', 'оля', 'катя', 'жора', 'вова', 'пётр', 'настя', 'мур', 'пёс', 'лис', 'ёж', 'мор', 'мед', 'чай', 'гриб', 'рак', 'пак', 'зай', 'миш', 'ник', 'ван', 'оле', 'зёма', 'боб', 'шур', 'глеб', 'юра', 'лёня', 'паша', 'мила', 'зоя', 'юля', 'аня', 'даш', 'крис', 'гок', 'фик', 'док', 'шок', 'пик', 'рок', 'лог', 'век', 'мог', 'сок', 'дог', 'шак', 'мак', 'гак', 'лак', 'зев', 'гус', 'щук', 'шут'];
const ruEnd = ['ик', 'ок', 'ка', 'ко', 'ун', 'ин', 'он', 'ёк', 'ус', 'им', 'ам', 'ем', 'их', 'уш', 'ыл', 'ын', 'их', 'ка', 'то', 'та', 'ть', 'ля', 'ня', 'ма', 'ша', 'да', 'ра', 'ва', 'ча', 'жа', 'га', 'ба', 'па', 'ла', 'ка', 'ха', 'фа', 'за', 'са', 'ца', 'эля', 'юля', 'аря', 'оря', 'уря', 'ыря', 'ич', 'ыч', 'оч', 'еч', 'ах', 'ох', 'ух', 'эх', 'юх', 'юз', 'ёз', 'из', 'оз', 'уз', 'аз'];

const enBeg = ['neo', 'zen', 'sky', 'max', 'jax', 'rex', 'zed', 'pip', 'pop', 'zip', 'fox', 'owl', 'ray', 'kai', 'sol', 'neo', 'vex', 'hex', 'pix', 'mix', 'rex', 'lex', 'tex', 'vex', 'wax', 'fax', 'jax', 'box', 'cox', 'mox', 'nox', 'pox', 'rox', 'sox', 'tox', 'vox', 'wox', 'zox', 'bob', 'rob', 'mob', 'gob', 'job', 'lob', 'nob', 'yob', 'tab', 'lab', 'fab', 'gab', 'jab', 'nab'];
const enEnd = ['byte', 'core', 'wing', 'shot', 'face', 'line', 'zone', 'dust', 'star', 'moon', 'volt', 'grid', 'node', 'mode', 'lord', 'king', 'beast', 'ghost', 'night', 'light', 'fire', 'ice', 'wind', 'storm', 'wave', 'tide', 'code', 'data', 'void', 'null', 'zero', 'hero', 'punk', 'rock', 'jazz', 'flip', 'skip', 'drip', 'chip', 'whip'];

const latinRu = ['kosh', 'mish', 'dush', 'tush', 'pash', 'bash', 'vash', 'gash', 'lash', 'nash', 'rash', 'sash', 'zash', 'yash'];
const tails = ['_ru', '_en', 'x', '_x', '__', '_', '_pro', '_pro', '_gg', '_ok', '_ya', '_me'];

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function rndDigits() {
  const r = Math.random();
  if (r < 0.22) return '';
  if (r < 0.55) return String((Math.random() * 90 + 10) | 0);
  return String((Math.random() * 900 + 100) | 0);
}

/** Латиница и кириллица для ника; только буквы, цифры, _. */
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

function genOne() {
  const mode = Math.random();
  let raw = '';

  if (mode < 0.28) {
    raw = pick(ruBeg) + pick(ruEnd) + rndDigits();
  } else if (mode < 0.52) {
    raw = pick(enBeg) + pick(enEnd) + rndDigits();
  } else if (mode < 0.68) {
    raw = pick(enBeg) + '_' + pick(enBeg) + rndDigits();
  } else if (mode < 0.78) {
    raw = pick(latinRu) + pick(tails) + rndDigits();
  } else {
    raw = `${pick(ruBeg)}_${pick(enBeg)}${rndDigits()}`;
  }

  let n = sanitizeNick(raw);
  if (n.length > MAX_LEN) n = n.slice(0, MAX_LEN);
  while (n.length < MIN_LEN) n += String((Math.random() * 10) | 0);
  return n.toLowerCase();
}

function generatePool() {
  const set = new Set();
  let guard = 0;
  while (set.size < TARGET && guard < 50_000) {
    guard += 1;
    const n = genOne();
    if (n.length >= MIN_LEN && n.length <= MAX_LEN) set.add(n);
  }
  if (set.size < TARGET) throw new Error(`only ${set.size} unique nicks`);
  return [...set].sort(() => Math.random() - 0.5);
}

const names = generatePool();
const lines = [];
for (let i = 0; i < names.length; i += 10) {
  lines.push(`  ${names.slice(i, i + 10).map((x) => `'${x}'`).join(', ')},`);
}

const content = `// ════════════════════════════════════════════════════════════════════════════
// bot_names.ts — Пул ников для ботов (автоген: scripts/gen-bot-names.mjs).
// Смесь кириллицы и латиницы; перегенерация: node scripts/gen-bot-names.mjs
// ════════════════════════════════════════════════════════════════════════════

export const BOT_NAMES: readonly string[] = [
${lines.join('\n')}
];

if (__DEV__) {
  const uniq = new Set(BOT_NAMES);
  const bad = BOT_NAMES.filter((n) => n.length < 3 || n.length > 14);
  if (bad.length) console.warn('[bot_names] bad length:', bad.slice(0, 10));
  if (uniq.size !== BOT_NAMES.length || BOT_NAMES.length !== ${TARGET}) {
    console.warn(\`[bot_names] expected ${TARGET} unique, got \${BOT_NAMES.length} (\${uniq.size})\`);
  }
}

export function pickRandomBotName(): string {
  if (BOT_NAMES.length === 0) return 'Player';
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
`;

fs.writeFileSync(OUT, content, 'utf8');
console.log('OK', OUT, 'names:', names.length, 'sample:', names.slice(0, 6).join(', '));
