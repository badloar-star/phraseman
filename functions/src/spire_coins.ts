/**
 * Монеты Шпиля — чистый расчёт операций журнала (PM-280, TOWER.md T35/§4.6).
 *
 * зачем (владелец 2026-09-24): за ступень 10, за этаж N — 10×N (Страж ×2), за
 * вершину +200, за место недели 300/200/150 и за повышение +100. Все числа —
 * из config/spire_v1.coins (админка), здесь только правило, как их разложить на
 * операции. «Одна ступень оплачивается один раз» (§4.6).
 *
 * Валюта: до миграции PM-069 монеты = руны (D49/D51), поэтому операции идут в
 * единый журнал stars_ledger.ts — единственный писатель баланса. Свой кошелёк не
 * заводим: второй писатель баланса — это расхождение, которое уже однажды
 * стоило пользователям денег.
 *
 * Защита от двойной выплаты — ключ операции (opId) журнала, а НЕ флаг в
 * документе. Журнал хранит расписку users/{uid}/star_operations/{opId} и на
 * повтор отвечает `already_applied`, не трогая баланс. Ключ собирается ТОЛЬКО
 * из того, за что платим (язык, неделя, номер ступени/этажа), без времени,
 * суммы и id пачки: тот же факт → тот же ключ при любом разбиении на пачки,
 * при ретрае транзакции и даже если запись прогресса недели когда-то
 * обнулится (тогда ступени 1..N придут заново, но их расписки уже есть).
 *
 * Чистый модуль: ни Firestore, ни часов — проверяется тестом целиком.
 */
import {
  SPIRE_SUMMIT_FLOOR,
  spireIsGuardianFloor,
  spireStepsForFloor,
  type SpireCoinsConfig,
} from './spire_config_contract';
import { STAR_OP_MAX_ABS_DELTA, type StarOpRequest } from './stars_ledger';

/** Версия правила расчёта — только в теле расписки, не в ключе (см. stars_ledger п.5). */
export const SPIRE_COINS_RULE_VERSION = 1 as const;

/**
 * Больше этого числа ступеней за одну пачку не бывает: сервер принимает
 * максимум SPIRE_REPORT_MAX_BATCH (60) отчётов. Предел здесь — страховка от
 * ошибки выше (например, испорченный счётчик), чтобы одна пачка не породила
 * тысячу операций и не упёрлась в лимит транзакции (500 документов).
 */
export const SPIRE_COINS_MAX_STEPS_PER_CALL = 60;

/** Номер этажа, в котором стоит ступень №n недели (1-based), и последняя ли она в этаже. */
export function spireFloorOfStep(stepNumber: number): Readonly<{ floor: number; isFloorEnd: boolean }> {
  const n = Math.max(1, Math.trunc(stepNumber));
  let floor = 1;
  let end = spireStepsForFloor(1);
  while (n > end) {
    floor += 1;
    end += spireStepsForFloor(floor);
  }
  return { floor, isFloorEnd: n === end };
}

/**
 * Целое число монет из числа конфига. Конфиг допускает дробные (positiveOr), а
 * журнал принимает только целые — округляем, минимум 1, максимум — предел
 * одной операции журнала (иначе он отверг бы её как invalid_delta, и игрок
 * молча не получил бы ничего).
 */
export function spireCoinAmount(raw: number): number {
  const n = Math.round(Number.isFinite(raw) ? raw : 0);
  return Math.min(STAR_OP_MAX_ABS_DELTA, Math.max(1, n));
}

/** Монеты за этаж N: perFloorPerLevel × N, у Стража ещё × guardianMultiplier. */
export function spireFloorCoins(floor: number, coins: SpireCoinsConfig): number {
  const base = coins.perFloorPerLevel * floor;
  return spireCoinAmount(spireIsGuardianFloor(floor) ? base * coins.guardianMultiplier : base);
}

export type SpireStepCoinsInput = Readonly<{
  lang: string;
  /** ISO-неделя сервера 'YYYY-Www' — та же, что в записи прогресса недели. */
  weekKey: string;
  /** Пройдено ступеней ДО этой пачки (счётчик недели в progress.spire_week_v1). */
  fromSteps: number;
  /** Пройдено ступеней ПОСЛЕ этой пачки. */
  toSteps: number;
  coins: SpireCoinsConfig;
  /** Время сервера — одно на транзакцию, чтобы ретрай давал ту же расписку. */
  earnedAtMs: number;
  /** [SPIRE-GOLD] ступени недели с засчитанным золотом — каждая получает ещё одну ставку ступени (×2), этаж и вершина нет. */
  goldenSteps?: readonly number[];
}>;

export type SpireStepCoinsPlan = Readonly<{
  ops: readonly StarOpRequest[];
  total: number;
  /** Сколько ступеней не оплачено из-за предела на пачку (должно быть 0; >0 — лог). */
  truncatedSteps: number;
}>;

