import type { Lang } from '../constants/i18n';

export const VIP_SURVEY_ID = 'vip_feedback_v2';
export const VIP_SURVEY_REWARD_DAYS = 30;

export type VipSurveyOption = {
  id: string;
  text: Record<Lang, string>;
};

export type VipSurveyQuestion = {
  id: string;
  title: Record<Lang, string>;
  options: VipSurveyOption[];
  textOnly?: boolean;
};

export type VipSurveyAnswer = {
  optionId?: string;
  comment?: string;
};

export type VipSurveyAnswers = Record<string, VipSurveyAnswer>;

/**
 * Полноязычный текст опроса. РАНЬШЕ loc(ru,uk,es) подставлял английский во ВСЕ
 * живые локали (pt-BR/vi/id/tr/pl) → юзеры этих языков видели английский (баг
 * прода, см. ALL_MODALS_AUDIT_2026-06-21.md §8). Теперь каждый язык переведён.
 * Сигнатура — объект, чтобы случайно не «уронить» язык в английский снова.
 */
type Loc8 = { ru: string; uk: string; es: string; ptBR: string; vi: string; id: string; tr: string; pl: string };
function loc(t: Loc8): Record<Lang, string> {
  return {
    ru: t.ru,
    uk: t.uk,
    es: t.es,
    'pt-BR': t.ptBR,
    vi: t.vi,
    id: t.id,
    tr: t.tr,
    pl: t.pl,
  };
}

