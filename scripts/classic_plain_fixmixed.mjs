// Чинит смесь алфавитов в исходниках писателей (латинская «ó» внутри русского слова → кириллическая буква + знак ударения). Идемпотентно.
// Запуск: node scripts/classic_plain_fixmixed.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'docs', 'work', 'classic_theory_plain');
const FIX = { á: 'а́', é: 'е́', í: 'и́', ó: 'о́', ú: 'у́', ý: 'ы́', è: 'е́', à: 'а́', ò: 'о́', ì: 'и́', ù: 'у́', a: 'а', e: 'е', o: 'о', c: 'с', p: 'р', x: 'х' };
const fix = (s) => s.replace(/[\p{L}́]+/gu, (w) => (/[Ѐ-ӿ]/.test(w) && /[A-Za-zÀ-ɏ]/.test(w) ? w.replace(/[A-Za-zÀ-ɏ]/g, (c) => FIX[c] ?? c) : w));
const walk = (v, loc) => typeof v === 'string' ? (loc && loc !== 'en' ? fix(v) : v) : Array.isArray(v) ? v.map((x) => walk(x, loc)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].includes(k) ? k : loc)])) : v;
let n = 0;
for (const l of ['en', 'es', 'fr', 'de', 'it']) {
  const dir = join(D, l); if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => /^lesson_\d+\.json$/.test(x))) {
    const p = join(dir, f); const src = readFileSync(p, 'utf8'); const out = JSON.stringify(walk(JSON.parse(src), null), null, 2);
    if (out !== JSON.stringify(JSON.parse(src), null, 2)) { writeFileSync(p, out + '\n'); n++; }
  }
}
console.log('исправлено файлов:', n);
