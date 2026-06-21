// ════════════════════════════════════════════════════════════════════════════
// paywall_copy.ts — контекстные копирайты пейвола (26 контекстов × 8 языков)
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
  lesson_b1: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  quiz_limit: { accent: '#C8FF00', accent2: '#66E6FF', shardAmount: 80 },
  quiz_level: { accent: '#7DD3FC', accent2: '#A78BFA', shardAmount: 180 },
  quiz_medium: { accent: '#FDBA74', accent2: '#C8FF00', shardAmount: 180 },
  quiz_hard: { accent: '#C084FC', accent2: '#FF6BB5', shardAmount: 420 },
  flashcard_limit: { accent: '#8BD3FF', accent2: '#FDE68A', shardAmount: 80 },
  streak: { accent: '#FFB020', accent2: '#FF5C5C', shardAmount: 180 },
  theme: { accent: '#F0ABFC', accent2: '#67E8F9', shardAmount: 180 },
  club: { accent: '#FACC15', accent2: '#22C55E', shardAmount: 420 },
  trainer: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  trainer_limit: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  dialog_limit: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
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
  titleRu: 'Открой весь текущий уровень',
  titleUk: 'Відкрий весь поточний рівень',
  titleEs: 'Abre todo tu nivel actual',
  subtitleRu: 'A1 открыт бесплатно и проходится последовательно. Premium открывает весь текущий уровень: все уроки доступны сразу, без блокировок по результату. Следующие уровни открываются через экзамены.',
  subtitleUk: 'A1 відкритий безкоштовно й проходиться послідовно. Premium відкриває весь поточний рівень: усі уроки доступні одразу, без блокувань за результатом. Наступні рівні відкриваються через екзамени.',
  subtitleEs: 'A1 es gratis y se avanza paso a paso. Premium abre todo tu nivel actual: todas las lecciones disponibles al instante, sin bloqueos por resultado. Los siguientes niveles se abren con exámenes.',
};
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'Abra todo o nível atual',
    vi: 'Mở toàn bộ cấp hiện tại',
    id: 'Buka seluruh level saat ini',
    tr: 'Mevcut seviyeyi tamamen aç',
    pl: 'Otwórz cały obecny poziom',
  },
  subtitle: {
    'pt-BR': 'O A1 é grátis e avança passo a passo. Premium abre todo o nível atual: todas as lições disponíveis na hora, sem bloqueios por resultado. Os próximos níveis abrem por exames.',
    vi: 'A1 miễn phí và mở từng bài theo tiến độ. Premium mở toàn bộ cấp hiện tại: mọi bài học có ngay, không bị khóa theo kết quả. Các cấp tiếp theo mở qua bài kiểm tra.',
    id: 'A1 gratis dan dibuka bertahap. Premium membuka seluruh level saat ini: semua pelajaran langsung tersedia, tanpa kunci dari hasil. Level berikutnya dibuka lewat ujian.',
    tr: 'A1 ücretsizdir ve adım adım açılır. Premium mevcut seviyenin tamamını açar: tüm dersler hemen erişilir, sonuç engeli yoktur. Sonraki seviyeler sınavlarla açılır.',
    pl: 'A1 jest darmowy i odblokowuje się krok po kroku. Premium otwiera cały obecny poziom: wszystkie lekcje od razu, bez blokad za wynik. Kolejne poziomy otwierają się przez egzaminy.',
  },
};

export function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 'generic';
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'lesson_b1') return 'course_after_lesson3';
  // План #11: smart_trainer теперь самостоятельный контекст (свой lock-preview + copy).
  if (value === 'trainer_smart_mix') return 'smart_trainer';
  if (value === 'avatar_aura') return 'theme';
  return PREMIUM_CONTEXT_SET.has(value as PremiumContext) ? (value as PremiumContext) : 'generic';
}

