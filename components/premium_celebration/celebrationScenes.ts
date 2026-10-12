/**
 * celebrationScenes — сцены акта 2 празднования покупки (v6 «Золотая палата»).
 *
 * зачем: владелец утвердил (2026-08-24) редизайн, где каждое преимущество
 * показывается СВОЕЙ механикой, а не строкой в общей ленте. Старая лента из
 * 12 одинаковых строк удалена целиком. Тайминги здесь — источник правды и для
 * визуала, и для звука: те же миллисекунды лежат в
 * docs/design/CELEBRATION_SOUND_PROMPTS.md (карты ударов) и должны попасть в
 * modules/audio/sound_motion.ts, иначе звук разойдётся с картинкой.
 *
 * зачем 6, не 11 (владелец 2026-08-25): «укоротить» — прогон с одиннадцатью
 * сценами (~11.9 с) шёл слишком долго. Список сокращён до шести самых сильных
 * и разных по механике преимуществ (как в раннем макете v4 «Витраж»);
 * cards/errors/plan/stats/aura убраны — не потому что хуже, а чтобы прогон
 * стал короче без потери разнообразия механик. Сцены и их визуалы
 * (CelebrationSceneViews.tsx) НЕ удалены — просто не входят в список показа;
 * их снова можно включить, вернув в CELEBRATION_SCENES.
 *
 * Макет-эталон: .motion-mockups/phraseman-celebration-v6.html
 */
import type { CelebrationIconName } from './celebrationContent';
import type { Lang } from '../../constants/i18n';

export type CelebrationSceneId =
  | 'energy'
  | 'lessons'
  | 'cards'
  | 'dialogs'
  | 'voice'
  | 'coach'
  | 'errors'
  | 'plan'
  | 'stats'
  | 'streak'
  | 'aura';

type L8Map = Record<string, string>;

/** Компактный хелпер: одна строка → все 8 локалей. */
// зачем (координатор 12.10, подготовка к английскому интерфейсу): английский — последний аргумент (обязательный: забытый перевод ловит компилятор), чтобы не сдвигать позиции остальных языков.
function L8(ru: string, uk: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string, en: string): L8Map {
  return { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl };
}

export function sceneText(map: L8Map, lang: Lang | string): string {
  return map[String(lang)] ?? map.ru;
}

export interface CelebrationScene {
  id: CelebrationSceneId;
  /** Ключ звука в modules/audio/sound_events.ts (без префикса pm.celebration.). */
  sound: string;
  icon: CelebrationIconName;
  title: L8Map;
  sub: L8Map;
  /** Длительность сцены на экране, мс. Шаг показа = SCENE_STEP_MS. */
  durationMs: number;
}

/** Шаг смены сцен акта 2. Совпадает с макетом v6 (780 мс). */
export const SCENE_STEP_MS = 780;

/**
 * Полный каталог сцен-преимуществ. Не все из них показываются в прогоне —
 * см. CELEBRATION_SCENES ниже, который выбирает подмножество для показа.
 * Держим весь каталог живым, чтобы визуалы (CelebrationSceneViews.tsx) не
 * стали мёртвым кодом и список показа можно было расширить одной правкой.
 */
