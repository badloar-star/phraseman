#!/usr/bin/env node
// classic_beginner_qa — режим «Новичок-проверяющий» (Ревизор, 05.11.2026; дополнение владельца 09:05, стандарт docs/work/classic_plain_explanation_standard_2026-11-05.md).
// Два шага, повторяемые после каждой порции переписанных уроков:
//   1) подготовка:  node scripts/classic_beginner_qa.cjs prepare --course fr --lessons 1-4 [--locale ru] [--tag after_theory_a1b2c3]
//      → docs/work/beginner_qa_2026-11-05/run_<курс>_<уроки>_<метка>/{input.md, PROMPT.md, report.md(пустой шаблон не создаётся)}
//      Агент-читатель (отдельный, БЕЗ контекста, видит только input.md + PROMPT.md) пишет report.md: таблицу «блок → ПОНЯТНО/НЕПОНЯТНО → что именно».
//   2) свод:        node scripts/classic_beginner_qa.cjs collect docs/work/beginner_qa_2026-11-05/run_.../report.md
//      → печатает счёт ПОНЯТНО/НЕПОНЯТНО по блокам и выходной код 1, если есть НЕПОНЯТНО (для RELEASE_GATE_100 D5).
// Блоки урока: INTRO, THEORY, WORDS (новые слова урока из glossary.json — только они), TASKS (первые 6 заданий). Неправильные глаголы/аналог: в modules/classic-courses
// отдельных данных нет (раздел скрыт для не-en) — блок появится, когда данные будут (VERBS ищется в <курс>/verbs.json).
const fs = require('fs');
const path = require('path');
const { theoryTexts, introTexts, ROOT } = require('./classic_plain_reader_extract.cjs');

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; }
function range(spec) { const [a, b] = spec.split('-').map(Number); return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i); }

const PROMPT = (course, lessons, locale) => `Ты — «Новичок-проверяющий»: взрослый человек, который НЕ знает изучаемого языка (${course}) и НЕ знает грамматических слов. Язык интерфейса: ${locale}.
Читай ТОЛЬКО файл input.md рядом с этим текстом. Больше ничего не открывай и не ищи: у реального человека нет другой информации. Ничего не исправляй.
Блоки в input.md помечены кодами вида L3-THEORY, L3-INTRO, L3-WORDS, L3-TASKS (уроки ${lessons.join(', ')}).
Образец тона и понятности — старый английский курс приложения: короткие слова, сначала пример, потом объяснение, ничего «учёного».
Для КАЖДОГО блока скажи: понял бы ты это и смог бы действовать? Выведи ТОЛЬКО таблицу Markdown (по-русски), по одной строке на блок:
| блок | вердикт | что именно |
|---|---|---|
| L1-INTRO | ПОНЯТНО или НЕПОНЯТНО | при НЕПОНЯТНО — цитата непонятного места и почему; при ПОНЯТНО — пусто |
Правила вердикта: НЕПОНЯТНО, если есть хоть одно грамматическое слово без объяснения (подлежащее, форма, спряжение, артикль, падеж, инфинитив, согласование…), слово/фраза из заданий или объяснения, которой нет раньше в тексте, мета-рассуждение «не про действие», повтор чужого урока, пустой блок, английский текст там, где ждёшь ${locale}. Для WORDS: НЕПОНЯТНО, если слово без перевода, повторяет слово из прошлого урока, либо слова из заданий этого урока, которых человек ещё НЕ видел в прошлых уроках, не выданы в списке. Слова прошлых уроков в списке урока специально не повторяются (правило: в уроке N только новые слова, каждое один раз). Накопленный список слов прошлых уроков дан в блоке KNOWN-WORDS в начале input.md, слова предыдущих уроков набора тоже считай известными: слово из заданий/теории, которое есть в KNOWN-WORDS или в WORDS этого или более раннего урока набора, выданным считается. «Слово не выдано» — ошибка, только если его нет ни в KNOWN-WORDS, ни в WORDS уроков до N включительно.
После таблицы одной строкой: итого ПОНЯТНО N из M.`;

