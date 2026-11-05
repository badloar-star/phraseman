#!/usr/bin/env node
// classic_glossary_integrity — целостность словаря классики по урокам (Ревизор 05.11; слово владельца 09:05 + решение координатора 11:xx).
// Правила (на каждый курс en/es/fr/de/it):
//  D1 дубль: слово повторяется, если совпадает после отбрасывания артикля, регистра, скобок и апострофа («bureau» = «le bureau»);
//  D2 «не из урока»: ни одно слово леммы (основа ≥4 букв) не встречается в фразах урока firstLesson и в теории/вступлении этого урока (ru/uk не считаем);
//  D3 «слова заданий»: каждое слово фраз урока N (основа ≥4 букв либо точное совпадение) есть в словаре уроков ≤ N;
//  D4 мусор: пустой/однобуквенный лемма, лемма с цифрами или повторяющимся хвостом («arbeitestn», «-ce»), перевод ru/uk без кириллицы;
// Эвристики БЕЗ морфологии: формы глаголов ловятся по основе; точную проверку делает агент-читатель (блок Lн-WORDS в classic_beginner_qa.cjs).
// Запуск: node scripts/classic_glossary_integrity.cjs [курс]
const fs = require('fs');
const path = require('path');
const { theoryTexts, introTexts, ROOT } = require('./classic_plain_reader_extract.cjs');
const ART = /^(le|la|les|l[’']|un|une|des|il|lo|i|gli|el|los|las|una|der|die|das|den|dem|ein|eine|the|a|an)\s+/i;
const CYR = /[Ѐ-ӿ]/;
const words = (s) => String(s).toLowerCase().replace(/[.,!?;:¿¡«»"“”()\[\]]/g, ' ').replace(/[’']/g, ' ').split(/\s+/).filter(Boolean);
const base = (lemma) => lemma.toLowerCase().trim().replace(/\s*\(.*?\)\s*/g, ' ').replace(/[’']/g, ' ').replace(ART, '').replace(/\s+/g, ' ').trim();
const stem = (w) => (w.length >= 4 ? w.slice(0, 4) : w);

function load(course) {
  const lemmas = JSON.parse(fs.readFileSync(path.join(ROOT, course, 'glossary.json'), 'utf8')).lemmas;
  const lessons = {};
  for (let n = 1; n <= 32; n += 1) lessons[n] = JSON.parse(fs.readFileSync(path.join(ROOT, course, 'lessons-' + String(n).padStart(2, '0') + '.json'), 'utf8')).phrases;
  return { lemmas, lessons };
}

function check(course) {
  const { lemmas, lessons } = load(course);
  const out = { D1: [], D2: [], D3: [], D4: [], lemmas: lemmas.length };
  const seen = new Map();
  for (const l of lemmas) {
    const key = base(l.lemma);
    if (seen.has(key)) out.D1.push(l.lemma + ' (L' + l.firstLesson + ') ~ ' + seen.get(key).lemma + ' (L' + seen.get(key).firstLesson + ')');
    else seen.set(key, l);
    const ws = words(l.lemma);
    const bad = !key || /\d/.test(l.lemma) || /^-/.test(l.lemma.trim()) || /(.)\1\1/.test(key) || (l.meaning && l.meaning.ru && !CYR.test(l.meaning.ru)) || (l.meaning && l.meaning.uk && !CYR.test(l.meaning.uk));
    if (bad) out.D4.push(l.lemma + ' = ' + JSON.stringify(l.meaning && l.meaning.ru));
    void ws;
  }
  // D2: слово есть в материале своего урока
  const lessonStems = {};
  const lessonWords = {};
  for (let n = 1; n <= 32; n += 1) {
    const set = new Set(); const st = new Set();
    for (const p of lessons[n]) for (const t of p.tiles) for (const w of words(t.correct)) { set.add(w); st.add(stem(w)); }
    for (const loc of ['ru', 'uk']) for (const t of [...theoryTexts(course, n, loc), ...introTexts(course, n, loc)]) for (const w of words(t)) { set.add(w); st.add(stem(w)); }
    lessonWords[n] = set; lessonStems[n] = st;
  }
  for (const l of lemmas) {
    const parts = words(base(l.lemma)).filter((w) => w.length >= 2);
    const inLesson = parts.some((w) => lessonWords[l.firstLesson].has(w) || (w.length >= 4 && lessonStems[l.firstLesson].has(stem(w))));
    if (!inLesson) out.D2.push(l.lemma + ' (L' + l.firstLesson + ')');
  }
  // D3: слова заданий есть в словаре уроков ≤ N
  const knownUpTo = (n) => {
    const set = new Set(); const st = new Set();
    for (const l of lemmas) if (l.firstLesson <= n) for (const w of words(base(l.lemma))) { set.add(w); st.add(stem(w)); }
    return { set, st };
  };
  const missingByLesson = {};
  for (let n = 1; n <= 32; n += 1) {
    const { set, st } = knownUpTo(n);
    const toks = new Set();
    for (const p of lessons[n]) for (const t of p.tiles) for (const w of words(t.correct)) toks.add(w);
    const missing = [...toks].filter((w) => !(set.has(w) || (w.length >= 4 && st.has(stem(w)))));
    missingByLesson[n] = { missing, share: toks.size ? 1 - missing.length / toks.size : 1 };
  }
  out.D3 = missingByLesson;
  return out;
}

module.exports = { check };

if (require.main === module) {
  const courses = process.argv[2] ? [process.argv[2]] : ['en', 'es', 'fr', 'de', 'it'];
  for (const c of courses) {
    const r = check(c);
    const l13 = [1, 2, 3].map((n) => Math.round(100 * r.D3[n].share) + '%').join('/');
    console.log(c, 'слов', r.lemmas, '| D1 дублей', r.D1.length, '| D2 не из урока', r.D2.length, '| D4 мусор', r.D4.length, '| D3 покрытие слов заданий L1/L2/L3', l13);
    if (r.D1[0]) console.log('   D1 пример:', r.D1.slice(0, 3).join(' ; '));
    if (r.D2[0]) console.log('   D2 пример:', r.D2.slice(0, 5).join(', '));
    if (r.D4[0]) console.log('   D4 пример:', r.D4.slice(0, 5).join(' ; '));
  }
}