export const ALL_SCENES: readonly CelebrationScene[] = [
  {
    id: 'energy',
    sound: 'energy_break',
    icon: 'flash',
    durationMs: 1210,
    title: L8('Безлимитная энергия', 'Безлімітна енергія', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng vô hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Nielimitowana energia', 'Unlimited energy'),
    sub: L8('Учись сколько хочешь', 'Вчи скільки хочеш', 'Aprende sin parar', 'Aprenda sem parar', 'Học bao nhiêu tùy thích', 'Belajar sepuasnya', 'İstediğin kadar öğren', 'Ucz się bez końca', 'Learn as much as you like'),
  },
  {
    id: 'lessons',
    sound: 'locks_off',
    icon: 'book',
    durationMs: 780,
    title: L8('Все уроки открыты', 'Усі уроки відкрито', 'Todas las lecciones abiertas', 'Todas as lições abertas', 'Mở mọi bài học', 'Semua pelajaran terbuka', 'Tüm dersler açık', 'Wszystkie lekcje otwarte', 'All lessons unlocked'),
    sub: L8('Весь путь без закрытых дверей', 'Увесь шлях без зачинених дверей', 'Todo el camino sin bloqueos', 'Todo o caminho sem bloqueios', 'Cả lộ trình không bị khóa', 'Semua jalur tanpa terkunci', 'Tüm yol kilitsiz', 'Cała ścieżka bez blokad', 'The whole path, no closed doors'),
  },
  {
    id: 'cards',
    sound: 'cards_stack',
    icon: 'albums',
    durationMs: 1100,
    title: L8('Безлимит карточек', 'Безліміт карток', 'Tarjetas ilimitadas', 'Cartões ilimitados', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kart', 'Nieograniczone karty', 'Unlimited cards'),
    sub: L8('Сохраняй сколько нужно', 'Зберігай скільки треба', 'Guarda cuanto necesites', 'Salve quantas precisar', 'Lưu bao nhiêu tùy ý', 'Simpan sebanyak perlu', 'İstediğin kadar kaydet', 'Zapisuj ile potrzebujesz', 'Save as many as you need'),
  },
  {
    id: 'dialogs',
    sound: 'dialog_spark',
    icon: 'chatbubbles',
    durationMs: 900,
    title: L8('AI-диалоги', 'AI-діалоги', 'Diálogos con IA', 'Diálogos com IA', 'Đối thoại AI', 'Dialog AI', 'AI diyalogları', 'Dialogi AI', 'AI dialogues'),
    sub: L8('Собеседник не устанет и не осудит', 'Співрозмовник не втомиться й не осудить', 'Un interlocutor que nunca juzga', 'Um interlocutor que nunca julga', 'Người trò chuyện không phán xét', 'Lawan bicara tanpa menghakimi', 'Yargılamayan bir muhatap', 'Rozmówca, który nie oceni', 'A partner who never tires or judges'),
  },
  {
    id: 'voice',
    sound: 'voice_score',
    icon: 'mic',
    durationMs: 1170,
    title: L8('Голос с оценкой фразы', 'Голос з оцінкою вислову', 'Voz con evaluación', 'Voz com avaliação', 'Giọng nói có chấm điểm', 'Suara dengan penilaian', 'Puanlı ses pratiği', 'Głos z oceną frazy', 'Voice with phrase scoring'),
    sub: L8('Говори — приложение проверит', 'Говори — застосунок перевірить', 'Habla y la app corrige', 'Fale e o app avalia', 'Nói và ứng dụng kiểm tra', 'Bicara, aplikasi menilai', 'Konuş, uygulama kontrol etsin', 'Mów, a aplikacja sprawdzi', 'Speak — the app checks you'),
  },
  {
    id: 'coach',
    sound: 'coach_heal',
    icon: 'bulb',
    durationMs: 1180,
    title: L8('Умный Тренер', 'Розумний Тренер', 'Entrenador inteligente', 'Treinador inteligente', 'Huấn luyện thông minh', 'Pelatih pintar', 'Akıllı Antrenör', 'Inteligentny Trener', 'Smart Coach'),
    sub: L8('Находит слабые места и чинит их', 'Знаходить слабкі місця й лагодить їх', 'Encuentra y corrige tus fallos', 'Encontra e corrige suas falhas', 'Tìm và sửa điểm yếu', 'Menemukan dan memperbaiki kelemahan', 'Zayıf noktaları bulur ve düzeltir', 'Znajduje i naprawia słabe punkty', 'Finds your weak spots and fixes them'),
  },
  {
    id: 'errors',
    sound: 'error_fix',
    icon: 'search',
    durationMs: 1180,
    title: L8('ИИ-разбор ошибок', 'AI-розбір помилок', 'Análisis de errores con IA', 'Análise de erros com IA', 'AI phân tích lỗi', 'Analisis error AI', 'AI hata analizi', 'Analiza błędów AI', 'AI error review'),
    sub: L8('Что не так и как сказать правильно', 'Що не так і як сказати правильно', 'Qué falla y cómo decirlo bien', 'O que falhou e como dizer certo', 'Sai ở đâu và nói sao cho đúng', 'Apa yang salah dan cara benarnya', 'Ne yanlış ve doğrusu nasıl', 'Co jest źle i jak powiedzieć dobrze', 'What is wrong and how to say it right'),
  },
  {
    id: 'plan',
    sound: 'plan_route',
    icon: 'list',
    durationMs: 1060,
    title: L8('Персональный план', 'Персональний план', 'Plan personal', 'Plano pessoal', 'Kế hoạch cá nhân', 'Rencana pribadi', 'Kişisel plan', 'Osobisty plan', 'Personal plan'),
    sub: L8('Уроки, фразы и повторы под тебя', 'Уроки, вислови й повтори під тебе', 'Lecciones y repasos a tu medida', 'Lições e revisões sob medida', 'Bài học và ôn tập riêng cho bạn', 'Pelajaran dan ulangan sesuai kamu', 'Sana göre dersler ve tekrarlar', 'Lekcje i powtórki pod ciebie', 'Lessons, phrases and reviews built for you'),
  },
  {
    id: 'stats',
    sound: 'stats_rise',
    icon: 'bar-chart',
    durationMs: 1040,
    title: L8('Детальная аналитика', 'Детальна аналітика', 'Analítica detallada', 'Análise detalhada', 'Phân tích chi tiết', 'Analitik terperinci', 'Ayrıntılı analiz', 'Szczegółowa analityka', 'Detailed analytics'),
    sub: L8('Прогресс, 365 дней и паттерны', 'Прогрес, 365 днів і патерни', 'Progreso, 365 días y patrones', 'Progresso, 365 dias e padrões', 'Tiến độ, 365 ngày và mẫu lỗi', 'Kemajuan, 365 hari, dan pola', 'İlerleme, 365 gün ve kalıplar', 'Postęp, 365 dni i wzorce', 'Progress, 365 days and patterns'),
  },
  {
    id: 'streak',
    sound: 'streak_shield',
    icon: 'shield-checkmark',
    durationMs: 1000,
    title: L8('Защита цепочки', 'Захист ланцюжка', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Lindungi rangkaian', 'Seri koruması', 'Ochrona serii', 'Streak protection'),
    sub: L8('3 заморозки серии каждый месяц', '3 заморозки серії щомісяця', '3 congelaciones de racha al mes', '3 congelamentos por mês', '3 lần đóng băng chuỗi mỗi tháng', '3 pembekuan rangkaian tiap bulan', 'Her ay 3 seri dondurma', '3 zamrożenia serii co miesiąc', '3 streak freezes every month'),
  },
  {
    id: 'aura',
    sound: 'aura_bloom',
    icon: 'sparkles',
    durationMs: 1030,
    title: L8('Plus-темы и аура', 'Plus-теми й аура', 'Temas y aura Plus', 'Temas e aura Plus', 'Chủ đề và hào quang Plus', 'Tema dan aura Plus', 'Plus temaları ve aura', 'Motywy i aura Plus', 'Plus themes and aura'),
    sub: L8('Профиль заметен в Plus-стиле', 'Профіль помітний у Plus-стилі', 'Tu perfil destaca con estilo Plus', 'Seu perfil ganha estilo Plus', 'Hồ sơ nổi bật phong cách Plus', 'Profil terlihat dengan gaya Plus', 'Profilin Plus stiliyle öne çıkar', 'Profil wyróżnia się stylem Plus', 'Your profile stands out in Plus style'),
  },
];

/** Показанные шесть сцен, в порядке прогона — сокращение из ALL_SCENES. */
export const CELEBRATION_SCENES: readonly CelebrationScene[] = (['energy', 'lessons', 'dialogs', 'voice', 'coach', 'streak'] as const)
  .map((id) => {
    const scene = ALL_SCENES.find((s) => s.id === id);
    if (!scene) throw new Error(`celebrationScenes: unknown scene id "${id}"`);
    return scene;
  });

export function scenesForVariant(variant: string): readonly CelebrationScene[] {
  void variant;
  return CELEBRATION_SCENES;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
