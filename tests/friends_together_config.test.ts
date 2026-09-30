import { friendsTogetherClientConfigFromNumbers } from '../app/friends_together/together_config';

describe('friendsTogetherClientConfigFromNumbers', () => {
  it('hydrates the same remote numeric handles used by the server', () => {
    const config = friendsTogetherClientConfigFromNumbers({
      friends_level_thresholds: [0, 4, 12, 40, 120],
    });

    expect(config).toMatchObject({
      levelThresholds: [0, 4, 12, 40, 120],
    });
  });

  it('rejects malformed or descending arrays and keeps safe defaults', () => {
    const config = friendsTogetherClientConfigFromNumbers({
      friends_level_thresholds: [0, 10, 3, 30, 100],
    });
    expect(config.levelThresholds).toEqual([0, 3, 10, 30, 100]);
  });
});
