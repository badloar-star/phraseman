/**
 * Компас — мозг (детерминированный, 0 токенов). ЯДРО, Волна 2.1.
 *
 * Чистая функция: `CompassSnapshot → CompassDay`. По готовым числам важности
 * выбирает ТИП дня и собирает 3–5 задач. НИКАКОГО ИИ, навигации и рендера —
 * только структура «что показать сегодня». ИИ-голос (тёплый текст) приходит
 * отдельным тонким слоем поверх (Волна 5), мозг от него не зависит.
 *
 * Гибрид: здесь — скелет (правила). ИИ лишь озвучивает и слегка подкручивает.
 *
 * Чистота и тестируемость: вход — снимок + nowMs, выход — план. Date.now() не
 * вызывается внутри. Никаких сайд-эффектов.
 */
import type { CompassSnapshot } from './signal_bus';
import type { CompassGoal } from './compass_onboarding_profile';
import type { DayClosingRitual } from './day_closing_ritual';

/** Тип дня — выбирается правилами по снимку. */
export type CompassDayType = 'first_day' | 'easy' | 'deep_dive' | 'repair' | 'comeback' | 'day_closing';

/**
 * Индакшн — «что классного попробовать первым». Лёгкая подсказка одной фичи в
 * приветствии (НЕ задача дня, а зов «загляни сюда»). Выбирается под ситуацию
 * ученика: цель + уровень + есть ли премиум. Все варианты ведут в реальный экран.
 */
export type CompassInductionFeature =
  | 'level_test' // узнать свой уровень (когда стартовал с нуля)
  | 'dialogs' // Диалоги — практика разговора по теме (вау-фича)
  | 'flashcards' // карточки — быстрый набор фраз
  | 'lessons' // сессии-уроки — по шагам
  | 'daily_tasks'; // задания дня — лёгкий ритуал

/** Вид задачи дня — ссылается на реальные части приложения (куда зовёт Компас). */
export type CompassTaskKind =
  | 'lesson_dive' // сессия-погружение (урок за глубиной)
  | 'mistake_repair' // разбор твоих фраз (тренажёр/слабые места)
  | 'flashcards_review' // повтор карточек, пока свежо
  | 'pronunciation' // скажи фразу вслух
  | 'plan_continue'; // продолжить день плана

export interface CompassTask {
  kind: CompassTaskKind;
  /** Тема/фокус задачи (POS-категория или id урока), для подписи и зова. */
  focus?: string;
  /** Грубая оценка минут (для метки «N мин»). */
  minutes: number;
  /** Слабая тема, к которой привязана задача (для карты тем / зова в сессию). */
  weakTopic?: string;
  microDiagnosisId?: string;
}

export interface CompassDay {
  type: CompassDayType;
  tasks: CompassTask[];
  /** Главная тема дня (человеческая подпись соберётся в compass_copy). */
  topicFocus?: string;
  /** Если день-погружение — id рекомендованной сессии (зов за глубиной). */
  lessonInviteId?: number;
  /** День плана (если есть активный план), чтобы подписать «День N». */
  planDayIndex?: number;
  /** Имя ученика для приветствия (из онбординга), '' если не задано. */
  greetingName?: string;
  /** Цель ученика — для обещания в приветствии. */
  goal?: CompassGoal | null;
  /** Уровень ученика — для штриха приветствия. */
  level?: string | null;
  /** Куплен ли полный доступ (влияет на первый шаг и индакшн). */
  hasPremium?: boolean;
  /** Вечерний ритуал: локальный снимок дня без облачных чтений. */
  dayClosing?: DayClosingRitual;
  /**
   * Индакшн-подсказка «попробуй первым» (only first_day/comeback). Тип фичи —
   * подпись и маршрут собираются в copy/route. undefined → подсказки нет.
   */
  inductionFeature?: CompassInductionFeature;
}

/** Сколько мс без активности считаем «паузой» → день-возврат. */
const COMEBACK_PAUSE_MS = 3 * 24 * 60 * 60 * 1000;
/** Порог «много ошибок накопилось» → день-ремонт. */
const REPAIR_MISTAKE_THRESHOLD = 6;
/** Порог слабой темы (mastery level), ниже — кандидат на погружение. */
const WEAK_TOPIC_LEVEL = 2;

