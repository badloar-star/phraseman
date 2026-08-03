import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Season profile-card frame integration', () => {
  const frameComponent = read('components/SeasonProfileCardFrame.tsx');
  const profileModal = read('components/PlayerProfileModal.tsx');
  const admin = read('app/_admin_settings_testers.tsx');
  const cosmetics = read('app/season_cosmetics.ts');
  const seasonConfig = read('app/season_pass_track_config.ts');

  it('draws an adaptive frame around the whole profile-card sheet', () => {
    expect(frameComponent).toContain('SEASON_PROFILE_CARD_FRAME_COLORS');
    expect(frameComponent).toContain('testID="season-profile-card-frame"');
    expect(frameComponent).toContain('StyleSheet.absoluteFillObject');
    expect(frameComponent).toContain('pointerEvents="none"');

    expect(profileModal).toContain('peekSeasonCosmetics');
    expect(profileModal).toContain("onAppEvent('season_cosmetics_changed'");
    expect(profileModal).toContain('SEASON1_FRAME_ID');
    expect(profileModal).toContain('<SeasonProfileCardFrame');
    expect(profileModal).not.toContain("require('../assets/images/season/rewards/light/frame.webp')");
  });

  it('lets DEV preview the real framed card at every profile-card level', () => {
    expect(cosmetics).toContain('devSetSeasonFrameEnabled');
    expect(admin).toContain('const SEASON_FRAME_PREVIEW_LEVELS: readonly ProfileCardLevel[] = [0, 1, 2, 3, 4, 5]');
    expect(admin).toContain('testID={`admin-preview-season-frame-level-${level}`}');
    expect(admin).toContain('openCurrentAccountProfilePreview(false, level)');
    expect(admin).toContain('admin-preview-season-frame-disabled');
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
