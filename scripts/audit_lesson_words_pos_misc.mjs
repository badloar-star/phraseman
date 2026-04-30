/**
 * Lessons 1–32: highlights likely POS/gloss mismatches (heuristic).
 * Usage: node scripts/audit_lesson_words_pos_misc.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, '../app/lesson_words.tsx');
const text = fs.readFileSync(fp, 'utf8');

/** -ed/-en verb forms wrongly tagged nouns — exclude noun homonyms */
const ED_EN_NOT_NOUN = new Set(
  `
  beaten bitten blown broken chosen drawn driven drunk eaten fallen forbidden forgotten forsaken forgiven
  forgiven frozen gotten given eaten hidden held hurt kept knit known laid led lent let lit lost mistaken
  paid proven put ridden risen rung said seen shaken sheared shone shrunk slain slept slit smitten spoken
  spent spilled spoilt sprung stolen stricken struck stridden striven sworn swept swollen taken shaken taught
  thought thrown undergone understood undertaken upset woken withdrawn worn woven written wrought
`.trim().split(/\s+/),
);

const IRREG_PP_EN = new Set(
  `
  bore become began beset bespoke bet bid bidden bound bred broadcast built burnt bought cast clothed come
  cost crept cut dealt dug dreamt dwelt eaten fallen fed felt fled flown forbidden forecast foregone
  forgotten forgiven forsaken freezing frozen gotten given gone ground grown heard held hewn hid hidden hit
  hurt inlaid inlaid knit known laid lead led left lent lain lit lost made meant met misplaced misread
  miscast misunderstood mowed mown outdone overtaken overtold paid plead pled proven quit read rid ridden
  risen rung said sat sawn seen sought sold sent sewed sewn shaved shaven shod shaken shone shaved shorn
  shown shrunk shut slain slept slit smelt sown sped spelled spelt spent spilt spoiled spoilt sprung stuck
  stung stolen striven struck stridden striven strung striven sworn sworn swept swollen taken taught thought
  thrown undergone understood undertaken upset woken withheld withstood withheld wringed wrung written
`.trim().split(/\s+/),
);

/** Clear past participles (tagged nouns): infinitives in gloss = verb learning card */
const PARTICIPLE_INFINITIVE_GLOSS = new Set([
  'eaten',
  'given',
  'taken',
  'written',
  'forgotten',
  'paid',
  'thrown',
  'drunk',
  'driven',
  'lent',
  'stolen',
  'chosen',
  'seen',
  'won',
  'built',
]);

const BROKEN_UK_HINTS = [/&#x/i, /@ info/i, /\[[^\]]*нерозб/i, /\[[^\]]*illeg/i];

function parseLines() {
  const byLesson = {};
  let cur = null;
  const raw = [];
  for (const line of text.split('\n')) {
    const lm = line.match(/^\s*(\d+):\s*\[\s*$/);
    if (lm) {
      cur = Number(lm[1]);
      byLesson[cur] = [];
      continue;
    }
    if (!cur || cur < 1 || cur > 32) continue;

    const enM = line.match(/en:\s*'((?:[^'\\]|\\.)*)'/);
    const posM = line.match(/pos:\s*'(pronouns|verbs|irregular_verbs|adjectives|adverbs|nouns)'/);
    const ruM = line.match(/ru:\s*'((?:[^'\\]|\\.)*)'/);
    const ukM = line.match(/uk:\s*'((?:[^'\\]|\\.)*)'/) ?? line.match(/uk:\s*"((?:[^"\\]|\\.)*)"/);
    if (!enM || !posM) continue;

    const en = enM[1].replace(/\\'/g, "'");
    let uk = ukM ? (ukM[1].startsWith('"') ? ukM[1] : ukM[1].replace(/\\'/g, "'")) : '';

    raw.push({
      lesson: cur,
      lineNo: raw.length,
      line,
      en,
      pos: posM[1],
      ru: ruM ? ruM[1].replace(/\\'/g, "'") : '',
      uk,
    });
  }
  return raw;
}

const rows = parseLines();

const nounButVerbForm = [];
const brokenUk = [];
for (const r of rows) {
  if (BROKEN_UK_HINTS.some((re) => re.test(r.uk))) brokenUk.push(r);
  if (r.pos !== 'nouns') continue;
  const e = r.en.toLowerCase();
  if (PARTICIPLE_INFINITIVE_GLOSS.has(e)) nounButVerbForm.push({ ...r, reason: 'pp_infinitive_gloss' });
  else if (/^[a-z-]+$/.test(e) && !e.includes('-')) {
    if (e.endsWith('en') && e.length >= 4 && ED_EN_NOT_NOUN.has(e)) nounButVerbForm.push({ ...r, reason: 'ed_en_whitelist' });
  }
}

console.log(JSON.stringify({ brokenUkCount: brokenUk.length, nounVerbFormCount: nounButVerbForm.length, brokenUk, nounButVerbForm }, null, 2));
