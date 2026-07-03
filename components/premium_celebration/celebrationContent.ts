/**
 * celebrationContent — данные ВАУ-празднования Premium/VIP.
 * Вынесено из PremiumCelebrationModal, чтобы держать компонент чистым и
 * позволить контракт-тестам грепать список без парсинга JSX.
 *
 * Источник преимуществ: актуальная Plus-выжимка из paywall FAQ + активные Plus-гейты.
 * Список намеренно короткий: на celebration-экране важнее быстро считать ценность, чем показать каталог.
 */
import type { Lang } from '../../constants/i18n';

// Варианты празднования:
//  - 'premium' → рекуррентный Plus (жёлтая палитра)
//  - 'vip'     → Plus, выданный за опрос/рефералку/админкой (зелёная палитра)
//  - 'pro'     → разовая покупка Phraseman Pro (синяя палитра)
// Внутренние ключи ('premium'/'vip') не меняем — это сломало бы вызовы и тесты;
// пользователю показываем только новые названия (Plus/Pro) в заголовках/эмблемах.
export type CelebrationVariant = 'premium' | 'vip' | 'pro';

export interface CelebrationFeature {
  emoji: string;
  title: Record<Lang | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>;
  sub?: Record<Lang | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>;
}

/** Компактный хелпер: одна строка → все 8 локалей (заглушка En-fallback для редких языков). */
function L8(ru: string, uk: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): Record<string, string> {
  return { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl };
}

