import { premiumThemeByCondition, type PremiumThemeUnlockCondition } from './premium_theme_catalog';

/**
 * Реакция на уже состоявшийся локальный факт прогресса. Она не выдаёт право:
 * callable заново проверяет тот же факт по серверным данным. Локальное число
 * используется только для раннего старта загрузки публичного, проверяемого pack.
 */
export function notePremiumThemeProgress(condition: PremiumThemeUnlockCondition, value: number): void {
  if (!Number.isFinite(value)) return;
  const entry = premiumThemeByCondition(condition);
  if (entry.prefetchAt !== null && value >= entry.prefetchAt) {
    void import('./premium_theme_pack_cache').then(({ ensurePremiumThemePack }) => (
      ensurePremiumThemePack(entry.id, value >= (entry.unlockAt ?? Infinity) ? 'unlock' : 'near_unlock')
    ));
  }
  if (entry.unlockAt !== null && value >= entry.unlockAt) {
    void import('./premium_theme_entitlements').then(({ claimPremiumThemeCondition }) => (
      claimPremiumThemeCondition(condition)
    ));
  }
}
