// Проверка текстов «теория как для ребёнка»: docs/work/classic_theory_plain/<lang>/lesson_NN.json (формат — SPEC.md в той же папке).
// Запуск: node scripts/classic_plain_check.mjs [lang] [lesson]   Выход ≠0, если есть брак. Это механика; смысловая проверка «пятилетнего читателя» — отдельным агентом.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'work', 'classic_theory_plain');
const TERMS = /(подлежащ|сказуем|глагол|существительн|прилагательн|местоимен|наречи|предлог|артикл|падеж|склонен|спряжен|инфинитив|причасти|согласован|вспомогательн|суффикс|окончани|формы\b|форму\b|форма\b|форме\b|времен|ударени|дієслов|іменник|займенник|прикметник|прислівник|прийменник|відмін|дієвідмін|інфінітив|дієприкмет|узгодж|допоміжн|закінчен|verb|noun|article|tense|conjugat|pronoun|adjective|infinitive|participle|suffix|ending)/i;
const META = /(что заучивать|не заучивать|типичная ошибка|нюанс|стратеги|выбор формы|представь ситуацию|уявіть ситуацію|imagine|правило:|що вчити|типова помилка)/i;
const TY = /(^|[^\p{L}])(ты|тебе|тебя|твой|твоя|твоё|твои|ти|тобі|тебе|твій|твоя|твоє|твої)([^\p{L}]|$)/iu;
// «Читается: …» — запись звука русскими буквами (например «ти́ше»), слова «ты/ти» в ней — не обращение
const stripQuoted = (s) => s.replace(/«[^»]*»/g, ' ').replace(/“[^”]*”/g, ' ').replace(/Чита[её]тс[яь][^\n]*/g, ' ').replace(/Читається[^\n]*/g, ' ');
const lang = process.argv[2]; const only = process.argv[3] ? Number(process.argv[3]) : null;
let bad = 0; let checked = 0;
for (const l of lang ? [lang] : ['en', 'es', 'fr', 'de', 'it']) {
  const d = join(DIR, l);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => /^lesson_\d+\.json$/.test(x)).sort()) {
    const n = Number(/\d+/.exec(f)[0]); if (only && n !== only) continue;
    let out; try { out = JSON.parse(readFileSync(join(d, f), 'utf8')); } catch (e) { bad++; console.log(`${l} урок ${n}: файл не JSON (${e.message.slice(0, 60)})`); continue; }
    const inp = JSON.parse(readFileSync(join(DIR, 'input', `${l}_lesson_${String(n).padStart(2, '0')}.json`), 'utf8'));
    const ids = new Set(inp.phrases.map((p) => p.id)); const byId = Object.fromEntries(inp.phrases.map((p) => [p.id, p]));
    // разрешённые слова изучаемого языка: слова фраз урока + слова прошлых уроков из пакета
    const allowed = new Set([...inp.phrases.flatMap((p) => p.target.toLowerCase().split(/[^\p{L}'’]+/u)), ...inp.knownWords.flatMap((w) => String(w).toLowerCase().split(/[^\p{L}'’]+/u)), ...inp.newWords.map((w) => w.lemma.toLowerCase())]);
    // зачем: части слитных слов (dell’acqua → dell’, acqua) тоже разрешены к упоминанию в тексте
    for (const w of [...allowed]) for (const part of w.split(/['’]/)) if (part) allowed.add(part);
    const err = (m) => { bad++; console.log(`${l} урок ${n}: ${m}`); };
    checked++;
    if (!out.chapters?.length || out.chapters.length < 2 || out.chapters.length > 8) err(`глав ${out.chapters?.length}`);
    for (const loc of ['ru', 'uk', 'en']) if (!out.title?.[loc]?.trim()) err(`нет title.${loc}`);
    // уровень урока (Learning V2, 05.11): не меньше 8 реальных заданий; новые слова введены (текст или примеры)
    {
      const real = (out.chapters ?? []).reduce((a, c) => a + (c.practice ?? []).filter((p) => !p.sample).length, 0);
      if (real < 8) err(`реальных заданий ${real} < 8 (на главу: 1 образец + 2 задания)`);
      const shown = new Set((out.chapters ?? []).flatMap((c) => (c.examples ?? []).map((e) => e.phraseId)));
      const text = (out.chapters ?? []).map((c) => `${c.text?.ru ?? ''} ${c.text?.en ?? ''}`).join(' ').toLowerCase();
      const gl = JSON.parse(readFileSync(join(ROOT, 'docs', 'work', 'classic_theory_plain', 'glossary_snapshot', l + '.json'), 'utf8')).lemmas;
      const words = gl.filter((e) => e.firstLesson === n);
      const hasWord = (w) => text.split(/[^\p{L}'’]+/u).includes(w.toLowerCase().replace(/[.,!?;:¿¡«»"]/g, ''));
      const missing = words.filter((e) => !(e.phraseIds ?? []).some((id) => shown.has(id)) && !String(e.lemma).toLowerCase().split(/[\s/(),.]+/u).filter((t) => t.length > 1 && !/^(l|le|la|les|il|lo|gli|i|el|los|las|un|una|der|die|das|den|dem|des|ein|eine|the|a|an|to|f|m|pl)$/.test(t)).some((t) => hasWord(t)));
      if (words.length && missing.length / words.length > 0.1) err(`не введено ${missing.length} из ${words.length} новых слов: ${missing.slice(0, 10).map((e) => e.lemma).join(', ')}`);
      if (shown.size > 30) err(`слишком много примеров: ${shown.size}`);
    }
    for (const ch of out.chapters ?? []) {
      const w = `гл.${ch.id}`;
      for (const loc of ['ru', 'uk', 'en']) {
        const t = ch.text?.[loc]; if (!t?.trim()) { err(`${w}: нет text.${loc}`); continue; }
        if (!ch.title?.[loc]?.trim()) err(`${w}: нет title.${loc}`);
        if (loc !== 'en' && TERMS.test(t + ' ' + (ch.title?.[loc] ?? ''))) err(`${w}.${loc}: термин «${(TERMS.exec(t + ' ' + (ch.title?.[loc] ?? '')) ?? [])[0]}»`);
        if (META.test(t)) err(`${w}.${loc}: мета-блок «${(META.exec(t) ?? [])[0]}»`);
        if (loc !== 'en' && TY.test(stripQuoted(t))) err(`${w}.${loc}: «ты» вне цитаты`);
        if (/(^|[^\p{L}])[\p{L}́]*(?:[Ѐ-ӿ][A-Za-zÀ-ɏ]|[A-Za-zÀ-ɏ][Ѐ-ӿ])[\p{L}́]*/u.test(t) && loc !== 'en') err(`${w}.${loc}: смесь кириллицы и латиницы в одном слове (латинская «ó» в русском слове?)`);
        if (/[​-‍﻿`*#]/.test(t)) err(`${w}.${loc}: служебный символ`);
        for (const line of t.split('\n')) if (line.trim().split(/\s+/).length > 16) err(`${w}.${loc}: длинная строка (${line.trim().split(/\s+/).length} слов)`);
        // изучаемые слова: латинские слова текста (кроме en-локали при языке курса en) должны быть из урока
        if (l !== 'en') for (const tok of t.toLowerCase().split(/[^\p{L}'’]+/u)) if (tok && /^[\p{Script=Latin}'’]+$/u.test(tok) && !allowed.has(tok) && !(loc === 'en')) err(`${w}.${loc}: незнакомое слово «${tok}»`);
      }
      if ((ch.examples ?? []).length < 1) err(`${w}: нет examples`);
      for (const e of ch.examples ?? []) { if (!ids.has(e.phraseId)) err(`${w}: пример ${e.phraseId} не из урока`); if (!e.say?.ru || !e.say?.uk) err(`${w}: нет say.ru/uk у ${e.phraseId}`); }
      // охват и количество заданий проверяются на уровне урока ниже
      let samples = 0;
      for (const p of ch.practice ?? []) {
        if (p.sample) samples++;
        if (!ids.has(p.promptPhraseId) || !(p.options ?? []).every((o) => ids.has(o)) || !(p.options ?? []).includes(p.answerId)) { err(`${w}: задание с неверными id`); continue; }
        if (p.answerId !== p.promptPhraseId) err(`${w}: answerId ≠ promptPhraseId`);
        if (new Set(p.options).size !== p.options.length || p.options.length < 2 || p.options.length > 4) err(`${w}: options`);
        const ph = byId[p.promptPhraseId];
        if (!(p.command?.ru ?? '').includes(`«${ph.ru.replace(/[.!?]$/, '')}`) && !(p.command?.ru ?? '').includes(`«${ph.ru}`)) err(`${w}: command.ru не содержит перевод «${ph.ru}»`);
        if (!(p.command?.uk ?? '').includes(`«${ph.uk.replace(/[.!?]$/, '')}`) && !(p.command?.uk ?? '').includes(`«${ph.uk}`)) err(`${w}: command.uk не содержит перевод «${ph.uk}»`);
      }
    }
  }
}
console.log(`проверено уроков: ${checked}, замечаний: ${bad}`);
process.exit(bad ? 1 : 0);
