// Подмена теории урока на текст «как для ребёнка» (docs/work/classic_theory_plain/<lang>/lesson_NN.json, формат — SPEC.md там же).
// Результат в theory.json: data[N] = { plain: true, title:{9 локалей}, chapters:[{id, titleByLocale, textByLocale, examples:[{phraseId, say}], practice:[{commandByLocale,…}], translated:[…]}] }.
// Локали, которых писатели не писали (es/pt-BR/vi/id/tr/pl), пока = текст en (запасной вариант, помечен в translated); переводчик кладёт настоящие в locales_NN.json рядом.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'work', 'classic_theory_plain');
export const plainStats = { lessons: 0, perLang: {} };
const ALL = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// зачем (сторож смеси алфавитов): писатели иногда ставят латинскую «ó» внутрь русского слова («сóно») — меняем на кириллическую букву + знак ударения
const CYR_FIX = { á: 'а́', é: 'е́', í: 'и́', ó: 'о́', ú: 'у́', ý: 'ы́', è: 'е́', à: 'а́', ò: 'о́', ì: 'и́', ù: 'у́', a: 'а', e: 'е', o: 'о', c: 'с', p: 'р', x: 'х' };
const fixMixed = (str) => String(str).replace(/[\p{L}́]+/gu, (w) => (/[Ѐ-ӿ]/.test(w) && /[A-Za-zÀ-ɏ]/.test(w) ? w.replace(/[A-Za-zÀ-ɏ]/g, (ch) => CYR_FIX[ch] ?? ch) : w));
function fill(obj, extra) {
  const out = {};
  for (const l of ALL) out[l] = fixMixed((extra?.[l] ?? obj?.[l] ?? obj?.en ?? '').toString());
  return out;
}
// зачем (читатель-новичок 05.11): верный ответ всегда стоял первым — угадывается. Перемешиваем детерминированно по id фразы (результат не меняется от запуска к запуску).
function shuffleStable(options, key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const a = [...options];
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function plainTheoryFor(lang, n) {
  const f = join(DIR, lang, `lesson_${String(n).padStart(2, '0')}.json`);
  if (!existsSync(f)) return null;
  const src = JSON.parse(readFileSync(f, 'utf8'));
  const lf = join(DIR, lang, `locales_${String(n).padStart(2, '0')}.json`);
  const loc = existsSync(lf) ? JSON.parse(readFileSync(lf, 'utf8')) : {};
  const translated = ALL.filter((l) => l === 'ru' || l === 'uk' || l === 'en' || loc.title?.[l]);
  const th = {
    plain: true, lang, lesson: n,
    title: fill(src.title, loc.title),
    chapters: (src.chapters ?? []).map((c) => ({
      id: c.id,
      titleByLocale: fill(c.title, loc.chapters?.[c.id]?.title),
      textByLocale: fill(c.text, loc.chapters?.[c.id]?.text),
      examples: (c.examples ?? []).map((e) => ({ phraseId: e.phraseId, say: e.say ? { ru: fixMixed(e.say.ru ?? ''), uk: fixMixed(e.say.uk ?? '') } : e.say })),
      practice: (c.practice ?? []).map((p) => ({ commandByLocale: fill(p.command, loc.chapters?.[c.id]?.command?.[p.promptPhraseId]), sample: !!p.sample, promptPhraseId: p.promptPhraseId, options: shuffleStable(p.options, p.promptPhraseId), answerId: p.answerId })),
      translated,
    })),
  };
  plainStats.lessons++; (plainStats.perLang[lang] ??= 0); plainStats.perLang[lang]++;
  return th;
}
