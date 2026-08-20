import type { ArenaMatchReward } from './contract';

export type ArenaQuickXpModifier = Readonly<{
  kind: 'correct' | 'outcome';
  xpDelta: number;
}>;

export type ArenaQuickXpPresentation = Readonly<{
  baseXp: number;
  modifiers: readonly ArenaQuickXpModifier[];
  totalXp: number;
}>;

function safeXp(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * Только проверяет серверную расписку. Любое несовпадение скрывает pills и
 * показывает уже начисленный `xpEarned` одной суммой — клиент не пересчитывает
 * опыт из счёта, исхода или ответов.
 */
export function arenaQuickXpPresentation(
  reward: ArenaMatchReward | undefined,
): ArenaQuickXpPresentation {
  const authoritativeXp = safeXp(reward?.xpEarned) ?? 0;
  const breakdown = reward?.xpBreakdown;
  const baseXp = safeXp(breakdown?.baseXp);
  const correctBonusXp = safeXp(breakdown?.correctBonusXp);
  const outcomeBonusXp = safeXp(breakdown?.outcomeBonusXp);
  const totalXp = safeXp(breakdown?.totalXp);
  const exact = breakdown?.schemaVersion === 'arena-xp-breakdown.v1'
    && baseXp !== null
    && correctBonusXp !== null
    && outcomeBonusXp !== null
    && totalXp === authoritativeXp
    && baseXp + correctBonusXp + outcomeBonusXp === totalXp;
  if (!exact || baseXp === null || correctBonusXp === null || outcomeBonusXp === null) {
    return { baseXp: authoritativeXp, modifiers: [], totalXp: authoritativeXp };
  }
  return {
    baseXp,
    modifiers: [
      ...(correctBonusXp > 0 ? [{ kind: 'correct' as const, xpDelta: correctBonusXp }] : []),
      ...(outcomeBonusXp > 0 ? [{ kind: 'outcome' as const, xpDelta: outcomeBonusXp }] : []),
    ],
    totalXp: authoritativeXp,
  };
}
