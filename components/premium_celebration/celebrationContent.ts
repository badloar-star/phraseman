/**
 * celebrationContent — данные ВАУ-празднования Premium/VIP.
 * Вынесено из PremiumCelebrationModal, чтобы держать компонент чистым и
 * позволить контракт-тестам грепать список без парсинга JSX.
 *
 * Источник преимуществ: актуальная Plus-выжимка из paywall FAQ + активные Plus-гейты.
 * Список намеренно короткий: на celebration-экране важнее быстро считать ценность, чем показать каталог.
 */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';

// зачем: аудит 2026-08-17 нашёл реальные эмодзи в интерфейсе (запрет владельца,
// правило 4) — эмодзи-строки использовались как текст И в classic, И в Hybrid
// рендере. Источник один (этот файл), правим один раз для обоих.
export type CelebrationIconName = ComponentProps<typeof Ionicons>['name'];

// Варианты празднования:
//  - 'premium' → рекуррентный Plus (жёлтая палитра)
//  - 'vip'     → Plus, выданный за опрос/рефералку/админкой (зелёная палитра)
//  - 'pro'     → разовая покупка Phraseman Pro (синяя палитра)
// Внутренние ключи ('premium'/'vip') не меняем — это сломало бы вызовы и тесты;
// пользователю показываем только новые названия (Plus/Pro) в заголовках/эмблемах.
export type CelebrationVariant = 'premium' | 'vip' | 'pro';

export interface CelebrationFeature {
  icon: CelebrationIconName;
  title: Record<Lang | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>;
  sub?: Record<Lang | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>;
}

/** Компактный хелпер: одна строка → все 8 локалей (заглушка En-fallback для редких языков). */
// зачем (координатор 12.10, подготовка к английскому интерфейсу): английский — последний аргумент (обязательный: забытый перевод ловит компилятор), чтобы не сдвигать позиции остальных языков.
function L8(ru: string, uk: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string, en: string): Record<string, string> {
  return { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl };
}

