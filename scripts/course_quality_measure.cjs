#!/usr/bin/env node
// course_quality_measure — механический ПОЛНЫЙ проход по всему корпусу классики: ошибок / единиц по курсу × разделу (Ревизор 05.11; требование владельца ≤1% на фулл-курс).
// Считает только то, что проверяется детерминированно. Смысловые классы (кальки/неверный перевод, «соблазн подходит по смыслу», понятность новичку) добавляются из аудита моделью
// (docs/work/course_quality_1pct/llm_*.json, формат: [{course, section, id, class, note}]) — см. docs/work/release/COURSE_QUALITY_1PCT.md.
// Запуск: node scripts/course_quality_measure.cjs [--json out.json]
const fs = require('fs');
const path = require('path');
const { theoryTexts, introTexts, ROOT } = require('./classic_plain_reader_extract.cjs');
const { scan: crossScan } = require('./classic_cross_language_scan.cjs');
const COURSES = ['en', 'es', 'fr', 'de', 'it'];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CYR = /[Ѐ-ӿ]/g;
const LAT = /[A-Za-z]/g;
const FORBID_RU = /подлежащ|сказуем|спряжен|вспомогательн|артикл|падеж|инфинитив|причасти|согласован|склонен|выбор форм|что заучивать|не заучивать|типичная ошибка|герунд|субъюнктив|сослагательн|наклонени|залог|представь(те)? ситуацию/i;
const FORBID_UK = /підмет|присудк|дієвідмін|відмінюванн|допоміжн|артикл|інфінітив|дієприкметник|узгодж|вибір форми|що вчити|типова помилка|герунд|уяви(ть)? ситуацію/i;
const META = /образец — это уже готовый ответ|курс переводит|в карточке ниже|взаимозаменяем|механическая замена/i;
const STUB = /пока готовится|ще готується|скоро откроется|скоро відкриється|being prepared|\bTODO\b|\?\?\?|lorem ipsum/;
const norm = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡«»"“”]/g, '').replace(/\s+/g, ' ').trim();
const asText = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ') : typeof v === 'string' ? v : '').trim();

function bagWalk(v, cb, trail) {
  const t = trail || '';
  if (Array.isArray(v)) v.forEach((x, i) => bagWalk(x, cb, t + '[' + i + ']'));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'textByLocale' || k === 'titleByLocale') && x && typeof x === 'object' && !Array.isArray(x)) cb(x, t + '.' + k);
      else bagWalk(x, cb, t + '.' + k);
    }
  }
}

