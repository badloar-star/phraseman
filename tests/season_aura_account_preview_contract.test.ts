import fs from 'fs';
import path from 'path';
import {
  SEASON_AVATAR_AURA_IDS,
  getAvatarAuraById,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('season aura account preview', () => {
  it('registers every season aura in the canonical user_aura catalog', () => {
    expect(SEASON_AVATAR_AURA_IDS).toEqual([
      'aura-season-1-stage-1',
      'aura-season-1-stage-2',
      'aura-season-1-stage-3',
      'aura-season-1-stage-4',
      'aura-season-1-secret',
    ]);

    for (const id of SEASON_AVATAR_AURA_IDS) {
      expect(getAvatarAuraById(id)).toMatchObject({ id, rewardOnly: true });
      expect(normalizeAvatarAuraId(id)).toBe(id);
    }
  });

  it('renders season art around the real AvatarView at avatar-relative size', () => {
    const aura = read('components/AvatarAura.tsx');

    expect(aura).toContain('getSeasonAuraAssetForAvatarId');
    expect(aura).toContain('const SEASON_AURA_RING_SCALE = 1.40;');
    expect(aura).toContain('Math.round(size * SEASON_AURA_RING_SCALE)');
    expect(aura).toContain('const SEASON_AURA_LAYOUT_GUTTER = 12;');
    expect(aura).toContain('<SeasonAuraRing');
    expect(aura).not.toMatch(/\b(?:220|240|280)\b/);
  });

  it('applies a selected aura to the account from the existing cosmetics section and opens the real profile card', () => {
    const admin = read('app/_admin_settings_testers.tsx');

    expect(admin).toContain('id="cosmetics_preview"');
    expect(admin).toContain('applyAuraToCurrentAccount');
    expect(admin).toContain('AsyncStorage.setItem(USER_AVATAR_AURA_KEY, auraId)');
    expect(admin).toContain("syncPublicProfileSnapshot({ reason: 'display_change', aura: auraId })");
    expect(admin).toContain('await openCurrentAccountProfilePreview(false)');
    expect(admin).toContain('testID={`admin-apply-aura-${aura.id}`}');
    expect(admin).toContain('<AvatarView');
  });

  it('removes the oversized standalone Season Pass Lab route and menu row', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/_admin_season_pass_lab.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'app/admin_season_pass_lab.tsx'))).toBe(false);
    expect(read('constants/devRoutes.ts')).not.toContain('ADMIN_SEASON_PASS_LAB');
    expect(read('components/admin_panel/sections/LabsSection.tsx')).not.toContain('admin-lab-season-pass');
  });
});
