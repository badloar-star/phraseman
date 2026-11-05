// Governance-ID: TG-BF6A8ECE6C57
import type { PlannedTriLangCopy } from '../../constants/i18n';

// зачем (слово владельца 05.11, макет plus_tab_approved_2026-11-05.html, доказательства — docs/work/release/mockups/plus_tab_FREE_VS_PLUS_EVIDENCE.md):
// один сплошной список «Бесплатно / Plus» БЕЗ заголовков разделов, ровно те пункты, что подтверждены кодом. Без кольца у аватара и без «Видео и фраз из них».
// 16-й пункт «Цвет приложения» показывается только при включённом флаге theme_sliders (пока ползунков нет — пункта нет).
export type PlusTabCopy = { ru: string; uk: string; en: string; es: string } & PlannedTriLangCopy;

export type PlusTabItem = Readonly<{
  key: string;
  icon: string;
  title: PlusTabCopy;
  /** Бесплатно; null — у бесплатного этого нет совсем (рисуем «—»). */
  free: PlusTabCopy | null;
  plus: PlusTabCopy;
  /** Показывать только при включённом флаге theme_sliders. */
  requiresThemeSliders?: true;
}>;

const c = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string): PlusTabCopy => ({
  ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl,
});

export const PLUS_TAB_HEADLINE: PlusTabCopy = c(
  'Занимайся сколько хочешь', 'Навчайся скільки хочеш', 'Learn as much as you want', 'Estudia todo lo que quieras',
  'Estude o quanto quiser', 'Học bao nhiêu tùy thích', 'Belajar sepuasnya', 'İstediğin kadar çalış', 'Ucz się ile chcesz',
);
export const PLUS_TAB_SUBLINE: PlusTabCopy = c(
  'Всё, что даёт Plus', 'Усе, що дає Plus', 'Everything Plus gives you', 'Todo lo que te da Plus',
  'Tudo o que o Plus oferece', 'Mọi thứ Plus mang lại', 'Semua yang diberikan Plus', 'Plus’ın sunduğu her şey', 'Wszystko, co daje Plus',
);
export const PLUS_TAB_FREE_LABEL: PlusTabCopy = c('Бесплатно', 'Безкоштовно', 'Free', 'Gratis', 'Grátis', 'Miễn phí', 'Gratis', 'Ücretsiz', 'Za darmo');
export const PLUS_TAB_PLUS_LABEL: PlusTabCopy = c('Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus');
export const PLUS_TAB_TAB_LABEL: PlusTabCopy = c('Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus');

