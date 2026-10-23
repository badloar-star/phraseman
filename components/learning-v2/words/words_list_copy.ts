// ═════════════════════════════════════════════════════════════════════
// words_list_copy.ts — тексты списка «Слова» на 9 языках: раздел «Урок N», поиск, «Ничего не нашлось», подпись динамика.
//
// зачем (владелец 22.10, макет words-lesson-course.html): тексты поиска, «очистить» и «Ничего не нашлось» перенесены ДОСЛОВНО из убранного словаря курса (LearningV2LessonDictionaryOverlayV1);
// раздел «Урок N» — без разрядки заглавными (макет), слово берётся из словаря Сезона; подпись динамика — из «кармана слов». Все ключи — из мест, указанных Переводчиком (docs/work/tasks/words-lesson-course-copy-2026-10-22.md, a3666d403).
// ═════════════════════════════════════════════════════════════════════
import { type Lang } from '../../../constants/i18n';
import { seasonText } from '../season/season_copy';
import { triLang } from '../../../constants/i18n';

/** «Урок N» — тот же словарь Сезона (SEASON_COPY.lesson), что на хабе урока: одно слово — один перевод (Переводчик a3666d403). */
export function wordsLessonLabel(lang: Lang, ordinal: number): string {
  return seasonText(lang, 'lesson', { n: ordinal });
}

/** Подпись кнопки-динамика для чтеца: тексты «кармана слов» (LearningV2WordPocketOverlayV1) — «Озвучить слово {word}» на 9 языках. */
export function wordsListenLabel(lang: Lang, target: string): string {
  return wordPocketSpeakLabel(lang, target);
}

export function wordsSearchCopy(lang: Lang): Readonly<{ placeholder: string; clear: string; nothingFound: string }> {
  return {
    placeholder: triLang(lang, {
      ru: 'Поиск слова', uk: 'Пошук слова', en: 'Search a word', es: 'Buscar una palabra', 'pt-BR': 'Buscar uma palavra',
      vi: 'Tìm từ', id: 'Cari kata', tr: 'Kelime ara', pl: 'Szukaj słowa',
    }),
    clear: triLang(lang, {
      ru: 'Очистить поиск', uk: 'Очистити пошук', en: 'Clear search', es: 'Borrar la búsqueda', 'pt-BR': 'Limpar a busca',
      vi: 'Xóa tìm kiếm', id: 'Hapus pencarian', tr: 'Aramayı temizle', pl: 'Wyczyść wyszukiwanie',
    }),
    nothingFound: triLang(lang, {
      ru: 'Ничего не нашлось', uk: 'Нічого не знайшлося', en: 'Nothing found', es: 'No se encontró nada', 'pt-BR': 'Nada encontrado',
      vi: 'Không tìm thấy gì', id: 'Tidak ada yang ditemukan', tr: 'Bir şey bulunamadı', pl: 'Nic nie znaleziono',
    }),
  };
}

function wordPocketSpeakLabel(lang: Lang, word: string): string {
  return triLang(lang, {
    ru: `Озвучить слово ${word}`, uk: `Озвучити слово ${word}`, en: `Play ${word}`, es: `Escuchar ${word}`,
    'pt-BR': `Ouvir ${word}`, vi: `Phát âm ${word}`, id: `Putar ${word}`, tr: `${word} kelimesini dinle`, pl: `Odtwórz słowo ${word}`,
  });
}
