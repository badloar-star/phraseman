// зачем (владелец 05.11, словарь урока = НОВЫЕ слова урока, по одному разу, включая слова заданий; без лемматизатора — без мусорных лемм mangion/arbeitestn):
// единица словаря = слово-форма как в плитках верных ответов. Вход для переводчиков: новые в уроке N формы + 2 фразы-примера.
// Запуск: node scripts/classic_vocab_input.mjs <lang|all> <from> <to>  → docs/work/classic_vocab/input/<lang>_NN.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '').trim();
export function newFormsByLesson(lang) {
  const seen = new Set(); const out = {};
  for (let n = 1; n <= 32; n++) {
    const ph = JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', lang, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')).phrases;
    const words = new Map();
    for (const p of ph) for (const t of p.tiles) {
      const f = norm(t.correct); if (!f || !/\p{L}/u.test(f)) continue;
      if (seen.has(f)) continue;
      if (!words.has(f)) words.set(f, { form: f, surface: t.correct.replace(/[.,!?;:¿¡«»"]/g, ''), count: 0, examples: [] });
      const w = words.get(f); w.count++;
      if (w.examples.length < 2 && !w.examples.some((e) => e.id === p.id)) w.examples.push({ id: p.id, target: p.tiles.map((x) => x.correct).join(' '), ru: p.sourceLocales?.ru ?? p.ru, en: p.sourceLocales?.en });
    }
    for (const f of words.keys()) seen.add(f);
    out[n] = [...words.values()];
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('classic_vocab_input.mjs')) {
  const [langArg, from = '1', to = '6'] = process.argv.slice(2);
  const dir = join(ROOT, 'docs', 'work', 'classic_vocab', 'input'); mkdirSync(dir, { recursive: true });
  for (const lang of langArg === 'all' || !langArg ? ['en', 'es', 'fr', 'de', 'it'] : [langArg]) {
    const by = newFormsByLesson(lang);
    for (let n = Number(from); n <= Number(to); n++) {
      writeFileSync(join(dir, `${lang}_${String(n).padStart(2, '0')}.json`), JSON.stringify({ lang, lesson: n, words: by[n] }, null, 1));
    }
    console.log(lang, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => by[n]?.length ?? 0).join('/'), '… всего форм', Object.values(by).reduce((s, a) => s + a.length, 0));
  }
}
