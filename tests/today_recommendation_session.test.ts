import {
  beginTodayRecommendationSession,
  clearTodayRecommendationSessions,
  endTodayRecommendationSession,
  getPinnedTodayRecommendation,
} from '../lib/today/recommendation_session';
import { resetTodayRuntimeMemory } from '../lib/today/runtime_reset';

const recommendation = { ruleId: 'rule', variantId: 'rule.a', destinationId: 'practice' as const, label: 'Practice', accessibilityLabel: 'Practice' };

describe('Today recommendation session pin', () => {
  beforeEach(clearTodayRecommendationSessions);

  test('pins a warm recommendation only after a real owner epoch begins', () => {
    const scope = { scopeKey: 'account|en|ru|day|zone' };
    expect(getPinnedTodayRecommendation(scope, null)).toBeNull();
    beginTodayRecommendationSession({ scope, epoch: 3, warmSnapshotRecommendation: recommendation });
    expect(getPinnedTodayRecommendation(scope, 3)).toMatchObject({ ruleId: 'rule', variantId: 'rule.a' });
  });

  test('isolates exact scope and epoch and keeps at most two pins', () => {
    for (let epoch = 1; epoch <= 3; epoch += 1) beginTodayRecommendationSession({ scope: { scopeKey: `scope-${epoch}` }, epoch, warmSnapshotRecommendation: recommendation });
    expect(getPinnedTodayRecommendation({ scopeKey: 'scope-1' }, 1)).toBeNull();
    expect(getPinnedTodayRecommendation({ scopeKey: 'scope-3' }, 3)).not.toBeNull();
    endTodayRecommendationSession({ scopeKey: 'scope-3' }, 2);
    expect(getPinnedTodayRecommendation({ scopeKey: 'scope-3' }, 3)).not.toBeNull();
    endTodayRecommendationSession({ scopeKey: 'scope-3' }, 3);
    expect(getPinnedTodayRecommendation({ scopeKey: 'scope-3' }, 3)).toBeNull();
  });

  test('drops all pins at the account runtime boundary', () => {
    const scope = { scopeKey: 'scope-a' };
    beginTodayRecommendationSession({ scope, epoch: 1, warmSnapshotRecommendation: recommendation });
    resetTodayRuntimeMemory();
    expect(getPinnedTodayRecommendation(scope, 1)).toBeNull();
  });
});
