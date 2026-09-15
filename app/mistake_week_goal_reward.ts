import { registerXP } from './xp_manager';
import { resetEnergyToMax } from './energy_system';
import { awardPracticeRune, createPracticeRuneEarnings } from './practice_rune_earnings';
import { settlePracticeRuneEarningsToServer } from './practice_rune_settlement';
import { MISTAKE_WEEK_CHEST_RUNES } from '../modules/mistake-practice/rewards_model';

/**
 * Награда за закрытую цель недели раздела ошибок: руны, опыт и полная энергия.
 *
 * зачем (владелец 2026-09-14): «как сундук друзей». Рисунок взят оттуда
 * (friends_together/chest_reward_apply.ts) вместе с его главным уроком (аудит
 * 2026-08-26, класс «награду показали, но не начислили»).
 *
 * Про руны отдельно. Своей выдачи рун мимо общего механизма здесь НЕТ: руны
 * идут штатным путём `settlePracticeRuneEarningsToServer`, где активность
 * `mistake_practice` уже разрешена, а идемпотентность обеспечивает сам
 * operationId, собранный из (активность, sessionKey, completionOrdinal).
 * sessionKey — ключ недели, поэтому за одну неделю сундук выдаётся ровно один
 * раз даже после переустановки: расписку сторожит сервер, а не флажок на диске.
 */

/** Опыт за закрытую цель недели — пачкой, как у сундука друзей. */
export const MISTAKE_WEEK_GOAL_XP = 40;

export type MistakeWeekGoalRewardResult = Readonly<{
  granted: boolean;
  runes: number;
  xp: number;
  energyRefilled: boolean;
  reason: 'granted' | 'in_flight' | 'failed';
}>;

const NOTHING = (reason: MistakeWeekGoalRewardResult['reason']): MistakeWeekGoalRewardResult =>
  Object.freeze({ granted: false, runes: 0, xp: 0, energyRefilled: false, reason });

const inFlight = new Set<string>();

/** Ключ «сессии» для расписки рун: одна неделя — одна расписка. */
export function mistakeWeekGoalSessionKey(weekKey: string): string {
  return `mistake-week-goal-${weekKey}`;
}

type Deps = Readonly<{
  settleRunes?: typeof settlePracticeRuneEarningsToServer;
  refillEnergy?: () => Promise<unknown>;
  awardXp?: typeof registerXP;
}>;

/**
 * Выдаёт награду за цель недели. Возвращает, что реально начислено — экран
 * рисует именно это, а не обещание.
 *
 * Optimistic UI: вызывать после показа финала; экран уже нарисовал цифры из
 * локального снимка, а эта функция догоняет фоном.
 */
export async function grantMistakeWeekGoalReward(
  input: Readonly<{ weekKey: string; runes?: number; lang?: string }>,
  deps: Deps = {},
): Promise<MistakeWeekGoalRewardResult> {
  const weekKey = input.weekKey.trim();
  const runes = input.runes ?? MISTAKE_WEEK_CHEST_RUNES;
  if (!weekKey) {
    console.warn('[MISTAKES-REWARD] week:skip empty-week-key');
    return NOTHING('failed');
  }
  if (inFlight.has(weekKey)) {
    console.log('[MISTAKES-REWARD] week:in-flight', JSON.stringify({ weekKey }));
    return NOTHING('in_flight');
  }
  inFlight.add(weekKey);
  const startedAt = Date.now();
  try {
    const sessionKey = mistakeWeekGoalSessionKey(weekKey);
    // Копилка строится ШТАТНЫМ конструктором: цена элемента остаётся правилом
    // механизма (3 руны за первое прохождение), а нужную сумму набираем числом
    // элементов приза. Подделывать awardPerItem нельзя — это цена в экономике,
    // а не свободное поле.
    let earnings = createPracticeRuneEarnings({
      activity: 'mistake_practice',
      sessionKey,
      firstCompletion: true,
    });
    const items = Math.max(1, Math.round(runes / earnings.awardPerItem));
    for (let index = 0; index < items; index += 1) {
      earnings = awardPracticeRune(earnings, `week-goal:${weekKey}:${index}`).earnings;
    }

    const settle = deps.settleRunes ?? settlePracticeRuneEarningsToServer;
    const settlement = await settle(earnings, 1);
    const runesGranted = settlement.locallyCommitted ? earnings.pendingRunes : 0;

    const awardXp = deps.awardXp ?? registerXP;
    const xpResult = await awardXp(
      MISTAKE_WEEK_GOAL_XP,
      'mistake_practice_answer',
      '',
      'ru',
      undefined,
      {
        // Тот же ключ недели — опыт тоже не задваивается.
        eventId: `mistake-week-goal-xp:v1:${weekKey}`,
        payload: { weekKey, kind: 'week_goal' },
      },
    );

    const refillEnergy = deps.refillEnergy ?? resetEnergyToMax;
    await refillEnergy();

    console.log('[MISTAKES-REWARD] week:granted', JSON.stringify({
      weekKey,
      runes: runesGranted,
      settled: settlement.settled,
      locallyCommitted: settlement.locallyCommitted,
      xp: xpResult.finalDelta,
      ms: Date.now() - startedAt,
    }));
    return Object.freeze({
      granted: runesGranted > 0 || xpResult.finalDelta > 0,
      runes: runesGranted,
      xp: xpResult.finalDelta,
      energyRefilled: true,
      reason: 'granted',
    });
  } catch (error: unknown) {
    // guard-ok: лог в catch обязателен — иначе пропавшая награда выглядит нормой
    console.warn('[MISTAKES-REWARD] week:catch — повторим при следующем заходе', JSON.stringify({
      weekKey,
      ms: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    }));
    return NOTHING('failed');
  } finally {
    inFlight.delete(weekKey);
  }
}

/** Только для тестов: снять замок параллельных выдач. */
export function __resetMistakeWeekGoalRewardForTests(): void {
  inFlight.clear();
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
