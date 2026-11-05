// зачем (владелец 06.11, «Читается» в старой теории fr, 370 фраз): рабочий инструмент полу-ручной разметки. Команды:
//   node scripts/classic_say_fr_draft.mjs seed            — засеять docs/work/classic_say_fr/words.json словами из выровненных готовых чтений Теории (plain-теория + say_extra_fr)
//   node scripts/classic_say_fr_draft.mjs show <урок...>  — показать фразы уроков: id | фраза | готовое/правка/черновик (метки K=готово у Теории, P=правка фразы, D=черновик по словарю)
// Словарь слов: docs/work/classic_say_fr/words.json; правки целых фраз: docs/work/classic_say_fr/phrases.json (id → ru); утверждённые уроки: reviewed.json.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { translitFr } = require('./classic_say_translit_fr.cjs');
const DIR = path.join(ROOT, 'docs', 'work', 'classic_say_fr');
fs.mkdirSync(DIR, { recursive: true });
const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const get = (rel) => execSync(`git show HEAD:${rel}`, { cwd: ROOT, maxBuffer: 1 << 29 }).toString('utf8');

const th = JSON.parse(get('modules/classic-courses/fr/theory.json'));
const theory = th.data ?? th;
const target = {};
for (let i = 1; i <= 32; i += 1) for (const p of JSON.parse(get(`modules/classic-courses/fr/lessons-${String(i).padStart(2, '0')}.json`)).phrases) target[p.id] = p.target;
const known = new Map();
for (const d of Object.values(theory)) for (const c of d.chapters ?? []) for (const e of c.examples ?? []) if (e.say && e.phraseId) known.set(e.phraseId, e.say);
const extra = readJson(path.join(ROOT, 'docs', 'work', 'classic_intro_plain', 'say_extra_fr.json'), {});
for (const [k, v] of Object.entries(extra)) if (!k.startsWith('_')) known.set(k, v);
const need = new Set();
for (const d of Object.values(theory)) {
  if (d.plain) continue;
  for (const c of d.chapters ?? []) for (const id of [...(c.exampleIds ?? []), ...(c.examples ?? []).map((e) => e?.phraseId)]) if (id) need.add(String(id));
}
const wordsPath = path.join(DIR, 'words.json');
const phrasesPath = path.join(DIR, 'phrases.json');
const mode = process.argv[2];

if (mode === 'seed') {
  const words = readJson(wordsPath, {});
  const counts = new Map();
  for (const [id, say] of known) {
    const tg = target[id];
    if (!tg) continue;
    const tw = tg.toLowerCase().replace(/[’']/g, ' ').replace(/[?!.,;:]/g, ' ').split(/[\s-]+/).filter(Boolean);
    const rw = say.ru.split(/\s+/);
    if (tw.length !== rw.length) continue;
    tw.forEach((w, i) => {
      const r = rw[i];
      if (/^з/.test(r) && !/^z/.test(w)) return; // лиэзон прилип к слову
      const m = counts.get(w) ?? new Map();
      m.set(r, (m.get(r) ?? 0) + 1);
      counts.set(w, m);
    });
  }
  let added = 0;
  for (const [w, m] of counts) {
    if (words[w]) continue;
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    words[w] = best;
    added += 1;
  }
  fs.writeFileSync(wordsPath, JSON.stringify(Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
  console.log(`[FR-DRAFT] словарь: +${added}, всего ${Object.keys(words).length}`);
} else if (mode === 'show') {
  const words = readJson(wordsPath, {});
  const phrases = readJson(phrasesPath, {});
  const lessons = process.argv.slice(3).map(Number);
  for (const id of [...need].sort()) {
    const n = Number(id.split(':')[1]);
    if (lessons.length && !lessons.includes(n)) continue;
    const tg = target[id];
    if (phrases[id]) console.log(`${id} | ${tg} | P ${phrases[id]}`);
    else if (known.has(id)) console.log(`${id} | ${tg} | K ${known.get(id).ru}`);
    else console.log(`${id} | ${tg} | D ${translitFr(tg, words)}`);
  }
} else {
  console.error('[FR-DRAFT] команда: seed | show <урок...>');
  process.exit(2);
}
