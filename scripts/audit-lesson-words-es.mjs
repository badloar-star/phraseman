import fs from 'fs';

const rows = JSON.parse(fs.readFileSync('docs/reports/lesson_words_en_ru_uk.json', 'utf8'));
const mapSrc = fs.readFileSync('app/lesson_words_es_map.ts', 'utf8');
const mapKeys = new Set();
for (const m of mapSrc.matchAll(/\n\s*('(?:[^'\\]|\\.)*'|[A-Za-z0-9_-]+)\s*:/g)) {
  let k = m[1];
  if (k.startsWith("'")) k = k.slice(1, -1).replace(/\\'/g, "'");
  mapKeys.add(k);
}
const ens = rows.map((r) => r.en);
const missing = ens.filter((en) => !mapKeys.has(en));
console.log(`lesson words: ${ens.length}, map keys: ${mapKeys.size}, missing ES gloss: ${missing.length}`);
if (missing.length <= 40) console.log('missing:', missing.join(', '));
else console.log('first 25 missing:', missing.slice(0, 25).join(', '));
