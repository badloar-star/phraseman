#!/usr/bin/env node
// зачем: аудит 2026-09-05 нашёл три места, где языки курса переплетались —
// автору всегда говорили «пиши курс английского», вердикты владельца шли
// общей кучей, а сторож новых слов смотрел только в sessions/en. Каждое из
// них тихое: конвейер не падает, просто пишет французскую сессию по
// английским правилам. Этот сторож ловит возврат такого состояния.
//
// Запуск: node check_lang_isolation.mjs [--lang fr]
// Код 0 — изоляция цела; код 1 — найдено переплетение (список в stderr).

import fs from 'fs';
import path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const LOG = (...a) => console.log('[LANG-ISO]', ...a);
const BAD = (...a) => console.error('[LANG-ISO][ПРОБЛЕМА]', ...a);

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const read = (f) => fs.readFileSync(f, 'utf8');
const exists = (f) => fs.existsSync(f);

const problems = [];

// ── 1. Языки, у которых есть курс ────────────────────────────────────────────
const curriculumDir = path.join(ROOT, 'curriculum');
const langs = exists(curriculumDir)
  ? fs.readdirSync(curriculumDir).filter((d) => /^[a-z]{2}$/.test(d) && fs.statSync(path.join(curriculumDir, d)).isDirectory())
  : [];

if (langs.length === 0) {
  BAD('в curriculum/ нет ни одного языка — проверять нечего, это само по себе странно');
  process.exit(1);
}
LOG(`языков с курсом: ${langs.join(', ')}`);

// ── 2. У каждого языка обязан быть свой файл особенностей ────────────────────
// Без него автор и судья бреда работают по правилам чужого языка: французу
// достанутся английские мины про `tall` и `fast`.
for (const lang of langs) {
  const f = path.join(curriculumDir, lang, 'ОСОБЕННОСТИ_ЯЗЫКА.md');
  if (!exists(f)) {
    problems.push(`язык «${lang}»: нет curriculum/${lang}/ОСОБЕННОСТИ_ЯЗЫКА.md — автор и судья бреда останутся без языковых мин`);
    continue;
  }
  const body = read(f);
  if (body.length < 500) {
    problems.push(`язык «${lang}»: ОСОБЕННОСТИ_ЯЗЫКА.md короче 500 знаков (${body.length}) — похоже на заглушку`);
  }
  const plan = path.join(curriculumDir, lang, 'ПЛАН_КУРСА.md');
  if (!exists(plan)) {
    problems.push(`язык «${lang}»: нет ПЛАН_КУРСА.md — конвейер откажется писать сессию`);
  }
}

// ── 3. Промпты не должны жёстко называть один язык ───────────────────────────
// Список промптов, которые обязаны быть языконезависимыми: там, где раньше
// стояло слово «английского», теперь обязана стоять переменная.
const LANG_NEUTRAL_PROMPTS = {
  'author.md': ['{{ЯЗЫК_КУРСА}}', '{{ОСОБЕННОСТИ_ЯЗЫКА}}'],
  'judge_nonsense.md': ['{{ЯЗЫК_КУРСА}}', '{{ОСОБЕННОСТИ_ЯЗЫКА}}'],
  'editor.md': ['{{ЯЗЫК_КУРСА}}', '{{ОСОБЕННОСТИ_ЯЗЫКА}}'],
  'judge_learner.md': ['{{ЯЗЫК_КУРСА}}'],
  'judge_taste.md': ['{{ЯЗЫК_КУРСА}}'],
};

for (const [file, required] of Object.entries(LANG_NEUTRAL_PROMPTS)) {
  const f = path.join(HERE, 'prompts', file);
  if (!exists(f)) {
    problems.push(`промпт ${file} не найден — проверить, не переименован ли`);
    continue;
  }
  const body = read(f);
  for (const token of required) {
    if (!body.includes(token)) {
      problems.push(`промпт ${file}: потерян ${token} — язык курса снова зашит в текст`);
    }
  }
}

// ── 4. Вердикты владельца обязаны фильтроваться по языку ─────────────────────
// Разбор конкретной сессии называется <дата>_<язык>_l01_s01.md. Если такой
// файл существует, а run.mjs его не фильтрует — чужой вкус попадёт в чужой курс.
const runSrc = exists(path.join(HERE, 'run.mjs')) ? read(path.join(HERE, 'run.mjs')) : '';
if (runSrc && !/_\(\[a-z\]\{2\}\)_l\\d\{2\}_s\\d\{2\}|m\[1\] === lang/.test(runSrc)) {
  problems.push('run.mjs: вердикты владельца больше не фильтруются по языку — французскому автору пойдут английские разборы');
}

// ── 5. Сторож новых слов обязан принимать язык ───────────────────────────────
const nwPath = path.join(HERE, 'check_new_words.mjs');
if (exists(nwPath)) {
  const nw = read(nwPath);
  if (nw.includes("'sessions', 'en'") || nw.includes('"sessions", "en"')) {
    problems.push('check_new_words.mjs: путь снова зашит на sessions/en — для остальных языков сторож молча бесполезен');
  }
  if (!/à-ö|À-Ö|\\u00e0/.test(nw)) {
    problems.push('check_new_words.mjs: фильтр слов снова без диакритики — французские слова (prêt, fatigué) выпадут из проверки');
  }
} else {
  problems.push('check_new_words.mjs не найден');
}

// ── 6. Сессии одного языка не должны лежать в папке другого ──────────────────
// Дешёвая проверка на промах руки при копировании.
for (const lang of langs) {
  const dir = path.join(ROOT, 'sessions', lang);
  if (!exists(dir)) continue;
  const lessons = fs.readdirSync(dir).filter((d) => /^l\d{2}$/.test(d));
  for (const lesson of lessons) {
    const sessions = fs.readdirSync(path.join(dir, lesson)).filter((d) => /^s\d{2}$/.test(d));
    for (const s of sessions) {
      const f = path.join(dir, lesson, s, 'final.ru.md');
      if (!exists(f)) continue;
      const head = read(f).split(/\r?\n/).slice(0, 3).join(' ');
      // заголовок вида «# Французский · Урок 1 · Сессия 1»
      const declared = /Английск/i.test(head) ? 'en' : /Французск/i.test(head) ? 'fr' : /Испанск/i.test(head) ? 'es' : null;
      if (declared && declared !== lang) {
        problems.push(`sessions/${lang}/${lesson}/${s}: заголовок объявляет язык «${declared}», а лежит в папке «${lang}»`);
      }
    }
  }
}

// ── Итог ─────────────────────────────────────────────────────────────────────
if (problems.length === 0) {
  LOG(`изоляция цела: ${langs.length} язык(а/ов), промпты языконезависимы, сторожа видят все языки`);
  process.exit(0);
}

BAD(`найдено переплетений: ${problems.length}`);
for (const p of problems) BAD('  ' + p);
BAD('чинить надо изоляцию, а не сторожа: см. аудит 2026-09-05 в этом файле');
process.exit(1);
