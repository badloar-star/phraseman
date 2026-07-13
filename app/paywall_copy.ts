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

export type PremiumPlannedCopy = {
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
  arena: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
  no_energy: { accent: '#FFE86A', accent2: '#64B4FF', shardAmount: 80 },
  course_after_lesson3: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  lesson_b1: { accent: '#38BDF8', accent2: '#FACC15', shardAmount: 180 },
  quiz_limit: { accent: '#C8FF00', accent2: '#66E6FF', shardAmount: 80 },
  quiz_level: { accent: '#7DD3FC', accent2: '#A78BFA', shardAmount: 180 },
  quiz_medium: { accent: '#FDBA74', accent2: '#C8FF00', shardAmount: 180 },
  quiz_hard: { accent: '#C084FC', accent2: '#FF6BB5', shardAmount: 420 },
  flashcard_limit: { accent: '#8BD3FF', accent2: '#FDE68A', shardAmount: 80 },
  flashcard_training: { accent: '#8BD3FF', accent2: '#A78BFA', shardAmount: 180 },
  flashcard_autoplay: { accent: '#FDE68A', accent2: '#60A5FA', shardAmount: 180 },
  streak: { accent: '#FFB020', accent2: '#FF5C5C', shardAmount: 180 },
  theme: { accent: '#F0ABFC', accent2: '#67E8F9', shardAmount: 180 },
  club: { accent: '#FACC15', accent2: '#22C55E', shardAmount: 420 },
  trainer: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  trainer_limit: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  dialog_limit: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
  dialog_locked_level: { accent: '#58D6FF', accent2: '#FACC15', shardAmount: 180 },
  dialog_analysis: { accent: '#5EEAD4', accent2: '#F87171', shardAmount: 180 },
  ai_voice_input: { accent: '#67E8F9', accent2: '#A78BFA', shardAmount: 180 },
  diagnosis_training: { accent: '#5EEAD4', accent2: '#60A5FA', shardAmount: 180 },
  mastery: { accent: '#86EFAC', accent2: '#FDE68A', shardAmount: 420 },
  stats: { accent: '#60A5FA', accent2: '#FDE68A', shardAmount: 180 },
  heatmap: { accent: '#34D399', accent2: '#A3E635', shardAmount: 180 },
  patterns: { accent: '#F87171', accent2: '#C084FC', shardAmount: 180 },
  percentiles: { accent: '#FACC15', accent2: '#38BDF8', shardAmount: 420 },
  personal_plan: { accent: '#72E6A9', accent2: '#66A8FF', shardAmount: 420 },
  intro_ended: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  level_up: { accent: '#FACC15', accent2: '#A78BFA', shardAmount: 180 },
  smart_trainer: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  speaking: { accent: '#5EEAD4', accent2: '#A78BFA', shardAmount: 180 },
  premium_expired: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  vip_expired: { accent: '#FACC15', accent2: '#F0ABFC', shardAmount: 420 },
  notification_upsell: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 180 },
  language_add: { accent: '#66A8FF', accent2: '#5EEAD4', shardAmount: 180 },
  ai_explain: { accent: '#FDE68A', accent2: '#A78BFA', shardAmount: 180 },
  weekly_review: { accent: '#72E6A9', accent2: '#FDE68A', shardAmount: 180 },
  first_lesson_success: { accent: '#F5C76B', accent2: '#72E6A9', shardAmount: 180 },
  free_lessons_complete: { accent: '#F5C76B', accent2: '#66A8FF', shardAmount: 420 },
  dialog_repeat_success: { accent: '#F5C76B', accent2: '#58D6FF', shardAmount: 180 },
  streak_milestone: { accent: '#F5C76B', accent2: '#FF8A5C', shardAmount: 180 },
  trainer_repeat_success: { accent: '#F5C76B', accent2: '#A78BFA', shardAmount: 180 },
  avatar_aura: { accent: '#E879F9', accent2: '#38BDF8', shardAmount: 180 },
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

const COURSE_AFTER_LESSON3_COPY: PaywallCopy = {
  titleRu: 'Открой полный доступ к Phraseman',
  titleUk: 'Відкрий повний доступ до Phraseman',
  titleEs: 'Obtén acceso completo a Phraseman',
  subtitleRu: 'Plus открывает доступ ко всем урокам, безлимитную практику и все возможности Plus.',
  subtitleUk: 'Plus відкриває доступ до всіх уроків, безлімітної практики та всіх можливостей Plus.',
  subtitleEs: 'Plus te da acceso a todas las lecciones, práctica ilimitada y todas las funciones de Plus.',
};
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'Tenha acesso completo ao Phraseman',
    vi: 'Mở toàn quyền truy cập Phraseman',
    id: 'Buka akses penuh ke Phraseman',
    tr: "Phraseman'a tam erişimi aç",
    pl: 'Odblokuj pełny dostęp do Phraseman',
  },
  subtitle: {
    'pt-BR': 'O Plus dá acesso a todas as lições, prática ilimitada e todos os recursos Plus.',
    vi: 'Plus cho bạn quyền truy cập vào tất cả bài học, luyện tập không giới hạn và mọi tính năng Plus.',
    id: 'Plus memberi akses ke semua pelajaran, latihan tanpa batas, dan semua fitur Plus.',
    tr: 'Plus, tüm derslere, sınırsız pratiğe ve tüm Plus özelliklerine erişim sağlar.',
    pl: 'Plus zapewnia dostęp do wszystkich lekcji, nieograniczonej praktyki i wszystkich funkcji Plus.',
  },
};

const LESSON_B1_COPY: PaywallCopy = {
  titleRu: 'Открой уроки B1 без ожидания',
  titleUk: 'Відкрий уроки B1 без очікування',
  titleEs: 'Abre las lecciones B1 sin esperar',
  subtitleRu: 'Plus открывает доступ к B1, когда ты уже готов идти дальше: больше живых тем, сложнее фразы и практика без искусственной паузы.',
  subtitleUk: 'Plus відкриває доступ до B1, коли ти вже готовий рухатися далі: більше живих тем, складніші фрази й практика без штучної паузи.',
  subtitleEs: 'Plus abre B1 cuando ya estás listo para avanzar: temas más reales, frases más difíciles y práctica sin pausa artificial.',
};

const LESSON_B1_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'Abra as lições B1 sem esperar',
    vi: 'Mở bài học B1 không cần chờ',
    id: 'Buka pelajaran B1 tanpa menunggu',
    tr: 'B1 derslerini beklemeden aç',
    pl: 'Otwórz lekcje B1 bez czekania',
  },
  subtitle: {
    'pt-BR': 'O Plus abre o B1 quando você já está pronto para avançar: temas mais reais, frases mais difíceis e prática sem pausa artificial.',
    vi: 'Plus mở B1 khi bạn đã sẵn sàng tiến xa hơn: chủ đề thực tế hơn, câu khó hơn và luyện tập không bị dừng giả tạo.',
    id: 'Plus membuka B1 saat kamu siap maju: topik lebih nyata, frasa lebih sulit, dan latihan tanpa jeda buatan.',
    tr: 'Plus, ilerlemeye hazır olduğunda B1’i açar: daha gerçek konular, daha zor ifadeler ve yapay duraklama olmadan pratik.',
    pl: 'Plus otwiera B1, gdy jesteś gotowy iść dalej: bardziej żywe tematy, trudniejsze frazy i praktyka bez sztucznej przerwy.',
  },
};

export function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 'generic';
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'ai_dialog') return 'dialog_limit';
  // План #11: smart_trainer теперь самостоятельный контекст (свой lock-preview + copy).
  if (value === 'trainer_smart_mix') return 'smart_trainer';
  // avatar_aura раньше мапился в theme — теперь самостоятельный контекст со своей копией.
  return PREMIUM_CONTEXT_SET.has(value as PremiumContext) ? (value as PremiumContext) : 'generic';
}

export const PAYWALL_COPY: Partial<Record<PremiumContext, PaywallCopy>> & { generic: PaywallCopy } = {
  language_add: {
    titleRu: 'Добавь второй язык к изучению',
    titleUk: 'Додай другу мову до вивчення',
    titleEs: 'Añade un segundo idioma',
    subtitleRu: 'Бесплатный аккаунт — один язык. С Plus учи несколько языков сразу: у каждого свой план, свой прогресс и свои достижения, ничего не смешивается.',
    subtitleUk: 'Безкоштовний акаунт — одна мова. З Plus вивчай кілька мов одразу: у кожної свій план, свій прогрес і свої досягнення, нічого не змішується.',
    subtitleEs: 'La cuenta gratis incluye un idioma. Con Plus aprende varios a la vez: cada idioma tiene su propio plan, progreso y logros.',
  },
  arena: {
    titleRu: 'Больше дуэлей на Арене каждый день',
    titleUk: 'Більше дуелей на Арені щодня',
    titleEs: 'Más partidas en la Arena cada día',
    subtitleRu: 'Plus снимает дневной лимит матчей — сражайся в дуэлях, крепи стратегию и рост без ощущения «всё, хватит на сегодня».',
    subtitleUk: 'Plus знімає денний ліміт матчів — воюй вживу, вдосконалюй стратегію і ріст без «на сьогодні досить».',
    subtitleEs:
      'Plus quita el límite diario de partidas: compite cada día, fortalece tu estrategia y tu progreso sin el «ya está bien por hoy».',
  },
  no_energy: {
    titleRu: 'Останови паузы из-за энергии',
    titleUk: 'Зупини паузи через енергію',
    titleEs: 'Evita pausas por energía',
    subtitleRu: 'С Plus — безлимитная энергия: уроки, квизы и финальный экзамен без таймера ожидания, ритм только твой.',
    subtitleUk: 'З Plus — безлімітна енергія: уроки, квізи та фінальний іспит без таймера — ритм лише твій.',
    subtitleEs: 'Con Plus tienes energía ilimitada: lecciones, quizzes y examen final sin temporizadores de espera, a tu ritmo.',
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
  quiz_limit: {
    titleRu: 'Не останавливай прогресс из-за лимитов',
    titleUk: 'Не зупиняй прогрес через ліміти',
    titleEs: 'No frenes tu progreso por los límites',
    subtitleRu: 'С Plus учись без пауз и держи ежедневный темп.',
    subtitleUk: 'З Plus навчайся без пауз і тримай щоденний темп.',
    subtitleEs: 'Con Plus estudia sin frenos y mantén tu ritmo diario.',
  },
  quiz_level: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Plus снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Plus знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Plus quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_medium: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Plus снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Plus знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Plus quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_hard: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Plus снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Plus знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Plus quita el límite diario para que puedas practicar sin pausas.',
  },
  flashcard_limit: {
    titleRu: 'Твоя база карточек не должна иметь лимит',
    titleUk: 'Твоя база карток не повинна мати ліміт',
    titleEs: 'Tu colección de tarjetas merece estar sin límites',
    subtitleRu: 'Сохраняй все важные фразы и строй персональную систему повторения без потолка.',
    subtitleUk: 'Зберігай усі важливі фрази й будуй персональну систему повторення без обмежень.',
    subtitleEs: 'Guarda todas las frases clave y crea tu repaso personal sin techo.',
  },
  theme: {
    titleRu: 'Персонализируй обучение под себя',
    titleUk: 'Персоналізуй навчання під себе',
    titleEs: 'Adapta la app a tu estilo',
    subtitleRu: 'С Plus приложение становится твоим: больше вовлеченности, выше регулярность занятий.',
    subtitleUk: 'З Plus застосунок стає твоїм: більше залучення, вища регулярність занять.',
    subtitleEs: 'Con Plus la app se siente tuya: más implicación y más constancia en cada sesión.',
  },
  club: {
    titleRu: 'Усиль прогресс через клубы и бонусы',
    titleUk: 'Підсиль прогрес через клуби та бонуси',
    titleEs: 'Impulsa tu progreso con clubes y bonus',
    subtitleRu: 'Соревнуйся, набирай больше XP и не выпадай из ритма.',
    subtitleUk: 'Змагайся, набирай більше XP і не випадай з ритму.',
    subtitleEs: 'Compite, suma más XP y no pierdas el ritmo.',
  },
  trainer: {
    titleRu: 'Тренер — персональный план повторения',
    titleUk: 'Тренер — персональний план повторення',
    titleEs: 'Entrenador — tu plan de repaso personal',
    subtitleRu: 'Слабые места, точечный повтор, по теме, сложные — 4 режима работают только на Plus. Без лимита сессий.',
    subtitleUk: 'Слабкі місця, точкове повторення, за темою, складні — 4 режими лише для Plus. Без ліміту сесій.',
    subtitleEs: 'Débiles, repaso focalizado, por tema, difíciles — 4 modos solo para Plus. Sin límite de sesiones.',
  },
  trainer_limit: {
    // Библия Phraseman: gain-framing, без слова «лимит», без хардкода числа сессий
    // (оно теперь A/B-переменное). Стиль Инвестор: «что открывается».
    titleRu: 'Тренируйся сколько хочешь',
    titleUk: 'Тренуйся скільки хочеш',
    titleEs: 'Entrena cuanto quieras',
    subtitleRu: 'Plus открывает безлимит сессий Тренера во всех режимах. Повторяй фразы столько, сколько нужно — без пауз.',
    subtitleUk: 'Plus відкриває безліміт сесій Тренера в усіх режимах. Повторюй фрази стільки, скільки треба — без пауз.',
    subtitleEs: 'Plus abre sesiones del Entrenador sin límite en todos los modos. Repite las frases cuanto necesites, sin pausas.',
  },
  dialog_limit: {
    titleRu: 'Живая практика в диалогах',
    titleUk: 'Жива практика в діалогах',
    titleEs: 'Práctica real en los diálogos',
    subtitleRu: 'Plus открывает живую практику английского: новые сценарии, разбор каждой реплики, твои слова из карточек.',
    subtitleUk: 'Plus відкриває живу практику англійської: нові сценарії, розбір кожної репліки, твої слова з карток.',
    subtitleEs: 'Plus abre práctica real de inglés: nuevos escenarios, análisis de cada frase y tus palabras de las tarjetas.',
  },
  diagnosis_training: {
    // Библия: «ошибка»→«разбор/что подтянуть», ≤10 слов/предложение, gain-framing.
    titleRu: 'Разбирай слабые места без лимита',
    titleUk: 'Розбирай слабкі місця без ліміту',
    titleEs: 'Analiza tus puntos débiles sin límite',
    subtitleRu: 'Plus открывает персональный разбор каждого слабого места. Понятное объяснение, верный вариант и тренировка на похожих фразах.',
    subtitleUk: 'Plus відкриває персональний розбір кожного слабкого місця. Зрозуміле пояснення, правильний варіант і тренування на схожих фразах.',
    subtitleEs: 'Plus abre un análisis personal de cada punto débil. Explicación clara, forma correcta y práctica con frases parecidas.',
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
    subtitleRu: 'Plus открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания осколков.',
    subtitleUk: 'Plus відкриває повтор будь-якого пройденого раунду. Закріплюй складні фрази без списання уламків.',
    subtitleEs: 'Plus abre el repaso de cualquier ronda completada. Refuerza las frases difíciles sin gastar fragmentos.',
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
    subtitleRu: 'Больше практики без стоп-экранов: диалоги, квизы и уроки открыты, когда есть силы учиться.',
    subtitleUk: 'Більше практики без стоп-екранів: діалоги, квізи й уроки відкриті, коли є сили вчитися.',
    subtitleEs: 'Más práctica sin pantallas de bloqueo: diálogos, quizzes y lecciones cuando tengas energía.',
  },
};

