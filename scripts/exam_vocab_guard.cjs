#!/usr/bin/env node
// exam_vocab_guard — сторож «в экзамене уровня только слова из пройденных уроков» (Ревизор 05.11, слово владельца:
// «экзамены между уроками A1, A2… — только те фразы и слова, которые были в этих уроках»).
// зачем: экзамен уровня собирается КОДОМ (app/level_exam_blueprint.ts) из фраз уроков диапазона уровня
// (COURSE_LEVEL_RANGES: A1 1–8, A2 9–18, B1 19–28, B2 29–32); цели и варианты «угадай фразу»/«найди ошибку» берутся из тех же уроков,
// а вот СОБЛАЗНЫ — fill_gap (варианты слова), translate_build (до 2 лишних плиток), find_oddity (подмена) — из word.distractors фразы.
// Эти соблазны — слова класса, их легко взять из будущих уроков. Скрипт для каждого уровня берёт все соблазны всех плиток фраз
// уроков уровня и проверяет, что слово есть в словаре уроков 1..последний урок уровня (слова целей фраз + формы/леммы словаря с firstLesson ≤ последнего).
// ВАЖНО (Координатор 05.11): это ОТЧЁТ ПО ДАННЫМ (сырые соблазны плиток), а не по выдаче экзамена. Экзамен уровня строится кодом только для en
// (LevelExamV2, studyTarget 'en'); принимать по ВЫДАЧЕ — tests/exam_vocab_emitted_2026_11_05.test.ts (Ядро). Для es/fr/de/it экзамена уровня нет, данные ради экзаменов не чистим.
// Запуск: node scripts/exam_vocab_guard.cjs [курсы=en,es,fr,de,it] [--json out.json] [--list] [--strict] ; код выхода 1 при нарушениях ТОЛЬКО с --strict.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
// зачем: те же диапазоны, что в app/course_levels.ts (COURSE_LEVEL_RANGES) — менять вместе
const LEVELS = { A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32] };
const args = process.argv.slice(2);
const courses = (args.find((a) => !a.startsWith('--')) || 'en,es,fr,de,it').split(',');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const LIST = args.includes('--list');

const norm = (w) => String(w).toLowerCase().normalize('NFC').replace(/[’`]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const tokens = (s) => String(s).split(/[\s/]+/).map(norm).filter(Boolean);
const lessonFile = (c, n) => path.join(ROOT, c, `lessons-${String(n).padStart(2, '0')}.json`);

const report = [];
for (const c of courses) {
  const lessons = {};
  for (let n = 1; n <= 32; n += 1) lessons[n] = JSON.parse(fs.readFileSync(lessonFile(c, n), 'utf8')).phrases;
  const gl = fs.existsSync(path.join(ROOT, c, 'glossary.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, c, 'glossary.json'), 'utf8')).lemmas : [];
  for (const [level, [from, to]] of Object.entries(LEVELS)) {
    // словарь уроков 1..to: слова целей и допустимых ответов + леммы/формы словаря с firstLesson ≤ to
    const vocab = new Set();
    for (let n = 1; n <= to; n += 1) for (const p of lessons[n]) {
      tokens(p.target).forEach((w) => vocab.add(w));
      for (const a of p.alternatives || []) tokens(a).forEach((w) => vocab.add(w));
    }
    for (const l of gl) if (l.firstLesson <= to) { tokens(l.lemma).forEach((w) => vocab.add(w)); for (const f of l.forms || []) tokens(f).forEach((w) => vocab.add(w)); }
    const bad = new Map(); // слово -> [id фраз]
    let decoyWords = 0; const phrasesWithBad = new Set(); let phrasesTotal = 0;
    for (let n = from; n <= to; n += 1) for (const p of lessons[n]) {
      phrasesTotal += 1;
      for (const t of p.tiles) for (const d of t.distractors || []) {
        const ws = tokens(d); decoyWords += 1;
        if (ws.some((w) => !vocab.has(w))) {
          const key = norm(d);
          if (!bad.has(key)) bad.set(key, []);
          bad.get(key).push(p.id);
          phrasesWithBad.add(p.id);
        }
      }
    }
    report.push({ course: c, level, lessons: `${from}-${to}`, vocab: vocab.size, phrases: phrasesTotal, decoys: decoyWords, badDecoyWords: bad.size, badDecoyOccurrences: [...bad.values()].reduce((a, v) => a + v.length, 0), phrasesWithBad: phrasesWithBad.size, sample: [...bad.entries()].slice(0, 12).map(([w, ids]) => `${w}×${ids.length}`), ...(LIST ? { list: Object.fromEntries(bad) } : {}) });
  }
}
console.table(report.map(({ list, sample, ...r }) => ({ ...r, примеры: sample.slice(0, 6).join(' ') })));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
const total = report.reduce((a, r) => a + r.badDecoyOccurrences, 0);
console.log(`нарушений (соблазн вне словаря пройденных уроков): ${total}`);
process.exit(total && args.includes('--strict') ? 1 : 0);
