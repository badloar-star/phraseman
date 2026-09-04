import * as admin from 'firebase-admin';
import {
  authoritativeProgressPatch,
  buildProgressBaseline,
  getWeekKey,
  isoDateUtc,
  progressServerStateFromProgress,
  type ProgressMap,
} from './progress_events';
import { getLevelFromXP } from './xp_levels';

/**
 * Опыт за матч Арены.
 *
 * Владелец (D-69): опыт в Арене обязан быть — сегодня в ней нет ни одной
 * строки про XP. Владелец (D-07): быстрый матч даёт опыт (с 2026-08-29 —
 * и руны тоже, D-07 в части звёзд отменён),
 * иначе играть в него незачем.
 *
 * Начисляется ИСКЛЮЧИТЕЛЬНО на сервере, в той же транзакции расчёта матча, что
 * и звёзды. Причина: расчёт закрывает обоих игроков разом, а соперник к этому
 * моменту мог уже свернуть приложение. Клиентское начисление означало бы, что
 * проигравший стабильно получает звёзды и не получает опыт.
 *
 * Переиспользуется существующий конвейер прогресса (`progress_events.ts`), а не
 * пишется свой: иначе уровень, недельные очки и лига разъедутся с остальным
 * приложением. Не переиспользуются `applyProgressEvent`, семантическая
 * дедупликация по отпечаткам, дневные счётчики и выдача спинов за уровень —
 * Арене они не нужны, а роль защиты от повтора играет расписка журнала звёзд.
 */

/**
 * Версия правила начисления.
 *
 * Поднята до 2 вместе с удвоением наград (2026-09-04): по ней в журнале видно,
 * по какой формуле посчитан конкретный матч. Без этого старые и новые записи
 * смешались бы, и разобрать спорное начисление было бы нечем.
 */
export const ARENA_XP_RULE_VERSION = 2;

export type ArenaXpMode = 'ranked' | 'quick' | 'friend' | 'series';
export type ArenaXpOutcome = 'win' | 'loss' | 'draw';

/*
 * Опыт Арены удвоен (владелец, 2026-09-04: «опыта надо больше давать за арену»).
 *
 * Как было: матч из 8 заданий со всеми верными ответами давал 98 опыта за
 * рейтинговую победу, 68 за поражение, 42 за быстрый матч. Для сравнения — один
 * бонусный урок даёт 500. Разрыв пятикратный, при том что матч требует и
 * скорости, и соперничества.
 *
 * Стало (тот же матч 8/8): рейтинговая победа ~200, поражение ~140, быстрый ~90.
 * Арена становится достойной альтернативой уроку, но НЕ выгоднее учёбы — иначе
 * люди перестанут учиться и будут только играть.
 */
export const ARENA_XP_BASE: Readonly<Record<ArenaXpMode, number>> = Object.freeze({
  ranked: 40, quick: 20, friend: 12, series: 40,
});
export const ARENA_XP_PER_CORRECT: Readonly<Record<ArenaXpMode, number>> = Object.freeze({
  ranked: 12, quick: 8, friend: 6, series: 12,
});
/** Бонус за исход — только там, где исход что-то значит. */
export const ARENA_XP_OUTCOME: Readonly<Record<ArenaXpOutcome, number>> = Object.freeze({
  win: 60, draw: 30, loss: 0,
});
/*
 * Быстрый матч тоже получает бонус за победу (владелец, 2026-09-04).
 *
 * Раньше исход в нём не значил НИЧЕГО: выиграл или проиграл — опыт одинаковый,
 * и играть на победу было незачем. Бонус меньше рейтингового: ставок в быстром
 * матче нет, звёзды ранга не двигаются.
 */
export const ARENA_XP_QUICK_OUTCOME: Readonly<Record<ArenaXpOutcome, number>> = Object.freeze({
  win: 25, draw: 12, loss: 0,
});

/** Потолок за один матч. Кусается только при злоупотреблении. */
export const ARENA_XP_MATCH_CAP = 240;
/**
 * Потолок за сутки на игрока.
 *
 * Поднят вдвое вместе с наградой, чтобы число матчей до упора осталось
 * прежним (~6 рейтинговых побед). Иначе удвоение награды вдвое же сократило бы
 * доступную игру — и щедрость обернулась бы ограничением.
 */
export const ARENA_XP_DAILY_CAP = 1_200;

export type ArenaXpBreakdown = Readonly<{
  schemaVersion: 'arena-xp-breakdown.v1';
  baseXp: number;
  correctBonusXp: number;
  outcomeBonusXp: number;
  totalXp: number;
}>;

