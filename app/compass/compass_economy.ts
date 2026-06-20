/**
 * Компас — экономика (единый вес дня). Крыло «Экономика», Волна 3.1.
 *
 * ПРОБЛЕМА, которую чиним: награды перекошены. Сессия (урок) даёт сундук + медали
 * + осколки; задание плана — плоско 6 XP; целый день плана — всего +2 осколка.
 * Из-за этого день плана «дешевле» сессии, хотя это Premium-фича.
 *
 * РЕШЕНИЕ: Компас считает СПРАВЕДЛИВЫЙ вес закрытого дня — рекомендацию награды,
 * сопоставимую с сундуком сессии. Это ЧИСТАЯ функция: она НЕ начисляет сама
 * (начисление остаётся за идемпотентными владельцами — registerXP/addShards),
 * а возвращает «сколько день стоит». Применяющий слой берёт рекомендацию и
 * начисляет через существующие каналы. Так Компас ничего не ломает и не дублирует.
 *
 * АНТИ-ФАРМ: если тема уже закрыта и в сессии, и в плане — Компас не задваивает
 * награду за один и тот же смысл (решение принимается здесь, чисто и тестируемо).
 *
 * ИЗОЛЯЦИЯ: применять рекомендацию только при `compassEconomyOn()`. Сам модуль —
 * чистые правила без сайд-эффектов; Date.now()/Math.random() не вызываются внутри.
 */
import type { CompassDay, CompassTaskKind } from './compass_brain';

/** Базовый XP за вид задачи (согласован с PLAN_TASK_XP=6 как нижняя планка). */
const TASK_BASE_XP: Record<CompassTaskKind, number> = {
  lesson_dive: 10, // погружение в сессию весит как маленький урок
  mistake_repair: 8, // разбор ошибок ценен — закрепляет слабое
  flashcards_review: 6,
  pronunciation: 6,
  plan_continue: 6, // = PLAN_TASK_XP, чтобы не понижать привычное
};

/** Осколки за закрытый день по типу — единообразно, не «дешевле» сессии. */
const DAY_SHARDS_BY_RICHNESS = {
  light: 2, // как было у дня плана (не понижаем)
  full: 3, // насыщенный день весит больше
} as const;

export interface CompassDayWeight {
  /** Рекомендуемый базовый XP за закрытый день (сумма по задачам). */
  baseXP: number;
  /** Рекомендуемые осколки за закрытый день. */
  shards: number;
  /** Стоит ли разыграть бонус-сундук (как у сессии) — да для насыщенных дней. */
  eligibleForBonus: boolean;
}

/**
 * Справедливый вес закрытого дня Компаса. Сумма базовых XP по задачам + осколки
 * по насыщенности. Насыщенный день (≥3 задачи или есть погружение) достоин
 * бонус-сундука, как сессия — это и выравнивает экономику.
 */
export function computeCompassDayWeight(day: CompassDay): CompassDayWeight {
  const baseXP = day.tasks.reduce((sum, task) => sum + (TASK_BASE_XP[task.kind] ?? 6), 0);
  const hasDive = day.tasks.some((t) => t.kind === 'lesson_dive');
  const rich = day.tasks.length >= 3 || hasDive;
  return {
    baseXP,
    shards: rich ? DAY_SHARDS_BY_RICHNESS.full : DAY_SHARDS_BY_RICHNESS.light,
    eligibleForBonus: rich,
  };
}

export interface AntiFarmInput {
  /** Тема (POS/урок), за которую собираемся наградить. */
  topic: string;
  /** Темы, уже засчитанные сегодня (из сессий и плана), чтобы не задваивать. */
  alreadyCreditedTopicsToday: readonly string[];
}

/**
 * Можно ли начислить награду за тему, или это повтор того же смысла сегодня.
 * Возвращает false, если тема уже засчитана сегодня (анти-фарм одного смысла).
 */
export function shouldCreditTopic(input: AntiFarmInput): boolean {
  const t = input.topic.trim().toLowerCase();
  if (!t) return false;
  return !input.alreadyCreditedTopicsToday.some((x) => x.trim().toLowerCase() === t);
}