/**
 * Операции журнала за ступени (fromSteps, toSteps]: по одной на ступень, плюс
 * одна на каждый завершённый этаж, плюс вершина. Этажи «над облаками» (16+)
 * платят только за ступени — TOWER.md §4.3 «16+: как 11–15, только за место»;
 * это прочтение записано открытым вопросом О-280-1.
 */
export function spireStepCoinOps(input: SpireStepCoinsInput): SpireStepCoinsPlan {
  const from = Math.max(0, Math.trunc(input.fromSteps));
  const requestedTo = Math.max(from, Math.trunc(input.toSteps));
  const to = Math.min(requestedTo, from + SPIRE_COINS_MAX_STEPS_PER_CALL);
  const ops: StarOpRequest[] = [];
  const scope = `${input.lang}_${input.weekKey}`;
  const stepCoins = spireCoinAmount(input.coins.perStep);
  let total = 0;

  for (let n = from + 1; n <= to; n += 1) {
    ops.push({
      opId: `spire_step:${scope}_s${n}`,
      delta: stepCoins,
      reason: 'spire_step',
      sourceKind: 'spire_step',
      sourceId: `${scope}_s${n}`,
      ruleVersion: SPIRE_COINS_RULE_VERSION,
      earnedAtMs: input.earnedAtMs,
      meta: { lang: input.lang, weekKey: input.weekKey, step: n },
    });
    total += stepCoins;
    if (input.goldenSteps?.includes(n)) {
      // зачем (владелец 25.10, золотое задание ×2): та же ставка ступени ещё раз, свой ключ — повтор пачки не удвоит
      ops.push({
        opId: `spire_gold:${scope}_s${n}`,
        delta: stepCoins,
        reason: 'spire_step',
        sourceKind: 'spire_gold',
        sourceId: `${scope}_s${n}`,
        ruleVersion: SPIRE_COINS_RULE_VERSION,
        earnedAtMs: input.earnedAtMs,
        meta: { lang: input.lang, weekKey: input.weekKey, step: n, gold: true },
      });
      total += stepCoins;
    }

    const { floor, isFloorEnd } = spireFloorOfStep(n);
    if (!isFloorEnd || floor > SPIRE_SUMMIT_FLOOR) continue;
    const floorCoins = spireFloorCoins(floor, input.coins);
    ops.push({
      opId: `spire_floor:${scope}_f${floor}`,
      delta: floorCoins,
      reason: 'spire_step',
      sourceKind: 'spire_floor',
      sourceId: `${scope}_f${floor}`,
      ruleVersion: SPIRE_COINS_RULE_VERSION,
      earnedAtMs: input.earnedAtMs,
      meta: { lang: input.lang, weekKey: input.weekKey, floor, guardian: spireIsGuardianFloor(floor) },
    });
    total += floorCoins;

    if (floor === SPIRE_SUMMIT_FLOOR) {
      const summitCoins = spireCoinAmount(input.coins.summitBonus);
      ops.push({
        opId: `spire_summit:${scope}`,
        delta: summitCoins,
        reason: 'spire_step',
        sourceKind: 'spire_summit',
        sourceId: scope,
        ruleVersion: SPIRE_COINS_RULE_VERSION,
        earnedAtMs: input.earnedAtMs,
        meta: { lang: input.lang, weekKey: input.weekKey, floor },
      });
      total += summitCoins;
    }
  }
  return { ops, total, truncatedSteps: requestedTo - to };
}

/** Ключ выплаты недели: один на игрока, неделю и язык — навсегда. */
export function spireWeekRewardOpId(weekId: string, lang: string): string {
  return `spire_week:${lang}_${weekId}`;
}

export type SpireWeekRewardInput = Readonly<{
  weekId: string;
  lang: string;
  place: number;
  promotion: number;
  liveRank: number;
  /**
   * Конец недели (понедельник 00:00 UTC следующей). Фиксированное время, а не
   * «сейчас»: журнал сверяет расписку на повторе по earnedAtMs, и ретрай крона
   * обязан собрать операцию байт в байт такой же.
   */
  weekEndMs: number;
}>;

/** Операция журнала за место/повышение недели. null — платить нечего. */
export function spireWeekRewardOp(input: SpireWeekRewardInput): StarOpRequest | null {
  const place = Math.max(0, Math.round(Number.isFinite(input.place) ? input.place : 0));
  const promotion = Math.max(0, Math.round(Number.isFinite(input.promotion) ? input.promotion : 0));
  const total = place + promotion;
  if (total <= 0) return null;
  return {
    opId: spireWeekRewardOpId(input.weekId, input.lang),
    delta: Math.min(STAR_OP_MAX_ABS_DELTA, total),
    reason: 'spire_week_reward',
    sourceKind: 'spire_week',
    sourceId: `${input.lang}_${input.weekId}`,
    ruleVersion: SPIRE_COINS_RULE_VERSION,
    earnedAtMs: input.weekEndMs,
    meta: { lang: input.lang, weekId: input.weekId, place, promotion, liveRank: input.liveRank },
  };
}
