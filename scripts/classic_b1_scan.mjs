// Программная проверка B1 по ВСЕМ фразам (правило владельца 05.11: ни один соблазн — ни один, ни парой на разных позициях — не завершает верную фразу).
// B1 = подстановка даёт верную фразу ТОГО ЖЕ смысла (та же ru или uk подсказка, либо свои target/alt/accepted); чужая фраза курса с другим смыслом — не B1.
// Подставляем каждый соблазн на свою позицию (и пары соблазнов на двух позициях) и сверяем с словарём верных фраз курса:
// target + допустимые пути (accepted) + alternatives ВСЕХ фраз языка. Запуск: node scripts/classic_b1_scan.mjs [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const strip = (t) => t.toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '');
const key = (toks) => toks.map(strip).join(' ');
const tok = (s) => s.replace(/[¿¡?!.,;:«»"]/g, ' ').split(/\s+/).filter(Boolean);
const out = [];
const per = {};
for (const l of ['en', 'es', 'fr', 'de', 'it']) {
  const phrases = [];
  for (let n = 1; n <= 32; n++) phrases.push(...JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', l, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')).phrases);
  const byId = new Map(phrases.map((p) => [p.id, p]));
  const sameMeaning = (a, b) => a === b || (byId.get(a).sourceLocales.ru === byId.get(b).sourceLocales.ru) || (byId.get(a).sourceLocales.uk === byId.get(b).sourceLocales.uk);
  const good = new Map(); // ключ верной фразы → id
  for (const p of phrases) {
    good.set(key(p.tiles.map((t) => t.correct)), p.id);
    for (const a of p.accepted ?? []) good.set(key(a), p.id);
    for (const a of p.alternatives ?? []) good.set(key(tok(a)), p.id);
  }
  per[l] = { single: 0, pair: 0, phrases: new Set() };
  for (const p of phrases) {
    const c = p.tiles.map((t) => t.correct);
    p.tiles.forEach((t, i) => t.distractors.forEach((d) => {
      const arr = c.slice(); arr[i] = d;
      const hit = good.get(key(arr));
      if (hit && sameMeaning(p.id, hit)) { per[l].single++; per[l].phrases.add(p.id); out.push({ lang: l, id: p.id, kind: 'single', pos: [i], words: [d], gives: arr.join(' '), of: hit }); }
    }));
    for (let i = 0; i < p.tiles.length; i++) for (let j = i + 1; j < p.tiles.length; j++) for (const di of p.tiles[i].distractors) for (const dj of p.tiles[j].distractors) {
      const arr = c.slice(); arr[i] = di; arr[j] = dj;
      const hit = good.get(key(arr));
      if (hit && sameMeaning(p.id, hit)) { per[l].pair++; per[l].phrases.add(p.id); out.push({ lang: l, id: p.id, kind: 'pair', pos: [i, j], words: [di, dj], gives: arr.join(' '), of: hit }); }
    }
  }
}
console.log('язык | фраз с B1 | одиночных | пар');
for (const l of Object.keys(per)) console.log(`${l} | ${per[l].phrases.size} | ${per[l].single} | ${per[l].pair}`);
const ix = process.argv.indexOf('--json');
if (ix > 0) writeFileSync(process.argv[ix + 1], JSON.stringify(out, null, 1));
