// Входные пакеты для писателей «теории как для ребёнка» (стандарт docs/work/classic_plain_explanation_standard_2026-11-05.md).
// Запуск: node scripts/classic_plain_input.mjs <lang|all> <from> <to>  → docs/work/classic_theory_plain/input/<lang>_lesson_NN.json
// В пакете: фразы урока (id, target, ru, uk, плитки), слова, ВПЕРВЫЕ встреченные в этом уроке и в прошлых (lemma, ru, uk), темы прошлых уроков, старая теория (только как подсказка о теме).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'work', 'classic_theory_plain', 'input');
mkdirSync(OUT, { recursive: true });
const langArg = process.argv[2] ?? 'all';
const from = Number(process.argv[3] ?? 1); const to = Number(process.argv[4] ?? from);
const langs = langArg === 'all' ? ['en', 'es', 'fr', 'de', 'it'] : [langArg];
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const titleOf = (th, fmt) => fmt === 'studio2' ? th.localized?.ru?.title : th.title?.ru;
for (const lang of langs) {
  const dir = join(ROOT, 'modules', 'classic-courses', lang);
  const theory = J(join(dir, 'theory.json')); const gl = J(join(dir, 'glossary.json')).lemmas;
  for (let n = from; n <= to; n++) {
    const L = J(join(dir, `lessons-${String(n).padStart(2, '0')}.json`)).phrases;
    const th = theory.data[String(n)];
    const oldRu = theory.format === 'studio2'
      ? [th.localized.ru.story, th.localized.ru.use, ...(th.localized.ru.chapters ?? []).map((c) => c.body)].filter(Boolean).join(' ')
      : (th.chapters ?? []).map((c) => c.textByLocale?.ru).filter(Boolean).join(' ');
    const pack = {
      lang, lesson: n,
      instructions: 'docs/work/classic_plain_explanation_standard_2026-11-05.md',
      phrases: L.map((p) => ({ id: p.id, target: p.target, ru: p.sourceLocales.ru, uk: p.sourceLocales.uk })),
      newWords: gl.filter((e) => e.firstLesson === n).map((e) => ({ lemma: e.lemma, ru: e.meaning.ru, uk: e.meaning.uk })),
      knownWords: gl.filter((e) => e.firstLesson < n).map((e) => e.lemma),
      previousTopics: Array.from({ length: n - 1 }, (_, i) => ({ lesson: i + 1, title: titleOf(theory.data[String(i + 1)], theory.format) })),
      oldTopicTitle: titleOf(th, theory.format),
      oldTheoryRu: oldRu.slice(0, 3000),
    };
    writeFileSync(join(OUT, `${lang}_lesson_${String(n).padStart(2, '0')}.json`), JSON.stringify(pack, null, 1));
  }
}
console.log('ok');
