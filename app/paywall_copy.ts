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
  no_energy: { accent: '#FFE86A', accent2: '#64B4FF', shardAmount: 80 },
  course_after_lesson3: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  lesson_b1: { accent: '#38BDF8', accent2: '#FACC15', shardAmount: 180 },
  flashcard_limit: { accent: '#8BD3FF', accent2: '#FDE68A', shardAmount: 80 },
  flashcard_training: { accent: '#8BD3FF', accent2: '#A78BFA', shardAmount: 180 },
  flashcard_autoplay: { accent: '#FDE68A', accent2: '#60A5FA', shardAmount: 180 },
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

// зачем: аудит «пейволы-объясняют» — заголовок называет момент (бесплатная часть позади),
// а не абстрактный «полный доступ»; субтайтл теперь виден в хиро и объясняет, что откроется.
const COURSE_AFTER_LESSON3_COPY: PaywallCopy = {
  titleRu: 'Дальше — полный курс',
  titleUk: 'Далі — повний курс',
  titleEs: 'Lo siguiente: el curso completo',
  subtitleRu: 'Бесплатная часть пройдена. Plus открывает все уроки и практику без пауз.',
  subtitleUk: 'Безкоштовну частину пройдено. Plus відкриває всі уроки та практику без пауз.',
  subtitleEs: 'La parte gratis está completada. Plus abre todas las lecciones y práctica sin pausas.',
};
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'A seguir: o curso completo',
    vi: 'Tiếp theo: khóa học đầy đủ',
    id: 'Selanjutnya: kursus lengkap',
    tr: 'Sırada: kursun tamamı',
    pl: 'Dalej: pełny kurs',
  },
  subtitle: {
    'pt-BR': 'A parte grátis foi concluída. O Plus abre todas as lições e a prática sem pausas.',
    vi: 'Bạn đã hoàn thành phần miễn phí. Plus mở tất cả bài học và luyện tập không gián đoạn.',
    id: 'Bagian gratis sudah selesai. Plus membuka semua pelajaran dan latihan tanpa jeda.',
    tr: 'Ücretsiz bölüm tamamlandı. Plus tüm dersleri ve kesintisiz pratiği açar.',
    pl: 'Darmowa część ukończona. Plus otwiera wszystkie lekcje i praktykę bez przerw.',
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
    // зачем: юзер упёрся в дневной лимит посреди разговора — заголовок отвечает
    // «почему стоп», а не рекламирует функцию, которой он уже пользуется.
    titleRu: 'Разговор сегодня только разогрелся',
    titleUk: 'Розмова сьогодні лише розігрілася',
    titleEs: 'La conversación apenas se calentaba',
    subtitleRu: 'Бесплатный диалог на сегодня пройден. Plus продолжает без дневной паузы — с разбором каждой реплики.',
    subtitleUk: 'Безкоштовний діалог на сьогодні пройдено. Plus продовжує без денної паузи — з розбором кожної репліки.',
    subtitleEs: 'El diálogo gratis de hoy está completo. Plus sigue sin pausa diaria, con análisis de cada frase.',
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
// Новый заголовок называет настоящую причину показа: юзер идёт быстрее, чем
// открывается бесплатный контент; субтайтл говорит, что именно откроется.
PAYWALL_COPY.level_up = {
  titleRu: 'Ты растёшь быстрее бесплатного плана',
  titleUk: 'Ти ростеш швидше за безкоштовний план',
  titleEs: 'Creces más rápido que el plan gratis',
  subtitleRu: 'Уровень взят — темп твой. Plus открывает следующие уроки сразу, без пауз энергии.',
  subtitleUk: 'Рівень узято — темп твій. Plus відкриває наступні уроки одразу, без пауз енергії.',
  subtitleEs: 'Nivel conseguido, el ritmo es tuyo. Plus abre las próximas lecciones sin pausas de energía.',
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
  subtitleRu: 'Премиум-аура подсвечивает твой аватар в лигах и у друзей. Тебя видно сразу — в списках и чатах.',
  subtitleUk: 'Преміум-аура підсвічує твій аватар у лігах та в друзів. Тебе видно одразу — у списках і чатах.',
  subtitleEs: 'El aura premium ilumina tu avatar en ligas y entre amigos. Se te ve al instante en listas y chats.',
};

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
    'pt-BR': 'A conversa de hoje só esquentou',
    vi: 'Cuộc trò chuyện hôm nay mới nóng máy',
    id: 'Obrolan hari ini baru pemanasan',
    tr: 'Bugünkü sohbet daha yeni ısındı',
    pl: 'Dzisiejsza rozmowa dopiero się rozkręciła',
  },
  subtitle: {
    'pt-BR': 'O diálogo grátis de hoje terminou. O Plus continua sem pausa diária, com análise de cada fala.',
    vi: 'Lượt hội thoại miễn phí hôm nay đã hết. Plus tiếp tục không nghỉ theo ngày, kèm phân tích từng câu.',
    id: 'Dialog gratis hari ini selesai. Plus lanjut tanpa jeda harian, dengan ulasan tiap ucapan.',
    tr: 'Bugünün ücretsiz diyaloğu bitti. Plus günlük ara olmadan, her cümlenin analiziyle devam eder.',
    pl: 'Darmowy dialog na dziś zaliczony. Plus kontynuuje bez dziennej przerwy, z analizą każdej wypowiedzi.',
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
    'pt-BR': 'Você cresce mais rápido que o plano grátis',
    vi: 'Bạn tiến nhanh hơn gói miễn phí',
    id: 'Kamu tumbuh lebih cepat dari paket gratis',
    tr: 'Ücretsiz plandan daha hızlı büyüyorsun',
    pl: 'Rośniesz szybciej niż darmowy plan',
  },
  subtitle: {
    'pt-BR': 'Nível conquistado, o ritmo é seu. O Plus abre as próximas lições na hora, sem pausas de energia.',
    vi: 'Đã lên cấp — nhịp độ là của bạn. Plus mở ngay các bài tiếp theo, không gián đoạn năng lượng.',
    id: 'Level tercapai, ritme milikmu. Plus langsung membuka pelajaran berikutnya tanpa jeda energi.',
    tr: 'Seviye alındı, tempo senin. Plus sonraki dersleri hemen, enerji molasız açar.',
    pl: 'Poziom zdobyty, tempo jest twoje. Plus od razu otwiera kolejne lekcje, bez przerw na energię.',
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
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, тренировка и финальный экзамен без вынужденных пауз', uk: 'Урок, тренування і фінальний іспит без вимушених пауз', es: 'Lección, práctica y examen sin pausas forzadas', 'pt-BR': 'Lição, prática e exame final sem pausas forçadas', vi: 'Bài học, luyện tập và bài cuối không bị dừng ép buộc', id: 'Pelajaran, latihan, dan ujian akhir tanpa jeda paksa', tr: 'Ders, pratik ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, praktyka i egzamin bez wymuszonych przerw' },
    { ru: 'День не обрывается на самом интересном', uk: 'День не обривається на найцікавішому', es: 'El día no se corta justo cuando empieza', 'pt-BR': 'O dia não para bem na melhor hora', vi: 'Buổi học không dừng đúng lúc đang vào guồng', id: 'Hari belajar tidak berhenti saat mulai seru', tr: 'Gün tam hızlanmışken kesilmez', pl: 'Dzień nie urywa się w najciekawszym momencie' },
  ],
  course_after_lesson3: [
    { ru: 'Доступ ко всем урокам', uk: 'Доступ до всіх уроків', es: 'Acceso a todas las lecciones', 'pt-BR': 'Acesso a todas as lições', vi: 'Truy cập tất cả bài học', id: 'Akses ke semua pelajaran', tr: 'Tüm derslere erişim', pl: 'Dostęp do wszystkich lekcji' },
    { ru: 'Безлимитная практика без пауз', uk: 'Безлімітна практика без пауз', es: 'Práctica ilimitada sin pausas', 'pt-BR': 'Prática ilimitada sem pausas', vi: 'Luyện tập không giới hạn, không gián đoạn', id: 'Latihan tanpa batas dan tanpa jeda', tr: 'Sınırsız ve kesintisiz pratik', pl: 'Nieograniczona praktyka bez przerw' },
    { ru: 'Все возможности Plus', uk: 'Усі можливості Plus', es: 'Todas las funciones de Plus', 'pt-BR': 'Todos os recursos Plus', vi: 'Mọi tính năng Plus', id: 'Semua fitur Plus', tr: 'Tüm Plus özellikleri', pl: 'Wszystkie funkcje Plus' },
  ],
  lesson_b1: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante', 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { ru: 'Никаких барьеров — осваивай язык в своё удовольствие', uk: 'Жодних бар\'єрів — опановуй мову із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto', 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes', 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
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
  { ru: 'Диалоги с ИИ-наставником без дневного лимита', uk: 'Діалоги з ШІ-наставником без денного ліміту', es: 'Diálogos con el tutor de IA sin límite diario', 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { ru: 'Живая практика разговора в любое время', uk: 'Жива практика розмови будь-коли', es: 'Práctica de conversación real cuando quieras', 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { ru: 'Разбор реплик и подсказки прямо в диалоге', uk: 'Розбір реплік і підказки прямо в діалозі', es: 'Revisión de frases y pistas en el diálogo', 'pt-BR': 'Revisão das falas e dicas dentro do diálogo', vi: 'Gợi ý và phân tích câu ngay trong hội thoại', id: 'Ulasan jawaban dan petunjuk langsung di dialog', tr: 'Diyalog içinde yanıt analizi ve ipuçları', pl: 'Omówienie wypowiedzi i podpowiedzi wprost w dialogu' },
];

CONTEXT_BENEFITS.intro_ended = [
  { ru: 'Полный доступ возвращается целиком', uk: 'Повний доступ повертається повністю', es: 'Recuperas el acceso completo entero', 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { ru: 'Уроки, практика и тренажёр без пауз и лимитов', uk: 'Уроки, практика і тренажер без пауз і лімітів', es: 'Lecciones, práctica y entrenador sin pausas ni límites', 'pt-BR': 'Lições, prática e treinador sem pausas nem limites', vi: 'Bài học, luyện tập và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, latihan, dan trainer tanpa jeda dan batas', tr: 'Dersler, pratik ve antrenör arasız ve sınırsız', pl: 'Lekcje, praktyka i trener bez przerw i limitów' },
  { ru: 'Сохрани темп, набранный за пробный период', uk: 'Збережи темп, набраний за пробний період', es: 'Mantén el ritmo que lograste en la prueba', 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

// зачем: выгоды привязаны к моменту level_up — что конкретно откроется на пути дальше
// (старый третий пункт обещал «XP-бусты», которых у Plus нет — убран, чтобы не врать).
CONTEXT_BENEFITS.level_up = [
  { ru: 'Все уроки твоего уровня — открыты сразу', uk: 'Усі уроки твого рівня — відкриті одразу', es: 'Todas las lecciones de tu nivel, abiertas ya', 'pt-BR': 'Todas as lições do seu nível, abertas já', vi: 'Mọi bài học của cấp bạn mở ngay', id: 'Semua pelajaran levelmu langsung terbuka', tr: 'Seviyendeki tüm dersler hemen açık', pl: 'Wszystkie lekcje twojego poziomu od razu otwarte' },
  { ru: 'Энергия не заканчивается', uk: 'Енергія не закінчується', es: 'La energía no se acaba', 'pt-BR': 'A energia não acaba', vi: 'Năng lượng không cạn', id: 'Energi tidak habis', tr: 'Enerji bitmez', pl: 'Energia się nie kończy' },
  { ru: 'Тренировки без дневных пауз', uk: 'Тренування без денних пауз', es: 'Entrenamientos sin pausas diarias', 'pt-BR': 'Treinos sem pausas diárias', vi: 'Luyện tập không nghỉ theo ngày', id: 'Latihan tanpa jeda harian', tr: 'Günlük ara olmadan antrenman', pl: 'Treningi bez dziennych przerw' },
];

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
  no_energy: [
    { 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { 'pt-BR': 'Lição, prática e exame final sem pausas forçadas', vi: 'Bài học, luyện tập và bài cuối không bị dừng ép buộc', id: 'Pelajaran, latihan, dan ujian akhir tanpa jeda paksa', tr: 'Ders, pratik ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, praktyka i egzamin bez wymuszonych przerw' },
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
  { 'pt-BR': 'Diálogos com o tutor de IA sem limite diário', vi: 'Trò chuyện với gia sư AI không giới hạn mỗi ngày', id: 'Dialog dengan tutor AI tanpa batas harian', tr: 'Yapay zekâ koçuyla günlük sınır olmadan diyalog', pl: 'Dialogi z mentorem AI bez dziennego limitu' },
  { 'pt-BR': 'Prática de conversa real a qualquer hora', vi: 'Luyện hội thoại thật bất cứ lúc nào', id: 'Latihan percakapan nyata kapan saja', tr: 'İstediğin an canlı konuşma pratiği', pl: 'Żywa praktyka rozmowy o każdej porze' },
  { 'pt-BR': 'Revisão das falas e dicas dentro do diálogo', vi: 'Gợi ý và phân tích câu ngay trong hội thoại', id: 'Ulasan jawaban dan petunjuk langsung di dialog', tr: 'Diyalog içinde yanıt analizi ve ipuçları', pl: 'Omówienie wypowiedzi i podpowiedzi wprost w dialogu' },
];

CONTEXT_BENEFITS_PLANNED.intro_ended = [
  { 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { 'pt-BR': 'Lições, prática e treinador sem pausas nem limites', vi: 'Bài học, luyện tập và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, latihan, dan trainer tanpa jeda dan batas', tr: 'Dersler, pratik ve antrenör arasız ve sınırsız', pl: 'Lekcje, praktyka i trener bez przerw i limitów' },
  { 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

CONTEXT_BENEFITS_PLANNED.level_up = [
  { 'pt-BR': 'Todas as lições do seu nível, abertas já', vi: 'Mọi bài học của cấp bạn mở ngay', id: 'Semua pelajaran levelmu langsung terbuka', tr: 'Seviyendeki tüm dersler hemen açık', pl: 'Wszystkie lekcje twojego poziomu od razu otwarte' },
  { 'pt-BR': 'A energia não acaba', vi: 'Năng lượng không cạn', id: 'Energi tidak habis', tr: 'Enerji bitmez', pl: 'Energia się nie kończy' },
  { 'pt-BR': 'Treinos sem pausas diárias', vi: 'Luyện tập không nghỉ theo ngày', id: 'Latihan tanpa jeda harian', tr: 'Günlük ara olmadan antrenman', pl: 'Treningi bez dziennych przerw' },
];

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

// ── Аудит «пейволы-объясняют» (2026-07-25): новые контексты вместо generic ────
// зачем: free_lessons_complete раньше падали в generic («Учись
// быстрее с Plus») — юзер не понимал, почему экран появился; winback показывал
// streak-копию про сгоревшую серию; referral_ended шёл как generic.

PAYWALL_COPY.free_lessons_complete = {
  titleRu: 'Бесплатные уроки пройдены. Ты готов дальше',
  titleUk: 'Безкоштовні уроки пройдено. Ти готовий далі',
  titleEs: 'Lecciones gratis completadas. Estás listo para más',
  subtitleRu: 'Следующие уроки — сложнее и живее. Plus открывает их сразу, с того же места.',
  subtitleUk: 'Наступні уроки — складніші й живіші. Plus відкриває їх одразу, з того ж місця.',
  subtitleEs: 'Las próximas lecciones son más reales y retadoras. Plus las abre al instante, desde donde estás.',
};
PAYWALL_PLANNED_COPY.free_lessons_complete = {
  title: { 'pt-BR': 'Lições grátis concluídas. Você está pronto para mais', vi: 'Đã xong bài miễn phí. Bạn sẵn sàng đi tiếp', id: 'Pelajaran gratis selesai. Kamu siap lanjut', tr: 'Ücretsiz dersler bitti. Devama hazırsın', pl: 'Darmowe lekcje ukończone. Jesteś gotowy na więcej' },
  subtitle: {
    'pt-BR': 'As próximas lições são mais vivas e desafiadoras. O Plus abre tudo na hora, do ponto onde você está.',
    vi: 'Các bài tiếp theo khó hơn và thật hơn. Plus mở ngay, từ đúng chỗ bạn đang học.',
    id: 'Pelajaran berikutnya lebih hidup dan menantang. Plus membukanya langsung, dari posisimu sekarang.',
    tr: 'Sonraki dersler daha canlı ve zorlu. Plus onları hemen, kaldığın yerden açar.',
    pl: 'Kolejne lekcje są żywsze i trudniejsze. Plus otwiera je od razu, od miejsca, gdzie jesteś.',
  },
};
CONTEXT_BENEFITS.free_lessons_complete = [
  { ru: 'Все следующие уроки — без замков', uk: 'Усі наступні уроки — без замків', es: 'Todas las próximas lecciones sin candados', 'pt-BR': 'Todas as próximas lições sem cadeados', vi: 'Mọi bài tiếp theo không khóa', id: 'Semua pelajaran berikutnya tanpa gembok', tr: 'Sonraki tüm dersler kilitsiz', pl: 'Wszystkie kolejne lekcje bez kłódek' },
  { ru: 'Практика и разборы без пауз', uk: 'Практика й розбори без пауз', es: 'Práctica y análisis sin pausas', 'pt-BR': 'Prática e análises sem pausas', vi: 'Luyện tập và phân tích không gián đoạn', id: 'Latihan dan ulasan tanpa jeda', tr: 'Kesintisiz pratik ve analiz', pl: 'Praktyka i analizy bez przerw' },
  { ru: 'Прогресс продолжается, ничего не теряется', uk: 'Прогрес триває, нічого не втрачається', es: 'Tu progreso sigue, no se pierde nada', 'pt-BR': 'Seu progresso continua, nada se perde', vi: 'Tiến độ tiếp tục, không mất gì', id: 'Progres berlanjut, tidak ada yang hilang', tr: 'İlerleme sürer, hiçbir şey kaybolmaz', pl: 'Postęp trwa, nic nie przepada' },
];
CONTEXT_BENEFITS_PLANNED.free_lessons_complete = [
  { 'pt-BR': 'Todas as próximas lições sem cadeados', vi: 'Mọi bài tiếp theo không khóa', id: 'Semua pelajaran berikutnya tanpa gembok', tr: 'Sonraki tüm dersler kilitsiz', pl: 'Wszystkie kolejne lekcje bez kłódek' },
  { 'pt-BR': 'Prática e análises sem pausas', vi: 'Luyện tập và phân tích không gián đoạn', id: 'Latihan dan ulasan tanpa jeda', tr: 'Kesintisiz pratik ve analiz', pl: 'Praktyka i analizy bez przerw' },
  { 'pt-BR': 'Seu progresso continua, nada se perde', vi: 'Tiến độ tiếp tục, không mất gì', id: 'Progres berlanjut, tidak ada yang hilang', tr: 'İlerleme sürer, hiçbir şey kaybolmaz', pl: 'Postęp trwa, nic nie przepada' },
];

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
