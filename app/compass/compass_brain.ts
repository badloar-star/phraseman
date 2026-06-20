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

/** Тип дня — выбирается правилами по снимку. */
export type CompassDayType = 'easy' | 'deep_dive' | 'repair' | 'comeback';

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
 * Выбрать тип дня правилами. Приоритет: возврат → ремонт → погружение → лёгкий.
 *  - возврат: давно не заходил (пауза);
 *  - ремонт: накопились ошибки;
 *  - погружение: есть слабая тема и связанная непройденная сессия;
 *  - лёгкий: всё спокойно.
 */
export function decideDayType(snapshot: CompassSnapshot, nowMs: number): CompassDayType {
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

/**
 * Собрать день: тип + 3–5 задач. Каждый тип дня даёт свой набор, но все задачи —
 * это зов в РЕАЛЬНЫЕ части приложения. Прогресс частей не трогается (только зов).
 */
export function buildCompassDay(snapshot: CompassSnapshot, nowMs: number): CompassDay {
  const type = decideDayType(snapshot, nowMs);
  const weakTopic = weakestTopic(snapshot);
  const lessonInviteId = hardestLessonId(snapshot);
  const planDayIndex = snapshot.planDay?.dayIndex;
  const srsDue = snapshot.trainer?.totalDue ?? 0;
  const tasks: CompassTask[] = [];

  if (type === 'comeback') {
    // Тёплый короткий день: чуть-чуть почти забытого.
    tasks.push({ kind: 'flashcards_review', minutes: 2, focus: 'recall' });
    if (srsDue > 0) tasks.push({ kind: 'mistake_repair', minutes: 2, weakTopic });
  } else if (type === 'repair') {
    tasks.push({ kind: 'mistake_repair', minutes: 3, weakTopic });
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    if (planDayIndex) tasks.push({ kind: 'plan_continue', minutes: 3 });
  } else if (type === 'deep_dive') {
    if (lessonInviteId) tasks.push({ kind: 'lesson_dive', minutes: 5, focus: String(lessonInviteId), weakTopic });
    tasks.push({ kind: 'mistake_repair', minutes: 3, weakTopic });
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    tasks.push({ kind: 'pronunciation', minutes: 1 });
  } else {
    // easy
    if (planDayIndex) tasks.push({ kind: 'plan_continue', minutes: 4 });
    if (srsDue > 0) tasks.push({ kind: 'flashcards_review', minutes: 2 });
    tasks.push({ kind: 'pronunciation', minutes: 1 });
  }

  return {
    type,
    tasks: tasks.slice(0, 5),
    topicFocus: weakTopic,
    lessonInviteId: type === 'deep_dive' ? lessonInviteId : undefined,
    planDayIndex,
  };
}
