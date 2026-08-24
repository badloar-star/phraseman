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
  | 'aura'
  | 'max';

type L8Map = Record<string, string>;

/** Компактный хелпер: одна строка → все 8 локалей. */
function L8(ru: string, uk: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L8Map {
  return { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl };
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
 * Одиннадцать общих сцен (Plus / Pro / промокод) + двенадцатая только для MAX.
 * Порядок значим: он же в документе звуков и в громкостной «волне» (сцены
 * 1, 4 и 8 самые заметные — см. правило усталости уха).
 */
export const CELEBRATION_SCENES: readonly CelebrationScene[] = [
  {
    id: 'energy',
    sound: 'energy_break',
    icon: 'flash',
    durationMs: 1210,
    title: L8('Безлимитная энергия', 'Безлімітна енергія', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng vô hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Nielimitowana energia'),
    sub: L8('Учись сколько хочешь', 'Вчи скільки хочеш', 'Aprende sin parar', 'Aprenda sem parar', 'Học bao nhiêu tùy thích', 'Belajar sepuasnya', 'İstediğin kadar öğren', 'Ucz się bez końca'),
  },
  {
    id: 'lessons',
    sound: 'locks_off',
    icon: 'book',
    durationMs: 780,
    title: L8('Все уроки открыты', 'Усі уроки відкрито', 'Todas las lecciones abiertas', 'Todas as lições abertas', 'Mở mọi bài học', 'Semua pelajaran terbuka', 'Tüm dersler açık', 'Wszystkie lekcje otwarte'),
    sub: L8('Весь путь без закрытых дверей', 'Увесь шлях без зачинених дверей', 'Todo el camino sin bloqueos', 'Todo o caminho sem bloqueios', 'Cả lộ trình không bị khóa', 'Semua jalur tanpa terkunci', 'Tüm yol kilitsiz', 'Cała ścieżka bez blokad'),
  },
  {
    id: 'cards',
    sound: 'cards_stack',
    icon: 'albums',
    durationMs: 1100,
    title: L8('Безлимит карточек', 'Безліміт карток', 'Tarjetas ilimitadas', 'Cartões ilimitados', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kart', 'Nieograniczone karty'),
    sub: L8('Сохраняй сколько нужно', 'Зберігай скільки треба', 'Guarda cuanto necesites', 'Salve quantas precisar', 'Lưu bao nhiêu tùy ý', 'Simpan sebanyak perlu', 'İstediğin kadar kaydet', 'Zapisuj ile potrzebujesz'),
  },
  {
    id: 'dialogs',
    sound: 'dialog_spark',
    icon: 'chatbubbles',
    durationMs: 900,
    title: L8('AI-диалоги', 'AI-діалоги', 'Diálogos con IA', 'Diálogos com IA', 'Đối thoại AI', 'Dialog AI', 'AI diyalogları', 'Dialogi AI'),
    sub: L8('Собеседник не устанет и не осудит', 'Співрозмовник не втомиться й не осудить', 'Un interlocutor que nunca juzga', 'Um interlocutor que nunca julga', 'Người trò chuyện không phán xét', 'Lawan bicara tanpa menghakimi', 'Yargılamayan bir muhatap', 'Rozmówca, który nie oceni'),
  },
  {
    id: 'voice',
    sound: 'voice_score',
    icon: 'mic',
    durationMs: 1170,
    title: L8('Голос с оценкой фразы', 'Голос з оцінкою фрази', 'Voz con evaluación', 'Voz com avaliação', 'Giọng nói có chấm điểm', 'Suara dengan penilaian', 'Puanlı ses pratiği', 'Głos z oceną frazy'),
    sub: L8('Говори — приложение проверит', 'Говори — застосунок перевірить', 'Habla y la app corrige', 'Fale e o app avalia', 'Nói và ứng dụng kiểm tra', 'Bicara, aplikasi menilai', 'Konuş, uygulama kontrol etsin', 'Mów, a aplikacja sprawdzi'),
  },
  {
    id: 'coach',
    sound: 'coach_heal',
    icon: 'bulb',
    durationMs: 1180,
    title: L8('Умный Тренер', 'Розумний Тренер', 'Entrenador inteligente', 'Treinador inteligente', 'Huấn luyện thông minh', 'Pelatih pintar', 'Akıllı Antrenör', 'Inteligentny Trener'),
    sub: L8('Находит слабые места и чинит их', 'Знаходить слабкі місця й лагодить їх', 'Encuentra y corrige tus fallos', 'Encontra e corrige suas falhas', 'Tìm và sửa điểm yếu', 'Menemukan dan memperbaiki kelemahan', 'Zayıf noktaları bulur ve düzeltir', 'Znajduje i naprawia słabe punkty'),
  },
  {
    id: 'errors',
    sound: 'error_fix',
    icon: 'search',
    durationMs: 1180,
    title: L8('ИИ-разбор ошибок', 'AI-розбір помилок', 'Análisis de errores con IA', 'Análise de erros com IA', 'AI phân tích lỗi', 'Analisis error AI', 'AI hata analizi', 'Analiza błędów AI'),
    sub: L8('Что не так и как сказать правильно', 'Що не так і як сказати правильно', 'Qué falla y cómo decirlo bien', 'O que falhou e como dizer certo', 'Sai ở đâu và nói sao cho đúng', 'Apa yang salah dan cara benarnya', 'Ne yanlış ve doğrusu nasıl', 'Co jest źle i jak powiedzieć dobrze'),
  },
  {
    id: 'plan',
    sound: 'plan_route',
    icon: 'list',
    durationMs: 1060,
    title: L8('Персональный план', 'Персональний план', 'Plan personal', 'Plano pessoal', 'Kế hoạch cá nhân', 'Rencana pribadi', 'Kişisel plan', 'Osobisty plan'),
    sub: L8('Уроки, фразы и повторы под тебя', 'Уроки, фрази й повтори під тебе', 'Lecciones y repasos a tu medida', 'Lições e revisões sob medida', 'Bài học và ôn tập riêng cho bạn', 'Pelajaran dan ulangan sesuai kamu', 'Sana göre dersler ve tekrarlar', 'Lekcje i powtórki pod ciebie'),
  },
  {
    id: 'stats',
    sound: 'stats_rise',
    icon: 'bar-chart',
    durationMs: 1040,
    title: L8('Детальная аналитика', 'Детальна аналітика', 'Analítica detallada', 'Análise detalhada', 'Phân tích chi tiết', 'Analitik terperinci', 'Ayrıntılı analiz', 'Szczegółowa analityka'),
    sub: L8('Прогресс, 365 дней и паттерны', 'Прогрес, 365 днів і патерни', 'Progreso, 365 días y patrones', 'Progresso, 365 dias e padrões', 'Tiến độ, 365 ngày và mẫu lỗi', 'Kemajuan, 365 hari, dan pola', 'İlerleme, 365 gün ve kalıplar', 'Postęp, 365 dni i wzorce'),
  },
  {
    id: 'streak',
    sound: 'streak_shield',
    icon: 'shield-checkmark',
    durationMs: 1000,
    title: L8('Защита цепочки', 'Захист ланцюжка', 'Protección de racha', 'Proteção de sequência', 'Bảo vệ chuỗi', 'Lindungi rangkaian', 'Seri koruması', 'Ochrona serii'),
    sub: L8('3 заморозки серии каждый месяц', '3 заморозки серії щомісяця', '3 congelaciones de racha al mes', '3 congelamentos por mês', '3 lần đóng băng chuỗi mỗi tháng', '3 pembekuan rangkaian tiap bulan', 'Her ay 3 seri dondurma', '3 zamrożenia serii co miesiąc'),
  },
  {
    id: 'aura',
    sound: 'aura_bloom',
    icon: 'sparkles',
    durationMs: 1030,
    title: L8('Plus-темы и аура', 'Plus-теми й аура', 'Temas y aura Plus', 'Temas e aura Plus', 'Chủ đề và hào quang Plus', 'Tema dan aura Plus', 'Plus temaları ve aura', 'Motywy i aura Plus'),
    sub: L8('Профиль заметен в Plus-стиле', 'Профіль помітний у Plus-стилі', 'Tu perfil destaca con estilo Plus', 'Seu perfil ganha estilo Plus', 'Hồ sơ nổi bật phong cách Plus', 'Profil terlihat dengan gaya Plus', 'Profilin Plus stiliyle öne çıkar', 'Profil wyróżnia się stylem Plus'),
  },
];

/**
 * Двенадцатая сцена — ТОЛЬКО для тира MAX. Добавляется в хвост общих
 * одиннадцати, а не заменяет их: владелец потребовал, чтобы MAX показывал
 * полный прогон Plus плюс свою сцену, без счётчика «13 преимуществ».
 */
export const MAX_SCENE: CelebrationScene = {
  id: 'max',
  sound: 'max_awaken',
  icon: 'mic',
  durationMs: 2200,
  title: L8('Живой разговор голосом', 'Жива розмова голосом', 'Conversación en vivo', 'Conversa ao vivo', 'Trò chuyện trực tiếp', 'Percakapan langsung', 'Canlı sesli sohbet', 'Żywa rozmowa głosem'),
  sub: L8('Учитель слышит тебя и помнит прошлый урок', 'Учитель чує тебе й памʼятає минулий урок', 'Un profesor que te oye y recuerda', 'Um professor que te ouve e lembra', 'Giáo viên nghe bạn và nhớ bài trước', 'Guru mendengarmu dan mengingat', 'Seni duyan ve hatırlayan öğretmen', 'Nauczyciel słyszy cię i pamięta'),
};

/** Сцены прогона: у MAX те же одиннадцать плюс своя двенадцатая. */
export function scenesForVariant(variant: string): readonly CelebrationScene[] {
  return variant === 'max' ? [...CELEBRATION_SCENES, MAX_SCENE] : CELEBRATION_SCENES;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
