// home_review_hint_copy — подпись подсказки «Повторить N слов · M мин» на 9 языках (Переводчик, docs/work/ux_conveniences_strings_9lang.md + review_words_plural_9lang.md).
// зачем (удобство №8, владелец 04.11): строка самодостаточная, без мелкой расшифровки; слова и минуты склоняются по числу (ru/uk/pl — три формы, en/es/pt-BR — две).
// Шаблон: {n} — слов, {min} — минут, {w} — форма слова, {mw} — форма «минута».
import { triLang, type Lang } from '../constants/i18n';

const REVIEW_WORDS = [
  'Повторить {n} {w} · {min} {mw}',
  'Повторити {n} {w} · {min} {mw}',
  'Review {n} {w} · {min} min',
  'Repasar {n} {w} · {min} min',
  'Revisar {n} {w} · {min} min',
  'Ôn {n} từ · {min} phút',
  'Ulas {n} kata · {min} menit',
  '{n} kelimeyi tekrarla · {min} dk',
  'Powtórz {n} {w} · {min} {mw}',
] as const;

type Forms = readonly [string, string, string];

const WORD_FORMS: Partial<Record<Lang, Forms>> = {
  ru: ['слово', 'слова', 'слов'],
  uk: ['слово', 'слова', 'слів'],
  pl: ['słowo', 'słowa', 'słów'],
  en: ['word', 'words', 'words'],
  es: ['palabra', 'palabras', 'palabras'],
  'pt-BR': ['palavra', 'palavras', 'palavras'],
};
const MINUTE_FORMS: Partial<Record<Lang, Forms>> = {
  ru: ['минуту', 'минуты', 'минут'],
  uk: ['хвилину', 'хвилини', 'хвилин'],
  pl: ['minutę', 'minuty', 'minut'],
  // зачем (предполётка английского: сторож scan_direct_lang_index): словарь с ru/uk без ключа en — чтение MINUTE_FORMS[lang] падает при включении en; en/es/pt-BR — как у WORD_FORMS
  en: ['minute', 'minutes', 'minutes'],
  es: ['minuto', 'minutos', 'minutos'],
  'pt-BR': ['minuto', 'minutos', 'minutos'],
};

/** Индекс формы: 0 — один, 1 — «2–4», 2 — «5+». Для en/es/pt-BR 1 и «много» совпадают в таблице (две формы). */
export function homeReviewFormIndex(lang: Lang, n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (lang === 'ru' || lang === 'uk') {
    if (last === 1 && lastTwo !== 11) return 0;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 1;
    return 2;
  }
  if (lang === 'pl') {
    if (abs === 1) return 0;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 1;
    return 2;
  }
  return abs === 1 ? 0 : 1;
}

export function homeReviewHintText(lang: Lang, words: number, minutes: number): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = REVIEW_WORDS;
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  const w = WORD_FORMS[lang]?.[homeReviewFormIndex(lang, words)] ?? '';
  const mw = MINUTE_FORMS[lang]?.[homeReviewFormIndex(lang, minutes)] ?? '';
  return raw.split('{n}').join(String(words)).split('{min}').join(String(minutes)).split('{w}').join(w).split('{mw}').join(mw);
}

export const HOME_REVIEW_HINT_STRINGS = REVIEW_WORDS;
