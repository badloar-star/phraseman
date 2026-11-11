import { decideDialogueV2ScenarioAccess } from '../shared/dialogue_v2_access_contract';

describe('dialogue v2 scenario access', () => {
  test('opens a scenario only when its sequential world rank is reached', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 4, rankRequired: 4 }))
      .toEqual({ status: 'unlocked' });
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 4, rankRequired: 5 }))
      .toEqual({ status: 'locked_by_rank', rankRequired: 5 });
  });

  // зачем (владелец 2026-11-11, D204): экран покупки обещает «Сценарии: все сразу» — Plus открывает сценарий без ранга.
  test('Plus opens a scenario the coin rank has not reached yet', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 1, rankRequired: 19, hasPremiumAccess: true }))
      .toEqual({ status: 'unlocked' });
    expect(decideDialogueV2ScenarioAccess({ achievedRank: null, rankRequired: 19, hasPremiumAccess: true }))
      .toEqual({ status: 'unlocked' });
  });

  test('a rune purchase alone is still not an unlock path', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 1, rankRequired: 19, ownsScenario: true }))
      .toEqual({ status: 'locked_by_rank', rankRequired: 19 });
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 1, rankRequired: 19, hasPremiumAccess: false, ownsScenario: true }))
      .toEqual({ status: 'locked_by_rank', rankRequired: 19 });
  });

  test('Plus does not open a row whose catalogue rank is malformed, and a non-boolean flag opens nothing', () => {
    expect(decideDialogueV2ScenarioAccess({ achievedRank: 5, rankRequired: 20, hasPremiumAccess: true }))
      .toEqual({ status: 'locked_by_rank', rankRequired: null });
    expect(decideDialogueV2ScenarioAccess({
      achievedRank: 1, rankRequired: 19, hasPremiumAccess: 'yes' as unknown as boolean,
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
