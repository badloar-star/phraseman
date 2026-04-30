#!/usr/bin/env node
/**
 * AmE-only static guard for PhraseMan lesson data.
 *
 * Scans CANONICAL English fields (what the learner sees as the "right" answer
 * or as a vocabulary word) for British spellings/forms. Distractors,
 * commentary, secrets, JS identifiers and code logic are NOT checked.
 *
 * Source of rule: `tools/lesson_qa/prompts/00_rules.md` — "AmE only".
 *
 * Usage:
 *   node scripts/qa-ame-only.mjs
 *   npm run lesson:qa:ame
 *
 * Exit code: 0 if clean, 1 if British forms found.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// BrE → AmE suggestion. Applied only to canonical-field values.
const BRE_TO_AME = {
  // -our → -or
  colour: 'color', colours: 'colors', coloured: 'colored',
  colouring: 'coloring', colourful: 'colorful',
  favour: 'favor', favours: 'favors', favoured: 'favored',
  favourite: 'favorite', favourites: 'favorites',
  honour: 'honor', honours: 'honors', honoured: 'honored',
  honourable: 'honorable',
  labour: 'labor', harbour: 'harbor', flavour: 'flavor',
  humour: 'humor', vapour: 'vapor', rumour: 'rumor',
  saviour: 'savior', odour: 'odor',
  behaviour: 'behavior', behaviours: 'behaviors',
  neighbour: 'neighbor', neighbours: 'neighbors',
  neighbouring: 'neighboring',

  // -re → -er
  centre: 'center', centres: 'centers',
  theatre: 'theater', theatres: 'theaters',
  metre: 'meter', metres: 'meters',
  litre: 'liter', litres: 'liters',
  fibre: 'fiber', fibres: 'fibers',
  kilometre: 'kilometer', kilometres: 'kilometers',

  // -ise → -ize
  realise: 'realize', realised: 'realized', realising: 'realizing',
  organise: 'organize', organised: 'organized',
  organising: 'organizing', organises: 'organizes',
  recognise: 'recognize', recognised: 'recognized',
  apologise: 'apologize', apologised: 'apologized',
  criticise: 'criticize', summarise: 'summarize',
  memorise: 'memorize',
  analyse: 'analyze', analysed: 'analyzed', analysing: 'analyzing',
  emphasise: 'emphasize', specialise: 'specialize',
  prioritise: 'prioritize', categorise: 'categorize',
  optimise: 'optimize', maximise: 'maximize', minimise: 'minimize',
  utilise: 'utilize', sympathise: 'sympathize',
  finalise: 'finalize', publicise: 'publicize',
  practise: 'practice', practised: 'practiced',
  practising: 'practicing', practises: 'practices',

  // -ence → -ense (nouns)
  defence: 'defense', offence: 'offense',
  licence: 'license', pretence: 'pretense',

  // -ll → -l for unstressed past forms
  travelled: 'traveled', travelling: 'traveling',
  cancelled: 'canceled', cancelling: 'canceling',
  modelled: 'modeled', modelling: 'modeling',
  labelled: 'labeled', labelling: 'labeling',
  signalled: 'signaled', signalling: 'signaling',
  fuelled: 'fueled', fuelling: 'fueling',
  dialled: 'dialed', dialling: 'dialing',
  levelled: 'leveled', levelling: 'leveling',
  tunnelled: 'tunneled', tunnelling: 'tunneling',
  counselled: 'counseled', counselling: 'counseling',

  // -l → -ll for AmE base/derived forms
  skilful: 'skillful', wilful: 'willful',
  fulfil: 'fulfill', enrol: 'enroll', enthral: 'enthrall',
  instalment: 'installment', enrolment: 'enrollment',
  fulfilment: 'fulfillment',

  // BrE past tense ending in -t
  learnt: 'learned', dreamt: 'dreamed', burnt: 'burned',
  smelt: 'smelled', spelt: 'spelled', spilt: 'spilled',
  spoilt: 'spoiled', leapt: 'leaped', leant: 'leaned',
  knelt: 'kneeled',

  // Misc spelling
  grey: 'gray', greys: 'grays',
  programme: 'program', programmes: 'programs',
  aluminium: 'aluminum', moustache: 'mustache',
  judgement: 'judgment', jewellery: 'jewelry',
  aeroplane: 'airplane', aeroplanes: 'airplanes',
  tyre: 'tire', tyres: 'tires',
  catalogue: 'catalog', catalogues: 'catalogs',
  dialogue: 'dialog', dialogues: 'dialogs',
  analogue: 'analog', analogues: 'analogs',
  whilst: 'while', amongst: 'among',

  // BrE-specific lexis (where AmE word is decisively different)
  pavement: 'sidewalk', pavements: 'sidewalks',
  queue: 'line', queues: 'lines',
  queued: 'lined up', queuing: 'lining up',
  rubbish: 'trash',
  petrol: 'gasoline',
  lorry: 'truck', lorries: 'trucks',
  biscuit: 'cookie', biscuits: 'cookies',
  crisps: 'chips', trousers: 'pants',
  jumper: 'sweater', jumpers: 'sweaters',
  pram: 'stroller',
  nappy: 'diaper', nappies: 'diapers',
  cooker: 'stove',
  torch: 'flashlight', torches: 'flashlights',
  bonnet: 'hood', motorway: 'highway',
  motorways: 'highways',
  roundabout: 'traffic circle', roundabouts: 'traffic circles',
  aubergine: 'eggplant', courgette: 'zucchini',
  coriander: 'cilantro',
  prawn: 'shrimp', prawns: 'shrimp',
  // NOTE: 'lift' is intentionally NOT listed — context-dependent
  // (verb "to lift" is fine in AmE; only the noun meaning "elevator" is BrE).
  // Audit lift uses manually if needed.
};

// File targets. Each entry says WHAT to scan (the regex) and WHERE.
// canonicalFields: extract value from group(1) — only those values are checked.
const FILES = [
  {
    path: 'app/lesson_data_1_8.ts',
    canonicalFields: /(?:english|correct|text|past|pp|pastParticiple)\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    path: 'app/lesson_data_9_16.ts',
    canonicalFields: /(?:english|correct|text|past|pp|pastParticiple)\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    path: 'app/lesson_data_17_24.ts',
    canonicalFields: /(?:english|correct|text|past|pp|pastParticiple)\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    path: 'app/lesson_data_25_32.ts',
    canonicalFields: /(?:english|correct|text|past|pp|pastParticiple)\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    path: 'app/lesson_words.tsx',
    canonicalFields: /\ben\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    path: 'app/irregular_verbs_data.ts',
    canonicalFields: /(?:base|past|pp)\s*:\s*['"]([^'"]+)['"]/g,
  },
  {
    // Pure data file: every quoted string is a verb form to be checked.
    path: 'app/constants/verb_forms.ts',
    canonicalFields: /['"]([a-z][a-z' ]*?)['"]/g,
  },
];

let totalViolations = 0;
const reports = [];

for (const f of FILES) {
  const fullPath = join(ROOT, f.path);
  if (!existsSync(fullPath)) {
    console.warn(`[qa:ame] WARN: file not found: ${f.path}`);
    continue;
  }
  const text = readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    let m;
    const re = new RegExp(f.canonicalFields.source, f.canonicalFields.flags);
    while ((m = re.exec(line)) !== null) {
      const value = m[1];
      const words = (value.toLowerCase().match(/[a-z]+/g)) || [];
      for (const word of words) {
        if (BRE_TO_AME[word]) {
          totalViolations++;
          const snippet = value.length > 60 ? `${value.slice(0, 60)}…` : value;
          reports.push(
            `  ${f.path}:${lineNo}  "${word}" → "${BRE_TO_AME[word]}"  in: "${snippet}"`,
          );
        }
      }
    }
  }
}

if (totalViolations === 0) {
  console.log('AmE-only check: PASSED. No British forms in canonical fields.');
  process.exit(0);
} else {
  console.error(`AmE-only check: FAILED — ${totalViolations} British form(s) found:`);
  console.error('');
  for (const r of reports) console.error(r);
  console.error('');
  console.error(
    'Replace the listed values with AmE equivalents in the source file, ' +
    'or — if a word is genuinely intended (e.g. proper noun, quoted BrE example) — ' +
    'extract it out of canonical fields (english/correct/text/past/pp/en/base) ' +
    'into a comment, secretRu/secretUk, or distractor.',
  );
  process.exit(1);
}