PAYWALL_COPY.quiz_limit = {
  titleRu: 'Лимит квизов на сегодня исчерпан',
  titleUk: 'Ліміт квізів на сьогодні вичерпано',
  titleEs: 'Ya usaste tus 3 cuestionarios gratis de hoy',
  subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Plus снимает дневной лимит, чтобы можно было тренироваться без пауз.',
  subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Plus знімає денний ліміт, щоб можна було тренуватися без пауз.',
  subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Plus quita el límite diario para que puedas practicar sin pausas.',
};

PAYWALL_COPY.personal_plan = {
  titleRu: 'Получить персональный план',
  titleUk: 'Отримати персональний план',
  titleEs: 'Activar tu plan personal',
  subtitleRu: 'Plus включает задания на каждый день: уроки, живые фразы, повторение и проверки под твою цель. План держит темп, а материалы открываются без лишних остановок.',
  subtitleUk: 'Plus вмикає завдання на кожен день: уроки, живі фрази, повторення й перевірки під твою ціль. План тримає темп, а матеріали відкриваються без зайвих пауз.',
  subtitleEs: 'Plus activa tareas diarias: lecciones, frases reales, repaso y pruebas según tu meta. El plan mantiene el ritmo y los materiales se abren sin pausas extra.',
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

// План #3: after-win апсейл при повышении уровня. Стиль 2 Игра + 3 Инвестор, gain-framing.
PAYWALL_COPY.level_up = {
  titleRu: 'Ты растёшь быстро',
  titleUk: 'Ти ростеш швидко',
  titleEs: 'Estás creciendo rápido',
  subtitleRu: 'Новый уровень — твой. Plus снимает все лимиты на пути.',
  subtitleUk: 'Новий рівень — твій. Plus знімає всі ліміти на шляху.',
  subtitleEs: 'Nuevo nivel desbloqueado. Plus quita todos los límites del camino.',
};

// План #11: умный микс тренажёра. Стиль 4 Эксперт + 1 Тренер, gain-framing.
PAYWALL_COPY.smart_trainer = {
  titleRu: 'Умный микс — твой тренер',
  titleUk: 'Розумний мікс — твій тренер',
  titleEs: 'Mezcla inteligente — tu entrenador',
  subtitleRu: 'Сам подбирает, что подтянуть. Каждая сессия — по тебе.',
  subtitleUk: 'Сам добирає, що підтягнути. Кожна сесія — під тебе.',
  subtitleEs: 'Elige solo qué reforzar. Cada sesión es a tu medida.',
};

// Speaking mode — произнести фразу вслух (микрофон + распознавание).
PAYWALL_COPY.speaking = {
  titleRu: 'Начни говорить вслух',
  titleUk: 'Почни говорити вголос',
  titleEs: 'Empieza a hablar en voz alta',
  subtitleRu: 'Plus открывает режим говорения: произноси фразы вслух, а приложение слушает и подсказывает. Самый быстрый путь заговорить уверенно.',
  subtitleUk: 'Plus відкриває режим говоріння: вимовляй фрази вголос, а застосунок слухає й підказує. Найшвидший шлях заговорити впевнено.',
  subtitleEs: 'Plus abre el modo de voz: di las frases en voz alta y la app te escucha y te guía. El camino más rápido para hablar con seguridad.',
};

PAYWALL_COPY.ai_voice_input = {
  titleRu: 'Отвечай голосом в диалоге',
  titleUk: 'Відповідай голосом у діалозі',
  titleEs: 'Responde con voz en el diálogo',
  subtitleRu: 'Plus открывает микрофон в AI-диалогах: говори любую реплику вслух, а Phraseman превратит её в текст для живой разговорной практики.',
  subtitleUk: 'Plus відкриває мікрофон в AI-діалогах: промовляй будь-яку репліку вголос, а Phraseman перетворить її на текст для живої практики.',
  subtitleEs: 'Plus abre el micrófono en los diálogos con IA: di cualquier respuesta en voz alta y Phraseman la convierte en texto para practicar conversación real.',
};

PAYWALL_COPY.dialog_analysis = {
  titleRu: 'Разбор диалога — в Plus',
  titleUk: 'Розбір діалогу — в Plus',
  titleEs: 'Análisis del diálogo en Plus',
  subtitleRu: 'После разговора Plus показывает, где фраза звучала неестественно, как её поправить и какой вариант сказать живее в следующий раз.',
  subtitleUk: 'Після розмови Plus показує, де фраза звучала неприродно, як її виправити й який варіант сказати живіше наступного разу.',
  subtitleEs: 'Después de la conversación, Plus muestra qué sonó poco natural, cómo corregirlo y una forma más viva de decirlo la próxima vez.',
};

PAYWALL_COPY.dialog_locked_level = {
  titleRu: 'Открой сценарии выше уровнем',
  titleUk: 'Відкрий сценарії вищого рівня',
  titleEs: 'Abre escenarios de nivel superior',
  subtitleRu: 'Plus даёт доступ к более сложным AI-сценариям раньше: тренируй реальные ситуации, пока курс постепенно подтягивает уровень.',
  subtitleUk: 'Plus дає доступ до складніших AI-сценаріїв раніше: тренуй реальні ситуації, поки курс поступово підтягує рівень.',
  subtitleEs: 'Plus te da acceso antes a escenarios de IA más avanzados: practica situaciones reales mientras el curso sigue subiendo tu nivel.',
};

PAYWALL_COPY.flashcard_training = {
  titleRu: 'Тренировка карточек — в Plus',
  titleUk: 'Тренування карток — в Plus',
  titleEs: 'Entrenamiento de tarjetas en Plus',
  subtitleRu: 'Plus открывает игровой режим карточек: вспоминай фразы активнее, закрепляй слабые слова и превращай сохранённое в настоящую практику.',
  subtitleUk: 'Plus відкриває ігровий режим карток: згадуй фрази активніше, закріплюй слабкі слова й перетворюй збережене на справжню практику.',
  subtitleEs: 'Plus abre el modo de entrenamiento de tarjetas: recuerda frases de forma activa, refuerza palabras débiles y convierte lo guardado en práctica real.',
};

PAYWALL_COPY.flashcard_autoplay = {
  titleRu: 'Автовоспроизведение карточек — в Plus',
  titleUk: 'Автовідтворення карток — в Plus',
  titleEs: 'Reproducción automática de tarjetas en Plus',
  subtitleRu: 'Plus запускает карточки как аудио-тренировку: слушай фразы подряд, повторяй вслух и тренируй английский, когда руки заняты.',
  subtitleUk: 'Plus запускає картки як аудіотренування: слухай фрази підряд, повторюй уголос і тренуй англійську, коли руки зайняті.',
  subtitleEs: 'Plus convierte tus tarjetas en entrenamiento de audio: escucha frases seguidas, repite en voz alta y practica inglés cuando tienes las manos ocupadas.',
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
  subtitleRu: 'Премиум-аура подсвечивает твой аватар в лигах, на Арене и у друзей. Тебя видно сразу — в списках, дуэлях и чатах.',
  subtitleUk: 'Преміум-аура підсвічує твій аватар у лігах, на Арені та в друзів. Тебе видно одразу — у списках, дуелях і чатах.',
  subtitleEs: 'El aura premium ilumina tu avatar en ligas, la Arena y entre amigos. Se te ve al instante: en listas, duelos y chats.',
};

// Soft-upsell contexts remain first-class through the paywall. Reuse the closest
// proven result copy while preserving the exact context in navigation/analytics.
PAYWALL_COPY.first_lesson_success = PAYWALL_COPY.personal_plan ?? PAYWALL_COPY.generic;
PAYWALL_COPY.free_lessons_complete = PAYWALL_COPY.personal_plan ?? PAYWALL_COPY.generic;
PAYWALL_COPY.dialog_repeat_success = PAYWALL_COPY.dialog_limit ?? PAYWALL_COPY.generic;
PAYWALL_COPY.streak_milestone = PAYWALL_COPY.streak ?? PAYWALL_COPY.generic;
PAYWALL_COPY.trainer_repeat_success = PAYWALL_COPY.trainer ?? PAYWALL_COPY.generic;

export const PAYWALL_PLANNED_COPY: Partial<Record<PremiumContext, PremiumPlannedHeroCopy>> & { generic: PremiumPlannedHeroCopy } = {
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
  arena: {
    title: { 'pt-BR': 'Mais duelos na Arena todos os dias', vi: 'Thêm trận đấu Arena mỗi ngày', id: 'Lebih banyak duel Arena setiap hari', tr: 'Her gün daha fazla Arena düellosu', pl: 'Więcej pojedynków na Arenie każdego dnia' },
    subtitle: {
      'pt-BR': 'Plus remove o limite diário de partidas: compita todos os dias, fortaleça sua estratégia e avance sem sentir “por hoje chega”.',
      vi: 'Plus bỏ giới hạn trận hằng ngày: thi đấu mỗi ngày, tăng chiến thuật và tiến bộ mà không bị chặn giữa nhịp.',
      id: 'Plus menghapus batas pertandingan harian: bertanding tiap hari, perkuat strategi, dan berkembang tanpa rasa “cukup untuk hari ini”.',
      tr: 'Plus günlük maç sınırını kaldırır: her gün yarış, stratejini güçlendir ve “bugünlük bu kadar” hissi olmadan ilerle.',
      pl: 'Plus usuwa dzienny limit meczów: rywalizuj codziennie, wzmacniaj strategię i rośnij bez wrażenia “na dziś koniec”.',
    },
  },
  no_energy: {
    title: { 'pt-BR': 'Pare as pausas por falta de energia', vi: 'Dừng những lần nghỉ vì hết năng lượng', id: 'Hentikan jeda karena energi habis', tr: 'Enerji yüzünden verilen araları durdur', pl: 'Zatrzymaj przerwy przez energię' },
    subtitle: {
      'pt-BR': 'Com Plus, energia ilimitada: lições, quizzes e exame final sem temporizador de espera, no seu ritmo.',
      vi: 'Với Plus, năng lượng không giới hạn: bài học, quiz và bài kiểm tra cuối không cần chờ, theo nhịp của bạn.',
      id: 'Dengan Plus, energi tanpa batas: pelajaran, kuis, dan ujian akhir tanpa timer tunggu, sesuai ritmemu.',
      tr: 'Plus ile sınırsız enerji: dersler, quizler ve final sınavı bekleme sayacı olmadan, senin ritminde.',
      pl: 'Z Plus energia jest bez limitu: lekcje, quizy i egzamin końcowy bez czekania, w twoim rytmie.',
    },
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_PLANNED_COPY,
  lesson_b1: LESSON_B1_PLANNED_COPY,
  quiz_limit: {
    title: { 'pt-BR': 'O limite de quizzes de hoje acabou', vi: 'Đã hết lượt quiz hôm nay', id: 'Batas kuis hari ini habis', tr: 'Bugünkü quiz sınırı doldu', pl: 'Dzisiejszy limit quizów został wykorzystany' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Plus remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Plus bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Plus menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Plus günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Plus usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_level: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Plus remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Plus bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Plus menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Plus günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Plus usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_medium: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Plus remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Plus bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Plus menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Plus günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Plus usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_hard: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Plus remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Plus bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Plus menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Plus günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Plus usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  flashcard_limit: {
    title: { 'pt-BR': 'Sua base de cartões não deve ter limite', vi: 'Kho thẻ của bạn không nên có giới hạn', id: 'Koleksi kartumu tidak perlu dibatasi', tr: 'Kart arşivin sınırlı olmamalı', pl: 'Twoja baza fiszek nie powinna mieć limitu' },
    subtitle: {
      'pt-BR': 'Salve todas as frases importantes e monte seu sistema pessoal de revisão sem teto.',
      vi: 'Lưu mọi cụm từ quan trọng và xây hệ thống ôn tập cá nhân không giới hạn.',
      id: 'Simpan semua frasa penting dan bangun sistem pengulangan pribadi tanpa batas atas.',
      tr: 'Önemli tüm ifadeleri kaydet ve sınırsız kişisel tekrar sistemini kur.',
      pl: 'Zapisuj wszystkie ważne frazy i buduj własny system powtórek bez sufitu.',
    },
  },
  streak: {
    title: { 'pt-BR': 'Não perca a sequência que você construiu', vi: 'Đừng mất chuỗi bạn đã xây dựng', id: 'Jangan kehilangan streak yang sudah kamu bangun', tr: 'Kurduğun seriyi kaybetme', pl: 'Nie trać serii, którą już zbudowałeś' },
    subtitle: {
      'pt-BR': 'Plus protege seu ritmo: estude sem pausas e não volte atrás por um dia perdido.',
      vi: 'Plus bảo vệ nhịp học: học không gián đoạn và không bị tụt lại vì một ngày bỏ lỡ.',
      id: 'Plus melindungi ritmemu: belajar tanpa jeda dan tidak mundur karena satu hari terlewat.',
      tr: 'Plus ritmini korur: ara vermeden çalış ve tek bir kaçırılan gün yüzünden geri düşme.',
      pl: 'Plus chroni twój rytm: ucz się bez przerw i nie cofaj się przez jeden opuszczony dzień.',
    },
  },
  theme: {
    title: { 'pt-BR': 'Personalize o aprendizado do seu jeito', vi: 'Cá nhân hóa việc học theo bạn', id: 'Sesuaikan belajar dengan gayamu', tr: 'Öğrenmeyi kendine göre kişiselleştir', pl: 'Dopasuj naukę do siebie' },
    subtitle: {
      'pt-BR': 'Com Plus, o app fica mais seu: mais envolvimento e mais regularidade nos estudos.',
      vi: 'Với Plus, ứng dụng giống của bạn hơn: gắn bó hơn và học đều hơn.',
      id: 'Dengan Plus, aplikasi terasa lebih milikmu: lebih terlibat dan lebih konsisten.',
      tr: 'Plus ile uygulama sana ait hisseder: daha fazla bağlılık, daha düzenli çalışma.',
      pl: 'Z Plus aplikacja staje się bardziej twoja: większe zaangażowanie i regularność.',
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
  trainer: {
    title: { 'pt-BR': 'Treinador: seu plano pessoal de revisão', vi: 'Huấn luyện viên: kế hoạch ôn tập cá nhân', id: 'Trainer: rencana pengulangan personalmu', tr: 'Antrenör: kişisel tekrar planın', pl: 'Trener: twój osobisty plan powtórek' },
    subtitle: {
      'pt-BR': 'Pontos fracos, revisão focada, por tema e difíceis: 4 modos funcionam só no Plus. Sem limite de sessões.',
      vi: 'Điểm yếu, ôn đúng điểm cần, theo chủ đề, câu khó: 4 chế độ chỉ có trong Plus. Không giới hạn phiên.',
      id: 'Titik lemah, ulangan terarah, per topik, sulit: 4 mode hanya berjalan di Plus. Tanpa batas sesi.',
      tr: 'Zayıf noktalar, hedefli tekrar, konuya göre, zorlar: 4 mod sadece Plus ile çalışır. Seans sınırı yok.',
      pl: 'Słabe punkty, celowana powtórka, według tematu, trudne: 4 tryby działają tylko w Plus. Bez limitu sesji.',
    },
  },
  trainer_limit: {
    // gain-framing, без хардкода числа бесплатных сессий (A/B-переменное)
    title: { 'pt-BR': 'Treine quanto quiser', vi: 'Luyện tập thỏa thích', id: 'Berlatih sepuasnya', tr: 'İstediğin kadar antrenman', pl: 'Trenuj ile chcesz' },
    subtitle: {
      'pt-BR': 'Plus abre sessões ilimitadas do Treinador em todos os modos.',
      vi: 'Plus mở các phiên Huấn luyện viên không giới hạn ở mọi chế độ.',
      id: 'Plus membuka sesi Trainer tanpa batas di semua mode.',
      tr: 'Plus tüm modlarda sınırsız Antrenör seansı açar.',
      pl: 'Plus otwiera nieograniczone sesje Trenera we wszystkich trybach.',
    },
  },
  diagnosis_training: {
    title: { 'pt-BR': 'Novos pontos de melhoria no Plus', vi: 'Điểm cần cải thiện mới trong Plus', id: 'Titik berkembang baru ada di Plus', tr: 'Yeni gelişim noktaları Plus’da', pl: 'Nowe punkty wzrostu w Plus' },
    subtitle: {
      'pt-BR': 'A primeira análise pessoal é grátis. Plus abre cada ponto fraco: explicação clara, forma correta e prática com frases parecidas sem limite.',
      vi: 'Phân tích cá nhân đầu tiên miễn phí. Plus mở từng điểm yếu: giải thích rõ, dạng đúng và luyện câu tương tự không giới hạn.',
      id: 'Analisis personal pertama gratis. Plus membuka tiap titik lemah: penjelasan jelas, bentuk benar, dan latihan frasa mirip tanpa batas.',
      tr: 'İlk kişisel analiz ücretsiz. Plus her zayıf noktayı açar: net açıklama, doğru biçim ve benzer ifadelerle sınırsız pratik.',
      pl: 'Pierwsza analiza osobista jest darmowa. Plus otwiera każdy słabszy punkt: jasne wyjaśnienie, poprawną wersję i ćwiczenia na podobnych frazach bez limitu.',
    },
  },
  mastery: {
    title: { 'pt-BR': 'Repita lições sem limites', vi: 'Ôn lại bài học không giới hạn', id: 'Ulang pelajaran tanpa batas', tr: 'Dersleri sınırsız tekrar et', pl: 'Powtarzaj lekcje bez ograniczeń' },
    subtitle: {
      'pt-BR': 'Com Plus, qualquer lição concluída fica aberta para repetir sem gastar fragmentos, mesmo quando o preço subiria a cada repetição.',
      vi: 'Với Plus, mọi bài đã hoàn thành đều có thể ôn lại mà không tốn mảnh, kể cả khi giá tăng sau mỗi lần học lại.',
      id: 'Dengan Plus, semua pelajaran selesai bisa diulang tanpa memakai fragmen, bahkan saat harga naik di tiap pengulangan.',
      tr: 'Plus ile tamamlanan her dersi parça harcamadan tekrar edersin, ücretsiz modda fiyat her tekrar artsa bile.',
      pl: 'Z Plus każda ukończona lekcja jest otwarta do powtórki bez odłamków, nawet gdy w trybie free cena rosłaby po każdym przejściu.',
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

PAYWALL_PLANNED_COPY.personal_plan = {
  title: {
    'pt-BR': 'Ative seu plano pessoal',
    vi: 'Kích hoạt kế hoạch cá nhân',
    id: 'Aktifkan rencana personalmu',
    tr: 'Kişisel planını aç',
    pl: 'Włącz swój plan osobisty',
  },
  subtitle: {
    'pt-BR': 'Plus libera tarefas diárias: lições, frases reais, revisão e quizzes alinhados ao seu objetivo.',
    vi: 'Plus mở nhiệm vụ hằng ngày: bài học, câu thật, ôn tập và quiz theo mục tiêu của bạn.',
    id: 'Plus membuka tugas harian: pelajaran, frasa nyata, pengulangan, dan kuis sesuai tujuanmu.',
    tr: 'Plus günlük görevleri açar: dersler, gerçek ifadeler, tekrar ve hedefe uygun quizler.',
    pl: 'Plus otwiera codzienne zadania: lekcje, żywe frazy, powtórki i quizy pod twój cel.',
  },
};

PAYWALL_PLANNED_COPY.first_lesson_success = PAYWALL_PLANNED_COPY.personal_plan ?? PAYWALL_PLANNED_COPY.generic;
PAYWALL_PLANNED_COPY.free_lessons_complete = PAYWALL_PLANNED_COPY.personal_plan ?? PAYWALL_PLANNED_COPY.generic;
PAYWALL_PLANNED_COPY.dialog_repeat_success = PAYWALL_PLANNED_COPY.dialog_limit ?? PAYWALL_PLANNED_COPY.generic;
PAYWALL_PLANNED_COPY.streak_milestone = PAYWALL_PLANNED_COPY.streak ?? PAYWALL_PLANNED_COPY.generic;
PAYWALL_PLANNED_COPY.trainer_repeat_success = PAYWALL_PLANNED_COPY.trainer ?? PAYWALL_PLANNED_COPY.generic;

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
PAYWALL_PLANNED_COPY.notification_upsell = {
  title: {
    'pt-BR': 'Continue seu progresso',
    vi: 'Tiếp tục tiến bộ của bạn',
    id: 'Lanjutkan progresmu',
    tr: 'İlerlemene devam et',
    pl: 'Kontynuuj swój postęp',
  },
  subtitle: {
    'pt-BR': 'O Plus abre tudo: lições sem barreiras, prática ilimitada e ritmo estável. O momento perfeito para voltar.',
    vi: 'Plus mở tất cả: bài học không rào cản, luyện tập không giới hạn và nhịp đều. Thời điểm hoàn hảo để quay lại.',
    id: 'Plus membuka semuanya: pelajaran tanpa hambatan, latihan tanpa batas, ritme stabil. Saat tepat untuk kembali.',
    tr: 'Plus her şeyi açar: engelsiz dersler, sınırsız pratik ve istikrarlı ritim. Dönmek için mükemmel an.',
    pl: 'Plus otwiera wszystko: lekcje bez barier, nieograniczona praktyka i stabilny rytm. Idealny moment, by wrócić.',
  },
};

// Пред-существующие контексты, у которых не было planned-hero-copy → не-RU/UK/ES
// языки падали в generic. Закрываем, чтобы каждый контекст был персональным на всех 8.
PAYWALL_PLANNED_COPY.dialog_limit = {
  title: {
    'pt-BR': 'Prática real nos diálogos',
    vi: 'Luyện nói thật trong hội thoại',
    id: 'Latihan nyata di dialog',
    tr: 'Diyaloglarda gerçek pratik',
    pl: 'Prawdziwa praktyka w dialogach',
  },
  subtitle: {
    'pt-BR': 'O Plus abre prática real de inglês: novos cenários, análise de cada fala e suas palavras dos cartões.',
    vi: 'Plus mở luyện nói tiếng Anh thật: kịch bản mới, phân tích từng câu và từ vựng của bạn từ thẻ.',
    id: 'Plus membuka latihan bahasa Inggris nyata: skenario baru, analisis tiap ucapan, dan katamu dari kartu.',
    tr: 'Plus gerçek İngilizce pratiğini açar: yeni senaryolar, her cümlenin analizi ve kartlarındaki kelimeler.',
    pl: 'Plus otwiera prawdziwą praktykę angielskiego: nowe scenariusze, analiza każdej wypowiedzi i twoje słowa z fiszek.',
  },
};
PAYWALL_PLANNED_COPY.speaking = {
  title: {
    'pt-BR': 'Comece a falar em voz alta',
    vi: 'Bắt đầu nói thành tiếng',
    id: 'Mulai bicara dengan lantang',
    tr: 'Sesli konuşmaya başla',
    pl: 'Zacznij mówić na głos',
  },
  subtitle: {
    'pt-BR': 'O Plus abre o modo de voz: diga as frases em voz alta e o app escuta e orienta. O caminho mais rápido para falar com confiança.',
    vi: 'Plus mở chế độ nói: đọc câu thành tiếng, ứng dụng lắng nghe và gợi ý. Cách nhanh nhất để nói tự tin.',
    id: 'Plus membuka mode bicara: ucapkan frasa dengan lantang, aplikasi mendengarkan dan memandu. Cara tercepat untuk bicara percaya diri.',
    tr: 'Plus konuşma modunu açar: cümleleri sesli söyle, uygulama dinler ve yönlendirir. Kendinden emin konuşmanın en hızlı yolu.',
    pl: 'Plus otwiera tryb mówienia: wymawiaj frazy na głos, a aplikacja słucha i podpowiada. Najszybsza droga, by mówić pewnie.',
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
PAYWALL_PLANNED_COPY.level_up = {
  title: {
    'pt-BR': 'Você está crescendo rápido',
    vi: 'Bạn đang tiến bộ nhanh',
    id: 'Kamu berkembang cepat',
    tr: 'Hızlı ilerliyorsun',
    pl: 'Rozwijasz się szybko',
  },
  subtitle: {
    'pt-BR': 'Novo nível desbloqueado. O Plus remove todos os limites do caminho.',
    vi: 'Mở khoá cấp mới. Plus gỡ mọi giới hạn trên đường đi.',
    id: 'Level baru terbuka. Plus menghapus semua batas di jalanmu.',
    tr: 'Yeni seviye açıldı. Plus yoldaki tüm sınırları kaldırır.',
    pl: 'Odblokowano nowy poziom. Plus usuwa wszystkie limity po drodze.',
  },
};
PAYWALL_PLANNED_COPY.smart_trainer = {
  title: {
    'pt-BR': 'Mistura inteligente — seu treinador',
    vi: 'Mix thông minh — huấn luyện viên của bạn',
    id: 'Mix pintar — pelatihmu',
    tr: 'Akıllı miks — antrenörün',
    pl: 'Inteligentny miks — twój trener',
  },
  subtitle: {
    'pt-BR': 'Escolhe sozinho o que reforçar. Cada sessão é do seu jeito.',
    vi: 'Tự chọn điều cần cải thiện. Mỗi phiên đều hợp với bạn.',
    id: 'Memilih sendiri yang perlu diperkuat. Tiap sesi sesuai dirimu.',
    tr: 'Neyi güçlendireceğini kendi seçer. Her seans sana göre.',
    pl: 'Sam wybiera, co wzmocnić. Każda sesja jest pod ciebie.',
  },
};

PAYWALL_PLANNED_COPY.ai_voice_input = {
  title: {
    'pt-BR': 'Responda por voz no diálogo',
    vi: 'Trả lời bằng giọng nói trong hội thoại',
    id: 'Jawab dengan suara di dialog',
    tr: 'Diyalogda sesle yanıt ver',
    pl: 'Odpowiadaj głosem w dialogu',
  },
  subtitle: {
    'pt-BR': 'O Plus abre o microfone nos diálogos com IA: fale qualquer resposta em voz alta e o Phraseman transforma em texto para prática real.',
    vi: 'Plus mở micro trong hội thoại AI: nói bất kỳ câu trả lời nào thành tiếng và Phraseman chuyển thành văn bản để luyện nói thật.',
    id: 'Plus membuka mikrofon di dialog AI: ucapkan jawaban apa pun dan Phraseman mengubahnya menjadi teks untuk latihan nyata.',
    tr: 'Plus, yapay zekâ diyaloglarında mikrofonu açar: istediğin yanıtı sesli söyle, Phraseman gerçek pratik için metne çevirir.',
    pl: 'Plus otwiera mikrofon w dialogach AI: powiedz dowolną odpowiedź na głos, a Phraseman zamieni ją w tekst do realnej praktyki.',
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
    'pt-BR': 'Abra cenários de nível mais alto',
    vi: 'Mở kịch bản cấp cao hơn',
    id: 'Buka skenario level lebih tinggi',
    tr: 'Daha yüksek seviye senaryoları aç',
    pl: 'Otwórz scenariusze wyższego poziomu',
  },
  subtitle: {
    'pt-BR': 'O Plus libera cenários de IA mais difíceis mais cedo: pratique situações reais enquanto o curso puxa seu nível.',
    vi: 'Plus mở sớm các kịch bản AI khó hơn: luyện tình huống thật trong khi khóa học nâng dần trình độ của bạn.',
    id: 'Plus membuka skenario AI yang lebih sulit lebih awal: latih situasi nyata sambil kursus menaikkan levelmu.',
    tr: 'Plus daha zor yapay zekâ senaryolarını erkenden açar: kurs seviyeni yükseltirken gerçek durumları çalış.',
    pl: 'Plus wcześniej otwiera trudniejsze scenariusze AI: ćwicz realne sytuacje, gdy kurs podnosi twój poziom.',
  },
};

PAYWALL_PLANNED_COPY.flashcard_training = {
  title: {
    'pt-BR': 'Treino de cartões no Plus',
    vi: 'Luyện thẻ trong Plus',
    id: 'Latihan kartu di Plus',
    tr: 'Kart antrenmanı Plus’ta',
    pl: 'Trening fiszek w Plus',
  },
  subtitle: {
    'pt-BR': 'O Plus abre o modo de treino dos cartões: lembre frases de forma ativa, reforce palavras fracas e transforme salvos em prática real.',
    vi: 'Plus mở chế độ luyện thẻ: nhớ cụm từ chủ động hơn, củng cố từ yếu và biến mục đã lưu thành luyện tập thật.',
    id: 'Plus membuka mode latihan kartu: ingat frasa lebih aktif, perkuat kata lemah, dan ubah simpanan menjadi latihan nyata.',
    tr: 'Plus kart antrenmanını açar: ifadeleri daha aktif hatırla, zayıf kelimeleri güçlendir ve kayıtlarını gerçek pratiğe çevir.',
    pl: 'Plus otwiera tryb treningu fiszek: aktywnie przypominaj frazy, wzmacniaj słabe słowa i zamieniaj zapisane rzeczy w praktykę.',
  },
};

PAYWALL_PLANNED_COPY.flashcard_autoplay = {
  title: {
    'pt-BR': 'Reprodução automática de cartões no Plus',
    vi: 'Tự phát thẻ trong Plus',
    id: 'Putar otomatis kartu di Plus',
    tr: 'Kart otomatik oynatma Plus’ta',
    pl: 'Autoodtwarzanie fiszek w Plus',
  },
  subtitle: {
    'pt-BR': 'O Plus transforma cartões em treino de áudio: ouça frases em sequência, repita em voz alta e pratique inglês com as mãos livres.',
    vi: 'Plus biến thẻ thành bài luyện nghe: nghe các câu liên tiếp, lặp lại thành tiếng và học tiếng Anh khi tay bận.',
    id: 'Plus mengubah kartu menjadi latihan audio: dengarkan frasa berurutan, ulangi dengan suara, dan latih Inggris saat tangan sibuk.',
    tr: 'Plus kartları sesli antrenmana çevirir: ifadeleri sırayla dinle, sesli tekrar et ve ellerin doluyken İngilizce çalış.',
    pl: 'Plus zmienia fiszki w trening audio: słuchaj fraz po kolei, powtarzaj na głos i ćwicz angielski, gdy masz zajęte ręce.',
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
    'pt-BR': 'A aura premium ilumina seu avatar nas ligas, na Arena e entre amigos. Você é visto na hora: em listas, duelos e chats.',
    vi: 'Hào quang cao cấp làm avatar của bạn nổi bật trong giải đấu, Đấu trường và giữa bạn bè. Bạn được chú ý ngay — trong danh sách, trận đấu và trò chuyện.',
    id: 'Aura premium menyorot avatarmu di liga, Arena, dan di antara teman. Kamu langsung terlihat: di daftar, duel, dan obrolan.',
    tr: 'Premium aura, liglerde, Arena’da ve arkadaşlar arasında avatarını aydınlatır. Listelerde, düellolarda ve sohbetlerde hemen fark edilirsin.',
    pl: 'Premium aura podświetla twój awatar w ligach, na Arenie i wśród znajomych. Widać cię od razu: na listach, w pojedynkach i czatach.',
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
// «Получить персональный план», которые звучат неактуально для вернувшегося юзера.
const WIN_BACK_TITLE: Pick<PaywallCopy, 'titleRu' | 'titleUk' | 'titleEs'> = {
  titleRu: 'Верни полный доступ Plus',
  titleUk: 'Поверни повний доступ Plus',
  titleEs: 'Recupera tu acceso Plus completo',
};

// Win-back заголовок для planned-локалей (pt-BR/vi/id/tr/pl), которые берут title
// из planned-копии, а не из RU/UK/ES.
const WIN_BACK_PLANNED_TITLE: PremiumPlannedCopy = {
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
PAYWALL_COPY.notification_upsell = {
  titleRu: 'Продолжи свой прогресс',
  titleUk: 'Продовжуй свій прогрес',
  titleEs: 'Continúa tu progreso',
  subtitleRu: 'Plus открывает всё сразу: уроки без барьеров, безлимит практики и живые тренировки без пауз. Идеальный момент вернуться.',
  subtitleUk: 'Plus відкриває все одразу: уроки без бар\'єрів, безліміт практики й живі тренування без пауз. Ідеальний момент повернутися.',
  subtitleEs: 'Plus lo abre todo: lecciones sin barreras, práctica ilimitada y entrenamientos vivos sin pausas. El momento perfecto para volver.',
};

export const CONTEXT_BENEFITS: Partial<Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]>> & { generic: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] } = {
  language_add: [
    { ru: 'Несколько языков в одном аккаунте', uk: 'Кілька мов в одному акаунті', es: 'Varios idiomas en una cuenta', 'pt-BR': 'Vários idiomas em uma conta', vi: 'Nhiều ngôn ngữ trong một tài khoản', id: 'Beberapa bahasa dalam satu akun', tr: 'Tek hesapta birden çok dil', pl: 'Kilka języków na jednym koncie' },
    { ru: 'У каждого языка свой план и прогресс', uk: 'У кожної мови свій план і прогрес', es: 'Cada idioma con su plan y progreso', 'pt-BR': 'Cada idioma com seu plano e progresso', vi: 'Mỗi ngôn ngữ có kế hoạch và tiến độ riêng', id: 'Tiap bahasa punya rencana dan progres sendiri', tr: 'Her dilin kendi planı ve ilerlemesi', pl: 'Każdy język ma własny plan i postęp' },
    { ru: 'Переключайся между языками в один тап', uk: 'Перемикайся між мовами одним дотиком', es: 'Cambia de idioma con un toque', 'pt-BR': 'Troque de idioma com um toque', vi: 'Chuyển ngôn ngữ chỉ với một chạm', id: 'Berpindah bahasa dengan satu ketukan', tr: 'Tek dokunuşla diller arasında geç', pl: 'Przełączaj języki jednym dotknięciem' },
  ],
  arena: [
    { ru: 'Дневной потолок матчей снимается', uk: 'Денну межу матчів знято', es: 'Se quita el techo diario de partidas', 'pt-BR': 'O teto diário de partidas é removido', vi: 'Gỡ giới hạn trận hằng ngày', id: 'Batas pertandingan harian dihapus', tr: 'Günlük maç tavanı kalkar', pl: 'Dzienny limit meczów znika' },
    { ru: 'Дуэли без ощущения «на сегодня всё»', uk: 'Дуелі без «на сьогодні вже досить»', es: 'Duelos sin el «ya basta por hoy»', 'pt-BR': 'Duelos sem “por hoje chega”', vi: 'Đấu mà không bị “hôm nay đủ rồi”', id: 'Duel tanpa rasa “cukup hari ini”', tr: '“Bugünlük yeter” hissi olmadan düello', pl: 'Pojedynki bez “na dziś wystarczy”' },
    { ru: 'Темп и мотивация в тренировках сильнее', uk: 'Темп і мотивація в тренуваннях сильніші', es: 'Ritmo y motivación en el entrenamiento', 'pt-BR': 'Mais ritmo e motivação nos treinos', vi: 'Nhịp và động lực luyện tập mạnh hơn', id: 'Ritme dan motivasi latihan lebih kuat', tr: 'Antrenmanda daha güçlü tempo ve motivasyon', pl: 'Silniejsze tempo i motywacja w treningu' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, квиз и финальный экзамен без вынужденных пауз', uk: 'Урок, квіз і фінальний іспит без вимушених пауз', es: 'Lección, quiz y examen sin pausas forzadas', 'pt-BR': 'Lição, quiz e exame final sem pausas forçadas', vi: 'Bài học, quiz và bài cuối không bị dừng ép buộc', id: 'Pelajaran, kuis, dan ujian akhir tanpa jeda paksa', tr: 'Ders, quiz ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, quiz i egzamin bez wymuszonych przerw' },
    { ru: 'День не обрывается на самом интересном', uk: 'День не обривається на найцікавішому', es: 'El día no se corta justo cuando empieza', 'pt-BR': 'O dia não para bem na melhor hora', vi: 'Buổi học không dừng đúng lúc đang vào guồng', id: 'Hari belajar tidak berhenti saat mulai seru', tr: 'Gün tam hızlanmışken kesilmez', pl: 'Dzień nie urywa się w najciekawszym momencie' },
  ],
  course_after_lesson3: [
    { ru: 'Доступ ко всем урокам', uk: 'Доступ до всіх уроків', es: 'Acceso a todas las lecciones', 'pt-BR': 'Acesso a todas as lições', vi: 'Truy cập tất cả bài học', id: 'Akses ke semua pelajaran', tr: 'Tüm derslere erişim', pl: 'Dostęp do wszystkich lekcji' },
    { ru: 'Безлимитная практика без пауз', uk: 'Безлімітна практика без пауз', es: 'Práctica ilimitada sin pausas', 'pt-BR': 'Prática ilimitada sem pausas', vi: 'Luyện tập không giới hạn, không gián đoạn', id: 'Latihan tanpa batas dan tanpa jeda', tr: 'Sınırsız ve kesintisiz pratik', pl: 'Nieograniczona praktyka bez przerw' },
    { ru: 'Все возможности Plus', uk: 'Усі можливості Plus', es: 'Todas las funciones de Plus', 'pt-BR': 'Todos os recursos Plus', vi: 'Mọi tính năng Plus', id: 'Semua fitur Plus', tr: 'Tüm Plus özellikleri', pl: 'Wszystkie funkcje Plus' },
  ],
  lesson_b1: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante', 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto', 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes', 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  quiz_limit: [
    { ru: 'Без лимита попыток и остановок', uk: 'Без ліміту спроб і зупинок', es: 'Sin límite de intentos ni frenos', 'pt-BR': 'Sem limite de tentativas nem pausas', vi: 'Không giới hạn lượt thử và không bị dừng', id: 'Tanpa batas percobaan dan hambatan', tr: 'Deneme ve duraklama sınırı yok', pl: 'Bez limitu prób i zatrzymań' },
    { ru: 'Регулярный учебный ритм каждый день', uk: 'Регулярний навчальний ритм щодня', es: 'Ritmo de estudio estable cada día', 'pt-BR': 'Ritmo de estudo regular todos os dias', vi: 'Nhịp học đều đặn mỗi ngày', id: 'Ritme belajar teratur setiap hari', tr: 'Her gün düzenli öğrenme ritmi', pl: 'Regularny rytm nauki każdego dnia' },
    { ru: 'Больше XP и пользы сессий', uk: 'Більше XP і користі від сесій', es: 'Más XP y valor en cada sesión', 'pt-BR': 'Mais XP e mais valor por sessão', vi: 'Thêm XP và giá trị từ mỗi phiên', id: 'Lebih banyak XP dan manfaat sesi', tr: 'Oturumlardan daha fazla XP ve fayda', pl: 'Więcej XP i korzyści z sesji' },
  ],
  quiz_level: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_medium: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_hard: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  flashcard_limit: [
    { ru: 'Безлимит на личную базу карточек', uk: 'Безліміт на особисту базу карток', es: 'Tu colección de tarjetas sin límite', 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { ru: 'Храни все важные фразы', uk: 'Зберігай всі важливі фрази', es: 'Guarda todas tus frases clave', 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { ru: 'Лучше долгосрочное запоминание', uk: 'Краще довгострокове запам\'ятовування', es: 'Memoria a largo plazo más sólida', 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { ru: 'Защита серии даже при пропуске', uk: 'Захист серії навіть при пропуску', es: 'Protege tu racha aunque faltes un día', 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { ru: 'Без пауз из-за энергии', uk: 'Без пауз через енергію', es: 'Sin pausas por energía', 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda karena energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
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
  trainer: [
    { ru: 'Слабые места: фразы, где чаще спотыкаешься', uk: 'Слабкі місця: фрази, де частіше спотикаєшся', es: 'Puntos débiles: frases donde más tropiezas', 'pt-BR': 'Pontos fracos: frases em que você mais trava', vi: 'Điểm yếu: cụm từ bạn hay vấp nhất', id: 'Titik lemah: frasa yang paling sering membuatmu macet', tr: 'Zayıf noktalar: en çok takıldığın ifadeler', pl: 'Słabe punkty: frazy, na których najczęściej się zacinasz' },
    { ru: 'Точечный повтор: алгоритм строит нужный набор', uk: 'Точкове повторення: алгоритм будує потрібний набір', es: 'Repaso focalizado: el algoritmo crea el conjunto necesario', 'pt-BR': 'Revisão focada: o algoritmo monta o conjunto certo', vi: 'Ôn đúng điểm cần: thuật toán tạo bộ luyện phù hợp', id: 'Ulangan terarah: algoritme menyusun set yang tepat', tr: 'Hedefli tekrar: algoritma doğru seti kurar', pl: 'Celowana powtórka: algorytm buduje właściwy zestaw' },
    { ru: 'Без лимита сессий в день', uk: 'Без ліміту сесій на день', es: 'Sin límite diario de sesiones', 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { ru: 'По теме: повтор конкретного урока', uk: 'За темою: повтор конкретного уроку', es: 'Por tema: repaso de una lección específica', 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { ru: 'Безлимит сессий Тренера', uk: 'Безліміт сесій Тренера', es: 'Sesiones ilimitadas del Entrenador', 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { ru: 'Все 6 режимов без ограничений', uk: 'Всі 6 режимів без обмежень', es: 'Los 6 modos sin restricciones', 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { ru: 'Точечный повтор когда хочешь', uk: 'Точкове повторення коли хочеш', es: 'Repaso focalizado cuando quieras', 'pt-BR': 'Revisão focada quando quiser', vi: 'Ôn đúng điểm cần bất cứ lúc nào', id: 'Ulangan terarah kapan saja', tr: 'İstediğin zaman hedefli tekrar', pl: 'Celowana powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { ru: 'Каждое слабое место — точный персональный разбор', uk: 'Кожне слабке місце — точний персональний розбір', es: 'Cada punto débil tiene un análisis personal preciso', 'pt-BR': 'Cada ponto fraco vira uma análise pessoal precisa', vi: 'Mỗi điểm yếu thành phân tích cá nhân chính xác', id: 'Setiap titik lemah jadi analisis personal yang tepat', tr: 'Her zayıf nokta net kişisel analize dönüşür', pl: 'Każdy słaby punkt to dokładna analiza osobista' },
    { ru: 'Понятное объяснение: где сбилась фраза и как сказать правильно', uk: 'Зрозуміле пояснення: де збилась фраза і як сказати правильно', es: 'Explicación clara: dónde falla la frase y cómo decirla bien', 'pt-BR': 'Explicação clara: onde a frase falhou e como corrigir', vi: 'Giải thích rõ: câu sai ở đâu và nói đúng thế nào', id: 'Penjelasan jelas: bagian frasa yang salah dan cara benarnya', tr: 'Net açıklama: ifade nerede bozuldu ve doğrusu ne', pl: 'Jasne wyjaśnienie: gdzie fraza się sypie i jak powiedzieć poprawnie' },
    { ru: 'Тренировка на похожих фразах без лимита', uk: 'Тренування на схожих фразах без ліміту', es: 'Práctica con frases parecidas sin límite', 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones', 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { ru: 'Не тратишь осколки на перепрохождения уроков', uk: 'Не витрачаєш уламки на перепроходження уроків', es: 'No gastas fragmentos al repetir lecciones', 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
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

CONTEXT_BENEFITS.quiz_limit = [
  { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
  { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
  { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
];

CONTEXT_BENEFITS.personal_plan = [
  { ru: 'Персональный план с заданиями на каждый день', uk: 'Персональний план із завданнями на кожен день', es: 'Plan personal con tareas diarias', 'pt-BR': 'Plano pessoal com tarefas diárias', vi: 'Kế hoạch cá nhân với nhiệm vụ hằng ngày', id: 'Rencana personal dengan tugas harian', tr: 'Günlük görevli kişisel plan', pl: 'Plan osobisty z codziennymi zadaniami' },
  { ru: 'Уроки, фразы, повторение и отдельные квизы плана', uk: 'Уроки, фрази, повторення й окремі квізи плану', es: 'Lecciones, frases, repaso y quizzes del plan', 'pt-BR': 'Lições, frases, revisão e quizzes do plano', vi: 'Bài học, câu, ôn tập và quiz của kế hoạch', id: 'Pelajaran, frasa, pengulangan, dan kuis rencana', tr: 'Dersler, ifadeler, tekrar ve plan quizleri', pl: 'Lekcje, frazy, powtórki i quizy planu' },
  { ru: 'Все нужные материалы открываются без лишних пауз', uk: 'Усі потрібні матеріали відкриваються без зайвих пауз', es: 'Materiales necesarios sin pausas extra', 'pt-BR': 'Materiais necessários sem pausas extras', vi: 'Tài liệu cần thiết không bị dừng thêm', id: 'Materi yang dibutuhkan tanpa jeda ekstra', tr: 'Gerekli materyaller ekstra duraklama olmadan', pl: 'Potrzebne materiały bez dodatkowych przerw' },
];

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
  { ru: 'Аура вокруг аватара — виден в лигах и дуэлях', uk: 'Аура навколо аватара — тебе видно в лігах і дуелях', es: 'Aura en tu avatar: visible en ligas y duelos', 'pt-BR': 'Aura no avatar: visível em ligas e duelos', vi: 'Hào quang quanh avatar — nổi bật trong giải và trận đấu', id: 'Aura di avatar: terlihat di liga dan duel', tr: 'Avatarında aura — liglerde ve düellolarda görünürsün', pl: 'Aura wokół awatara — widoczny w ligach i pojedynkach' },
  { ru: 'Уникальный стиль профиля, который замечают', uk: 'Унікальний стиль профілю, який помічають', es: 'Un estilo de perfil que se nota', 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { ru: 'Работает везде: лидерборды, друзья, чаты', uk: 'Працює всюди: лідерборди, друзі, чати', es: 'Funciona en todas partes: rankings, amigos, chats', 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS.speaking = [
  { ru: 'Произноси фразы вслух — приложение слушает', uk: 'Вимовляй фрази вголос — застосунок слухає', es: 'Di las frases en voz alta: la app te escucha', 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { ru: 'Мгновенная подсказка по каждому слову', uk: 'Миттєва підказка щодо кожного слова', es: 'Pista instantánea en cada palabra', 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { ru: 'Самый быстрый путь заговорить уверенно', uk: 'Найшвидший шлях заговорити впевнено', es: 'El camino más rápido para hablar con seguridad', 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS.dialog_limit = [
  { ru: 'Диалоги с ИИ-наставником без дневного лимита', uk: 'Діалоги з ШІ-наставником без денного ліміту', es: 'Diálogos con el tutor de IA sin límite diario', 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { ru: 'Живая практика разговора в любое время', uk: 'Жива практика розмови будь-коли', es: 'Práctica de conversación real cuando quieras', 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { ru: 'Разбор реплик и подсказки прямо в диалоге', uk: 'Розбір реплік і підказки прямо в діалозі', es: 'Revisión de frases y pistas en el diálogo', 'pt-BR': 'Revisão das falas e dicas dentro do diálogo', vi: 'Gợi ý và phân tích câu ngay trong hội thoại', id: 'Ulasan jawaban dan petunjuk langsung di dialog', tr: 'Diyalog içinde yanıt analizi ve ipuçları', pl: 'Omówienie wypowiedzi i podpowiedzi wprost w dialogu' },
];

CONTEXT_BENEFITS.intro_ended = [
  { ru: 'Полный доступ возвращается целиком', uk: 'Повний доступ повертається повністю', es: 'Recuperas el acceso completo entero', 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { ru: 'Уроки, квизы и тренажёр без пауз и лимитов', uk: 'Уроки, квізи і тренажер без пауз і лімітів', es: 'Lecciones, quizzes y entrenador sin pausas ni límites', 'pt-BR': 'Lições, quizzes e treinador sem pausas nem limites', vi: 'Bài học, quiz và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, kuis, dan trainer tanpa jeda dan batas', tr: 'Dersler, quizler ve antrenör arasız ve sınırsız', pl: 'Lekcje, quizy i trener bez przerw i limitów' },
  { ru: 'Сохрани темп, набранный за пробный период', uk: 'Збережи темп, набраний за пробний період', es: 'Mantén el ritmo que lograste en la prueba', 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

CONTEXT_BENEFITS.level_up = [
  { ru: 'Ты на подъёме — открой всё и не сбавляй темп', uk: 'Ти на підйомі — відкрий усе й не збавляй темп', es: 'Estás en racha: abre todo y no bajes el ritmo', 'pt-BR': 'Você está em alta: abra tudo e não perca o ritmo', vi: 'Bạn đang lên phong độ — mở hết và giữ nhịp', id: 'Kamu sedang naik: buka semua dan jaga ritme', tr: 'Yükseliştesin — her şeyi aç ve hızını düşürme', pl: 'Jesteś na fali — otwórz wszystko i nie zwalniaj' },
  { ru: 'Следующие уровни без барьеров и ожиданий', uk: 'Наступні рівні без бар\'єрів і очікувань', es: 'Los siguientes niveles sin barreras ni esperas', 'pt-BR': 'Os próximos níveis sem barreiras nem esperas', vi: 'Các cấp tiếp theo không rào cản, không chờ đợi', id: 'Level berikutnya tanpa hambatan dan menunggu', tr: 'Sonraki seviyeler engelsiz ve beklemesiz', pl: 'Kolejne poziomy bez barier i czekania' },
  { ru: 'XP-бусты и больше пользы с каждой сессии', uk: 'XP-бусти й більше користі з кожної сесії', es: 'Bonus de XP y más valor en cada sesión', 'pt-BR': 'Boosts de XP e mais valor por sessão', vi: 'Boost XP và mỗi phiên học có ích hơn', id: 'Boost XP dan manfaat lebih besar tiap sesi', tr: 'XP boostları ve her seanstan daha fazla fayda', pl: 'Boosty XP i więcej wartości z każdej sesji' },
];

CONTEXT_BENEFITS.smart_trainer = [
  { ru: 'Точечный повтор: алгоритм собирает нужный набор', uk: 'Точкове повторення: алгоритм збирає потрібний набір', es: 'Repaso focalizado: el algoritmo arma el set necesario', 'pt-BR': 'Revisão focada: o algoritmo monta o conjunto certo', vi: 'Ôn đúng điểm cần: thuật toán tạo bộ luyện phù hợp', id: 'Ulangan terarah: algoritme menyusun set yang tepat', tr: 'Hedefli tekrar: algoritma doğru seti kurar', pl: 'Celowana powtórka: algorytm składa właściwy zestaw' },
  { ru: 'Упор на фразы, которые пока не держатся', uk: 'Акцент на фразах, які ще не тримаються', es: 'Foco en las frases que aún no se fijan', 'pt-BR': 'Foco nas frases que ainda não firmaram', vi: 'Tập trung vào cụm từ bạn chưa chắc', id: 'Fokus pada frasa yang belum kuat', tr: 'Henüz oturmayan ifadelere odak', pl: 'Nacisk na frazy, które jeszcze nie siedzą' },
  { ru: 'Тренировки без дневного лимита сессий', uk: 'Тренування без денного ліміту сесій', es: 'Entrenamientos sin límite diario de sesiones', 'pt-BR': 'Treinos sem limite diário de sessões', vi: 'Luyện tập không giới hạn phiên mỗi ngày', id: 'Latihan tanpa batas sesi harian', tr: 'Günlük seans sınırı olmadan antrenman', pl: 'Treningi bez dziennego limitu sesji' },
];

CONTEXT_BENEFITS.premium_expired = [
  { ru: 'Продолжаешь ровно с того места, где остановился', uk: 'Продовжуєш саме з того місця, де зупинився', es: 'Sigues justo donde lo dejaste', 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { ru: 'Снова без лимитов и вынужденных пауз', uk: 'Знову без лімітів і вимушених пауз', es: 'De nuevo sin límites ni pausas forzadas', 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { ru: 'Весь твой путь и материалы на месте', uk: 'Весь твій шлях і матеріали на місці', es: 'Todo tu progreso y materiales siguen ahí', 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS.vip_expired = [
  { ru: 'Продолжай со всем, что открыл Plus', uk: 'Продовжуй з усім, що відкрив Plus', es: 'Continúa con todo lo de Plus', 'pt-BR': 'Continue com tudo do Plus', vi: 'Tiếp tục với mọi thứ Plus đã mở', id: 'Lanjut dengan semua dari Plus', tr: 'Plus’ın açtığı her şeyle devam et', pl: 'Kontynuuj ze wszystkim z Plus' },
  { ru: 'Без лимитов на уроки, квизы и практику', uk: 'Без лімітів на уроки, квізи і практику', es: 'Sin límites en lecciones, quizzes y práctica', 'pt-BR': 'Sem limites em lições, quizzes e prática', vi: 'Không giới hạn bài học, quiz và luyện tập', id: 'Tanpa batas pelajaran, kuis, dan latihan', tr: 'Derslerde, quizlerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje, quizy i praktykę' },
  { ru: 'Путь без пауз и дневных потолков', uk: 'Шлях без пауз і денних стель', es: 'Camino sin pausas ni techos diarios', 'pt-BR': 'Caminho sem pausas nem tetos diários', vi: 'Lộ trình không dừng và không trần mỗi ngày', id: 'Jalur tanpa jeda dan plafon harian', tr: 'Ara ve günlük tavan olmadan yol', pl: 'Droga bez pauz i dziennych sufitów' },
];

CONTEXT_BENEFITS.notification_upsell = [
  { ru: 'Весь курс открывается без барьеров', uk: 'Весь курс відкривається без бар\'єрів', es: 'Todo el curso se abre sin barreras', 'pt-BR': 'O curso inteiro abre sem barreiras', vi: 'Toàn bộ khoá học mở không rào cản', id: 'Seluruh kursus terbuka tanpa hambatan', tr: 'Tüm kurs engelsiz açılır', pl: 'Cały kurs otwiera się bez barier' },
  { ru: 'Безлимит практики каждый день', uk: 'Безліміт практики щодня', es: 'Práctica ilimitada cada día', 'pt-BR': 'Prática ilimitada todos os dias', vi: 'Luyện tập không giới hạn mỗi ngày', id: 'Latihan tanpa batas setiap hari', tr: 'Her gün sınırsız pratik', pl: 'Nielimitowana praktyka każdego dnia' },
  { ru: 'Идеальный момент вернуться к цели', uk: 'Ідеальний момент повернутися до мети', es: 'El momento perfecto para volver a tu meta', 'pt-BR': 'O momento perfeito para voltar à sua meta', vi: 'Thời điểm hoàn hảo để quay lại mục tiêu', id: 'Saat tepat untuk kembali ke tujuanmu', tr: 'Hedefine dönmek için mükemmel an', pl: 'Idealny moment, by wrócić do celu' },
];

CONTEXT_BENEFITS.lesson_b1 = [
  { ru: 'B1 открывается как отдельный следующий шаг', uk: 'B1 відкривається як окремий наступний крок', es: 'B1 se abre como un siguiente paso propio', 'pt-BR': 'O B1 abre como um próximo passo próprio', vi: 'B1 mở như một bước tiếp theo riêng', id: 'B1 terbuka sebagai langkah berikutnya sendiri', tr: 'B1 ayrı bir sonraki adım olarak açılır', pl: 'B1 otwiera się jako osobny kolejny krok' },
  { ru: 'Больше живых тем и длиннее ответы', uk: 'Більше живих тем і довші відповіді', es: 'Más temas reales y respuestas más largas', 'pt-BR': 'Mais temas reais e respostas mais longas', vi: 'Nhiều chủ đề thật hơn và câu trả lời dài hơn', id: 'Lebih banyak topik nyata dan jawaban lebih panjang', tr: 'Daha gerçek konular ve daha uzun yanıtlar', pl: 'Więcej żywych tematów i dłuższe odpowiedzi' },
  { ru: 'Продвинутые фразы без искусственной паузы', uk: 'Просунуті фрази без штучної паузи', es: 'Frases avanzadas sin pausa artificial', 'pt-BR': 'Frases avançadas sem pausa artificial', vi: 'Cụm từ nâng cao không bị dừng giả tạo', id: 'Frasa lanjutan tanpa jeda buatan', tr: 'Yapay duraklama olmadan ileri ifadeler', pl: 'Zaawansowane frazy bez sztucznej przerwy' },
];

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
  { ru: 'Сценарии выше уровнем открываются раньше', uk: 'Сценарії вищого рівня відкриваються раніше', es: 'Los escenarios superiores se abren antes', 'pt-BR': 'Cenários mais altos abrem mais cedo', vi: 'Kịch bản cấp cao mở sớm hơn', id: 'Skenario level atas terbuka lebih awal', tr: 'Üst seviye senaryolar daha erken açılır', pl: 'Scenariusze wyższego poziomu otwierają się wcześniej' },
  { ru: 'Больше реальных ситуаций для разговора', uk: 'Більше реальних ситуацій для розмови', es: 'Más situaciones reales para hablar', 'pt-BR': 'Mais situações reais para conversar', vi: 'Nhiều tình huống thật để nói hơn', id: 'Lebih banyak situasi nyata untuk bicara', tr: 'Konuşmak için daha çok gerçek durum', pl: 'Więcej realnych sytuacji do rozmowy' },
  { ru: 'Курс догоняет уровень без скучной паузы', uk: 'Курс наздоганяє рівень без нудної паузи', es: 'El curso alcanza tu nivel sin pausa aburrida', 'pt-BR': 'O curso acompanha seu nível sem pausa chata', vi: 'Khóa học bắt kịp trình độ không phải chờ chán', id: 'Kursus mengejar levelmu tanpa jeda membosankan', tr: 'Kurs seviyeni sıkıcı ara olmadan yakalar', pl: 'Kurs dogania poziom bez nudnej przerwy' },
];

CONTEXT_BENEFITS.flashcard_training = [
  { ru: 'Игровая тренировка сохранённых фраз', uk: 'Ігрове тренування збережених фраз', es: 'Entrenamiento lúdico de frases guardadas', 'pt-BR': 'Treino em jogo com frases salvas', vi: 'Luyện dạng trò chơi với câu đã lưu', id: 'Latihan gim untuk frasa tersimpan', tr: 'Kayıtlı ifadelerle oyunlu antrenman', pl: 'Trening zapisanych fraz w formie gry' },
  { ru: 'Слабые карточки вспоминаются активнее', uk: 'Слабкі картки згадуються активніше', es: 'Recuerdas mejor las tarjetas débiles', 'pt-BR': 'Cartões fracos são lembrados de forma ativa', vi: 'Thẻ yếu được nhớ chủ động hơn', id: 'Kartu lemah diingat lebih aktif', tr: 'Zayıf kartlar daha aktif hatırlanır', pl: 'Słabe fiszki wracają aktywniej' },
  { ru: 'Сохранённое превращается в практику', uk: 'Збережене перетворюється на практику', es: 'Lo guardado se convierte en práctica', 'pt-BR': 'O que você salvou vira prática', vi: 'Mục đã lưu biến thành luyện tập', id: 'Simpanan berubah jadi latihan', tr: 'Kaydedilenler pratiğe dönüşür', pl: 'Zapisane rzeczy zmieniają się w praktykę' },
];

CONTEXT_BENEFITS.flashcard_autoplay = [
  { ru: 'Карточки играют подряд как аудио', uk: 'Картки грають підряд як аудіо', es: 'Las tarjetas suenan seguidas como audio', 'pt-BR': 'Cartões tocam em sequência como áudio', vi: 'Thẻ phát liên tiếp như audio', id: 'Kartu diputar berurutan seperti audio', tr: 'Kartlar ses gibi sırayla oynar', pl: 'Fiszki odtwarzają się po kolei jak audio' },
  { ru: 'Можно повторять вслух без рук', uk: 'Можна повторювати вголос без рук', es: 'Puedes repetir en voz alta sin usar las manos', 'pt-BR': 'Dá para repetir em voz alta sem usar as mãos', vi: 'Có thể lặp lại thành tiếng khi tay bận', id: 'Bisa mengulang dengan suara tanpa tangan', tr: 'Eller serbestken sesli tekrar edebilirsin', pl: 'Możesz powtarzać na głos bez używania rąk' },
  { ru: 'Удобно для дороги и коротких пауз', uk: 'Зручно для дороги й коротких пауз', es: 'Cómodo para trayectos y pausas cortas', 'pt-BR': 'Ótimo para trajetos e pausas curtas', vi: 'Tiện khi di chuyển và nghỉ ngắn', id: 'Nyaman untuk perjalanan dan jeda singkat', tr: 'Yol ve kısa molalar için rahat', pl: 'Wygodne w drodze i krótkich przerwach' },
];

export const CONTEXT_BENEFITS_PLANNED: Partial<Record<PremiumContext, PremiumPlannedCopy[]>> & { generic: PremiumPlannedCopy[] } = {
  language_add: [
    { 'pt-BR': 'Vários idiomas em uma conta', vi: 'Nhiều ngôn ngữ trong một tài khoản', id: 'Beberapa bahasa dalam satu akun', tr: 'Tek hesapta birden çok dil', pl: 'Kilka języków na jednym koncie' },
    { 'pt-BR': 'Cada idioma com seu plano e progresso', vi: 'Mỗi ngôn ngữ có kế hoạch và tiến độ riêng', id: 'Tiap bahasa punya rencana dan progres sendiri', tr: 'Her dilin kendi planı ve ilerlemesi', pl: 'Każdy język ma własny plan i postęp' },
    { 'pt-BR': 'Troque de idioma com um toque', vi: 'Chuyển ngôn ngữ chỉ với một chạm', id: 'Berpindah bahasa dengan satu ketukan', tr: 'Tek dokunuşla diller arasında geç', pl: 'Przełączaj języki jednym dotknięciem' },
  ],
  arena: [
    { 'pt-BR': 'O teto diário de partidas é removido', vi: 'Gỡ giới hạn trận hằng ngày', id: 'Batas pertandingan harian dihapus', tr: 'Günlük maç tavanı kalkar', pl: 'Dzienny limit meczów znika' },
    { 'pt-BR': 'Duelos sem “por hoje chega”', vi: 'Đấu mà không bị “hôm nay đủ rồi”', id: 'Duel tanpa rasa “cukup hari ini”', tr: '“Bugünlük yeter” hissi olmadan düello', pl: 'Pojedynki bez “na dziś wystarczy”' },
    { 'pt-BR': 'Mais ritmo e motivação nos treinos', vi: 'Nhịp và động lực luyện tập mạnh hơn', id: 'Ritme dan motivasi latihan lebih kuat', tr: 'Antrenmanda daha güçlü tempo ve motivasyon', pl: 'Silniejsze tempo i motywacja w treningu' },
  ],
  no_energy: [
    { 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { 'pt-BR': 'Lição, quiz e exame final sem pausas forçadas', vi: 'Bài học, quiz và bài cuối không bị dừng ép buộc', id: 'Pelajaran, kuis, dan ujian akhir tanpa jeda paksa', tr: 'Ders, quiz ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, quiz i egzamin bez wymuszonych przerw' },
    { 'pt-BR': 'Ritmo diário estável sem travar', vi: 'Nhịp học hằng ngày ổn định hơn', id: 'Ritme harian stabil tanpa terhenti', tr: 'Aksamadan istikrarlı günlük ritim', pl: 'Stabilny rytm dnia bez zrywów' },
  ],
  course_after_lesson3: [
    { 'pt-BR': 'Acesso a todas as lições', vi: 'Truy cập tất cả bài học', id: 'Akses ke semua pelajaran', tr: 'Tüm derslere erişim', pl: 'Dostęp do wszystkich lekcji' },
    { 'pt-BR': 'Prática ilimitada sem pausas', vi: 'Luyện tập không giới hạn, không gián đoạn', id: 'Latihan tanpa batas dan tanpa jeda', tr: 'Sınırsız ve kesintisiz pratik', pl: 'Nieograniczona praktyka bez przerw' },
    { 'pt-BR': 'Todos os recursos Plus', vi: 'Mọi tính năng Plus', id: 'Semua fitur Plus', tr: 'Tüm Plus özellikleri', pl: 'Wszystkie funkcje Plus' },
  ],
  lesson_b1: [
    { 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  quiz_limit: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_level: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_medium: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_hard: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  flashcard_limit: [
    { 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda karena energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
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
  trainer: [
    { 'pt-BR': 'Pontos fracos: frases em que você mais trava', vi: 'Điểm yếu: cụm từ bạn hay vấp nhất', id: 'Titik lemah: frasa yang paling sering membuatmu macet', tr: 'Zayıf noktalar: en çok takıldığın ifadeler', pl: 'Słabe punkty: frazy, na których najczęściej się zacinasz' },
    { 'pt-BR': 'Revisão focada: o algoritmo monta o conjunto certo', vi: 'Ôn đúng điểm cần: thuật toán tạo bộ luyện phù hợp', id: 'Ulangan terarah: algoritme menyusun set yang tepat', tr: 'Hedefli tekrar: algoritma doğru seti kurar', pl: 'Celowana powtórka: algorytm buduje właściwy zestaw' },
    { 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { 'pt-BR': 'Revisão inteligente quando quiser', vi: 'Ôn thông minh bất cứ lúc nào', id: 'Pengulangan pintar kapan saja', tr: 'İstediğin zaman akıllı tekrar', pl: 'Inteligentna powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { 'pt-BR': 'Pontos fracos viram análises pessoais precisas', vi: 'Điểm yếu thành phân tích cá nhân chính xác', id: 'Titik lemah jadi analisis personal yang tepat', tr: 'Zayıf noktalar net kişisel analizlere dönüşür', pl: 'Słabsze punkty zmieniają się w dokładne analizy osobiste' },
    { 'pt-BR': 'Explicação clara: onde a frase saiu confusa e como melhorar', vi: 'Giải thích rõ: câu chưa tự nhiên ở đâu và cải thiện thế nào', id: 'Penjelasan jelas: bagian frasa yang kurang kuat dan cara memperbaikinya', tr: 'Net açıklama: ifade nerede zayıfladı ve nasıl güçlenir', pl: 'Jasne wyjaśnienie: gdzie fraza słabnie i jak ją poprawić' },
    { 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
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

CONTEXT_BENEFITS_PLANNED.personal_plan = [
  { 'pt-BR': 'Plano pessoal com tarefas diárias', vi: 'Kế hoạch cá nhân với nhiệm vụ hằng ngày', id: 'Rencana personal dengan tugas harian', tr: 'Günlük görevli kişisel plan', pl: 'Plan osobisty z codziennymi zadaniami' },
  { 'pt-BR': 'Lições, frases, revisão e quizzes do plano', vi: 'Bài học, câu, ôn tập và quiz của kế hoạch', id: 'Pelajaran, frasa, pengulangan, dan kuis rencana', tr: 'Dersler, ifadeler, tekrar ve plan quizleri', pl: 'Lekcje, frazy, powtórki i quizy planu' },
  { 'pt-BR': 'Materiais necessários sem pausas extras', vi: 'Tài liệu cần thiết không bị dừng thêm', id: 'Materi yang dibutuhkan tanpa jeda ekstra', tr: 'Gerekli materyaller ekstra duraklama olmadan', pl: 'Potrzebne materiały bez dodatkowych przerw' },
];

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
  { 'pt-BR': 'Aura no avatar: visível em ligas e duelos', vi: 'Hào quang quanh avatar — nổi bật trong giải và trận đấu', id: 'Aura di avatar: terlihat di liga dan duel', tr: 'Avatarında aura — liglerde ve düellolarda görünürsün', pl: 'Aura wokół awatara — widoczny w ligach i pojedynkach' },
  { 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS_PLANNED.speaking = [
  { 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS_PLANNED.dialog_limit = [
  { 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { 'pt-BR': 'Revisão das falas e dicas dentro do diálogo', vi: 'Gợi ý và phân tích câu ngay trong hội thoại', id: 'Ulasan jawaban dan petunjuk langsung di dialog', tr: 'Diyalog içinde yanıt analizi ve ipuçları', pl: 'Omówienie wypowiedzi i podpowiedzi wprost w dialogu' },
];

CONTEXT_BENEFITS_PLANNED.intro_ended = [
  { 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { 'pt-BR': 'Lições, quizzes e treinador sem pausas nem limites', vi: 'Bài học, quiz và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, kuis, dan trainer tanpa jeda dan batas', tr: 'Dersler, quizler ve antrenör arasız ve sınırsız', pl: 'Lekcje, quizy i trener bez przerw i limitów' },
  { 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

CONTEXT_BENEFITS_PLANNED.level_up = [
  { 'pt-BR': 'Você está em alta: abra tudo e não perca o ritmo', vi: 'Bạn đang lên phong độ — mở hết và giữ nhịp', id: 'Kamu sedang naik: buka semua dan jaga ritme', tr: 'Yükseliştesin — her şeyi aç ve hızını düşürme', pl: 'Jesteś na fali — otwórz wszystko i nie zwalniaj' },
  { 'pt-BR': 'Os próximos níveis sem barreiras nem esperas', vi: 'Các cấp tiếp theo không rào cản, không chờ đợi', id: 'Level berikutnya tanpa hambatan dan menunggu', tr: 'Sonraki seviyeler engelsiz ve beklemesiz', pl: 'Kolejne poziomy bez barier i czekania' },
  { 'pt-BR': 'Boosts de XP e mais valor por sessão', vi: 'Boost XP và mỗi phiên học có ích hơn', id: 'Boost XP dan manfaat lebih besar tiap sesi', tr: 'XP boostları ve her seanstan daha fazla fayda', pl: 'Boosty XP i więcej wartości z każdej sesji' },
];

CONTEXT_BENEFITS_PLANNED.smart_trainer = [
  { 'pt-BR': 'Revisão focada: o algoritmo monta o conjunto certo', vi: 'Ôn đúng điểm cần: thuật toán tạo bộ luyện phù hợp', id: 'Ulangan terarah: algoritme menyusun set yang tepat', tr: 'Hedefli tekrar: algoritma doğru seti kurar', pl: 'Celowana powtórka: algorytm składa właściwy zestaw' },
  { 'pt-BR': 'Foco nas frases que ainda não firmaram', vi: 'Tập trung vào cụm từ bạn chưa chắc', id: 'Fokus pada frasa yang belum kuat', tr: 'Henüz oturmayan ifadelere odak', pl: 'Nacisk na frazy, które jeszcze nie siedzą' },
  { 'pt-BR': 'Treinos sem limite diário de sessões', vi: 'Luyện tập không giới hạn phiên mỗi ngày', id: 'Latihan tanpa batas sesi harian', tr: 'Günlük seans sınırı olmadan antrenman', pl: 'Treningi bez dziennego limitu sesji' },
];

CONTEXT_BENEFITS_PLANNED.premium_expired = [
  { 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS_PLANNED.vip_expired = [
  { 'pt-BR': 'Continue com tudo do Plus', vi: 'Tiếp tục với mọi thứ Plus đã mở', id: 'Lanjut dengan semua dari Plus', tr: 'Plus’ın açtığı her şeyle devam et', pl: 'Kontynuuj ze wszystkim z Plus' },
  { 'pt-BR': 'Sem limites em lições, quizzes e prática', vi: 'Không giới hạn bài học, quiz và luyện tập', id: 'Tanpa batas pelajaran, kuis, dan latihan', tr: 'Derslerde, quizlerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje, quizy i praktykę' },
  { 'pt-BR': 'Caminho sem pausas nem tetos diários', vi: 'Lộ trình không dừng và không trần mỗi ngày', id: 'Jalur tanpa jeda dan plafon harian', tr: 'Ara ve günlük tavan olmadan yol', pl: 'Droga bez pauz i dziennych sufitów' },
];

CONTEXT_BENEFITS_PLANNED.notification_upsell = [
  { 'pt-BR': 'O curso inteiro abre sem barreiras', vi: 'Toàn bộ khoá học mở không rào cản', id: 'Seluruh kursus terbuka tanpa hambatan', tr: 'Tüm kurs engelsiz açılır', pl: 'Cały kurs otwiera się bez barier' },
  { 'pt-BR': 'Prática ilimitada todos os dias', vi: 'Luyện tập không giới hạn mỗi ngày', id: 'Latihan tanpa batas setiap hari', tr: 'Her gün sınırsız pratik', pl: 'Nielimitowana praktyka każdego dnia' },
  { 'pt-BR': 'O momento perfeito para voltar à sua meta', vi: 'Thời điểm hoàn hảo để quay lại mục tiêu', id: 'Saat tepat untuk kembali ke tujuanmu', tr: 'Hedefine dönmek için mükemmel an', pl: 'Idealny moment, by wrócić do celu' },
];

CONTEXT_BENEFITS_PLANNED.lesson_b1 = [
  { 'pt-BR': 'O B1 abre como um próximo passo próprio', vi: 'B1 mở như một bước tiếp theo riêng', id: 'B1 terbuka sebagai langkah berikutnya sendiri', tr: 'B1 ayrı bir sonraki adım olarak açılır', pl: 'B1 otwiera się jako osobny kolejny krok' },
  { 'pt-BR': 'Mais temas reais e respostas mais longas', vi: 'Nhiều chủ đề thật hơn và câu trả lời dài hơn', id: 'Lebih banyak topik nyata dan jawaban lebih panjang', tr: 'Daha gerçek konular ve daha uzun yanıtlar', pl: 'Więcej żywych tematów i dłuższe odpowiedzi' },
  { 'pt-BR': 'Frases avançadas sem pausa artificial', vi: 'Cụm từ nâng cao không bị dừng giả tạo', id: 'Frasa lanjutan tanpa jeda buatan', tr: 'Yapay duraklama olmadan ileri ifadeler', pl: 'Zaawansowane frazy bez sztucznej przerwy' },
];

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
  { 'pt-BR': 'Cenários mais altos abrem mais cedo', vi: 'Kịch bản cấp cao mở sớm hơn', id: 'Skenario level atas terbuka lebih awal', tr: 'Üst seviye senaryolar daha erken açılır', pl: 'Scenariusze wyższego poziomu otwierają się wcześniej' },
  { 'pt-BR': 'Mais situações reais para conversar', vi: 'Nhiều tình huống thật để nói hơn', id: 'Lebih banyak situasi nyata untuk bicara', tr: 'Konuşmak için daha çok gerçek durum', pl: 'Więcej realnych sytuacji do rozmowy' },
  { 'pt-BR': 'O curso acompanha seu nível sem pausa chata', vi: 'Khóa học bắt kịp trình độ không phải chờ chán', id: 'Kursus mengejar levelmu tanpa jeda membosankan', tr: 'Kurs seviyeni sıkıcı ara olmadan yakalar', pl: 'Kurs dogania poziom bez nudnej przerwy' },
];

CONTEXT_BENEFITS_PLANNED.flashcard_training = [
  { 'pt-BR': 'Treino em jogo com frases salvas', vi: 'Luyện dạng trò chơi với câu đã lưu', id: 'Latihan gim untuk frasa tersimpan', tr: 'Kayıtlı ifadelerle oyunlu antrenman', pl: 'Trening zapisanych fraz w formie gry' },
  { 'pt-BR': 'Cartões fracos são lembrados de forma ativa', vi: 'Thẻ yếu được nhớ chủ động hơn', id: 'Kartu lemah diingat lebih aktif', tr: 'Zayıf kartlar daha aktif hatırlanır', pl: 'Słabe fiszki wracają aktywniej' },
  { 'pt-BR': 'O que você salvou vira prática', vi: 'Mục đã lưu biến thành luyện tập', id: 'Simpanan berubah jadi latihan', tr: 'Kaydedilenler pratiğe dönüşür', pl: 'Zapisane rzeczy zmieniają się w praktykę' },
];

CONTEXT_BENEFITS_PLANNED.flashcard_autoplay = [
  { 'pt-BR': 'Cartões tocam em sequência como áudio', vi: 'Thẻ phát liên tiếp như audio', id: 'Kartu diputar berurutan seperti audio', tr: 'Kartlar ses gibi sırayla oynar', pl: 'Fiszki odtwarzają się po kolei jak audio' },
  { 'pt-BR': 'Dá para repetir em voz alta sem usar as mãos', vi: 'Có thể lặp lại thành tiếng khi tay bận', id: 'Bisa mengulang dengan suara tanpa tangan', tr: 'Eller serbestken sesli tekrar edebilirsin', pl: 'Możesz powtarzać na głos bez używania rąk' },
  { 'pt-BR': 'Ótimo para trajetos e pausas curtas', vi: 'Tiện khi di chuyển và nghỉ ngắn', id: 'Nyaman untuk perjalanan dan jeda singkat', tr: 'Yol ve kısa molalar için rahat', pl: 'Wygodne w drodze i krótkich przerwach' },
];

export function getContextBenefitPlanned(ctx: PremiumContext, index: number): PremiumPlannedCopy {
  const rows = CONTEXT_BENEFITS_PLANNED[ctx] ?? CONTEXT_BENEFITS_PLANNED.generic;
  return rows[index] ?? CONTEXT_BENEFITS_PLANNED.generic[Math.min(index, CONTEXT_BENEFITS_PLANNED.generic.length - 1)];
}


/** Per-screen хелпер локализации: LP(ru, uk, es, planned) с языком экрана. */
export function makeLP(lang: Lang) {
  return (ru: string, uk: string, es: string, planned: PremiumPlannedCopy): string =>
    triLang(lang, { ru, uk, es, 'pt-BR': planned['pt-BR'], vi: planned.vi, id: planned.id, tr: planned.tr, pl: planned.pl });
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
