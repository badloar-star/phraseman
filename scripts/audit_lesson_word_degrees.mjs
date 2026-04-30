/**
 * Finds pairs (base EN, comparative/superlative EN) in same lesson where RU or UK gloss matches wrongly.
 *
 * Usage: node scripts/audit_lesson_word_degrees.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, '../app/lesson_words.tsx');
const text = fs.readFileSync(fp, 'utf8');

/** -er / -est shape but usually not comparative in our wordlists */
const SHAPE_FALSE_POSITIVE = new Set(
  `
  together number remember letter dinner driver charger winter mother shower summer september october
  december water sister later printer center newspaper manager computer enter soldier answer danger order
  weather tower flower western eastern corner courier master hammer register minister finger member butter
  cluster disaster teenager remark trigger feather copper recorder accelerator elevator translator commentator
  navigator inspector actor editor creditor debtor donor sailor terror horror chapter barrier carrier monster
  lobster oyster hamster lobster character chapter popular grammar doctor officer matter power shower filter
  counter cancer silver proper never ever other rather after under over supper upper lower farmer former liver
  quarter meter supper pepper zipper banner dinner summer winter
`.trim().split(/\s+/),
);

const IRREGULAR_COMP = [
  ['good', 'better'],
  ['good', 'best'],
  ['bad', 'worse'],
  ['bad', 'worst'],
  ['far', 'farther'],
  ['far', 'farthest'],
  ['far', 'further'],
  ['far', 'furthest'],
  ['many', 'more'],
  ['much', 'more'],
  ['most', 'most'],
  ['little', 'less'],
  ['little', 'least'],
];

function isVowel(c) {
  return /[aeiouy]/i.test(c);
}

function isDerivedFrom(base, comp) {
  if (base === comp) return false;
  if (base.length < 2) return false;
  if (IRREGULAR_COMP.some(([b, c]) => b === base && c === comp)) return true;

  if (comp === `${base}er` || comp === `${base}est`) return true;

  if (base.endsWith('e') && (comp === `${base.slice(0, -1)}er` || comp === `${base.slice(0, -1)}est`)) return true;

  if (base.endsWith('y') && !isVowel(base[base.length - 2])) {
    const stem = base.slice(0, -1);
    if (comp === `${stem}ier` || comp === `${stem}iest`) return true;
  }

  const lc = base.slice(-1);
  if (/[bcdfghjklmnpqrstvwxz]/.test(lc) && base.length >= 3 && !isVowel(base[base.length - 2])) {
    if (comp === `${base}${lc}er` || comp === `${base}${lc}est`) return true;
  }

  return false;
}

function parseWordLine(line) {
  const enM = line.match(/en:\s*'((?:[^'\\]|\\.)*)'/);
  if (!enM) return null;
  const ruM = line.match(/ru:\s*'((?:[^'\\]|\\.)*)'/);
  let uk = null;
  const uk1 = line.match(/uk:\s*'((?:[^'\\]|\\.)*)'/);
  const uk2 = line.match(/uk:\s*"((?:[^"\\]|\\.)*)"/);
  if (uk1) uk = uk1[1].replace(/\\'/g, "'");
  else if (uk2) uk = uk2[1].replace(/\\"/g, '"');
  if (!ruM || uk == null) return null;
  return {
    en: enM[1].replace(/\\'/g, "'"),
    ru: ruM[1].replace(/\\'/g, "'"),
    uk,
  };
}

function shapeLikeDegree(en) {
  if (SHAPE_FALSE_POSITIVE.has(en)) return false;
  if (/(iest|erest)$/.test(en)) return true;
  if (/(er|est)$/i.test(en) && en.length >= 5) return true;
  const ir = IRREGULAR_COMP.some(([, c]) => c === en);
  return ir;
}

const lessonWords = {};
let curLesson = null;
for (const line of text.split('\n')) {
  const lm = line.match(/^\s*(\d+):\s*\[\s*$/);
  if (lm) {
    curLesson = Number(lm[1]);
    lessonWords[curLesson] = [];
    continue;
  }
  if (!curLesson) continue;
  if (/^\s*],\s*$/.test(line)) continue;

  const w = parseWordLine(line);
  if (w && curLesson >= 1 && curLesson <= 32) lessonWords[curLesson].push(w);
}

const issues = [];
for (let L = 1; L <= 32; L++) {
  const arr = lessonWords[L] || [];
  for (const comp of arr) {
    if (!shapeLikeDegree(comp.en)) continue;
    for (const base of arr) {
      if (!isDerivedFrom(base.en, comp.en)) continue;
      const sameRu = comp.ru === base.ru;
      const sameUk = comp.uk === base.uk;
      if (sameRu || sameUk) {
        issues.push({
          lesson: L,
          comp: comp.en,
          base: base.en,
          compRu: comp.ru,
          compUk: comp.uk,
          baseRu: base.ru,
          baseUk: base.uk,
          sameRu,
          sameUk,
        });
      }
    }
  }
}

console.log(JSON.stringify({ count: issues.length, issues }, null, 2));
