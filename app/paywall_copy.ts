import { MAIN_COURSE_PLUS_TITLE, MAIN_COURSE_PLUS_DESCRIPTION, MAIN_COURSE_PLUS_BENEFITS } from './main_course_plus_copy';
// ════════════════════════════════════════════════════════════════════════════
// paywall_copy.ts — контекстные копирайты пейвола (PremiumContext × 8 языков)
//
// Shared by the active A/B/C paywalls. The legacy premium_modal route is only a dispatcher.
// читали ОДИН источник правды: заголовки, сабтайтлы, бенефиты и герой-акценты
// по PremiumContext. При добавлении контекста — обновить ВСЕ карты ниже.
//
// ru/uk/es живут в основных полях; pt-BR/vi/id/tr/pl — в *_PLANNED структурах
// Planned locales live in the *_PLANNED structures. makeLP builds a full triLang dictionary.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../constants/i18n';
import { PREMIUM_CONTEXT_SET, type PremiumContext } from './premium_context';
import { REVENUE_DAILY_LIMITS } from './revenue_daily_limits';

// зачем (владелец, 2026-09-13): дневные лимиты обычного аккаунта настоящие —
// пейвол обязан говорить «лимит на сегодня исчерпан», а не «только в Plus».
// Числа берутся из одного источника, чтобы текст не разошёлся с гейтом.
const DAILY_TRAINING = REVENUE_DAILY_LIMITS.flashcard_training_starts;
const DAILY_SPEAKING = REVENUE_DAILY_LIMITS.speaking_attempts;
const DAILY_DIALOG = REVENUE_DAILY_LIMITS.ai_dialog_replies;

export type PremiumPlannedCopy = {
  en?: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};
export type PremiumPlannedHeroCopy = {
  title: PremiumPlannedCopy;
  subtitle: PremiumPlannedCopy;
};

export type PremiumHeroArt = {
  accent: string;
  accent2: string;
  shardAmount: number;
};

export const PREMIUM_HERO_ART: Record<PremiumContext, PremiumHeroArt> = {
  no_energy: { accent: '#FFE86A', accent2: '#64B4FF', shardAmount: 80 },
  // Preserve the existing generic hero treatment: Revenue VNext changes only
  // the context and copy, not the visual design of either paywall surface.
  onboarding_plan: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 0 },
  season_pass_lane: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 0 },
  course_after_lesson3: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  lesson_b1: { accent: '#38BDF8', accent2: '#FACC15', shardAmount: 180 },
  flashcard_limit: { accent: '#8BD3FF', accent2: '#FDE68A', shardAmount: 80 },
  flashcard_training: { accent: '#8BD3FF', accent2: '#A78BFA', shardAmount: 180 },
  flashcard_create: { accent: '#8BD3FF', accent2: '#86EFAC', shardAmount: 180 },
  pack_create: { accent: '#A78BFA', accent2: '#8BD3FF', shardAmount: 180 },
  streak: { accent: '#FFB020', accent2: '#FF5C5C', shardAmount: 180 },
  theme: { accent: '#F0ABFC', accent2: '#67E8F9', shardAmount: 180 },
  club: { accent: '#FACC15', accent2: '#22C55E', shardAmount: 420 },
  dialog_limit: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
  dialog_locked_level: { accent: '#58D6FF', accent2: '#FACC15', shardAmount: 180 },
  dialog_analysis: { accent: '#5EEAD4', accent2: '#F87171', shardAmount: 180 },
  ai_voice_input: { accent: '#67E8F9', accent2: '#A78BFA', shardAmount: 180 },
  mastery: { accent: '#86EFAC', accent2: '#FDE68A', shardAmount: 420 },
  stats: { accent: '#60A5FA', accent2: '#FDE68A', shardAmount: 180 },
  heatmap: { accent: '#34D399', accent2: '#A3E635', shardAmount: 180 },
  patterns: { accent: '#F87171', accent2: '#C084FC', shardAmount: 180 },
  percentiles: { accent: '#FACC15', accent2: '#38BDF8', shardAmount: 420 },
  intro_ended: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  level_up: { accent: '#FACC15', accent2: '#A78BFA', shardAmount: 180 },
  speaking: { accent: '#5EEAD4', accent2: '#A78BFA', shardAmount: 180 },
  mistake_practice: { accent: '#FF7A8A', accent2: '#5EEAD4', shardAmount: 180 },
  premium_expired: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  vip_expired: { accent: '#FACC15', accent2: '#F0ABFC', shardAmount: 420 },
  notification_upsell: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 180 },
  language_add: { accent: '#66A8FF', accent2: '#5EEAD4', shardAmount: 180 },
  ai_explain: { accent: '#FDE68A', accent2: '#A78BFA', shardAmount: 180 },
  weekly_review: { accent: '#72E6A9', accent2: '#FDE68A', shardAmount: 180 },
  avatar_aura: { accent: '#E879F9', accent2: '#38BDF8', shardAmount: 180 },
  free_lessons_complete: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  winback: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  referral_ended: { accent: '#FACC15', accent2: '#F0ABFC', shardAmount: 420 },
  // Арена: холодный кобальт + рунный фиолет — тон самого раздела, а не
  // «тревожный» красный: человек упёрся в правило, а не совершил ошибку.
  arena_limit: { accent: '#7DD3FC', accent2: '#C4B5FD', shardAmount: 180 },
  generic: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 0 },
};

export type PaywallCopy = {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  subtitleRu: string;
  subtitleUk: string;
  subtitleEs: string;
};

// Owner 2026-09-08: the main course is free; these legacy contexts now
// explain the additional Plus features without selling main-lesson access.
const COURSE_AFTER_LESSON3_COPY: PaywallCopy = {
  titleRu: MAIN_COURSE_PLUS_TITLE.ru,
  titleUk: MAIN_COURSE_PLUS_TITLE.uk,
  titleEs: MAIN_COURSE_PLUS_TITLE.es,
  subtitleRu: MAIN_COURSE_PLUS_DESCRIPTION.ru,
  subtitleUk: MAIN_COURSE_PLUS_DESCRIPTION.uk,
  subtitleEs: MAIN_COURSE_PLUS_DESCRIPTION.es,
};
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: MAIN_COURSE_PLUS_TITLE,
  subtitle: MAIN_COURSE_PLUS_DESCRIPTION,
};

const LESSON_B1_COPY: PaywallCopy = COURSE_AFTER_LESSON3_COPY;

const LESSON_B1_PLANNED_COPY: PremiumPlannedHeroCopy = COURSE_AFTER_LESSON3_PLANNED_COPY;

const SEASON_PASS_LANE_BENEFITS: Record<Lang, string>[] = [
  { ru: 'Премиум-награды текущего сезона', uk: 'Преміум-нагороди поточного сезону', en: 'Premium rewards for the current season', es: 'Recompensas premium de la temporada actual', 'pt-BR': 'Recompensas premium da temporada atual', vi: 'Phần thưởng cao cấp của mùa hiện tại', id: 'Hadiah premium untuk musim ini', tr: 'Mevcut sezonun premium ödülleri', pl: 'Nagrody premium w bieżącym sezonie' },
  { ru: 'Безлимитная энергия', uk: 'Безлімітна енергія', en: 'Unlimited energy', es: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nielimitowana energia' },
  { ru: 'Разговорная практика и подробная статистика', uk: 'Розмовна практика й докладна статистика', en: 'Speaking practice and detailed statistics', es: 'Práctica oral y estadísticas detalladas', 'pt-BR': 'Prática de fala e estatísticas detalhadas', vi: 'Luyện nói và thống kê chi tiết', id: 'Latihan bicara dan statistik terperinci', tr: 'Konuşma pratiği ve ayrıntılı istatistikler', pl: 'Ćwiczenie mówienia i szczegółowe statystyki' },
];

export function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 'generic';
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'ai_dialog') return 'dialog_limit';
  // avatar_aura раньше мапился в theme — теперь самостоятельный контекст со своей копией.
  return PREMIUM_CONTEXT_SET.has(value as PremiumContext) ? (value as PremiumContext) : 'generic';
}

/**
 * Контекст с учётом source. Аудит «пейволы-объясняют» (2026-07-25):
 * зачем: winback-триггер в _layout шлёт context:'streak' — вернувшийся после 7+ дней
 * видел «Не теряй серию, которую уже построил», хотя серия у него уже сгорела.
 * Маппим по source на честный контекст «С возвращением», не трогая сам триггер.
 */
export function resolvePaywallContext(
  rawContext: string | string[] | undefined,
  rawSource: string | string[] | undefined,
): PremiumContext {
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource;
  if (source === 'winback') return 'winback';
  if (source === 'referral_ended') return 'referral_ended';
  return normalizePremiumContext(rawContext);
}

