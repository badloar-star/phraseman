import { buildAuthoritativePublicProfileProjection } from './public_profile_projection';
import { buildFriendProfile } from './friends_profiles';

describe('public coin-rank projection', () => {
  it.each([0, 7, 19])('publishes only a valid integer rank: %s', (coinRank) => {
    const projected = buildAuthoritativePublicProfileProjection(
      'stable-a',
      {},
      { name: 'Learner', coinRank },
      10_000,
    );

    expect(projected.coinRank).toBe(coinRank);
  });

  it.each([-1, 20, 7.5, '7', Number.NaN, Number.POSITIVE_INFINITY])(
    'omits an invalid rank instead of coercing or clamping it: %s',
    (coinRank) => {
      const projected = buildAuthoritativePublicProfileProjection(
        'stable-a',
        {},
        { name: 'Learner', coinRank },
        10_000,
      );

      expect(projected).not.toHaveProperty('coinRank');
    },
  );
});

describe('friend profile coin-rank visibility', () => {
  const publicProfile = {
    name: 'Public Learner',
    avatar: 'avatar-public',
    frame: 'frame-public',
    aura: 'aura-public',
    profileCardLevel: 2,
    coinRank: 8,
  };

  it('sources public presentation and rank from public_profiles', () => {
    const profile = buildFriendProfile(
      'stable-friend',
      { name: 'Legacy name', avatar: 'legacy-avatar', coinRank: 17 },
      { progress: {} },
      publicProfile,
    );

    expect(profile).toMatchObject({
      uid: 'stable-friend',
      displayName: 'Public Learner',
      avatar: 'avatar-public',
      frame: 'frame-public',
      aura: 'aura-public',
      profileCardLevel: 2,
      coinRank: 8,
    });
  });

  it.each([-1, 20, 8.5, '8'])('returns a neutral rank for invalid public data: %s', (coinRank) => {
    const profile = buildFriendProfile(
      'stable-friend',
      undefined,
      { progress: {} },
      { ...publicProfile, coinRank },
    );

    expect(profile?.coinRank).toBeNull();
  });

  it('does not expose a hidden identity', () => {
    expect(buildFriendProfile(
      'stable-friend',
      undefined,
      { identityHidden: true, progress: {} },
      publicProfile,
    )).toBeNull();
  });

  it('does not expose an identity with an account-deletion marker', () => {
    expect(buildFriendProfile(
      'stable-friend',
      undefined,
      { progress: {} },
      publicProfile,
      true,
    )).toBeNull();
  });
});
