/**
 * List duplicate ru+uk with different `en` across WORDS_BY_LESSON.
 * Run: npx tsx tools/lesson_qa/dup_ru_uk_scan.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const p = path.join(ROOT, 'app', 'lesson_words.tsx');
const s = fs.readFileSync(p, 'utf8');

const lessonRe = /^\s{2}(\d+):\s*\[/gm;
const matches: { start: number; lid: number }[] = [];
let m: RegExpExecArray | null;
while ((m = lessonRe.exec(s)) !== null) {
  matches.push({ start: m.index, lid: parseInt(m[1], 10) });
}

/** Match en/ru/uk with '...' or "..." */
const q = (name: string) => `${name}:\\s*(['"])(.*?)\\1`;

type Row = { lid: number; en: string; ru: string; uk: string };
const rows: Row[] = [];

const rowRe = new RegExp(
  `\\{\\s*${q('en')},\\s*${q('ru')},\\s*${q('uk')}`,
  'gs',
);

for (let i = 0; i < matches.length; i++) {
  const block = s.slice(matches[i].start, matches[i + 1]?.start ?? s.length);
  let rm: RegExpExecArray | null;
  const local = new RegExp(rowRe.source, 'gs');
  while ((rm = local.exec(block)) !== null) {
    const en = rm[2].replace(/\\(.)/g, '$1');
    const ru = rm[4].replace(/\\(.)/g, '$1');
    const uk = rm[6].replace(/\\(.)/g, '$1');
    rows.push({ lid: matches[i].lid, en, ru, uk });
  }
}

const byKey = new Map<string, Row[]>();
for (const r of rows) {
  const k = `${r.ru}|||${r.uk}`;
  const arr = byKey.get(k) ?? [];
  arr.push(r);
  byKey.set(k, arr);
}

const out: string[] = [];
for (const [k, arr] of byKey) {
  const ens = new Set(arr.map((x) => x.en.toLowerCase()));
  if (arr.length > 1 && ens.size > 1) {
    const ru = k.split('|||')[0];
    const lines = [...new Set(arr.map((x) => `L${x.lid}:${x.en}`))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    out.push(`${ru} => ${lines.join(' | ')}`);
  }
}
out.sort();
console.log(`Parsed ${rows.length} rows; duplicate ru+uk with different en: ${out.length}\n`);
console.log(out.join('\n'));
