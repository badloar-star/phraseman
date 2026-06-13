/**
 * celebrationContent — данные ВАУ-празднования Premium/VIP.
 * Вынесено из PremiumCelebrationModal, чтобы держать компонент чистым и
 * позволить контракт-тестам грепать список без парсинга JSX.
 *
 * Источник преимуществ: аудит premium-гейтов 2026-06-13 (paywall_copy.ts,
 * premium_modal.tsx, premium_guard.ts). ~27 пунктов для длинной авто-прокрутки.
 */
import type { Lang } from '../../constants/i18n';

export type CelebrationVariant = 'premium' | 'vip';

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
  { emoji: '⏳', title: L8('Никакого ожидания', 'Жодного очікування', 'Sin esperas', 'Sem esperas', 'Không phải chờ đợi', 'Tanpa menunggu', 'Bekleme yok', 'Bez czekania'), sub: L8('Уроки без таймера', 'Уроки без таймера', 'Lecciones sin temporizador', 'Lições sem cronômetro', 'Bài học không hẹn giờ', 'Pelajaran tanpa timer', 'Zamanlayıcısız dersler', 'Lekcje bez licznika') },
  { emoji: '📚', title: L8('Все уроки открыты', 'Усі уроки відкрито', 'Todas las lecciones', 'Todas as lições', 'Mở mọi bài học', 'Semua pelajaran terbuka', 'Tüm dersler açık', 'Wszystkie lekcje') },
  { emoji: '🔁', title: L8('Безлимит повторов', 'Безліміт повторів', 'Repasos ilimitados', 'Revisões ilimitadas', 'Ôn tập không giới hạn', 'Ulangi tanpa batas', 'Sınırsız tekrar', 'Nieograniczone powtórki'), sub: L8('Переигрывай любой урок', 'Перегравай будь-який урок', 'Repite cualquier lección', 'Refaça qualquer lição', 'Chơi lại bài bất kỳ', 'Ulang pelajaran apa pun', 'Her dersi yeniden oyna', 'Powtórz dowolną lekcję') },
  { emoji: '💎', title: L8('Повторы без осколков', 'Повтори без уламків', 'Repasos sin fragmentos', 'Revisões sem fragmentos', 'Ôn tập miễn phí', 'Ulang tanpa pecahan', 'Parça harcamadan tekrar', 'Powtórki bez odłamków'), sub: L8('Бесплатно и сразу', 'Безкоштовно й одразу', 'Gratis y al instante', 'Grátis e na hora', 'Miễn phí và ngay lập tức', 'Gratis dan langsung', 'Ücretsiz ve anında', 'Za darmo i od razu') },
  { emoji: '🎯', title: L8('Все сложности квизов', 'Усі складності квізів', 'Todos los niveles', 'Todos os níveis', 'Mọi độ khó quiz', 'Semua tingkat kuis', 'Tüm quiz seviyeleri', 'Wszystkie poziomy quizów'), sub: L8('Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard', 'Easy, Medium, Hard') },
  { emoji: '♾️', title: L8('Квизы без лимита', 'Квізи без ліміту', 'Quizzes sin límite', 'Quizzes sem limite', 'Quiz không giới hạn', 'Kuis tanpa batas', 'Sınırsız quiz', 'Quizy bez limitu'), sub: L8('Играй без «на сегодня всё»', 'Грай без «на сьогодні все»', 'Juega sin tope diario', 'Jogue sem limite diário', 'Chơi không giới hạn ngày', 'Main tanpa batas harian', 'Günlük limit yok', 'Graj bez dziennego limitu') },
  { emoji: '⭐', title: L8('Больше XP', 'Більше XP', 'Más XP', 'Mais XP', 'Nhiều XP hơn', 'Lebih banyak XP', 'Daha fazla XP', 'Więcej XP'), sub: L8('За каждый квиз', 'За кожен квіз', 'Por cada quiz', 'Por cada quiz', 'Cho mỗi quiz', 'Setiap kuis', 'Her quiz için', 'Za każdy quiz') },
  { emoji: '🥇', title: L8('Сложные вызовы', 'Складні виклики', 'Retos difíciles', 'Desafios difíceis', 'Thử thách khó', 'Tantangan sulit', 'Zorlu meydan okumalar', 'Trudne wyzwania'), sub: L8('Для настоящего роста', 'Для справжнього зростання', 'Para crecer de verdad', 'Para crescer de verdade', 'Để thực sự tiến bộ', 'Untuk berkembang nyata', 'Gerçek gelişim için', 'Dla prawdziwego rozwoju') },
  { emoji: '🃏', title: L8('Безлимит карточек', 'Безліміт карток', 'Tarjetas ilimitadas', 'Cartões ilimitados', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kart', 'Nieograniczone karty'), sub: L8('Сохраняй все фразы', 'Зберігай усі фрази', 'Guarda todas las frases', 'Salve todas as frases', 'Lưu mọi cụm từ', 'Simpan semua frasa', 'Tüm ifadeleri kaydet', 'Zapisuj wszystkie frazy') },
  { emoji: '⚔️', title: L8('Арена без лимита', 'Арена без ліміту', 'Arena sin límite', 'Arena sem limite', 'Đấu trường không giới hạn', 'Arena tanpa batas', 'Sınırsız arena', 'Arena bez limitu'), sub: L8('Дуэли без ограничений', 'Дуелі без обмежень', 'Duelos sin restricciones', 'Duelos sem restrições', 'Đấu không giới hạn', 'Duel tanpa batas', 'Sınırsız düello', 'Pojedynki bez ograniczeń') },
  { emoji: '📊', title: L8('Детальная аналитика', 'Детальна аналітика', 'Analítica detallada', 'Análise detalhada', 'Phân tích chi tiết', 'Analitik terperinci', 'Ayrıntılı analiz', 'Szczegółowa analityka'), sub: L8('Весь прогресс на ладони', 'Увесь прогрес на долоні', 'Todo tu progreso a la vista', 'Todo o progresso à vista', 'Toàn bộ tiến độ trong tầm tay', 'Semua kemajuan terlihat', 'Tüm ilerleme avucunda', 'Cały postęp na widoku') },
  { emoji: '🗓️', title: L8('Карта 365 дней', 'Карта 365 днів', 'Mapa de 365 días', 'Mapa de 365 dias', 'Bản đồ 365 ngày', 'Peta 365 hari', '365 günlük harita', 'Mapa 365 dni'), sub: L8('Вся твоя активность', 'Уся твоя активність', 'Toda tu actividad', 'Toda a sua atividade', 'Mọi hoạt động của bạn', 'Semua aktivitasmu', 'Tüm aktiviten', 'Cała twoja aktywność') },
  { emoji: '🔎', title: L8('Паттерны ошибок', 'Патерни помилок', 'Patrones de errores', 'Padrões de erros', 'Mẫu lỗi', 'Pola kesalahan', 'Hata kalıpları', 'Wzorce błędów'), sub: L8('Где именно слабые места', 'Де саме слабкі місця', 'Dónde están tus fallos', 'Onde estão suas falhas', 'Điểm yếu nằm ở đâu', 'Di mana titik lemahmu', 'Zayıf noktalar nerede', 'Gdzie są słabe miejsca') },
  { emoji: '📈', title: L8('Сравнение с другими', 'Порівняння з іншими', 'Comparación con otros', 'Comparação com outros', 'So sánh với người khác', 'Bandingkan dengan lain', 'Diğerleriyle kıyas', 'Porównanie z innymi'), sub: L8('Где ты в топе', 'Де ти в топі', 'Dónde estás en el top', 'Onde você está no top', 'Bạn ở đâu trong top', 'Posisimu di puncak', 'Sıralamada neredesin', 'Gdzie jesteś w czołówce') },
  { emoji: '🧠', title: L8('Безлимит Тренера', 'Безліміт Тренера', 'Entrenador ilimitado', 'Treinador ilimitado', 'Huấn luyện không giới hạn', 'Pelatih tanpa batas', 'Sınırsız Antrenör', 'Nieograniczony Trener'), sub: L8('Практикуй без границ', 'Практикуй без меж', 'Practica sin límites', 'Pratique sem limites', 'Luyện tập không giới hạn', 'Latihan tanpa batas', 'Sınırsız pratik', 'Ćwicz bez granic') },
  { emoji: '🎓', title: L8('Практика слабых мест', 'Практика слабких місць', 'Práctica de puntos débiles', 'Prática de pontos fracos', 'Luyện điểm yếu', 'Latih titik lemah', 'Zayıf nokta pratiği', 'Praktyka słabych miejsc'), sub: L8('Умный алгоритм', 'Розумний алгоритм', 'Algoritmo inteligente', 'Algoritmo inteligente', 'Thuật toán thông minh', 'Algoritma pintar', 'Akıllı algoritma', 'Inteligentny algorytm') },
  { emoji: '🔬', title: L8('Персональный разбор', 'Персональний розбір', 'Análisis personal', 'Análise pessoal', 'Phân tích cá nhân', 'Analisis pribadi', 'Kişisel analiz', 'Osobista analiza'), sub: L8('Точное объяснение ошибок', 'Точне пояснення помилок', 'Explicación exacta de errores', 'Explicação exata dos erros', 'Giải thích lỗi chính xác', 'Penjelasan error akurat', 'Hataların net açıklaması', 'Dokładne wyjaśnienie błędów') },
  { emoji: '🎛️', title: L8('Smart Mix', 'Smart Mix', 'Smart Mix', 'Smart Mix', 'Smart Mix', 'Smart Mix', 'Smart Mix', 'Smart Mix'), sub: L8('Все 6 режимов сразу', 'Усі 6 режимів одразу', 'Los 6 modos a la vez', 'Os 6 modos de uma vez', 'Cả 6 chế độ cùng lúc', '6 mode sekaligus', '6 modun hepsi', 'Wszystkie 6 trybów') },
  { emoji: '🎤', title: L8('Режим речи', 'Режим мовлення', 'Modo de habla', 'Modo de fala', 'Chế độ nói', 'Mode bicara', 'Konuşma modu', 'Tryb mówienia'), sub: L8('Произноси — приложение слышит', 'Вимовляй — застосунок чує', 'Habla y la app te escucha', 'Fale e o app escuta', 'Nói và ứng dụng nghe', 'Bicara, aplikasi mendengar', 'Konuş, uygulama duysun', 'Mów, a aplikacja słucha') },
  { emoji: '💬', title: L8('Подсказка по словам', 'Підказка по словах', 'Pista por palabra', 'Dica por palavra', 'Gợi ý theo từ', 'Petunjuk per kata', 'Kelime ipucu', 'Podpowiedź do słów'), sub: L8('Мгновенно', 'Миттєво', 'Al instante', 'Na hora', 'Tức thì', 'Seketika', 'Anında', 'Natychmiast') },
  { emoji: '🛡️', title: L8('Защита цепочки', 'Захист ланцюжка', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Lindungi rangkaian', 'Seri koruması', 'Ochrona serii'), sub: L8('Серия не сгорит при пропуске', 'Серія не згорить при пропуску', 'Tu racha sobrevive un fallo', 'Sua sequência sobrevive', 'Chuỗi không mất khi lỡ', 'Streak aman saat bolos', 'Kaçırınca seri yanmaz', 'Seria przetrwa pominięcie') },
  { emoji: '🎨', title: L8('Тема Forest', 'Тема Forest', 'Tema Forest', 'Tema Forest', 'Chủ đề Forest', 'Tema Forest', 'Forest teması', 'Motyw Forest'), sub: L8('Хвойный лес', 'Хвойний ліс', 'Bosque de coníferas', 'Floresta de coníferas', 'Rừng thông', 'Hutan pinus', 'Çam ormanı', 'Las iglasty') },
  { emoji: '🌃', title: L8('Тема Neon', 'Тема Neon', 'Tema Neon', 'Tema Neon', 'Chủ đề Neon', 'Tema Neon', 'Neon teması', 'Motyw Neon'), sub: L8('Неоновые огни', 'Неонові вогні', 'Luces de neón', 'Luzes neon', 'Ánh đèn neon', 'Lampu neon', 'Neon ışıkları', 'Neonowe światła') },
  { emoji: '👑', title: L8('Золотое имя', 'Золоте ім’я', 'Nombre dorado', 'Nome dourado', 'Tên vàng', 'Nama emas', 'Altın isim', 'Złote imię'), sub: L8('В лидербордах', 'У лідербордах', 'En las clasificaciones', 'Nos rankings', 'Trong bảng xếp hạng', 'Di papan peringkat', 'Sıralamalarda', 'W rankingach') },
  { emoji: '✨', title: L8('Премиум-подсветка', 'Преміум-підсвітка', 'Realce premium', 'Destaque premium', 'Nổi bật premium', 'Sorotan premium', 'Premium vurgu', 'Premiumowe podświetlenie'), sub: L8('Твой профиль выделяется', 'Твій профіль вирізняється', 'Tu perfil destaca', 'Seu perfil se destaca', 'Hồ sơ của bạn nổi bật', 'Profilmu menonjol', 'Profilin öne çıkar', 'Twój profil wyróżnia się') },
  { emoji: '📋', title: L8('Персональный план', 'Персональний план', 'Plan personal', 'Plano pessoal', 'Kế hoạch cá nhân', 'Rencana pribadi', 'Kişisel plan', 'Osobisty plan'), sub: L8('Уроки, фразы и повторы', 'Уроки, фрази й повтори', 'Lecciones, frases y repasos', 'Lições, frases e revisões', 'Bài học, cụm từ và ôn tập', 'Pelajaran, frasa, ulangan', 'Dersler, ifadeler, tekrarlar', 'Lekcje, frazy i powtórki') },
];

/** VIP видит те же преимущества + реферальные награды. Доп. строка в начало VIP-списка. */
export const VIP_EXTRA_FEATURE: CelebrationFeature = {
  emoji: '🤝',
  title: L8('Реферальные награды', 'Реферальні нагороди', 'Recompensas de referidos', 'Recompensas de indicação', 'Phần thưởng giới thiệu', 'Hadiah referral', 'Davet ödülleri', 'Nagrody za polecenia'),
  sub: L8('Дни доступа за друзей', 'Дні доступу за друзів', 'Días de acceso por amigos', 'Dias de acesso por amigos', 'Ngày truy cập nhờ bạn bè', 'Hari akses dari teman', 'Arkadaşlardan erişim günleri', 'Dni dostępu za znajomych'),
};

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
    emblem: 'VIP',
  },
};
