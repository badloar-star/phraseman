// зачем (владелец 05.11, «интро как ребёнку, под читателя локали, без чужих языков»; договорённость с «4 · Темы»):
// тексты вступлений уроков пишутся по локалям в docs/work/classic_intro_plain/<lang>/lesson_NN.json (en — Теория) и lesson_NN.<loc>.json (ru — Темы, uk — Переводчик …).
// Формат файла: {"lang","lesson","blocks":[{"kind":"concept|formula|practice","title":{<loc>:…},"text":{<loc>:…},"exampleIds":["<lang>:LL:PP",…]}]}.
// plainIntroFor(lang, n, blocks) → новые блоки: для каждой локали из файлов подменяет titleXX/textXX/linesXX (и titleByLocale/textByLocale, если они есть у блока);
// блоки архива не мутируем; урок целиком перекрывает старый текст только в тех локалях, что есть в файлах (остальные локали не трогаем).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'work', 'classic_intro_plain');
const SUF = { ru: 'RU', uk: 'UK', en: 'EN', es: 'ES', 'pt-BR': 'PtBr', vi: 'Vi', id: 'Id', tr: 'Tr', pl: 'Pl' };
export const introPlainStats = { lessons: 0, blocks: 0, perLang: {} };
// строки текста → линии интерфейса: строка «фраза курса = перевод» остаётся одной строкой-текстом; одиночные строки — text
const toLines = (text) => String(text).split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ type: 'text', parts: [{ text: t }] }));
const readFiles = (lang, n) => {
  // зачем: файлы лежат и в <lang>/ (en — Теория), и в <локаль>/<lang>/ (ru — Темы, uk — Переводчик): читаем оба места
  const dirs = [join(DIR, lang), ...Object.keys(SUF).map((loc) => join(DIR, loc, lang))].filter((d) => existsSync(d));
  const re = new RegExp('^lesson_' + String(n).padStart(2, '0') + '(\\.[A-Za-z-]+)?\\.json$');
  return dirs.flatMap((d) => readdirSync(d).filter((f) => re.test(f)).sort().map((f) => JSON.parse(readFileSync(join(d, f), 'utf8'))));
};
export function plainIntroFor(lang, n, blocks) {
  const files = readFiles(lang, n);
  if (!files.length) return blocks;
  introPlainStats.lessons++;
  return blocks.map((b, i) => {
    const fb = files.map((f) => f.blocks?.[i]).filter(Boolean);
    if (!fb.length) return b;
    const out = { ...b };
    for (const x of fb) {
      if (x.kind && b.kind && x.kind !== b.kind) throw new Error(`интро ${lang} ${n} блок ${i + 1}: kind ${x.kind} ≠ ${b.kind}`);
      for (const [loc, suf] of Object.entries(SUF)) {
        const title = x.title?.[loc]; const text = x.text?.[loc];
        if (!title && !text) continue;
        if (title) { out[`title${suf}`] = title; if (out.titleByLocale) out.titleByLocale = { ...out.titleByLocale, [loc]: title }; }
        if (text) {
          out[`text${suf}`] = text; if (out.textByLocale) out.textByLocale = { ...out.textByLocale, [loc]: text };
          out[`lines${suf}`] = toLines(text);
        }
        introPlainStats.perLang[loc] = (introPlainStats.perLang[loc] ?? 0) + 1;
      }
      if (x.exampleIds?.length) {
        const ids = x.exampleIds;
        if (Array.isArray(b.examplesById)) { const full = typeof b.examplesById[0] === 'string' && /^[a-z]{2}:/.test(b.examplesById[0]); out.examplesById = full ? ids : ids.map((id) => /(\d\d)[.:](\d\d)$/.exec(id).slice(1).join('.')); }
        if (Array.isArray(b.exampleIds)) out.exampleIds = ids;
      }
    }
    introPlainStats.blocks++;
    return out;
  });
}
