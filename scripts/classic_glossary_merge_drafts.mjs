// зачем (владелец 05.11, «все слова из фраз в словаре»): склеить кандидаты лемм (docs/work/classic_glossary_candidates/<lang>.json: pos, forms, firstLesson, phraseIds)
// с черновиками переводов Локального ИИ (LocalAI/swarm/out/drafts/glossary/<lang>.json: meaning ru/uk/en/es) → docs/work/classic_glossary_new/<lang>.json,
// который читает classic_course_pack.mjs. Берём только записи без problems и с непустыми ru/uk; остальное попадает в *_rejected.json для ручной/Opus-проверки.
// Запуск: node scripts/classic_glossary_merge_drafts.mjs [lang…]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS = 'C:/Users/badlo/Documents/LocalAI/swarm/out/drafts/glossary';
const OUT = join(ROOT, 'docs', 'work', 'classic_glossary_new'); mkdirSync(OUT, { recursive: true });
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'de', 'it', 'es'];
// зачем: локальная модель вставляет латинские буквы в русские слова («лавa») — меняем на кириллические двойники (сторож смеси алфавитов в тестах)
const LAT2CYR = { a: 'а', e: 'е', o: 'о', c: 'с', p: 'р', x: 'х', y: 'у', i: 'і', A: 'А', E: 'Е', O: 'О', C: 'С', P: 'Р', X: 'Х', B: 'В', H: 'Н', K: 'К', M: 'М', T: 'Т' };
const fixMixed = (str) => String(str).replace(/[\p{L}́]+/gu, (w) => (/[Ѐ-ӿ]/.test(w) && /[A-Za-z]/.test(w) ? w.replace(/[A-Za-z]/g, (ch) => LAT2CYR[ch] ?? ch) : w));
const ne = (s) => typeof s === 'string' && s.trim().length > 0 && !/^(todo|\?+|—|-)$/i.test(s.trim());
// зачем (владелец: слова объясняются без терминов): значения с грамматическими терминами («в + местном падеже», «к предлогу») — брак
const TERM = /(падеж|предлог|глагол|существительн|прилагательн|местоимен|артикл|спряжен|инфинитив|причасти|дієслов|іменник|прикметник|займенник|прийменник|відмін|artikel|verb|noun|preposition|article)/i;
const bad = (s) => TERM.test(s) || /[`*#]|<|>|\bTODO\b|\bn\/a\b/i.test(s);
for (const lang of langs) {
  const cf = join(ROOT, 'docs', 'work', 'classic_glossary_candidates', `${lang}.json`); const df = join(DRAFTS, `${lang}.json`);
  if (!existsSync(cf) || !existsSync(df)) { console.log(`${lang}: нет файла кандидатов/черновиков`); continue; }
  const cand = JSON.parse(readFileSync(cf, 'utf8')); const drafts = JSON.parse(readFileSync(df, 'utf8'));
  const dm = new Map(drafts.map((d) => [String(d.lemma).toLowerCase().trim(), d]));
  const ok = []; const rej = [];
  for (const c of cand) {
    const d = dm.get(String(c.lemma).toLowerCase().trim());
    const m = d?.meaning ?? {};
    if (!d || (d.problems ?? []).length || !ne(m.ru) || !ne(m.uk) || bad(m.ru) || bad(m.uk) || (m.en && bad(m.en))) { rej.push({ lemma: c.lemma, why: !d ? 'нет черновика' : (d.problems ?? []).join('; ') || 'пустые/служебные/термины в ru/uk' }); continue; }
    ok.push({ ...c, meaning: { ru: fixMixed(m.ru.trim()), uk: fixMixed(m.uk.trim()), ...(ne(m.en) ? { en: m.en.trim() } : {}), ...(ne(m.es) ? { es: m.es.trim() } : {}) } });
  }
  writeFileSync(join(OUT, `${lang}.json`), JSON.stringify(ok, null, 1));
  writeFileSync(join(OUT, `${lang}_rejected.json`), JSON.stringify(rej, null, 1));
  console.log(`${lang}: кандидатов ${cand.length}, принято ${ok.length}, отклонено ${rej.length}`);
}