/** Самая слабая POS-тема из снимка (наименьший level), либо undefined. */
function weakestTopic(snapshot: CompassSnapshot): string | undefined {
  if (snapshot.posMastery.length === 0) return undefined;
  const sorted = [...snapshot.posMastery].sort((a, b) => a.level - b.level);
  const weakest = sorted[0];
  return weakest && weakest.level <= WEAK_TOPIC_LEVEL ? String(weakest.category) : undefined;
}

/** Суммарное число накопленных ошибок (по урокам). */
function totalMistakes(snapshot: CompassSnapshot): number {
  return Object.values(snapshot.mistakesByLesson).reduce((sum, n) => sum + (n || 0), 0);
}

/**
 * «Чистый лист»: у ученика ещё нет НИКАКОЙ истории, на которую опирается Компас —
 * ни пройденных сессий, ни мастерства по темам, ни накопленных ошибок, ни активного
 * плана, ни очереди повторений. Для такого профиля «закрепим вчерашнее» — ложь
 * (вчера не было): отдаём отдельный приветственный тип дня `first_day`.
 */
function hasNoHistory(snapshot: CompassSnapshot): boolean {
  const srsDue = snapshot.trainer?.totalDue ?? 0;
  return (
    snapshot.passedLessons.length === 0 &&
    snapshot.posMastery.length === 0 &&
    totalMistakes(snapshot) === 0 &&
    snapshot.planDay == null &&
    srsDue === 0
  );
}

/**
 * Выбрать тип дня правилами. Приоритет: возврат → ремонт → погружение → лёгкий.
 *  - возврат: давно не заходил (пауза);
 *  - ремонт: накопились ошибки;
 *  - погружение: есть слабая тема и связанная непройденная сессия;
 *  - лёгкий: всё спокойно.
 */
export function decideDayType(snapshot: CompassSnapshot, nowMs: number): CompassDayType {
  // Чистый лист (новый аккаунт, ещё ничего не делал) — раньше падал в `easy`
  // с текстом «закрепим вчерашнее». Теперь это собственный приветственный тип.
  if (hasNoHistory(snapshot)) return 'first_day';
  const sinceSeen = nowMs - (snapshot.collectedAtMs ?? nowMs);
  // Пауза измеряется по последнему дню активности плана/стора; в снимке нет
  // отдельного lastSeenAt — приближаем через carryover плана (стоит на месте).
  const stalledPlan = snapshot.planDay?.isCarryover === true;
  if (sinceSeen > COMEBACK_PAUSE_MS || stalledPlan) return 'comeback';
  if (totalMistakes(snapshot) >= REPAIR_MISTAKE_THRESHOLD) return 'repair';
  if (weakestTopic(snapshot)) return 'deep_dive';
  return 'easy';
}

/** Срез карты ошибок по урокам → самый «болящий» урок (для зова в сессию). */
function hardestLessonId(snapshot: CompassSnapshot): number | undefined {
  let bestId: number | undefined;
  let bestCount = 0;
  for (const [id, count] of Object.entries(snapshot.mistakesByLesson)) {
    const n = Number(count) || 0;
    const lessonId = Number(id);
    if (n > bestCount && !snapshot.passedLessons.includes(lessonId)) {
      bestCount = n;
      bestId = lessonId;
    }
  }
  return bestId;
}

function mistakeRepairTask(snapshot: CompassSnapshot, minutes: number): CompassTask | null {
  const target = snapshot.mistakeRepairTargets?.[0];
  if (!target?.microDiagnosisId) return null;
  return {
    kind: 'mistake_repair',
    minutes,
    weakTopic: target.category,
    microDiagnosisId: target.microDiagnosisId,
  };
}

/**
 * Выбрать «что попробовать первым» под ситуацию ученика. Лёгкий индакшн в одну
 * фичу — показываем ТОЛЬКО в приветственные дни (first_day / comeback), где у
 * человека ещё нет своего маршрута. В обычные дни маршрут диктует прогресс, и
 * подсказка лишняя (возвращаем undefined).
 *
 * Правила (детерминированно, 0 ИИ):
 *  1. Стартовал с нуля и уровень неясен → «узнай свой уровень» (тест) — самый
 *     полезный первый шаг, не угадываем за ученика.
 *  2. Иначе по цели:
 *     - everyday / series → Диалоги (живой разговор — вау-эффект, держит);
 *     - travel / words    → Сессии-уроки (по шагам наполняют фразами);
 *     - mind              → Сессии-уроки (по шагам, для «для себя»).
 *  3. Возврат (comeback): без перегруза — лёгкий ритуал Заданий дня.
 *  4. Нет данных цели → Диалоги как сильная универсальная витрина.
 *
 * ВАЖНО: НЕ зовём первый день в Карточки. Свайп-карточки у новичка ПУСТЫ — туда
 * фразы попадают только после уроков (экран /flashcards_swipe сам показывает «нет
 * карточек, добавь набор»). Зов «пролистай карточки» в первый день ведёт в
 * пустоту, поэтому цели «слова/путешествия» отправляем в Сессии-уроки: там контент
 * есть сразу и оттуда карточки потом и наполняются.
 */
