// зачем (владелец 05.11, «все слова из фраз в словаре»): ручной слой словаря docs/work/classic_glossary_new/<lang>_manual.json
//  { "forms": { "<лемма из словаря>": ["форма", …] },            — формы к УЖЕ существующим леммам (est/sont → être)
//    "new":   [ { "lemma", "pos", "meaning": {ru, uk, en?, es?}, "forms": ["…"] } ] }   — новые леммы (служебные слова: le/la/ein/di…)
// phraseIds и firstLesson считаются здесь по плиткам верных ответов (lemma+forms); ошибки данных = исключение (не молчим).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '').trim();
export const manualStats = { forms: 0, added: 0, perLang: {} };
export function applyManualGlossary(lang, lemmas, phrases) {
  const f = join(ROOT, 'docs', 'work', 'classic_glossary_new', `${lang}_manual.json`);
  if (!existsSync(f)) return;
  const m = JSON.parse(readFileSync(f, 'utf8'));
  const byLemma = new Map(lemmas.map((e) => [norm(e.lemma), e]));
  const phraseTokens = phrases.map((p) => ({ id: p.id, toks: new Set(p.tiles.map((t) => norm(t.correct))) }));
  const lessonOf = (id) => Number(/(\d\d)[.:]\d\d$/.exec(id)[1]);
  const idsFor = (forms) => phraseTokens.filter((p) => forms.some((w) => p.toks.has(norm(w)))).map((p) => p.id);
  for (const [lemma, forms] of Object.entries(m.forms ?? {})) {
    const e = byLemma.get(norm(lemma));
    if (!e) throw new Error(`словарь ${lang}: ручные формы для несуществующей леммы «${lemma}»`);
    const have = new Set((e.forms ?? []).map(norm));
    const add = forms.filter((w) => !have.has(norm(w)));
    if (add.length) { e.forms = [...(e.forms ?? []), ...add]; manualStats.forms += add.length; }
    const ids = new Set(e.phraseIds ?? []); for (const id of idsFor(forms)) ids.add(id);
    e.phraseIds = [...ids]; if (e.phraseIds.length) e.firstLesson = Math.min(e.firstLesson ?? 99, ...e.phraseIds.map(lessonOf));
  }
  for (const n of m.new ?? []) {
    if (byLemma.has(norm(n.lemma))) throw new Error(`словарь ${lang}: ручная лемма «${n.lemma}» уже есть`);
    if (!n.meaning?.ru?.trim() || !n.meaning?.uk?.trim()) throw new Error(`словарь ${lang}: у «${n.lemma}» нет ru/uk`);
    const forms = [...new Set([n.lemma, ...(n.forms ?? [])])];
    const ids = idsFor(forms);
    if (!ids.length) throw new Error(`словарь ${lang}: «${n.lemma}» не встречается во фразах`);
    const e = { lemma: n.lemma, meaning: n.meaning, firstLesson: Math.min(...ids.map(lessonOf)), phraseIds: ids, forms };
    if (n.pos) e.pos = n.pos;
    lemmas.push(e); byLemma.set(norm(n.lemma), e); manualStats.added++;
  }
  manualStats.perLang[lang] = (m.new?.length ?? 0) + Object.keys(m.forms ?? {}).length;
}
