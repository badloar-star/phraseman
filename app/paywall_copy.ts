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
import { REVENUE_DAILY_LIMITS, REVENUE_MONTHLY_LIMITS } from './revenue_daily_limits';
import { MONTHLY_TRAINING_SESSION_LIMIT } from './monthly_training_sessions';

// зачем (владелец, 2026-09-13): дневные лимиты обычного аккаунта настоящие —
// пейвол обязан говорить «лимит на сегодня исчерпан», а не «только в Plus».
// Числа берутся из одного источника, чтобы текст не разошёлся с гейтом.
// зачем (D152, 01.10): тренировки у бесплатного аккаунта считаются МЕСЯЦЕМ (30), а не днём —
// текст окна Plus обещал «3 в день» и расходился с реальным счётчиком. Число — из того же источника.
const MONTHLY_TRAINING = MONTHLY_TRAINING_SESSION_LIMIT;
const DAILY_SPEAKING = REVENUE_DAILY_LIMITS.speaking_attempts;
// зачем (D111, 2026-09-30): Free-лимит Диалогов — 30 ответов в МЕСЯЦ, не в день.
const MONTHLY_DIALOG = REVENUE_MONTHLY_LIMITS.ai_dialog_replies;
const DAILY_MISTAKES = REVENUE_DAILY_LIMITS.mistake_practice_starts;

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
  // Комбинированный урок — несколько тем сразу: берём книжную пару курса
  // (course_after_lesson3), но с фиолетовым вторым тоном, как у «смешанных»
  // механик (pack_create) — это про сборку из нескольких частей, а не про
  // следующий урок по порядку.
  combined_lesson: { accent: '#63E6BE', accent2: '#A78BFA', shardAmount: 180 },
  // Бейдж скидки — единственный контекст, где ведёт цена, а не упущенная
  // функция. Золото + фуксия, как у возвратных предложений (referral_ended);
  // shardAmount 0, как у generic/onboarding: предложение цены не иллюстрируется
  // «сгоревшим» ресурсом.
  home_discount_badge: { accent: '#FACC15', accent2: '#F0ABFC', shardAmount: 0 },
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

// Owner 2026-09-20: Free includes lessons 1–3. Plus continues the course;
// section starters are immediate and the remaining lessons stay sequential.
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
    titleRu: 'Начни говорить, а не зубрить',
    titleUk: 'Почни говорити, а не зубрити',
    titleEs: 'Empieza a hablar, no a memorizar',
    subtitleRu: 'Курс из живых фраз, разговоры вслух и повторы ровно того, что забывается — всё открыто с первого дня.',
    subtitleUk: 'Курс із живих висловів, розмови вголос і повтори саме того, що забувається — усе відкрито з першого дня.',
    subtitleEs: 'Un curso de frases reales, práctica oral y repasos de justo lo que se olvida: todo abierto desde el primer día.',
  },
  language_add: {
    titleRu: 'Учи несколько языков сразу',
    titleUk: 'Вивчай кілька мов одразу',
    titleEs: 'Aprende varios idiomas a la vez',
    subtitleRu: 'Бесплатно — один язык. С подпиской у каждого свой план, свой прогресс и свои достижения, ничего не смешивается. И весь курс, разговоры и тренировки — для каждого языка.',
    subtitleUk: 'Безкоштовно — одна мова. Із передплатою в кожної свій план, свій прогрес і свої досягнення, нічого не змішується. І весь курс, розмови та тренування — для кожної мови.',
    subtitleEs: 'Gratis es un idioma. Con la suscripción cada uno tiene su plan, su progreso y sus logros, sin mezclarse. Y el curso completo, los diálogos y los entrenamientos para cada idioma.',
  },
  no_energy: {
    // зачем (владелец, 2026-09-22): прежний заголовок дважды повторял «кончилась /
    // не кончается» — экран получался про ожидание, а не про занятия. Подзаголовок
    // теперь показывает, что подписка снимает не только энергию.
    titleRu: 'Занимайся без ожидания',
    titleUk: 'Займайся без очікування',
    titleEs: 'Estudia sin esperas',
    subtitleRu: 'С подпиской энергия не тратится вообще: закончил урок — сразу берёшься за следующий. А ещё открывается весь курс, разговорная практика, тренировки без счётчика и статистика.',
    subtitleUk: 'З передплатою енергія не витрачається взагалі: завершив урок — одразу берешся за наступний. А ще відкривається увесь курс, розмовна практика, тренування без лічильника та статистика.',
    subtitleEs: 'Con la suscripción la energía no se gasta: terminas una lección y pasas directo a la siguiente. Y además se abre el curso completo, la práctica oral, los entrenamientos sin contador y las estadísticas.',
  },
  streak: {
    // зачем (владелец, 2026-09-22): «которую уже построил» — утверждение о
    // прошлом, а экран открывается и с Главной, где серии может не быть вовсе.
    titleRu: 'Держи серию каждый день',
    titleUk: 'Тримай серію щодня',
    titleEs: 'Mantén tu racha día a día',
    subtitleRu: 'Занятия без ожидания энергии — заниматься каждый день проще, когда ничто не останавливает. Вместе с этим открывается весь курс, разговоры вслух и тренировки.',
    subtitleUk: 'Заняття без очікування енергії — займатися щодня простіше, коли ніщо не зупиняє. Разом із цим відкривається увесь курс, розмови вголос і тренування.',
    subtitleEs: 'Estudiar sin esperar energía hace que sea más fácil practicar a diario, sin nada que te frene. Junto con esto se abre el curso completo, la práctica oral y los entrenamientos.',
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_COPY,
  lesson_b1: LESSON_B1_COPY,
  flashcard_limit: {
    // зачем (владелец, 2026-09-22): «20 из 20 — база собрана» читалось как похвала,
    // человек не понимал, что упёрся. Экран открывается и из коллекции (заход без
    // упора), поэтому текст не утверждает, что человек что-то уже сохранил.
    titleRu: 'Сохраняй всё, что нравится',
    titleUk: 'Зберігай усе, що подобається',
    titleEs: 'Guarda todo lo que te guste',
    subtitleRu: 'Бесплатно помещается двадцать фраз, с подпиской — сколько угодно. Плюс тренировки без счётчика, весь курс и разговорная практика.',
    subtitleUk: 'Безкоштовно вміщається двадцять висловів, із передплатою — скільки завгодно. Плюс тренування без лічильника, увесь курс і розмовна практика.',
    subtitleEs: 'Gratis caben veinte frases; con la suscripción, todas las que quieras. Además, entrenamientos sin contador, el curso completo y práctica oral.',
  },
  theme: {
    // зачем (владелец, 2026-09-22): «Сделай Phraseman своим» — обращение к бренду,
    // а не к действию. Текст теперь называет, что именно выбирает человек, и
    // показывает, что тема идёт не отдельно, а вместе со всем приложением.
    titleRu: 'Выбери, как будет выглядеть',
    titleUk: 'Обери, як це виглядатиме',
    titleEs: 'Elige cómo se va a ver',
    subtitleRu: '12 тёмных оттенков Liquid Glass доступны с Plus. Если Plus закончится, интерфейс вернётся к стандартному графиту.',
    subtitleUk: '12 темних відтінків Liquid Glass доступні з Plus. Якщо Plus закінчиться, інтерфейс повернеться до стандартного графіту.',
    subtitleEs: 'Los 12 tonos oscuros Liquid Glass están disponibles con Plus. Si Plus termina, la interfaz vuelve al grafito estándar.',
  },
  club: {
    // зачем (владелец, 2026-09-22): «Усиль прогресс», «legacy reward-бусты для ускорения» —
    // три строки подряд без единого понятного слова. Названо то, что реально
    // происходит: недельная таблица, награды, повышение.
    titleRu: 'Занимайся без ограничений',
    titleUk: 'Займайся без обмежень',
    titleEs: 'Practica sin límites',
    subtitleRu: 'Подписка открывает весь курс, разговоры и тренировки без дневных ограничений.',
    subtitleUk: 'Передплата відкриває увесь курс, розмови та тренування без денних обмежень.',
    subtitleEs: 'La suscripción abre el curso completo, los diálogos y los entrenamientos sin límites diarios.',
  },
  // зачем (владелец, 2026-09-22): экран открывается ПЯТЬЮ путями, и три из них
  // (dialogs_catalogue, dialogs_tutor_poster, ai_companion_direct_entry) —
  // обычный заход, а не исчерпанный лимит. Прежний заголовок «лимит исчерпан»
  // врал каждому, кто просто открыл каталог. Текст больше не утверждает ничего
  // о прошлом: называет правило в настоящем времени и показывает, что подписка
  // открывает не только диалоги.
  dialog_limit: {
    titleRu: 'Разговаривай сколько хочется',
    titleUk: 'Розмовляй скільки хочеться',
    titleEs: 'Conversa todo lo que quieras',
    subtitleRu: `Без подписки — ${MONTHLY_DIALOG} ответов в месяц, с подпиской счётчика нет. Открываются все сценарии: кафе, собеседование, врач. И не только диалоги — весь курс, тренировки и статистика тоже.`,
    subtitleUk: `Безкоштовно — ${MONTHLY_DIALOG} відповідей на місяць, із передплатою лічильника немає. Відкриваються всі сценарії: кафе, співбесіда, лікар. І не лише діалоги — увесь курс, тренування та статистика теж.`,
    subtitleEs: `Gratis son ${MONTHLY_DIALOG} respuestas al mes; con la suscripción no hay contador. Se abren todos los escenarios: cafetería, entrevista, médico. Y no solo los diálogos: también el curso completo, los entrenamientos y las estadísticas.`,
  },
  // зачем (владелец 2026-09-14): раздел ошибок бесплатен с дневным лимитом,
  // поэтому текст называет дневную норму, а не говорит «только в Plus».
  // зачем (владелец, 2026-09-22): в раздел заходят и без упора (home_mistake_practice,
  // mistake_practice_direct, learning_v2), поэтому «сессия на сегодня пройдена» врала.
  // Заодно убраны дефис вместо тире и тавтология «разбирай… с разбором».
  mistake_practice: {
    titleRu: 'Разбирай ошибки когда удобно',
    titleUk: 'Розбирай помилки коли зручно',
    titleEs: 'Repasa tus errores cuando quieras',
    subtitleRu: `Бесплатно — ${DAILY_MISTAKES} подход в день. С подпиской возвращайся к ним сколько нужно, и к каждому ответу будет объяснение, что было не так. Вместе с этим открывается весь курс, разговоры и тренировки.`,
    subtitleUk: `Безкоштовно — ${DAILY_MISTAKES} підхід на день. Із передплатою повертайся до них скільки потрібно, і до кожної відповіді буде пояснення, що було не так. Разом із цим відкривається увесь курс, розмови та тренування.`,
    subtitleEs: `Gratis es ${DAILY_MISTAKES} ronda al día. Con la suscripción vuelve a ellos cuantas veces necesites y cada respuesta viene con una explicación de qué falló. Junto con esto se abre el curso completo, los diálogos y los entrenamientos.`,
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
    subtitleRu: 'Plus открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания монет.',
    subtitleUk: 'Plus відкриває повтор будь-якого пройденого раунду. Закріплюй складні вислови без списання монет.',
    subtitleEs: 'Plus abre el repaso de cualquier ronda completada. Refuerza las frases difíciles sin gastar monedas.',
  },
  // зачем (владелец, 2026-09-22): три статистических экрана заканчивались на
  // «— для Plus» — это ценник, а не приглашение. Заголовки теперь про то, что
  // человек увидит, а подзаголовки показывают, что статистика идёт не отдельно.
  stats: {
    titleRu: 'Посмотри, как идут дела',
    titleUk: 'Подивися, як ідуть справи',
    titleEs: 'Mira cómo te va',
    subtitleRu: 'Год занятий на одном экране: где шло легко, где буксовало и что стоит подтянуть. И это часть подписки, в которую входит весь курс, разговоры вслух и тренировки без счётчика.',
    subtitleUk: 'Рік занять на одному екрані: де йшло легко, де буксувало й що варто підтягнути. І це частина передплати, до якої входить увесь курс, розмови вголос і тренування без лічильника.',
    subtitleEs: 'Un año de estudio en una pantalla: dónde fue fácil, dónde te atascaste y qué conviene reforzar. Forma parte de la suscripción, que incluye el curso completo, la práctica oral y los entrenamientos sin contador.',
  },
  heatmap: {
    titleRu: 'Весь год занятий на одном экране',
    titleUk: 'Увесь рік занять на одному екрані',
    titleEs: 'Todo un año de estudio en una pantalla',
    subtitleRu: 'Видно каждый день: когда шло каждый день подряд, а когда был перерыв. Открывается вместе со всей статистикой, курсом и разговорной практикой.',
    subtitleUk: 'Видно кожен день: коли йшло щодня поспіль, а коли була перерва. Відкривається разом з усією статистикою, курсом і розмовною практикою.',
    subtitleEs: 'Se ve cada día: cuándo estudiaste sin parar y cuándo hubo una pausa. Se abre junto con todas las estadísticas, el curso y la práctica oral.',
  },
  patterns: {
    titleRu: 'Что забывается чаще всего',
    titleUk: 'Що забувається найчастіше',
    titleEs: 'Qué se te olvida más',
    subtitleRu: 'Приложение помнит каждую ошибку и покажет темы, которые не закрепились — а потом соберёт из них тренировку. Плюс весь курс, разговоры и остальная статистика.',
    subtitleUk: 'Застосунок пам’ятає кожну помилку й покаже теми, які не закріпилися, — а потім збере з них тренування. Плюс увесь курс, розмови та решта статистики.',
    subtitleEs: 'La app recuerda cada error y te muestra los temas que no se fijaron; luego arma un entrenamiento con ellos. Además, el curso completo, los diálogos y el resto de estadísticas.',
  },
  percentiles: {
    // зачем: убраны «дизмораль» и «крут» — чужой сленг; третий буллет этого
    // контекста был написан от первого лица (единственный такой в проекте).
    titleRu: 'Ты идёшь лучше, чем думаешь',
    titleUk: 'Ти йдеш краще, ніж думаєш',
    titleEs: 'Vas mejor de lo que crees',
    subtitleRu: 'Твоя серия и темп на фоне остальных учеников — показываем то, в чём ты впереди. Входит в подписку вместе с курсом, разговорами и тренировками.',
    subtitleUk: 'Твоя серія і темп на тлі решти учнів — показуємо те, у чому ти попереду. Входить у передплату разом із курсом, розмовами та тренуваннями.',
    subtitleEs: 'Tu racha y tu ritmo frente al resto de estudiantes: te mostramos en qué vas por delante. Incluido en la suscripción junto al curso, los diálogos y los entrenamientos.',
  },
  generic: {
    // зачем (владелец, 2026-09-22): сюда попадает вход из настроек — человек
    // пришёл сам, без повода, поэтому полный перечень и есть содержание экрана.
    // «Стоп-экран» — слово из внутренней переписки, человек его не знает.
    titleRu: 'Всё приложение целиком',
    titleUk: 'Увесь застосунок цілком',
    titleEs: 'Toda la app, completa',
    subtitleRu: 'Весь курс, разговоры вслух, тренировки без дневного счётчика, своя коллекция фраз, статистика и темы оформления.',
    subtitleUk: 'Увесь курс, розмови вголос, тренування без денного лічильника, власна колекція висловів, статистика й теми оформлення.',
    subtitleEs: 'El curso completo, práctica oral, entrenamientos sin contador diario, tu propia colección de frases, estadísticas y temas visuales.',
  },
};

PAYWALL_COPY.intro_ended = {
  // зачем (владелец, 2026-09-22): здесь событие точно произошло — подарочные три
  // дня кончились, — поэтому о прошлом говорить можно. Но «ты уже почувствовал»
  // было намёком вместо конкретики: перечисляем, что именно возвращается.
  titleRu: 'Бесплатный доступ закончился',
  titleUk: 'Безкоштовний доступ завершився',
  titleEs: 'El acceso gratuito ha terminado',
  subtitleRu: 'Понравилось, как идёт без ограничений? Подписка возвращает всё то же самое: курс целиком, разговоры без счётчика, тренировки и статистику.',
  subtitleUk: 'Сподобалося, як іде без обмежень? Передплата повертає все те саме: курс цілком, розмови без лічильника, тренування та статистику.',
  subtitleEs: '¿Te gustó avanzar sin límites? La suscripción devuelve exactamente eso: el curso completo, diálogos sin contador, entrenamientos y estadísticas.',
};

// План #3: after-win апсейл при повышении уровня.
// зачем: жалоба юзера — «Ты растёшь быстро» не объясняла, при чём тут покупка.
// Основные уроки уже бесплатны; повышение уровня не создаёт платный замок.
PAYWALL_COPY.level_up = COURSE_AFTER_LESSON3_COPY;

// Speaking mode — произнести фразу вслух (микрофон + распознавание).
// зачем (владелец, 2026-09-22): вход из урока (lesson_speaking) — это первое
// нажатие «Устно», а не исчерпанный лимит. Текст объясняет, что произойдёт, и
// называет норму в настоящем времени. Число берётся из REVENUE_DAILY_LIMITS:
// в тексте годами стояло «5», хотя в коде попыток три.
PAYWALL_COPY.speaking = {
  titleRu: 'Говори вслух сколько нужно',
  titleUk: 'Говори вголос скільки потрібно',
  titleEs: 'Habla en voz alta cuanto necesites',
  subtitleRu: `Бесплатно — ${DAILY_SPEAKING} попытки в день, а произношение ставится повторами. С подпиской повторяй, пока не зазвучит правильно: приложение слушает каждую фразу и показывает, где звук ушёл. Плюс весь курс, диалоги и тренировки.`,
  subtitleUk: `Безкоштовно — ${DAILY_SPEAKING} спроби на день, а вимова ставиться повторами. Із передплатою повторюй, доки не зазвучить правильно: застосунок слухає кожен вислів і показує, де звук пішов не туди. Плюс увесь курс, діалоги та тренування.`,
  subtitleEs: `Gratis son ${DAILY_SPEAKING} intentos al día, y la pronunciación se logra repitiendo. Con la suscripción repite hasta que suene bien: la app escucha cada frase y te muestra dónde se desvió el sonido. Además, el curso completo, los diálogos y los entrenamientos.`,
};