export const PAYWALL_COPY: Partial<Record<PremiumContext, PaywallCopy>> & { generic: PaywallCopy } = {
  onboarding_plan: {
    titleRu: 'Учись без пауз с Plus',
    titleUk: 'Навчайся без пауз із Plus',
    titleEs: 'Aprende sin pausas con Plus',
    subtitleRu: 'Безлимитная энергия, больше разговорной практики, тренировок и подробной статистики.',
    subtitleUk: 'Безлімітна енергія, більше розмовної практики, тренувань і докладної статистики.',
    subtitleEs: 'Energía ilimitada, más práctica oral, entrenamientos y estadísticas detalladas.',
  },
  season_pass_lane: {
    titleRu: 'Открой премиум-награды сезона',
    titleUk: 'Відкрий преміум-нагороди сезону',
    titleEs: 'Desbloquea las recompensas premium de la temporada',
    subtitleRu: 'Plus открывает премиум-дорожку сезона вместе со всеми учебными преимуществами.',
    subtitleUk: 'Plus відкриває преміум-доріжку сезону разом з усіма навчальними перевагами.',
    subtitleEs: 'Plus abre la ruta premium de la temporada junto con todas las ventajas de aprendizaje.',
  },
  language_add: {
    titleRu: 'Добавь второй язык к изучению',
    titleUk: 'Додай другу мову до вивчення',
    titleEs: 'Añade un segundo idioma',
    subtitleRu: 'Бесплатный аккаунт — один язык. С Plus учи несколько языков сразу: у каждого свой план, свой прогресс и свои достижения, ничего не смешивается.',
    subtitleUk: 'Безкоштовний акаунт — одна мова. З Plus вивчай кілька мов одразу: у кожної свій план, свій прогрес і свої досягнення, нічого не змішується.',
    subtitleEs: 'La cuenta gratis incluye un idioma. Con Plus aprende varios a la vez: cada idioma tiene su propio plan, progreso y logros.',
  },
  no_energy: {
    // зачем: заголовок фиксирует момент («энергия кончилась»), а не абстрактную пользу.
    titleRu: 'Энергия кончилась. С Plus она не кончается',
    titleUk: 'Енергія скінчилась. З Plus вона не закінчується',
    titleEs: 'Sin energía. Con Plus no se acaba',
    subtitleRu: 'Уроки, тренажёр и экзамен — без таймера ожидания. Ритм только твой.',
    subtitleUk: 'Уроки, тренажер та іспит — без таймера очікування. Ритм лише твій.',
    subtitleEs: 'Lecciones, entrenador y examen sin temporizador de espera. El ritmo es tuyo.',
  },
  streak: {
    titleRu: 'Не теряй серию, которую уже построил',
    titleUk: 'Не втрачай серію, яку вже побудував',
    titleEs: 'No pierdas la racha que ya llevas',
    subtitleRu: 'Plus защищает твой ритм: учись без пауз и не откатывайся из-за одного пропуска.',
    subtitleUk: 'Plus захищає твій ритм: навчайся без пауз і не відкатуйся через один пропуск.',
    subtitleEs: 'Plus protege tu ritmo: estudia sin pausas y no retrocedas por un solo día sin practicar.',
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_COPY,
  lesson_b1: LESSON_B1_COPY,
  flashcard_limit: {
    // зачем: момент — юзер только что заполнил бесплатные 20 слотов; хвалим выбор, потом снимаем потолок.
    titleRu: '20 из 20 — база собрана',
    titleUk: '20 із 20 — база зібрана',
    titleEs: '20 de 20: colección completa',
    subtitleRu: 'Ты сохранил всё, что помещалось. Plus снимает потолок: сохраняй каждую нужную фразу.',
    subtitleUk: 'Ти зберіг усе, що вміщалося. Plus знімає стелю: зберігай кожну потрібну фразу.',
    subtitleEs: 'Guardaste todo lo que cabía. Plus quita el techo: guarda cada frase que necesites.',
  },
  theme: {
    // зачем: старый субтайтл говорил языком продуктовых метрик («вовлеченность»),
    // а не языком юзера — заменён на человеческую пользу.
    titleRu: 'Сделай Phraseman своим',
    titleUk: 'Зроби Phraseman своїм',
    titleEs: 'Haz que Phraseman sea tuyo',
    subtitleRu: 'Темы оформления входят в Plus. Выбери настроение, в котором приятно заниматься каждый день.',
    subtitleUk: 'Теми оформлення входять у Plus. Обери настрій, у якому приємно займатися щодня.',
    subtitleEs: 'Los temas visuales van con Plus. Elige el ambiente en el que da gusto estudiar a diario.',
  },
  club: {
    titleRu: 'Усиль прогресс через клубы и бонусы',
    titleUk: 'Підсиль прогрес через клуби та бонуси',
    titleEs: 'Impulsa tu progreso con clubes y bonus',
    subtitleRu: 'Соревнуйся, набирай больше XP и не выпадай из ритма.',
    subtitleUk: 'Змагайся, набирай більше XP і не випадай з ритму.',
    subtitleEs: 'Compite, suma más XP y no pierdas el ritmo.',
  },
  dialog_limit: {
    titleRu: 'Дневной лимит диалогов исчерпан',
    titleUk: 'Денний ліміт діалогів вичерпано',
    titleEs: 'Límite diario de diálogos agotado',
    subtitleRu: `На обычном аккаунте — ${DAILY_DIALOG} реплик в день. Plus снимает дневной лимит и открывает все сценарии: отвечай своими словами и получай подсказки по ходу разговора.`,
    subtitleUk: `На звичайному акаунті — ${DAILY_DIALOG} реплік на день. Plus знімає денний ліміт і відкриває всі сценарії: відповідай своїми словами та отримуй підказки під час розмови.`,
    subtitleEs: `En la cuenta normal tienes ${DAILY_DIALOG} respuestas al día. Plus quita el límite diario y abre todos los escenarios: responde con tus palabras y recibe ayuda durante la conversación.`,
  },
  mistake_practice: {
    titleRu: 'Исправляй свои ошибки в Plus',
    titleUk: 'Виправляй свої помилки в Plus',
    titleEs: 'Corrige tus errores con Plus',
    subtitleRu: 'Plus собирает ошибки из уроков и карточек в одну короткую сессию: слова и фразы, разные режимы и голосовая отработка.',
    subtitleUk: 'Plus збирає помилки з уроків і карток в одну коротку сесію: слова й фрази, різні режими та голосове відпрацювання.',
    subtitleEs: 'Plus reúne los errores de lecciones y tarjetas en una sesión corta: palabras, frases, varios modos y práctica de voz.',
  },
  mastery: {
    // ВНИМАНИЕ (аудит #22): этот контекст пейвола НЕДОСТИЖИМ — гейт mastery не триггерится
    // (повтор урока бесплатный для всех, см. mastery.ts). Тексты ниже НИКОМУ не показываются.
    // НЕ подключай context:'mastery' к навигации, не вернув реальный премиум-замок на повтор —
    // иначе будешь обещать платным то, что бесплатно. Решение: mastery остаётся бесплатным.
    // Библия: «урок»→«раунд», убрана «цена», ≤10 слов, gain-framing.
    titleRu: 'Повторяй раунды без ограничений',
    titleUk: 'Повторюй раунди без обмежень',
    titleEs: 'Repite rondas sin límites',
    subtitleRu: 'Plus открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания жемчужин.',
    subtitleUk: 'Plus відкриває повтор будь-якого пройденого раунду. Закріплюй складні фрази без списання перлин.',
    subtitleEs: 'Plus abre el repaso de cualquier ronda completada. Refuerza las frases difíciles sin gastar perlas.',
  },
  stats: {
    titleRu: 'Аналитика прогресса — для Plus',
    titleUk: 'Аналітика прогресу — для Plus',
    titleEs: 'Analítica del progreso — Plus',
    subtitleRu: 'Карта активности за год, точки роста, сравнение с другими учениками. Видишь чёткую картину своего движения.',
    subtitleUk: 'Карта активності за рік, точки росту, порівняння з іншими учнями. Бачиш чітку картину свого руху.',
    subtitleEs: 'Mapa anual de actividad, puntos de crecimiento y comparación. Ves tu avance con total claridad.',
  },
  heatmap: {
    titleRu: 'Карта активности — для Plus',
    titleUk: 'Карта активності — для Plus',
    titleEs: 'Mapa de actividad — Plus',
    subtitleRu: '365 дней занятий на одном экране — увидишь свои сильные и слабые периоды.',
    subtitleUk: '365 днів занять на одному екрані — побач свої сильні й слабкі періоди.',
    subtitleEs: '365 días de estudio en una sola vista: encuentra tus mejores y peores semanas.',
  },
  patterns: {
    titleRu: 'Твои точки роста',
    titleUk: 'Твої точки росту',
    titleEs: 'Tus puntos de crecimiento',
    subtitleRu: 'Узнай, какие темы и фразы проседают чаще всего — и тренируй именно их.',
    subtitleUk: 'Дізнайся, які теми й фрази просідають найчастіше — і тренуй саме їх.',
    subtitleEs: 'Descubre los temas y frases que más flojean y entrena justo lo que importa.',
  },
  percentiles: {
    titleRu: 'Сравнение с другими — для Plus',
    titleUk: 'Порівняння з іншими — для Plus',
    titleEs: 'Comparación con otros — Plus',
    subtitleRu: 'Увидишь, где ты в топе среди всех учеников. Без дизморали — только то, в чём ты крут.',
    subtitleUk: 'Бач куди ти в топі серед усіх учнів. Без дизморалі — лише те, в чому ти крутий.',
    subtitleEs: 'Mira dónde destacas frente a otros estudiantes. Solo lo positivo, sin desmotivar.',
  },
  generic: {
    titleRu: 'Учись быстрее с Plus',
    titleUk: 'Навчайся швидше з Plus',
    titleEs: 'Aprende más rápido con Plus',
    subtitleRu: 'Больше практики без стоп-экранов: диалоги, тренировки и уроки открыты, когда есть силы учиться.',
    subtitleUk: 'Більше практики без стоп-екранів: діалоги, тренування й уроки відкриті, коли є сили вчитися.',
    subtitleEs: 'Más práctica sin pantallas de bloqueo: diálogos, entrenamiento y lecciones cuando tengas energía.',
  },
};

PAYWALL_COPY.intro_ended = {
  // Библия: gain-framing (не loss — стрика 7+ тут нет), ≤10 слов/предложение, «ты».
  titleRu: 'Продолжай в полном доступе',
  titleUk: 'Продовжуй у повному доступі',
  titleEs: 'Sigue con acceso completo',
  subtitleRu: 'Ты уже почувствовал полный доступ. Plus открывает его без пауз и блокировок.',
  subtitleUk: 'Ти вже відчув повний доступ. Plus відкриває його без пауз і блокувань.',
  subtitleEs: 'Ya probaste el acceso completo. Plus lo abre sin pausas ni bloqueos.',
};

// План #3: after-win апсейл при повышении уровня.
// зачем: жалоба юзера — «Ты растёшь быстро» не объясняла, при чём тут покупка.
// Основные уроки уже бесплатны; повышение уровня не создаёт платный замок.
PAYWALL_COPY.level_up = COURSE_AFTER_LESSON3_COPY;

// Speaking mode — произнести фразу вслух (микрофон + распознавание).
PAYWALL_COPY.speaking = {
  titleRu: 'Дневной лимит голосовой практики исчерпан',
  titleUk: 'Денний ліміт голосової практики вичерпано',
  titleEs: 'Límite diario de práctica oral agotado',
  subtitleRu: `На обычном аккаунте — ${DAILY_SPEAKING} голосовые попытки в день. Plus снимает дневной лимит: произноси фразы вслух сколько хочешь, а приложение слушает и подсказывает.`,
  subtitleUk: `На звичайному акаунті — ${DAILY_SPEAKING} голосові спроби на день. Plus знімає денний ліміт: вимовляй фрази вголос скільки хочеш, а застосунок слухає й підказує.`,
  subtitleEs: `En la cuenta normal tienes ${DAILY_SPEAKING} intentos de voz al día. Plus quita el límite diario: di las frases en voz alta cuantas veces quieras y la app te escucha y te guía.`,
};

PAYWALL_COPY.ai_voice_input = {
  titleRu: 'Дневной лимит голосового ввода исчерпан',
  titleUk: 'Денний ліміт голосового введення вичерпано',
  titleEs: 'Límite diario de entrada por voz agotado',
  subtitleRu: `Голосовой ввод в диалоге считается голосовой попыткой: на обычном аккаунте их ${DAILY_SPEAKING} в день. Plus снимает дневной лимит — говори любую реплику вслух, а Phraseman превратит её в текст.`,
  subtitleUk: `Голосове введення в діалозі рахується як голосова спроба: на звичайному акаунті їх ${DAILY_SPEAKING} на день. Plus знімає денний ліміт — промовляй будь-яку репліку вголос, а Phraseman перетворить її на текст.`,
  subtitleEs: `La entrada por voz en el diálogo cuenta como intento de voz: en la cuenta normal tienes ${DAILY_SPEAKING} al día. Plus quita el límite diario: di cualquier respuesta en voz alta y Phraseman la convierte en texto.`,
};

PAYWALL_COPY.dialog_analysis = {
  titleRu: 'Разбор диалога — в Plus',
  titleUk: 'Розбір діалогу — в Plus',
  titleEs: 'Análisis del diálogo en Plus',
  subtitleRu: 'После разговора Plus показывает, где фраза звучала неестественно, как её поправить и какой вариант сказать живее в следующий раз.',
  subtitleUk: 'Після розмови Plus показує, де фраза звучала неприродно, як її виправити й який варіант сказати живіше наступного разу.',
  subtitleEs: 'Después de la conversación, Plus muestra qué sonó poco natural, cómo corregirlo y una forma más viva de decirlo la próxima vez.',
};

// зачем (владелец 2026-09-13): dialog_limit стал «дневным лимитом», а этот
// контекст — про диалоги уровней выше текущего. Заголовок называет причину
// точно, чтобы два экрана не читались как один и тот же.
PAYWALL_COPY.dialog_locked_level = {
  titleRu: 'Диалоги уровней выше — в Plus',
  titleUk: 'Діалоги вищих рівнів — у Plus',
  titleEs: 'Diálogos de niveles superiores, en Plus',
  subtitleRu: 'Все сценарии диалогов входят в Plus. Практикуй ситуации из уроков и жизни, отвечай своими словами и получай подсказки по ходу разговора.',
  subtitleUk: 'Усі сценарії діалогів входять у Plus. Практикуй ситуації з уроків і життя, відповідай своїми словами та отримуй підказки під час розмови.',
  subtitleEs: 'Todos los escenarios de diálogo están incluidos en Plus. Practica situaciones de las lecciones y de la vida real, responde con tus propias palabras y recibe ayuda durante la conversación.',
};

PAYWALL_COPY.flashcard_training = {
  titleRu: 'Дневной лимит тренировок исчерпан',
  titleUk: 'Денний ліміт тренувань вичерпано',
  titleEs: 'Límite diario de entrenamientos agotado',
  subtitleRu: `На обычном аккаунте — ${DAILY_TRAINING} тренировки карточек в день на все режимы. Plus снимает дневной лимит: вспоминай фразы активнее и закрепляй слабые слова без пауз.`,
  subtitleUk: `На звичайному акаунті — ${DAILY_TRAINING} тренування карток на день на всі режими. Plus знімає денний ліміт: згадуй фрази активніше й закріплюй слабкі слова без пауз.`,
  subtitleEs: `En la cuenta normal tienes ${DAILY_TRAINING} entrenamientos de tarjetas al día en todos los modos. Plus quita el límite diario: recuerda frases de forma activa y refuerza palabras débiles sin pausas.`,
};

PAYWALL_COPY.ai_explain = {
  titleRu: 'ИИ-разборы ошибок без лимита',
  titleUk: 'ШІ-розбори помилок без ліміту',
  titleEs: 'Explicaciones de IA sin límite',
  subtitleRu: 'Бесплатно доступно несколько разборов в день. Plus снимает лимит: ИИ объясняет каждую ошибку — что не так, почему и как сказать правильно.',
  subtitleUk: 'Безкоштовно доступно кілька розборів на день. Plus знімає ліміт: ШІ пояснює кожну помилку — що не так, чому і як сказати правильно.',
  subtitleEs: 'La versión gratis incluye unas pocas explicaciones al día. Plus quita el límite: la IA explica cada error — qué falló, por qué y cómo decirlo bien.',
};

PAYWALL_COPY.weekly_review = {
  titleRu: 'Полный недельный обзор прогресса',
  titleUk: 'Повний тижневий огляд прогресу',
  titleEs: 'Tu repaso semanal completo',
  subtitleRu: 'Каждую неделю — личный разбор: что укрепилось, где проседает и точный план на следующую. С Plus обзор открывается целиком — с подсказками и рекомендациями уроков.',
  subtitleUk: 'Щотижня — особистий розбір: що зміцнилося, де просідає і точний план на наступний. З Plus огляд відкривається повністю — з підказками та рекомендаціями уроків.',
  subtitleEs: 'Cada semana, un análisis personal: qué mejoró, qué flojea y un plan claro para la próxima. Con Plus el repaso se abre entero, con consejos y lecciones recomendadas.',
};

PAYWALL_COPY.avatar_aura = {
  titleRu: 'Выделись аурой вокруг аватара',
  titleUk: 'Виділися аурою навколо аватара',
  titleEs: 'Destaca con un aura en tu avatar',
  subtitleRu: 'Премиум-аура подсвечивает твой аватар в лигах и у друзей. Тебя видно сразу — в списках и чатах.',
  subtitleUk: 'Преміум-аура підсвічує твій аватар у лігах та в друзів. Тебе видно одразу — у списках і чатах.',
  subtitleEs: 'El aura premium ilumina tu avatar en ligas y entre amigos. Se te ve al instante en listas y chats.',
};

export const PAYWALL_PLANNED_COPY: Partial<Record<PremiumContext, PremiumPlannedHeroCopy>> & { generic: PremiumPlannedHeroCopy } = {
  onboarding_plan: {
    title: {
      en: 'Learn without pauses with Plus',
      'pt-BR': 'Aprenda sem pausas com o Plus',
      vi: 'Học không gián đoạn với Plus',
      id: 'Belajar tanpa jeda dengan Plus',
      tr: 'Plus ile ara vermeden öğren',
      pl: 'Ucz się bez przerw z Plus',
    },
    subtitle: {
      en: 'Unlimited energy, more speaking practice, training, and detailed progress insights.',
      'pt-BR': 'Energia ilimitada, mais prática de fala, treinos e estatísticas detalhadas.',
      vi: 'Năng lượng không giới hạn, thêm luyện nói, luyện tập và thống kê chi tiết.',
      id: 'Energi tanpa batas, lebih banyak latihan bicara, latihan kartu, dan statistik terperinci.',
      tr: 'Sınırsız enerji, daha fazla konuşma pratiği, alıştırma ve ayrıntılı istatistik.',
      pl: 'Nielimitowana energia, więcej mówienia, treningów i szczegółowych statystyk.',
    },
  },
  season_pass_lane: {
    title: {
      en: 'Unlock premium season rewards',
      'pt-BR': 'Libere as recompensas premium da temporada',
      vi: 'Mở phần thưởng cao cấp của mùa',
      id: 'Buka hadiah premium musim ini',
      tr: 'Sezonun premium ödüllerini aç',
      pl: 'Odblokuj nagrody premium sezonu',
    },
    subtitle: {
      en: 'Plus unlocks the premium season track together with every learning benefit.',
      'pt-BR': 'O Plus libera a trilha premium da temporada junto com todos os benefícios de aprendizagem.',
      vi: 'Plus mở nhánh phần thưởng cao cấp của mùa cùng mọi lợi ích học tập.',
      id: 'Plus membuka jalur premium musim ini bersama semua manfaat belajar.',
      tr: 'Plus, sezonun premium yolunu tüm öğrenme avantajlarıyla birlikte açar.',
      pl: 'Plus otwiera ścieżkę premium sezonu wraz ze wszystkimi korzyściami do nauki.',
    },
  },
  language_add: {
    title: { 'pt-BR': 'Adicione um segundo idioma', vi: 'Thêm ngôn ngữ thứ hai', id: 'Tambahkan bahasa kedua', tr: 'İkinci bir dil ekle', pl: 'Dodaj drugi język' },
    subtitle: {
      'pt-BR': 'A conta grátis inclui um idioma. Com Plus, aprenda vários ao mesmo tempo: cada idioma tem seu próprio plano, progresso e conquistas.',
      vi: 'Tài khoản miễn phí gồm một ngôn ngữ. Với Plus, học nhiều ngôn ngữ cùng lúc: mỗi ngôn ngữ có kế hoạch, tiến độ và thành tích riêng.',
      id: 'Akun gratis mencakup satu bahasa. Dengan Plus, pelajari beberapa sekaligus: tiap bahasa punya rencana, progres, dan pencapaian sendiri.',
      tr: 'Ücretsiz hesap bir dil içerir. Plus ile aynı anda birden çok dil öğren: her dilin kendi planı, ilerlemesi ve başarıları vardır.',
      pl: 'Darmowe konto obejmuje jeden język. Z Plus ucz się kilku naraz: każdy język ma własny plan, postęp i osiągnięcia.',
    },
  },
  no_energy: {
    title: { 'pt-BR': 'A energia acabou. Com Plus ela não acaba', vi: 'Hết năng lượng. Với Plus thì không bao giờ hết', id: 'Energi habis. Dengan Plus tidak akan habis', tr: 'Enerji bitti. Plus ile hiç bitmez', pl: 'Energia się skończyła. Z Plus się nie kończy' },
    subtitle: {
      'pt-BR': 'Lições, treino e exame sem temporizador de espera. O ritmo é seu.',
      vi: 'Bài học, luyện tập và bài kiểm tra không cần chờ. Nhịp độ là của bạn.',
      id: 'Pelajaran, latihan, dan ujian tanpa timer tunggu. Ritme milikmu.',
      tr: 'Dersler, antrenman ve sınav bekleme sayacı olmadan. Ritim senin.',
      pl: 'Lekcje, trener i egzamin bez timera oczekiwania. Rytm należy do ciebie.',
    },
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_PLANNED_COPY,
  lesson_b1: LESSON_B1_PLANNED_COPY,
  flashcard_limit: {
    title: { 'pt-BR': '20 de 20: coleção completa', vi: '20/20 — kho thẻ đã đầy', id: '20 dari 20: koleksi penuh', tr: '20/20 — arşiv doldu', pl: '20 z 20 — baza pełna' },
    subtitle: {
      'pt-BR': 'Você salvou tudo o que cabia. O Plus tira o teto: salve cada frase que precisar.',
      vi: 'Bạn đã lưu hết chỗ trống. Plus bỏ trần: lưu mọi cụm từ bạn cần.',
      id: 'Kamu menyimpan semua yang muat. Plus menghapus batas: simpan tiap frasa yang perlu.',
      tr: 'Sığan her şeyi kaydettin. Plus tavanı kaldırır: gereken her ifadeyi kaydet.',
      pl: 'Zapisałeś wszystko, co się mieściło. Plus zdejmuje sufit: zapisuj każdą potrzebną frazę.',
    },
  },
  streak: {
    title: { 'pt-BR': 'Não perca a sequência que você construiu', vi: 'Đừng mất chuỗi bạn đã xây dựng', id: 'Jangan kehilangan streak yang sudah kamu bangun', tr: 'Kurduğun seriyi kaybetme', pl: 'Nie trać serii, którą już zbudowałeś' },
    subtitle: {
      'pt-BR': 'Plus protege seu ritmo: estude sem pausas e não volte atrás por um dia perdido.',
      vi: 'Plus bảo vệ nhịp học: học không gián đoạn và không bị tụt lại vì một ngày bỏ lỡ.',
      id: 'Plus melindungi ritmemu: belajar tanpa jeda dan tidak mundur akibat satu hari terlewat.',
      tr: 'Plus ritmini korur: ara vermeden çalış ve tek bir kaçırılan gün yüzünden geri düşme.',
      pl: 'Plus chroni twój rytm: ucz się bez przerw i nie cofaj się przez jeden opuszczony dzień.',
    },
  },
  theme: {
    title: { 'pt-BR': 'Faça o Phraseman ser seu', vi: 'Biến Phraseman thành của bạn', id: 'Jadikan Phraseman milikmu', tr: 'Phraseman’ı kendine göre yap', pl: 'Uczyń Phraseman swoim' },
    subtitle: {
      'pt-BR': 'Os temas visuais fazem parte do Plus. Escolha o clima em que dá gosto estudar todo dia.',
      vi: 'Chủ đề giao diện thuộc về Plus. Chọn không khí khiến bạn thích học mỗi ngày.',
      id: 'Tema tampilan termasuk Plus. Pilih suasana yang bikin betah belajar tiap hari.',
      tr: 'Görünüm temaları Plus’a dahil. Her gün çalışmayı keyifli kılan havayı seç.',
      pl: 'Motywy wyglądu należą do Plus. Wybierz nastrój, w którym miło uczyć się codziennie.',
    },
  },
  club: {
    title: { 'pt-BR': 'Acelere o progresso com clubes e bônus', vi: 'Tăng tiến bộ bằng câu lạc bộ và bonus', id: 'Perkuat progres lewat klub dan bonus', tr: 'Kulüpler ve bonuslarla ilerlemeyi güçlendir', pl: 'Wzmocnij postęp przez kluby i bonusy' },
    subtitle: {
      'pt-BR': 'Compita, ganhe mais XP e não saia do ritmo.',
      vi: 'Thi đấu, nhận thêm XP và giữ nhịp học.',
      id: 'Bersaing, dapatkan lebih banyak XP, dan tetap dalam ritme.',
      tr: 'Yarış, daha fazla XP kazan ve ritmini kaybetme.',
      pl: 'Rywalizuj, zdobywaj więcej XP i trzymaj rytm.',
    },
  },
  mistake_practice: {
    title: { 'pt-BR': 'Corrija seus erros com o Plus', vi: 'Sửa lỗi của bạn với Plus', id: 'Perbaiki kesalahanmu dengan Plus', tr: 'Hatalarını Plus ile düzelt', pl: 'Poprawiaj swoje błędy z Plus' },
    subtitle: {
      'pt-BR': 'O Plus reúne erros de lições e cartões em uma sessão curta com palavras, frases, modos variados e voz.',
      vi: 'Plus gom lỗi từ bài học và thẻ vào một phiên ngắn với từ, câu, nhiều chế độ và giọng nói.',
      id: 'Plus mengumpulkan kesalahan dari pelajaran dan kartu ke sesi singkat dengan kata, frasa, berbagai mode, dan suara.',
      tr: 'Plus ders ve kart hatalarını kelime, ifade, farklı modlar ve ses içeren kısa bir seansta toplar.',
      pl: 'Plus zbiera błędy z lekcji i fiszek w krótką sesję ze słowami, frazami, różnymi trybami i głosem.',
    },
  },
  mastery: {
    title: { 'pt-BR': 'Repita lições sem limites', vi: 'Ôn lại bài học không giới hạn', id: 'Ulang pelajaran tanpa batas', tr: 'Dersleri sınırsız tekrar et', pl: 'Powtarzaj lekcje bez ograniczeń' },
    subtitle: {
      'pt-BR': 'Com Plus, qualquer lição concluída fica aberta para repetir sem gastar pérolas, mesmo quando o preço subiria a cada repetição.',
      vi: 'Với Plus, mọi bài đã hoàn thành đều có thể ôn lại mà không tốn ngọc trai, kể cả khi giá tăng sau mỗi lần học lại.',
      id: 'Dengan Plus, semua pelajaran selesai bisa diulang tanpa memakai mutiara, bahkan saat harga naik di tiap pengulangan.',
      tr: 'Plus ile tamamlanan her dersi inci harcamadan tekrar edersin, ücretsiz modda fiyat her tekrar artsa bile.',
      pl: 'Z Plus każda ukończona lekcja jest otwarta do powtórki bez monet, nawet gdy w trybie free cena rosłaby po każdym przejściu.',
    },
  },
  stats: {
    title: { 'pt-BR': 'Análises de progresso no Plus', vi: 'Phân tích tiến bộ dành cho Plus', id: 'Analitik progres untuk Plus', tr: 'İlerleme analizi Plus’da', pl: 'Analityka postępu w Plus' },
    subtitle: {
      'pt-BR': 'Mapa anual de atividade, pontos de melhoria e comparação com outros alunos. Você vê seu crescimento com clareza.',
      vi: 'Bản đồ hoạt động cả năm, điểm cần cải thiện và so sánh với học viên khác. Bạn thấy rõ bức tranh tiến bộ của mình.',
      id: 'Peta aktivitas setahun, titik berkembang, dan perbandingan dengan siswa lain. Kamu melihat perkembangan dengan jelas.',
      tr: 'Yıllık etkinlik haritası, gelişim noktaları ve diğer öğrencilerle karşılaştırma. Gelişimini net görürsün.',
      pl: 'Roczna mapa aktywności, punkty wzrostu i porównanie z innymi uczniami. Widzisz jasny obraz swojego wzrostu.',
    },
  },
  heatmap: {
    title: { 'pt-BR': 'Mapa de atividade no Plus', vi: 'Bản đồ hoạt động dành cho Plus', id: 'Peta aktivitas untuk Plus', tr: 'Etkinlik haritası Plus’da', pl: 'Mapa aktywności w Plus' },
    subtitle: {
      'pt-BR': '365 dias de estudo em uma tela: veja seus períodos fortes e fracos.',
      vi: '365 ngày học trên một màn hình: thấy giai đoạn mạnh và yếu của bạn.',
      id: '365 hari belajar dalam satu layar: lihat periode kuat dan lemahmu.',
      tr: 'Tek ekranda 365 gün çalışma: güçlü ve zayıf dönemlerini gör.',
      pl: '365 dni nauki na jednym ekranie: zobacz swoje mocne i słabe okresy.',
    },
  },
  patterns: {
    title: { 'pt-BR': 'Seus pontos de crescimento', vi: 'Điểm cần phát triển của bạn', id: 'Titik berkembangmu', tr: 'Gelişim noktaların', pl: 'Twoje punkty wzrostu' },
    subtitle: {
      'pt-BR': 'Descubra quais temas e frases ainda não firmaram — e treine exatamente isso.',
      vi: 'Biết chủ đề và cụm từ nào chưa chắc — rồi luyện đúng phần đó.',
      id: 'Temukan topik dan frasa yang belum kuat — lalu latih tepat bagian itu.',
      tr: 'Hangi konuların ve ifadelerin henüz oturmadığını gör — tam onları çalış.',
      pl: 'Zobacz, które tematy i frazy jeszcze nie siedzą — i trenuj właśnie je.',
    },
  },
  percentiles: {
    title: { 'pt-BR': 'Comparação com outros no Plus', vi: 'So sánh với người khác dành cho Plus', id: 'Perbandingan dengan pengguna lain di Plus', tr: 'Diğerleriyle karşılaştırma Plus’da', pl: 'Porównanie z innymi w Plus' },
    subtitle: {
      'pt-BR': 'Veja onde você se destaca entre os alunos. Sem desmotivar: só o que mostra sua força.',
      vi: 'Xem bạn nổi bật ở đâu so với học viên khác. Không làm nản: chỉ những điểm bạn mạnh.',
      id: 'Lihat di mana kamu unggul di antara siswa lain. Tanpa menjatuhkan motivasi: hanya sisi kuatmu.',
      tr: 'Öğrenciler arasında nerede öne çıktığını gör. Moral bozma yok: sadece güçlü olduğun yerler.',
      pl: 'Zobacz, gdzie jesteś wysoko wśród uczniów. Bez demotywacji: tylko to, w czym jesteś mocny.',
    },
  },
  generic: {
    title: { 'pt-BR': 'Aprenda mais rápido com Plus', vi: 'Học nhanh hơn với Plus', id: 'Belajar lebih cepat dengan Plus', tr: 'Plus ile daha hızlı öğren', pl: 'Ucz się szybciej z Plus' },
    subtitle: {
      'pt-BR': 'Mais prática, menos limites e progresso estável todos os dias.',
      vi: 'Nhiều luyện tập hơn, ít giới hạn hơn và tiến bộ đều mỗi ngày.',
      id: 'Lebih banyak latihan, lebih sedikit batasan, dan progres stabil setiap hari.',
      tr: 'Daha çok pratik, daha az sınır ve her gün istikrarlı ilerleme.',
      pl: 'Więcej praktyki, mniej ograniczeń i stabilny postęp każdego dnia.',
    },
  },
};

PAYWALL_PLANNED_COPY.premium_expired = {
  title: {
    'pt-BR': 'Recupere o acesso Plus completo',
    vi: 'Lấy lại quyền truy cập Plus đầy đủ',
    id: 'Pulihkan akses Plus penuh',
    tr: 'Tam Plus erişimini geri al',
    pl: 'Odzyskaj pełny dostęp Plus',
  },
  subtitle: {
    'pt-BR': 'Seu Plus acabou. Reative e continue estudando sem limites nem pausas, exatamente de onde parou.',
    vi: 'Plus của bạn đã hết. Kích hoạt lại và học tiếp không giới hạn, ngay từ chỗ bạn dừng.',
    id: 'Plus-mu sudah habis. Aktifkan lagi dan lanjut belajar tanpa batas, tepat dari tempat terakhir.',
    tr: 'Plus’un bitti. Yeniden etkinleştir ve kaldığın yerden sınırsız öğrenmeye devam et.',
    pl: 'Twój Plus się skończył. Włącz ponownie i ucz się dalej bez limitów, dokładnie od miejsca, gdzie skończyłeś.',
  },
};
PAYWALL_PLANNED_COPY.vip_expired = {
  title: {
    'pt-BR': 'Seu acesso Plus terminou',
    vi: 'Quyền Plus của bạn đã kết thúc',
    id: 'Akses Plus-mu telah berakhir',
    tr: 'Plus erişimin sona erdi',
    pl: 'Twój dostęp Plus się skończył',
  },
  subtitle: {
    'pt-BR': 'Gostou de tudo sem limites? Ative Plus ou Phraseman Pro e continue sem pausas.',
    vi: 'Thích mọi thứ không giới hạn? Kích hoạt Plus hoặc Phraseman Pro và tiếp tục không gián đoạn.',
    id: 'Suka semuanya tanpa batas? Aktifkan Plus atau Phraseman Pro dan lanjut tanpa jeda.',
    tr: 'Sınırsız her şeyi sevdin mi? Plus veya Phraseman Pro’yu aç ve ara vermeden devam et.',
    pl: 'Spodobało ci się wszystko bez limitów? Włącz Plus albo Phraseman Pro i ucz się bez przerw.',
  },
};
PAYWALL_PLANNED_COPY.notification_upsell = COURSE_AFTER_LESSON3_PLANNED_COPY;

// Пред-существующие контексты, у которых не было planned-hero-copy → не-RU/UK/ES
// языки падали в generic. Закрываем, чтобы каждый контекст был персональным на всех 8.
PAYWALL_PLANNED_COPY.dialog_limit = {
  title: {
    en: 'Daily dialogue limit reached',
    'pt-BR': 'Limite diário de diálogos atingido',
    vi: 'Đã hết giới hạn hội thoại hôm nay',
    id: 'Batas dialog harian tercapai',
    tr: 'Günlük diyalog sınırına ulaşıldı',
    pl: 'Dzienny limit dialogów wyczerpany',
  },
  subtitle: {
    en: `A regular account gets ${DAILY_DIALOG} replies a day. Plus removes the daily limit and opens every scenario: answer in your own words and get guidance as you talk.`,
    'pt-BR': `A conta normal tem ${DAILY_DIALOG} respostas por dia. O Plus remove o limite diário e abre todos os cenários: responda com suas palavras e receba dicas durante a conversa.`,
    vi: `Tài khoản thường có ${DAILY_DIALOG} câu trả lời mỗi ngày. Plus bỏ giới hạn ngày và mở mọi kịch bản: trả lời bằng lời của bạn và nhận gợi ý trong lúc nói.`,
    id: `Akun biasa mendapat ${DAILY_DIALOG} balasan per hari. Plus menghapus batas harian dan membuka semua skenario: jawab dengan kata-katamu dan dapatkan petunjuk selama percakapan.`,
    tr: `Normal hesapta günde ${DAILY_DIALOG} yanıt var. Plus günlük sınırı kaldırır ve tüm senaryoları açar: kendi sözlerinle yanıt ver, konuşurken ipuçları al.`,
    pl: `Zwykłe konto ma ${DAILY_DIALOG} odpowiedzi dziennie. Plus zdejmuje dzienny limit i otwiera wszystkie scenariusze: odpowiadaj własnymi słowami i korzystaj z podpowiedzi.`,
  },
};
PAYWALL_PLANNED_COPY.speaking = {
  title: {
    en: 'Daily speaking limit reached',
    'pt-BR': 'Limite diário de fala atingido',
    vi: 'Đã hết giới hạn luyện nói hôm nay',
    id: 'Batas latihan bicara harian tercapai',
    tr: 'Günlük konuşma sınırına ulaşıldı',
    pl: 'Dzienny limit mówienia wyczerpany',
  },
  subtitle: {
    en: `A regular account gets ${DAILY_SPEAKING} speaking attempts a day. Plus removes the daily limit: say phrases out loud as often as you like while the app listens and guides you.`,
    'pt-BR': `A conta normal tem ${DAILY_SPEAKING} tentativas de fala por dia. O Plus remove o limite diário: diga as frases em voz alta quantas vezes quiser enquanto o app escuta e orienta.`,
    vi: `Tài khoản thường có ${DAILY_SPEAKING} lượt nói mỗi ngày. Plus bỏ giới hạn ngày: đọc câu thành tiếng bao nhiêu tùy thích, ứng dụng lắng nghe và gợi ý.`,
    id: `Akun biasa mendapat ${DAILY_SPEAKING} percobaan bicara per hari. Plus menghapus batas harian: ucapkan frasa sesering yang kamu mau sementara aplikasi mendengarkan dan memandu.`,
    tr: `Normal hesapta günde ${DAILY_SPEAKING} konuşma denemesi var. Plus günlük sınırı kaldırır: cümleleri istediğin kadar sesli söyle, uygulama dinler ve yönlendirir.`,
    pl: `Zwykłe konto ma ${DAILY_SPEAKING} próby mówienia dziennie. Plus zdejmuje dzienny limit: wymawiaj frazy na głos ile chcesz, a aplikacja słucha i podpowiada.`,
  },
};
PAYWALL_PLANNED_COPY.intro_ended = {
  title: {
    'pt-BR': 'Continue com acesso completo',
    vi: 'Tiếp tục với quyền truy cập đầy đủ',
    id: 'Lanjutkan dengan akses penuh',
    tr: 'Tam erişimle devam et',
    pl: 'Kontynuuj z pełnym dostępem',
  },
  subtitle: {
    'pt-BR': 'Você já sentiu o acesso completo. O Plus o abre sem pausas nem bloqueios.',
    vi: 'Bạn đã trải nghiệm quyền truy cập đầy đủ. Plus mở nó không dừng, không khoá.',
    id: 'Kamu sudah merasakan akses penuh. Plus membukanya tanpa jeda dan tanpa blokir.',
    tr: 'Tam erişimi zaten hissettin. Plus onu arasız ve engelsiz açar.',
    pl: 'Już poczułeś pełny dostęp. Plus otwiera go bez przerw i blokad.',
  },
};
PAYWALL_PLANNED_COPY.level_up = COURSE_AFTER_LESSON3_PLANNED_COPY;
PAYWALL_PLANNED_COPY.ai_voice_input = {
  title: {
    en: 'Daily voice input limit reached',
    'pt-BR': 'Limite diário de entrada por voz atingido',
    vi: 'Đã hết giới hạn nhập bằng giọng nói hôm nay',
    id: 'Batas input suara harian tercapai',
    tr: 'Günlük sesli giriş sınırına ulaşıldı',
    pl: 'Dzienny limit wprowadzania głosem wyczerpany',
  },
  subtitle: {
    en: `Voice input in a dialogue counts as a speaking attempt: a regular account gets ${DAILY_SPEAKING} a day. Plus removes the daily limit — say any reply out loud and Phraseman turns it into text.`,
    'pt-BR': `A entrada por voz no diálogo conta como tentativa de fala: a conta normal tem ${DAILY_SPEAKING} por dia. O Plus remove o limite diário: fale qualquer resposta e o Phraseman transforma em texto.`,
    vi: `Nhập bằng giọng nói trong hội thoại tính là một lượt nói: tài khoản thường có ${DAILY_SPEAKING} lượt mỗi ngày. Plus bỏ giới hạn ngày — nói bất kỳ câu trả lời nào và Phraseman chuyển thành văn bản.`,
    id: `Input suara di dialog dihitung sebagai percobaan bicara: akun biasa mendapat ${DAILY_SPEAKING} per hari. Plus menghapus batas harian — ucapkan jawaban apa pun dan Phraseman mengubahnya menjadi teks.`,
    tr: `Diyalogda sesli giriş bir konuşma denemesi sayılır: normal hesapta günde ${DAILY_SPEAKING} tane var. Plus günlük sınırı kaldırır — istediğin yanıtı sesli söyle, Phraseman metne çevirir.`,
    pl: `Wprowadzanie głosem w dialogu liczy się jako próba mówienia: zwykłe konto ma ${DAILY_SPEAKING} dziennie. Plus zdejmuje dzienny limit — powiedz dowolną odpowiedź, a Phraseman zamieni ją w tekst.`,
  },
};

PAYWALL_PLANNED_COPY.dialog_analysis = {
  title: {
    'pt-BR': 'Análise do diálogo no Plus',
    vi: 'Phân tích hội thoại trong Plus',
    id: 'Analisis dialog di Plus',
    tr: 'Diyalog analizi Plus’ta',
    pl: 'Analiza dialogu w Plus',
  },
  subtitle: {
    'pt-BR': 'Depois da conversa, o Plus mostra o que soou pouco natural, como corrigir e uma forma mais viva de dizer na próxima vez.',
    vi: 'Sau cuộc trò chuyện, Plus chỉ ra câu nào chưa tự nhiên, cách sửa và cách nói sống động hơn lần sau.',
    id: 'Setelah percakapan, Plus menunjukkan bagian yang kurang alami, cara memperbaikinya, dan versi yang lebih hidup.',
    tr: 'Konuşmadan sonra Plus, neyin doğal gelmediğini, nasıl düzeltileceğini ve bir dahaki sefere daha canlı nasıl söyleneceğini gösterir.',
    pl: 'Po rozmowie Plus pokazuje, co brzmiało nienaturalnie, jak to poprawić i jak powiedzieć to żywiej następnym razem.',
  },
};

PAYWALL_PLANNED_COPY.dialog_locked_level = {
  title: {
    en: 'Higher-level dialogues are in Plus',
    'pt-BR': 'Diálogos de níveis superiores estão no Plus',
    vi: 'Hội thoại cấp cao hơn có trong Plus',
    id: 'Dialog level lebih tinggi ada di Plus',
    tr: 'Üst seviye diyaloglar Plus’ta',
    pl: 'Dialogi wyższych poziomów są w Plus',
  },
  subtitle: {
    en: 'All dialogue scenarios are included in Plus. Practice lesson-based and real-life situations, respond in your own words, and get guidance as you talk.',
    'pt-BR': 'Todos os cenários de diálogo estão incluídos no Plus. Pratique situações das lições e da vida real, responda com suas próprias palavras e receba dicas durante a conversa.',
    vi: 'Tất cả kịch bản hội thoại đều có trong Plus. Luyện các tình huống trong bài học và đời thực, trả lời bằng lời của bạn và nhận gợi ý trong lúc trò chuyện.',
    id: 'Semua skenario dialog tersedia di Plus. Latih situasi dari pelajaran dan kehidupan nyata, jawab dengan kata-katamu sendiri, dan dapatkan petunjuk selama percakapan.',
    tr: 'Tüm diyalog senaryoları Plus’a dahildir. Derslerden ve gerçek hayattan durumları çalış, kendi sözlerinle yanıt ver ve konuşma sırasında ipuçları al.',
    pl: 'Wszystkie scenariusze dialogów są dostępne w Plus. Ćwicz sytuacje z lekcji i życia, odpowiadaj własnymi słowami i korzystaj z podpowiedzi podczas rozmowy.',
  },
};

PAYWALL_PLANNED_COPY.flashcard_training = {
  title: {
    en: 'Daily training limit reached',
    'pt-BR': 'Limite diário de treinos atingido',
    vi: 'Đã hết giới hạn luyện tập hôm nay',
    id: 'Batas latihan harian tercapai',
    tr: 'Günlük antrenman sınırına ulaşıldı',
    pl: 'Dzienny limit treningów wyczerpany',
  },
  subtitle: {
    en: `A regular account gets ${DAILY_TRAINING} card trainings a day across all modes. Plus removes the daily limit: recall phrases actively and strengthen weak words without pauses.`,
    'pt-BR': `A conta normal tem ${DAILY_TRAINING} treinos de cartões por dia em todos os modos. O Plus remove o limite diário: lembre frases de forma ativa e reforce palavras fracas sem pausas.`,
    vi: `Tài khoản thường có ${DAILY_TRAINING} lượt luyện thẻ mỗi ngày cho mọi chế độ. Plus bỏ giới hạn ngày: nhớ cụm từ chủ động và củng cố từ yếu không ngắt quãng.`,
    id: `Akun biasa mendapat ${DAILY_TRAINING} latihan kartu per hari untuk semua mode. Plus menghapus batas harian: ingat frasa secara aktif dan perkuat kata lemah tanpa jeda.`,
    tr: `Normal hesapta tüm modlar için günde ${DAILY_TRAINING} kart antrenmanı var. Plus günlük sınırı kaldırır: ifadeleri aktif hatırla, zayıf kelimeleri arasız güçlendir.`,
    pl: `Zwykłe konto ma ${DAILY_TRAINING} treningi fiszek dziennie we wszystkich trybach. Plus zdejmuje dzienny limit: aktywnie przypominaj frazy i wzmacniaj słabe słowa bez przerw.`,
  },
};

PAYWALL_PLANNED_COPY.ai_explain = {
  title: {
    'pt-BR': 'Explicações de IA sem limite',
    vi: 'Giải thích lỗi bằng AI không giới hạn',
    id: 'Penjelasan AI tanpa batas',
    tr: 'Sınırsız yapay zekâ açıklamaları',
    pl: 'Wyjaśnienia AI bez limitu',
  },
  subtitle: {
    'pt-BR': 'A versão grátis inclui poucas explicações por dia. Plus tira o limite: a IA explica cada erro — o que falhou, por quê e como dizer certo.',
    vi: 'Bản miễn phí chỉ có vài lượt giải thích mỗi ngày. Plus gỡ giới hạn: AI giải thích từng lỗi — sai ở đâu, vì sao và nói đúng thế nào.',
    id: 'Versi gratis hanya beberapa penjelasan per hari. Plus menghapus batas: AI menjelaskan tiap kesalahan — apa yang salah, kenapa, dan cara benarnya.',
    tr: 'Ücretsiz sürümde günde birkaç açıklama var. Plus sınırı kaldırır: yapay zekâ her hatayı açıklar — ne yanlış, neden ve doğrusu nasıl.',
    pl: 'Wersja darmowa daje kilka wyjaśnień dziennie. Plus zdejmuje limit: AI tłumaczy każdy błąd — co nie tak, dlaczego i jak powiedzieć poprawnie.',
  },
};

PAYWALL_PLANNED_COPY.weekly_review = {
  title: {
    'pt-BR': 'Seu resumo semanal completo',
    vi: 'Bản tổng kết tuần đầy đủ của bạn',
    id: 'Ulasan mingguan lengkapmu',
    tr: 'Eksiksiz haftalık özetin',
    pl: 'Twój pełny tygodniowy przegląd',
  },
  subtitle: {
    'pt-BR': 'Toda semana, uma análise pessoal: o que melhorou, o que oscila e um plano claro para a próxima. Com Plus o resumo abre inteiro, com dicas e lições recomendadas.',
    vi: 'Mỗi tuần một bản phân tích cá nhân: điều gì vững hơn, chỗ nào còn yếu và kế hoạch rõ ràng cho tuần tới. Với Plus, bản tổng kết mở đầy đủ kèm gợi ý và bài học đề xuất.',
    id: 'Tiap minggu ada analisis personal: apa yang membaik, apa yang melemah, dan rencana jelas untuk minggu depan. Dengan Plus ulasan terbuka penuh, dengan tips dan pelajaran rekomendasi.',
    tr: 'Her hafta kişisel bir analiz: ne güçlendi, ne aksıyor ve gelecek hafta için net bir plan. Plus ile özet tamamen açılır — ipuçları ve önerilen derslerle.',
    pl: 'Co tydzień osobista analiza: co się umocniło, co siada i jasny plan na kolejny tydzień. Z Plus przegląd otwiera się w całości — z podpowiedziami i polecanymi lekcjami.',
  },
};

PAYWALL_PLANNED_COPY.avatar_aura = {
  title: {
    'pt-BR': 'Destaque-se com uma aura no avatar',
    vi: 'Nổi bật với hào quang quanh avatar',
    id: 'Tampil beda dengan aura avatar',
    tr: 'Avatarında aurayla öne çık',
    pl: 'Wyróżnij się aurą wokół awatara',
  },
  subtitle: {
    'pt-BR': 'A aura premium ilumina seu avatar nas ligas e entre amigos. Você é visto na hora em listas e chats.',
    vi: 'Hào quang cao cấp làm avatar của bạn nổi bật trong giải đấu và giữa bạn bè. Bạn được chú ý ngay trong danh sách và trò chuyện.',
    id: 'Aura premium menyorot avatarmu di liga dan di antara teman. Kamu langsung terlihat di daftar dan obrolan.',
    tr: 'Premium aura, liglerde ve arkadaşlar arasında avatarını aydınlatır. Listelerde ve sohbetlerde hemen fark edilirsin.',
    pl: 'Premium aura podświetla twój awatar w ligach i wśród znajomych. Widać cię od razu na listach i czatach.',
  },
};

export function getHeroPlannedCopy(ctx: PremiumContext, savedCards: number): PremiumPlannedHeroCopy {
  const planned = PAYWALL_PLANNED_COPY[ctx] ?? PAYWALL_PLANNED_COPY.generic;
  if (ctx !== 'flashcard_limit' || savedCards <= 0) return planned;
  return {
    ...planned,
    title: {
      'pt-BR': `${savedCards}/20 cartões salvos`,
      vi: `Đã lưu ${savedCards}/20 thẻ`,
      id: `${savedCards}/20 kartu tersimpan`,
      tr: `${savedCards}/20 kart kaydedildi`,
      pl: `Zapisano ${savedCards}/20 fiszek`,
    },
  };
}

export function getPaywallCopy(context?: string): PaywallCopy {
  if (!context) return PAYWALL_COPY.generic;
  return (PAYWALL_COPY as Record<string, PaywallCopy>)[context] ?? PAYWALL_COPY.generic;
}

// Контексты, чей заголовок УЖЕ сформулирован как возврат/ре-энгейдж. Их win-back
// подмена не трогает — иначе получится двойной «верни доступ».
const WIN_BACK_NATIVE_CONTEXTS = new Set<string>([
  'generic',
  'premium_expired',
  'vip_expired',
  'intro_ended',
  'notification_upsell',
]);

// Win-back заголовок: универсальная формулировка «верни доступ», который у юзера
// УЖЕ был (премиум стал фри/истёк). Перекрывает «получить впервые»-заголовки вроде
// Заголовки первого получения звучат неактуально для вернувшегося юзера.
const WIN_BACK_TITLE: Pick<PaywallCopy, 'titleRu' | 'titleUk' | 'titleEs'> = {
  titleRu: 'Верни полный доступ Plus',
  titleUk: 'Поверни повний доступ Plus',
  titleEs: 'Recupera tu acceso Plus completo',
};

// Win-back заголовок для planned-локалей (pt-BR/vi/id/tr/pl), которые берут title
// из planned-копии, а не из RU/UK/ES.
const WIN_BACK_PLANNED_TITLE: PremiumPlannedCopy = {
  en: 'Restore full Plus access',
  'pt-BR': 'Recupere seu acesso Plus completo',
  vi: 'Lấy lại toàn bộ quyền Plus của bạn',
  id: 'Pulihkan akses Plus penuh kamu',
  tr: 'Tüm Plus erişimini geri kazan',
  pl: 'Odzyskaj pełny dostęp Plus',
};

function isWinBackContext(context: string | undefined, hadPremiumEver: boolean): boolean {
  if (!hadPremiumEver) return false;
  if (context && WIN_BACK_NATIVE_CONTEXTS.has(context)) return false;
  return true;
}

/**
 * Если юзер когда-либо имел Premium/VIP (hadPremiumEver) и сейчас на фиче-пейволе,
 * заголовок «получить впервые» заменяется на win-back «верни доступ». Субтайтл и
 * выгоды остаются — они описывают, ЧТО даёт Premium, и валидны для возврата.
 * Контексты, которые сами уже про возврат, не трогаются.
 */
export function applyWinBackCopy(
  copy: PaywallCopy,
  context: string | undefined,
  hadPremiumEver: boolean,
): PaywallCopy {
  if (!isWinBackContext(context, hadPremiumEver)) return copy;
  return { ...copy, ...WIN_BACK_TITLE };
}

/**
 * Win-back подмена title для planned-копии (нероссийско-украинско-испанские локали).
 * Subtitle planned не трогаем по той же причине, что и в applyWinBackCopy.
 */
export function applyWinBackPlannedCopy(
  planned: PremiumPlannedHeroCopy,
  context: string | undefined,
  hadPremiumEver: boolean,
): PremiumPlannedHeroCopy {
  if (!isWinBackContext(context, hadPremiumEver)) return planned;
  return { ...planned, title: WIN_BACK_PLANNED_TITLE };
}

// ── Контексты возврата/ре-энгейджа: заголовки под ситуацию (а не generic) ─────
PAYWALL_COPY.premium_expired = {
  titleRu: 'Верни полный доступ Plus',
  titleUk: 'Поверни повний доступ Plus',
  titleEs: 'Recupera tu acceso Plus completo',
  subtitleRu: 'Твой Plus закончился. Подключи снова — и продолжай учиться без лимитов и пауз, ровно с того места, где остановился.',
  subtitleUk: 'Твій Plus завершився. Підключи знову — і вчись далі без лімітів і пауз, саме з того місця, де зупинився.',
  subtitleEs: 'Tu Plus terminó. Reactívalo y sigue aprendiendo sin límites ni pausas, justo donde lo dejaste.',
};
PAYWALL_COPY.vip_expired = {
  titleRu: 'Твой Plus-доступ закончился',
  titleUk: 'Твій Plus-доступ завершився',
  titleEs: 'Tu acceso Plus ha terminado',
  subtitleRu: 'Тебе понравились возможности без ограничений? Оформи Plus или Phraseman Pro — и продолжай без пауз в прогрессе.',
  subtitleUk: 'Сподобались можливості без обмежень? Оформи Plus або Phraseman Pro — і продовжуй без пауз у прогресі.',
  subtitleEs: '¿Te gustó todo sin límites? Activa Plus o Phraseman Pro y sigue sin pausas.',
};
PAYWALL_COPY.notification_upsell = COURSE_AFTER_LESSON3_COPY;

export const CONTEXT_BENEFITS: Partial<Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]>> & { generic: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] } = {
  onboarding_plan: MAIN_COURSE_PLUS_BENEFITS,
  season_pass_lane: SEASON_PASS_LANE_BENEFITS,
  language_add: [
    { ru: 'Несколько языков в одном аккаунте', uk: 'Кілька мов в одному акаунті', es: 'Varios idiomas en una cuenta', 'pt-BR': 'Vários idiomas em uma conta', vi: 'Nhiều ngôn ngữ trong một tài khoản', id: 'Beberapa bahasa dalam satu akun', tr: 'Tek hesapta birden çok dil', pl: 'Kilka języków na jednym koncie' },
    { ru: 'У каждого языка свой план и прогресс', uk: 'У кожної мови свій план і прогрес', es: 'Cada idioma con su plan y progreso', 'pt-BR': 'Cada idioma com seu plano e progresso', vi: 'Mỗi ngôn ngữ có kế hoạch và tiến độ riêng', id: 'Tiap bahasa punya rencana dan progres sendiri', tr: 'Her dilin kendi planı ve ilerlemesi', pl: 'Każdy język ma własny plan i postęp' },
    { ru: 'Переключайся между языками в один тап', uk: 'Перемикайся між мовами одним дотиком', es: 'Cambia de idioma con un toque', 'pt-BR': 'Troque de idioma com um toque', vi: 'Chuyển ngôn ngữ chỉ với một chạm', id: 'Berpindah bahasa dengan satu ketukan', tr: 'Tek dokunuşla diller arasında geç', pl: 'Przełączaj języki jednym dotknięciem' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, тренировка и финальный экзамен без вынужденных пауз', uk: 'Урок, тренування і фінальний іспит без вимушених пауз', es: 'Lección, práctica y examen sin pausas forzadas', 'pt-BR': 'Lição, prática e exame final sem pausas forçadas', vi: 'Bài học, luyện tập và bài cuối không bị dừng ép buộc', id: 'Pelajaran, latihan, dan ujian akhir tanpa jeda paksa', tr: 'Ders, pratik ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, praktyka i egzamin bez wymuszonych przerw' },
    { ru: 'День не обрывается на самом интересном', uk: 'День не обривається на найцікавішому', es: 'El día no se corta justo cuando empieza', 'pt-BR': 'O dia não para bem na melhor hora', vi: 'Buổi học không dừng đúng lúc đang vào guồng', id: 'Hari belajar tidak berhenti saat mulai seru', tr: 'Gün tam hızlanmışken kesilmez', pl: 'Dzień nie urywa się w najciekawszym momencie' },
  ],
  course_after_lesson3: MAIN_COURSE_PLUS_BENEFITS,
  lesson_b1: MAIN_COURSE_PLUS_BENEFITS,
  flashcard_limit: [
    { ru: 'Безлимит на личную базу карточек', uk: 'Безліміт на особисту базу карток', es: 'Tu colección de tarjetas sin límite', 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { ru: 'Храни все важные фразы', uk: 'Зберігай всі важливі фрази', es: 'Guarda todas tus frases clave', 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { ru: 'Лучше долгосрочное запоминание', uk: 'Краще довгострокове запам\'ятовування', es: 'Memoria a largo plazo más sólida', 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { ru: 'Защита серии даже при пропуске', uk: 'Захист серії навіть при пропуску', es: 'Protege tu racha aunque faltes un día', 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { ru: 'Без пауз из-за энергии', uk: 'Без пауз через енергію', es: 'Sin pausas por energía', 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda akibat energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
    { ru: 'Серия не ломает твой темп', uk: 'Серія не ламає твій темп', es: 'La racha no rompe tu ritmo', 'pt-BR': 'A sequência não quebra seu ritmo', vi: 'Chuỗi ngày không phá nhịp học của bạn', id: 'Runtutan tidak merusak ritmemu', tr: 'Seri temponu bozmaz', pl: 'Seria nie łamie twojego tempa' },
  ],
  theme: [
    { ru: 'Персональный стиль приложения', uk: 'Персональний стиль застосунку', es: 'Estilo visual a tu medida', 'pt-BR': 'Estilo visual do seu jeito', vi: 'Phong cách giao diện theo bạn', id: 'Gaya visual sesuai seleramu', tr: 'Kişisel uygulama stili', pl: 'Osobisty styl aplikacji' },
    { ru: 'Выше вовлеченность в обучение', uk: 'Вища залученість у навчання', es: 'Mayor compromiso al estudiar', 'pt-BR': 'Mais envolvimento no estudo', vi: 'Gắn bó hơn với việc học', id: 'Lebih terlibat saat belajar', tr: 'Öğrenmeye daha fazla bağlılık', pl: 'Większe zaangażowanie w naukę' },
    { ru: 'Комфортнее заниматься регулярно', uk: 'Комфортніше займатися регулярно', es: 'Sesiones más cómodas y rutinarias', 'pt-BR': 'Mais conforto para estudar sempre', vi: 'Thoải mái hơn để học đều', id: 'Lebih nyaman untuk belajar rutin', tr: 'Düzenli çalışmak daha rahat', pl: 'Wygodniej uczyć się regularnie' },
  ],
  club: [
    { ru: 'Клубы и XP-бусты для ускорения', uk: 'Клуби та XP-бусти для прискорення', es: 'Clubs y bonus de XP para acelerar', 'pt-BR': 'Clubes e boosts de XP para acelerar', vi: 'Câu lạc bộ và boost XP để tăng tốc', id: 'Klub dan boost XP untuk mempercepat', tr: 'Hızlanmak için kulüpler ve XP boostları', pl: 'Kluby i boosty XP do przyspieszenia' },
    { ru: 'Больше пользы с каждой сессии', uk: 'Більше користі з кожної сесії', es: 'Sacas más de cada sesión', 'pt-BR': 'Mais valor em cada sessão', vi: 'Mỗi phiên học có ích hơn', id: 'Manfaat lebih besar di tiap sesi', tr: 'Her seanstan daha fazla fayda', pl: 'Więcej wartości z każdej sesji' },
    { ru: 'Сильнее мотивация возвращаться', uk: 'Сильніша мотивація повертатися', es: 'Más ganas de volver mañana', 'pt-BR': 'Mais motivação para voltar amanhã', vi: 'Thêm động lực quay lại ngày mai', id: 'Lebih termotivasi untuk kembali besok', tr: 'Yarın dönmek için daha güçlü motivasyon', pl: 'Silniejsza motywacja, żeby wrócić jutro' },
  ],
  generic: [
    { ru: 'Больше практики без ограничений', uk: 'Більше практики без обмежень', es: 'Más práctica sin límites', 'pt-BR': 'Mais prática sem limites', vi: 'Nhiều luyện tập hơn, không giới hạn', id: 'Lebih banyak latihan tanpa batas', tr: 'Sınırsız daha fazla pratik', pl: 'Więcej praktyki bez ograniczeń' },
    { ru: 'Понятный следующий шаг каждый день', uk: 'Зрозумілий наступний крок щодня', es: 'Un siguiente paso claro cada día', 'pt-BR': 'Um próximo passo claro todos os dias', vi: 'Mỗi ngày có bước tiếp theo rõ ràng', id: 'Langkah berikutnya jelas tiap hari', tr: 'Her gün net bir sonraki adım', pl: 'Jasny kolejny krok każdego dnia' },
    { ru: 'Плюс-опции сразу после активации', uk: 'Плюс-опції одразу після активації', es: 'Funciones Plus al instante', 'pt-BR': 'Funções Plus logo após ativar', vi: 'Tính năng Plus có ngay sau khi kích hoạt', id: 'Fitur Plus langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Plus özellikler', pl: 'Opcje Plus od razu po aktywacji' },
  ],
  mistake_practice: [
    { ru: 'Все ошибки из уроков и карточек в одном месте', uk: 'Усі помилки з уроків і карток в одному місці', es: 'Todos tus errores de lecciones y tarjetas en un lugar', 'pt-BR': 'Todos os erros de lições e cartões em um só lugar', vi: 'Mọi lỗi từ bài học và thẻ ở một nơi', id: 'Semua kesalahan dari pelajaran dan kartu di satu tempat', tr: 'Ders ve kart hatalarının hepsi tek yerde', pl: 'Wszystkie błędy z lekcji i fiszek w jednym miejscu' },
    { ru: 'Слова и фразы смешиваются автоматически', uk: 'Слова й фрази змішуються автоматично', es: 'Palabras y frases se mezclan automáticamente', 'pt-BR': 'Palavras e frases se misturam automaticamente', vi: 'Từ và câu được trộn tự động', id: 'Kata dan frasa dicampur otomatis', tr: 'Kelimeler ve ifadeler otomatik karışır', pl: 'Słowa i frazy mieszają się automatycznie' },
    { ru: 'Режимы меняются по твоему прогрессу', uk: 'Режими змінюються за твоїм прогресом', es: 'Los modos cambian según tu progreso', 'pt-BR': 'Os modos mudam conforme seu progresso', vi: 'Chế độ thay đổi theo tiến độ của bạn', id: 'Mode berubah mengikuti progresmu', tr: 'Modlar ilerlemene göre değişir', pl: 'Tryby zmieniają się wraz z postępem' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones', 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { ru: 'Не тратишь жемчужины на перепрохождения уроков', uk: 'Не витрачаєш перлини на перепроходження уроків', es: 'No gastas perlas al repetir lecciones', 'pt-BR': 'Você não gasta pérolas ao repetir lições', vi: 'Không tốn ngọc trai khi học lại bài', id: 'Tidak memakai mutiara saat mengulang pelajaran', tr: 'Ders tekrarında inci harcamazsın', pl: 'Nie wydajesz pereł na powtórki lekcji' },
    { ru: 'Тренируй до идеального результата без давления', uk: 'Тренуй до ідеального результату без тиску', es: 'Entrena hasta perfeccionar sin presión', 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { ru: 'Карта активности: все 365 дней', uk: 'Карта активності: всі 365 днів', es: 'Mapa de actividad: los 365 días', 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { ru: 'Точки роста и слабые темы', uk: 'Точки росту й слабкі теми', es: 'Puntos de crecimiento y temas débiles', 'pt-BR': 'Pontos de melhoria e temas fracos', vi: 'Điểm cần phát triển và chủ đề yếu', id: 'Titik berkembang dan topik lemah', tr: 'Gelişim noktaları ve zayıf konular', pl: 'Punkty wzrostu i słabsze tematy' },
    { ru: 'Сравнение с другими — где ты в топе', uk: 'Порівняння з іншими — де ти в топі', es: 'Comparación con otros: tu top', 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { ru: '365 дней активности — увидишь своё постоянство', uk: '365 днів активності — побач свою сталість', es: '365 días: ve tu constancia', 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { ru: 'Лучшие и худшие периоды на одном экране', uk: 'Кращі та гірші періоди на одному екрані', es: 'Mejores y peores semanas a la vista', 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { ru: 'Понимаешь свой ритм обучения', uk: 'Розумієш свій ритм навчання', es: 'Entiendes tu ritmo real', 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { ru: 'Точки роста: что чаще всего проседает', uk: 'Точки росту: що найчастіше просідає', es: 'Puntos de crecimiento concretos', 'pt-BR': 'Pontos de crescimento: o que ainda oscila', vi: 'Điểm cần phát triển: phần còn chưa chắc', id: 'Titik berkembang: bagian yang belum kuat', tr: 'Gelişim noktaları: en çok ne aksıyor', pl: 'Punkty wzrostu: co najczęściej siada' },
    { ru: 'Конкретные темы и фразы для отработки', uk: 'Конкретні теми та фрази для відпрацювання', es: 'Temas y frases específicos a entrenar', 'pt-BR': 'Temas e frases específicos para treinar', vi: 'Chủ đề và cụm từ cụ thể để luyện', id: 'Topik dan frasa spesifik untuk dilatih', tr: 'Çalışılacak somut konular ve ifadeler', pl: 'Konkretne tematy i frazy do przećwiczenia' },
    { ru: 'Тренируй именно слабое — без распыления', uk: 'Тренуй саме слабке — без розпорошення', es: 'Entrena lo importante, no todo a la vez', 'pt-BR': 'Treine o ponto fraco sem dispersar', vi: 'Luyện đúng điểm yếu, không bị phân tán', id: 'Latih bagian lemah tanpa menyebar fokus', tr: 'Dağılmadan zayıf noktayı çalış', pl: 'Trenuj dokładnie słabe miejsce, bez rozproszenia' },
  ],
  percentiles: [
    { ru: 'Увидишь свой ранг среди всех учеников', uk: 'Бач свій ранг серед усіх учнів', es: 'Mira tu rango entre estudiantes', 'pt-BR': 'Veja seu ranking entre todos os alunos', vi: 'Xem thứ hạng của bạn trong số học viên', id: 'Lihat peringkatmu di antara semua siswa', tr: 'Tüm öğrenciler arasındaki sıralamanı gör', pl: 'Zobacz swoją pozycję wśród wszystkich uczniów' },
    { ru: 'Только позитивные сравнения — мотивация', uk: 'Лише позитивні порівняння — мотивація', es: 'Solo comparaciones positivas: motivación', 'pt-BR': 'Só comparações positivas para motivar', vi: 'Chỉ so sánh tích cực để tạo động lực', id: 'Hanya perbandingan positif untuk motivasi', tr: 'Motivasyon için yalnızca pozitif karşılaştırmalar', pl: 'Tylko pozytywne porównania dla motywacji' },
    { ru: 'Вижу когда я в топе и где расти дальше', uk: 'Бачу коли я в топі та де рости далі', es: 'Sabes en qué destacas y dónde crecer', 'pt-BR': 'Você sabe onde se destaca e onde crescer', vi: 'Biết bạn mạnh ở đâu và nên phát triển gì', id: 'Tahu di mana kamu unggul dan perlu berkembang', tr: 'Nerede güçlü olduğunu ve nereye büyüyeceğini bilirsin', pl: 'Wiesz, gdzie jesteś mocny i gdzie rosnąć dalej' },
  ],
};

CONTEXT_BENEFITS.ai_explain = [
  { ru: 'Разбор каждой ошибки сразу после ответа', uk: 'Розбір кожної помилки одразу після відповіді', es: 'Análisis de cada error justo al responder', 'pt-BR': 'Análise de cada erro logo após responder', vi: 'Phân tích từng lỗi ngay sau khi trả lời', id: 'Analisis tiap kesalahan langsung setelah menjawab', tr: 'Her hatanın yanıttan hemen sonra analizi', pl: 'Analiza każdego błędu zaraz po odpowiedzi' },
  { ru: 'Понятно: что не так, почему и как правильно', uk: 'Зрозуміло: що не так, чому і як правильно', es: 'Claro: qué falló, por qué y cómo decirlo bien', 'pt-BR': 'Claro: o que falhou, por quê e como corrigir', vi: 'Rõ ràng: sai ở đâu, vì sao và nói đúng thế nào', id: 'Jelas: apa yang salah, kenapa, dan cara benarnya', tr: 'Net: ne yanlış, neden ve doğrusu nasıl', pl: 'Jasno: co nie tak, dlaczego i jak poprawnie' },
  { ru: 'Без дневного лимита разборов', uk: 'Без денного ліміту розборів', es: 'Sin límite diario de explicaciones', 'pt-BR': 'Sem limite diário de explicações', vi: 'Không giới hạn lượt giải thích mỗi ngày', id: 'Tanpa batas penjelasan harian', tr: 'Günlük açıklama sınırı yok', pl: 'Bez dziennego limitu wyjaśnień' },
];

CONTEXT_BENEFITS.weekly_review = [
  { ru: 'Личный итог недели: сильные места и пробелы', uk: 'Особистий підсумок тижня: сильні місця й прогалини', es: 'Resumen personal: fortalezas y huecos', 'pt-BR': 'Resumo pessoal: pontos fortes e lacunas', vi: 'Tổng kết tuần cá nhân: điểm mạnh và lỗ hổng', id: 'Rangkuman pribadi: kekuatan dan celah', tr: 'Kişisel hafta özeti: güçlü yanlar ve eksikler', pl: 'Osobiste podsumowanie tygodnia: mocne strony i luki' },
  { ru: 'Точный план на следующую неделю', uk: 'Точний план на наступний тиждень', es: 'Un plan claro para la próxima semana', 'pt-BR': 'Um plano claro para a próxima semana', vi: 'Kế hoạch rõ ràng cho tuần tới', id: 'Rencana jelas untuk minggu depan', tr: 'Gelecek hafta için net plan', pl: 'Jasny plan na kolejny tydzień' },
  { ru: 'Рекомендации уроков под твои ошибки', uk: 'Рекомендації уроків під твої помилки', es: 'Lecciones recomendadas según tus errores', 'pt-BR': 'Lições recomendadas conforme seus erros', vi: 'Bài học đề xuất theo lỗi của bạn', id: 'Pelajaran rekomendasi sesuai kesalahanmu', tr: 'Hatalarına göre önerilen dersler', pl: 'Lekcje polecane pod twoje błędy' },
];

CONTEXT_BENEFITS.avatar_aura = [
  { ru: 'Аура вокруг аватара — виден в лигах и списках', uk: 'Аура навколо аватара — тебе видно в лігах і списках', es: 'Aura en tu avatar: visible en ligas y listas', 'pt-BR': 'Aura no avatar: visível em ligas e listas', vi: 'Hào quang quanh avatar — nổi bật trong giải và danh sách', id: 'Aura di avatar: terlihat di liga dan daftar', tr: 'Avatarında aura — liglerde ve listelerde görünürsün', pl: 'Aura wokół awatara — widoczny w ligach i na listach' },
  { ru: 'Уникальный стиль профиля, который замечают', uk: 'Унікальний стиль профілю, який помічають', es: 'Un estilo de perfil que se nota', 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { ru: 'Работает везде: лидерборды, друзья, чаты', uk: 'Працює всюди: лідерборди, друзі, чати', es: 'Funciona en todas partes: rankings, amigos, chats', 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS.speaking = [
  { ru: 'Произноси фразы вслух — приложение слушает', uk: 'Вимовляй фрази вголос — застосунок слухає', es: 'Di las frases en voz alta: la app te escucha', 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { ru: 'Мгновенная подсказка по каждому слову', uk: 'Миттєва підказка щодо кожного слова', es: 'Pista instantánea en cada palabra', 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { ru: 'Самый быстрый путь заговорить уверенно', uk: 'Найшвидший шлях заговорити впевнено', es: 'El camino más rápido para hablar con seguridad', 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS.dialog_limit = [
  { ru: 'Все сценарии по урокам и жизненным ситуациям', uk: 'Усі сценарії за уроками та життєвими ситуаціями', en: 'Every lesson-based and real-life scenario', es: 'Todos los escenarios de lecciones y de la vida real', 'pt-BR': 'Todos os cenários de lições e da vida real', vi: 'Mọi kịch bản từ bài học và đời thực', id: 'Semua skenario dari pelajaran dan kehidupan nyata', tr: 'Derslerden ve gerçek hayattan tüm senaryolar', pl: 'Wszystkie scenariusze z lekcji i życia' },
  { ru: 'Свободные ответы своими словами', uk: 'Вільні відповіді своїми словами', en: 'Open responses in your own words', es: 'Respuestas abiertas con tus propias palabras', 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { ru: 'Подсказки и разбор реплик во время практики', uk: 'Підказки та розбір реплік під час практики', en: 'Guidance and feedback on your replies as you practice', es: 'Ayuda y análisis de tus respuestas durante la práctica', 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS.intro_ended = [
  { ru: 'Полный доступ возвращается целиком', uk: 'Повний доступ повертається повністю', es: 'Recuperas el acceso completo entero', 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { ru: 'Уроки, практика и тренажёр без пауз и лимитов', uk: 'Уроки, практика і тренажер без пауз і лімітів', es: 'Lecciones, práctica y entrenador sin pausas ni límites', 'pt-BR': 'Lições, prática e treinador sem pausas nem limites', vi: 'Bài học, luyện tập và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, latihan, dan trainer tanpa jeda dan batas', tr: 'Dersler, pratik ve antrenör arasız ve sınırsız', pl: 'Lekcje, praktyka i trener bez przerw i limitów' },
  { ru: 'Сохрани темп, набранный за пробный период', uk: 'Збережи темп, набраний за пробний період', es: 'Mantén el ritmo que lograste en la prueba', 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

// зачем: выгоды привязаны к моменту level_up — что конкретно откроется на пути дальше
// (старый третий пункт обещал «XP-бусты», которых у Plus нет — убран, чтобы не врать).
CONTEXT_BENEFITS.level_up = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.premium_expired = [
  { ru: 'Продолжаешь ровно с того места, где остановился', uk: 'Продовжуєш саме з того місця, де зупинився', es: 'Sigues justo donde lo dejaste', 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { ru: 'Снова без лимитов и вынужденных пауз', uk: 'Знову без лімітів і вимушених пауз', es: 'De nuevo sin límites ni pausas forzadas', 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { ru: 'Весь твой путь и материалы на месте', uk: 'Весь твій шлях і матеріали на місці', es: 'Todo tu progreso y materiales siguen ahí', 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS.vip_expired = [
  { ru: 'Продолжай со всем, что открыл Plus', uk: 'Продовжуй з усім, що відкрив Plus', es: 'Continúa con todo lo de Plus', 'pt-BR': 'Continue com tudo do Plus', vi: 'Tiếp tục với mọi thứ Plus đã mở', id: 'Lanjut dengan semua dari Plus', tr: 'Plus’ın açtığı her şeyle devam et', pl: 'Kontynuuj ze wszystkim z Plus' },
  { ru: 'Без лимитов на уроки и практику', uk: 'Без лімітів на уроки і практику', es: 'Sin límites en lecciones y práctica', 'pt-BR': 'Sem limites em lições e prática', vi: 'Không giới hạn bài học và luyện tập', id: 'Tanpa batas pelajaran dan latihan', tr: 'Derslerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje i praktykę' },
  { ru: 'Путь без пауз и дневных потолков', uk: 'Шлях без пауз і денних стель', es: 'Camino sin pausas ni techos diarios', 'pt-BR': 'Caminho sem pausas nem tetos diários', vi: 'Lộ trình không dừng và không trần mỗi ngày', id: 'Jalur tanpa jeda dan plafon harian', tr: 'Ara ve günlük tavan olmadan yol', pl: 'Droga bez pauz i dziennych sufitów' },
];

CONTEXT_BENEFITS.notification_upsell = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.lesson_b1 = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.ai_voice_input = [
  { ru: 'Микрофон прямо в поле ответа', uk: 'Мікрофон прямо в полі відповіді', es: 'Micrófono dentro del campo de respuesta', 'pt-BR': 'Microfone direto no campo de resposta', vi: 'Micro ngay trong ô trả lời', id: 'Mikrofon langsung di kolom jawaban', tr: 'Yanıt alanında doğrudan mikrofon', pl: 'Mikrofon bezpośrednio w polu odpowiedzi' },
  { ru: 'Любая реплика превращается в текст', uk: 'Будь-яка репліка перетворюється на текст', es: 'Cualquier respuesta se convierte en texto', 'pt-BR': 'Qualquer fala vira texto', vi: 'Bất kỳ câu nói nào thành văn bản', id: 'Ucapan apa pun jadi teks', tr: 'Her replik metne dönüşür', pl: 'Każda kwestia zmienia się w tekst' },
  { ru: 'Разговорная практика становится живее', uk: 'Розмовна практика стає живішою', es: 'La práctica de conversación se vuelve más real', 'pt-BR': 'A prática de conversa fica mais viva', vi: 'Luyện hội thoại trở nên thật hơn', id: 'Latihan percakapan terasa lebih hidup', tr: 'Konuşma pratiği daha canlı olur', pl: 'Praktyka rozmowy staje się żywsza' },
];

CONTEXT_BENEFITS.dialog_analysis = [
  { ru: 'Разбор появляется на экране завершения', uk: 'Розбір зʼявляється на екрані завершення', es: 'El análisis aparece al terminar', 'pt-BR': 'A análise aparece ao terminar', vi: 'Phân tích xuất hiện ở màn hình kết thúc', id: 'Analisis muncul di layar selesai', tr: 'Analiz bitiş ekranında görünür', pl: 'Analiza pojawia się na ekranie zakończenia' },
  { ru: 'Видно, где фраза звучит неестественно', uk: 'Видно, де фраза звучить неприродно', es: 'Ves qué frase suena poco natural', 'pt-BR': 'Você vê onde a frase soa pouco natural', vi: 'Thấy câu nào nghe chưa tự nhiên', id: 'Terlihat bagian yang kurang alami', tr: 'İfadenin nerede doğal gelmediği görünür', pl: 'Widać, gdzie fraza brzmi nienaturalnie' },
  { ru: 'Есть вариант, как сказать живее', uk: 'Є варіант, як сказати живіше', es: 'Incluye una forma más viva de decirlo', 'pt-BR': 'Inclui uma forma mais viva de dizer', vi: 'Có cách nói tự nhiên hơn', id: 'Ada versi yang lebih hidup', tr: 'Daha canlı söyleme biçimi var', pl: 'Jest żywszy wariant wypowiedzi' },
];

CONTEXT_BENEFITS.dialog_locked_level = [
  { ru: 'Все сценарии по урокам и жизненным ситуациям', uk: 'Усі сценарії за уроками та життєвими ситуаціями', en: 'Every lesson-based and real-life scenario', es: 'Todos los escenarios de lecciones y de la vida real', 'pt-BR': 'Todos os cenários de lições e da vida real', vi: 'Mọi kịch bản từ bài học và đời thực', id: 'Semua skenario dari pelajaran dan kehidupan nyata', tr: 'Derslerden ve gerçek hayattan tüm senaryolar', pl: 'Wszystkie scenariusze z lekcji i życia' },
  { ru: 'Свободные ответы своими словами', uk: 'Вільні відповіді своїми словами', en: 'Open responses in your own words', es: 'Respuestas abiertas con tus propias palabras', 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { ru: 'Подсказки и разбор реплик во время практики', uk: 'Підказки та розбір реплік під час практики', en: 'Guidance and feedback on your replies as you practice', es: 'Ayuda y análisis de tus respuestas durante la práctica', 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS.flashcard_training = [
  { ru: 'Игровая тренировка сохранённых фраз', uk: 'Ігрове тренування збережених фраз', es: 'Entrenamiento lúdico de frases guardadas', 'pt-BR': 'Treino em jogo com frases salvas', vi: 'Luyện dạng trò chơi với câu đã lưu', id: 'Latihan gim untuk frasa tersimpan', tr: 'Kayıtlı ifadelerle oyunlu antrenman', pl: 'Trening zapisanych fraz w formie gry' },
  { ru: 'Слабые карточки вспоминаются активнее', uk: 'Слабкі картки згадуються активніше', es: 'Recuerdas mejor las tarjetas débiles', 'pt-BR': 'Cartões fracos são lembrados de forma ativa', vi: 'Thẻ yếu được nhớ chủ động hơn', id: 'Kartu lemah diingat lebih aktif', tr: 'Zayıf kartlar daha aktif hatırlanır', pl: 'Słabe fiszki wracają aktywniej' },
  { ru: 'Сохранённое превращается в практику', uk: 'Збережене перетворюється на практику', es: 'Lo guardado se convierte en práctica', 'pt-BR': 'O que você salvou vira prática', vi: 'Mục đã lưu biến thành luyện tập', id: 'Simpanan berubah jadi latihan', tr: 'Kaydedilenler pratiğe dönüşür', pl: 'Zapisane rzeczy zmieniają się w praktykę' },
];

export const CONTEXT_BENEFITS_PLANNED: Partial<Record<PremiumContext, PremiumPlannedCopy[]>> & { generic: PremiumPlannedCopy[] } = {
  onboarding_plan: MAIN_COURSE_PLUS_BENEFITS,
  season_pass_lane: SEASON_PASS_LANE_BENEFITS,
  language_add: [
    { 'pt-BR': 'Vários idiomas em uma conta', vi: 'Nhiều ngôn ngữ trong một tài khoản', id: 'Beberapa bahasa dalam satu akun', tr: 'Tek hesapta birden çok dil', pl: 'Kilka języków na jednym koncie' },
    { 'pt-BR': 'Cada idioma com seu plano e progresso', vi: 'Mỗi ngôn ngữ có kế hoạch và tiến độ riêng', id: 'Tiap bahasa punya rencana dan progres sendiri', tr: 'Her dilin kendi planı ve ilerlemesi', pl: 'Każdy język ma własny plan i postęp' },
    { 'pt-BR': 'Troque de idioma com um toque', vi: 'Chuyển ngôn ngữ chỉ với một chạm', id: 'Berpindah bahasa dengan satu ketukan', tr: 'Tek dokunuşla diller arasında geç', pl: 'Przełączaj języki jednym dotknięciem' },
  ],
  no_energy: [
    { 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { 'pt-BR': 'Lição, prática e exame final sem pausas forçadas', vi: 'Bài học, luyện tập và bài cuối không bị dừng ép buộc', id: 'Pelajaran, latihan, dan ujian akhir tanpa jeda paksa', tr: 'Ders, pratik ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, praktyka i egzamin bez wymuszonych przerw' },
    { 'pt-BR': 'Ritmo diário estável sem travar', vi: 'Nhịp học hằng ngày ổn định hơn', id: 'Ritme harian stabil tanpa terhenti', tr: 'Aksamadan istikrarlı günlük ritim', pl: 'Stabilny rytm dnia bez zrywów' },
  ],
  course_after_lesson3: MAIN_COURSE_PLUS_BENEFITS,
  lesson_b1: MAIN_COURSE_PLUS_BENEFITS,
  flashcard_limit: [
    { 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda akibat energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
    { 'pt-BR': 'A sequência não quebra seu ritmo', vi: 'Chuỗi ngày không phá nhịp học của bạn', id: 'Runtutan tidak merusak ritmemu', tr: 'Seri temponu bozmaz', pl: 'Seria nie łamie twojego tempa' },
  ],
  theme: [
    { 'pt-BR': 'Estilo visual do seu jeito', vi: 'Phong cách giao diện theo bạn', id: 'Gaya visual sesuai seleramu', tr: 'Kişisel uygulama stili', pl: 'Osobisty styl aplikacji' },
    { 'pt-BR': 'Mais envolvimento no estudo', vi: 'Gắn bó hơn với việc học', id: 'Lebih terlibat saat belajar', tr: 'Öğrenmeye daha fazla bağlılık', pl: 'Większe zaangażowanie w naukę' },
    { 'pt-BR': 'Mais conforto para estudar sempre', vi: 'Thoải mái hơn để học đều', id: 'Lebih nyaman untuk belajar rutin', tr: 'Düzenli çalışmak daha rahat', pl: 'Wygodniej uczyć się regularnie' },
  ],
  club: [
    { 'pt-BR': 'Clubes e boosts de XP para acelerar', vi: 'Câu lạc bộ và boost XP để tăng tốc', id: 'Klub dan boost XP untuk mempercepat', tr: 'Hızlanmak için kulüpler ve XP boostları', pl: 'Kluby i boosty XP do przyspieszenia' },
    { 'pt-BR': 'Mais valor em cada sessão', vi: 'Mỗi phiên học có ích hơn', id: 'Manfaat lebih besar di tiap sesi', tr: 'Her seanstan daha fazla fayda', pl: 'Więcej wartości z każdej sesji' },
    { 'pt-BR': 'Mais motivação para voltar amanhã', vi: 'Thêm động lực quay lại ngày mai', id: 'Lebih termotivasi untuk kembali besok', tr: 'Yarın dönmek için daha güçlü motivasyon', pl: 'Silniejsza motywacja, żeby wrócić jutro' },
  ],
  generic: [
    { 'pt-BR': 'Mais prática sem limites', vi: 'Nhiều luyện tập hơn, không giới hạn', id: 'Lebih banyak latihan tanpa batas', tr: 'Sınırsız daha fazla pratik', pl: 'Więcej praktyki bez ograniczeń' },
    { 'pt-BR': 'Um próximo passo claro todos os dias', vi: 'Mỗi ngày có bước tiếp theo rõ ràng', id: 'Langkah berikutnya jelas tiap hari', tr: 'Her gün net bir sonraki adım', pl: 'Jasny kolejny krok każdego dnia' },
    { 'pt-BR': 'Funções Plus logo após ativar', vi: 'Tính năng Plus có ngay sau khi kích hoạt', id: 'Fitur Plus langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Plus özellikler', pl: 'Opcje Plus od razu po aktywacji' },
  ],
  mistake_practice: [
    { 'pt-BR': 'Todos os erros de lições e cartões em um só lugar', vi: 'Mọi lỗi từ bài học và thẻ ở một nơi', id: 'Semua kesalahan dari pelajaran dan kartu di satu tempat', tr: 'Ders ve kart hatalarının hepsi tek yerde', pl: 'Wszystkie błędy z lekcji i fiszek w jednym miejscu' },
    { 'pt-BR': 'Palavras e frases se misturam automaticamente', vi: 'Từ và câu được trộn tự động', id: 'Kata dan frasa dicampur otomatis', tr: 'Kelimeler ve ifadeler otomatik karışır', pl: 'Słowa i frazy mieszają się automatycznie' },
    { 'pt-BR': 'Os modos mudam conforme seu progresso', vi: 'Chế độ thay đổi theo tiến độ của bạn', id: 'Mode berubah mengikuti progresmu', tr: 'Modlar ilerlemene göre değişir', pl: 'Tryby zmieniają się wraz z postępem' },
  ],
  mastery: [
    { 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { 'pt-BR': 'Você não gasta pérolas ao repetir lições', vi: 'Không tốn ngọc trai khi học lại bài', id: 'Tidak memakai mutiara saat mengulang pelajaran', tr: 'Ders tekrarında inci harcamazsın', pl: 'Nie wydajesz pereł na powtórki lekcji' },
    { 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { 'pt-BR': 'Pontos de melhoria e temas fracos', vi: 'Điểm cần phát triển và chủ đề yếu', id: 'Titik berkembang dan topik lemah', tr: 'Gelişim noktaları ve zayıf konular', pl: 'Punkty wzrostu i słabsze tematy' },
    { 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { 'pt-BR': 'Pontos de crescimento: o que ainda oscila', vi: 'Điểm cần phát triển: phần còn chưa chắc', id: 'Titik berkembang: bagian yang belum kuat', tr: 'Gelişim noktaları: en çok ne aksıyor', pl: 'Punkty wzrostu: co najczęściej siada' },
    { 'pt-BR': 'Temas e frases específicos para treinar', vi: 'Chủ đề và cụm từ cụ thể để luyện', id: 'Topik dan frasa spesifik untuk dilatih', tr: 'Çalışılacak somut konular ve ifadeler', pl: 'Konkretne tematy i frazy do przećwiczenia' },
    { 'pt-BR': 'Treine o ponto fraco sem dispersar', vi: 'Luyện đúng điểm yếu, không bị phân tán', id: 'Latih bagian lemah tanpa menyebar fokus', tr: 'Dağılmadan zayıf noktayı çalış', pl: 'Trenuj dokładnie słabe miejsce, bez rozproszenia' },
  ],
  percentiles: [
    { 'pt-BR': 'Veja seu ranking entre todos os alunos', vi: 'Xem thứ hạng của bạn trong số học viên', id: 'Lihat peringkatmu di antara semua siswa', tr: 'Tüm öğrenciler arasındaki sıralamanı gör', pl: 'Zobacz swoją pozycję wśród wszystkich uczniów' },
    { 'pt-BR': 'Só comparações positivas para motivar', vi: 'Chỉ so sánh tích cực để tạo động lực', id: 'Hanya perbandingan positif untuk motivasi', tr: 'Motivasyon için yalnızca pozitif karşılaştırmalar', pl: 'Tylko pozytywne porównania dla motywacji' },
    { 'pt-BR': 'Você sabe onde se destaca e onde crescer', vi: 'Biết bạn mạnh ở đâu và nên phát triển gì', id: 'Tahu di mana kamu unggul dan perlu berkembang', tr: 'Nerede güçlü olduğunu ve nereye büyüyeceğini bilirsin', pl: 'Wiesz, gdzie jesteś mocny i gdzie rosnąć dalej' },
  ],
};

CONTEXT_BENEFITS_PLANNED.ai_explain = [
  { 'pt-BR': 'Análise de cada erro logo após responder', vi: 'Phân tích từng lỗi ngay sau khi trả lời', id: 'Analisis tiap kesalahan langsung setelah menjawab', tr: 'Her hatanın yanıttan hemen sonra analizi', pl: 'Analiza każdego błędu zaraz po odpowiedzi' },
  { 'pt-BR': 'Claro: o que falhou, por quê e como corrigir', vi: 'Rõ ràng: sai ở đâu, vì sao và nói đúng thế nào', id: 'Jelas: apa yang salah, kenapa, dan cara benarnya', tr: 'Net: ne yanlış, neden ve doğrusu nasıl', pl: 'Jasno: co nie tak, dlaczego i jak poprawnie' },
  { 'pt-BR': 'Sem limite diário de explicações', vi: 'Không giới hạn lượt giải thích mỗi ngày', id: 'Tanpa batas penjelasan harian', tr: 'Günlük açıklama sınırı yok', pl: 'Bez dziennego limitu wyjaśnień' },
];

CONTEXT_BENEFITS_PLANNED.weekly_review = [
  { 'pt-BR': 'Resumo pessoal: pontos fortes e lacunas', vi: 'Tổng kết tuần cá nhân: điểm mạnh và lỗ hổng', id: 'Rangkuman pribadi: kekuatan dan celah', tr: 'Kişisel hafta özeti: güçlü yanlar ve eksikler', pl: 'Osobiste podsumowanie tygodnia: mocne strony i luki' },
  { 'pt-BR': 'Um plano claro para a próxima semana', vi: 'Kế hoạch rõ ràng cho tuần tới', id: 'Rencana jelas untuk minggu depan', tr: 'Gelecek hafta için net plan', pl: 'Jasny plan na kolejny tydzień' },
  { 'pt-BR': 'Lições recomendadas conforme seus erros', vi: 'Bài học đề xuất theo lỗi của bạn', id: 'Pelajaran rekomendasi sesuai kesalahanmu', tr: 'Hatalarına göre önerilen dersler', pl: 'Lekcje polecane pod twoje błędy' },
];

CONTEXT_BENEFITS_PLANNED.avatar_aura = [
  { 'pt-BR': 'Aura no avatar: visível em ligas e listas', vi: 'Hào quang quanh avatar — nổi bật trong giải và danh sách', id: 'Aura di avatar: terlihat di liga dan daftar', tr: 'Avatarında aura — liglerde ve listelerde görünürsün', pl: 'Aura wokół awatara — widoczny w ligach i na listach' },
  { 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS_PLANNED.speaking = [
  { 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS_PLANNED.dialog_limit = [
  { 'pt-BR': 'Todos os cenários de lições e da vida real', vi: 'Mọi kịch bản từ bài học và đời thực', id: 'Semua skenario dari pelajaran dan kehidupan nyata', tr: 'Derslerden ve gerçek hayattan tüm senaryolar', pl: 'Wszystkie scenariusze z lekcji i życia' },
  { 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS_PLANNED.intro_ended = [
  { 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { 'pt-BR': 'Lições, prática e treinador sem pausas nem limites', vi: 'Bài học, luyện tập và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, latihan, dan trainer tanpa jeda dan batas', tr: 'Dersler, pratik ve antrenör arasız ve sınırsız', pl: 'Lekcje, praktyka i trener bez przerw i limitów' },
  { 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

CONTEXT_BENEFITS_PLANNED.level_up = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS_PLANNED.premium_expired = [
  { 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS_PLANNED.vip_expired = [
  { 'pt-BR': 'Continue com tudo do Plus', vi: 'Tiếp tục với mọi thứ Plus đã mở', id: 'Lanjut dengan semua dari Plus', tr: 'Plus’ın açtığı her şeyle devam et', pl: 'Kontynuuj ze wszystkim z Plus' },
  { 'pt-BR': 'Sem limites em lições e prática', vi: 'Không giới hạn bài học và luyện tập', id: 'Tanpa batas pelajaran dan latihan', tr: 'Derslerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje i praktykę' },
  { 'pt-BR': 'Caminho sem pausas nem tetos diários', vi: 'Lộ trình không dừng và không trần mỗi ngày', id: 'Jalur tanpa jeda dan plafon harian', tr: 'Ara ve günlük tavan olmadan yol', pl: 'Droga bez pauz i dziennych sufitów' },
];

CONTEXT_BENEFITS_PLANNED.notification_upsell = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS_PLANNED.lesson_b1 = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS_PLANNED.ai_voice_input = [
  { 'pt-BR': 'Microfone direto no campo de resposta', vi: 'Micro ngay trong ô trả lời', id: 'Mikrofon langsung di kolom jawaban', tr: 'Yanıt alanında doğrudan mikrofon', pl: 'Mikrofon bezpośrednio w polu odpowiedzi' },
  { 'pt-BR': 'Qualquer fala vira texto', vi: 'Bất kỳ câu nói nào thành văn bản', id: 'Ucapan apa pun jadi teks', tr: 'Her replik metne dönüşür', pl: 'Każda kwestia zmienia się w tekst' },
  { 'pt-BR': 'A prática de conversa fica mais viva', vi: 'Luyện hội thoại trở nên thật hơn', id: 'Latihan percakapan terasa lebih hidup', tr: 'Konuşma pratiği daha canlı olur', pl: 'Praktyka rozmowy staje się żywsza' },
];

CONTEXT_BENEFITS_PLANNED.dialog_analysis = [
  { 'pt-BR': 'A análise aparece ao terminar', vi: 'Phân tích xuất hiện ở màn hình kết thúc', id: 'Analisis muncul di layar selesai', tr: 'Analiz bitiş ekranında görünür', pl: 'Analiza pojawia się na ekranie zakończenia' },
  { 'pt-BR': 'Você vê onde a frase soa pouco natural', vi: 'Thấy câu nào nghe chưa tự nhiên', id: 'Terlihat bagian yang kurang alami', tr: 'İfadenin nerede doğal gelmediği görünür', pl: 'Widać, gdzie fraza brzmi nienaturalnie' },
  { 'pt-BR': 'Inclui uma forma mais viva de dizer', vi: 'Có cách nói tự nhiên hơn', id: 'Ada versi yang lebih hidup', tr: 'Daha canlı söyleme biçimi var', pl: 'Jest żywszy wariant wypowiedzi' },
];

CONTEXT_BENEFITS_PLANNED.dialog_locked_level = [
  { 'pt-BR': 'Todos os cenários de lições e da vida real', vi: 'Mọi kịch bản từ bài học và đời thực', id: 'Semua skenario dari pelajaran dan kehidupan nyata', tr: 'Derslerden ve gerçek hayattan tüm senaryolar', pl: 'Wszystkie scenariusze z lekcji i życia' },
  { 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS_PLANNED.flashcard_training = [
  { 'pt-BR': 'Treino em jogo com frases salvas', vi: 'Luyện dạng trò chơi với câu đã lưu', id: 'Latihan gim untuk frasa tersimpan', tr: 'Kayıtlı ifadelerle oyunlu antrenman', pl: 'Trening zapisanych fraz w formie gry' },
  { 'pt-BR': 'Cartões fracos são lembrados de forma ativa', vi: 'Thẻ yếu được nhớ chủ động hơn', id: 'Kartu lemah diingat lebih aktif', tr: 'Zayıf kartlar daha aktif hatırlanır', pl: 'Słabe fiszki wracają aktywniej' },
  { 'pt-BR': 'O que você salvou vira prática', vi: 'Mục đã lưu biến thành luyện tập', id: 'Simpanan berubah jadi latihan', tr: 'Kaydedilenler pratiğe dönüşür', pl: 'Zapisane rzeczy zmieniają się w praktykę' },
];

// ── Аудит «пейволы-объясняют» (2026-07-25): новые контексты вместо generic ────
// зачем: free_lessons_complete раньше падали в generic («Учись
// быстрее с Plus») — юзер не понимал, почему экран появился; winback показывал
// streak-копию про сгоревшую серию; referral_ended шёл как generic.

PAYWALL_COPY.free_lessons_complete = COURSE_AFTER_LESSON3_COPY;
PAYWALL_PLANNED_COPY.free_lessons_complete = COURSE_AFTER_LESSON3_PLANNED_COPY;
CONTEXT_BENEFITS.free_lessons_complete = MAIN_COURSE_PLUS_BENEFITS;
CONTEXT_BENEFITS_PLANNED.free_lessons_complete = MAIN_COURSE_PLUS_BENEFITS;

PAYWALL_COPY.winback = {
  titleRu: 'С возвращением',
  titleUk: 'З поверненням',
  titleEs: 'Qué bien verte de nuevo',
  subtitleRu: 'Начать заново проще с открытым курсом. Plus снимает паузы — легче войти в ритм и не выпадать.',
  subtitleUk: 'Почати знову простіше з відкритим курсом. Plus прибирає паузи — легше увійти в ритм і не випадати.',
  subtitleEs: 'Volver es más fácil con el curso abierto. Plus quita las pausas: entras en ritmo y no lo pierdes.',
};
PAYWALL_PLANNED_COPY.winback = {
  title: { 'pt-BR': 'Que bom ver você de novo', vi: 'Mừng bạn quay lại', id: 'Senang kamu kembali', tr: 'Yeniden hoş geldin', pl: 'Dobrze, że wracasz' },
  subtitle: {
    'pt-BR': 'Recomeçar é mais fácil com o curso aberto. O Plus tira as pausas: você entra no ritmo e não o perde.',
    vi: 'Bắt đầu lại dễ hơn khi khóa học mở sẵn. Plus bỏ các quãng dừng — dễ vào nhịp và không rớt lại.',
    id: 'Memulai lagi lebih mudah dengan kursus terbuka. Plus menghapus jeda: mudah masuk ritme dan bertahan.',
    tr: 'Açık bir kursla yeniden başlamak daha kolay. Plus duraklamaları kaldırır: ritme girer ve düşmezsin.',
    pl: 'Łatwiej zacząć od nowa z otwartym kursem. Plus usuwa pauzy: wchodzisz w rytm i z niego nie wypadasz.',
  },
};
CONTEXT_BENEFITS.winback = [
  { ru: 'Всё открыто с первого дня', uk: 'Все відкрито з першого дня', es: 'Todo abierto desde el primer día', 'pt-BR': 'Tudo aberto desde o primeiro dia', vi: 'Mở tất cả từ ngày đầu', id: 'Semua terbuka sejak hari pertama', tr: 'İlk günden her şey açık', pl: 'Wszystko otwarte od pierwszego dnia' },
  { ru: 'Тренер сам подберёт, что вспомнить', uk: 'Тренер сам добере, що згадати', es: 'El entrenador elige qué repasar', 'pt-BR': 'O treinador escolhe o que relembrar', vi: 'Huấn luyện viên tự chọn phần cần nhớ lại', id: 'Trainer memilihkan yang perlu diingat', tr: 'Antrenör neyi hatırlayacağını seçer', pl: 'Trener sam dobierze, co przypomnieć' },
  { ru: 'Занятия без пауз энергии', uk: 'Заняття без пауз енергії', es: 'Sesiones sin pausas de energía', 'pt-BR': 'Sessões sem pausas de energia', vi: 'Học không gián đoạn vì năng lượng', id: 'Belajar tanpa jeda energi', tr: 'Enerji molasız çalışma', pl: 'Nauka bez przerw na energię' },
];
CONTEXT_BENEFITS_PLANNED.winback = [
  { 'pt-BR': 'Tudo aberto desde o primeiro dia', vi: 'Mở tất cả từ ngày đầu', id: 'Semua terbuka sejak hari pertama', tr: 'İlk günden her şey açık', pl: 'Wszystko otwarte od pierwszego dnia' },
  { 'pt-BR': 'O treinador escolhe o que relembrar', vi: 'Huấn luyện viên tự chọn phần cần nhớ lại', id: 'Trainer memilihkan yang perlu diingat', tr: 'Antrenör neyi hatırlayacağını seçer', pl: 'Trener sam dobierze, co przypomnieć' },
  { 'pt-BR': 'Sessões sem pausas de energia', vi: 'Học không gián đoạn vì năng lượng', id: 'Belajar tanpa jeda energi', tr: 'Enerji molasız çalışma', pl: 'Nauka bez przerw na energię' },
];

PAYWALL_COPY.referral_ended = {
  titleRu: 'Подарочный доступ закончился',
  titleUk: 'Подарунковий доступ завершився',
  titleEs: 'Tu acceso de regalo terminó',
  subtitleRu: 'Ты видел, как идёт с полным доступом. Plus возвращает его насовсем.',
  subtitleUk: 'Ти бачив, як іде з повним доступом. Plus повертає його назавжди.',
  subtitleEs: 'Ya viste cómo va con acceso completo. Plus lo devuelve para siempre.',
};
PAYWALL_PLANNED_COPY.referral_ended = {
  title: { 'pt-BR': 'Seu acesso de presente acabou', vi: 'Quyền truy cập quà tặng đã hết', id: 'Akses hadiah sudah berakhir', tr: 'Hediye erişimin sona erdi', pl: 'Dostęp z prezentu się skończył' },
  subtitle: {
    'pt-BR': 'Você viu como é com acesso completo. O Plus devolve isso para sempre.',
    vi: 'Bạn đã thấy học với toàn quyền là thế nào. Plus mang nó trở lại mãi mãi.',
    id: 'Kamu sudah merasakan akses penuh. Plus mengembalikannya untuk selamanya.',
    tr: 'Tam erişimle nasıl gittiğini gördün. Plus onu kalıcı olarak geri getirir.',
    pl: 'Widziałeś, jak idzie z pełnym dostępem. Plus przywraca go na stałe.',
  },
};
CONTEXT_BENEFITS.referral_ended = [
  { ru: 'Всё, чем ты пользовался, снова открыто', uk: 'Усе, чим ти користувався, знову відкрито', es: 'Todo lo que usabas, abierto otra vez', 'pt-BR': 'Tudo o que você usava, aberto de novo', vi: 'Mọi thứ bạn từng dùng lại mở', id: 'Semua yang kamu pakai terbuka lagi', tr: 'Kullandığın her şey yeniden açık', pl: 'Wszystko, z czego korzystałeś, znów otwarte' },
  { ru: 'Прогресс и серия продолжаются без пауз', uk: 'Прогрес і серія тривають без пауз', es: 'Tu progreso y racha siguen sin pausas', 'pt-BR': 'Progresso e sequência seguem sem pausas', vi: 'Tiến độ và chuỗi ngày tiếp tục không gián đoạn', id: 'Progres dan runtutan lanjut tanpa jeda', tr: 'İlerleme ve seri arasız devam eder', pl: 'Postęp i seria trwają bez przerw' },
  { ru: 'Диалоги и тренировки — без стопов', uk: 'Діалоги й тренування — без стопів', es: 'Diálogos y entrenamientos sin bloqueos', 'pt-BR': 'Diálogos e treinos sem travas', vi: 'Hội thoại và luyện tập không bị chặn', id: 'Dialog dan latihan tanpa hambatan', tr: 'Diyaloglar ve antrenmanlar duraksız', pl: 'Dialogi i treningi bez blokad' },
];
CONTEXT_BENEFITS_PLANNED.referral_ended = [
  { 'pt-BR': 'Tudo o que você usava, aberto de novo', vi: 'Mọi thứ bạn từng dùng lại mở', id: 'Semua yang kamu pakai terbuka lagi', tr: 'Kullandığın her şey yeniden açık', pl: 'Wszystko, z czego korzystałeś, znów otwarte' },
  { 'pt-BR': 'Progresso e sequência seguem sem pausas', vi: 'Tiến độ và chuỗi ngày tiếp tục không gián đoạn', id: 'Progres dan runtutan lanjut tanpa jeda', tr: 'İlerleme ve seri arasız devam eder', pl: 'Postęp i seria trwają bez przerw' },
  { 'pt-BR': 'Diálogos e treinos sem travas', vi: 'Hội thoại và luyện tập không bị chặn', id: 'Dialog dan latihan tanpa hambatan', tr: 'Diyaloglar ve antrenmanlar duraksız', pl: 'Dialogi i treningi bez blokad' },
];

/**
 * Арена: дневная попытка израсходована (владелец 2026-09-14, 1 матч/сутки).
 *
 * зачем именно такой текст: человек только что СЫГРАЛ и вошёл во вкус — это
 * не упрёк «ты упёрся в лимит», а продолжение азарта. Поэтому говорим про
 * следующий матч, а не про запрет.
 */
PAYWALL_COPY.arena_limit = {
  titleRu: 'Матч на сегодня сыгран',
  titleUk: 'Матч на сьогодні зіграно',
  titleEs: 'Ya jugaste la partida de hoy',
  subtitleRu: 'С Plus следующий соперник ждёт сразу — без паузы до завтра.',
  subtitleUk: 'З Plus наступний суперник чекає одразу — без паузи до завтра.',
  subtitleEs: 'Con Plus el siguiente rival te espera ya, sin esperar a mañana.',
};
PAYWALL_PLANNED_COPY.arena_limit = {
  title: {
    'pt-BR': 'A partida de hoje já foi', vi: 'Trận hôm nay đã xong',
    id: 'Laga hari ini sudah dimainkan', tr: 'Bugünkü maç oynandı',
    pl: 'Dzisiejszy mecz rozegrany',
  },
  subtitle: {
    'pt-BR': 'Com o Plus o próximo adversário já espera, sem pausa até amanhã.',
    vi: 'Với Plus, đối thủ tiếp theo chờ sẵn — không phải đợi đến mai.',
    id: 'Dengan Plus lawan berikutnya langsung menunggu, tanpa jeda sampai besok.',
    tr: 'Plus ile sonraki rakip hemen hazır, yarına kadar beklemek yok.',
    pl: 'Z Plus następny rywal czeka od razu — bez pauzy do jutra.',
  },
};
CONTEXT_BENEFITS.arena_limit = [
  { ru: 'Матчи один за другим, без дневного потолка', uk: 'Матчі один за одним, без денної стелі', es: 'Partidas seguidas, sin tope diario', 'pt-BR': 'Partidas seguidas, sem teto diário', vi: 'Đấu liên tục, không giới hạn mỗi ngày', id: 'Laga beruntun, tanpa batas harian', tr: 'Arka arkaya maç, günlük sınır yok', pl: 'Mecze jeden po drugim, bez dziennego limitu' },
  { ru: 'Рейтинг растёт быстрее — больше матчей в неделю', uk: 'Рейтинг росте швидше — більше матчів на тиждень', es: 'Tu rango sube más rápido: más partidas por semana', 'pt-BR': 'Seu ranking sobe mais rápido: mais partidas por semana', vi: 'Thứ hạng lên nhanh hơn nhờ nhiều trận mỗi tuần', id: 'Peringkat naik lebih cepat: lebih banyak laga tiap pekan', tr: 'Derecen daha hızlı yükselir: haftada daha çok maç', pl: 'Ranking rośnie szybciej — więcej meczów w tygodniu' },
  { ru: 'Занятия и тренировки — тоже без стопов', uk: 'Заняття й тренування — теж без стопів', es: 'Lecciones y entrenamientos, también sin bloqueos', 'pt-BR': 'Lições e treinos também sem travas', vi: 'Bài học và luyện tập cũng không bị chặn', id: 'Pelajaran dan latihan juga tanpa hambatan', tr: 'Dersler ve antrenmanlar da duraksız', pl: 'Lekcje i treningi też bez blokad' },
];
CONTEXT_BENEFITS_PLANNED.arena_limit = [
  { 'pt-BR': 'Partidas seguidas, sem teto diário', vi: 'Đấu liên tục, không giới hạn mỗi ngày', id: 'Laga beruntun, tanpa batas harian', tr: 'Arka arkaya maç, günlük sınır yok', pl: 'Mecze jeden po drugim, bez dziennego limitu' },
  { 'pt-BR': 'Seu ranking sobe mais rápido: mais partidas por semana', vi: 'Thứ hạng lên nhanh hơn nhờ nhiều trận mỗi tuần', id: 'Peringkat naik lebih cepat: lebih banyak laga tiap pekan', tr: 'Derecen daha hızlı yükselir: haftada daha çok maç', pl: 'Ranking rośnie szybciej — więcej meczów w tygodniu' },
  { 'pt-BR': 'Lições e treinos também sem travas', vi: 'Bài học và luyện tập cũng không bị chặn', id: 'Pelajaran dan latihan juga tanpa hambatan', tr: 'Dersler ve antrenmanlar da duraksız', pl: 'Lekcje i treningi też bez blokad' },
];

// ── Мастерская: создание своей карточки и своего набора (2026-08-27) ────────
// зачем: гейт создания подставлял чужие контексты — 'flashcard_limit'
// («20 из 20 — база собрана») на создание карточки и 'flashcard_training'
// («Тренировка карточек — в Plus») на создание набора. Человек, который просто
// нажал «создать», читал упрёк про исчерпанный лимит или рекламу режима, к
// которому он не обращался. Теперь у каждого действия свой честный текст.

PAYWALL_COPY.flashcard_create = {
  titleRu: 'Своя карточка — в Plus',
  titleUk: 'Своя картка — у Plus',
  titleEs: 'Tus propias tarjetas en Plus',
  subtitleRu: 'Plus открывает мастерскую: добавляй свои фразы с переводом и учи именно то, что нужно тебе.',
  subtitleUk: 'Plus відкриває майстерню: додавай свої фрази з перекладом і вивчай саме те, що потрібно тобі.',
  subtitleEs: 'Plus abre el taller: añade tus propias frases con traducción y estudia justo lo que necesitas.',
};

PAYWALL_PLANNED_COPY.flashcard_create = {
  title: {
    'pt-BR': 'Seus próprios cartões no Plus',
    vi: 'Thẻ tự tạo trong Plus',
    id: 'Kartu buatanmu di Plus',
    tr: 'Kendi kartların Plus’ta',
    pl: 'Własne fiszki w Plus',
  },
  subtitle: {
    'pt-BR': 'O Plus abre a oficina: adicione suas frases com tradução e estude exatamente o que você precisa.',
    vi: 'Plus mở xưởng thẻ: thêm cụm từ của bạn kèm bản dịch và học đúng thứ bạn cần.',
    id: 'Plus membuka bengkel kartu: tambahkan frasamu dengan terjemahan dan pelajari persis yang kamu butuhkan.',
    tr: 'Plus atölyeyi açar: kendi ifadelerini çevirisiyle ekle ve tam ihtiyacın olanı çalış.',
    pl: 'Plus otwiera warsztat: dodawaj własne frazy z tłumaczeniem i ucz się dokładnie tego, czego potrzebujesz.',
  },
};

CONTEXT_BENEFITS.flashcard_create = [
  { ru: 'Свои фразы с переводом и озвучкой', uk: 'Свої фрази з перекладом і озвучкою', es: 'Tus frases con traducción y audio', 'pt-BR': 'Suas frases com tradução e áudio', vi: 'Cụm từ của bạn kèm bản dịch và audio', id: 'Frasamu dengan terjemahan dan audio', tr: 'Kendi ifadelerin çeviri ve sesle', pl: 'Własne frazy z tłumaczeniem i audio' },
  { ru: 'Учишь то, что нужно именно тебе', uk: 'Вчиш те, що потрібно саме тобі', es: 'Aprendes justo lo que te hace falta', 'pt-BR': 'Você estuda exatamente o que precisa', vi: 'Học đúng thứ bạn cần', id: 'Belajar persis yang kamu butuhkan', tr: 'Tam sana gerekeni öğrenirsin', pl: 'Uczysz się dokładnie tego, czego potrzebujesz' },
  { ru: 'Созданное остаётся у тебя навсегда', uk: 'Створене залишається в тебе назавжди', es: 'Lo que creas se queda contigo para siempre', 'pt-BR': 'O que você cria fica com você para sempre', vi: 'Thứ bạn tạo ở lại với bạn mãi mãi', id: 'Yang kamu buat tetap milikmu selamanya', tr: 'Oluşturduğun her şey sonsuza dek sende kalır', pl: 'To, co stworzysz, zostaje z tobą na zawsze' },
];

CONTEXT_BENEFITS_PLANNED.flashcard_create = [
  { 'pt-BR': 'Suas frases com tradução e áudio', vi: 'Cụm từ của bạn kèm bản dịch và audio', id: 'Frasamu dengan terjemahan dan audio', tr: 'Kendi ifadelerin çeviri ve sesle', pl: 'Własne frazy z tłumaczeniem i audio' },
  { 'pt-BR': 'Você estuda exatamente o que precisa', vi: 'Học đúng thứ bạn cần', id: 'Belajar persis yang kamu butuhkan', tr: 'Tam sana gerekeni öğrenirsin', pl: 'Uczysz się dokładnie tego, czego potrzebujesz' },
  { 'pt-BR': 'O que você cria fica com você para sempre', vi: 'Thứ bạn tạo ở lại với bạn mãi mãi', id: 'Yang kamu buat tetap milikmu selamanya', tr: 'Oluşturduğun her şey sonsuza dek sende kalır', pl: 'To, co stworzysz, zostaje z tobą na zawsze' },
];

PAYWALL_COPY.pack_create = {
  titleRu: 'Свой набор — в Plus',
  titleUk: 'Свій набір — у Plus',
  titleEs: 'Tus propios mazos en Plus',
  subtitleRu: 'Plus открывает мастерскую наборов: собери свою колоду под поездку, работу или сериал — и учи её целиком.',
  subtitleUk: 'Plus відкриває майстерню наборів: збери свою колоду під поїздку, роботу чи серіал — і вчи її цілком.',
  subtitleEs: 'Plus abre el taller de mazos: arma tu colección para un viaje, el trabajo o una serie y estúdiala entera.',
};

PAYWALL_PLANNED_COPY.pack_create = {
  title: {
    'pt-BR': 'Seus próprios baralhos no Plus',
    vi: 'Bộ thẻ của riêng bạn trong Plus',
    id: 'Set buatanmu di Plus',
    tr: 'Kendi setlerin Plus’ta',
    pl: 'Własne zestawy w Plus',
  },
  subtitle: {
    'pt-BR': 'O Plus abre a oficina de baralhos: monte sua coleção para uma viagem, o trabalho ou uma série e estude inteira.',
    vi: 'Plus mở xưởng bộ thẻ: tạo bộ riêng cho chuyến đi, công việc hay bộ phim — và học trọn bộ.',
    id: 'Plus membuka bengkel set: susun koleksimu untuk perjalanan, pekerjaan, atau serial, lalu pelajari seluruhnya.',
    tr: 'Plus set atölyesini açar: gezi, iş ya da bir dizi için kendi desteni kur ve baştan sona çalış.',
    pl: 'Plus otwiera warsztat zestawów: złóż własną talię na wyjazd, pracę lub serial i ucz się jej w całości.',
  },
};

CONTEXT_BENEFITS.pack_create = [
  { ru: 'Своя колода под поездку, работу или сериал', uk: 'Своя колода під поїздку, роботу чи серіал', es: 'Tu mazo para un viaje, el trabajo o una serie', 'pt-BR': 'Seu baralho para viagem, trabalho ou série', vi: 'Bộ thẻ riêng cho chuyến đi, công việc hay phim', id: 'Set sendiri untuk perjalanan, kerja, atau serial', tr: 'Gezi, iş ya da dizi için kendi kart desten', pl: 'Własna talia na wyjazd, pracę lub serial' },
  { ru: 'Фразы собраны в одном месте, а не вразброс', uk: 'Фрази зібрані в одному місці, а не врозсип', es: 'Las frases juntas en un sitio, no dispersas', 'pt-BR': 'Frases reunidas em um lugar, não espalhadas', vi: 'Các câu gom một chỗ, không rải rác', id: 'Frasa terkumpul di satu tempat, tidak berserak', tr: 'İfadeler dağınık değil, tek yerde toplu', pl: 'Frazy w jednym miejscu, a nie porozrzucane' },
  { ru: 'Набор можно учить целиком и делиться им', uk: 'Набір можна вчити цілком і ділитися ним', es: 'Estudia el mazo entero y compártelo', 'pt-BR': 'Estude o baralho inteiro e compartilhe', vi: 'Học trọn bộ và chia sẻ nó', id: 'Pelajari set utuh dan bagikan', tr: 'Seti baştan sona çalış ve paylaş', pl: 'Ucz się całego zestawu i dziel się nim' },
];

CONTEXT_BENEFITS_PLANNED.pack_create = [
  { 'pt-BR': 'Seu baralho para viagem, trabalho ou série', vi: 'Bộ thẻ riêng cho chuyến đi, công việc hay phim', id: 'Set sendiri untuk perjalanan, kerja, atau serial', tr: 'Gezi, iş ya da dizi için kendi kart desten', pl: 'Własna talia na wyjazd, pracę lub serial' },
  { 'pt-BR': 'Frases reunidas em um lugar, não espalhadas', vi: 'Các câu gom một chỗ, không rải rác', id: 'Frasa terkumpul di satu tempat, tidak berserak', tr: 'İfadeler dağınık değil, tek yerde toplu', pl: 'Frazy w jednym miejscu, a nie porozrzucane' },
  { 'pt-BR': 'Estude o baralho inteiro e compartilhe', vi: 'Học trọn bộ và chia sẻ nó', id: 'Pelajari set utuh dan bagikan', tr: 'Seti baştan sona çalış ve paylaş', pl: 'Ucz się całego zestawu i dziel się nim' },
];

export function getContextBenefitPlanned(ctx: PremiumContext, index: number): PremiumPlannedCopy {
  const rows = CONTEXT_BENEFITS_PLANNED[ctx] ?? CONTEXT_BENEFITS_PLANNED.generic;
  return rows[index] ?? CONTEXT_BENEFITS_PLANNED.generic[Math.min(index, CONTEXT_BENEFITS_PLANNED.generic.length - 1)];
}


/** Per-screen хелпер локализации: LP(ru, uk, en, es, planned) с языком экрана. */
export function makeLP(lang: Lang) {
  return (ru: string, uk: string, en: string, es: string, planned: PremiumPlannedCopy): string =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': planned['pt-BR'], vi: planned.vi, id: planned.id, tr: planned.tr, pl: planned.pl });
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
