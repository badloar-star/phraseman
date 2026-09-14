import { triLang, type Lang } from '../../constants/i18n';

export type SourceLabelInput = {
  source?: string | null;
  sourceId?: string | number | null;
  sourceTitle?: string | null;
};

function cleanHumanText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text || /^DEV:/i.test(text)) return null;
  return text;
}

function cleanLessonNumber(value: unknown): string | null {
  const text = cleanHumanText(value);
  return text && /^\d+$/.test(text) ? text : null;
}

function sourcePrefix(source: string, lang: Lang): string {
  if (source === 'lesson') return triLang(lang, {
    ru: 'Источник: Урок', uk: 'Джерело: Урок', en: 'Source: Lesson', es: 'Fuente: Lección',
    'pt-BR': 'Fonte: Lição', vi: 'Nguồn: Bài học', id: 'Sumber: Pelajaran', tr: 'Kaynak: Ders', pl: 'Źródło: Lekcja',
  });
  if (source === 'video') return triLang(lang, {
    ru: 'Источник: Видео', uk: 'Джерело: Відео', en: 'Source: Video', es: 'Fuente: Vídeo',
    'pt-BR': 'Fonte: Vídeo', vi: 'Nguồn: Video', id: 'Sumber: Video', tr: 'Kaynak: Video', pl: 'Źródło: Wideo',
  });
  if (source === 'daily_phrase') return triLang(lang, {
    ru: 'Источник: Фраза дня', uk: 'Джерело: Фраза дня', en: 'Source: Phrase of the day', es: 'Fuente: Frase del día',
    'pt-BR': 'Fonte: Frase do dia', vi: 'Nguồn: Cụm từ trong ngày', id: 'Sumber: Frasa hari ini', tr: 'Kaynak: Günün ifadesi', pl: 'Źródło: Fraza dnia',
  });
  if (source === 'word') return triLang(lang, {
    ru: 'Источник: Слова', uk: 'Джерело: Слова', en: 'Source: Words', es: 'Fuente: Palabras',
    'pt-BR': 'Fonte: Palavras', vi: 'Nguồn: Từ vựng', id: 'Sumber: Kata', tr: 'Kaynak: Kelimeler', pl: 'Źródło: Słowa',
  });
  if (source === 'verb') return triLang(lang, {
    ru: 'Источник: Глаголы', uk: 'Джерело: Дієслова', en: 'Source: Verbs', es: 'Fuente: Verbos',
    'pt-BR': 'Fonte: Verbos', vi: 'Nguồn: Động từ', id: 'Sumber: Kata kerja', tr: 'Kaynak: Fiiller', pl: 'Źródło: Czasowniki',
  });
  if (source === 'dialog') return triLang(lang, {
    ru: 'Источник: Диалоги', uk: 'Джерело: Діалоги', en: 'Source: Dialogs', es: 'Fuente: Diálogos',
    'pt-BR': 'Fonte: Diálogos', vi: 'Nguồn: Hội thoại', id: 'Sumber: Dialog', tr: 'Kaynak: Diyaloglar', pl: 'Źródło: Dialogi',
  });
  if (source === 'community') return triLang(lang, {
    ru: 'Источник: Набор сообщества', uk: 'Джерело: Набір спільноти', en: 'Source: Community set', es: 'Fuente: Set de la comunidad',
    'pt-BR': 'Fonte: Conjunto da comunidade', vi: 'Nguồn: Bộ thẻ cộng đồng', id: 'Sumber: Set komunitas', tr: 'Kaynak: Topluluk seti', pl: 'Źródło: Zestaw społeczności',
  });
  return triLang(lang, {
    ru: 'Источник: Другое', uk: 'Джерело: Інше', en: 'Source: Other', es: 'Fuente: Otro',
    'pt-BR': 'Fonte: Outro', vi: 'Nguồn: Khác', id: 'Sumber: Lainnya', tr: 'Kaynak: Diğer', pl: 'Źródło: Inne',
  });
}

export function buildSourceLabel(input: SourceLabelInput, lang: Lang): string {
  const rawSource = String(input.source ?? '').trim().toLowerCase();
  /** Stored saved cards use `video_phrase`; the UI deliberately says simply Video. */
  const source = rawSource === 'video_phrase' ? 'video' : rawSource;
  if (source === 'lesson') {
    const number = cleanLessonNumber(input.sourceId);
    return number ? `${sourcePrefix(source, lang)} ${number}` : sourcePrefix(source, lang);
  }
  if (source === 'video') {
    const title = cleanHumanText(input.sourceTitle);
    return title ? `${sourcePrefix(source, lang)} · ${title}` : sourcePrefix(source, lang);
  }
  return sourcePrefix(source, lang);
}

/* expo-router route shim: keeps the pure module out of the route tree. */
export default function __RouteShim() { return null; }