PAYWALL_COPY.ai_voice_input = {
  // зачем: прежний текст начинался с объяснения внутренней механики подсчёта
  // («считается голосовой попыткой») — человека это не волнует.
  titleRu: 'Отвечай голосом',
  titleUk: 'Відповідай голосом',
  titleEs: 'Responde con la voz',
  subtitleRu: `Бесплатно — ${DAILY_SPEAKING} реплики голосом в день. С подпиской говори весь диалог вслух, приложение само переведёт речь в текст. И всё остальное тоже открывается: курс, тренировки, статистика.`,
  subtitleUk: `Безкоштовно — ${DAILY_SPEAKING} репліки голосом на день. Із передплатою говори весь діалог уголос, застосунок сам переведе мовлення в текст. І все інше теж відкривається: курс, тренування, статистика.`,
  subtitleEs: `Gratis son ${DAILY_SPEAKING} respuestas por voz al día. Con la suscripción habla todo el diálogo en voz alta y la app convierte tu voz en texto. Y también se abre todo lo demás: el curso, los entrenamientos y las estadísticas.`,
};

PAYWALL_COPY.dialog_analysis = {
  titleRu: 'Посмотри, как звучала твоя речь',
  titleUk: 'Подивися, як звучала твоя мова',
  titleEs: 'Mira cómo sonó lo que dijiste',
  subtitleRu: 'После разговора видно, где фраза прозвучала неестественно, как её поправить и что сказать живее в следующий раз. Открывается вместе со всеми диалогами, курсом и тренировками.',
  subtitleUk: 'Після розмови видно, де вислів прозвучав неприродно, як його виправити й що сказати живіше наступного разу. Відкривається разом з усіма діалогами, курсом і тренуваннями.',
  subtitleEs: 'Al terminar la conversación se ve qué sonó poco natural, cómo corregirlo y qué decir de forma más viva la próxima vez. Se abre junto con todos los diálogos, el curso y los entrenamientos.',
};

// зачем (владелец 2026-09-13): dialog_limit стал «дневным лимитом», а этот
// контекст — про закрытые сценарии. Заголовок называет причину точно, чтобы два
// экрана не читались как один и тот же.
//
// зачем ПЕРЕПИСАН (аудит 2026-09-14): было «Диалоги уровней выше — в Plus».
// Это стало ложью: после перехода на белый список из трёх сценариев закрыт и
// `first_meeting` — уровень A1, тот же, что у открытого `coffee`. Человек читал
// «уровней выше» на сценарии своего уровня. Теперь заголовок говорит правду:
// бесплатны три сценария, остальной каталог в Plus.
PAYWALL_COPY.dialog_locked_level = {
  // зачем (D124, владелец 30.09): сценарии открываются ТОЛЬКО рангом монеты, Plus их
  // не открывает. Прежнее «с ним открываются все остальные» стало ложью.
  titleRu: 'Сценарий откроется на ранге монеты',
  titleUk: 'Сценарій відкриється на ранзі монети',
  titleEs: 'El escenario se abre con el rango de la moneda',
  subtitleRu: 'Диалоги открываются рангом монеты — монеты копятся на уроках. Plus снимает месячный лимит ответов и открывает весь курс, тренировки и разбор ошибок.',
  subtitleUk: 'Діалоги відкриваються рангом монети — монети накопичуються на уроках. Plus знімає місячний ліміт відповідей і відкриває весь курс, тренування та розбір помилок.',
  subtitleEs: 'Los diálogos se abren con el rango de la moneda; las monedas se ganan en las lecciones. Plus quita el límite mensual de respuestas y abre el curso completo, los entrenamientos y el repaso de errores.',
};

// зачем (владелец, 2026-09-22): из пяти входов ЧЕТЫРЕ — прямые
// (flashcards_blitz_direct, recall, speaking, training_setup): человек просто
// открыл режим тренировки, ничего не исчерпав. «Лимит исчерпан» врал им всем.
PAYWALL_COPY.flashcard_training = {
  titleRu: 'Тренируйся сколько хочется',
  titleUk: 'Тренуйся скільки хочеться',
  titleEs: 'Entrena todo lo que quieras',
  subtitleRu: `Бесплатно — ${MONTHLY_TRAINING} тренировок в месяц на все режимы. С подпиской счётчика нет, а слабые фразы возвращаются чаще, пока не закрепятся. Вместе с этим открывается весь курс, разговоры вслух и статистика.`,
  subtitleUk: `Безкоштовно — ${MONTHLY_TRAINING} тренувань на місяць на всі режими. Із передплатою лічильника немає, а слабкі вислови повертаються частіше, доки не закріпляться. Разом із цим відкривається увесь курс, розмови вголос і статистика.`,
  subtitleEs: `Gratis son ${MONTHLY_TRAINING} entrenamientos al mes en todos los modos. Con la suscripción no hay contador y las frases flojas vuelven más seguido hasta fijarse. Junto con esto se abre el curso completo, la práctica oral y las estadísticas.`,
};

PAYWALL_COPY.ai_explain = {
  titleRu: 'Спрашивай почему сколько нужно',
  titleUk: 'Запитуй чому скільки потрібно',
  titleEs: 'Pregunta por qué las veces que haga falta',
  subtitleRu: 'Бесплатно — несколько разборов в день. С подпиской ИИ объяснит каждую ошибку: что не так, почему и как сказать правильно. Плюс весь курс, разговоры и тренировки.',
  subtitleUk: 'Безкоштовно — кілька розборів на день. Із передплатою ШІ пояснить кожну помилку: що не так, чому і як сказати правильно. Плюс увесь курс, розмови та тренування.',
  subtitleEs: 'Gratis tienes unas pocas explicaciones al día. Con la suscripción la IA explica cada error: qué falló, por qué y cómo decirlo bien. Además, el curso completo, los diálogos y los entrenamientos.',
};

PAYWALL_COPY.weekly_review = {
  titleRu: 'Итог недели на одной странице',
  titleUk: 'Підсумок тижня на одній сторінці',
  titleEs: 'El resumen de tu semana en una página',
  subtitleRu: 'Что укрепилось, где проседает и с чего начать следующую неделю — с подсказками и подходящими уроками. Открывается вместе со всей статистикой, курсом и разговорной практикой.',
  subtitleUk: 'Що зміцнилося, де просідає і з чого почати наступний тиждень — із підказками та відповідними уроками. Відкривається разом з усією статистикою, курсом і розмовною практикою.',
  subtitleEs: 'Qué se afianzó, qué flojea y por dónde empezar la semana siguiente, con consejos y lecciones a medida. Se abre junto con todas las estadísticas, el curso y la práctica oral.',
};

PAYWALL_COPY.avatar_aura = {
  titleRu: 'Добавь аватару свечение',
  titleUk: 'Додай аватару сяйво',
  titleEs: 'Dale un brillo a tu avatar',
  subtitleRu: 'Аура подсвечивает твой аватар у друзей и в списках — тебя видно сразу. Входит в подписку вместе с курсом, разговорами и тренировками.',
  subtitleUk: 'Аура підсвічує твій аватар у друзів і в списках — тебе видно одразу. Входить у передплату разом із курсом, розмовами та тренуваннями.',
  subtitleEs: 'El aura ilumina tu avatar entre amigos y en las listas: se te ve al instante. Va incluida en la suscripción junto al curso, los diálogos y los entrenamientos.',
};

