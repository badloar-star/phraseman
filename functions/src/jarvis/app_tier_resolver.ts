import type { AppTier } from './app_tier';
import { classifyAppTier } from './app_tier';
import type { FetchActiveUserCountResult } from './app_tier_reader';

/**
 * Единая точка вычисления тира для одного прохода панели/планировщика —
 * считается один раз и передаётся во все департаменты (Firebase-экономия:
 * без этого шва каждый департамент дёргал бы .count() отдельно).
 * Отказ источника не должен изобретать масштаб — fail-closed к 'seed',
 * самому строгому порогу.
 */
export async function resolveAppTier(
  fetchActiveUserCount: () => Promise<FetchActiveUserCountResult>,
): Promise<AppTier> {
  try {
    const result = await fetchActiveUserCount();
    if (result.state === 'error' || result.count === null) return 'seed';
    return classifyAppTier(result.count);
  } catch {
    return 'seed';
  }
}