export const CELEBRATION_FEATURES: CelebrationFeature[] = [
  { icon: 'flash', title: L8('Безлимитная энергия', 'Безлімітна енергія', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng vô hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Nielimitowana energia', 'Unlimited energy'), sub: L8('Учи сколько хочешь', 'Вчи скільки хочеш', 'Aprende sin parar', 'Aprenda sem parar', 'Học bao nhiêu tùy thích', 'Belajar sepuasnya', 'İstediğin kadar öğren', 'Ucz się bez końca', 'Learn as much as you like') },
  { icon: 'book', title: L8('Все уроки открыты', 'Усі уроки відкрито', 'Todas las lecciones abiertas', 'Todas as lições abertas', 'Mở mọi bài học', 'Semua pelajaran terbuka', 'Tüm dersler açık', 'Wszystkie lekcje otwarte', 'All lessons unlocked'), sub: L8('Весь путь без закрытых дверей', 'Увесь шлях без закритих дверей', 'Todo el camino sin bloqueos', 'Todo o caminho sem bloqueios', 'Cả lộ trình không bị khóa', 'Semua jalur tanpa terkunci', 'Tüm yol kilitsiz', 'Cała ścieżka bez blokad', 'The whole path, no closed doors') },
  { icon: 'refresh', title: L8('Повторы без ограничений', 'Повтори без обмежень', 'Repasos sin límites', 'Revisões sem limites', 'Ôn tập không giới hạn', 'Ulang tanpa batas', 'Sınırsız tekrar', 'Powtórki bez ograniczeń', 'Unlimited reviews'), sub: L8('Переигрывай любой урок', 'Перегравай будь-який урок', 'Repite cualquier lección', 'Refaça qualquer lição', 'Chơi lại bài bất kỳ', 'Ulang pelajaran apa pun', 'Her dersi yeniden oyna', 'Powtórz dowolną lekcję', 'Replay any lesson') },
  { icon: 'albums', title: L8('Безлимит карточек', 'Безліміт карток', 'Tarjetas ilimitadas', 'Cartões ilimitados', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kart', 'Nieograniczone karty', 'Unlimited cards'), sub: L8('Больше 20 сохранённых фраз', 'Понад 20 збережених фраз', 'Más de 20 frases guardadas', 'Mais de 20 frases salvas', 'Hơn 20 cụm từ đã lưu', 'Lebih dari 20 frasa tersimpan', '20’den fazla kayıtlı ifade', 'Ponad 20 zapisanych fraz', 'More than 20 saved phrases') },
  { icon: 'chatbubbles', title: L8('AI-диалоги', 'AI-діалоги', 'Diálogos con IA', 'Diálogos com IA', 'Đối thoại AI', 'Dialog AI', 'AI diyalogları', 'Dialogi AI', 'AI dialogues'), sub: L8('Сценарии по твоему уровню', 'Сценарії під твій рівень', 'Escenarios para tu nivel', 'Cenários para seu nível', 'Kịch bản theo trình độ của bạn', 'Skenario sesuai levelmu', 'Seviyene göre senaryolar', 'Scenariusze pod twój poziom', 'Scenarios for your level') },
  { icon: 'mic', title: L8('Голос с оценкой фразы', 'Голос з оцінкою вислову', 'Voz con evaluación', 'Voz com avaliação', 'Giọng nói có chấm điểm', 'Suara dengan penilaian', 'Puanlı ses pratiği', 'Głos z oceną frazy', 'Voice with phrase scoring'), sub: L8('Говори — приложение проверит', 'Говори — застосунок перевірить', 'Habla y la app corrige', 'Fale e o app avalia', 'Nói và ứng dụng kiểm tra', 'Bicara, aplikasi menilai', 'Konuş, uygulama kontrol etsin', 'Mów, a aplikacja sprawdzi', 'Speak — the app checks you') },
  { icon: 'bulb', title: L8('Умный Тренер', 'Розумний Тренер', 'Entrenador inteligente', 'Treinador inteligente', 'Huấn luyện thông minh', 'Pelatih pintar', 'Akıllı Antrenör', 'Inteligentny Trener', 'Smart Coach'), sub: L8('Слабые места и точечный повтор', 'Слабкі місця й точковий повтор', 'Puntos débiles y repaso preciso', 'Pontos fracos e revisão focada', 'Điểm yếu và ôn tập đúng chỗ', 'Titik lemah dan ulang terarah', 'Zayıf noktalar ve hedefli tekrar', 'Słabe punkty i celna powtórka', 'Weak spots and targeted review') },
  { icon: 'search', title: L8('ИИ-разбор ошибок', 'AI-розбір помилок', 'Análisis de errores con IA', 'Análise de erros com IA', 'AI phân tích lỗi', 'Analisis error AI', 'AI hata analizi', 'Analiza błędów AI', 'AI error review'), sub: L8('Что не так и как сказать правильно', 'Що не так і як сказати правильно', 'Qué falla y cómo decirlo bien', 'O que falhou e como dizer certo', 'Sai ở đâu và nói thế nào cho đúng', 'Apa yang salah dan cara benarnya', 'Ne yanlış ve doğrusu nasıl', 'Co jest źle i jak powiedzieć dobrze', 'What is wrong and how to say it right') },
  { icon: 'list', title: L8('Персональный план', 'Персональний план', 'Plan personal', 'Plano pessoal', 'Kế hoạch cá nhân', 'Rencana pribadi', 'Kişisel plan', 'Osobisty plan', 'Personal plan'), sub: L8('Уроки, фразы и повторы', 'Уроки, фрази й повтори', 'Lecciones, frases y repasos', 'Lições, frases e revisões', 'Bài học, cụm từ và ôn tập', 'Pelajaran, frasa, ulangan', 'Dersler, ifadeler, tekrarlar', 'Lekcje, frazy i powtórki', 'Lessons, phrases and reviews') },
  { icon: 'bar-chart', title: L8('Детальная аналитика', 'Детальна аналітика', 'Analítica detallada', 'Análise detalhada', 'Phân tích chi tiết', 'Analitik terperinci', 'Ayrıntılı analiz', 'Szczegółowa analityka', 'Detailed analytics'), sub: L8('Прогресс, 365 дней и паттерны', 'Прогрес, 365 днів і патерни', 'Progreso, 365 días y patrones', 'Progresso, 365 dias e padrões', 'Tiến độ, 365 ngày và mẫu lỗi', 'Kemajuan, 365 hari, dan pola', 'İlerleme, 365 gün ve kalıplar', 'Postęp, 365 dni i wzorce', 'Progress, 365 days and patterns') },
  // зачем: раньше подпись обещала, что серия «не сгорит при пропуске» — безусловно.
  // На деле Plus даёт PREMIUM_FREE_FREEZES_PER_MONTH = 3 заморозки в месяц
  // (app/premium_freeze_allowance.ts). Текст выровнен по реальной механике, чтобы
  // окно поздравления не обещало больше, чем продукт даёт.
  { icon: 'shield-checkmark', title: L8('Защита цепочки', 'Захист ланцюжка', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Lindungi rangkaian', 'Seri koruması', 'Ochrona serii', 'Streak protection'), sub: L8('3 заморозки серии каждый месяц', '3 заморозки серії щомісяця', '3 congelaciones de racha al mes', '3 congelamentos de sequência por mês', '3 lần đóng băng chuỗi mỗi tháng', '3 pembekuan rangkaian tiap bulan', 'Her ay 3 seri dondurma', '3 zamrożenia serii co miesiąc', '3 streak freezes every month') },
  { icon: 'sparkles', title: L8('Plus-темы и аура', 'Plus-теми й аура', 'Temas y aura Plus', 'Temas e aura Plus', 'Chủ đề và hào quang Plus', 'Tema dan aura Plus', 'Plus temaları ve aura', 'Motywy i aura Plus', 'Plus themes and aura'), sub: L8('Профиль заметен в Plus-стиле', 'Профіль помітний у Plus-стилі', 'Tu perfil destaca con estilo Plus', 'Seu perfil ganha estilo Plus', 'Hồ sơ nổi bật theo phong cách Plus', 'Profil terlihat dengan gaya Plus', 'Profilin Plus stiliyle öne çıkar', 'Profil wyróżnia się stylem Plus', 'Your profile stands out in Plus style') },
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
  emblemIcon: CelebrationIconName;
}

// зачем (владелец 13.10, №35 «все модалы слушаются тему», решение координатора: золото/зелень/синева церемоний — хардкод мимо темы): таблица CELEBRATION_PALETTES
// была МЁРТВА — её не читал ни один файл (церемонию красит PremiumCelebrationModal токенами текущей темы через liquidGlassTokens). Удалена вместе с 45 зашитыми цветами;
// тип CelebrationPalette оставлен: его принимают сцены (CelebrationSceneViews).
