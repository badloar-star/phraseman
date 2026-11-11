import { premiumThemeByCondition, type PremiumThemeUnlockCondition } from './premium_theme_catalog';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

/**
 * Реакция на уже состоявшийся локальный факт прогресса. Она не выдаёт право:
 * callable заново проверяет тот же факт по серверным данным. Локальное число
 * используется только для раннего старта загрузки публичного, проверяемого pack.
 */
export function notePremiumThemeProgress(
  condition: PremiumThemeUnlockCondition,
  value: number,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): void {
  if (!Number.isFinite(value)) return;
  const accountOwner = accountToken.stableId?.trim() || null;
  const accountIsCurrent = (): boolean => Boolean(
    accountOwner && isCurrentAccountGeneration(accountToken, accountOwner),
  );
  if (!accountIsCurrent()) return;
  const entry = premiumThemeByCondition(condition);
  if (entry.prefetchAt !== null && value >= entry.prefetchAt) {
    void import('./premium_theme_pack_cache').then(({ ensurePremiumThemePack }) => {
      if (!accountIsCurrent()) return undefined;
      return ensurePremiumThemePack(entry.id, value >= (entry.unlockAt ?? Infinity) ? 'unlock' : 'near_unlock');
    });
  }
  if (entry.unlockAt !== null && value >= entry.unlockAt) {
    void import('./premium_theme_entitlements').then(({ claimPremiumThemeCondition }) => {
      if (!accountIsCurrent()) return undefined;
      return claimPremiumThemeCondition(condition, accountToken);
    });
  }
}