/** Повторяющиеся пункты опроса (Уроки/Вызовы/Карточки и т.п.) — один источник перевода. */
const COMMON = {
  lessons: loc({ ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', ptBR: 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' }),
  quizzes: loc({ ru: 'Вызовы', uk: 'Виклики', es: 'Retos', ptBR: 'Desafios', vi: 'Thử thách', id: 'Tantangan', tr: 'Görevler', pl: 'Wyzwania' }),
  flashcards: loc({ ru: 'Карточки', uk: 'Картки', es: 'Tarjetas', ptBR: 'Cartões', vi: 'Thẻ học', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' }),
};

export const VIP_SURVEY_QUESTIONS: VipSurveyQuestion[] = [
  {
    id: 'most_useful',
    title: loc({
      ru: 'Что в приложении помогает учиться лучше всего?',
      uk: 'Що в застосунку допомагає вчитися найкраще?',
      es: '¿Qué parte de la app te ayuda a aprender mejor?',
      ptBR: 'O que no app mais ajuda você a aprender?',
      vi: 'Điều gì trong ứng dụng giúp bạn học tốt nhất?',
      id: 'Apa di aplikasi yang paling membantumu belajar?',
      tr: 'Uygulamada en çok ne öğrenmene yardımcı oluyor?',
      pl: 'Co w aplikacji najbardziej pomaga ci się uczyć?',
    }),
    options: [
      { id: 'lessons', text: COMMON.lessons },
      { id: 'quizzes', text: COMMON.quizzes },
      { id: 'flashcards', text: COMMON.flashcards },
      { id: 'nothing_yet', text: loc({ ru: 'Пока ничего', uk: 'Поки нічого', es: 'Nada por ahora', ptBR: 'Nada por enquanto', vi: 'Chưa có gì', id: 'Belum ada', tr: 'Henüz yok', pl: 'Na razie nic' }) },
    ],
  },
  {
    id: 'linger_screen',
    title: loc({
      ru: 'Где хочется задержаться подольше?',
      uk: 'Де хочеться затриматися довше?',
      es: '¿Dónde te gustaría pasar más tiempo?',
      ptBR: 'Onde você quer passar mais tempo?',
      vi: 'Bạn muốn dành nhiều thời gian hơn ở đâu?',
      id: 'Di mana kamu ingin menghabiskan lebih banyak waktu?',
      tr: 'Nerede daha çok vakit geçirmek istersin?',
      pl: 'Gdzie chcesz spędzać więcej czasu?',
    }),
    options: [
      { id: 'lessons', text: COMMON.lessons },
      { id: 'quizzes', text: COMMON.quizzes },
      { id: 'flashcards', text: COMMON.flashcards },
      { id: 'mistake_practice', text: loc({ ru: 'Отработка ошибок', uk: 'Відпрацювання помилок', es: 'Práctica de errores', ptBR: 'Prática de erros', vi: 'Luyện tập lỗi sai', id: 'Latihan kesalahan', tr: 'Hata çalışması', pl: 'Praca nad błędami' }) },
    ],
  },
  {
    id: 'less_interesting',
    title: loc({
      ru: 'Когда становится менее интересно?',
      uk: 'Коли стає менш цікаво?',
      es: '¿Cuándo se vuelve menos interesante?',
      ptBR: 'Quando fica menos interessante?',
      vi: 'Khi nào việc học trở nên kém thú vị?',
      id: 'Kapan belajar jadi kurang menarik?',
      tr: 'Ne zaman daha az ilgi çekici oluyor?',
      pl: 'Kiedy nauka staje się mniej ciekawa?',
    }),
    options: [
      { id: 'too_easy', text: loc({ ru: 'Слишком легко', uk: 'Занадто легко', es: 'Demasiado fácil', ptBR: 'Fácil demais', vi: 'Quá dễ', id: 'Terlalu mudah', tr: 'Çok kolay', pl: 'Za łatwo' }) },
      { id: 'too_hard', text: loc({ ru: 'Слишком сложно', uk: 'Занадто складно', es: 'Demasiado difícil', ptBR: 'Difícil demais', vi: 'Quá khó', id: 'Terlalu sulit', tr: 'Çok zor', pl: 'Za trudno' }) },
      { id: 'unclear_mistakes', text: loc({ ru: 'Непонятны ошибки', uk: 'Незрозумілі помилки', es: 'Los errores no se entienden', ptBR: 'Os erros não são claros', vi: 'Lỗi sai khó hiểu', id: 'Kesalahan tidak jelas', tr: 'Hatalar belirsiz', pl: 'Błędy są niejasne' }) },
      { id: 'too_much_text', text: loc({ ru: 'Много текста', uk: 'Багато тексту', es: 'Demasiado texto', ptBR: 'Texto demais', vi: 'Quá nhiều chữ', id: 'Terlalu banyak teks', tr: 'Çok fazla metin', pl: 'Za dużo tekstu' }) },
      { id: 'no_progress', text: loc({ ru: 'Не вижу прогресс', uk: 'Не бачу прогрес', es: 'No veo progreso', ptBR: 'Não vejo progresso', vi: 'Không thấy tiến bộ', id: 'Tidak melihat kemajuan', tr: 'İlerleme göremiyorum', pl: 'Nie widzę postępu' }) },
      { id: 'never', text: loc({ ru: 'Не бывает', uk: 'Не буває', es: 'Nunca pasa', ptBR: 'Nunca acontece', vi: 'Không bao giờ', id: 'Tidak pernah', tr: 'Hiç olmuyor', pl: 'Nigdy' }) },
    ],
  },
  {
    id: 'first_time_confusing',
    title: loc({
      ru: 'Что непонятно с первого раза?',
      uk: 'Що незрозуміло з першого разу?',
      es: '¿Qué no queda claro al principio?',
      ptBR: 'O que não fica claro de primeira?',
      vi: 'Điều gì khó hiểu ngay từ đầu?',
      id: 'Apa yang membingungkan di awal?',
      tr: 'İlk seferde ne anlaşılmıyor?',
      pl: 'Co jest niejasne za pierwszym razem?',
    }),
    options: [
      { id: 'what_next', text: loc({ ru: 'Что делать дальше', uk: 'Що робити далі', es: 'Qué hacer después', ptBR: 'O que fazer depois', vi: 'Làm gì tiếp theo', id: 'Apa selanjutnya', tr: 'Sonra ne yapmalı', pl: 'Co robić dalej' }) },
      { id: 'lessons', text: COMMON.lessons },
      { id: 'quizzes', text: COMMON.quizzes },
      { id: 'flashcards', text: COMMON.flashcards },
      { id: 'mistakes', text: loc({ ru: 'Ошибки', uk: 'Помилки', es: 'Errores', ptBR: 'Erros', vi: 'Lỗi sai', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy' }) },
      { id: 'all_clear', text: loc({ ru: 'Всё понятно', uk: 'Усе зрозуміло', es: 'Todo está claro', ptBR: 'Tudo está claro', vi: 'Mọi thứ đều rõ', id: 'Semua jelas', tr: 'Her şey açık', pl: 'Wszystko jasne' }) },
    ],
  },
  {
    id: 'expected_missing',
    title: loc({
      ru: 'Что вы ожидали увидеть в приложении, но не нашли?',
      uk: 'Що ви очікували побачити в застосунку, але не знайшли?',
      es: '¿Qué esperabas encontrar en la app pero no estaba?',
      ptBR: 'O que você esperava encontrar no app, mas não achou?',
      vi: 'Bạn mong thấy gì trong ứng dụng nhưng không tìm thấy?',
      id: 'Apa yang kamu harapkan ada di aplikasi tapi tidak ada?',
      tr: 'Uygulamada görmeyi beklediğin ama bulamadığın ne?',
      pl: 'Czego spodziewałeś się w aplikacji, ale tego nie znalazłeś?',
    }),
    options: [
      { id: 'more_explanations', text: loc({ ru: 'Больше объяснений', uk: 'Більше пояснень', es: 'Más explicaciones', ptBR: 'Mais explicações', vi: 'Nhiều giải thích hơn', id: 'Lebih banyak penjelasan', tr: 'Daha çok açıklama', pl: 'Więcej wyjaśnień' }) },
      { id: 'more_examples', text: loc({ ru: 'Больше примеров', uk: 'Більше прикладів', es: 'Más ejemplos', ptBR: 'Mais exemplos', vi: 'Nhiều ví dụ hơn', id: 'Lebih banyak contoh', tr: 'Daha çok örnek', pl: 'Więcej przykładów' }) },
      { id: 'more_topics', text: loc({ ru: 'Больше тем', uk: 'Більше тем', es: 'Más temas', ptBR: 'Mais temas', vi: 'Nhiều chủ đề hơn', id: 'Lebih banyak topik', tr: 'Daha çok konu', pl: 'Więcej tematów' }) },
      { id: 'more_practice', text: loc({ ru: 'Больше практики', uk: 'Більше практики', es: 'Más práctica', ptBR: 'Mais prática', vi: 'Nhiều luyện tập hơn', id: 'Lebih banyak latihan', tr: 'Daha çok pratik', pl: 'Więcej praktyki' }) },
      { id: 'more_stats', text: loc({ ru: 'Больше статистики', uk: 'Більше статистики', es: 'Más estadísticas', ptBR: 'Mais estatísticas', vi: 'Nhiều thống kê hơn', id: 'Lebih banyak statistik', tr: 'Daha çok istatistik', pl: 'Więcej statystyk' }) },
      { id: 'learning_plan', text: loc({ ru: 'План обучения', uk: 'План навчання', es: 'Plan de estudio', ptBR: 'Plano de estudo', vi: 'Kế hoạch học tập', id: 'Rencana belajar', tr: 'Öğrenme planı', pl: 'Plan nauki' }) },
      { id: 'found_all', text: loc({ ru: 'Всё нашёл(ла)', uk: 'Усе знайшов(ла)', es: 'Lo encontré todo', ptBR: 'Encontrei tudo', vi: 'Tôi đã tìm thấy hết', id: 'Aku menemukan semuanya', tr: 'Hepsini buldum', pl: 'Znalazłem wszystko' }) },
    ],
  },
  {
    id: 'overloaded_screen',
    title: loc({
      ru: 'Какой экран перегружен?',
      uk: 'Який екран перевантажений?',
      es: '¿Qué pantalla se siente sobrecargada?',
      ptBR: 'Qual tela parece sobrecarregada?',
      vi: 'Màn hình nào trông quá tải?',
      id: 'Layar mana yang terasa terlalu penuh?',
      tr: 'Hangi ekran kalabalık hissettiriyor?',
      pl: 'Który ekran wydaje się przeładowany?',
    }),
    options: [
      { id: 'home', text: loc({ ru: 'Главная', uk: 'Головна', es: 'Inicio', ptBR: 'Início', vi: 'Trang chủ', id: 'Beranda', tr: 'Ana sayfa', pl: 'Główna' }) },
      { id: 'lessons', text: COMMON.lessons },
      { id: 'quizzes', text: COMMON.quizzes },
      { id: 'flashcards', text: COMMON.flashcards },
      { id: 'leagues', text: loc({ ru: 'Лиги', uk: 'Ліги', es: 'Ligas', ptBR: 'Ligas', vi: 'Giải đấu', id: 'Liga', tr: 'Ligler', pl: 'Ligi' }) },
      { id: 'profile', text: loc({ ru: 'Профиль', uk: 'Профіль', es: 'Perfil', ptBR: 'Perfil', vi: 'Hồ sơ', id: 'Profil', tr: 'Profil', pl: 'Profil' }) },
      { id: 'none', text: loc({ ru: 'Нет такого', uk: 'Немає такого', es: 'Ninguna', ptBR: 'Nenhuma', vi: 'Không có', id: 'Tidak ada', tr: 'Yok', pl: 'Żaden' }) },
    ],
  },
  {
    id: 'one_thing_week',
    title: loc({
      ru: 'Что бы вы улучшили прямо на этой неделе?',
      uk: 'Що б ви покращили прямо цього тижня?',
      es: '¿Qué mejorarías esta misma semana?',
      ptBR: 'O que você melhoraria já nesta semana?',
      vi: 'Bạn sẽ cải thiện điều gì ngay tuần này?',
      id: 'Apa yang akan kamu perbaiki minggu ini?',
      tr: 'Bu hafta neyi geliştirirdin?',
      pl: 'Co poprawiłbyś już w tym tygodniu?',
    }),
    options: [],
    textOnly: true,
  },
  {
    id: 'feature_request',
    title: loc({
      ru: 'Какую функцию добавить?',
      uk: 'Яку функцію додати?',
      es: '¿Qué función deberíamos añadir?',
      ptBR: 'Qual recurso devemos adicionar?',
      vi: 'Nên thêm tính năng nào?',
      id: 'Fitur apa yang sebaiknya ditambahkan?',
      tr: 'Hangi özelliği eklemeliyiz?',
      pl: 'Jaką funkcję powinniśmy dodać?',
    }),
    options: [],
    textOnly: true,
  },
  {
    id: 'friend_recommendation',
    title: loc({
      ru: 'Если бы вы рекомендовали приложение другу, что бы вы ему рассказали о приложении?',
      uk: 'Якби ви рекомендували застосунок другу, що б ви йому розповіли про застосунок?',
      es: 'Si recomendaras la app a un amigo, ¿qué le contarías sobre ella?',
      ptBR: 'Se você recomendasse o app a um amigo, o que contaria sobre ele?',
      vi: 'Nếu giới thiệu ứng dụng cho một người bạn, bạn sẽ nói gì về nó?',
      id: 'Kalau kamu merekomendasikan aplikasi ini ke teman, apa yang akan kamu ceritakan?',
      tr: 'Uygulamayı bir arkadaşına önersen, ona uygulama hakkında ne anlatırdın?',
      pl: 'Gdybyś polecił aplikację znajomemu, co byś o niej powiedział?',
    }),
    options: [],
    textOnly: true,
  },
];

export function pickVipSurveyText(row: Record<Lang, string>, lang: Lang): string {
  return row[lang] || row.ru;
}

export function getVipSurveyQuestion(questionId: string): VipSurveyQuestion | null {
  return VIP_SURVEY_QUESTIONS.find((question) => question.id === questionId) ?? null;
}

export function getVipSurveyOptionLabel(questionId: string, optionId: string, lang: Lang): string {
  const question = getVipSurveyQuestion(questionId);
  const option = question?.options.find((row) => row.id === optionId);
  return option ? pickVipSurveyText(option.text, lang) : optionId;
}

export function normalizeVipSurveyAnswers(value: unknown): VipSurveyAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: VipSurveyAnswers = {};
  for (const question of VIP_SURVEY_QUESTIONS) {
    const row = raw[question.id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const data = row as Record<string, unknown>;
    const comment = String(data.comment ?? '').trim().slice(0, 500);
    if (question.textOnly) {
      if (!comment) continue;
      out[question.id] = { optionId: 'comment', comment };
      continue;
    }
    const optionId = String(data.optionId ?? '').trim();
    if (!question.options.some((option) => option.id === optionId)) continue;
    out[question.id] = comment ? { optionId, comment } : { optionId };
  }
  return out;
}

export function isVipSurveyComplete(answers: VipSurveyAnswers): boolean {
  return VIP_SURVEY_QUESTIONS.every((question) => {
    if (question.textOnly) return Boolean(answers[question.id]?.comment?.trim());
    const optionId = answers[question.id]?.optionId;
    return question.options.some((option) => option.id === optionId);
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
