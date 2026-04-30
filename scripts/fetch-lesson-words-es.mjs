/**
 * Builds scripts/lesson_words_es_map.json (Lingva). Parallel batches. Resumable.
 * node scripts/fetch-lesson-words-es.mjs
 */
import fs from 'fs';
import { fileURLToPath } from 'url';

const SRC = fileURLToPath(new URL('../app/lesson_words.tsx', import.meta.url));
const OUT = fileURLToPath(new URL('./lesson_words_es_map.json', import.meta.url));

const MANUAL = {
  I: 'yo',
  you: 'tú / usted',
  he: 'él',
  she: 'ella',
  we: 'nosotros',
  it: 'ello / eso',
  they: 'ellos / ellas',
  app: 'aplicación',
  PM: 'p. m.',
  AM: 'a. m.',
  TV: 'televisor',
  'Wi-Fi': 'wifi',
  okay: 'vale / bien',
};

const CONCURRENCY = 10;
const BATCH_PAUSE_MS = 400;

const text = fs.readFileSync(SRC, 'utf8');
const ens = [...text.matchAll(/en:\s*'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
const unique = [...new Set(ens)];

const cache = new Map();
if (fs.existsSync(OUT)) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    for (const [k, v] of Object.entries(prev)) {
      if (typeof v === 'string' && v.trim()) cache.set(k, v);
    }
  } catch { /* ignore */ }
}
console.log('keys', unique.length, 'cached', cache.size);

function persist() {
  const obj = Object.fromEntries([...cache.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  fs.writeFileSync(OUT, JSON.stringify(obj, null, 0), 'utf8');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateOne(q) {
  const url = `https://lingva.ml/api/v1/en/es/${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429 || res.status === 503) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      const t = (j.translation || '').trim();
      if (!t) throw new Error('empty');
      return t;
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(500 * (attempt + 1));
    }
  }
  throw new Error('failed ' + q);
}

const pending = unique.filter((en) => !cache.has(en));

for (let i = 0; i < pending.length; i += CONCURRENCY) {
  const chunk = pending.slice(i, i + CONCURRENCY);
  await Promise.all(
    chunk.map(async (en) => {
      const m = MANUAL[en];
      if (m) {
        cache.set(en, m);
        return;
      }
      const es = await translateOne(en);
      cache.set(en, es);
    }),
  );
  console.log('progress', Math.min(i + CONCURRENCY, pending.length), '/', pending.length);
  persist();
  await sleep(BATCH_PAUSE_MS);
}

persist();
console.log('done', OUT, 'entries', cache.size);
