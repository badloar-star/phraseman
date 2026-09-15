import { triLang, type Lang } from '../constants/i18n';
import type { MistakeFacet } from '../modules/mistake-practice/contracts';
import type { MistakeSourceGroup } from './mistake_practice_insights';

/**
 * Человеческие имена типов ошибок и источников для хаба, списка и подсказки.
 * зачем (владелец 2026-09-14): раздел показывает карту слабых мест словами,
 * а не кодами фасетов; один словарь на все экраны, чтобы не разъезжались.
 */
export function mistakeFacetLabel(lang: Lang, facet: MistakeFacet): string {
  switch (facet) {
    case 'word_order':
      return triLang(lang, { ru: 'Порядок слов', uk: 'Порядок слів', en: 'Word order', es: 'Orden de palabras', 'pt-BR': 'Ordem das palavras', vi: 'Trật tự từ', id: 'Urutan kata', tr: 'Kelime sırası', pl: 'Szyk wyrazów' });
    case 'missing_token':
      return triLang(lang, { ru: 'Пропущено слово', uk: 'Пропущене слово', en: 'Missing word', es: 'Palabra omitida', 'pt-BR': 'Palavra faltando', vi: 'Thiếu từ', id: 'Kata hilang', tr: 'Eksik kelime', pl: 'Brak słowa' });
    case 'meaning':
      return triLang(lang, { ru: 'Значение', uk: 'Значення', en: 'Meaning', es: 'Significado', 'pt-BR': 'Significado', vi: 'Nghĩa', id: 'Makna', tr: 'Anlam', pl: 'Znaczenie' });
    case 'form':
      return triLang(lang, { ru: 'Форма слова', uk: 'Форма слова', en: 'Word form', es: 'Forma de la palabra', 'pt-BR': 'Forma da palavra', vi: 'Dạng từ', id: 'Bentuk kata', tr: 'Kelime biçimi', pl: 'Forma wyrazu' });
    case 'pronunciation':
      return triLang(lang, { ru: 'Произношение', uk: 'Вимова', en: 'Pronunciation', es: 'Pronunciación', 'pt-BR': 'Pronúncia', vi: 'Phát âm', id: 'Pelafalan', tr: 'Telaffuz', pl: 'Wymowa' });
    case 'listening':
    default:
      return triLang(lang, { ru: 'На слух', uk: 'На слух', en: 'Listening', es: 'Al oído', 'pt-BR': 'De ouvido', vi: 'Nghe', id: 'Mendengar', tr: 'Dinleme', pl: 'Ze słuchu' });
  }
}

export function mistakeSourceLabel(lang: Lang, source: MistakeSourceGroup): string {
  switch (source) {
    case 'lessons':
      return triLang(lang, { ru: 'Уроки', uk: 'Уроки', en: 'Lessons', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' });
    case 'arena':
      return triLang(lang, { ru: 'Арена', uk: 'Арена', en: 'Arena', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena' });
    case 'cards':
      return triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' });
    case 'exams':
      return triLang(lang, { ru: 'Экзамены', uk: 'Іспити', en: 'Exams', es: 'Exámenes', 'pt-BR': 'Provas', vi: 'Bài thi', id: 'Ujian', tr: 'Sınavlar', pl: 'Egzaminy' });
    case 'other':
    default:
      return triLang(lang, { ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' });
  }
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