export const PLUS_TAB_ITEMS: readonly PlusTabItem[] = [
  { key: 'lessons', icon: '📚',
    title: c('Уроки курса', 'Уроки курсу', 'Course lessons', 'Lecciones del curso', 'Lições do curso', 'Bài học của khóa', 'Pelajaran kursus', 'Kurs dersleri', 'Lekcje kursu'),
    free: c('Уроки 1–3', 'Уроки 1–3', 'Lessons 1–3', 'Lecciones 1–3', 'Lições 1–3', 'Bài 1–3', 'Pelajaran 1–3', 'Ders 1–3', 'Lekcje 1–3'),
    plus: c('Все 32', 'Усі 32', 'All 32', 'Las 32', 'Todas as 32', 'Cả 32', 'Semua 32', 'Tüm 32', 'Wszystkie 32') },
  { key: 'languages', icon: '🌍',
    title: c('Языки курса', 'Мови курсу', 'Course languages', 'Idiomas del curso', 'Idiomas do curso', 'Ngôn ngữ khóa học', 'Bahasa kursus', 'Kurs dilleri', 'Języki kursu'),
    free: c('Один', 'Одна', 'One', 'Uno', 'Um', 'Một', 'Satu', 'Bir', 'Jeden'),
    plus: c('Все', 'Усі', 'All', 'Todos', 'Todos', 'Tất cả', 'Semua', 'Hepsi', 'Wszystkie') },
  { key: 'energy', icon: '⚡',
    title: c('Энергия', 'Енергія', 'Energy', 'Energía', 'Energia', 'Năng lượng', 'Energi', 'Enerji', 'Energia'),
    free: c('5, +1 за 30 мин', '5, +1 за 30 хв', '5, +1 per 30 min', '5, +1 cada 30 min', '5, +1 a cada 30 min', '5, +1 mỗi 30 phút', '5, +1 tiap 30 menit', '5, 30 dakikada +1', '5, +1 co 30 min'),
    plus: c('Не тратится', 'Не витрачається', 'Never spent', 'No se gasta', 'Não gasta', 'Không tiêu hao', 'Tidak terpakai', 'Harcanmaz', 'Nie zużywa się') },
  { key: 'speak', icon: '🎙',
    title: c('Говорить вслух', 'Говорити вголос', 'Speaking aloud', 'Hablar en voz alta', 'Falar em voz alta', 'Nói thành tiếng', 'Berbicara lantang', 'Sesli konuşma', 'Mówienie na głos'),
    free: c('3 в день', '3 на день', '3 a day', '3 al día', '3 por dia', '3 lần mỗi ngày', '3 per hari', 'Günde 3', '3 dziennie'),
    plus: c('Без лимита', 'Без ліміту', 'Unlimited', 'Sin límite', 'Sem limite', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu') },
  { key: 'mistakes', icon: '🔁',
    title: c('Работа над ошибками', 'Робота над помилками', 'Mistakes practice', 'Práctica de errores', 'Prática de erros', 'Luyện lỗi sai', 'Latihan kesalahan', 'Hata çalışması', 'Praca nad błędami'),
    free: c('1 раз в день', '1 раз на день', 'Once a day', '1 vez al día', '1 vez por dia', '1 lần mỗi ngày', '1 kali per hari', 'Günde 1 kez', '1 raz dziennie'),
    plus: c('Без лимита', 'Без ліміту', 'Unlimited', 'Sin límite', 'Sem limite', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu') },
  { key: 'ai_explain', icon: '💡',
    title: c('Разбор ошибки ИИ', 'Розбір помилки ШІ', 'AI mistake review', 'Explicación del error con IA', 'Explicação do erro por IA', 'AI giải thích lỗi', 'Penjelasan kesalahan oleh AI', 'Yapay zekâ hata açıklaması', 'Rozbiór błędu przez AI'),
    free: c('3 в день', '3 на день', '3 a day', '3 al día', '3 por dia', '3 lần mỗi ngày', '3 per hari', 'Günde 3', '3 dziennie'),
    plus: c('Каждая', 'Кожна', 'Every one', 'Cada una', 'Todas', 'Mọi lỗi', 'Setiap kesalahan', 'Her biri', 'Każdy') },
  { key: 'multi_topic', icon: '🧩',
    title: c('Урок из нескольких тем', 'Урок з кількох тем', 'Lesson from several topics', 'Lección de varios temas', 'Lição de vários temas', 'Bài học từ nhiều chủ đề', 'Pelajaran dari beberapa topik', 'Birkaç konudan ders', 'Lekcja z kilku tematów'),
    free: null,
    plus: c('Есть', 'Є', 'Included', 'Incluido', 'Incluído', 'Có', 'Ada', 'Var', 'Jest') },
  { key: 'dialogs_ai', icon: '💬',
    title: c('Ответы ИИ', 'Відповіді ШІ', 'AI replies', 'Respuestas de IA', 'Respostas da IA', 'Phản hồi của AI', 'Balasan AI', 'Yapay zekâ yanıtları', 'Odpowiedzi AI'),
    free: c('30 в месяц', '30 на місяць', '30 a month', '30 al mes', '30 por mês', '30 mỗi tháng', '30 per bulan', 'Ayda 30', '30 miesięcznie'),
    plus: c('Без лимита', 'Без ліміту', 'Unlimited', 'Sin límite', 'Sem limite', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu') },
  { key: 'scenarios', icon: '🗂',
    title: c('Сценарии', 'Сценарії', 'Scenarios', 'Escenarios', 'Cenários', 'Kịch bản', 'Skenario', 'Senaryolar', 'Scenariusze'),
    free: c('По рангу', 'За рангом', 'By rank', 'Por rango', 'Por nível', 'Theo hạng', 'Sesuai peringkat', 'Rütbeye göre', 'Wg rangi'),
    plus: c('Все сразу', 'Усі одразу', 'All at once', 'Todos a la vez', 'Todos de uma vez', 'Tất cả ngay', 'Semua sekaligus', 'Hepsi bir arada', 'Wszystkie od razu') },
  { key: 'saved', icon: '🃏',
    title: c('Сохранённые фразы', 'Збережені фрази', 'Saved phrases', 'Frases guardadas', 'Frases salvas', 'Cụm từ đã lưu', 'Frasa tersimpan', 'Kayıtlı ifadeler', 'Zapisane frazy'),
    free: c('50', '50', '50', '50', '50', '50', '50', '50', '50'),
    plus: c('Без лимита', 'Без ліміту', 'Unlimited', 'Sin límite', 'Sem limite', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu') },
  { key: 'own_packs', icon: '📦',
    title: c('Свои наборы', 'Власні набори', 'Your own packs', 'Tus propios packs', 'Seus próprios pacotes', 'Bộ thẻ của riêng bạn', 'Paket buatanmu', 'Kendi setlerin', 'Własne zestawy'),
    free: null,
    plus: c('Есть', 'Є', 'Included', 'Incluido', 'Incluído', 'Có', 'Ada', 'Var', 'Jest') },
  { key: 'cards_section', icon: '🗃',
    title: c('Раздел «Карточки»', 'Розділ «Картки»', 'Cards section', 'Sección «Tarjetas»', 'Seção «Cartões»', 'Mục «Thẻ»', 'Bagian «Kartu»', '«Kartlar» bölümü', 'Dział «Karty»'),
    free: c('С ранга 3', 'З рангу 3', 'From rank 3', 'Desde el rango 3', 'A partir do nível 3', 'Từ hạng 3', 'Mulai peringkat 3', '3. rütbeden', 'Od rangi 3'),
    plus: c('Сразу', 'Одразу', 'Right away', 'Desde el inicio', 'Desde o início', 'Ngay lập tức', 'Langsung', 'Hemen', 'Od razu') },
  { key: 'streak_shield', icon: '🛡',
    title: c('Защита серии', 'Захист серії', 'Streak protection', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Perlindungan rentetan', 'Seri koruması', 'Ochrona serii'),
    free: null,
    plus: c('3 в месяц', '3 на місяць', '3 a month', '3 al mes', '3 por mês', '3 mỗi tháng', '3 per bulan', 'Ayda 3', '3 miesięcznie') },
  { key: 'peak', icon: '🏔',
    title: c('Пик', 'Пік', 'Peak', 'Pico', 'Pico', 'Đỉnh', 'Puncak', 'Zirve', 'Szczyt'),
    free: c('С ранга 2', 'З рангу 2', 'From rank 2', 'Desde el rango 2', 'A partir do nível 2', 'Từ hạng 2', 'Mulai peringkat 2', '2. rütbeden', 'Od rangi 2'),
    plus: c('Сразу', 'Одразу', 'Right away', 'Desde el inicio', 'Desde o início', 'Ngay lập tức', 'Langsung', 'Hemen', 'Od razu') },
  { key: 'stats', icon: '📈',
    title: c('Статистика', 'Статистика', 'Statistics', 'Estadísticas', 'Estatísticas', 'Thống kê', 'Statistik', 'İstatistikler', 'Statystyki'),
    free: c('Основная', 'Основна', 'Basic', 'Básica', 'Básica', 'Cơ bản', 'Dasar', 'Temel', 'Podstawowa'),
    plus: c('Вся', 'Уся', 'Full', 'Completa', 'Completa', 'Đầy đủ', 'Lengkap', 'Tamamı', 'Pełna') },
  { key: 'color', icon: '🎨', requiresThemeSliders: true,
    title: c('Цвет приложения', 'Колір застосунку', 'App color', 'Color de la app', 'Cor do app', 'Màu ứng dụng', 'Warna aplikasi', 'Uygulama rengi', 'Kolor aplikacji'),
    free: c('Светлая или тёмная', 'Світла або темна', 'Light or dark', 'Clara u oscura', 'Clara ou escura', 'Sáng hoặc tối', 'Terang atau gelap', 'Açık veya koyu', 'Jasny lub ciemny'),
    plus: c('Любой оттенок', 'Будь-який відтінок', 'Any shade', 'Cualquier tono', 'Qualquer tom', 'Mọi sắc độ', 'Warna apa pun', 'Her ton', 'Dowolny odcień') },
];

/** Пункты вкладки: «Цвет приложения» — только при включённом флаге theme_sliders. */
export function plusTabItems(themeSlidersOn: boolean): readonly PlusTabItem[] {
  return PLUS_TAB_ITEMS.filter((item) => !item.requiresThemeSliders || themeSlidersOn);
}