type ArenaMatchXpInput = Readonly<{
  mode: ArenaXpMode;
  correctAnswers: number;
  taskCount: number;
  outcome: ArenaXpOutcome;
  dailyXpCredited: number;
}>;

/**
 * Число правильных ответов ОБЯЗАНО быть пересчитано сервером из приватного
 * документа матча. Клиентское значение сюда не попадает никогда.
 */
export function arenaMatchXpReward(input: ArenaMatchXpInput): Readonly<{
  xpEarned: number;
  breakdown?: ArenaXpBreakdown;
}> {
  const taskCount = Math.max(0, Math.trunc(Number(input.taskCount) || 0));
  const correct = Math.max(0, Math.min(Math.trunc(Number(input.correctAnswers) || 0), taskCount));
  const base = ARENA_XP_BASE[input.mode] ?? 0;
  const perCorrect = ARENA_XP_PER_CORRECT[input.mode] ?? 0;
  const outcomeBonus = input.mode === 'ranked' || input.mode === 'series'
    ? (ARENA_XP_OUTCOME[input.outcome] ?? 0)
    // Быстрый матч: меньший бонус, но исход перестал быть безразличным.
    : input.mode === 'quick' ? (ARENA_XP_QUICK_OUTCOME[input.outcome] ?? 0)
      : 0;
  const correctBonus = perCorrect * correct;
  const raw = base + correctBonus + outcomeBonus;
  const capped = Math.min(raw, ARENA_XP_MATCH_CAP);
  const dailyRoom = ARENA_XP_DAILY_CAP - Math.max(0, Math.trunc(Number(input.dailyXpCredited) || 0));
  const xpEarned = Math.max(0, Math.min(capped, dailyRoom));
  if (xpEarned !== raw) return { xpEarned };
  return {
    xpEarned,
    breakdown: {
      schemaVersion: 'arena-xp-breakdown.v1',
      baseXp: base,
      correctBonusXp: correctBonus,
      outcomeBonusXp: outcomeBonus,
      totalXp: xpEarned,
    },
  };
}

export function arenaMatchXp(input: ArenaMatchXpInput): number {
  return arenaMatchXpReward(input).xpEarned;
}

/** Боты опыта не получают и в лигах не участвуют. */
export function arenaXpEligible(stableUid: string): boolean {
  return typeof stableUid === 'string' && stableUid.length > 0 && !stableUid.startsWith('bot_');
}

export type ArenaXpPatch = Readonly<{
  patch: Record<string, unknown>;
  totalXpAfter: number;
  levelAfter: number;
  weekKey: string;
  weekXpAfter: number;
}>;

function progressOf(userData: admin.firestore.DocumentData | undefined): ProgressMap {
  const progress = userData?.progress;
  return progress && typeof progress === 'object' && !Array.isArray(progress)
    ? progress as ProgressMap
    : {};
}

/**
 * Патч документа игрока для начисления опыта. Возвращается вызывающему, чтобы
 * тот передал его как `extraUserFields` в `commitStarOperations` — тогда звёзды
 * и опыт уезжают ОДНОЙ записью, а не двумя.
 */
export function arenaXpUserPatch(input: Readonly<{
  userData: admin.firestore.DocumentData | undefined;
  xpDelta: number;
  now: Date;
}>): ArenaXpPatch {
  const delta = Math.max(0, Math.trunc(Number(input.xpDelta) || 0));
  const baseline = buildProgressBaseline(progressOf(input.userData), input.userData?.progressServerState, input.now);
  const state = progressServerStateFromProgress(baseline, input.now);

  state.totalXp = Math.max(0, state.totalXp + delta);
  state.level = getLevelFromXP(state.totalXp);
  state.weekXp = Math.max(0, state.weekXp + delta);
  // Недельные очки лиги никогда не убывают внутри недели: конвейер лиг всюду
  // берёт максимум из своих источников, и уменьшение здесь разъехалось бы с ним.
  state.weekPoints = Math.max(state.weekPoints, state.weekXp);

  return {
    patch: {
      progress: authoritativeProgressPatch(state),
      progressServerState: { ...state, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    },
    totalXpAfter: state.totalXp,
    levelAfter: state.level,
    weekKey: state.weekKey,
    weekXpAfter: state.weekXp,
  };
}

/** Ключ недели для произвольного момента — тот же помощник, что у прогресса. */
export function arenaWeekKeyForMs(ms: number): string {
  return getWeekKey(isoDateUtc(new Date(ms)));
}
