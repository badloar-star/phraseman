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

});
