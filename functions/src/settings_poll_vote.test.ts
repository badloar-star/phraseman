import { HttpsError } from 'firebase-functions/v2/https';
import { normalizeSettingsPollVoteInput, validateSettingsPollCampaign } from './settings_poll_vote';

describe('settings fixed poll vote', () => {
  test('accepts bounded identifiers and an active settings poll option', () => {
    const input = normalizeSettingsPollVoteInput({ messageId: 'poll_123', optionId: 'option_2', requestId: 'vote-1', stableId: 'stable-user_1' });
    expect(input).toEqual({ messageId: 'poll_123', optionId: 'option_2', requestId: 'vote-1', stableId: 'stable-user_1' });
    expect(() => validateSettingsPollCampaign({
      active: true,
      deliverySurface: 'settings',
      settingsSlot: 'top',
      kind: 'poll',
      voteMode: 'fixed',
      poll: { optionIds: ['option_1', 'option_2'] },
    }, input.optionId, Date.now())).not.toThrow();
  });

  test('rejects invalid ids, inactive campaigns and foreign options', () => {
    expect(() => normalizeSettingsPollVoteInput({ messageId: '../bad', optionId: 'x', requestId: 'vote-1' })).toThrow(HttpsError);
    const campaign = {
      active: true, deliverySurface: 'settings', settingsSlot: 'bottom', kind: 'poll', voteMode: 'fixed',
      poll: { optionIds: ['option_1'] },
    };
    expect(() => validateSettingsPollCampaign(campaign, 'option_2', Date.now())).toThrow('settings_poll_option_invalid');
    expect(() => validateSettingsPollCampaign({ ...campaign, active: false }, 'option_1', Date.now())).toThrow('settings_poll_inactive');
  });
});
