import fs from 'fs';
import path from 'path';
import {
  AVATAR_AURAS,
  getAvatarAuraById,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';
import { buildCustomizationSnapshot } from '../app/customization_snapshot';

const RETAINED_AURA_IDS = [
  'aura-plus',
  'aura-pro',
  'aura-aurora',
  'aura-ember',
  'aura-mint',
  'aura-violet',
  'aura-coral',
  'aura-prism',
  'aura-lagoon',
  'aura-sunset',
  'aura-nimbus',
  'aura-season-1-stage-1',
  'aura-season-1-stage-2',
  'aura-season-1-stage-3',
  'aura-season-1-stage-4',
  'aura-season-1-secret',
] as const;

const REMOVED_AURA_IDS = [
  'aura-flame-51',
  'aura-arena-starvortex',
  'aura-arena-voidamethyst',
  'aura-season',
  'aura-season-champion',
] as const;

describe('avatar aura catalog rework', () => {
  it('keeps the active shop, Nimbus, and five Season 1 reward auras in one catalog', () => {
    expect(AVATAR_AURAS.map((aura) => aura.id)).toEqual(RETAINED_AURA_IDS);
    expect(AVATAR_AURAS.some((aura) => aura.unlockLevel !== undefined)).toBe(false);
  });

  it('gives the three new multicolour products distinct restrained palettes', () => {
    const ids = ['aura-prism', 'aura-lagoon', 'aura-sunset'];
    const palettes = ids.map((id) => {
      const aura = getAvatarAuraById(id)!;
      return [aura.color, aura.color2, aura.color3];
    });

    expect(palettes.every((palette) => palette.every(Boolean))).toBe(true);
    expect(new Set(palettes.map((palette) => palette.join('|'))).size).toBe(ids.length);
  });

  it.each(['aura-mint', 'aura-coral'])('restores %s as an ordinary purchasable aura', (id) => {
    expect(getAvatarAuraById(id)).toMatchObject({ id });
    expect(getAvatarAuraById(id)?.rewardOnly).not.toBe(true);
    expect(normalizeAvatarAuraId(id)).toBe(id);
  });

  it.each(REMOVED_AURA_IDS)('removes retired aura %s from selection', (id) => {
    expect(getAvatarAuraById(id)).toBeUndefined();
    expect(normalizeAvatarAuraId(id)).toBeUndefined();
  });

  it('preserves legacy ownership records without exposing removed auras', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['avatar_aura_owned_v1', JSON.stringify({
        'aura-aurora': true,
        'aura-flame-51': true,
      })],
    ]), 1, 51);

    expect(snapshot.ownedAuras).toEqual({
      'aura-aurora': true,
      'aura-flame-51': true,
    });
    expect(AVATAR_AURAS.some((aura) => aura.id === 'aura-flame-51')).toBe(false);
  });
});

describe('AvatarAura compact renderer contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/AvatarAura.tsx'), 'utf8');

  it('uses one compact Nimbus-like breathing and rotating halo for every retained aura', () => {
    expect(source).toContain('const outer = size + 8;');
    expect(source).toContain("outputRange: ['0deg', '360deg']");
    expect(source).toContain('outputRange: [0.98, 1.04, 0.98]');
    expect(source).toContain('duration: 7200');
    expect(source.match(/<Animated\.View/g)).toHaveLength(1);
  });

  it('renders Pro satin texture inside that same single halo layer', () => {
    expect(source).toContain("aura.material === 'satin'");
    expect(source).toContain('satinColors');
    expect(source).toContain('satinLocations');
    expect(source.match(/<Animated\.View/g)).toHaveLength(1);
  });

  it('contains no decorative SVG, symbols, particles, or extra aura rings', () => {
    expect(source).not.toContain('react-native-svg');
    expect(source).not.toMatch(/<(Svg|Circle|Polygon|Polyline)\b/);
    expect(source).not.toMatch(/spark|orb|orbit|bolt|glint/i);
    expect(source.match(/borderWidth:/g)).toHaveLength(1);
  });

  it('keeps infinite animation gated by focus, AppState, and the animate prop', () => {
    expect(source).toContain('const reduceMotion = useReduceMotion();');
    expect(source).toContain('const runtimeActive = isFocused && (ownerActive ?? true);');
    expect(source).toContain('animate && runtimeActive && !reduceMotion');
    expect(source).toContain("AppState.currentState === 'active'");
    expect(source).toContain("AppState.addEventListener('change'");
  });
});
