import fs from 'fs';
import path from 'path';
import {
  resolveProfileCardDisplayLevel,
  resolveSeasonProfileFrameVisible,
  SEASON1_FRAME_ID,
  seasonAuraIdForStage,
} from '../app/season_cosmetics_model';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Season profile-card frame integration', () => {
  const frameComponent = read('components/SeasonProfileCardFrame.tsx');
  const profileModal = read('components/PlayerProfileModal.tsx');
  const cosmetics = read('app/season_cosmetics.ts');
  const seasonConfig = read('app/season_pass_track_config.ts');
  const publicProfileSnapshot = read('app/public_profile_snapshot.ts');

  it('draws an adaptive frame around the whole profile-card sheet', () => {
    expect(frameComponent).toContain('SEASON_PROFILE_CARD_FRAME_COLORS');
    expect(frameComponent).toContain('testID="season-profile-card-frame"');
    expect(frameComponent).toContain('StyleSheet.absoluteFillObject');
    expect(frameComponent).toContain('pointerEvents="none"');

    expect(profileModal).toContain('peekSeasonCosmetics');
    expect(profileModal).toContain("onAppEvent('season_cosmetics_changed'");
    expect(profileModal).toContain('SEASON1_FRAME_ID');
    expect(profileModal).toContain('<SeasonProfileCardFrame');
    expect(profileModal).toContain(".collection('public_profiles')");
    expect(profileModal).toContain('seasonProfileFrameId');
    expect(profileModal).not.toContain("require('../assets/images/season/rewards/light/frame.webp')");
    expect(publicProfileSnapshot).toContain('seasonProfileFrameId');
    expect(publicProfileSnapshot).toContain('loadSeasonCosmetics');
  });

  it('keeps DEV level/frame overrides stable without mutating earned ownership', () => {
    expect(resolveProfileCardDisplayLevel({ realLevel: 1, inCardPreviewLevel: null, devOverride: 5 })).toBe(5);
    // Simulates the async purchased snapshot replacing level 1 with level 3.
    expect(resolveProfileCardDisplayLevel({ realLevel: 3, inCardPreviewLevel: null, devOverride: 5 })).toBe(5);
    expect(resolveSeasonProfileFrameVisible({
      isMe: true,
      ownedFrameIds: [SEASON1_FRAME_ID],
      devOverride: false,
    })).toBe(false);
    expect(resolveSeasonProfileFrameVisible({
      isMe: true,
      ownedFrameIds: [SEASON1_FRAME_ID],
    })).toBe(true);
    expect(resolveSeasonProfileFrameVisible({
      isMe: false,
      ownedFrameIds: [],
      publicFrameId: SEASON1_FRAME_ID,
    })).toBe(true);
  });

  it('maps earned aura stages to canonical wearable IDs', () => {
    expect([1, 2, 3, 4].map(seasonAuraIdForStage)).toEqual([
      'aura-season-1-stage-1',
      'aura-season-1-stage-2',
      'aura-season-1-stage-3',
      'aura-season-1-stage-4',
    ]);
    expect(cosmetics).toContain('[AVATAR_AURA_OWNED_KEY, JSON.stringify({ ...owned, [options.activateAuraId]: true })]');
    expect(cosmetics).toContain('[USER_AVATAR_AURA_KEY, options.activateAuraId]');
    expect(cosmetics).toContain('withAccountTransitionLock');
    expect(cosmetics).toContain('withStorageLock');
    expect(cosmetics).toContain('await AsyncStorage.multiSet(pairs)');
  });

  it('keeps the reward icon and every aura layer statically wired', () => {
    for (const theme of ['light', 'dark']) {
      expect(seasonConfig).toContain(`season/rewards/${theme}/frame.webp`);
      for (const variant of ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'secret']) {
        for (const layer of ['base', 'flow', 'particles']) {
          expect(seasonConfig).toContain(`season/auras/${theme}/${variant}-${layer}.webp`);
        }
      }
    }
    expect(seasonConfig).toContain('getSeasonAuraAssetForAvatarId');
  });
});
