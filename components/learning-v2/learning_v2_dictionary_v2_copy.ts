// Тексты словаря Learning V2 (вариант A макета docs/design/v2-app/dictionary-v2.html), 9 языков.
//
// зачем (владелец 21.10 через координатора): словарь, где слова можно тренировать режимами «Карточек» и сохранять в «Карточки».
// RU — дословно из макета. Остальные языки — предложение сессии Learning V2, сверку делает «Переводчик».
import type { Lang } from "../../constants/i18n";
import { pluralFormFor, type PluralForms } from "../../constants/plural";

type Nine<T> = Readonly<Record<"ru" | "uk" | "en" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl", T>>;

const WORD: Nine<PluralForms> = {
  ru: { one: "слово", few: "слова", many: "слов" },
  uk: { one: "слово", few: "слова", many: "слів" },
  en: { one: "word", few: "words", many: "words" },
  es: { one: "palabra", few: "palabras", many: "palabras" },
  "pt-BR": { one: "palavra", few: "palavras", many: "palavras" },
  vi: { one: "từ", few: "từ", many: "từ" },
  id: { one: "kata", few: "kata", many: "kata" },
  tr: { one: "kelime", few: "kelime", many: "kelime" },
  pl: { one: "słowo", few: "słowa", many: "słów" },
};
const LESSON: Nine<PluralForms> = {
  ru: { one: "урок", few: "урока", many: "уроков" },
  uk: { one: "урок", few: "уроки", many: "уроків" },
  en: { one: "lesson", few: "lessons", many: "lessons" },
  es: { one: "lección", few: "lecciones", many: "lecciones" },
  "pt-BR": { one: "lição", few: "lições", many: "lições" },
  vi: { one: "bài", few: "bài", many: "bài" },
  id: { one: "pelajaran", few: "pelajaran", many: "pelajaran" },
  tr: { one: "ders", few: "ders", many: "ders" },
  pl: { one: "lekcja", few: "lekcje", many: "lekcji" },
};