export const PAYWALL_PLANNED_COPY: Partial<Record<PremiumContext, PremiumPlannedHeroCopy>> & { generic: PremiumPlannedHeroCopy } = {
  // зачем (владелец, 2026-09-22): эти шесть локалей отстали от ru/uk/es и
  // продолжали говорить «лимит исчерпан» тем, кто ничего не тратил. Переписаны
  // по тому же правилу: никаких утверждений о прошлом, дневная норма в
  // настоящем времени, и в каждом тексте видно, что открывается всё приложение.
  onboarding_plan: {
    title: {
      en: 'Start speaking, not cramming',
      'pt-BR': 'Comece a falar, não a decorar',
      vi: 'Bắt đầu nói, đừng học vẹt',
      id: 'Mulai bicara, bukan menghafal',
      tr: 'Ezberleme, konuşmaya başla',
      pl: 'Zacznij mówić, a nie wkuwać',
    },
    subtitle: {
      en: 'A course of real phrases, speaking out loud and repeats of exactly what you forget — all open from day one.',
      'pt-BR': 'Um curso de frases reais, prática de fala e revisões de exatamente o que você esquece — tudo aberto desde o primeiro dia.',
      vi: 'Khóa học gồm những câu nói thật, luyện nói thành tiếng và ôn lại đúng phần bạn hay quên — mở hết ngay từ ngày đầu.',
      id: 'Kursus berisi frasa nyata, latihan bicara lantang, dan pengulangan persis yang kamu lupakan — semua terbuka sejak hari pertama.',
      tr: 'Gerçek ifadelerden bir kurs, sesli konuşma ve tam da unuttuğun şeylerin tekrarı — ilk günden her şey açık.',
      pl: 'Kurs z prawdziwych zwrotów, mówienie na głos i powtórki dokładnie tego, co zapominasz — wszystko otwarte od pierwszego dnia.',
    },
  },
  language_add: {
    title: { en: 'Learn several languages at once', 'pt-BR': 'Aprenda vários idiomas ao mesmo tempo', vi: 'Học nhiều ngôn ngữ cùng lúc', id: 'Belajar beberapa bahasa sekaligus', tr: 'Aynı anda birkaç dil öğren', pl: 'Ucz się kilku języków naraz' },
    subtitle: {
      en: 'One language for free. With a subscription each has its own plan, progress and achievements, nothing mixes. And the whole course, dialogues and training — for every language.',
      'pt-BR': 'Grátis é um idioma. Com a assinatura, cada um tem plano, progresso e conquistas próprios, nada se mistura. E o curso inteiro, os diálogos e os treinos — para cada idioma.',
      vi: 'Miễn phí là một ngôn ngữ. Với gói đăng ký, mỗi ngôn ngữ có kế hoạch, tiến độ và thành tích riêng, không lẫn lộn. Và trọn khóa học, hội thoại và luyện tập — cho từng ngôn ngữ.',
      id: 'Gratis untuk satu bahasa. Dengan langganan, tiap bahasa punya rencana, progres, dan pencapaian sendiri, tidak tercampur. Dan seluruh kursus, dialog, serta latihan — untuk setiap bahasa.',
      tr: 'Ücretsizde tek dil var. Abonelikle her dilin kendi planı, ilerlemesi ve başarıları olur, hiçbiri karışmaz. Ve kursun tamamı, diyaloglar ve antrenmanlar — her dil için.',
      pl: 'Za darmo jeden język. W subskrypcji każdy ma własny plan, postęp i osiągnięcia, nic się nie miesza. I cały kurs, dialogi oraz treningi — dla każdego języka.',
    },
  },
  no_energy: {
    title: { en: 'Study without waiting', 'pt-BR': 'Estude sem esperar', vi: 'Học mà không phải chờ', id: 'Belajar tanpa menunggu', tr: 'Beklemeden çalış', pl: 'Ucz się bez czekania' },
    subtitle: {
      en: 'With a subscription energy is never spent: finish a lesson and go straight to the next one. Plus the whole course, speaking practice, training without a counter and statistics.',
      'pt-BR': 'Com a assinatura a energia não é gasta: termina uma lição e já vai para a próxima. Mais o curso inteiro, a prática de fala, os treinos sem contador e as estatísticas.',
      vi: 'Với gói đăng ký, năng lượng không bị tiêu hao: học xong một bài là vào ngay bài kế tiếp. Cùng với đó là trọn khóa học, luyện nói, luyện tập không giới hạn lượt và thống kê.',
      id: 'Dengan langganan, energi tidak terpakai: selesai satu pelajaran langsung lanjut ke berikutnya. Ditambah seluruh kursus, latihan bicara, latihan tanpa penghitung, dan statistik.',
      tr: 'Abonelikte enerji hiç harcanmaz: bir dersi bitirir, hemen sonrakine geçersin. Üstelik kursun tamamı, konuşma pratiği, sayaçsız antrenman ve istatistikler de açılır.',
      pl: 'W subskrypcji energia w ogóle się nie zużywa: kończysz lekcję i od razu bierzesz następną. A do tego cały kurs, mówienie na głos, treningi bez licznika i statystyki.',
    },
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_PLANNED_COPY,
  lesson_b1: LESSON_B1_PLANNED_COPY,
  flashcard_limit: {
    title: { en: 'Save everything you like', 'pt-BR': 'Salve tudo o que gostar', vi: 'Lưu mọi thứ bạn thích', id: 'Simpan semua yang kamu suka', tr: 'Beğendiğin her şeyi kaydet', pl: 'Zapisuj wszystko, co ci się podoba' },
    subtitle: {
      en: 'Twenty phrases fit for free, with a subscription — as many as you want. Plus training without a counter, the whole course and speaking practice.',
      'pt-BR': 'Grátis cabem vinte frases; com a assinatura, quantas quiser. Mais treinos sem contador, o curso inteiro e a prática de fala.',
      vi: 'Miễn phí chứa được hai mươi cụm từ, với gói đăng ký thì bao nhiêu tùy thích. Cùng luyện tập không giới hạn lượt, trọn khóa học và luyện nói.',
      id: 'Gratis memuat dua puluh frasa; dengan langganan, sebanyak yang kamu mau. Ditambah latihan tanpa penghitung, seluruh kursus, dan latihan bicara.',
      tr: 'Ücretsizde yirmi ifade sığar, abonelikte istediğin kadar. Ayrıca sayaçsız antrenman, kursun tamamı ve konuşma pratiği.',
      pl: 'Za darmo mieści się dwadzieścia zwrotów, w subskrypcji — ile chcesz. Plus treningi bez licznika, cały kurs i mówienie na głos.',
    },
  },
  streak: {
    title: { en: 'Keep your streak going', 'pt-BR': 'Mantenha sua sequência', vi: 'Giữ chuỗi ngày của bạn', id: 'Jaga streak-mu tetap jalan', tr: 'Serini her gün sürdür', pl: 'Utrzymuj swoją serię' },
    subtitle: {
      en: 'Study without waiting for energy — practicing every day is easier when nothing stops you. The whole course, speaking practice and training open up with it.',
      'pt-BR': 'Estude sem esperar energia: praticar todo dia é mais fácil quando nada te trava. Junto com isso abrem o curso inteiro, a prática de fala e os treinos.',
      vi: 'Học mà không phải chờ năng lượng — luyện mỗi ngày dễ hơn khi không có gì cản bạn. Cùng lúc đó mở ra trọn khóa học, luyện nói và luyện tập.',
      id: 'Belajar tanpa menunggu energi — berlatih tiap hari lebih mudah saat tidak ada yang menghambat. Bersamaan dengan itu terbuka seluruh kursus, latihan bicara, dan latihan kartu.',
      tr: 'Enerji beklemeden çalış — hiçbir şey seni durdurmayınca her gün pratik yapmak daha kolay. Bununla birlikte kursun tamamı, konuşma pratiği ve antrenmanlar açılır.',
      pl: 'Ucz się bez czekania na energię — codzienna praktyka jest łatwiejsza, gdy nic cię nie zatrzymuje. Razem z tym otwiera się cały kurs, mówienie na głos i treningi.',
    },
  },
  theme: {
    title: { en: 'Choose how it will look', 'pt-BR': 'Escolha como vai ficar', vi: 'Chọn giao diện bạn muốn', id: 'Pilih tampilannya', tr: 'Nasıl görüneceğini seç', pl: 'Wybierz, jak ma wyglądać' },
    subtitle: {
      en: 'Dark, warm, high-contrast — a theme changes the whole app. It comes with the subscription along with the course, dialogues and training.',
      'pt-BR': 'Escuro, quente, de alto contraste: o tema muda o app inteiro. Vem na assinatura junto com o curso, os diálogos e os treinos.',
      vi: 'Tối, ấm, tương phản cao — chủ đề đổi toàn bộ ứng dụng. Nó đi kèm gói đăng ký cùng khóa học, hội thoại và luyện tập.',
      id: 'Gelap, hangat, kontras tinggi — tema mengubah seluruh aplikasi. Termasuk dalam langganan bersama kursus, dialog, dan latihan.',
      tr: 'Koyu, sıcak, yüksek kontrast — tema uygulamanın tamamını değiştirir. Kurs, diyaloglar ve antrenmanlarla birlikte abonelikte gelir.',
      pl: 'Ciemny, ciepły, kontrastowy — motyw zmienia całą aplikację. Wchodzi w skład subskrypcji razem z kursem, dialogami i treningami.',
    },
  },
  club: {
    title: { en: 'Practice with the community', 'pt-BR': 'Pratique com a comunidade', vi: 'Luyện tập cùng cộng đồng', id: 'Berlatih bersama komunitas', tr: 'Toplulukla pratik yap', pl: 'Ćwicz ze społecznością' },
    subtitle: {
      en: 'Practice with community features and keep your learning moving.',
      'pt-BR': 'Pratique com recursos da comunidade e mantenha seu aprendizado.',
      vi: 'Luyện tập cùng các tính năng cộng đồng và tiếp tục học.',
      id: 'Berlatih dengan fitur komunitas dan lanjutkan belajarmu.',
      tr: 'Topluluk özellikleriyle pratik yap ve öğrenmeye devam et.',
      pl: 'Ćwicz z funkcjami społeczności i kontynuuj naukę.',
    },
  },
  mistake_practice: {
    title: { en: 'Go over your mistakes whenever you like', 'pt-BR': 'Revise seus erros quando quiser', vi: 'Xem lại lỗi bất cứ khi nào bạn muốn', id: 'Bahas kesalahanmu kapan pun kamu mau', tr: 'Hatalarını istediğin zaman çöz', pl: 'Przerabiaj błędy, kiedy chcesz' },
    subtitle: {
      en: 'One round a day for free. With a subscription come back to them as often as you need, and every answer comes with an explanation of what went wrong. The whole course, dialogues and training open up with it.',
      'pt-BR': 'Grátis é uma rodada por dia. Com a assinatura, volte a eles quantas vezes precisar, e cada resposta vem com a explicação do que deu errado. Junto com isso abrem o curso inteiro, os diálogos e os treinos.',
      vi: 'Miễn phí là một lượt mỗi ngày. Với gói đăng ký, quay lại bao nhiêu lần tùy bạn, và mỗi câu trả lời đều kèm giải thích chỗ sai. Cùng lúc đó mở ra trọn khóa học, hội thoại và luyện tập.',
      id: 'Gratis satu ronde sehari. Dengan langganan, kembalilah sesering yang kamu perlu, dan tiap jawaban disertai penjelasan apa yang salah. Bersamaan dengan itu terbuka seluruh kursus, dialog, dan latihan.',
      tr: 'Ücretsizde günde bir tur var. Abonelikle onlara istediğin kadar dön, her cevapta neyin yanlış gittiğinin açıklaması olur. Bununla birlikte kursun tamamı, diyaloglar ve antrenmanlar açılır.',
      pl: 'Za darmo jedno podejście dziennie. W subskrypcji wracaj do nich, ile potrzebujesz, a przy każdej odpowiedzi jest wyjaśnienie, co poszło nie tak. Razem z tym otwiera się cały kurs, dialogi i treningi.',
    },
  },
  mastery: {
    title: { 'pt-BR': 'Repita lições sem limites', vi: 'Ôn lại bài học không giới hạn', id: 'Ulang pelajaran tanpa batas', tr: 'Dersleri sınırsız tekrar et', pl: 'Powtarzaj lekcje bez ograniczeń' },
    subtitle: {
      'pt-BR': 'Com Plus, qualquer lição concluída fica aberta para repetir sem gastar moedas, mesmo quando o preço subiria a cada repetição.',
      vi: 'Với Plus, mọi bài đã hoàn thành đều có thể ôn lại mà không tốn xu, kể cả khi giá tăng sau mỗi lần học lại.',
      id: 'Dengan Plus, semua pelajaran selesai bisa diulang tanpa memakai koin, bahkan saat harga naik di tiap pengulangan.',
      tr: 'Plus ile tamamlanan her dersi jeton harcamadan tekrar edersin, ücretsiz modda fiyat her tekrar artsa bile.',
      pl: 'Z Plus każda ukończona lekcja jest otwarta do powtórki bez monet, nawet gdy w trybie free cena rosłaby po każdym przejściu.',
    },
  },
  stats: {
    title: { en: 'See how you are doing', 'pt-BR': 'Veja como você está indo', vi: 'Xem bạn đang tiến tới đâu', id: 'Lihat bagaimana perkembanganmu', tr: 'İşlerin nasıl gittiğine bak', pl: 'Zobacz, jak ci idzie' },
    subtitle: {
      en: 'A year of study on one screen: where it went easily, where you got stuck and what is worth catching up on. It is part of the subscription, which includes the whole course, speaking practice and training without a counter.',
      'pt-BR': 'Um ano de estudo em uma tela: onde fluiu, onde você travou e o que vale reforçar. Faz parte da assinatura, que inclui o curso inteiro, a prática de fala e os treinos sem contador.',
      vi: 'Cả năm học trên một màn hình: chỗ nào trôi chảy, chỗ nào mắc kẹt và điều gì nên bù lại. Đây là một phần của gói đăng ký, bao gồm trọn khóa học, luyện nói và luyện tập không giới hạn lượt.',
      id: 'Setahun belajar dalam satu layar: di mana lancar, di mana tersendat, dan apa yang perlu dikejar. Ini bagian dari langganan yang mencakup seluruh kursus, latihan bicara, dan latihan tanpa penghitung.',
      tr: 'Tek ekranda bir yıllık çalışma: nerede kolay gitti, nerede takıldın ve neyi toparlamaya değer. Kursun tamamını, konuşma pratiğini ve sayaçsız antrenmanı içeren aboneliğin bir parçası.',
      pl: 'Rok nauki na jednym ekranie: gdzie szło łatwo, gdzie utknąłeś i co warto nadrobić. To część subskrypcji, w której jest cały kurs, mówienie na głos i treningi bez licznika.',
    },
  },
  heatmap: {
    title: { en: 'A whole year of study on one screen', 'pt-BR': 'Um ano inteiro de estudo em uma tela', vi: 'Cả năm học trên một màn hình', id: 'Setahun penuh belajar dalam satu layar', tr: 'Tek ekranda bir yıllık çalışma', pl: 'Cały rok nauki na jednym ekranie' },
    subtitle: {
      en: 'Every day is visible: when you kept going day after day and when there was a break. It opens together with all the statistics, the course and speaking practice.',
      'pt-BR': 'Cada dia fica visível: quando você seguiu dia após dia e quando houve uma pausa. Abre junto com todas as estatísticas, o curso e a prática de fala.',
      vi: 'Thấy từng ngày: lúc nào bạn học liên tục và lúc nào có quãng nghỉ. Nó mở ra cùng toàn bộ thống kê, khóa học và luyện nói.',
      id: 'Tiap hari terlihat: kapan kamu jalan terus dan kapan sempat jeda. Terbuka bersama seluruh statistik, kursus, dan latihan bicara.',
      tr: 'Her gün görünür: ne zaman arka arkaya devam ettin, ne zaman ara verdin. Tüm istatistikler, kurs ve konuşma pratiğiyle birlikte açılır.',
      pl: 'Widać każdy dzień: kiedy szło dzień po dniu, a kiedy była przerwa. Otwiera się razem z całą statystyką, kursem i mówieniem na głos.',
    },
  },
  patterns: {
    title: { en: 'What you forget most often', 'pt-BR': 'O que você mais esquece', vi: 'Điều bạn hay quên nhất', id: 'Yang paling sering kamu lupakan', tr: 'En çok neyi unutuyorsun', pl: 'Co zapominasz najczęściej' },
    subtitle: {
      en: 'The app remembers every mistake and shows the topics that did not stick — then builds a training session out of them. Plus the whole course, dialogues and the rest of the statistics.',
      'pt-BR': 'O app lembra cada erro e mostra os temas que não fixaram — e depois monta um treino com eles. Mais o curso inteiro, os diálogos e o resto das estatísticas.',
      vi: 'Ứng dụng nhớ từng lỗi và chỉ ra các chủ đề chưa vững — rồi dựng một buổi luyện tập từ chúng. Cùng trọn khóa học, hội thoại và phần thống kê còn lại.',
      id: 'Aplikasi mengingat tiap kesalahan dan menunjukkan topik yang belum melekat — lalu menyusun latihan dari situ. Ditambah seluruh kursus, dialog, dan sisa statistik.',
      tr: 'Uygulama her hatayı hatırlar ve oturmayan konuları gösterir — sonra onlardan bir antrenman kurar. Ayrıca kursun tamamı, diyaloglar ve istatistiklerin geri kalanı.',
      pl: 'Aplikacja pamięta każdy błąd i pokaże tematy, które się nie utrwaliły — a potem złoży z nich trening. Plus cały kurs, dialogi i reszta statystyk.',
    },
  },
  percentiles: {
    title: { en: 'You are doing better than you think', 'pt-BR': 'Você vai melhor do que pensa', vi: 'Bạn đang làm tốt hơn bạn nghĩ', id: 'Kamu lebih baik dari yang kamu kira', tr: 'Sandığından daha iyi gidiyorsun', pl: 'Idzie ci lepiej, niż myślisz' },
    subtitle: {
      en: 'Your streak and pace next to other learners — we show what you are ahead in. Included in the subscription along with the course, dialogues and training.',
      'pt-BR': 'Sua sequência e seu ritmo ao lado de outros alunos: mostramos onde você está à frente. Incluído na assinatura junto com o curso, os diálogos e os treinos.',
      vi: 'Chuỗi ngày và tốc độ của bạn đặt cạnh những người học khác — chúng tôi chỉ ra chỗ bạn dẫn trước. Nằm trong gói đăng ký cùng khóa học, hội thoại và luyện tập.',
      id: 'Runtutan dan tempo belajarmu dibanding pelajar lain — kami tunjukkan di mana kamu unggul. Termasuk dalam langganan bersama kursus, dialog, dan latihan.',
      tr: 'Serin ve temponun diğer öğrencilere göre durumu — nerede önde olduğunu gösteriyoruz. Kurs, diyaloglar ve antrenmanlarla birlikte abonelikte.',
      pl: 'Twoja seria i tempo na tle innych uczących się — pokazujemy, w czym jesteś z przodu. W subskrypcji razem z kursem, dialogami i treningami.',
    },
  },
  generic: {
    title: { en: 'The whole app', 'pt-BR': 'O app inteiro', vi: 'Toàn bộ ứng dụng', id: 'Seluruh aplikasi', tr: 'Uygulamanın tamamı', pl: 'Cała aplikacja' },
    subtitle: {
      en: 'The whole course, speaking out loud, training with no daily counter, your own phrase collection, statistics and app themes.',
      'pt-BR': 'O curso inteiro, falar em voz alta, treinos sem contador diário, sua coleção de frases, estatísticas e temas do app.',
      vi: 'Trọn khóa học, nói thành tiếng, luyện tập không giới hạn lượt mỗi ngày, bộ sưu tập cụm từ của riêng bạn, thống kê và giao diện ứng dụng.',
      id: 'Seluruh kursus, bicara lantang, latihan tanpa penghitung harian, koleksi frasamu sendiri, statistik, dan tema aplikasi.',
      tr: 'Kursun tamamı, sesli konuşma, günlük sayaç olmadan antrenman, kendi ifade koleksiyonun, istatistikler ve uygulama temaları.',
      pl: 'Cały kurs, mówienie na głos, treningi bez dziennego licznika, własna kolekcja zwrotów, statystyki i motywy aplikacji.',
    },
  },
};

PAYWALL_PLANNED_COPY.premium_expired = {
  title: {
    en: 'Everything is still here — shall we go on?',
    'pt-BR': 'Está tudo aqui — vamos continuar?',
    vi: 'Mọi thứ vẫn còn — mình học tiếp nhé?',
    id: 'Semuanya masih ada — lanjut, yuk?',
    tr: 'Her şey yerinde — devam edelim mi?',
    pl: 'Wszystko jest na miejscu — kontynuujemy?',
  },
  subtitle: {
    en: 'The subscription has ended, but your streak, saved phrases and completed lessons are all still there. Reactivate and carry on from the same page.',
    'pt-BR': 'A assinatura terminou, mas sua sequência, suas frases salvas e as lições concluídas continuam aí. Reative e siga da mesma página.',
    vi: 'Gói đăng ký đã hết, nhưng chuỗi ngày, các cụm từ đã lưu và những bài đã học vẫn còn nguyên. Kích hoạt lại và tiếp tục từ đúng trang đó.',
    id: 'Langganan sudah berakhir, tetapi runtutanmu, frasa tersimpan, dan pelajaran yang selesai tetap ada. Aktifkan lagi dan lanjut dari halaman yang sama.',
    tr: 'Abonelik bitti ama serin, kaydettiğin ifadeler ve tamamladığın dersler yerli yerinde. Yeniden etkinleştir ve aynı sayfadan devam et.',
    pl: 'Subskrypcja się skończyła, ale twoja seria, zapisane zwroty i ukończone lekcje wciąż są na miejscu. Włącz ponownie i kontynuuj z tej samej strony.',
  },
};
PAYWALL_PLANNED_COPY.vip_expired = {
  title: {
    en: 'Everything you learned stayed with you',
    'pt-BR': 'Tudo o que você aprendeu ficou com você',
    vi: 'Mọi thứ bạn đã học vẫn ở lại với bạn',
    id: 'Semua yang kamu pelajari tetap milikmu',
    tr: 'Öğrendiğin her şey sende kaldı',
    pl: 'Wszystko, czego się nauczyłeś, zostało z tobą',
  },
  subtitle: {
    en: 'The free access has ended. A subscription brings it back in full: the course, dialogues with no counter, training and statistics.',
    'pt-BR': 'O acesso gratuito terminou. A assinatura o devolve por inteiro: o curso, os diálogos sem contador, os treinos e as estatísticas.',
    vi: 'Quyền truy cập miễn phí đã kết thúc. Gói đăng ký trả lại trọn vẹn: khóa học, hội thoại không bộ đếm, luyện tập và thống kê.',
    id: 'Akses gratis sudah berakhir. Langganan mengembalikannya utuh: kursus, dialog tanpa penghitung, latihan, dan statistik.',
    tr: 'Ücretsiz erişim sona erdi. Abonelik onu eksiksiz geri getirir: kurs, sayaçsız diyaloglar, antrenmanlar ve istatistikler.',
    pl: 'Darmowy dostęp się skończył. Subskrypcja przywraca go w całości: kurs, dialogi bez licznika, treningi i statystyki.',
  },
};
PAYWALL_PLANNED_COPY.notification_upsell = COURSE_AFTER_LESSON3_PLANNED_COPY;

// Пред-существующие контексты, у которых не было planned-hero-copy → не-RU/UK/ES
// языки падали в generic. Закрываем, чтобы каждый контекст был персональным на всех 8.
PAYWALL_PLANNED_COPY.dialog_limit = {
  title: {
    en: 'Talk as much as you want',
    'pt-BR': 'Converse o quanto quiser',
    vi: 'Trò chuyện thoải mái',
    id: 'Mengobrol sepuasnya',
    tr: 'İstediğin kadar konuş',
    pl: 'Rozmawiaj, ile chcesz',
  },
  subtitle: {
    en: `${MONTHLY_DIALOG} replies a month for free, with a subscription there is no counter. Every scenario opens: a café, a job interview, the doctor. And not only dialogues — the whole course, training and statistics too.`,
    'pt-BR': `Grátis são ${MONTHLY_DIALOG} respostas por mês; com a assinatura não há contador. Todos os cenários abrem: café, entrevista de emprego, médico. E não só os diálogos — o curso inteiro, os treinos e as estatísticas também.`,
    vi: `Miễn phí là ${MONTHLY_DIALOG} câu trả lời mỗi tháng, với gói đăng ký thì không còn bộ đếm. Mọi kịch bản đều mở: quán cà phê, phỏng vấn, bác sĩ. Và không chỉ hội thoại — trọn khóa học, luyện tập và thống kê cũng vậy.`,
    id: `Gratis ${MONTHLY_DIALOG} balasan per bulan; dengan langganan tidak ada penghitung. Semua skenario terbuka: kafe, wawancara kerja, dokter. Dan bukan cuma dialog — seluruh kursus, latihan, dan statistik juga.`,
    tr: `Ücretsizde ayda ${MONTHLY_DIALOG} yanıt var, abonelikte sayaç yok. Tüm senaryolar açılır: kafe, iş görüşmesi, doktor. Ve yalnızca diyaloglar değil — kursun tamamı, antrenmanlar ve istatistikler de.`,
    pl: `Za darmo ${MONTHLY_DIALOG} odpowiedzi miesięcznie, w subskrypcji nie ma licznika. Otwierają się wszystkie scenariusze: kawiarnia, rozmowa o pracę, lekarz. I nie tylko dialogi — cały kurs, treningi i statystyki też.`,
  },
};
PAYWALL_PLANNED_COPY.speaking = {
  title: {
    en: 'Speak out loud as much as you need',
    'pt-BR': 'Fale em voz alta o quanto precisar',
    vi: 'Nói thành tiếng bao nhiêu tùy bạn',
    id: 'Bicara lantang sebanyak yang kamu perlu',
    tr: 'İhtiyacın kadar sesli konuş',
    pl: 'Mów na głos, ile potrzebujesz',
  },
  subtitle: {
    en: `${DAILY_SPEAKING} attempts a day for free, and pronunciation comes from repetition. With a subscription repeat until it sounds right: the app listens to every phrase and shows where the sound went off. Plus the whole course, dialogues and training.`,
    'pt-BR': `Grátis são ${DAILY_SPEAKING} tentativas por dia, e a pronúncia vem da repetição. Com a assinatura repita até soar certo: o app escuta cada frase e mostra onde o som saiu do lugar. Mais o curso inteiro, os diálogos e os treinos.`,
    vi: `Miễn phí là ${DAILY_SPEAKING} lượt mỗi ngày, mà phát âm chỉ chuẩn nhờ lặp lại. Với gói đăng ký, lặp đến khi nghe đúng: ứng dụng nghe từng câu và chỉ ra chỗ âm bị lệch. Cùng trọn khóa học, hội thoại và luyện tập.`,
    id: `Gratis ${DAILY_SPEAKING} percobaan per hari, padahal pelafalan terbentuk lewat pengulangan. Dengan langganan, ulangi sampai terdengar pas: aplikasi mendengar tiap frasa dan menunjukkan di mana bunyinya meleset. Ditambah seluruh kursus, dialog, dan latihan.`,
    tr: `Ücretsizde günde ${DAILY_SPEAKING} deneme var, oysa telaffuz tekrarla oturur. Abonelikle doğru duyulana dek tekrarla: uygulama her cümleyi dinler ve sesin nerede kaydığını gösterir. Ayrıca kursun tamamı, diyaloglar ve antrenmanlar.`,
    pl: `Za darmo ${DAILY_SPEAKING} próby dziennie, a wymowę stawia się powtórzeniami. W subskrypcji powtarzaj, aż zabrzmi dobrze: aplikacja słucha każdej frazy i pokazuje, gdzie dźwięk uciekł. Plus cały kurs, dialogi i treningi.`,
  },
};
PAYWALL_PLANNED_COPY.intro_ended = {
  title: {
    en: 'The free access has ended',
    'pt-BR': 'O acesso gratuito terminou',
    vi: 'Quyền truy cập miễn phí đã kết thúc',
    id: 'Akses gratis sudah berakhir',
    tr: 'Ücretsiz erişim sona erdi',
    pl: 'Darmowy dostęp się skończył',
  },
  subtitle: {
    en: 'Liked how it goes without limits? A subscription brings back exactly the same: the whole course, dialogues with no counter, training and statistics.',
    'pt-BR': 'Gostou de como flui sem limites? A assinatura devolve exatamente isso: o curso inteiro, diálogos sem contador, treinos e estatísticas.',
    vi: 'Bạn thích cảm giác học không giới hạn chứ? Gói đăng ký mang lại đúng điều đó: trọn khóa học, hội thoại không bộ đếm, luyện tập và thống kê.',
    id: 'Suka rasanya belajar tanpa batas? Langganan mengembalikan persis itu: seluruh kursus, dialog tanpa penghitung, latihan, dan statistik.',
    tr: 'Sınırsız ilerlemek hoşuna gitti mi? Abonelik tam olarak onu geri getirir: kursun tamamı, sayaçsız diyaloglar, antrenmanlar ve istatistikler.',
    pl: 'Podobało ci się bez ograniczeń? Subskrypcja przywraca dokładnie to samo: cały kurs, dialogi bez licznika, treningi i statystyki.',
  },
};
PAYWALL_PLANNED_COPY.level_up = COURSE_AFTER_LESSON3_PLANNED_COPY;
PAYWALL_PLANNED_COPY.ai_voice_input = {
  title: {
    en: 'Answer with your voice',
    'pt-BR': 'Responda com a voz',
    vi: 'Trả lời bằng giọng nói',
    id: 'Jawab dengan suara',
    tr: 'Sesinle yanıt ver',
    pl: 'Odpowiadaj głosem',
  },
  subtitle: {
    en: `${DAILY_SPEAKING} spoken replies a day for free. With a subscription say the whole dialogue out loud and the app turns your speech into text. And everything else opens up too: the course, training, statistics.`,
    'pt-BR': `Grátis são ${DAILY_SPEAKING} respostas por voz ao dia. Com a assinatura, fale o diálogo inteiro em voz alta e o app converte sua fala em texto. E todo o resto abre também: o curso, os treinos, as estatísticas.`,
    vi: `Miễn phí là ${DAILY_SPEAKING} câu trả lời bằng giọng nói mỗi ngày. Với gói đăng ký, nói cả cuộc hội thoại thành tiếng và ứng dụng tự chuyển lời bạn thành văn bản. Và mọi thứ khác cũng mở ra: khóa học, luyện tập, thống kê.`,
    id: `Gratis ${DAILY_SPEAKING} jawaban suara per hari. Dengan langganan, ucapkan seluruh dialog dan aplikasi mengubah suaramu jadi teks. Dan semua yang lain ikut terbuka: kursus, latihan, statistik.`,
    tr: `Ücretsizde günde ${DAILY_SPEAKING} sesli yanıt var. Abonelikle diyaloğun tamamını sesli söyle, uygulama konuşmanı metne çevirsin. Ve gerisi de açılır: kurs, antrenmanlar, istatistikler.`,
    pl: `Za darmo ${DAILY_SPEAKING} odpowiedzi głosem dziennie. W subskrypcji mów cały dialog na głos, a aplikacja zamieni mowę w tekst. I reszta też się otwiera: kurs, treningi, statystyki.`,
  },
};

PAYWALL_PLANNED_COPY.dialog_analysis = {
  title: {
    en: 'See how your speech sounded',
    'pt-BR': 'Veja como sua fala soou',
    vi: 'Xem lời bạn nói nghe ra sao',
    id: 'Lihat bagaimana ucapanmu terdengar',
    tr: 'Konuşmanın nasıl duyulduğuna bak',
    pl: 'Zobacz, jak zabrzmiała twoja wypowiedź',
  },
  subtitle: {
    en: 'After a conversation you can see where a phrase sounded unnatural, how to fix it and what to say more naturally next time. It opens together with all the dialogues, the course and training.',
    'pt-BR': 'Depois da conversa dá para ver onde a frase soou pouco natural, como corrigir e o que dizer de forma mais viva na próxima vez. Abre junto com todos os diálogos, o curso e os treinos.',
    vi: 'Sau cuộc trò chuyện, bạn thấy câu nào nghe chưa tự nhiên, cách sửa và cách nói sống động hơn lần sau. Nó mở ra cùng toàn bộ hội thoại, khóa học và luyện tập.',
    id: 'Selesai bercakap, terlihat bagian mana yang kurang alami, cara memperbaikinya, dan apa yang bisa diucapkan lebih hidup lain kali. Terbuka bersama semua dialog, kursus, dan latihan.',
    tr: 'Konuşmadan sonra hangi cümlenin doğal gelmediği, nasıl düzeltileceği ve bir dahaki sefere daha canlı nasıl söyleneceği görünür. Tüm diyaloglar, kurs ve antrenmanlarla birlikte açılır.',
    pl: 'Po rozmowie widać, gdzie fraza zabrzmiała nienaturalnie, jak to poprawić i co powiedzieć żywiej następnym razem. Otwiera się razem ze wszystkimi dialogami, kursem i treningami.',
  },
};

PAYWALL_PLANNED_COPY.dialog_locked_level = {
  // D124 (30.09): сценарий открывает ранг монеты, Plus — лимит ответов и курс.
  title: {
    en: 'The scenario opens with your coin rank',
    'pt-BR': 'O cenário abre com o nível da moeda',
    vi: 'Kịch bản mở theo hạng đồng xu',
    id: 'Skenario terbuka dengan peringkat koin',
    tr: 'Senaryo jeton rütbesiyle açılır',
    pl: 'Scenariusz otwiera się z rangą monety',
  },
  subtitle: {
    en: 'Dialogues open with your coin rank — you earn coins in lessons. Plus removes the monthly reply limit and opens the whole course, training and mistake review.',
    'pt-BR': 'Os diálogos abrem com o nível da moeda — as moedas vêm das lições. O Plus tira o limite mensal de respostas e abre o curso inteiro, os treinos e a revisão de erros.',
    vi: 'Hội thoại mở theo hạng đồng xu — xu kiếm được từ bài học. Plus bỏ giới hạn trả lời hằng tháng và mở toàn bộ khóa học, luyện tập và xem lại lỗi.',
    id: 'Dialog terbuka dengan peringkat koin — koin didapat dari pelajaran. Plus menghapus batas balasan bulanan dan membuka seluruh kursus, latihan, dan pembahasan kesalahan.',
    tr: 'Diyaloglar jeton rütbesiyle açılır — jetonlar derslerde kazanılır. Plus aylık yanıt sınırını kaldırır ve tüm kursu, antrenmanları ve hata incelemesini açar.',
    pl: 'Dialogi otwierają się z rangą monety — monety zdobywasz na lekcjach. Plus znosi miesięczny limit odpowiedzi i otwiera cały kurs, treningi i analizę błędów.',
  },
};

PAYWALL_PLANNED_COPY.flashcard_training = {
  title: {
    en: 'Train as much as you want',
    'pt-BR': 'Treine o quanto quiser',
    vi: 'Luyện tập thoải mái',
    id: 'Berlatih sepuasnya',
    tr: 'İstediğin kadar antrenman yap',
    pl: 'Trenuj, ile chcesz',
  },
  subtitle: {
    en: `${MONTHLY_TRAINING} trainings a month across all modes for free. With a subscription there is no counter, and weak phrases come back more often until they stick. The whole course, speaking practice and statistics open up with it.`,
    'pt-BR': `Grátis são ${MONTHLY_TRAINING} treinos por mês em todos os modos. Com a assinatura não há contador, e as frases fracas voltam com mais frequência até fixarem. Junto com isso abrem o curso inteiro, a prática de fala e as estatísticas.`,
    vi: `Miễn phí là ${MONTHLY_TRAINING} lượt luyện mỗi tháng cho mọi chế độ. Với gói đăng ký không còn bộ đếm, và những cụm từ còn yếu quay lại thường xuyên hơn cho tới khi nhớ chắc. Cùng lúc đó mở ra trọn khóa học, luyện nói và thống kê.`,
    id: `Gratis ${MONTHLY_TRAINING} latihan per bulan untuk semua mode. Dengan langganan tidak ada penghitung, dan frasa yang lemah kembali lebih sering sampai melekat. Bersamaan dengan itu terbuka seluruh kursus, latihan bicara, dan statistik.`,
    tr: `Ücretsizde tüm modlar için ayda ${MONTHLY_TRAINING} antrenman var. Abonelikte sayaç yok ve zayıf ifadeler oturana dek daha sık geri gelir. Bununla birlikte kursun tamamı, konuşma pratiği ve istatistikler açılır.`,
    pl: `Za darmo ${MONTHLY_TRAINING} treningów miesięcznie we wszystkich trybach. W subskrypcji nie ma licznika, a słabe zwroty wracają częściej, aż się utrwalą. Razem z tym otwiera się cały kurs, mówienie na głos i statystyki.`,
  },
};

PAYWALL_PLANNED_COPY.ai_explain = {
  title: {
    en: 'Ask why as often as you need',
    'pt-BR': 'Pergunte por quê quantas vezes precisar',
    vi: 'Hỏi vì sao bao nhiêu lần tùy bạn',
    id: 'Tanya kenapa sesering yang kamu perlu',
    tr: 'Neden diye istediğin kadar sor',
    pl: 'Pytaj dlaczego, ile potrzebujesz',
  },
  subtitle: {
    en: 'A few explanations a day for free. With a subscription the AI explains every mistake: what went wrong, why and how to say it correctly. Plus the whole course, dialogues and training.',
    'pt-BR': 'Grátis são algumas explicações por dia. Com a assinatura a IA explica cada erro: o que deu errado, por quê e como dizer certo. Mais o curso inteiro, os diálogos e os treinos.',
    vi: 'Miễn phí là vài lượt giải thích mỗi ngày. Với gói đăng ký, AI giải thích từng lỗi: sai ở đâu, vì sao và nói đúng thế nào. Cùng trọn khóa học, hội thoại và luyện tập.',
    id: 'Gratis beberapa penjelasan per hari. Dengan langganan, AI menjelaskan tiap kesalahan: apa yang salah, kenapa, dan cara mengucapkannya dengan benar. Ditambah seluruh kursus, dialog, dan latihan.',
    tr: 'Ücretsizde günde birkaç açıklama var. Abonelikle yapay zekâ her hatayı açıklar: ne yanlış gitti, neden ve doğrusu nasıl söylenir. Ayrıca kursun tamamı, diyaloglar ve antrenmanlar.',
    pl: 'Za darmo kilka wyjaśnień dziennie. W subskrypcji AI tłumaczy każdy błąd: co poszło nie tak, dlaczego i jak powiedzieć poprawnie. Plus cały kurs, dialogi i treningi.',
  },
};

PAYWALL_PLANNED_COPY.weekly_review = {
  title: {
    en: 'Your week summed up on one page',
    'pt-BR': 'Sua semana resumida em uma página',
    vi: 'Tổng kết tuần của bạn trên một trang',
    id: 'Rangkuman pekanmu dalam satu halaman',
    tr: 'Haftan tek sayfada özetlenmiş',
    pl: 'Twój tydzień podsumowany na jednej stronie',
  },
  subtitle: {
    en: 'What got stronger, where things slip and where to start the next week — with tips and matching lessons. It opens together with all the statistics, the course and speaking practice.',
    'pt-BR': 'O que ficou mais firme, onde as coisas escorregam e por onde começar a próxima semana — com dicas e lições sob medida. Abre junto com todas as estatísticas, o curso e a prática de fala.',
    vi: 'Điều gì đã vững hơn, chỗ nào còn trượt và nên bắt đầu tuần tới từ đâu — kèm gợi ý và những bài học phù hợp. Nó mở ra cùng toàn bộ thống kê, khóa học và luyện nói.',
    id: 'Apa yang menguat, di mana masih goyah, dan dari mana memulai pekan berikutnya — lengkap dengan tips dan pelajaran yang cocok. Terbuka bersama seluruh statistik, kursus, dan latihan bicara.',
    tr: 'Ne güçlendi, nerede kayıyor ve gelecek haftaya nereden başlamalı — ipuçları ve uygun derslerle. Tüm istatistikler, kurs ve konuşma pratiğiyle birlikte açılır.',
    pl: 'Co się wzmocniło, gdzie się chwieje i od czego zacząć kolejny tydzień — z podpowiedziami i dopasowanymi lekcjami. Otwiera się razem z całą statystyką, kursem i mówieniem na głos.',
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
    'pt-BR': 'A aura premium ilumina seu avatar entre amigos. Você é visto na hora em listas e chats.',
    vi: 'Hào quang cao cấp làm avatar của bạn nổi bật trong giải đấu và giữa bạn bè. Bạn được chú ý ngay trong danh sách và trò chuyện.',
    id: 'Aura premium menyorot avatarmu di antara teman. Kamu langsung terlihat di daftar dan obrolan.',
    tr: 'Premium aura, liglerde ve arkadaşlar arasında avatarını aydınlatır. Listelerde ve sohbetlerde hemen fark edilirsin.',
    pl: 'Premium aura podświetla twój awatar wśród znajomych. Widać cię od razu na listach i czatach.',
  },
};

export function getHeroPlannedCopy(ctx: PremiumContext, savedCards: number): PremiumPlannedHeroCopy {
  const planned = PAYWALL_PLANNED_COPY[ctx] ?? PAYWALL_PLANNED_COPY.generic;
  if (ctx !== 'flashcard_limit' || savedCards <= 0) return planned;
  return {
    ...planned,
    title: {
      'pt-BR': `${savedCards}/50 cartões salvos`,
      vi: `Đã lưu ${savedCards}/50 thẻ`,
      id: `${savedCards}/50 kartu tersimpan`,
      tr: `${savedCards}/50 kart kaydedildi`,
      pl: `Zapisano ${savedCards}/50 fiszek`,
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
// зачем (владелец, 2026-09-22): «Верни полный доступ Plus» — команда с
// названием продукта. У вернувшегося другой вопрос: цело ли то, что он учил.
const WIN_BACK_TITLE: Pick<PaywallCopy, 'titleRu' | 'titleUk' | 'titleEs'> = {
  titleRu: 'Всё на месте — продолжим?',
  titleUk: 'Усе на місці — продовжимо?',
  titleEs: 'Todo sigue ahí, ¿continuamos?',
};

// Win-back заголовок для planned-локалей (pt-BR/vi/id/tr/pl), которые берут title
// из planned-копии, а не из RU/UK/ES.
const WIN_BACK_PLANNED_TITLE: PremiumPlannedCopy = {
  en: 'Everything is still here — shall we go on?',
  'pt-BR': 'Está tudo aqui — vamos continuar?',
  vi: 'Mọi thứ vẫn còn — mình học tiếp nhé?',
  id: 'Semuanya masih ada — lanjut, yuk?',
  tr: 'Her şey yerinde — devam edelim mi?',
  pl: 'Wszystko jest na miejscu — kontynuujemy?',
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
// зачем (владелец, 2026-09-22): у вернувшегося один страх — «я всё потерял?».
// Прежний текст трижды повторял название продукта и отвечал на этот страх лишь
// в конце фразы. Теперь ответ стоит первым.
PAYWALL_COPY.premium_expired = {
  titleRu: 'Всё на месте — продолжим?',
  titleUk: 'Усе на місці — продовжимо?',
  titleEs: 'Todo sigue ahí, ¿continuamos?',
  subtitleRu: 'Подписка закончилась, но серия, сохранённые фразы и пройденные уроки никуда не делись. Подключай — и продолжай с той же страницы.',
  subtitleUk: 'Передплата завершилася, але серія, збережені вислови та пройдені уроки нікуди не зникли. Підключай — і продовжуй із тієї ж сторінки.',
  subtitleEs: 'La suscripción terminó, pero tu racha, tus frases guardadas y las lecciones completadas siguen ahí. Reactívala y continúa en la misma página.',
};
PAYWALL_COPY.vip_expired = {
  titleRu: 'Всё выученное осталось с тобой',
  titleUk: 'Усе вивчене залишилося з тобою',
  titleEs: 'Todo lo aprendido se queda contigo',
  subtitleRu: 'Бесплатный доступ закончился. Подписка возвращает его целиком: курс, разговоры без счётчика, тренировки и статистику.',
  subtitleUk: 'Безкоштовний доступ завершився. Передплата повертає його цілком: курс, розмови без лічильника, тренування та статистику.',
  subtitleEs: 'El acceso gratuito ha terminado. La suscripción lo devuelve entero: el curso, los diálogos sin contador, los entrenamientos y las estadísticas.',
};
PAYWALL_COPY.notification_upsell = COURSE_AFTER_LESSON3_COPY;

export const CONTEXT_BENEFITS: Partial<Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]>> & { generic: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] } = {
  onboarding_plan: MAIN_COURSE_PLUS_BENEFITS,
  language_add: [
    { ru: 'Несколько языков в одном аккаунте', uk: 'Кілька мов в одному акаунті', es: 'Varios idiomas en una cuenta', en: 'Several languages in one account', 'pt-BR': 'Vários idiomas em uma conta', vi: 'Nhiều ngôn ngữ trong một tài khoản', id: 'Beberapa bahasa dalam satu akun', tr: 'Tek hesapta birden çok dil', pl: 'Kilka języków na jednym koncie' },
    { ru: 'У каждого языка свой план и прогресс', uk: 'У кожної мови свій план і прогрес', es: 'Cada idioma con su plan y progreso', en: 'Each language has its own plan and progress', 'pt-BR': 'Cada idioma com seu plano e progresso', vi: 'Mỗi ngôn ngữ có kế hoạch và tiến độ riêng', id: 'Tiap bahasa punya rencana dan progres sendiri', tr: 'Her dilin kendi planı ve ilerlemesi', pl: 'Każdy język ma własny plan i postęp' },
    { ru: 'Переключайся между языками в один тап', uk: 'Перемикайся між мовами одним дотиком', es: 'Cambia de idioma con un toque', en: 'Switch languages in one tap', 'pt-BR': 'Troque de idioma com um toque', vi: 'Chuyển ngôn ngữ chỉ với một chạm', id: 'Berpindah bahasa dengan satu ketukan', tr: 'Tek dokunuşla diller arasında geç', pl: 'Przełączaj języki jednym dotknięciem' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', en: 'Free sessions with no timer', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, тренировка и финальный экзамен без вынужденных пауз', uk: 'Урок, тренування і фінальний іспит без вимушених пауз', es: 'Lección, práctica y examen sin pausas forzadas', en: 'Lesson, practice and final exam with no forced pauses', 'pt-BR': 'Lição, prática e exame final sem pausas forçadas', vi: 'Bài học, luyện tập và bài cuối không bị dừng ép buộc', id: 'Pelajaran, latihan, dan ujian akhir tanpa jeda paksa', tr: 'Ders, pratik ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, praktyka i egzamin bez wymuszonych przerw' },
    { ru: 'День не обрывается на самом интересном', uk: 'День не обривається на найцікавішому', es: 'El día no se corta justo cuando empieza', en: 'Your day doesn\'t stop at the best part', 'pt-BR': 'O dia não para bem na melhor hora', vi: 'Buổi học không dừng đúng lúc đang vào guồng', id: 'Hari belajar tidak berhenti saat mulai seru', tr: 'Gün tam hızlanmışken kesilmez', pl: 'Dzień nie urywa się w najciekawszym momencie' },
  ],
  course_after_lesson3: MAIN_COURSE_PLUS_BENEFITS,
  lesson_b1: MAIN_COURSE_PLUS_BENEFITS,
  flashcard_limit: [
    { ru: 'Безлимит на личную базу карточек', uk: 'Безліміт на особисту базу карток', es: 'Tu colección de tarjetas sin límite', en: 'Unlimited personal card collection', 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { ru: 'Храни все важные фразы', uk: 'Зберігай усі важливі вислови', es: 'Guarda todas tus frases clave', en: 'Keep all your key phrases', 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    // зачем (владелец, 2026-09-22): «Лучше долгосрочное запоминание» — обрубок
    // фразы, звучит как заметка в блокноте, а не как обещание человеку.
    { ru: 'Фразы не теряются со временем', uk: 'Вислови не губляться з часом', es: 'Las frases no se pierden con el tiempo', en: 'Phrases don\'t get lost over time', 'pt-BR': 'As frases não se perdem com o tempo', vi: 'Các cụm từ không mất đi theo thời gian', id: 'Frasa tidak hilang seiring waktu', tr: 'İfadeler zamanla kaybolmaz', pl: 'Zwroty nie giną z czasem' },
  ],
  streak: [
    // зачем (владелец, 2026-09-22): «Серия не ломает твой темп» — фраза наизнанку
    // (ломает темп пропуск, а не серия). Буллеты названы тем, что человек делает.
    { ru: 'Защита серии даже при пропуске', uk: 'Захист серії навіть при пропуску', es: 'Protege tu racha aunque faltes un día', en: 'Streak protection even if you miss a day', 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { ru: 'Занятия без ожидания энергии', uk: 'Заняття без очікування енергії', es: 'Estudias sin esperar energía', en: 'Study without waiting for energy', 'pt-BR': 'Estuda sem esperar energia', vi: 'Học mà không phải chờ năng lượng', id: 'Belajar tanpa menunggu energi', tr: 'Enerji beklemeden çalışma', pl: 'Nauka bez czekania na energię' },
    { ru: 'Заниматься каждый день проще', uk: 'Займатися щодня простіше', es: 'Es más fácil practicar a diario', en: 'Practicing every day gets easier', 'pt-BR': 'Fica mais fácil estudar todo dia', vi: 'Học mỗi ngày trở nên dễ hơn', id: 'Lebih mudah belajar setiap hari', tr: 'Her gün çalışmak daha kolay', pl: 'Łatwiej uczyć się codziennie' },
  ],
  theme: [
    // зачем (владелец, 2026-09-22): «Выше вовлеченность в обучение» — отчёт
    // маркетолога, адресованный не тому человеку (и ё потеряна). Буллеты теперь
    // называют проверяемые факты, а не продуктовые метрики.
    { ru: 'Меняет приложение целиком', uk: 'Змінює застосунок цілком', es: 'Cambia toda la app', en: 'Changes the whole app', 'pt-BR': 'Muda o app inteiro', vi: 'Đổi toàn bộ giao diện ứng dụng', id: 'Mengubah seluruh tampilan aplikasi', tr: 'Uygulamanın tamamını değiştirir', pl: 'Zmienia całą aplikację' },
    { ru: 'Переключать можно в любой момент', uk: 'Перемикати можна будь-коли', es: 'Puedes cambiarlo cuando quieras', en: 'Switch any time', 'pt-BR': 'Pode trocar quando quiser', vi: 'Đổi lúc nào cũng được', id: 'Bisa diganti kapan saja', tr: 'İstediğin an değiştirebilirsin', pl: 'Możesz przełączać w każdej chwili' },
    { ru: 'После Plus — стандартный графит', uk: 'Після Plus — стандартний графіт', es: 'Sin Plus, vuelve el grafito estándar', en: 'Without Plus, the standard graphite returns', 'pt-BR': 'Sem Plus, volta o grafite padrão', vi: 'Hết Plus, trở về màu than chì mặc định', id: 'Tanpa Plus, kembali ke grafit standar', tr: 'Plus bitince standart grafite döner', pl: 'Po Plus wraca standardowy grafit' },
  ],
  club: [
    { ru: 'Дополнительные возможности сообщества', uk: 'Додаткові можливості спільноти', es: 'Más funciones de comunidad', en: 'Extra community features', 'pt-BR': 'Mais recursos da comunidade', vi: 'Thêm tính năng cộng đồng', id: 'Fitur komunitas tambahan', tr: 'Ek topluluk özellikleri', pl: 'Dodatkowe funkcje społeczności' },
    { ru: 'Больше способов заниматься регулярно', uk: 'Більше способів займатися регулярно', es: 'Más formas de practicar con regularidad', en: 'More ways to practice regularly', 'pt-BR': 'Mais formas de praticar com regularidade', vi: 'Nhiều cách học đều đặn hơn', id: 'Lebih banyak cara untuk belajar rutin', tr: 'Düzenli pratik için daha fazla yol', pl: 'Więcej sposobów na regularną naukę' },
    // зачем (контракт «≥3 пунктов», экран Plus показывает три; владелец 22.09 — из текста видно,
    // что подписка открывает всё приложение, а не одну функцию): третий пункт у «club» пропал.
    { ru: 'Весь курс, разговоры вслух и статистика', uk: 'Увесь курс, розмови вголос і статистика', es: 'Todo el curso, hablar en voz alta y estadísticas', en: 'The whole course, speaking out loud and stats', 'pt-BR': 'O curso inteiro, fala em voz alta e estatísticas', vi: 'Trọn khóa học, luyện nói thành tiếng và thống kê', id: 'Seluruh kursus, bicara lantang, dan statistik', tr: 'Kursun tamamı, sesli konuşma ve istatistikler', pl: 'Cały kurs, mówienie na głos i statystyki' },
  ],
  generic: [
    // зачем (владелец, 2026-09-22): «Плюс-опции сразу после активации» — фраза
    // из инструкции к бытовой технике. Буллеты названы действиями человека.
    { ru: 'Говоришь вслух с первого дня', uk: 'Говориш уголос із першого дня', es: 'Hablas en voz alta desde el primer día', en: 'Speak out loud from day one', 'pt-BR': 'Você fala em voz alta desde o primeiro dia', vi: 'Nói thành tiếng ngay từ ngày đầu', id: 'Bicara lantang sejak hari pertama', tr: 'İlk günden sesli konuşursun', pl: 'Mówisz na głos od pierwszego dnia' },
    { ru: 'Занятия без ожидания энергии', uk: 'Заняття без очікування енергії', es: 'Estudias sin esperar energía', en: 'Study without waiting for energy', 'pt-BR': 'Estuda sem esperar energia', vi: 'Học mà không phải chờ năng lượng', id: 'Belajar tanpa menunggu energi', tr: 'Enerji beklemeden çalışma', pl: 'Nauka bez czekania na energię' },
    { ru: 'Всё открыто сразу после оплаты', uk: 'Усе відкрито одразу після оплати', es: 'Todo se abre justo al pagar', en: 'Everything opens right after you pay', 'pt-BR': 'Tudo abre logo após o pagamento', vi: 'Mọi thứ mở ra ngay sau khi thanh toán', id: 'Semua terbuka begitu pembayaran selesai', tr: 'Ödemeden hemen sonra her şey açık', pl: 'Wszystko otwarte zaraz po płatności' },
  ],
  mistake_practice: [
    { ru: 'Все ошибки из уроков и карточек в одном месте', uk: 'Усі помилки з уроків і карток в одному місці', es: 'Todos tus errores de lecciones y tarjetas en un lugar', en: 'All mistakes from lessons and cards in one place', 'pt-BR': 'Todos os erros de lições e cartões em um só lugar', vi: 'Mọi lỗi từ bài học và thẻ ở một nơi', id: 'Semua kesalahan dari pelajaran dan kartu di satu tempat', tr: 'Ders ve kart hatalarının hepsi tek yerde', pl: 'Wszystkie błędy z lekcji i fiszek w jednym miejscu' },
    { ru: 'Слова и фразы смешиваются автоматически', uk: 'Слова й вислови змішуються автоматично', es: 'Palabras y frases se mezclan automáticamente', en: 'Words and phrases are mixed automatically', 'pt-BR': 'Palavras e frases se misturam automaticamente', vi: 'Từ và câu được trộn tự động', id: 'Kata dan frasa dicampur otomatis', tr: 'Kelimeler ve ifadeler otomatik karışır', pl: 'Słowa i frazy mieszają się automatycznie' },
    { ru: 'Режимы меняются по твоему прогрессу', uk: 'Режими змінюються за твоїм прогресом', es: 'Los modos cambian según tu progreso', en: 'Modes adapt to your progress', 'pt-BR': 'Os modos mudam conforme seu progresso', vi: 'Chế độ thay đổi theo tiến độ của bạn', id: 'Mode berubah mengikuti progresmu', tr: 'Modlar ilerlemene göre değişir', pl: 'Tryby zmieniają się wraz z postępem' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones', en: 'Unlimited repeats of any lesson', 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { ru: 'Не тратишь монеты на перепрохождения уроков', uk: 'Не витрачаєш монети на перепроходження уроків', es: 'No gastas monedas al repetir lecciones', en: 'No coins spent on replaying lessons', 'pt-BR': 'Você não gasta moedas ao repetir lições', vi: 'Không tốn xu khi học lại bài', id: 'Tidak memakai koin saat mengulang pelajaran', tr: 'Ders tekrarında jeton harcamazsın', pl: 'Nie wydajesz monet na powtórki lekcji' },
    { ru: 'Тренируй до идеального результата без давления', uk: 'Тренуй до ідеального результату без тиску', es: 'Entrena hasta perfeccionar sin presión', en: 'Practice until perfect, no pressure', 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { ru: 'Карта активности: все 365 дней', uk: 'Карта активності: всі 365 днів', es: 'Mapa de actividad: los 365 días', en: 'Activity map: all 365 days', 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { ru: 'Точки роста и слабые темы', uk: 'Точки росту й слабкі теми', es: 'Puntos de crecimiento y temas débiles', en: 'Growth areas and weak topics', 'pt-BR': 'Pontos de melhoria e temas fracos', vi: 'Điểm cần phát triển và chủ đề yếu', id: 'Titik berkembang dan topik lemah', tr: 'Gelişim noktaları ve zayıf konular', pl: 'Punkty wzrostu i słabsze tematy' },
    { ru: 'Сравнение с другими — где ты в топе', uk: 'Порівняння з іншими — де ти в топі', es: 'Comparación con otros: tu top', en: 'Compare with others: see where you rank', 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { ru: '365 дней активности — увидишь своё постоянство', uk: '365 днів активності — побач свою сталість', es: '365 días: ve tu constancia', en: '365 days of activity: see your consistency', 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { ru: 'Лучшие и худшие периоды на одном экране', uk: 'Кращі та гірші періоди на одному екрані', es: 'Mejores y peores semanas a la vista', en: 'Best and worst periods on one screen', 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { ru: 'Понимаешь свой ритм обучения', uk: 'Розумієш свій ритм навчання', es: 'Entiendes tu ritmo real', en: 'Understand your learning rhythm', 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { ru: 'Точки роста: что чаще всего проседает', uk: 'Точки росту: що найчастіше просідає', es: 'Puntos de crecimiento concretos', en: 'Growth areas: what slips most often', 'pt-BR': 'Pontos de crescimento: o que ainda oscila', vi: 'Điểm cần phát triển: phần còn chưa chắc', id: 'Titik berkembang: bagian yang belum kuat', tr: 'Gelişim noktaları: en çok ne aksıyor', pl: 'Punkty wzrostu: co najczęściej siada' },
    { ru: 'Конкретные темы и фразы для отработки', uk: 'Конкретні теми та вислови для відпрацювання', es: 'Temas y frases específicos a entrenar', en: 'Specific topics and phrases to practice', 'pt-BR': 'Temas e frases específicos para treinar', vi: 'Chủ đề và cụm từ cụ thể để luyện', id: 'Topik dan frasa spesifik untuk dilatih', tr: 'Çalışılacak somut konular ve ifadeler', pl: 'Konkretne tematy i frazy do przećwiczenia' },
    { ru: 'Тренируй именно слабое — без распыления', uk: 'Тренуй саме слабке — без розпорошення', es: 'Entrena lo importante, no todo a la vez', en: 'Train what\'s weak, not everything at once', 'pt-BR': 'Treine o ponto fraco sem dispersar', vi: 'Luyện đúng điểm yếu, không bị phân tán', id: 'Latih bagian lemah tanpa menyebar fokus', tr: 'Dağılmadan zayıf noktayı çalış', pl: 'Trenuj dokładnie słabe miejsce, bez rozproszenia' },
  ],
  percentiles: [
    { ru: 'Увидишь свой ранг среди всех учеников', uk: 'Бач свій ранг серед усіх учнів', es: 'Mira tu rango entre estudiantes', en: 'See your rank among all learners', 'pt-BR': 'Veja seu ranking entre todos os alunos', vi: 'Xem thứ hạng của bạn trong số học viên', id: 'Lihat peringkatmu di antara semua siswa', tr: 'Tüm öğrenciler arasındaki sıralamanı gör', pl: 'Zobacz swoją pozycję wśród wszystkich uczniów' },
    // зачем (владелец, 2026-09-22): второй буллет был написан ОТ ПЕРВОГО ЛИЦА
    // («Вижу когда я в топе») — единственный такой на весь проект, явный
    // недосмотр. Первый обещал «мотивацию» вместо конкретики.
    { ru: 'Сравнение по серии, темпу и словарю', uk: 'Порівняння за серією, темпом і словником', es: 'Comparación por racha, ritmo y vocabulario', en: 'Compare by streak, pace and vocabulary', 'pt-BR': 'Comparação por sequência, ritmo e vocabulário', vi: 'So sánh theo chuỗi ngày, tốc độ và vốn từ', id: 'Perbandingan berdasarkan runtutan, tempo, dan kosakata', tr: 'Seri, tempo ve kelime dağarcığına göre karşılaştırma', pl: 'Porównanie według serii, tempa i słownictwa' },
    { ru: 'Видно, где ты впереди и куда расти', uk: 'Видно, де ти попереду й куди рости', es: 'Se ve en qué vas por delante y hacia dónde crecer', en: 'See where you\'re ahead and where to grow', 'pt-BR': 'Dá para ver onde você está à frente e onde crescer', vi: 'Thấy rõ bạn dẫn trước ở đâu và cần tiến tới đâu', id: 'Terlihat di mana kamu unggul dan ke mana berkembang', tr: 'Nerede önde olduğun ve nereye büyüyeceğin görünür', pl: 'Widać, gdzie jesteś z przodu i dokąd rosnąć' },
  ],
};

CONTEXT_BENEFITS.ai_explain = [
  { ru: 'Разбор каждой ошибки сразу после ответа', uk: 'Розбір кожної помилки одразу після відповіді', es: 'Análisis de cada error justo al responder', en: 'Every mistake explained right after you answer', 'pt-BR': 'Análise de cada erro logo após responder', vi: 'Phân tích từng lỗi ngay sau khi trả lời', id: 'Analisis tiap kesalahan langsung setelah menjawab', tr: 'Her hatanın yanıttan hemen sonra analizi', pl: 'Analiza każdego błędu zaraz po odpowiedzi' },
  { ru: 'Понятно: что не так, почему и как правильно', uk: 'Зрозуміло: що не так, чому і як правильно', es: 'Claro: qué falló, por qué y cómo decirlo bien', en: 'Clear: what\'s wrong, why, and how to say it right', 'pt-BR': 'Claro: o que falhou, por quê e como corrigir', vi: 'Rõ ràng: sai ở đâu, vì sao và nói đúng thế nào', id: 'Jelas: apa yang salah, kenapa, dan cara benarnya', tr: 'Net: ne yanlış, neden ve doğrusu nasıl', pl: 'Jasno: co nie tak, dlaczego i jak poprawnie' },
  { ru: 'Без дневного лимита разборов', uk: 'Без денного ліміту розборів', es: 'Sin límite diario de explicaciones', en: 'No daily limit on explanations', 'pt-BR': 'Sem limite diário de explicações', vi: 'Không giới hạn lượt giải thích mỗi ngày', id: 'Tanpa batas penjelasan harian', tr: 'Günlük açıklama sınırı yok', pl: 'Bez dziennego limitu wyjaśnień' },
];

CONTEXT_BENEFITS.weekly_review = [
  { ru: 'Личный итог недели: сильные места и пробелы', uk: 'Особистий підсумок тижня: сильні місця й прогалини', es: 'Resumen personal: fortalezas y huecos', en: 'Your weekly summary: strengths and gaps', 'pt-BR': 'Resumo pessoal: pontos fortes e lacunas', vi: 'Tổng kết tuần cá nhân: điểm mạnh và lỗ hổng', id: 'Rangkuman pribadi: kekuatan dan celah', tr: 'Kişisel hafta özeti: güçlü yanlar ve eksikler', pl: 'Osobiste podsumowanie tygodnia: mocne strony i luki' },
  { ru: 'Точный план на следующую неделю', uk: 'Точний план на наступний тиждень', es: 'Un plan claro para la próxima semana', en: 'A clear plan for next week', 'pt-BR': 'Um plano claro para a próxima semana', vi: 'Kế hoạch rõ ràng cho tuần tới', id: 'Rencana jelas untuk minggu depan', tr: 'Gelecek hafta için net plan', pl: 'Jasny plan na kolejny tydzień' },
  { ru: 'Рекомендации уроков под твои ошибки', uk: 'Рекомендації уроків під твої помилки', es: 'Lecciones recomendadas según tus errores', en: 'Lessons recommended for your mistakes', 'pt-BR': 'Lições recomendadas conforme seus erros', vi: 'Bài học đề xuất theo lỗi của bạn', id: 'Pelajaran rekomendasi sesuai kesalahanmu', tr: 'Hatalarına göre önerilen dersler', pl: 'Lekcje polecane pod twoje błędy' },
];

CONTEXT_BENEFITS.avatar_aura = [
  { ru: 'Аура вокруг аватара — виден у друзей и в списках', uk: 'Аура навколо аватара — тобі видно у друзів і списках', es: 'Aura en tu avatar: visible entre amigos y listas', en: 'An aura around your avatar, visible to friends and in lists', 'pt-BR': 'Aura no avatar: visível entre amigos e listas', vi: 'Hào quang quanh avatar — nổi bật với bạn bè và danh sách', id: 'Aura di avatar: terlihat di teman dan daftar', tr: 'Avatarında aura — arkadaşlarda ve listelerde görünürsün', pl: 'Aura wokół awatara — widoczny u znajomych i na listach' },
  { ru: 'Уникальный стиль профиля, который замечают', uk: 'Унікальний стиль профілю, який помічають', es: 'Un estilo de perfil que se nota', en: 'A unique profile style people notice', 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { ru: 'Работает везде: лидерборды, друзья, чаты', uk: 'Працює всюди: лідерборди, друзі, чати', es: 'Funciona en todas partes: rankings, amigos, chats', en: 'Works everywhere: leaderboards, friends, chats', 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS.speaking = [
  { ru: 'Произноси фразы вслух — приложение слушает', uk: 'Вимовляй вислови вголос — застосунок слухає', es: 'Di las frases en voz alta: la app te escucha', en: 'Say phrases out loud and the app listens', 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { ru: 'Мгновенная подсказка по каждому слову', uk: 'Миттєва підказка щодо кожного слова', es: 'Pista instantánea en cada palabra', en: 'Instant hint on every word', 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { ru: 'Самый быстрый путь заговорить уверенно', uk: 'Найшвидший шлях заговорити впевнено', es: 'El camino más rápido para hablar con seguridad', en: 'The fastest way to speak with confidence', 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS.dialog_limit = [
  { ru: 'Ответы в диалогах без месячного лимита', uk: 'Відповіді в діалогах без місячного ліміту', en: 'Dialogue replies with no monthly limit', es: 'Respuestas en diálogos sin límite mensual', 'pt-BR': 'Respostas nos diálogos sem limite mensal', vi: 'Trả lời trong hội thoại không giới hạn theo tháng', id: 'Balasan dialog tanpa batas bulanan', tr: 'Diyaloglarda aylık sınırsız yanıt', pl: 'Odpowiedzi w dialogach bez limitu miesięcznego' },
  { ru: 'Свободные ответы своими словами', uk: 'Вільні відповіді своїми словами', en: 'Open responses in your own words', es: 'Respuestas abiertas con tus propias palabras', 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { ru: 'Подсказки и разбор реплик во время практики', uk: 'Підказки та розбір реплік під час практики', en: 'Guidance and feedback on your replies as you practice', es: 'Ayuda y análisis de tus respuestas durante la práctica', 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS.intro_ended = [
  { ru: 'Полный доступ возвращается целиком', uk: 'Повний доступ повертається повністю', es: 'Recuperas el acceso completo entero', en: 'Full access comes back, all of it', 'pt-BR': 'O acesso completo volta inteiro', vi: 'Toàn bộ quyền truy cập đầy đủ trở lại', id: 'Akses penuh kembali seutuhnya', tr: 'Tam erişim eksiksiz geri gelir', pl: 'Pełny dostęp wraca w całości' },
  { ru: 'Уроки, практика и тренажёр без пауз и лимитов', uk: 'Уроки, практика і тренажер без пауз і лімітів', es: 'Lecciones, práctica y entrenador sin pausas ni límites', en: 'Lessons, practice and trainer with no pauses or limits', 'pt-BR': 'Lições, prática e treinador sem pausas nem limites', vi: 'Bài học, luyện tập và huấn luyện không dừng, không giới hạn', id: 'Pelajaran, latihan, dan trainer tanpa jeda dan batas', tr: 'Dersler, pratik ve antrenör arasız ve sınırsız', pl: 'Lekcje, praktyka i trener bez przerw i limitów' },
  { ru: 'Сохрани темп, набранный за пробный период', uk: 'Збережи темп, набраний за пробний період', es: 'Mantén el ritmo que lograste en la prueba', en: 'Keep the pace you built during the trial', 'pt-BR': 'Mantenha o ritmo que você ganhou no teste', vi: 'Giữ nhịp bạn đã có trong thời gian dùng thử', id: 'Pertahankan ritme yang kamu dapat saat masa coba', tr: 'Deneme sürecinde kazandığın ritmi koru', pl: 'Zachowaj tempo zdobyte w okresie próbnym' },
];

// зачем: выгоды привязаны к моменту level_up — что конкретно откроется на пути дальше
// (старый третий пункт обещал «legacy reward-бусты», которых у Plus нет — убран, чтобы не врать).
CONTEXT_BENEFITS.level_up = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.premium_expired = [
  { ru: 'Продолжаешь ровно с того места, где остановился', uk: 'Продовжуєш саме з того місця, де зупинився', es: 'Sigues justo donde lo dejaste', en: 'Continue exactly where you left off', 'pt-BR': 'Você continua exatamente de onde parou', vi: 'Tiếp tục đúng chỗ bạn đã dừng', id: 'Lanjut tepat dari tempat terakhir', tr: 'Tam kaldığın yerden devam edersin', pl: 'Kontynuujesz dokładnie tam, gdzie skończyłeś' },
  { ru: 'Снова без лимитов и вынужденных пауз', uk: 'Знову без лімітів і вимушених пауз', es: 'De nuevo sin límites ni pausas forzadas', en: 'No limits or forced pauses again', 'pt-BR': 'De novo sem limites nem pausas forçadas', vi: 'Lại không giới hạn và không bị dừng ép buộc', id: 'Lagi tanpa batas dan jeda paksa', tr: 'Yeniden sınırsız ve zorunlu arasız', pl: 'Znów bez limitów i wymuszonych przerw' },
  { ru: 'Весь твой путь и материалы на месте', uk: 'Весь твій шлях і матеріали на місці', es: 'Todo tu progreso y materiales siguen ahí', en: 'Your whole path and materials are still here', 'pt-BR': 'Todo o seu progresso e materiais continuam lá', vi: 'Toàn bộ tiến trình và tài liệu vẫn còn đó', id: 'Semua progres dan materimu tetap ada', tr: 'Tüm ilerlemen ve materyallerin yerinde', pl: 'Cały twój postęp i materiały są na miejscu' },
];

CONTEXT_BENEFITS.vip_expired = [
  { ru: 'Весь курс и практика снова открыты', uk: 'Увесь курс і практика знову відкриті', es: 'El curso y la práctica, abiertos otra vez', en: 'The whole course and practice are open again', 'pt-BR': 'O curso e a prática, abertos de novo', vi: 'Khóa học và phần luyện tập lại mở ra', id: 'Kursus dan latihan terbuka lagi', tr: 'Kurs ve pratik yeniden açık', pl: 'Cały kurs i praktyka znów otwarte' },
  { ru: 'Без лимитов на уроки и практику', uk: 'Без лімітів на уроки і практику', es: 'Sin límites en lecciones y práctica', en: 'No limits on lessons and practice', 'pt-BR': 'Sem limites em lições e prática', vi: 'Không giới hạn bài học và luyện tập', id: 'Tanpa batas pelajaran dan latihan', tr: 'Derslerde ve pratikte sınır yok', pl: 'Bez limitów na lekcje i praktykę' },
  { ru: 'Путь без пауз и дневных потолков', uk: 'Шлях без пауз і денних стель', es: 'Camino sin pausas ni techos diarios', en: 'A path with no pauses or daily caps', 'pt-BR': 'Caminho sem pausas nem tetos diários', vi: 'Lộ trình không dừng và không trần mỗi ngày', id: 'Jalur tanpa jeda dan plafon harian', tr: 'Ara ve günlük tavan olmadan yol', pl: 'Droga bez pauz i dziennych sufitów' },
];

CONTEXT_BENEFITS.notification_upsell = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.lesson_b1 = MAIN_COURSE_PLUS_BENEFITS;

CONTEXT_BENEFITS.ai_voice_input = [
  { ru: 'Микрофон прямо в поле ответа', uk: 'Мікрофон прямо в полі відповіді', es: 'Micrófono dentro del campo de respuesta', en: 'Microphone right in the answer field', 'pt-BR': 'Microfone direto no campo de resposta', vi: 'Micro ngay trong ô trả lời', id: 'Mikrofon langsung di kolom jawaban', tr: 'Yanıt alanında doğrudan mikrofon', pl: 'Mikrofon bezpośrednio w polu odpowiedzi' },
  { ru: 'Любая реплика превращается в текст', uk: 'Будь-яка репліка перетворюється на текст', es: 'Cualquier respuesta se convierte en texto', en: 'Any reply turns into text', 'pt-BR': 'Qualquer fala vira texto', vi: 'Bất kỳ câu nói nào thành văn bản', id: 'Ucapan apa pun jadi teks', tr: 'Her replik metne dönüşür', pl: 'Każda kwestia zmienia się w tekst' },
  { ru: 'Разговорная практика становится живее', uk: 'Розмовна практика стає живішою', es: 'La práctica de conversación se vuelve más real', en: 'Conversation practice feels more real', 'pt-BR': 'A prática de conversa fica mais viva', vi: 'Luyện hội thoại trở nên thật hơn', id: 'Latihan percakapan terasa lebih hidup', tr: 'Konuşma pratiği daha canlı olur', pl: 'Praktyka rozmowy staje się żywsza' },
];

CONTEXT_BENEFITS.dialog_analysis = [
  { ru: 'Разбор появляется на экране завершения', uk: 'Розбір зʼявляється на екрані завершення', es: 'El análisis aparece al terminar', en: 'The breakdown appears on the finish screen', 'pt-BR': 'A análise aparece ao terminar', vi: 'Phân tích xuất hiện ở màn hình kết thúc', id: 'Analisis muncul di layar selesai', tr: 'Analiz bitiş ekranında görünür', pl: 'Analiza pojawia się na ekranie zakończenia' },
  { ru: 'Видно, где фраза звучит неестественно', uk: 'Видно, де вислів звучить неприродно', es: 'Ves qué frase suena poco natural', en: 'See where a phrase sounds unnatural', 'pt-BR': 'Você vê onde a frase soa pouco natural', vi: 'Thấy câu nào nghe chưa tự nhiên', id: 'Terlihat bagian yang kurang alami', tr: 'İfadenin nerede doğal gelmediği görünür', pl: 'Widać, gdzie fraza brzmi nienaturalnie' },
  { ru: 'Есть вариант, как сказать живее', uk: 'Є варіант, як сказати живіше', es: 'Incluye una forma más viva de decirlo', en: 'Includes a more natural way to say it', 'pt-BR': 'Inclui uma forma mais viva de dizer', vi: 'Có cách nói tự nhiên hơn', id: 'Ada versi yang lebih hidup', tr: 'Daha canlı söyleme biçimi var', pl: 'Jest żywszy wariant wypowiedzi' },
];

CONTEXT_BENEFITS.dialog_locked_level = [
  { ru: 'Ответы в диалогах без месячного лимита', uk: 'Відповіді в діалогах без місячного ліміту', en: 'Dialogue replies with no monthly limit', es: 'Respuestas en diálogos sin límite mensual', 'pt-BR': 'Respostas nos diálogos sem limite mensal', vi: 'Trả lời trong hội thoại không giới hạn theo tháng', id: 'Balasan dialog tanpa batas bulanan', tr: 'Diyaloglarda aylık sınırsız yanıt', pl: 'Odpowiedzi w dialogach bez limitu miesięcznego' },
  { ru: 'Свободные ответы своими словами', uk: 'Вільні відповіді своїми словами', en: 'Open responses in your own words', es: 'Respuestas abiertas con tus propias palabras', 'pt-BR': 'Respostas livres com suas próprias palavras', vi: 'Tự do trả lời bằng lời của bạn', id: 'Jawaban bebas dengan kata-katamu sendiri', tr: 'Kendi sözlerinle özgürce yanıt verme', pl: 'Swobodne odpowiedzi własnymi słowami' },
  { ru: 'Подсказки и разбор реплик во время практики', uk: 'Підказки та розбір реплік під час практики', en: 'Guidance and feedback on your replies as you practice', es: 'Ayuda y análisis de tus respuestas durante la práctica', 'pt-BR': 'Dicas e análise das suas respostas durante a prática', vi: 'Gợi ý và phân tích câu trả lời trong lúc luyện tập', id: 'Petunjuk dan ulasan jawaban selama latihan', tr: 'Pratik sırasında yanıtların için ipuçları ve geri bildirim', pl: 'Podpowiedzi i analiza wypowiedzi podczas ćwiczeń' },
];

CONTEXT_BENEFITS.flashcard_training = [
  { ru: 'Игровая тренировка сохранённых фраз', uk: 'Ігрове тренування збережених висловів', es: 'Entrenamiento lúdico de frases guardadas', en: 'Game-style training of saved phrases', 'pt-BR': 'Treino em jogo com frases salvas', vi: 'Luyện dạng trò chơi với câu đã lưu', id: 'Latihan gim untuk frasa tersimpan', tr: 'Kayıtlı ifadelerle oyunlu antrenman', pl: 'Trening zapisanych fraz w formie gry' },
  { ru: 'Слабые карточки вспоминаются активнее', uk: 'Слабкі картки згадуються активніше', es: 'Recuerdas mejor las tarjetas débiles', en: 'Weak cards come back to you more actively', 'pt-BR': 'Cartões fracos são lembrados de forma ativa', vi: 'Thẻ yếu được nhớ chủ động hơn', id: 'Kartu lemah diingat lebih aktif', tr: 'Zayıf kartlar daha aktif hatırlanır', pl: 'Słabe fiszki wracają aktywniej' },
  { ru: 'Сохранённое превращается в практику', uk: 'Збережене перетворюється на практику', es: 'Lo guardado se convierte en práctica', en: 'What you save becomes practice', 'pt-BR': 'O que você salvou vira prática', vi: 'Mục đã lưu biến thành luyện tập', id: 'Simpanan berubah jadi latihan', tr: 'Kaydedilenler pratiğe dönüşür', pl: 'Zapisane rzeczy zmieniają się w praktykę' },
];

export const CONTEXT_BENEFITS_PLANNED: Partial<Record<PremiumContext, PremiumPlannedCopy[]>> & { generic: PremiumPlannedCopy[] } = {
  onboarding_plan: MAIN_COURSE_PLUS_BENEFITS,
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
    { 'pt-BR': 'Recursos da comunidade para praticar', vi: 'Tính năng cộng đồng để luyện tập', id: 'Fitur komunitas untuk berlatih', tr: 'Pratik için topluluk özellikleri', pl: 'Funkcje społeczności do ćwiczeń' },
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
    { 'pt-BR': 'Você não gasta moedas ao repetir lições', vi: 'Không tốn xu khi học lại bài', id: 'Tidak memakai koin saat mengulang pelajaran', tr: 'Ders tekrarında jeton harcamazsın', pl: 'Nie wydajesz monet na powtórki lekcji' },
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
  { 'pt-BR': 'Aura no avatar: visível entre amigos e listas', vi: 'Hào quang quanh avatar — nổi bật với bạn bè và danh sách', id: 'Aura di avatar: terlihat di teman dan daftar', tr: 'Avatarında aura — arkadaşlarda ve listelerde görünürsün', pl: 'Aura wokół awatara — widoczny u znajomych i na listach' },
  { 'pt-BR': 'Um estilo de perfil que chama atenção', vi: 'Phong cách hồ sơ độc đáo, ai cũng chú ý', id: 'Gaya profil unik yang diperhatikan', tr: 'Fark edilen benzersiz profil stili', pl: 'Wyjątkowy styl profilu, który się zauważa' },
  { 'pt-BR': 'Funciona em tudo: rankings, amigos, chats', vi: 'Hiện ở mọi nơi: bảng xếp hạng, bạn bè, trò chuyện', id: 'Berlaku di mana saja: papan peringkat, teman, obrolan', tr: 'Her yerde çalışır: sıralamalar, arkadaşlar, sohbetler', pl: 'Działa wszędzie: rankingi, znajomi, czaty' },
];

CONTEXT_BENEFITS_PLANNED.speaking = [
  { 'pt-BR': 'Diga as frases em voz alta — o app escuta', vi: 'Nói câu thành tiếng — ứng dụng lắng nghe', id: 'Ucapkan frasa dengan lantang — aplikasi mendengarkan', tr: 'Cümleleri sesli söyle — uygulama dinler', pl: 'Mów frazy na głos — aplikacja słucha' },
  { 'pt-BR': 'Dica instantânea em cada palavra', vi: 'Gợi ý tức thì cho từng từ', id: 'Petunjuk instan untuk tiap kata', tr: 'Her kelime için anında ipucu', pl: 'Natychmiastowa podpowiedź dla każdego słowa' },
  { 'pt-BR': 'O caminho mais rápido para falar com confiança', vi: 'Cách nhanh nhất để nói tự tin', id: 'Cara tercepat untuk bicara percaya diri', tr: 'Kendinden emin konuşmanın en hızlı yolu', pl: 'Najszybsza droga, by mówić pewnie' },
];

CONTEXT_BENEFITS_PLANNED.dialog_limit = [
  { 'pt-BR': 'Respostas nos diálogos sem limite mensal', vi: 'Trả lời trong hội thoại không giới hạn theo tháng', id: 'Balasan dialog tanpa batas bulanan', tr: 'Diyaloglarda aylık sınırsız yanıt', pl: 'Odpowiedzi w dialogach bez limitu miesięcznego' },
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
  { 'pt-BR': 'Respostas nos diálogos sem limite mensal', vi: 'Trả lời trong hội thoại không giới hạn theo tháng', id: 'Balasan dialog tanpa batas bulanan', tr: 'Diyaloglarda aylık sınırsız yanıt', pl: 'Odpowiedzi w dialogach bez limitu miesięcznego' },
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

// зачем (владелец, 2026-09-22): «войти в ритм и не выпадать» — два штампа
// подряд. У вернувшегося после долгого перерыва один вопрос: цело ли то, что он
// учил. Отвечаем на него первой фразой, заголовок оставлен — он хороший.
PAYWALL_COPY.winback = {
  titleRu: 'С возвращением',
  titleUk: 'З поверненням',
  titleEs: 'Qué bien verte de nuevo',
  subtitleRu: 'Мы ничего не стёрли — выученное на месте. Начни с короткого урока, дальше пойдёт само. А с подпиской открыт весь курс сразу, без ожидания энергии.',
  subtitleUk: 'Ми нічого не стерли — вивчене на місці. Почни з короткого уроку, далі піде само. А з передплатою відкритий увесь курс одразу, без очікування енергії.',
  subtitleEs: 'No borramos nada: lo que aprendiste sigue ahí. Empieza con una lección corta y el resto vendrá solo. Y con la suscripción tienes el curso completo desde ya, sin esperar energía.',
};
PAYWALL_PLANNED_COPY.winback = {
  title: { en: 'Welcome back', 'pt-BR': 'Que bom ver você de novo', vi: 'Mừng bạn quay lại', id: 'Senang kamu kembali', tr: 'Yeniden hoş geldin', pl: 'Dobrze, że wracasz' },
  subtitle: {
    en: 'We did not erase anything — what you learned is still here. Start with a short lesson and the rest will follow. And with a subscription the whole course is open right away, with no waiting for energy.',
    'pt-BR': 'Não apagamos nada: o que você aprendeu continua aí. Comece com uma lição curta e o resto vem sozinho. E com a assinatura o curso inteiro já fica aberto, sem esperar energia.',
    vi: 'Chúng tôi không xóa gì cả — những gì bạn đã học vẫn còn. Bắt đầu bằng một bài ngắn, phần còn lại sẽ tự đến. Và với gói đăng ký, cả khóa học mở ngay, không phải chờ năng lượng.',
    id: 'Kami tidak menghapus apa pun — yang kamu pelajari masih ada. Mulai dari pelajaran pendek, sisanya akan mengalir sendiri. Dan dengan langganan, seluruh kursus langsung terbuka tanpa menunggu energi.',
    tr: 'Hiçbir şeyi silmedik — öğrendiklerin duruyor. Kısa bir dersle başla, gerisi kendiliğinden gelir. Abonelikle de kursun tamamı hemen açık, enerji beklemeden.',
    pl: 'Niczego nie skasowaliśmy — to, czego się nauczyłeś, jest na miejscu. Zacznij od krótkiej lekcji, reszta pójdzie sama. A w subskrypcji cały kurs jest otwarty od razu, bez czekania na energię.',
  },
};
CONTEXT_BENEFITS.winback = [
  { ru: 'Всё открыто с первого дня', uk: 'Все відкрито з першого дня', es: 'Todo abierto desde el primer día', en: 'Everything open from day one', 'pt-BR': 'Tudo aberto desde o primeiro dia', vi: 'Mở tất cả từ ngày đầu', id: 'Semua terbuka sejak hari pertama', tr: 'İlk günden her şey açık', pl: 'Wszystko otwarte od pierwszego dnia' },
  { ru: 'Тренер сам подберёт, что вспомнить', uk: 'Тренер сам добере, що згадати', es: 'El entrenador elige qué repasar', en: 'The trainer picks what to review', 'pt-BR': 'O treinador escolhe o que relembrar', vi: 'Huấn luyện viên tự chọn phần cần nhớ lại', id: 'Trainer memilihkan yang perlu diingat', tr: 'Antrenör neyi hatırlayacağını seçer', pl: 'Trener sam dobierze, co przypomnieć' },
  { ru: 'Занятия без пауз энергии', uk: 'Заняття без пауз енергії', es: 'Sesiones sin pausas de energía', en: 'Sessions with no energy pauses', 'pt-BR': 'Sessões sem pausas de energia', vi: 'Học không gián đoạn vì năng lượng', id: 'Belajar tanpa jeda energi', tr: 'Enerji molasız çalışma', pl: 'Nauka bez przerw na energię' },
];
CONTEXT_BENEFITS_PLANNED.winback = [
  { 'pt-BR': 'Tudo aberto desde o primeiro dia', vi: 'Mở tất cả từ ngày đầu', id: 'Semua terbuka sejak hari pertama', tr: 'İlk günden her şey açık', pl: 'Wszystko otwarte od pierwszego dnia' },
  { 'pt-BR': 'O treinador escolhe o que relembrar', vi: 'Huấn luyện viên tự chọn phần cần nhớ lại', id: 'Trainer memilihkan yang perlu diingat', tr: 'Antrenör neyi hatırlayacağını seçer', pl: 'Trener sam dobierze, co przypomnieć' },
  { 'pt-BR': 'Sessões sem pausas de energia', vi: 'Học không gián đoạn vì năng lượng', id: 'Belajar tanpa jeda energi', tr: 'Enerji molasız çalışma', pl: 'Nauka bez przerw na energię' },
];

PAYWALL_COPY.referral_ended = {
  // зачем (владелец, 2026-09-22): «ты видел, как идёт» — намёк вместо
  // конкретики. Перечисляем, что именно возвращается: человек только что этим
  // пользовался и узнаёт список.
  titleRu: 'Бесплатный доступ закончился',
  titleUk: 'Безкоштовний доступ завершився',
  titleEs: 'Tu acceso gratuito terminó',
  subtitleRu: 'Понравилось, как идёт без ограничений? Подписка возвращает всё то же самое: курс целиком, разговоры без счётчика, тренировки и статистику.',
  subtitleUk: 'Сподобалося, як іде без обмежень? Передплата повертає все те саме: курс цілком, розмови без лічильника, тренування та статистику.',
  subtitleEs: '¿Te gustó avanzar sin límites? La suscripción devuelve exactamente eso: el curso completo, diálogos sin contador, entrenamientos y estadísticas.',
};
PAYWALL_PLANNED_COPY.referral_ended = {
  title: { en: 'The free access has ended', 'pt-BR': 'Seu acesso gratuito acabou', vi: 'Quyền truy cập miễn phí đã hết', id: 'Akses gratis sudah berakhir', tr: 'Ücretsiz erişimin sona erdi', pl: 'Darmowy dostęp się skończył' },
  subtitle: {
    en: 'Liked how it goes without limits? A subscription brings back exactly the same: the whole course, dialogues with no counter, training and statistics.',
    'pt-BR': 'Gostou de como flui sem limites? A assinatura devolve exatamente isso: o curso inteiro, diálogos sem contador, treinos e estatísticas.',
    vi: 'Bạn thích cảm giác học không giới hạn chứ? Gói đăng ký mang lại đúng điều đó: trọn khóa học, hội thoại không bộ đếm, luyện tập và thống kê.',
    id: 'Suka rasanya belajar tanpa batas? Langganan mengembalikan persis itu: seluruh kursus, dialog tanpa penghitung, latihan, dan statistik.',
    tr: 'Sınırsız ilerlemek hoşuna gitti mi? Abonelik tam olarak onu geri getirir: kursun tamamı, sayaçsız diyaloglar, antrenmanlar ve istatistikler.',
    pl: 'Podobało ci się bez ograniczeń? Subskrypcja przywraca dokładnie to samo: cały kurs, dialogi bez licznika, treningi i statystyki.',
  },
};
CONTEXT_BENEFITS.referral_ended = [
  { ru: 'Всё, чем ты пользовался, снова открыто', uk: 'Усе, чим ти користувався, знову відкрито', es: 'Todo lo que usabas, abierto otra vez', en: 'Everything you used is open again', 'pt-BR': 'Tudo o que você usava, aberto de novo', vi: 'Mọi thứ bạn từng dùng lại mở', id: 'Semua yang kamu pakai terbuka lagi', tr: 'Kullandığın her şey yeniden açık', pl: 'Wszystko, z czego korzystałeś, znów otwarte' },
  { ru: 'Прогресс и серия продолжаются без пауз', uk: 'Прогрес і серія тривають без пауз', es: 'Tu progreso y racha siguen sin pausas', en: 'Your progress and streak continue without pauses', 'pt-BR': 'Progresso e sequência seguem sem pausas', vi: 'Tiến độ và chuỗi ngày tiếp tục không gián đoạn', id: 'Progres dan runtutan lanjut tanpa jeda', tr: 'İlerleme ve seri arasız devam eder', pl: 'Postęp i seria trwają bez przerw' },
  { ru: 'Диалоги и тренировки — без стопов', uk: 'Діалоги й тренування — без стопів', es: 'Diálogos y entrenamientos sin bloqueos', en: 'Dialogues and training with no stops', 'pt-BR': 'Diálogos e treinos sem travas', vi: 'Hội thoại và luyện tập không bị chặn', id: 'Dialog dan latihan tanpa hambatan', tr: 'Diyaloglar ve antrenmanlar duraksız', pl: 'Dialogi i treningi bez blokad' },
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
  { ru: 'Матчи один за другим, без дневного потолка', uk: 'Матчі один за одним, без денної стелі', es: 'Partidas seguidas, sin tope diario', en: 'Back-to-back matches, no daily cap', 'pt-BR': 'Partidas seguidas, sem teto diário', vi: 'Đấu liên tục, không giới hạn mỗi ngày', id: 'Laga beruntun, tanpa batas harian', tr: 'Arka arkaya maç, günlük sınır yok', pl: 'Mecze jeden po drugim, bez dziennego limitu' },
  { ru: 'Рейтинг растёт быстрее — больше матчей в неделю', uk: 'Рейтинг росте швидше — більше матчів на тиждень', es: 'Tu rango sube más rápido: más partidas por semana', en: 'Your rank grows faster with more matches a week', 'pt-BR': 'Seu ranking sobe mais rápido: mais partidas por semana', vi: 'Thứ hạng lên nhanh hơn nhờ nhiều trận mỗi tuần', id: 'Peringkat naik lebih cepat: lebih banyak laga tiap pekan', tr: 'Derecen daha hızlı yükselir: haftada daha çok maç', pl: 'Ranking rośnie szybciej — więcej meczów w tygodniu' },
  { ru: 'Занятия и тренировки — тоже без стопов', uk: 'Заняття й тренування — теж без стопів', es: 'Lecciones y entrenamientos, también sin bloqueos', en: 'Lessons and training with no stops too', 'pt-BR': 'Lições e treinos também sem travas', vi: 'Bài học và luyện tập cũng không bị chặn', id: 'Pelajaran dan latihan juga tanpa hambatan', tr: 'Dersler ve antrenmanlar da duraksız', pl: 'Lekcje i treningi też bez blokad' },
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
  // зачем (владелец, 2026-09-22): «мастерская» — выдуманное слово, такого
  // раздела в приложении нет. Текст даёт повод: человек вспоминает момент,
  // когда ему это было нужно.
  titleRu: 'Добавь свою фразу',
  titleUk: 'Додай свій вислів',
  titleEs: 'Añade tu propia frase',
  subtitleRu: 'Услышал что-то в сериале или на работе — сохрани, и приложение будет тренировать это вместе с остальным. В подписке ещё весь курс, разговоры вслух и статистика.',
  subtitleUk: 'Почув щось у серіалі чи на роботі — збережи, і застосунок тренуватиме це разом з усім іншим. У передплаті ще увесь курс, розмови вголос і статистика.',
  subtitleEs: 'Oíste algo en una serie o en el trabajo: guárdalo y la app lo entrenará junto con lo demás. La suscripción incluye además el curso completo, la práctica oral y las estadísticas.',
};

PAYWALL_PLANNED_COPY.flashcard_create = {
  title: {
    en: 'Add a phrase of your own',
    'pt-BR': 'Adicione uma frase sua',
    vi: 'Thêm cụm từ của riêng bạn',
    id: 'Tambahkan frasamu sendiri',
    tr: 'Kendi ifadeni ekle',
    pl: 'Dodaj własną frazę',
  },
  subtitle: {
    en: 'Heard something in a series or at work — save it, and the app will train it along with everything else. The subscription also includes the whole course, speaking practice and statistics.',
    'pt-BR': 'Ouviu algo numa série ou no trabalho: salve, e o app vai treinar isso junto com o resto. A assinatura também inclui o curso inteiro, a prática de fala e as estatísticas.',
    vi: 'Nghe được điều gì trong phim hay ở chỗ làm — hãy lưu lại, ứng dụng sẽ luyện nó cùng mọi thứ khác. Gói đăng ký còn có trọn khóa học, luyện nói và thống kê.',
    id: 'Dengar sesuatu di serial atau di tempat kerja — simpan saja, dan aplikasi akan melatihnya bersama yang lain. Langganan juga mencakup seluruh kursus, latihan bicara, dan statistik.',
    tr: 'Bir dizide ya da işte bir şey duydun mu — kaydet, uygulama onu diğerleriyle birlikte çalıştırır. Abonelikte ayrıca kursun tamamı, konuşma pratiği ve istatistikler var.',
    pl: 'Usłyszałeś coś w serialu albo w pracy — zapisz, a aplikacja przećwiczy to razem z resztą. W subskrypcji jest też cały kurs, mówienie na głos i statystyki.',
  },
};

CONTEXT_BENEFITS.flashcard_create = [
  { ru: 'Свои фразы с переводом и озвучкой', uk: 'Свої вислови з перекладом і озвучкою', es: 'Tus frases con traducción y audio', en: 'Your own phrases with translation and audio', 'pt-BR': 'Suas frases com tradução e áudio', vi: 'Cụm từ của bạn kèm bản dịch và audio', id: 'Frasamu dengan terjemahan dan audio', tr: 'Kendi ifadelerin çeviri ve sesle', pl: 'Własne frazy z tłumaczeniem i audio' },
  { ru: 'Учишь то, что нужно именно тебе', uk: 'Вчиш те, що потрібно саме тобі', es: 'Aprendes justo lo que te hace falta', en: 'Learn exactly what you need', 'pt-BR': 'Você estuda exatamente o que precisa', vi: 'Học đúng thứ bạn cần', id: 'Belajar persis yang kamu butuhkan', tr: 'Tam sana gerekeni öğrenirsin', pl: 'Uczysz się dokładnie tego, czego potrzebujesz' },
  { ru: 'Созданное остаётся у тебя навсегда', uk: 'Створене залишається в тебе назавжди', es: 'Lo que creas se queda contigo para siempre', en: 'What you create stays with you for good', 'pt-BR': 'O que você cria fica com você para sempre', vi: 'Thứ bạn tạo ở lại với bạn mãi mãi', id: 'Yang kamu buat tetap milikmu selamanya', tr: 'Oluşturduğun her şey sonsuza dek sende kalır', pl: 'To, co stworzysz, zostaje z tobą na zawsze' },
];

CONTEXT_BENEFITS_PLANNED.flashcard_create = [
  { 'pt-BR': 'Suas frases com tradução e áudio', vi: 'Cụm từ của bạn kèm bản dịch và audio', id: 'Frasamu dengan terjemahan dan audio', tr: 'Kendi ifadelerin çeviri ve sesle', pl: 'Własne frazy z tłumaczeniem i audio' },
  { 'pt-BR': 'Você estuda exatamente o que precisa', vi: 'Học đúng thứ bạn cần', id: 'Belajar persis yang kamu butuhkan', tr: 'Tam sana gerekeni öğrenirsin', pl: 'Uczysz się dokładnie tego, czego potrzebujesz' },
  { 'pt-BR': 'O que você cria fica com você para sempre', vi: 'Thứ bạn tạo ở lại với bạn mãi mãi', id: 'Yang kamu buat tetap milikmu selamanya', tr: 'Oluşturduğun her şey sonsuza dek sende kalır', pl: 'To, co stworzysz, zostaje z tobą na zawsze' },
];

PAYWALL_COPY.pack_create = {
  // зачем (владелец, 2026-09-22): повтор «мастерская», плюс «колода» — карточная
  // лексика. Добавлено то, чего в тексте не было: наборами можно делиться.
  titleRu: 'Собери набор под свою задачу',
  titleUk: 'Збери набір під своє завдання',
  titleEs: 'Arma un set para lo que necesitas',
  subtitleRu: 'Фразы для поездки, собеседования или сериала — в одном месте. Учи набор целиком и делись им с друзьями. А с подпиской открывается и весь курс с разговорной практикой.',
  subtitleUk: 'Вислови для поїздки, співбесіди чи серіалу — в одному місці. Вчи набір цілком і ділися ним із друзями. А з передплатою відкривається й увесь курс із розмовною практикою.',
  subtitleEs: 'Frases para un viaje, una entrevista o una serie, todas en un sitio. Estudia el set entero y compártelo con amigos. Y con la suscripción se abre también el curso completo con práctica oral.',
};

PAYWALL_PLANNED_COPY.pack_create = {
  title: {
    en: 'Build a set for what you need',
    'pt-BR': 'Monte um conjunto para o que você precisa',
    vi: 'Tạo bộ thẻ cho đúng việc của bạn',
    id: 'Susun set sesuai kebutuhanmu',
    tr: 'İhtiyacına göre bir set kur',
    pl: 'Złóż zestaw pod swoje potrzeby',
  },
  subtitle: {
    en: 'Phrases for a trip, an interview or a series — all in one place. Study the whole set and share it with friends. And a subscription also opens the entire course with speaking practice.',
    'pt-BR': 'Frases para uma viagem, uma entrevista ou uma série — tudo em um lugar. Estude o conjunto inteiro e compartilhe com amigos. E a assinatura abre também o curso completo com prática de fala.',
    vi: 'Các câu cho chuyến đi, buổi phỏng vấn hay bộ phim — gom vào một chỗ. Học trọn bộ và chia sẻ với bạn bè. Và gói đăng ký còn mở cả khóa học cùng phần luyện nói.',
    id: 'Frasa untuk perjalanan, wawancara, atau serial — semua di satu tempat. Pelajari setnya utuh dan bagikan ke teman. Dan langganan juga membuka seluruh kursus dengan latihan bicara.',
    tr: 'Bir gezi, bir mülakat ya da bir dizi için ifadeler — hepsi tek yerde. Seti baştan sona çalış ve arkadaşlarınla paylaş. Abonelik ayrıca kursun tamamını konuşma pratiğiyle açar.',
    pl: 'Zwroty na wyjazd, rozmowę o pracę albo serial — wszystko w jednym miejscu. Ucz się całego zestawu i dziel się nim ze znajomymi. A subskrypcja otwiera też cały kurs z mówieniem na głos.',
  },
};

CONTEXT_BENEFITS.pack_create = [
  { ru: 'Своя колода под поездку, работу или сериал', uk: 'Своя колода під поїздку, роботу чи серіал', es: 'Tu mazo para un viaje, el trabajo o una serie', en: 'Your own deck for a trip, work or a show', 'pt-BR': 'Seu baralho para viagem, trabalho ou série', vi: 'Bộ thẻ riêng cho chuyến đi, công việc hay phim', id: 'Set sendiri untuk perjalanan, kerja, atau serial', tr: 'Gezi, iş ya da dizi için kendi kart desten', pl: 'Własna talia na wyjazd, pracę lub serial' },
  { ru: 'Фразы собраны в одном месте, а не вразброс', uk: 'Вислови зібрані в одному місці, а не врозсип', es: 'Las frases juntas en un sitio, no dispersas', en: 'Phrases collected in one place, not scattered', 'pt-BR': 'Frases reunidas em um lugar, não espalhadas', vi: 'Các câu gom một chỗ, không rải rác', id: 'Frasa terkumpul di satu tempat, tidak berserak', tr: 'İfadeler dağınık değil, tek yerde toplu', pl: 'Frazy w jednym miejscu, a nie porozrzucane' },
  { ru: 'Набор можно учить целиком и делиться им', uk: 'Набір можна вчити цілком і ділитися ним', es: 'Estudia el mazo entero y compártelo', en: 'Study the whole deck and share it', 'pt-BR': 'Estude o baralho inteiro e compartilhe', vi: 'Học trọn bộ và chia sẻ nó', id: 'Pelajari set utuh dan bagikan', tr: 'Seti baştan sona çalış ve paylaş', pl: 'Ucz się całego zestawu i dziel się nim' },
];

CONTEXT_BENEFITS_PLANNED.pack_create = [
  { 'pt-BR': 'Seu baralho para viagem, trabalho ou série', vi: 'Bộ thẻ riêng cho chuyến đi, công việc hay phim', id: 'Set sendiri untuk perjalanan, kerja, atau serial', tr: 'Gezi, iş ya da dizi için kendi kart desten', pl: 'Własna talia na wyjazd, pracę lub serial' },
  { 'pt-BR': 'Frases reunidas em um lugar, não espalhadas', vi: 'Các câu gom một chỗ, không rải rác', id: 'Frasa terkumpul di satu tempat, tidak berserak', tr: 'İfadeler dağınık değil, tek yerde toplu', pl: 'Frazy w jednym miejscu, a nie porozrzucane' },
  { 'pt-BR': 'Estude o baralho inteiro e compartilhe', vi: 'Học trọn bộ và chia sẻ nó', id: 'Pelajari set utuh dan bagikan', tr: 'Seti baştan sona çalış ve paylaş', pl: 'Ucz się całego zestawu i dziel się nim' },
];

// ── Комбинированный урок и бейдж скидки (2026-09-20) ───────────────────────
// зачем: оба контекста существовали в приложении как кнопки, но НЕ существовали
// в контракте — на релизе модалка молча закрывалась вместо продажи. Тексты
// пишем прямые, без generic-фолбэка: контракт покрытия это и требует.

/**
 * Комбинированный урок: несколько тем вперемешку в одном занятии.
 *
 * зачем именно такой текст: человек нажал «собрать урок из нескольких тем» —
 * он уже знает, чего хочет, и не упирался ни в какой лимит. Поэтому говорим о
 * самой возможности смешивать темы, а не о запрете.
 */
PAYWALL_COPY.combined_lesson = {
  // зачем (владелец, 2026-09-22): единственное место во всём пейволе, где было
  // обращение на «вы» — остальные тексты на «ты». Плюс добавлено, что подписка
  // открывает не только сборку урока.
  titleRu: 'Несколько тем в одном уроке',
  titleUk: 'Кілька тем в одному уроці',
  titleEs: 'Varios temas en una sola lección',
  subtitleRu: 'Выбираешь темы сам, а урок собирается из них — и старое не забывается, потому что темы возвращаются вперемешку. Вместе с этим открывается весь курс, разговоры вслух и тренировки.',
  subtitleUk: 'Обираєш теми сам, а урок збирається з них — і старе не забувається, бо теми повертаються впереміш. Разом із цим відкривається увесь курс, розмови вголос і тренування.',
  subtitleEs: 'Eliges los temas y la lección se arma con ellos; lo anterior no se olvida porque los temas vuelven mezclados. Junto con esto se abre el curso completo, la práctica oral y los entrenamientos.',
};
PAYWALL_PLANNED_COPY.combined_lesson = {
  title: {
    en: 'Several topics in one lesson',
    'pt-BR': 'Vários temas em uma lição', vi: 'Nhiều chủ đề trong một bài',
    id: 'Beberapa topik dalam satu pelajaran', tr: 'Tek derste birkaç konu',
    pl: 'Kilka tematów w jednej lekcji',
  },
  subtitle: {
    en: 'You pick the topics yourself and the lesson is built from them — and the older material is not forgotten, because topics come back mixed in. The whole course, speaking practice and training open up with it.',
    'pt-BR': 'Você escolhe os temas e a lição é montada com eles — e o conteúdo antigo não se perde, porque os temas voltam misturados. Junto com isso abrem o curso inteiro, a prática de fala e os treinos.',
    vi: 'Bạn tự chọn chủ đề và bài học được dựng từ đó — phần cũ cũng không bị quên, vì các chủ đề quay lại xen kẽ. Cùng lúc đó mở ra trọn khóa học, luyện nói và luyện tập.',
    id: 'Kamu memilih topiknya sendiri dan pelajaran disusun dari situ — materi lama pun tidak terlupakan, karena topik kembali berselang. Bersamaan dengan itu terbuka seluruh kursus, latihan bicara, dan latihan kartu.',
    tr: 'Konuları sen seçersin, ders onlardan kurulur — eski konular da unutulmaz, çünkü karışık olarak geri gelir. Bununla birlikte kursun tamamı, konuşma pratiği ve antrenmanlar açılır.',
    pl: 'Sam wybierasz tematy, a lekcja składa się z nich — i stary materiał nie ucieka, bo tematy wracają na przemian. Razem z tym otwiera się cały kurs, mówienie na głos i treningi.',
  },
};
CONTEXT_BENEFITS.combined_lesson = [
  { ru: 'Темы на выбор — урок собирается под тебя', uk: 'Теми на вибір — урок збирається під тебе', es: 'Temas a elegir: la lección se arma para ti', en: 'Pick your topics: the lesson is built for you', 'pt-BR': 'Temas à escolha: a lição se monta para você', vi: 'Tự chọn chủ đề — bài học hợp với bạn', id: 'Topik pilihanmu — pelajaran disusun untukmu', tr: 'Konuları sen seç — ders sana göre kurulur', pl: 'Tematy do wyboru — lekcja składa się pod ciebie' },
  { ru: 'Старое не забывается — темы возвращаются вперемешку', uk: 'Старе не забувається — теми повертаються впереміш', es: 'No olvidas lo anterior: los temas vuelven mezclados', en: 'Nothing old is forgotten: topics come back mixed', 'pt-BR': 'Você não esquece o anterior: os temas voltam misturados', vi: 'Không quên bài cũ — các chủ đề quay lại xen kẽ', id: 'Yang lama tak terlupa — topik kembali berselang', tr: 'Eskisi unutulmaz — konular karışık geri döner', pl: 'Stare nie ucieka — tematy wracają na przemian' },
  { ru: 'Занятия и тренировки — без дневных стопов', uk: 'Заняття й тренування — без денних стопів', es: 'Lecciones y entrenamientos, sin bloqueos diarios', en: 'Lessons and training with no daily stops', 'pt-BR': 'Lições e treinos, sem travas diárias', vi: 'Bài học và luyện tập, không bị chặn mỗi ngày', id: 'Pelajaran dan latihan, tanpa hambatan harian', tr: 'Dersler ve antrenmanlar, günlük duraksız', pl: 'Lekcje i treningi — bez dziennych blokad' },
];
CONTEXT_BENEFITS_PLANNED.combined_lesson = [
  { 'pt-BR': 'Temas à escolha: a lição se monta para você', vi: 'Tự chọn chủ đề — bài học hợp với bạn', id: 'Topik pilihanmu — pelajaran disusun untukmu', tr: 'Konuları sen seç — ders sana göre kurulur', pl: 'Tematy do wyboru — lekcja składa się pod ciebie' },
  { 'pt-BR': 'Você não esquece o anterior: os temas voltam misturados', vi: 'Không quên bài cũ — các chủ đề quay lại xen kẽ', id: 'Yang lama tak terlupa — topik kembali berselang', tr: 'Eskisi unutulmaz — konular karışık geri döner', pl: 'Stare nie ucieka — tematy wracają na przemian' },
  { 'pt-BR': 'Lições e treinos, sem travas diárias', vi: 'Bài học và luyện tập, không bị chặn mỗi ngày', id: 'Pelajaran dan latihan, tanpa hambatan harian', tr: 'Dersler ve antrenmanlar, günlük duraksız', pl: 'Lekcje i treningi — bez dziennych blokad' },
];

/**
 * Бейдж скидки в шапке Главной.
 *
 * зачем именно такой текст: единственный контекст, где человек НЕ упёрся ни во
 * что — он сам нажал на цену. Поэтому ведёт предложение, а не потерянная
 * функция; конкретный процент подставлять нельзя (он живёт в бейдже и меняется),
 * поэтому говорим про сам факт лучшей цены.
 */
PAYWALL_COPY.home_discount_badge = {
  // зачем (владелец, 2026-09-22): было обращение на «вы» («Ваша цена») — разнобой
  // с остальными экранами. Добавлено, что за этой ценой стоит всё приложение,
  // а не абстрактная «подписка».
  titleRu: 'Твоя цена на подписку',
  titleUk: 'Твоя ціна на передплату',
  titleEs: 'Tu precio de la suscripción',
  subtitleRu: 'Та же подписка — весь курс, разговоры вслух, тренировки без счётчика и статистика — по сниженной цене. Скидка действует ограниченное время.',
  subtitleUk: 'Та сама передплата — увесь курс, розмови вголос, тренування без лічильника та статистика — за зниженою ціною. Знижка діє обмежений час.',
  subtitleEs: 'La misma suscripción —el curso completo, la práctica oral, los entrenamientos sin contador y las estadísticas— a un precio rebajado. El descuento dura un tiempo limitado.',
};
PAYWALL_PLANNED_COPY.home_discount_badge = {
  title: {
    en: 'Your price for the subscription',
    'pt-BR': 'Seu preço da assinatura', vi: 'Giá gói đăng ký của bạn',
    id: 'Harga langganan untukmu', tr: 'Sana özel abonelik fiyatı',
    pl: 'Twoja cena subskrypcji',
  },
  subtitle: {
    en: 'The same subscription — the whole course, speaking practice, training with no counter and statistics — at a reduced price. The discount is available for a limited time.',
    'pt-BR': 'A mesma assinatura — o curso inteiro, a prática de fala, os treinos sem contador e as estatísticas — por um preço menor. O desconto vale por tempo limitado.',
    vi: 'Vẫn gói đăng ký đó — trọn khóa học, luyện nói, luyện tập không bộ đếm và thống kê — với giá giảm. Ưu đãi chỉ có trong thời gian giới hạn.',
    id: 'Langganan yang sama — seluruh kursus, latihan bicara, latihan tanpa penghitung, dan statistik — dengan harga lebih murah. Diskon berlaku untuk waktu terbatas.',
    tr: 'Aynı abonelik — kursun tamamı, konuşma pratiği, sayaçsız antrenman ve istatistikler — indirimli fiyatla. İndirim sınırlı bir süre geçerli.',
    pl: 'Ta sama subskrypcja — cały kurs, mówienie na głos, treningi bez licznika i statystyki — w niższej cenie. Zniżka obowiązuje przez ograniczony czas.',
  },
};
CONTEXT_BENEFITS.home_discount_badge = [
  { ru: 'Та же подписка, цена ниже обычной', uk: 'Та сама підписка, ціна нижча за звичайну', es: 'La misma suscripción a un precio más bajo', en: 'The same subscription at a lower price', 'pt-BR': 'A mesma assinatura por um preço menor', vi: 'Vẫn gói đó, giá thấp hơn thường lệ', id: 'Langganan yang sama, harga lebih rendah', tr: 'Aynı abonelik, her zamankinden ucuz', pl: 'Ta sama subskrypcja, niższa cena' },
  { ru: 'Разговорная практика и разборы без лимитов', uk: 'Розмовна практика й розбори без лімітів', es: 'Práctica de conversación y análisis sin límites', en: 'Conversation practice and breakdowns with no limits', 'pt-BR': 'Prática de conversa e análises sem limites', vi: 'Luyện nói và phân tích không giới hạn', id: 'Latihan bicara dan analisis tanpa batas', tr: 'Konuşma pratiği ve çözümlemeler sınırsız', pl: 'Praktyka mówienia i analizy bez limitów' },
  { ru: 'Отменить можно в любой момент', uk: 'Скасувати можна будь-коли', es: 'Puedes cancelar cuando quieras', en: 'Cancel any time', 'pt-BR': 'Você pode cancelar quando quiser', vi: 'Có thể hủy bất cứ lúc nào', id: 'Bisa dibatalkan kapan saja', tr: 'İstediğin an iptal edebilirsin', pl: 'Możesz anulować w każdej chwili' },
];
CONTEXT_BENEFITS_PLANNED.home_discount_badge = [
  { 'pt-BR': 'A mesma assinatura por um preço menor', vi: 'Vẫn gói đó, giá thấp hơn thường lệ', id: 'Langganan yang sama, harga lebih rendah', tr: 'Aynı abonelik, her zamankinden ucuz', pl: 'Ta sama subskrypcja, niższa cena' },
  { 'pt-BR': 'Prática de conversa e análises sem limites', vi: 'Luyện nói và phân tích không giới hạn', id: 'Latihan bicara dan analisis tanpa batas', tr: 'Konuşma pratiği ve çözümlemeler sınırsız', pl: 'Praktyka mówienia i analizy bez limitów' },
  { 'pt-BR': 'Você pode cancelar quando quiser', vi: 'Có thể hủy bất cứ lúc nào', id: 'Bisa dibatalkan kapan saja', tr: 'İstediğin an iptal edebilirsin', pl: 'Możesz anulować w każdej chwili' },
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