export const PAYWALL_COPY: Partial<Record<PremiumContext, PaywallCopy>> & { generic: PaywallCopy } = {
  arena: {
    titleRu: 'Больше дуэлей на Арене каждый день',
    titleUk: 'Більше дуелей на Арені щодня',
    titleEs: 'Más partidas en la Arena cada día',
    subtitleRu: 'Premium снимает дневной лимит матчей — сражайся в дуэлях, крепи стратегию и рост без ощущения «всё, хватит на сегодня».',
    subtitleUk: 'Premium знімає денний ліміт матчів — воюй вживу, вдосконалюй стратегію і ріст без «на сьогодні досить».',
    subtitleEs:
      'Premium quita el límite diario de partidas: compite cada día, fortalece tu estrategia y tu progreso sin el «ya está bien por hoy».',
  },
  no_energy: {
    titleRu: 'Останови паузы из-за энергии',
    titleUk: 'Зупини паузи через енергію',
    titleEs: 'Evita pausas por energía',
    subtitleRu: 'С Premium — безлимитная энергия: уроки, квизы и финальный экзамен без таймера ожидания, ритм только твой.',
    subtitleUk: 'З Premium — безлімітна енергія: уроки, квізи та фінальний іспит без таймера — ритм лише твій.',
    subtitleEs: 'Con Premium tienes energía ilimitada: lecciones, quizzes y examen final sin temporizadores de espera, a tu ritmo.',
  },
  streak: {
    titleRu: 'Не теряй серию, которую уже построил',
    titleUk: 'Не втрачай серію, яку вже побудував',
    titleEs: 'No pierdas la racha que ya llevas',
    subtitleRu: 'Premium защищает твой ритм: учись без пауз и не откатывайся из-за одного пропуска.',
    subtitleUk: 'Premium захищає твій ритм: навчайся без пауз і не відкатуйся через один пропуск.',
    subtitleEs: 'Premium protege tu ritmo: estudia sin pausas y no retrocedas por un solo día sin practicar.',
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_COPY,
  lesson_b1: COURSE_AFTER_LESSON3_COPY,
  quiz_limit: {
    titleRu: 'Не останавливай прогресс из-за лимитов',
    titleUk: 'Не зупиняй прогрес через ліміти',
    titleEs: 'No frenes tu progreso por los límites',
    subtitleRu: 'С Premium учись без пауз и держи ежедневный темп.',
    subtitleUk: 'З Premium навчайся без пауз і тримай щоденний темп.',
    subtitleEs: 'Con Premium estudia sin frenos y mantén tu ritmo diario.',
  },
  quiz_level: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_medium: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_hard: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
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
    subtitleRu: 'С Premium приложение становится твоим: больше вовлеченности, выше регулярность занятий.',
    subtitleUk: 'З Premium застосунок стає твоїм: більше залучення, вища регулярність занять.',
    subtitleEs: 'Con Premium la app se siente tuya: más implicación y más constancia en cada sesión.',
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
    subtitleRu: 'Слабые места, Smart Mix, По теме, Сложные — 4 режима работают только на Premium. Без лимита сессий.',
    subtitleUk: 'Слабкі місця, Smart Mix, За темою, Складні — 4 режими лише для Premium. Без ліміту сесій.',
    subtitleEs: 'Débiles, Smart Mix, Por tema, Difíciles — 4 modos solo para Premium. Sin límite de sesiones.',
  },
  trainer_limit: {
    // Библия Phraseman: gain-framing, без слова «лимит», без хардкода числа сессий
    // (оно теперь A/B-переменное). Стиль Инвестор: «что открывается».
    titleRu: 'Тренируйся сколько хочешь',
    titleUk: 'Тренуйся скільки хочеш',
    titleEs: 'Entrena cuanto quieras',
    subtitleRu: 'Premium открывает безлимит сессий Тренера во всех режимах. Повторяй фразы столько, сколько нужно — без пауз.',
    subtitleUk: 'Premium відкриває безліміт сесій Тренера в усіх режимах. Повторюй фрази стільки, скільки треба — без пауз.',
    subtitleEs: 'Premium abre sesiones del Entrenador sin límite en todos los modos. Repite las frases cuanto necesites, sin pausas.',
  },
  dialog_limit: {
    titleRu: 'Живая практика в диалогах',
    titleUk: 'Жива практика в діалогах',
    titleEs: 'Práctica real en los diálogos',
    subtitleRu: 'Premium открывает живую практику английского: новые сценарии, разбор каждой реплики, твои слова из карточек.',
    subtitleUk: 'Premium відкриває живу практику англійської: нові сценарії, розбір кожної репліки, твої слова з карток.',
    subtitleEs: 'Premium abre práctica real de inglés: nuevos escenarios, análisis de cada frase y tus palabras de las tarjetas.',
  },
  diagnosis_training: {
    // Библия: «ошибка»→«разбор/что подтянуть», ≤10 слов/предложение, gain-framing.
    titleRu: 'Разбирай слабые места без лимита',
    titleUk: 'Розбирай слабкі місця без ліміту',
    titleEs: 'Analiza tus puntos débiles sin límite',
    subtitleRu: 'Premium открывает персональный разбор каждого слабого места. Понятное объяснение, верный вариант и тренировка на похожих фразах.',
    subtitleUk: 'Premium відкриває персональний розбір кожного слабкого місця. Зрозуміле пояснення, правильний варіант і тренування на схожих фразах.',
    subtitleEs: 'Premium abre un análisis personal de cada punto débil. Explicación clara, forma correcta y práctica con frases parecidas.',
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
    subtitleRu: 'Premium открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания осколков.',
    subtitleUk: 'Premium відкриває повтор будь-якого пройденого раунду. Закріплюй складні фрази без списання осколків.',
    subtitleEs: 'Premium abre el repaso de cualquier ronda completada. Refuerza las frases difíciles sin gastar fragmentos.',
  },
  stats: {
    titleRu: 'Аналитика прогресса — для Premium',
    titleUk: 'Аналітика прогресу — для Premium',
    titleEs: 'Analítica del progreso — Premium',
    subtitleRu: 'Карта активности за год, паттерны ошибок, сравнение с другими учениками. Видишь чёткую картину своего роста.',
    subtitleUk: 'Карта активності за рік, патерни помилок, порівняння з іншими учнями. Бачиш чітку картину свого зростання.',
    subtitleEs: 'Mapa anual de actividad, patrones de error y comparación. Ves tu progreso con total claridad.',
  },
  heatmap: {
    titleRu: 'Карта активности — для Premium',
    titleUk: 'Карта активності — для Premium',
    titleEs: 'Mapa de actividad — Premium',
    subtitleRu: '365 дней занятий на одном экране — увидишь свои сильные и слабые периоды.',
    subtitleUk: '365 днів занять на одному екрані — побач свої сильні й слабкі періоди.',
    subtitleEs: '365 días de estudio en una sola vista: encuentra tus mejores y peores semanas.',
  },
  patterns: {
    titleRu: 'Паттерны твоих ошибок',
    titleUk: 'Патерни твоїх помилок',
    titleEs: 'Patrones de tus errores',
    subtitleRu: 'Узнай в каких темах и фразах ты ошибаешься чаще всего — и тренируй именно их.',
    subtitleUk: 'Дізнайся в яких темах і фразах ти помиляєшся найчастіше — і тренуй саме їх.',
    subtitleEs: 'Descubre los temas y frases donde más fallas y entrena justo lo que importa.',
  },
  percentiles: {
    titleRu: 'Сравнение с другими — для Premium',
    titleUk: 'Порівняння з іншими — для Premium',
    titleEs: 'Comparación con otros — Premium',
    subtitleRu: 'Увидишь, где ты в топе среди всех учеников. Без дизморали — только то, в чём ты крут.',
    subtitleUk: 'Бач куди ти в топі серед усіх учнів. Без дизморалі — лише те, в чому ти крутий.',
    subtitleEs: 'Mira dónde destacas frente a otros estudiantes. Solo lo positivo, sin desmotivar.',
  },
  generic: {
    titleRu: 'Учись быстрее с Premium',
    titleUk: 'Навчайся швидше з Premium',
    titleEs: 'Aprende más rápido con Premium',
    subtitleRu: 'Больше практики, меньше ограничений, стабильный прогресс каждый день.',
    subtitleUk: 'Більше практики, менше обмежень, стабільний прогрес щодня.',
    subtitleEs: 'Más práctica, menos frenos y progreso estable cada día.',
  },
};

PAYWALL_COPY.quiz_limit = {
  titleRu: 'Лимит квизов на сегодня исчерпан',
  titleUk: 'Ліміт квізів на сьогодні вичерпано',
  titleEs: 'Ya usaste tus 3 cuestionarios gratis de hoy',
  subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
  subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
  subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
};

PAYWALL_COPY.personal_plan = {
  titleRu: 'Получить персональный план',
  titleUk: 'Отримати персональний план',
  titleEs: 'Activar tu plan personal',
  subtitleRu: 'Premium включает задания на каждый день: уроки, живые фразы, повторение и проверки под твою цель. План держит темп, а материалы открываются без лишних остановок.',
  subtitleUk: 'Premium вмикає завдання на кожен день: уроки, живі фрази, повторення й перевірки під твою ціль. План тримає темп, а матеріали відкриваються без зайвих пауз.',
  subtitleEs: 'Premium activa tareas diarias: lecciones, frases reales, repaso y pruebas según tu meta. El plan mantiene el ritmo y los materiales se abren sin pausas extra.',
};

PAYWALL_COPY.intro_ended = {
  // Библия: gain-framing (не loss — стрика 7+ тут нет), ≤10 слов/предложение, «ты».
  titleRu: 'Продолжай в полном доступе',
  titleUk: 'Продовжуй у повному доступі',
  titleEs: 'Sigue con acceso completo',
  subtitleRu: 'Ты уже почувствовал полный доступ. Premium открывает его насовсем — без пауз и блокировок.',
  subtitleUk: 'Ти вже відчув повний доступ. Premium відкриває його назавжди — без пауз і блокувань.',
  subtitleEs: 'Ya probaste el acceso completo. Premium lo abre para siempre, sin pausas ni bloqueos.',
};

// План #3: after-win апсейл при повышении уровня. Стиль 2 Игра + 3 Инвестор, gain-framing.
PAYWALL_COPY.level_up = {
  titleRu: 'Ты растёшь быстро',
  titleUk: 'Ти ростеш швидко',
  titleEs: 'Estás creciendo rápido',
  subtitleRu: 'Новый уровень — твой. Premium снимает все лимиты на пути.',
  subtitleUk: 'Новий рівень — твій. Premium знімає всі ліміти на шляху.',
  subtitleEs: 'Nuevo nivel desbloqueado. Premium quita todos los límites del camino.',
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
  subtitleRu: 'Premium открывает режим говорения: произноси фразы вслух, а приложение слушает и подсказывает. Самый быстрый путь заговорить уверенно.',
  subtitleUk: 'Premium відкриває режим говоріння: вимовляй фрази вголос, а застосунок слухає й підказує. Найшвидший шлях заговорити впевнено.',
  subtitleEs: 'Premium abre el modo de voz: di las frases en voz alta y la app te escucha y te guía. El camino más rápido para hablar con seguridad.',
};