function measure() {
  const res = {};
  const cross = crossScan();
  for (const c of COURSES) {
    const R = { phrases: { units: 0, errors: [] }, distractors: { units: 0, errors: [] }, glossary: { units: 0, errors: [] }, coverage: { units: 0, errors: [] }, theory: { units: 0, errors: [] }, intro: { units: 0, errors: [] } };
    const targets = new Map();
    const gl = JSON.parse(fs.readFileSync(path.join(ROOT, c, 'glossary.json'), 'utf8')).lemmas;
    const linked = new Set(gl.flatMap((l) => l.phraseIds));
    for (let n = 1; n <= 32; n += 1) {
      const L = JSON.parse(fs.readFileSync(path.join(ROOT, c, 'lessons-' + String(n).padStart(2, '0') + '.json'), 'utf8'));
      for (const p of L.phrases) {
        R.phrases.units += 1;
        R.distractors.units += 1;
        const e = (sec, cls) => R[sec].errors.push({ id: p.id, class: cls });
        const sl = p.sourceLocales || {};
        for (const loc of LOCALES) if (!asText(sl[loc])) e('phrases', 'P1_нет_перевода_' + loc);
        if (sl.ru && sl.en && norm(sl.ru) === norm(sl.en) && sl.ru.length > 8) e('phrases', 'P2_ru=en');
        if (sl.ru && (sl.ru.match(CYR) || []).length === 0 && sl.ru.length > 8) e('phrases', 'P2_ru_без_кириллицы');
        if (sl.uk && (sl.uk.match(CYR) || []).length === 0 && sl.uk.length > 8) e('phrases', 'P2_uk_без_кириллицы');
        const corr = p.tiles.map((t) => t.correct);
        if (!p.tiles.length) e('phrases', 'P3_нет_плиток');
        if (norm(corr.join(' ')) !== norm(p.target)) e('phrases', 'P3_плитки≠цель');
        // зачем: у en (старый формат) поля accepted нет — проверка только там, где оно есть
        if (Array.isArray(p.accepted) && !p.accepted.some((a) => norm(a.join(' ')) === norm(corr.join(' ')))) e('phrases', 'P4_accepted_без_верного');
        const key = norm(p.target);
        if (targets.has(key)) e('phrases', 'P5_дубль_цели'); else targets.set(key, p.id);
        if (STUB.test(JSON.stringify(p))) e('phrases', 'P6_заглушка');
        for (const t of p.tiles) {
          const d = t.distractors || [];
          if (d.some((x) => norm(x) === norm(t.correct))) e('distractors', 'D1_соблазн=верная');
          if (new Set(d.map(norm)).size !== d.length) e('distractors', 'D2_дубль_соблазнов');
          if (d.length < 3) e('distractors', 'D3_мало_соблазнов');
        }
        const accepted = new Set([norm(corr.join(' ')), ...(p.accepted || []).map((a) => norm(a.join(' '))), ...(p.alternatives || []).map(norm)]);
        let single = false;
        for (let i = 0; i < p.tiles.length && !single; i += 1) {
          for (const di of p.tiles[i].distractors || []) {
            if (accepted.has(norm(corr.map((x, k) => (k === i ? di : x)).join(' ')))) { single = true; break; }
          }
        }
        if (single) e('distractors', 'D4_одиночная_подстановка');
        let pair = false;
        for (let i = 0; i < p.tiles.length && !pair; i += 1) {
          for (let j = i + 1; j < p.tiles.length && !pair; j += 1) {
            for (const di of p.tiles[i].distractors || []) {
              for (const dj of p.tiles[j].distractors || []) {
                if (accepted.has(norm(corr.map((x, k) => (k === i ? di : k === j ? dj : x)).join(' ')))) { pair = true; break; }
              }
              if (pair) break;
            }
          }
        }
        if (pair) e('distractors', 'D5_пара_соблазнов');
        R.coverage.units += 1;
        if (!linked.has(p.id)) e('coverage', 'V0_фраза_без_слов_словаря');
      }
    }
    const seen = new Set();
    for (const l of gl) {
      R.glossary.units += 1;
      const e = (cls) => R.glossary.errors.push({ id: l.lemma, class: cls });
      if (!asText(l.meaning && l.meaning.ru)) e('V1_нет_ru');
      if (!asText(l.meaning && l.meaning.uk)) e('V1_нет_uk');
      if (l.meaning && l.meaning.ru && !(l.meaning.ru.match(CYR) || []).length) e('V2_ru_не_кириллица');
      if (/артикл|вспомогательн|спряжен|подлежащ/i.test(JSON.stringify(l.meaning || {}))) e('V3_грамматика_вместо_перевода');
      const k = l.lemma.toLowerCase().trim();
      if (seen.has(k)) e('V4_повтор_слова');
      seen.add(k);
    }
    for (let n = 1; n <= 32; n += 1) {
      for (const loc of ['ru', 'uk']) {
        for (const t of theoryTexts(c, n, loc)) {
          R.theory.units += 1;
          const e = (cls) => R.theory.errors.push({ id: c + ':T' + n + ':' + loc, class: cls, note: t.slice(0, 80) });
          if ((loc === 'ru' ? FORBID_RU : FORBID_UK).test(t)) e('T1_запрещённый_термин');
          if (META.test(t)) e('T5_мета_фраза');
          if (t.length > 40 && (t.match(CYR) || []).length * 3 < (t.replace(/`[^`]*`|«[^»]*»/g, '').match(LAT) || []).length) e('T4_нет_кириллицы');
        }
        for (const t of introTexts(c, n, loc)) {
          R.intro.units += 1;
          const e = (cls) => R.intro.errors.push({ id: c + ':I' + n + ':' + loc, class: cls, note: t.slice(0, 80) });
          if ((loc === 'ru' ? FORBID_RU : FORBID_UK).test(t)) e('I1_запрещённый_термин_или_шаблон');
          if (META.test(t)) e('I2_мета_фраза');
        }
      }
    }
    const th = JSON.parse(fs.readFileSync(path.join(ROOT, c, 'theory.json'), 'utf8')).data;
    for (const d of Object.values(th)) {
      bagWalk(d, (bag, at) => {
        const en = asText(bag.en);
        if (en.length > 25) {
          for (const loc of ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
            if (!(c === 'es' && loc === 'es') && asText(bag[loc]) === en) R.theory.errors.push({ id: c + at + '[' + loc + ']', class: 'T3_английская_копия', note: en.slice(0, 60) });
          }
        }
      });
    }
    for (const x of cross.filter((y) => y.file.startsWith(c + '/'))) R.theory.errors.push({ id: x.at, class: 'T2_чужой_язык', note: x.hit });
    res[c] = R;
  }
  return res;
}

function summarize(res) {
  const rows = [];
  for (const c of COURSES) {
    for (const sec of ['phrases', 'distractors', 'glossary', 'coverage', 'theory', 'intro']) {
      const r = res[c][sec];
      const bad = new Set(r.errors.map((x) => x.id)).size;
      const byClass = r.errors.reduce((a, x) => { const k = x.class.replace(/_(ru|uk|en|es|pt-BR|vi|id|tr|pl)$/, ''); a[k] = (a[k] || 0) + 1; return a; }, {});
      rows.push({ course: c, section: sec, units: r.units, errorUnits: bad, pct: r.units ? +(100 * bad / r.units).toFixed(2) : 0, byClass });
    }
  }
  return rows;
}

module.exports = { measure, summarize };

if (require.main === module) {
  const res = measure();
  const rows = summarize(res);
  console.table(rows.map((r) => ({ курс: r.course, раздел: r.section, единиц: r.units, 'с ошибкой': r.errorUnits, '%': r.pct })));
  rows.forEach((r) => { if (r.errorUnits) console.log(r.course, r.section, JSON.stringify(r.byClass)); });
  const j = process.argv.indexOf('--json');
  if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ rows, res }, null, 1));
}
