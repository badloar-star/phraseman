import { decideDialogueV2ScenarioAccess } from '../shared/dialogue_v2_access_contract';

describe('dialogue v2 scenario access', () => {
  test('opens a scenario only when its sequential world rank is reached', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 4, rankRequired: 4 }))
      .toEqual({ status: 'unlocked' });
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 4, rankRequired: 5 }))
      .toEqual({ status: 'locked_by_rank', rankRequired: 5 });
  });

  test('does not make a purchase or subscription an alternative unlock path', () => {
    expect(decideDialogueV2ScenarioAccess({
      achievedRank: 1,
      rankRequired: 19,
      hasPremiumAccess: true,
      ownsScenario: true,
    })).toEqual({ status: 'locked_by_rank', rankRequired: 19 });
  });

  test('keeps the last scenario unlocked when the account rank exceeds the catalogue', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 20, rankRequired: 19 }))
      .toEqual({ status: 'unlocked' });
  });

  test('fails closed for malformed ranks', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 0, rankRequired: 1 }))
      .toEqual({ status: 'locked_by_rank', rankRequired: 1 });
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 99, rankRequired: 20 }))
      .toEqual({ status: 'locked_by_rank', rankRequired: null });
  });
});
