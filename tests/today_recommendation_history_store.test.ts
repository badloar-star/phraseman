jest.mock('@react-native-async-storage/async-storage');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, __resetAccountGenerationForTests } from '../app/account_generation';
import {
  getTodayRecommendationHistory,
  hydrateTodayRecommendationHistory,
  recordTodayRecommendationShown,
  __resetTodayRecommendationHistoryForTests,
} from '../lib/today/recommendation_history_store';
import { resetTodayRuntimeMemory } from '../lib/today/runtime_reset';

describe('Today recommendation history store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    __resetTodayRecommendationHistoryForTests();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  test('records locale-specific impressions and persists them for the active account', async () => {
    const token = beginAccountGeneration('user-a');
    await hydrateTodayRecommendationHistory(token);
    await recordTodayRecommendationShown({ scopeKey: 'scope-a', recommendation: { ruleId: 'rule', variantId: 'rule.a', destinationId: 'practice', label: 'Практика', accessibilityLabel: 'Практика' }, locale: 'ru', nowMs: 1000, token });
    expect(getTodayRecommendationHistory('scope-a')).toEqual({ rule: { lastShownAt: 1000, variants: { 'rule.a': { ru: 1000 } } } });
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  test('rejects late writes from a stale account generation', async () => {
    const stale = beginAccountGeneration('user-a');
    beginAccountGeneration('user-b');
    await recordTodayRecommendationShown({ scopeKey: 'scope-a', recommendation: { ruleId: 'rule', variantId: 'rule.a', destinationId: 'practice', label: 'Practice', accessibilityLabel: 'Practice' }, locale: 'ru', nowMs: 1000, token: stale });
    expect(getTodayRecommendationHistory('scope-a')).toEqual({});
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('merges a concurrent local impression with delayed disk hydration', async () => {
    const now = Date.now();
    let resolveRead!: (value: string) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(new Promise<string>((resolve) => { resolveRead = resolve; }));
    const token = beginAccountGeneration('user-a');
    const hydration = hydrateTodayRecommendationHistory(token);
    await recordTodayRecommendationShown({ scopeKey: 'scope-a', recommendation: { ruleId: 'live', variantId: 'live.a', destinationId: 'practice', label: 'Live', accessibilityLabel: 'Live' }, locale: 'ru', nowMs: now, token });
    resolveRead(JSON.stringify({ version: 1, scopes: { 'scope-a': { disk: { lastShownAt: now - 500, variants: { 'disk.a': { ru: now - 500 } } } } } }));
    await hydration;
    expect(getTodayRecommendationHistory('scope-a')).toMatchObject({
      live: { lastShownAt: now },
      disk: { lastShownAt: now - 500 },
    });
  });

  test('clears loaded account memory when the account boundary resets', async () => {
    const token = beginAccountGeneration('user-a');
    await recordTodayRecommendationShown({ scopeKey: 'scope-a', recommendation: { ruleId: 'rule', variantId: 'rule.a', destinationId: 'practice', label: 'Practice', accessibilityLabel: 'Practice' }, locale: 'ru', nowMs: 1000, token });
    resetTodayRuntimeMemory();
    expect(getTodayRecommendationHistory('scope-a')).toEqual({});
  });
});