const S = {
  title: { ru: "Словарь", uk: "Словник", en: "Dictionary", es: "Diccionario", "pt-BR": "Dicionário", vi: "Từ điển", id: "Kamus", tr: "Sözlük", pl: "Słownik" },
  noWordsYet: { ru: "Пока нет слов", uk: "Поки немає слів", en: "No words yet", es: "Aún no hay palabras", "pt-BR": "Ainda sem palavras", vi: "Chưa có từ nào", id: "Belum ada kata", tr: "Henüz kelime yok", pl: "Na razie brak słów" },
  select: { ru: "Выбрать", uk: "Вибрати", en: "Select", es: "Elegir", "pt-BR": "Selecionar", vi: "Chọn", id: "Pilih", tr: "Seç", pl: "Wybierz" },
  done: { ru: "Готово", uk: "Готово", en: "Done", es: "Listo", "pt-BR": "Pronto", vi: "Xong", id: "Selesai", tr: "Bitti", pl: "Gotowe" },
  allLessons: { ru: "Все уроки", uk: "Усі уроки", en: "All lessons", es: "Todas las lecciones", "pt-BR": "Todas as lições", vi: "Tất cả bài", id: "Semua pelajaran", tr: "Tüm dersler", pl: "Wszystkie lekcje" },
  lessonsFilter: { ru: "Уроки", uk: "Уроки", en: "Lessons", es: "Lecciones", "pt-BR": "Lições", vi: "Bài học", id: "Pelajaran", tr: "Dersler", pl: "Lekcje" },
  lessonsSheetSub: { ru: "Можно отметить несколько", uk: "Можна позначити кілька", en: "You can pick several", es: "Puedes marcar varias", "pt-BR": "Dá para marcar várias", vi: "Có thể chọn nhiều bài", id: "Bisa pilih beberapa", tr: "Birden fazla seçebilirsin", pl: "Możesz zaznaczyć kilka" },
  search: { ru: "Слово или перевод", uk: "Слово або переклад", en: "Word or translation", es: "Palabra o traducción", "pt-BR": "Palavra ou tradução", vi: "Từ hoặc nghĩa", id: "Kata atau terjemahan", tr: "Kelime veya çeviri", pl: "Słowo lub tłumaczenie" },
  clearSearch: { ru: "Очистить поиск", uk: "Очистити пошук", en: "Clear search", es: "Borrar búsqueda", "pt-BR": "Limpar busca", vi: "Xóa tìm kiếm", id: "Hapus pencarian", tr: "Aramayı temizle", pl: "Wyczyść wyszukiwanie" },
  nothingFound: { ru: "Ничего не нашлось", uk: "Нічого не знайшлося", en: "Nothing found", es: "No se encontró nada", "pt-BR": "Nada encontrado", vi: "Không tìm thấy", id: "Tidak ditemukan", tr: "Bir şey bulunamadı", pl: "Nic nie znaleziono" },
  undo: { ru: "Отменить", uk: "Скасувати", en: "Undo", es: "Deshacer", "pt-BR": "Desfazer", vi: "Hoàn tác", id: "Urungkan", tr: "Geri al", pl: "Cofnij" },
  savedTag: { ru: "в карточках", uk: "у картках", en: "in cards", es: "en tarjetas", "pt-BR": "nos cartões", vi: "trong thẻ", id: "di kartu", tr: "kartlarda", pl: "w kartach" },
  emptyTitle: { ru: "Здесь появятся слова", uk: "Тут з'являться слова", en: "Your words will appear here", es: "Aquí aparecerán las palabras", "pt-BR": "As palavras vão aparecer aqui", vi: "Từ sẽ xuất hiện ở đây", id: "Kata-kata akan muncul di sini", tr: "Kelimeler burada görünecek", pl: "Tu pojawią się słowa" },
  emptyBody: {
    ru: "Каждый эпизод добавляет 4–5 новых слов. Пройди первый, и их можно будет слушать, тренировать и сохранять в «Карточки».",
    uk: "Кожен епізод додає 4–5 нових слів. Пройди перший, і їх можна буде слухати, тренувати й зберігати в «Картки».",
    en: "Each episode adds 4–5 new words. Finish the first one to listen to them, train them and save them to Cards.",
    es: "Cada episodio añade 4–5 palabras nuevas. Completa el primero para escucharlas, entrenarlas y guardarlas en Tarjetas.",
    "pt-BR": "Cada episódio traz 4–5 palavras novas. Conclua o primeiro para ouvir, treinar e salvar nos Cartões.",
    vi: "Mỗi tập thêm 4–5 từ mới. Học xong tập đầu là có thể nghe, luyện và lưu chúng vào Thẻ.",
    id: "Setiap episode menambah 4–5 kata baru. Selesaikan yang pertama untuk mendengar, melatih, dan menyimpannya ke Kartu.",
    tr: "Her bölüm 4–5 yeni kelime ekler. İlkini bitir; onları dinleyebilir, çalışabilir ve Kartlar'a kaydedebilirsin.",
    pl: "Każdy odcinek dodaje 4–5 nowych słów. Ukończ pierwszy, a będzie można ich słuchać, ćwiczyć je i zapisywać w Kartach.",
  },
  toEpisodeOne: { ru: "К эпизоду 1", uk: "До епізоду 1", en: "Go to episode 1", es: "Ir al episodio 1", "pt-BR": "Ir para o episódio 1", vi: "Đến tập 1", id: "Ke episode 1", tr: "1. bölüme git", pl: "Do odcinka 1" },
  offlineBold: { ru: "Нет сети.", uk: "Немає мережі.", en: "No connection.", es: "Sin conexión.", "pt-BR": "Sem conexão.", vi: "Không có mạng.", id: "Tidak ada koneksi.", tr: "Bağlantı yok.", pl: "Brak sieci." },
  offlineRest: {
    ru: "Слова и тренировка работают, сохранения отправим позже.", uk: "Слова й тренування працюють, збереження надішлемо пізніше.",
    en: "Words and training still work; we'll sync saves later.", es: "Las palabras y el entrenamiento funcionan; los guardados se enviarán después.",
    "pt-BR": "Palavras e treino funcionam; os salvos serão enviados depois.", vi: "Từ và luyện tập vẫn dùng được, phần đã lưu sẽ gửi sau.",
    id: "Kata dan latihan tetap jalan; simpanan dikirim nanti.", tr: "Kelimeler ve çalışma çalışıyor, kayıtları sonra göndeririz.",
    pl: "Słowa i trening działają, zapisy wyślemy później.",
  },
  close: { ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar", vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij" },
  saveFailed: { ru: "Не удалось сохранить. Попробуй ещё раз.", uk: "Не вдалося зберегти. Спробуй ще раз.", en: "Couldn't save. Try again.", es: "No se pudo guardar. Inténtalo de nuevo.", "pt-BR": "Não foi possível salvar. Tente de novo.", vi: "Không lưu được. Hãy thử lại.", id: "Gagal menyimpan. Coba lagi.", tr: "Kaydedilemedi. Tekrar dene.", pl: "Nie udało się zapisać. Spróbuj ponownie." },
} as const satisfies Readonly<Record<string, Nine<string>>>;

const pick = <T,>(table: Nine<T>, lang: Lang): T => (table as Record<string, T>)[lang] ?? table.en;
const words = (lang: Lang, n: number) => `${n} ${pick(WORD, lang)[pluralFormFor(lang, n)]}`;
const lessons = (lang: Lang, n: number) => `${n} ${pick(LESSON, lang)[pluralFormFor(lang, n)]}`;
const lessonWord: Nine<string> = { ru: "Урок", uk: "Урок", en: "Lesson", es: "Lección", "pt-BR": "Lição", vi: "Bài", id: "Pelajaran", tr: "Ders", pl: "Lekcja" };

export type LearningV2DictionaryV2Copy = ReturnType<typeof learningV2DictionaryV2Copy>;