export const PAYWALL_PLANNED_COPY: Partial<Record<PremiumContext, PremiumPlannedHeroCopy>> & { generic: PremiumPlannedHeroCopy } = {
  arena: {
    title: { 'pt-BR': 'Mais duelos na Arena todos os dias', vi: 'Thêm trận đấu Arena mỗi ngày', id: 'Lebih banyak duel Arena setiap hari', tr: 'Her gün daha fazla Arena düellosu', pl: 'Więcej pojedynków na Arenie każdego dnia' },
    subtitle: {
      'pt-BR': 'Premium remove o limite diário de partidas: compita todos os dias, fortaleça sua estratégia e avance sem sentir “por hoje chega”.',
      vi: 'Premium bỏ giới hạn trận hằng ngày: thi đấu mỗi ngày, tăng chiến thuật và tiến bộ mà không bị chặn giữa nhịp.',
      id: 'Premium menghapus batas pertandingan harian: bertanding tiap hari, perkuat strategi, dan berkembang tanpa rasa “cukup untuk hari ini”.',
      tr: 'Premium günlük maç sınırını kaldırır: her gün yarış, stratejini güçlendir ve “bugünlük bu kadar” hissi olmadan ilerle.',
      pl: 'Premium usuwa dzienny limit meczów: rywalizuj codziennie, wzmacniaj strategię i rośnij bez wrażenia “na dziś koniec”.',
    },
  },
  no_energy: {
    title: { 'pt-BR': 'Pare as pausas por falta de energia', vi: 'Dừng những lần nghỉ vì hết năng lượng', id: 'Hentikan jeda karena energi habis', tr: 'Enerji yüzünden verilen araları durdur', pl: 'Zatrzymaj przerwy przez energię' },
    subtitle: {
      'pt-BR': 'Com Premium, energia ilimitada: lições, quizzes e exame final sem temporizador de espera, no seu ritmo.',
      vi: 'Với Premium, năng lượng không giới hạn: bài học, quiz và bài kiểm tra cuối không cần chờ, theo nhịp của bạn.',
      id: 'Dengan Premium, energi tanpa batas: pelajaran, kuis, dan ujian akhir tanpa timer tunggu, sesuai ritmemu.',
      tr: 'Premium ile sınırsız enerji: dersler, quizler ve final sınavı bekleme sayacı olmadan, senin ritminde.',
      pl: 'Z Premium energia jest bez limitu: lekcje, quizy i egzamin końcowy bez czekania, w twoim rytmie.',
    },
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_PLANNED_COPY,
  lesson_b1: COURSE_AFTER_LESSON3_PLANNED_COPY,
  quiz_limit: {
    title: { 'pt-BR': 'O limite de quizzes de hoje acabou', vi: 'Đã hết lượt quiz hôm nay', id: 'Batas kuis hari ini habis', tr: 'Bugünkü quiz sınırı doldu', pl: 'Dzisiejszy limit quizów został wykorzystany' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_level: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_medium: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_hard: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
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
      'pt-BR': 'Premium protege seu ritmo: estude sem pausas e não volte atrás por um dia perdido.',
      vi: 'Premium bảo vệ nhịp học: học không gián đoạn và không bị tụt lại vì một ngày bỏ lỡ.',
      id: 'Premium melindungi ritmemu: belajar tanpa jeda dan tidak mundur karena satu hari terlewat.',
      tr: 'Premium ritmini korur: ara vermeden çalış ve tek bir kaçırılan gün yüzünden geri düşme.',
      pl: 'Premium chroni twój rytm: ucz się bez przerw i nie cofaj się przez jeden opuszczony dzień.',
    },
  },
  theme: {
    title: { 'pt-BR': 'Personalize o aprendizado do seu jeito', vi: 'Cá nhân hóa việc học theo bạn', id: 'Sesuaikan belajar dengan gayamu', tr: 'Öğrenmeyi kendine göre kişiselleştir', pl: 'Dopasuj naukę do siebie' },
    subtitle: {
      'pt-BR': 'Com Premium, o app fica mais seu: mais envolvimento e mais regularidade nos estudos.',
      vi: 'Với Premium, ứng dụng giống của bạn hơn: gắn bó hơn và học đều hơn.',
      id: 'Dengan Premium, aplikasi terasa lebih milikmu: lebih terlibat dan lebih konsisten.',
      tr: 'Premium ile uygulama sana ait hisseder: daha fazla bağlılık, daha düzenli çalışma.',
      pl: 'Z Premium aplikacja staje się bardziej twoja: większe zaangażowanie i regularność.',
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
      'pt-BR': 'Pontos fracos, Smart Mix, Por tema e Difíceis: 4 modos funcionam só no Premium. Sem limite de sessões.',
      vi: 'Điểm yếu, Smart Mix, Theo chủ đề, Câu khó: 4 chế độ chỉ có trong Premium. Không giới hạn phiên.',
      id: 'Titik lemah, Smart Mix, Per topik, Sulit: 4 mode hanya berjalan di Premium. Tanpa batas sesi.',
      tr: 'Zayıf noktalar, Smart Mix, Konuya göre, Zorlar: 4 mod sadece Premium ile çalışır. Seans sınırı yok.',
      pl: 'Słabe punkty, Smart Mix, Według tematu, Trudne: 4 tryby działają tylko w Premium. Bez limitu sesji.',
    },
  },
  trainer_limit: {
    // gain-framing, без хардкода числа бесплатных сессий (A/B-переменное)
    title: { 'pt-BR': 'Treine quanto quiser', vi: 'Luyện tập thỏa thích', id: 'Berlatih sepuasnya', tr: 'İstediğin kadar antrenman', pl: 'Trenuj ile chcesz' },
    subtitle: {
      'pt-BR': 'Premium abre sessões ilimitadas do Treinador em todos os modos.',
      vi: 'Premium mở các phiên Huấn luyện viên không giới hạn ở mọi chế độ.',
      id: 'Premium membuka sesi Trainer tanpa batas di semua mode.',
      tr: 'Premium tüm modlarda sınırsız Antrenör seansı açar.',
      pl: 'Premium otwiera nieograniczone sesje Trenera we wszystkich trybach.',
    },
  },
  diagnosis_training: {
    title: { 'pt-BR': 'Novas análises de erros no Premium', vi: 'Phân tích lỗi mới có trong Premium', id: 'Analisis kesalahan baru ada di Premium', tr: 'Yeni hata analizleri Premium’da', pl: 'Nowe analizy błędów w Premium' },
    subtitle: {
      'pt-BR': 'A primeira análise pessoal é grátis. Premium abre cada erro novo: explicação clara, forma correta e prática com frases parecidas sem limite.',
      vi: 'Phân tích cá nhân đầu tiên miễn phí. Premium mở từng lỗi mới: giải thích rõ, dạng đúng và luyện câu tương tự không giới hạn.',
      id: 'Analisis personal pertama gratis. Premium membuka setiap kesalahan baru: penjelasan jelas, bentuk benar, dan latihan frasa mirip tanpa batas.',
      tr: 'İlk kişisel analiz ücretsiz. Premium her yeni hatayı açar: net açıklama, doğru biçim ve benzer ifadelerle sınırsız pratik.',
      pl: 'Pierwsza analiza osobista jest darmowa. Premium otwiera każdy nowy błąd: jasne wyjaśnienie, poprawną wersję i ćwiczenia na podobnych frazach bez limitu.',
    },
  },
  mastery: {
    title: { 'pt-BR': 'Repita lições sem limites', vi: 'Ôn lại bài học không giới hạn', id: 'Ulang pelajaran tanpa batas', tr: 'Dersleri sınırsız tekrar et', pl: 'Powtarzaj lekcje bez ograniczeń' },
    subtitle: {
      'pt-BR': 'Com Premium, qualquer lição concluída fica aberta para repetir sem gastar fragmentos, mesmo quando o preço subiria a cada repetição.',
      vi: 'Với Premium, mọi bài đã hoàn thành đều có thể ôn lại mà không tốn mảnh, kể cả khi giá tăng sau mỗi lần học lại.',
      id: 'Dengan Premium, semua pelajaran selesai bisa diulang tanpa memakai fragmen, bahkan saat harga naik di tiap pengulangan.',
      tr: 'Premium ile tamamlanan her dersi parça harcamadan tekrar edersin, ücretsiz modda fiyat her tekrar artsa bile.',
      pl: 'Z Premium każda ukończona lekcja jest otwarta do powtórki bez odłamków, nawet gdy w trybie free cena rosłaby po każdym przejściu.',
    },
  },
  stats: {
    title: { 'pt-BR': 'Análises de progresso no Premium', vi: 'Phân tích tiến bộ dành cho Premium', id: 'Analitik progres untuk Premium', tr: 'İlerleme analizi Premium’da', pl: 'Analityka postępu w Premium' },
    subtitle: {
      'pt-BR': 'Mapa anual de atividade, padrões de erro e comparação com outros alunos. Você vê seu crescimento com clareza.',
      vi: 'Bản đồ hoạt động cả năm, mẫu lỗi và so sánh với học viên khác. Bạn thấy rõ bức tranh tiến bộ của mình.',
      id: 'Peta aktivitas setahun, pola kesalahan, dan perbandingan dengan siswa lain. Kamu melihat perkembangan dengan jelas.',
      tr: 'Yıllık etkinlik haritası, hata kalıpları ve diğer öğrencilerle karşılaştırma. Gelişimini net görürsün.',
      pl: 'Roczna mapa aktywności, wzorce błędów i porównanie z innymi uczniami. Widzisz jasny obraz swojego wzrostu.',
    },
  },
  heatmap: {
    title: { 'pt-BR': 'Mapa de atividade no Premium', vi: 'Bản đồ hoạt động dành cho Premium', id: 'Peta aktivitas untuk Premium', tr: 'Etkinlik haritası Premium’da', pl: 'Mapa aktywności w Premium' },
    subtitle: {
      'pt-BR': '365 dias de estudo em uma tela: veja seus períodos fortes e fracos.',
      vi: '365 ngày học trên một màn hình: thấy giai đoạn mạnh và yếu của bạn.',
      id: '365 hari belajar dalam satu layar: lihat periode kuat dan lemahmu.',
      tr: 'Tek ekranda 365 gün çalışma: güçlü ve zayıf dönemlerini gör.',
      pl: '365 dni nauki na jednym ekranie: zobacz swoje mocne i słabe okresy.',
    },
  },
  patterns: {
    title: { 'pt-BR': 'Padrões dos seus erros', vi: 'Mẫu lỗi của bạn', id: 'Pola kesalahanmu', tr: 'Hata kalıpların', pl: 'Wzorce twoich błędów' },
    subtitle: {
      'pt-BR': 'Descubra em quais temas e frases você mais erra — e treine exatamente isso.',
      vi: 'Biết chủ đề và cụm từ bạn sai nhiều nhất — rồi luyện đúng phần đó.',
      id: 'Temukan topik dan frasa yang paling sering salah — lalu latih tepat bagian itu.',
      tr: 'En çok hangi konularda ve ifadelerde hata yaptığını gör — tam onları çalış.',
      pl: 'Zobacz, w jakich tematach i frazach mylisz się najczęściej — i trenuj właśnie je.',
    },
  },
  percentiles: {
    title: { 'pt-BR': 'Comparação com outros no Premium', vi: 'So sánh với người khác dành cho Premium', id: 'Perbandingan dengan pengguna lain di Premium', tr: 'Diğerleriyle karşılaştırma Premium’da', pl: 'Porównanie z innymi w Premium' },
    subtitle: {
      'pt-BR': 'Veja onde você se destaca entre os alunos. Sem desmotivar: só o que mostra sua força.',
      vi: 'Xem bạn nổi bật ở đâu so với học viên khác. Không làm nản: chỉ những điểm bạn mạnh.',
      id: 'Lihat di mana kamu unggul di antara siswa lain. Tanpa menjatuhkan motivasi: hanya sisi kuatmu.',
      tr: 'Öğrenciler arasında nerede öne çıktığını gör. Moral bozma yok: sadece güçlü olduğun yerler.',
      pl: 'Zobacz, gdzie jesteś wysoko wśród uczniów. Bez demotywacji: tylko to, w czym jesteś mocny.',
    },
  },
  generic: {
    title: { 'pt-BR': 'Aprenda mais rápido com Premium', vi: 'Học nhanh hơn với Premium', id: 'Belajar lebih cepat dengan Premium', tr: 'Premium ile daha hızlı öğren', pl: 'Ucz się szybciej z Premium' },
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
    'pt-BR': 'Premium libera tarefas diárias: lições, frases reais, revisão e quizzes alinhados ao seu objetivo.',
    vi: 'Premium mở nhiệm vụ hằng ngày: bài học, câu thật, ôn tập và quiz theo mục tiêu của bạn.',
    id: 'Premium membuka tugas harian: pelajaran, frasa nyata, pengulangan, dan kuis sesuai tujuanmu.',
    tr: 'Premium günlük görevleri açar: dersler, gerçek ifadeler, tekrar ve hedefe uygun quizler.',
    pl: 'Premium otwiera codzienne zadania: lekcje, żywe frazy, powtórki i quizy pod twój cel.',
  },
};

PAYWALL_PLANNED_COPY.premium_expired = {
  title: {
    'pt-BR': 'Recupere o acesso Premium completo',
    vi: 'Lấy lại quyền truy cập Premium đầy đủ',
    id: 'Pulihkan akses Premium penuh',
    tr: 'Tam Premium erişimini geri al',
    pl: 'Odzyskaj pełny dostęp Premium',
  },
  subtitle: {
    'pt-BR': 'Seu Premium acabou. Reative e continue estudando sem limites nem pausas, exatamente de onde parou.',
    vi: 'Premium của bạn đã hết. Kích hoạt lại và học tiếp không giới hạn, ngay từ chỗ bạn dừng.',
    id: 'Premium-mu sudah habis. Aktifkan lagi dan lanjut belajar tanpa batas, tepat dari tempat terakhir.',
    tr: 'Premium’un bitti. Yeniden etkinleştir ve kaldığın yerden sınırsız öğrenmeye devam et.',
    pl: 'Twój Premium się skończył. Włącz ponownie i ucz się dalej bez limitów, dokładnie od miejsca, gdzie skończyłeś.',
  },
};
PAYWALL_PLANNED_COPY.vip_expired = {
  title: {
    'pt-BR': 'Seu acesso VIP terminou',
    vi: 'Quyền VIP của bạn đã kết thúc',
    id: 'Akses VIP-mu telah berakhir',
    tr: 'VIP erişimin sona erdi',
    pl: 'Twój dostęp VIP się skończył',
  },
  subtitle: {
    'pt-BR': 'Gostou de tudo sem limites? Ative o Premium e mantenha o acesso completo para sempre, sem pausas.',
    vi: 'Thích mọi thứ không giới hạn? Kích hoạt Premium để giữ toàn bộ quyền truy cập mãi mãi, không gián đoạn.',
    id: 'Suka semuanya tanpa batas? Aktifkan Premium dan pertahankan akses penuh selamanya, tanpa jeda.',
    tr: 'Sınırsız her şeyi sevdin mi? Premium’u aç ve tüm erişimi sonsuza dek koru, arasız.',
    pl: 'Spodobało ci się wszystko bez limitów? Włącz Premium i zachowaj pełny dostęp na zawsze, bez przerw.',
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
    'pt-BR': 'O Premium abre tudo: lições sem barreiras, prática ilimitada e ritmo estável. O momento perfeito para voltar.',
    vi: 'Premium mở tất cả: bài học không rào cản, luyện tập không giới hạn và nhịp đều. Thời điểm hoàn hảo để quay lại.',
    id: 'Premium membuka semuanya: pelajaran tanpa hambatan, latihan tanpa batas, ritme stabil. Saat tepat untuk kembali.',
    tr: 'Premium her şeyi açar: engelsiz dersler, sınırsız pratik ve istikrarlı ritim. Dönmek için mükemmel an.',
    pl: 'Premium otwiera wszystko: lekcje bez barier, nieograniczona praktyka i stabilny rytm. Idealny moment, by wrócić.',
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
    'pt-BR': 'O Premium abre prática real de inglês: novos cenários, análise de cada fala e suas palavras dos cartões.',
    vi: 'Premium mở luyện nói tiếng Anh thật: kịch bản mới, phân tích từng câu và từ vựng của bạn từ thẻ.',
    id: 'Premium membuka latihan bahasa Inggris nyata: skenario baru, analisis tiap ucapan, dan katamu dari kartu.',
    tr: 'Premium gerçek İngilizce pratiğini açar: yeni senaryolar, her cümlenin analizi ve kartlarındaki kelimeler.',
    pl: 'Premium otwiera prawdziwą praktykę angielskiego: nowe scenariusze, analiza każdej wypowiedzi i twoje słowa z fiszek.',
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
    'pt-BR': 'O Premium abre o modo de voz: diga as frases em voz alta e o app escuta e orienta. O caminho mais rápido para falar com confiança.',
    vi: 'Premium mở chế độ nói: đọc câu thành tiếng, ứng dụng lắng nghe và gợi ý. Cách nhanh nhất để nói tự tin.',
    id: 'Premium membuka mode bicara: ucapkan frasa dengan lantang, aplikasi mendengarkan dan memandu. Cara tercepat untuk bicara percaya diri.',
    tr: 'Premium konuşma modunu açar: cümleleri sesli söyle, uygulama dinler ve yönlendirir. Kendinden emin konuşmanın en hızlı yolu.',
    pl: 'Premium otwiera tryb mówienia: wymawiaj frazy na głos, a aplikacja słucha i podpowiada. Najszybsza droga, by mówić pewnie.',
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
    'pt-BR': 'Você já sentiu o acesso completo. O Premium o abre para sempre — sem pausas nem bloqueios.',
    vi: 'Bạn đã trải nghiệm quyền truy cập đầy đủ. Premium mở nó vĩnh viễn — không dừng, không khoá.',
    id: 'Kamu sudah merasakan akses penuh. Premium membukanya selamanya — tanpa jeda dan tanpa blokir.',
    tr: 'Tam erişimi zaten hissettin. Premium onu kalıcı açar — arasız ve engelsiz.',
    pl: 'Już poczułeś pełny dostęp. Premium otwiera go na zawsze — bez przerw i blokad.',
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
    'pt-BR': 'Novo nível desbloqueado. O Premium remove todos os limites do caminho.',
    vi: 'Mở khoá cấp mới. Premium gỡ mọi giới hạn trên đường đi.',
    id: 'Level baru terbuka. Premium menghapus semua batas di jalanmu.',
    tr: 'Yeni seviye açıldı. Premium yoldaki tüm sınırları kaldırır.',
    pl: 'Odblokowano nowy poziom. Premium usuwa wszystkie limity po drodze.',
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
  titleRu: 'Верни полный доступ Premium',
  titleUk: 'Поверни повний доступ Premium',
  titleEs: 'Recupera tu acceso Premium completo',
};

// Win-back заголовок для planned-локалей (pt-BR/vi/id/tr/pl), которые берут title
// из planned-копии, а не из RU/UK/ES.
const WIN_BACK_PLANNED_TITLE: PremiumPlannedCopy = {
  'pt-BR': 'Recupere seu acesso Premium completo',
  vi: 'Lấy lại toàn bộ quyền Premium của bạn',
  id: 'Pulihkan akses Premium penuh kamu',
  tr: 'Tüm Premium erişimini geri kazan',
  pl: 'Odzyskaj pełny dostęp Premium',
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
  titleRu: 'Верни полный доступ Premium',
  titleUk: 'Поверни повний доступ Premium',
  titleEs: 'Recupera tu acceso Premium completo',
  subtitleRu: 'Твой Premium закончился. Подключи снова — и продолжай учиться без лимитов и пауз, ровно с того места, где остановился.',
  subtitleUk: 'Твій Premium завершився. Підключи знову — і вчись далі без лімітів і пауз, саме з того місця, де зупинився.',
  subtitleEs: 'Tu Premium terminó. Reactívalo y sigue aprendiendo sin límites ni pausas, justo donde lo dejaste.',
};
PAYWALL_COPY.vip_expired = {
  titleRu: 'Твой VIP-доступ закончился',
  titleUk: 'Твій VIP-доступ завершився',
  titleEs: 'Tu acceso VIP ha terminado',
  subtitleRu: 'Тебе понравились возможности без ограничений? Оформи Premium — и сохрани весь доступ навсегда, без пауз в прогрессе.',
  subtitleUk: 'Сподобались можливості без обмежень? Оформи Premium — і збережи весь доступ назавжди, без пауз у прогресі.',
  subtitleEs: '¿Te gustó todo sin límites? Activa Premium y conserva el acceso completo para siempre, sin pausas.',
};
PAYWALL_COPY.notification_upsell = {
  titleRu: 'Продолжи свой прогресс',
  titleUk: 'Продовжуй свій прогрес',
  titleEs: 'Continúa tu progreso',
  subtitleRu: 'Premium открывает всё сразу: уроки без барьеров, безлимит практики и стабильный ритм. Идеальный момент вернуться.',
  subtitleUk: 'Premium відкриває все одразу: уроки без бар\'єрів, безліміт практики і стабільний ритм. Ідеальний момент повернутися.',
  subtitleEs: 'Premium lo abre todo: lecciones sin barreras, práctica ilimitada y ritmo estable. El momento perfecto para volver.',
};

export const CONTEXT_BENEFITS: Partial<Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]>> & { generic: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] } = {
  arena: [
    { ru: 'Дневной потолок матчей снимается', uk: 'Денну межу матчів знято', es: 'Se quita el techo diario de partidas', 'pt-BR': 'O teto diário de partidas é removido', vi: 'Gỡ giới hạn trận hằng ngày', id: 'Batas pertandingan harian dihapus', tr: 'Günlük maç tavanı kalkar', pl: 'Dzienny limit meczów znika' },
    { ru: 'Дуэли без ощущения «на сегодня всё»', uk: 'Дуелі без «на сьогодні вже досить»', es: 'Duelos sin el «ya basta por hoy»', 'pt-BR': 'Duelos sem “por hoje chega”', vi: 'Đấu mà không bị “hôm nay đủ rồi”', id: 'Duel tanpa rasa “cukup hari ini”', tr: '“Bugünlük yeter” hissi olmadan düello', pl: 'Pojedynki bez “na dziś wystarczy”' },
    { ru: 'Темп и мотивация в тренировках сильнее', uk: 'Темп і мотивація в тренуваннях сильніші', es: 'Ritmo y motivación en el entrenamiento', 'pt-BR': 'Mais ritmo e motivação nos treinos', vi: 'Nhịp và động lực luyện tập mạnh hơn', id: 'Ritme dan motivasi latihan lebih kuat', tr: 'Antrenmanda daha güçlü tempo ve motivasyon', pl: 'Silniejsze tempo i motywacja w treningu' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, квиз и финальный экзамен без вынужденных пауз', uk: 'Урок, квіз і фінальний іспит без вимушених пауз', es: 'Lección, quiz y examen sin pausas forzadas', 'pt-BR': 'Lição, quiz e exame final sem pausas forçadas', vi: 'Bài học, quiz và bài cuối không bị dừng ép buộc', id: 'Pelajaran, kuis, dan ujian akhir tanpa jeda paksa', tr: 'Ders, quiz ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, quiz i egzamin bez wymuszonych przerw' },
    { ru: 'Стабильный дневной ритм без срывов', uk: 'Стабільний щоденний ритм без зривів', es: 'Ritmo diario estable sin frenos', 'pt-BR': 'Ritmo diário estável sem travar', vi: 'Nhịp học hằng ngày ổn định hơn', id: 'Ritme harian stabil tanpa terhenti', tr: 'Aksamadan istikrarlı günlük ritim', pl: 'Stabilny rytm dnia bez zrywów' },
  ],
  course_after_lesson3: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante', 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto', 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes', 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
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
    { ru: 'Стабильный ежедневный прогресс', uk: 'Стабільний щоденний прогрес', es: 'Avance estable cada día', 'pt-BR': 'Progresso diário estável', vi: 'Tiến bộ hằng ngày ổn định', id: 'Progres harian stabil', tr: 'İstikrarlı günlük ilerleme', pl: 'Stabilny codzienny postęp' },
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
    { ru: 'Стабильный темп и результат', uk: 'Стабільний темп і результат', es: 'Ritmo estable y resultado', 'pt-BR': 'Ritmo e resultado estáveis', vi: 'Nhịp và kết quả ổn định', id: 'Ritme dan hasil stabil', tr: 'İstikrarlı tempo ve sonuç', pl: 'Stabilne tempo i wynik' },
    { ru: 'Премиум-опции сразу после активации', uk: 'Преміум-опції одразу після активації', es: 'Funciones Premium al instante', 'pt-BR': 'Funções Premium logo após ativar', vi: 'Tính năng Premium có ngay sau khi kích hoạt', id: 'Fitur Premium langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Premium özellikler', pl: 'Opcje Premium od razu po aktywacji' },
  ],
  trainer: [
    { ru: 'Слабые места: фразы с наибольшим числом ошибок', uk: 'Слабкі місця: фрази з найбільшою кількістю помилок', es: 'Puntos débiles: frases con más errores', 'pt-BR': 'Pontos fracos: frases com mais erros', vi: 'Điểm yếu: cụm từ bạn sai nhiều nhất', id: 'Titik lemah: frasa dengan kesalahan terbanyak', tr: 'Zayıf noktalar: en çok hata yapılan ifadeler', pl: 'Słabe punkty: frazy z największą liczbą błędów' },
    { ru: 'Smart Mix: алгоритм строит идеальный набор', uk: 'Smart Mix: алгоритм будує ідеальний набір', es: 'Smart Mix: el algoritmo crea el conjunto ideal', 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện phù hợp', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm buduje idealny zestaw' },
    { ru: 'Без лимита сессий в день', uk: 'Без ліміту сесій на день', es: 'Sin límite diario de sesiones', 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { ru: 'По теме: повтор конкретного урока', uk: 'За темою: повтор конкретного уроку', es: 'Por tema: repaso de una lección específica', 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { ru: 'Безлимит сессий Тренера', uk: 'Безліміт сесій Тренера', es: 'Sesiones ilimitadas del Entrenador', 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { ru: 'Все 6 режимов без ограничений', uk: 'Всі 6 режимів без обмежень', es: 'Los 6 modos sin restricciones', 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { ru: 'Смарт-повтор когда хочешь', uk: 'Смарт-повтор коли хочеш', es: 'Repaso inteligente cuando quieras', 'pt-BR': 'Revisão inteligente quando quiser', vi: 'Ôn thông minh bất cứ lúc nào', id: 'Pengulangan pintar kapan saja', tr: 'İstediğin zaman akıllı tekrar', pl: 'Inteligentna powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { ru: 'Каждое слабое место — точный персональный разбор', uk: 'Кожне слабке місце — точний персональний розбір', es: 'Cada punto débil tiene un análisis personal preciso', 'pt-BR': 'Cada ponto fraco vira uma análise pessoal precisa', vi: 'Mỗi điểm yếu thành phân tích cá nhân chính xác', id: 'Setiap titik lemah jadi analisis personal yang tepat', tr: 'Her zayıf nokta net kişisel analize dönüşür', pl: 'Każdy słaby punkt to dokładna analiza osobista' },
    { ru: 'Понятное объяснение: где сбилась фраза и как сказать правильно', uk: 'Зрозуміле пояснення: де збилась фраза і як сказати правильно', es: 'Explicación clara: dónde falla la frase y cómo decirla bien', 'pt-BR': 'Explicação clara: onde a frase falhou e como corrigir', vi: 'Giải thích rõ: câu sai ở đâu và nói đúng thế nào', id: 'Penjelasan jelas: bagian frasa yang salah dan cara benarnya', tr: 'Net açıklama: ifade nerede bozuldu ve doğrusu ne', pl: 'Jasne wyjaśnienie: gdzie fraza się sypie i jak powiedzieć poprawnie' },
    { ru: 'Тренировка на похожих фразах без лимита', uk: 'Тренування на схожих фразах без ліміту', es: 'Práctica con frases parecidas sin límite', 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones', 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { ru: 'Не тратишь осколки на перепрохождения уроков', uk: 'Не витрачаєш осколки на перепроходження уроків', es: 'No gastas fragmentos al repetir lecciones', 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
    { ru: 'Тренируй до идеального результата без давления', uk: 'Тренуй до ідеального результату без тиску', es: 'Entrena hasta perfeccionar sin presión', 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { ru: 'Карта активности: все 365 дней', uk: 'Карта активності: всі 365 днів', es: 'Mapa de actividad: los 365 días', 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { ru: 'Паттерны ошибок и слабые темы', uk: 'Патерни помилок і слабкі теми', es: 'Patrones de errores y temas débiles', 'pt-BR': 'Padrões de erro e temas fracos', vi: 'Mẫu lỗi và chủ đề yếu', id: 'Pola kesalahan dan topik lemah', tr: 'Hata kalıpları ve zayıf konular', pl: 'Wzorce błędów i słabe tematy' },
    { ru: 'Сравнение с другими — где ты в топе', uk: 'Порівняння з іншими — де ти в топі', es: 'Comparación con otros: tu top', 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { ru: '365 дней активности — увидишь своё постоянство', uk: '365 днів активності — побач свою сталість', es: '365 días: ve tu constancia', 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { ru: 'Лучшие и худшие периоды на одном экране', uk: 'Кращі та гірші періоди на одному екрані', es: 'Mejores y peores semanas a la vista', 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { ru: 'Понимаешь свой ритм обучения', uk: 'Розумієш свій ритм навчання', es: 'Entiendes tu ritmo real', 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { ru: 'Точки роста: где ошибаешься чаще всего', uk: 'Точки росту: де помиляєшся найчастіше', es: 'Puntos de crecimiento concretos', 'pt-BR': 'Pontos de crescimento: onde você mais erra', vi: 'Điểm cần phát triển: nơi bạn sai nhiều nhất', id: 'Titik berkembang: bagian yang paling sering salah', tr: 'Gelişim noktaları: en çok nerede hata var', pl: 'Punkty wzrostu: gdzie mylisz się najczęściej' },
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

CONTEXT_BENEFITS.speaking = [
  { ru: 'Произноси фразы вслух — приложение слушает', uk: 'Вимовляй фрази вголос — застосунок слухає', es: 'Di las frases en voz alta: la app te escucha', 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { ru: 'Мгновенная подсказка по каждому слову', uk: 'Миттєва підказка щодо кожного слова', es: 'Pista instantánea en cada palabra', 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { ru: 'Самый быстрый путь заговорить уверенно', uk: 'Найшвидший шлях заговорити впевнено', es: 'El camino más rápido para hablar con seguridad', 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS.dialog_limit = [
  { ru: 'Диалоги с ИИ-наставником без дневного лимита', uk: 'Діалоги з ШІ-наставником без денного ліміту', es: 'Diálogos con el tutor de IA sin límite diario', 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { ru: 'Живая практика разговора в любое время', uk: 'Жива практика розмови будь-коли', es: 'Práctica de conversación real cuando quieras', 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { ru: 'Разбор ошибок и подсказки прямо в диалоге', uk: 'Розбір помилок і підказки прямо в діалозі', es: 'Corrección de errores y pistas en el diálogo', 'pt-BR': 'Correção de erros e dicas dentro do diálogo', vi: 'Sửa lỗi và gợi ý ngay trong hội thoại', id: 'Koreksi kesalahan dan petunjuk langsung di dialog', tr: 'Diyalog içinde hata düzeltme ve ipuçları', pl: 'Korekta błędów i podpowiedzi wprost w dialogu' },
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
  { ru: 'Smart Mix: алгоритм собирает идеальный набор', uk: 'Smart Mix: алгоритм збирає ідеальний набір', es: 'Smart Mix: el algoritmo arma el set ideal', 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện hoàn hảo', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm składa idealny zestaw' },
  { ru: 'Упор на твои слабые места и частые ошибки', uk: 'Акцент на твоїх слабких місцях і частих помилках', es: 'Enfoque en tus puntos débiles y errores frecuentes', 'pt-BR': 'Foco nos seus pontos fracos e erros frequentes', vi: 'Tập trung vào điểm yếu và lỗi hay gặp của bạn', id: 'Fokus pada titik lemah dan kesalahan seringmu', tr: 'Zayıf noktalarına ve sık hatalarına odak', pl: 'Nacisk na twoje słabe punkty i częste błędy' },
  { ru: 'Тренировки без дневного лимита сессий', uk: 'Тренування без денного ліміту сесій', es: 'Entrenamientos sin límite diario de sesiones', 'pt-BR': 'Treinos sem limite diário de sessões', vi: 'Luyện tập không giới hạn phiên mỗi ngày', id: 'Latihan tanpa batas sesi harian', tr: 'Günlük seans sınırı olmadan antrenman', pl: 'Treningi bez dziennego limitu sesji' },
];

CONTEXT_BENEFITS.premium_expired = [
  { ru: 'Продолжаешь ровно с того места, где остановился', uk: 'Продовжуєш саме з того місця, де зупинився', es: 'Sigues justo donde lo dejaste', 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { ru: 'Снова без лимитов и вынужденных пауз', uk: 'Знову без лімітів і вимушених пауз', es: 'De nuevo sin límites ni pausas forzadas', 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { ru: 'Весь твой прогресс и материалы на месте', uk: 'Весь твій прогрес і матеріали на місці', es: 'Todo tu progreso y materiales siguen ahí', 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS.vip_expired = [
  { ru: 'Сохрани всё, что открыл VIP, — теперь навсегда', uk: 'Збережи все, що відкрив VIP, — тепер назавжди', es: 'Conserva todo lo del VIP, ahora para siempre', 'pt-BR': 'Mantenha tudo do VIP, agora para sempre', vi: 'Giữ mọi thứ VIP đã mở — giờ là mãi mãi', id: 'Pertahankan semua dari VIP, kini selamanya', tr: 'VIP’nin açtığı her şeyi koru — artık kalıcı', pl: 'Zachowaj wszystko z VIP — teraz na zawsze' },
  { ru: 'Без лимитов на уроки, квизы и практику', uk: 'Без лімітів на уроки, квізи і практику', es: 'Sin límites en lecciones, quizzes y práctica', 'pt-BR': 'Sem limites em lições, quizzes e prática', vi: 'Không giới hạn bài học, quiz và luyện tập', id: 'Tanpa batas pelajaran, kuis, dan latihan', tr: 'Derslerde, quizlerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje, quizy i praktykę' },
  { ru: 'Стабильный прогресс без пауз', uk: 'Стабільний прогрес без пауз', es: 'Progreso estable sin pausas', 'pt-BR': 'Progresso estável sem pausas', vi: 'Tiến bộ ổn định không gián đoạn', id: 'Progres stabil tanpa jeda', tr: 'Arasız istikrarlı ilerleme', pl: 'Stabilny postęp bez przerw' },
];

CONTEXT_BENEFITS.notification_upsell = [
  { ru: 'Весь курс открывается без барьеров', uk: 'Весь курс відкривається без бар\'єрів', es: 'Todo el curso se abre sin barreras', 'pt-BR': 'O curso inteiro abre sem barreiras', vi: 'Toàn bộ khoá học mở không rào cản', id: 'Seluruh kursus terbuka tanpa hambatan', tr: 'Tüm kurs engelsiz açılır', pl: 'Cały kurs otwiera się bez barier' },
  { ru: 'Безлимит практики каждый день', uk: 'Безліміт практики щодня', es: 'Práctica ilimitada cada día', 'pt-BR': 'Prática ilimitada todos os dias', vi: 'Luyện tập không giới hạn mỗi ngày', id: 'Latihan tanpa batas setiap hari', tr: 'Her gün sınırsız pratik', pl: 'Nielimitowana praktyka każdego dnia' },
  { ru: 'Идеальный момент вернуться к цели', uk: 'Ідеальний момент повернутися до мети', es: 'El momento perfecto para volver a tu meta', 'pt-BR': 'O momento perfeito para voltar à sua meta', vi: 'Thời điểm hoàn hảo để quay lại mục tiêu', id: 'Saat tepat untuk kembali ke tujuanmu', tr: 'Hedefine dönmek için mükemmel an', pl: 'Idealny moment, by wrócić do celu' },
];

export const CONTEXT_BENEFITS_PLANNED: Partial<Record<PremiumContext, PremiumPlannedCopy[]>> & { generic: PremiumPlannedCopy[] } = {
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
    { 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
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
    { 'pt-BR': 'Progresso diário estável', vi: 'Tiến bộ hằng ngày ổn định', id: 'Progres harian stabil', tr: 'İstikrarlı günlük ilerleme', pl: 'Stabilny codzienny postęp' },
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
    { 'pt-BR': 'Ritmo e resultado estáveis', vi: 'Nhịp và kết quả ổn định', id: 'Ritme dan hasil stabil', tr: 'İstikrarlı tempo ve sonuç', pl: 'Stabilne tempo i wynik' },
    { 'pt-BR': 'Funções Premium logo após ativar', vi: 'Tính năng Premium có ngay sau khi kích hoạt', id: 'Fitur Premium langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Premium özellikler', pl: 'Opcje Premium od razu po aktywacji' },
  ],
  trainer: [
    { 'pt-BR': 'Pontos fracos: frases com mais erros', vi: 'Điểm yếu: cụm từ bạn sai nhiều nhất', id: 'Titik lemah: frasa dengan kesalahan terbanyak', tr: 'Zayıf noktalar: en çok hata yapılan ifadeler', pl: 'Słabe punkty: frazy z największą liczbą błędów' },
    { 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện phù hợp', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm buduje idealny zestaw' },
    { 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { 'pt-BR': 'Revisão inteligente quando quiser', vi: 'Ôn thông minh bất cứ lúc nào', id: 'Pengulangan pintar kapan saja', tr: 'İstediğin zaman akıllı tekrar', pl: 'Inteligentna powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { 'pt-BR': 'Novos erros viram análises pessoais precisas', vi: 'Lỗi mới biến thành phân tích cá nhân chính xác', id: 'Kesalahan baru jadi analisis personal yang tepat', tr: 'Yeni hatalar net kişisel analizlere dönüşür', pl: 'Nowe błędy zmieniają się w dokładne analizy osobiste' },
    { 'pt-BR': 'Explicação clara: onde a frase falhou e como corrigir', vi: 'Giải thích rõ: câu sai ở đâu và nói đúng thế nào', id: 'Penjelasan jelas: bagian frasa yang salah dan cara benarnya', tr: 'Net açıklama: ifade nerede bozuldu ve doğrusu ne', pl: 'Jasne wyjaśnienie: gdzie fraza się sypie i jak powiedzieć poprawnie' },
    { 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
    { 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { 'pt-BR': 'Padrões de erro e temas fracos', vi: 'Mẫu lỗi và chủ đề yếu', id: 'Pola kesalahan dan topik lemah', tr: 'Hata kalıpları ve zayıf konular', pl: 'Wzorce błędów i słabe tematy' },
    { 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { 'pt-BR': 'Pontos de crescimento: onde você mais erra', vi: 'Điểm cần phát triển: nơi bạn sai nhiều nhất', id: 'Titik berkembang: bagian yang paling sering salah', tr: 'Gelişim noktaları: en çok nerede hata var', pl: 'Punkty wzrostu: gdzie mylisz się najczęściej' },
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

CONTEXT_BENEFITS_PLANNED.speaking = [
  { 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS_PLANNED.dialog_limit = [
  { 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { 'pt-BR': 'Correção de erros e dicas dentro do diálogo', vi: 'Sửa lỗi và gợi ý ngay trong hội thoại', id: 'Koreksi kesalahan dan petunjuk langsung di dialog', tr: 'Diyalog içinde hata düzeltme ve ipuçları', pl: 'Korekta błędów i podpowiedzi wprost w dialogu' },
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
  { 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện hoàn hảo', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm składa idealny zestaw' },
  { 'pt-BR': 'Foco nos seus pontos fracos e erros frequentes', vi: 'Tập trung vào điểm yếu và lỗi hay gặp của bạn', id: 'Fokus pada titik lemah dan kesalahan seringmu', tr: 'Zayıf noktalarına ve sık hatalarına odak', pl: 'Nacisk na twoje słabe punkty i częste błędy' },
  { 'pt-BR': 'Treinos sem limite diário de sessões', vi: 'Luyện tập không giới hạn phiên mỗi ngày', id: 'Latihan tanpa batas sesi harian', tr: 'Günlük seans sınırı olmadan antrenman', pl: 'Treningi bez dziennego limitu sesji' },
];

CONTEXT_BENEFITS_PLANNED.premium_expired = [
  { 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS_PLANNED.vip_expired = [
  { 'pt-BR': 'Mantenha tudo do VIP, agora para sempre', vi: 'Giữ mọi thứ VIP đã mở — giờ là mãi mãi', id: 'Pertahankan semua dari VIP, kini selamanya', tr: 'VIP’nin açtığı her şeyi koru — artık kalıcı', pl: 'Zachowaj wszystko z VIP — teraz na zawsze' },
  { 'pt-BR': 'Sem limites em lições, quizzes e prática', vi: 'Không giới hạn bài học, quiz và luyện tập', id: 'Tanpa batas pelajaran, kuis, dan latihan', tr: 'Derslerde, quizlerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje, quizy i praktykę' },
  { 'pt-BR': 'Progresso estável sem pausas', vi: 'Tiến bộ ổn định không gián đoạn', id: 'Progres stabil tanpa jeda', tr: 'Arasız istikrarlı ilerleme', pl: 'Stabilny postęp bez przerw' },
];

CONTEXT_BENEFITS_PLANNED.notification_upsell = [
  { 'pt-BR': 'O curso inteiro abre sem barreiras', vi: 'Toàn bộ khoá học mở không rào cản', id: 'Seluruh kursus terbuka tanpa hambatan', tr: 'Tüm kurs engelsiz açılır', pl: 'Cały kurs otwiera się bez barier' },
  { 'pt-BR': 'Prática ilimitada todos os dias', vi: 'Luyện tập không giới hạn mỗi ngày', id: 'Latihan tanpa batas setiap hari', tr: 'Her gün sınırsız pratik', pl: 'Nielimitowana praktyka każdego dnia' },
  { 'pt-BR': 'O momento perfeito para voltar à sua meta', vi: 'Thời điểm hoàn hảo để quay lại mục tiêu', id: 'Saat tepat untuk kembali ke tujuanmu', tr: 'Hedefine dönmek için mükemmel an', pl: 'Idealny moment, by wrócić do celu' },
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
