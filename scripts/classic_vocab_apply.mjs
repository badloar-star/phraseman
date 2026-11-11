// зачем (владелец 05.11: «в уроке N только НОВЫЕ слова урока, по одному разу, без дублей «слово / артикль+слово», с ВСЕМИ словами заданий, без мусора»):
// словарь уроков, для которых есть docs/work/classic_vocab/<lang>/lesson_NN.json, строится из слов-форм плиток (без лемматизатора), и ЗАМЕНЯЕТ старые записи этих уроков;
// записи остальных уроков остаются как были, но без повторов тех же слов (после снятия артикля и регистра).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isClassicVocabExcluded } from './classic_vocab_exclusions.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const norm = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '').trim();
const ART = /^(le|la|les|l’|l'|un|une|des|el|los|las|una|unos|unas|der|die|das|den|dem|ein|eine|il|lo|gli|i|the|a|an)\s+/i;
// зачем: слитные слова (del = de+el) в старом словаре были записаны как разбор вместо перевода
const SPLIT_FIX = {
  del: { ru: 'из, от (слитно со словом перед названием)', uk: 'з, від (разом зі словом перед назвою)', en: 'of the, from the', es: 'de + el (de la cosa)' },
  al: { ru: 'в, к (слитно со словом перед названием)', uk: 'до, в (разом зі словом перед назвою)', en: 'to the, at the', es: 'a + el (hacia la cosa)' },
};
export const vocabStats = { lessons: 0, words: 0, droppedOld: 0, droppedDup: 0, perLang: {} };
export function applyVocab(lang, lemmas, phrases) {
  const covered = new Map();
  for (let n = 1; n <= 32; n++) {
    const f = join(ROOT, 'docs', 'work', 'classic_vocab', lang, `lesson_${String(n).padStart(2, '0')}.json`);
    if (existsSync(f)) covered.set(n, JSON.parse(readFileSync(f, 'utf8')).words ?? {});
  }
  if (!covered.size) return;
  // фразы → какие формы в каких фразах
  const idsByForm = new Map();
  for (const p of phrases) for (const t of p.tiles) { const w = norm(t.correct); if (!w) continue; if (!idsByForm.has(w)) idsByForm.set(w, new Set()); idsByForm.get(w).add(p.id); }
  const lessonOf = (id) => Number(/(\d\d)[.:]\d\d$/.exec(id)[1]);
  const coveredForms = new Set();
  const fresh = [];
  for (const [n, words] of [...covered.entries()].sort((a, b) => a[0] - b[0])) {
    for (const [form, m] of Object.entries(words)) {
      const ids = [...(idsByForm.get(form) ?? [])];
      if (!ids.length) throw new Error(`словарь ${lang}: слово «${form}» урока ${n} не найдено во фразах`);
      const first = Math.min(...ids.map(lessonOf));
      if (first !== n) throw new Error(`словарь ${lang}: слово «${form}» в файле урока ${n}, но впервые встречается в уроке ${first}`);
      if (isClassicVocabExcluded(lang, form, first)) continue;
      coveredForms.add(form);
      fresh.push({ lemma: form, meaning: Object.fromEntries(ALL.map((l) => [l, (m[l] ?? '').toString().trim() || (m.en ?? m.ru).toString().trim()])), firstLesson: n, phraseIds: ids, forms: [form] });
      vocabStats.words++;
    }
    vocabStats.lessons++;
  }
  const keep = [];
  for (const e of lemmas) {
    if (covered.has(e.firstLesson)) { vocabStats.droppedOld++; continue; }
    // зачем (Ревизор D4): запись-разбор вида «de + el» вместо перевода — мусор
    if (/\s\+\s/.test(String(e.meaning?.ru ?? ''))) { vocabStats.droppedOld++; continue; }
    const base = norm(e.lemma).replace(ART, '');
    const fs = [norm(e.lemma), base, ...(e.forms ?? []).map(norm)];
    if (fs.some((x) => coveredForms.has(x))) { vocabStats.droppedDup++; continue; }
    keep.push(e);
  }
  lemmas.splice(0, lemmas.length, ...fresh, ...keep);
  vocabStats.perLang[lang] = fresh.length;
}