export function pickInductionFeature(
  snapshot: CompassSnapshot,
  dayType: CompassDayType,
): CompassInductionFeature | undefined {
  if (dayType !== 'first_day' && dayType !== 'comeback') return undefined;

  const { goal, level } = snapshot.onboarding;

  if (dayType === 'comeback') return 'daily_tasks';

  // Стартовал с нуля / уровень не выбран — сперва замерить, куда вести.
  if (level === 'a0' || level == null) return 'level_test';

  switch (goal) {
    case 'everyday':
    case 'series':
      return 'dialogs';
    case 'travel':
    case 'words':
    case 'mind':
      // Все «контентные» цели — в Сессии-уроки: наполнены с нуля, по шагам, и
      // именно оттуда фразы попадают в карточки. Зов в пустые карточки убран.
      return 'lessons';
    default:
      return 'dialogs';
  }
}

/**
 * Собрать день: тип + 3–5 задач. Каждый тип дня даёт свой набор, но все задачи —
 * это зов в РЕАЛЬНЫЕ части приложения. Прогресс частей не трогается (только зов).
 */
export function buildCompassDay(snapshot: CompassSnapshot, nowMs: number): CompassDay {
  const type = decideDayType(snapshot, nowMs);
  const weakTopic = snapshot.mistakeRepairTargets?.[0]?.category ?? weakestTopic(snapshot);
  const lessonInviteId = hardestLessonId(snapshot);
  const planDayIndex = snapshot.planDay?.dayIndex;
  const srsDue = snapshot.trainer?.totalDue ?? 0;
  const tasks: CompassTask[] = [];

  if (type === 'first_day') {
    // Чистый лист: мягкий первый шаг. Если план уже выбран — зовём в него,
    // иначе одна короткая задача «скажи вслух», чтобы сразу начать без давления.
    if (planDayIndex) tasks.push({ kind: 'plan_continue', minutes: 4 });
    tasks.push({ kind: 'pronunciation', minutes: 1 });
  } else if (type === 'comeback') {
    // Тёплый короткий день: чуть-чуть почти забытого.
    tasks.push({ kind: 'flashcards_review', minutes: 2, focus: 'recall' });
    const repair = mistakeRepairTask(snapshot, 2);
    if (srsDue > 0 && repair) tasks.push(repair);
  } else if (type === 'repair') {
    const repair = mistakeRepairTask(snapshot, 3);
    if (repair) tasks.push(repair);
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    if (planDayIndex) tasks.push({ kind: 'plan_continue', minutes: 3 });
  } else if (type === 'deep_dive') {
    if (lessonInviteId) tasks.push({ kind: 'lesson_dive', minutes: 5, focus: String(lessonInviteId), weakTopic });
    const repair = mistakeRepairTask(snapshot, 3);
    if (repair) tasks.push(repair);
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    tasks.push({ kind: 'pronunciation', minutes: 1 });
  } else {
    // easy
    if (planDayIndex) tasks.push({ kind: 'plan_continue', minutes: 4 });
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    tasks.push({ kind: 'pronunciation', minutes: 1 });
  }

  if (tasks.length === 0) {
    tasks.push(planDayIndex ? { kind: 'plan_continue', minutes: 3 } : { kind: 'pronunciation', minutes: 1 });
  }

  return {
    type,
    tasks: tasks.slice(0, 5),
    topicFocus: weakTopic,
    lessonInviteId: type === 'deep_dive' ? lessonInviteId : undefined,
    planDayIndex,
    greetingName: snapshot.onboarding.name || undefined,
    goal: snapshot.onboarding.goal,
    level: snapshot.onboarding.level,
    hasPremium: snapshot.onboarding.hasPremium,
    inductionFeature: pickInductionFeature(snapshot, type),
  };
}
