// зачем: P0 владельца 05.11 — в локалях кроме ru/uk не должно быть упоминаний русского языка/кириллицы/«русских букв»;
// текст пишется под читателя своей локали. Сканирует modules/classic-courses/*/{theory,intro,glossary,...}.json и docs/work/classic_theory_plain.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RX = /(russian|russo|brusob|brusas?b|brusse?s?b|russisch|russische|russen|cyrillic|cirílic|cirilic|kyrillisch|cyrillique|cirillic|кирил|bрус(ск|ки)|rusça|rosyjsk|tiếng nga|bahasa rusia)/i;
const KEEP = new Set(['ru', 'uk']);
const hits = [];
const walk = (v, path, loc) => {
  if (typeof v === 'string') { if (!KEEP.has(loc) && RX.test(v)) hits.push({ path, loc, text: v.slice(Math.max(0, v.search(RX) - 40), v.search(RX) + 60) }); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, loc)); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    const m = /(?:^|[A-Za-z])(Ru|Uk|En|Es|PtBr|Vi|Id|Tr|Pl)$/.exec(k) ?? null;
    let l = loc;
    if (['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].includes(k)) l = k; else if (m) l = m[1].toLowerCase();
    walk(x, `${path}.${k}`, l);
  }
};
const only = process.argv[2];
for (const lang of ['en', 'es', 'fr', 'de', 'it']) {
  if (only && only !== lang) continue;
  const d = join(ROOT, 'modules', 'classic-courses', lang);
  for (const f of readdirSync(d).filter((x) => x.endsWith('.json'))) walk(JSON.parse(readFileSync(join(d, f), 'utf8')), `${lang}/${f}`, 'other');
}
const out = hits.reduce((a, h) => { const k = h.path.split(/[.\[]/)[0] + ' ' + h.loc; (a[k] ??= []).push(h); return a; }, {});
for (const [k, v] of Object.entries(out)) { console.log(`${k}: ${v.length}`); console.log('   ', v[0].path, '|', v[0].text.replace(/\n/g, ' ')); }
console.log(`всего мест: ${hits.length}`);
process.exit(hits.length ? 1 : 0);