function prepare() {
  const course = arg('course'); const lessons = range(arg('lessons', '1-4')); const locale = arg('locale', 'ru'); const tag = arg('tag', new Date().toISOString().slice(0, 10));
  if (!course) { console.error('нужен --course'); process.exit(2); }
  const glossary = JSON.parse(fs.readFileSync(path.join(ROOT, course, 'glossary.json'), 'utf8')).lemmas;
  const dir = path.join(__dirname, '..', 'docs', 'work', 'beginner_qa_2026-11-05', `run_${course}_${lessons[0]}-${lessons[lessons.length - 1]}_${tag}`);
  fs.mkdirSync(dir, { recursive: true });
  let md = `# Курс «${course}», уроки ${lessons.join(', ')} (язык интерфейса: ${locale})\n`;
  // зачем (Координатор/Теория 05.11): в списке урока N только НОВЫЕ слова; читателю нужен накопленный список слов уроков 1..N-1 — иначе «слово не выдано» ложное
  const prior = glossary.filter((l) => l.firstLesson < lessons[0]);
  md += `\n## KNOWN-WORDS (слова прошлых уроков 1–${lessons[0] - 1} — человек их уже изучал, считай известными)\n${prior.map((w) => `${w.lemma} — ${(w.meaning && w.meaning[locale]) || ''}`).join('; ') || '(нет)'}\n`;
  for (const n of lessons) {
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, course, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8'));
    const words = glossary.filter((l) => l.firstLesson === n);
    md += `\n## L${n}-INTRO (вступление перед уроком)\n${introTexts(course, n, locale).map((s) => '- ' + s.replace(/\n/g, ' ')).join('\n') || '(пусто)'}\n`;
    md += `\n## L${n}-THEORY (кнопка «Теория»)\n${theoryTexts(course, n, locale).map((s) => '- ' + s.replace(/\n/g, ' ')).join('\n') || '(пусто)'}\n`;
    md += `\n## L${n}-WORDS (раздел «Слова урока» — только новые слова этого урока)\n${words.map((w) => `- ${w.lemma} — ${(w.meaning && w.meaning[locale]) || '(нет перевода)'}`).join('\n') || '(пусто)'}\n`;
    md += `\n## L${n}-TASKS (первые задания урока: дана фраза, нужно собрать на изучаемом языке из плиток)\n`;
    L.phrases.slice(0, 6).forEach((p, i) => { md += `${i + 1}. «${(p.sourceLocales && p.sourceLocales[locale]) || ''}» → плитки: ${p.tiles.map((t) => t.text || t.correct).join(' | ')}\n`; });
    const verbsFile = path.join(ROOT, course, 'verbs.json');
    if (fs.existsSync(verbsFile)) md += `\n## L${n}-VERBS (раздел «Глаголы»)\n(данные verbs.json — подключить разбор, когда появится формат)\n`;
  }
  fs.writeFileSync(path.join(dir, 'input.md'), md);
  fs.writeFileSync(path.join(dir, 'PROMPT.md'), PROMPT(course, lessons, locale));
  console.log(dir);
}

function collect() {
  const file = process.argv[3];
  const text = fs.readFileSync(file, 'utf8');
  const rows = text.split('\n').filter((l) => /^\|\s*L\d+-[A-Z]+\s*\|/.test(l)).map((l) => l.split('|').map((s) => s.trim()).slice(1, -1));
  const ok = rows.filter((r) => /^ПОНЯТНО/i.test(r[1])).length;
  const bad = rows.filter((r) => /^НЕПОНЯТНО/i.test(r[1]));
  console.log(`блоков ${rows.length}: ПОНЯТНО ${ok}, НЕПОНЯТНО ${bad.length}`);
  bad.forEach((r) => console.log(`  ${r[0]}: ${r[2]}`));
  process.exit(bad.length || !rows.length ? 1 : 0);
}

const cmd = process.argv[2];
if (cmd === 'prepare') prepare(); else if (cmd === 'collect') collect(); else { console.error('prepare --course c --lessons a-b [--locale ru] [--tag t] | collect report.md'); process.exit(2); }
