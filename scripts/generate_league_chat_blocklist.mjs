import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LDNOOBW_LANGS = [
  'ar', 'cs', 'da', 'de', 'en', 'eo', 'es', 'fa', 'fi', 'fil', 'fr',
  'fr-CA-u-sd-caqc', 'hi', 'hu', 'it', 'ja', 'kab', 'ko', 'nl', 'no',
  'pl', 'pt', 'ru', 'sv', 'th', 'tr', 'zh',
];

const PROFANITY_CSV_FILES = [
  'Arabic.csv',
  'Bengali.csv',
  'Chinese_Mandarin.csv',
  'English.csv',
  'French.csv',
  'German.csv',
  'Hindi.csv',
  'Japanese.csv',
  'Portuguese.csv',
  'Russian.csv',
  'Spanish.csv',
  'Urdu.csv',
];

const SOURCES = [
  {
    id: 'LDNOOBW',
    url: 'https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words',
    license: 'CC-BY-4.0',
  },
  {
    id: '4troDev/profanity.csv',
    url: 'https://github.com/4troDev/profanity.csv',
    license: 'MIT',
  },
  {
    id: 'dsojevic/profanity-list',
    url: 'https://github.com/dsojevic/profanity-list',
    license: 'MIT',
  },
];

const LOCAL_BLOCK_TERMS = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'whore', 'slut',
  'сука', 'бляд', 'блять', 'пизд', 'хуй', 'хуе', 'еба', 'ёба', 'ебл', 'мудак',
  'гондон', 'пидор', 'пидар', 'шлюх', 'мразь', 'тварь', 'уеб', 'уёб',
  'тупой', 'тупая', 'дебил', 'идиот', 'урод', 'лох', 'чмо',
  'kill yourself', 'kys', 'die', 'убейся', 'сдохни', 'умри',
  'hui', 'huy', 'xui', 'xuy', 'xyi', 'blyat', 'blyad', 'suka',
  'pizda', 'pizdec', 'pizdets', 'pidor', 'pidar',
];

const LOCAL_REVIEW_TERMS = [
  'евреи', 'еврей', 'жид', 'жиды', 'jew', 'jews',
  'русские', 'украинцы', 'украинец', 'русня', 'хохол', 'москаль',
  'black', 'white', 'muslim', 'christian', 'gay', 'lesbian', 'trans',
  'мусульман', 'христиан', 'геи', 'лесбиян', 'транс',
];

const LOCAL_SEXUAL_TERMS = [
  'sex', 'porn', 'nude', 'nudes', 'секс', 'порно', 'голая', 'голый', 'интим',
];

const IDENTITY_TAGS = new Set(['lgbtq', 'racial', 'religious']);

function cleanTerm(input) {
  return String(input ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function addTerm(target, term) {
  const clean = cleanTerm(term);
  if (clean.length < 2 || clean.length > 90) return false;
  if (/^[-_.,;:!?()[\]{}'"`]+$/.test(clean)) return false;
  target.add(clean);
  return true;
}

async function readText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'phraseman-moderation-generator' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function addLines(target, text) {
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0];
    if (addTerm(target, line)) count += 1;
  }
  return count;
}

function addDsojevicEntry(blockTerms, reviewTerms, entry) {
  const tags = Array.isArray(entry.tags) ? entry.tags.map(cleanTerm) : [];
  const identityOnly = tags.length > 0 && tags.every((tag) => IDENTITY_TAGS.has(tag));
  const target = identityOnly ? reviewTerms : blockTerms;
  const values = [
    entry.id,
    ...String(entry.match ?? '').split('|'),
  ];
  let count = 0;
  for (const value of values) {
    const plain = String(value)
      .replace(/\\b/g, ' ')
      .replace(/[+*?^${}()[\]\\]/g, ' ')
      .replace(/\s+/g, ' ');
    if (addTerm(target, plain)) count += 1;
  }
  return count;
}

function toTsArray(name, values) {
  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  const rows = sorted.map((value) => `  ${JSON.stringify(value)},`);
  return `export const ${name} = [\n${rows.join('\n')}\n] as const;\n`;
}

async function main() {
  const blockTerms = new Set();
  const reviewTerms = new Set();
  const sexualTerms = new Set();
  const counts = {};

  LOCAL_BLOCK_TERMS.forEach((term) => addTerm(blockTerms, term));
  LOCAL_REVIEW_TERMS.forEach((term) => addTerm(reviewTerms, term));
  LOCAL_SEXUAL_TERMS.forEach((term) => addTerm(sexualTerms, term));
  counts.local = blockTerms.size + reviewTerms.size + sexualTerms.size;

  let ldnoobwCount = 0;
  for (const lang of LDNOOBW_LANGS) {
    const url = `https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/${encodeURIComponent(lang)}`;
    ldnoobwCount += addLines(blockTerms, await readText(url));
  }
  counts.ldnoobw = ldnoobwCount;

  let csvCount = 0;
  for (const file of PROFANITY_CSV_FILES) {
    const url = `https://raw.githubusercontent.com/4troDev/profanity.csv/main/${encodeURIComponent(file)}`;
    csvCount += addLines(blockTerms, await readText(url));
  }
  counts.profanityCsv = csvCount;

  const dsojevic = JSON.parse(await readText('https://raw.githubusercontent.com/dsojevic/profanity-list/main/en.json'));
  let dsojevicCount = 0;
  for (const entry of dsojevic) {
    dsojevicCount += addDsojevicEntry(blockTerms, reviewTerms, entry);
  }
  counts.dsojevic = dsojevicCount;

  for (const term of reviewTerms) blockTerms.delete(term);

  const generatedAt = new Date().toISOString();
  const content = `// Generated by scripts/generate_league_chat_blocklist.mjs on ${generatedAt}.\n` +
    '// Derived from public moderation lists, deduplicated and normalized for Phraseman league chat.\n' +
    '// Sources and licenses:\n' +
    SOURCES.map((source) => `// - ${source.id}: ${source.url} (${source.license})`).join('\n') +
    '\n// Local project additions are included for Russian/Ukrainian/Latin transliteration evasions.\n\n' +
    `export const LEAGUE_CHAT_BLOCKLIST_SOURCE_COUNTS = ${JSON.stringify({
      ...counts,
      blockTerms: blockTerms.size,
      reviewTerms: reviewTerms.size,
      sexualTerms: sexualTerms.size,
    }, null, 2)} as const;\n\n` +
    toTsArray('LEAGUE_CHAT_BLOCK_TERMS', blockTerms) +
    '\n' +
    toTsArray('LEAGUE_CHAT_REVIEW_TERMS', reviewTerms) +
    '\n' +
    toTsArray('LEAGUE_CHAT_SEXUAL_TERMS', sexualTerms);

  const targets = [
    path.join(process.cwd(), 'app', 'league_chat_blocklist.generated.ts'),
    path.join(process.cwd(), 'functions', 'src', 'league_chat_blocklist.generated.ts'),
  ];
  for (const target of targets) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }

  console.log(JSON.stringify({
    generatedAt,
    targets,
    counts: {
      ...counts,
      blockTerms: blockTerms.size,
      reviewTerms: reviewTerms.size,
      sexualTerms: sexualTerms.size,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