export const CELEBRATION_FEATURES: CelebrationFeature[] = [
  { emoji: '⚡', title: L8('Безлимитная энергия', 'Безлімітна енергія', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng vô hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Nielimitowana energia'), sub: L8('Учи сколько хочешь', 'Вчи скільки хочеш', 'Aprende sin parar', 'Aprenda sem parar', 'Học bao nhiêu tùy thích', 'Belajar sepuasnya', 'İstediğin kadar öğren', 'Ucz się bez końca') },
  { emoji: '📚', title: L8('Все уроки открыты', 'Усі уроки відкрито', 'Todas las lecciones abiertas', 'Todas as lições abertas', 'Mở mọi bài học', 'Semua pelajaran terbuka', 'Tüm dersler açık', 'Wszystkie lekcje otwarte'), sub: L8('Весь путь без закрытых дверей', 'Увесь шлях без закритих дверей', 'Todo el camino sin bloqueos', 'Todo o caminho sem bloqueios', 'Cả lộ trình không bị khóa', 'Semua jalur tanpa terkunci', 'Tüm yol kilitsiz', 'Cała ścieżka bez blokad') },
  { emoji: '🔁', title: L8('Повторы без осколков', 'Повтори без уламків', 'Repasos sin fragmentos', 'Revisões sem fragmentos', 'Ôn tập không cần mảnh', 'Ulang tanpa pecahan', 'Parça harcamadan tekrar', 'Powtórki bez odłamków'), sub: L8('Переигрывай любой урок', 'Перегравай будь-який урок', 'Repite cualquier lección', 'Refaça qualquer lição', 'Chơi lại bài bất kỳ', 'Ulang pelajaran apa pun', 'Her dersi yeniden oyna', 'Powtórz dowolną lekcję') },
  { emoji: '♾️', title: L8('Квизы без лимита', 'Квізи без ліміту', 'Quizzes sin límite', 'Quizzes sem limite', 'Quiz không giới hạn', 'Kuis tanpa batas', 'Sınırsız quiz', 'Quizy bez limitu'), sub: L8('Играй без «на сегодня всё»', 'Грай без «на сьогодні все»', 'Juega sin tope diario', 'Jogue sem limite diário', 'Chơi không giới hạn ngày', 'Main tanpa batas harian', 'Günlük limit yok', 'Graj bez dziennego limitu') },
  { emoji: '🃏', title: L8('Безлимит карточек', 'Безліміт карток', 'Tarjetas ilimitadas', 'Cartões ilimitados', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kart', 'Nieograniczone karty'), sub: L8('Больше 20 сохранённых фраз', 'Понад 20 збережених фраз', 'Más de 20 frases guardadas', 'Mais de 20 frases salvas', 'Hơn 20 cụm từ đã lưu', 'Lebih dari 20 frasa tersimpan', '20’den fazla kayıtlı ifade', 'Ponad 20 zapisanych fraz') },
  { emoji: '💬', title: L8('AI-диалоги', 'AI-діалоги', 'Diálogos con IA', 'Diálogos com IA', 'Đối thoại AI', 'Dialog AI', 'AI diyalogları', 'Dialogi AI'), sub: L8('Сценарии по твоему уровню', 'Сценарії під твій рівень', 'Escenarios para tu nivel', 'Cenários para seu nível', 'Kịch bản theo trình độ của bạn', 'Skenario sesuai levelmu', 'Seviyene göre senaryolar', 'Scenariusze pod twój poziom') },
  { emoji: '🎤', title: L8('Голос с оценкой фразы', 'Голос з оцінкою фрази', 'Voz con evaluación', 'Voz com avaliação', 'Giọng nói có chấm điểm', 'Suara dengan penilaian', 'Puanlı ses pratiği', 'Głos z oceną frazy'), sub: L8('Говори — приложение проверит', 'Говори — застосунок перевірить', 'Habla y la app corrige', 'Fale e o app avalia', 'Nói và ứng dụng kiểm tra', 'Bicara, aplikasi menilai', 'Konuş, uygulama kontrol etsin', 'Mów, a aplikacja sprawdzi') },
  { emoji: '🧠', title: L8('Умный Тренер', 'Розумний Тренер', 'Entrenador inteligente', 'Treinador inteligente', 'Huấn luyện thông minh', 'Pelatih pintar', 'Akıllı Antrenör', 'Inteligentny Trener'), sub: L8('Слабые места и точечный повтор', 'Слабкі місця й точковий повтор', 'Puntos débiles y repaso preciso', 'Pontos fracos e revisão focada', 'Điểm yếu và ôn tập đúng chỗ', 'Titik lemah dan ulang terarah', 'Zayıf noktalar ve hedefli tekrar', 'Słabe punkty i celna powtórka') },
  { emoji: '🔬', title: L8('ИИ-разбор ошибок', 'AI-розбір помилок', 'Análisis de errores con IA', 'Análise de erros com IA', 'AI phân tích lỗi', 'Analisis error AI', 'AI hata analizi', 'Analiza błędów AI'), sub: L8('Что не так и как сказать правильно', 'Що не так і як сказати правильно', 'Qué falla y cómo decirlo bien', 'O que falhou e como dizer certo', 'Sai ở đâu và nói thế nào cho đúng', 'Apa yang salah dan cara benarnya', 'Ne yanlış ve doğrusu nasıl', 'Co jest źle i jak powiedzieć dobrze') },
  { emoji: '📋', title: L8('Персональный план', 'Персональний план', 'Plan personal', 'Plano pessoal', 'Kế hoạch cá nhân', 'Rencana pribadi', 'Kişisel plan', 'Osobisty plan'), sub: L8('Уроки, фразы и повторы', 'Уроки, фрази й повтори', 'Lecciones, frases y repasos', 'Lições, frases e revisões', 'Bài học, cụm từ và ôn tập', 'Pelajaran, frasa, ulangan', 'Dersler, ifadeler, tekrarlar', 'Lekcje, frazy i powtórki') },
  { emoji: '🗓️', title: L8('Недельный обзор', 'Тижневий огляд', 'Resumen semanal', 'Resumo semanal', 'Tổng kết tuần', 'Ringkasan mingguan', 'Haftalık özet', 'Przegląd tygodnia'), sub: L8('Компас собирает план на неделю', 'Компас збирає план на тиждень', 'Compass arma tu semana', 'O Compass monta sua semana', 'Compass lập kế hoạch tuần', 'Compass menyusun rencana mingguan', 'Compass haftanı planlar', 'Compass składa plan tygodnia') },
  { emoji: '🧭', title: L8('Компас дня', 'Компас дня', 'Compass del día', 'Compass do dia', 'Compass trong ngày', 'Compass harian', 'Günün Compass’ı', 'Compass dnia'), sub: L8('Вечерний итог и следующий шаг', 'Вечірній підсумок і наступний крок', 'Cierre del día y próximo paso', 'Fechamento do dia e próximo passo', 'Tổng kết tối và bước tiếp theo', 'Ringkasan malam dan langkah berikutnya', 'Akşam özeti ve sonraki adım', 'Wieczorne podsumowanie i kolejny krok') },
  { emoji: '📊', title: L8('Детальная аналитика', 'Детальна аналітика', 'Analítica detallada', 'Análise detalhada', 'Phân tích chi tiết', 'Analitik terperinci', 'Ayrıntılı analiz', 'Szczegółowa analityka'), sub: L8('Прогресс, 365 дней и паттерны', 'Прогрес, 365 днів і патерни', 'Progreso, 365 días y patrones', 'Progresso, 365 dias e padrões', 'Tiến độ, 365 ngày và mẫu lỗi', 'Kemajuan, 365 hari, dan pola', 'İlerleme, 365 gün ve kalıplar', 'Postęp, 365 dni i wzorce') },
  { emoji: '⚔️', title: L8('Арена без лимита', 'Арена без ліміту', 'Arena sin límite', 'Arena sem limite', 'Đấu trường không giới hạn', 'Arena tanpa batas', 'Sınırsız arena', 'Arena bez limitu'), sub: L8('Дуэли без ограничений', 'Дуелі без обмежень', 'Duelos sin restricciones', 'Duelos sem restrições', 'Đấu không giới hạn', 'Duel tanpa batas', 'Sınırsız düello', 'Pojedynki bez ograniczeń') },
  { emoji: '🛡️', title: L8('Защита цепочки', 'Захист ланцюжка', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Lindungi rangkaian', 'Seri koruması', 'Ochrona serii'), sub: L8('Серия не сгорит при пропуске', 'Серія не згорить при пропуску', 'Tu racha sobrevive un fallo', 'Sua sequência sobrevive', 'Chuỗi không mất khi lỡ', 'Streak aman saat bolos', 'Kaçırınca seri yanmaz', 'Seria przetrwa pominięcie') },
  { emoji: '✨', title: L8('Plus-темы и аура', 'Plus-теми й аура', 'Temas y aura Plus', 'Temas e aura Plus', 'Chủ đề và hào quang Plus', 'Tema dan aura Plus', 'Plus temaları ve aura', 'Motywy i aura Plus'), sub: L8('Профиль заметен в Plus-стиле', 'Профіль помітний у Plus-стилі', 'Tu perfil destaca con estilo Plus', 'Seu perfil ganha estilo Plus', 'Hồ sơ nổi bật theo phong cách Plus', 'Profil terlihat dengan gaya Plus', 'Profilin Plus stiliyle öne çıkar', 'Profil wyróżnia się stylem Plus') },
];

export interface CelebrationPalette {
  /** Фон-градиент (radial top→bottom). */
  bg: [string, string, string];
  /** Основной акцент (кольцо, частицы, аврора). */
  main: string;
  bright: string;
  /** Цвет текста заголовка/подзаголовка. */
  titleGrad: [string, string, string];
  text: string;
  /** Цвет внутри строк-преимуществ. */
  rowText: string;
  rowSub: string;
  /** CTA-градиент + цвет текста. */
  cta: [string, string, string];
  ctaText: string;
  /** RGB-строки для авроры-лент (без alpha). */
  auroraRgb: [string, string, string];
  emblem: string;
}

export const CELEBRATION_PALETTES: Record<CelebrationVariant, CelebrationPalette> = {
  premium: {
    bg: ['#1c1405', '#0d0a04', '#050402'],
    main: '#FFD700',
    bright: '#FFE680',
    titleGrad: ['#FFF6D6', '#FFD700', '#B8860B'],
    text: '#FFE9A8',
    rowText: '#FFF3CC',
    rowSub: '#C9B57E',
    cta: ['#B8860B', '#FFD700', '#B8860B'],
    ctaText: '#1a1208',
    auroraRgb: ['255,215,0', '184,134,11', '255,230,128'],
    emblem: '👑',
  },
  vip: {
    bg: ['#06231a', '#04140d', '#020806'],
    main: '#34D399',
    bright: '#86EFAC',
    titleGrad: ['#F0FFF7', '#34D399', '#047857'],
    text: '#D6FFE9',
    rowText: '#EAFFF4',
    rowSub: '#9FD9BE',
    cta: ['#047857', '#34D399', '#065F46'],
    ctaText: '#04140d',
    auroraRgb: ['52,211,153', '16,185,129', '134,239,172'],
    emblem: '✨', // раньше был текст «VIP»; теперь нейтральная эмблема Plus (зелёная палитра)
  },
  // Pro = разовая покупка Phraseman Pro. Синяя «дорогая» палитра, отличная от Plus.
  pro: {
    bg: ['#08203a', '#04101f', '#02060d'],
    main: '#38BDF8',
    bright: '#7DD3FC',
    titleGrad: ['#EAF7FF', '#38BDF8', '#0369A1'],
    text: '#D6F0FF',
    rowText: '#EAF6FF',
    rowSub: '#9FCBE6',
    cta: ['#0369A1', '#38BDF8', '#075985'],
    ctaText: '#04101f',
    auroraRgb: ['56,189,248', '14,165,233', '125,211,252'],
    emblem: '💎',
  },
};
