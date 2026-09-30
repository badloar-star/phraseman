import { getDialogueV2LocalRankAccess } from '../app/dialogue_v2_local_rank_access';

describe('dialogue v2 local rank catalogue access', () => {
  test('derives each canonical entry state only from its required rank and the local player rank', () => {
    expect(getDialogueV2LocalRankAccess('social_01', 1)).toEqual({
      entry: expect.objectContaining({ id: 'social_01', rankRequired: 1 }),
      access: { status: 'unlocked' },
    });
    expect(getDialogueV2LocalRankAccess('social_02', 1)).toEqual({
      entry: expect.objectContaining({ id: 'social_02', rankRequired: 2 }),
      access: { status: 'locked_by_rank', rankRequired: 2 },
    });
  });

  test('keeps the first dialogue locked for the valid starting rank zero', () => {
    expect(getDialogueV2LocalRankAccess('work_01', 0)).toEqual({
      entry: expect.objectContaining({ id: 'work_01', rankRequired: 1 }),
      access: { status: 'locked_by_rank', rankRequired: 1 },
    });
  });

  test.each([null, undefined, -1, 20, 1.5, Number.NaN, '19', {}])(
    'fails closed for corrupt local rank %p',
    (rank) => {
      expect(getDialogueV2LocalRankAccess('travel_19', rank)).toEqual({
        entry: expect.objectContaining({ id: 'travel_19', rankRequired: 19 }),
        access: { status: 'locked_by_rank', rankRequired: 19 },
      });
    },
  );

  test('returns null for an ID outside the canonical catalogue', () => {
    expect(getDialogueV2LocalRankAccess('legacy_cafe_01', 19)).toBeNull();
  });
});