export function learningV2DictionaryV2Copy(lang: Lang) {
  const t = (key: keyof typeof S) => pick(S[key], lang);
  const L = pick(lessonWord, lang);
  return {
    title: t("title"),
    noWordsYet: t("noWordsYet"),
    select: t("select"),
    done: t("done"),
    allLessons: t("allLessons"),
    lessonsFilter: t("lessonsFilter"),
    lessonsSheetSub: t("lessonsSheetSub"),
    search: t("search"),
    clearSearch: t("clearSearch"),
    nothingFound: t("nothingFound"),
    undo: t("undo"),
    savedTag: t("savedTag"),
    emptyTitle: t("emptyTitle"),
    emptyBody: t("emptyBody"),
    toEpisodeOne: t("toEpisodeOne"),
    offlineBold: t("offlineBold"),
    offlineRest: t("offlineRest"),
    close: t("close"),
    saveFailed: t("saveFailed"),
    lesson: (n: number) => `${L} ${n}`,
    /** «269 слов · 2 урока» */
    summary: (wordCount: number, lessonCount: number) => `${words(lang, wordCount)} · ${lessons(lang, lessonCount)}`,
    /** «Урок 2 · 44 слова» */
    lessonSummary: (n: number, wordCount: number) => `${L} ${n} · ${words(lang, wordCount)}`,
    selected: (n: number) => pick({ ru: `Выбрано ${n}`, uk: `Вибрано ${n}`, en: `${n} selected`, es: `${n} elegidas`, "pt-BR": `${n} selecionadas`, vi: `Đã chọn ${n}`, id: `${n} dipilih`, tr: `${n} seçildi`, pl: `Wybrano ${n}` }, lang),
    selectAll: (n: number) => pick({ ru: `Выбрать все ${n}`, uk: `Вибрати всі ${n}`, en: `Select all ${n}`, es: `Elegir las ${n}`, "pt-BR": `Selecionar todas (${n})`, vi: `Chọn cả ${n}`, id: `Pilih semua ${n}`, tr: `${n} kelimenin hepsini seç`, pl: `Wybierz wszystkie ${n}` }, lang),
    train: (n: number) => pick({ ru: "Тренировать", uk: "Тренувати", en: "Train", es: "Entrenar", "pt-BR": "Treinar", vi: "Luyện", id: "Latih", tr: "Çalış", pl: "Ćwicz" }, lang) + ` · ${words(lang, n)}`,
    trainShort: (n: number) => pick({ ru: "Тренировать", uk: "Тренувати", en: "Train", es: "Entrenar", "pt-BR": "Treinar", vi: "Luyện", id: "Latih", tr: "Çalış", pl: "Ćwicz" }, lang) + ` · ${n}`,
    saveMany: (n: number) => pick({ ru: "В карточки", uk: "У картки", en: "To cards", es: "A tarjetas", "pt-BR": "Para cartões", vi: "Vào thẻ", id: "Ke kartu", tr: "Kartlara", pl: "Do kart" }, lang) + ` · ${n}`,
    showWords: (n: number) => pick({ ru: "Показать", uk: "Показати", en: "Show", es: "Mostrar", "pt-BR": "Mostrar", vi: "Hiện", id: "Tampilkan", tr: "Göster:", pl: "Pokaż" }, lang) + ` ${words(lang, n)}`,
    toastOne: (word: string) => pick({ ru: `${word} теперь в «Карточках»`, uk: `${word} тепер у «Картках»`, en: `${word} is now in Cards`, es: `${word} ya está en Tarjetas`, "pt-BR": `${word} agora está nos Cartões`, vi: `${word} đã vào Thẻ`, id: `${word} sekarang ada di Kartu`, tr: `${word} artık Kartlar'da`, pl: `${word} jest teraz w Kartach` }, lang),
    toastMany: (n: number) => pick({ ru: `${words(lang, n)} теперь в «Карточках»`, uk: `${words(lang, n)} тепер у «Картках»`, en: `${words(lang, n)} now in Cards`, es: `${words(lang, n)} ya en Tarjetas`, "pt-BR": `${words(lang, n)} agora nos Cartões`, vi: `${words(lang, n)} đã vào Thẻ`, id: `${words(lang, n)} sekarang di Kartu`, tr: `${words(lang, n)} artık Kartlar'da`, pl: `${words(lang, n)} jest teraz w Kartach` }, lang),
    listen: (word: string) => pick({ ru: `Прослушать ${word}`, uk: `Прослухати ${word}`, en: `Listen to ${word}`, es: `Escuchar ${word}`, "pt-BR": `Ouvir ${word}`, vi: `Nghe ${word}`, id: `Dengarkan ${word}`, tr: `${word} dinle`, pl: `Odsłuchaj ${word}` }, lang),
    saveWord: (word: string) => pick({ ru: `Сохранить ${word} в карточки`, uk: `Зберегти ${word} у картки`, en: `Save ${word} to cards`, es: `Guardar ${word} en tarjetas`, "pt-BR": `Salvar ${word} nos cartões`, vi: `Lưu ${word} vào thẻ`, id: `Simpan ${word} ke kartu`, tr: `${word} kartlara kaydet`, pl: `Zapisz ${word} w kartach` }, lang),
  };
}
