import fs from 'fs';
import path from 'path';
import {
  AVATAR_AURAS,
  getAvatarAuraById,
  getEffectiveAvatarAuraId,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';
import { buildAuraCatalog } from '../app/customization_catalog';
import { buildCustomizationSnapshot } from '../app/customization_snapshot';

const ACTIVE_AURA_IDS = [
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

const RETIRED_FROM_SHOP_AURA_IDS = [
  'aura-aurora',
  'aura-violet',
  'aura-coral',
  'aura-lagoon',
  'aura-sunset',
] as const;

const REMOVED_AURA_IDS = [
  'aura-flame-51',
  'aura-arena-starvortex',
  'aura-arena-voidamethyst',
  'aura-season',
  'aura-season-champion',
] as const;

describe('avatar aura catalog rework', () => {
  it('keeps active, retired-owned, Nimbus, and Season 1 auras renderable in one catalog', () => {
    expect(AVATAR_AURAS.map((aura) => aura.id)).toEqual(ACTIVE_AURA_IDS);
    expect(AVATAR_AURAS.some((aura) => aura.unlockLevel !== undefined)).toBe(false);
  });

  it('keeps the retained Prism multicolour palette complete', () => {
    const aura = getAvatarAuraById('aura-prism')!;
    expect([aura.color, aura.color2, aura.color3].every(Boolean)).toBe(true);
  });

  it.each(['aura-ember', 'aura-mint', 'aura-prism'])('keeps %s as an ordinary purchasable aura', (id) => {
    expect(getAvatarAuraById(id)).toMatchObject({ id });
    expect(getAvatarAuraById(id)?.rewardOnly).not.toBe(true);
    expect(normalizeAvatarAuraId(id)).toBe(id);
  });

  it.each(RETIRED_FROM_SHOP_AURA_IDS)('keeps retired aura %s only for an existing owner', (id) => {
    expect(getAvatarAuraById(id)).toMatchObject({ id, retiredFromShop: true });
    expect(normalizeAvatarAuraId(id)).toBe(id);
    expect(getEffectiveAvatarAuraId(id, false, false, false)).toBe(id);

    const input = {
      activeAvatar: '1',
      activeAuraId: null,
      level: 1,
      ownedAuras: {},
      isPremium: false,
      isVip: false,
      isPro: false,
    };
    expect(buildAuraCatalog(input).some((item) => item.id === id)).toBe(false);
    expect(buildAuraCatalog({ ...input, ownedAuras: { [id]: true } }).find((item) => item.id === id))
      .toMatchObject({ id, isOwned: true, availability: { kind: 'owned' } });
  });

  it.each(REMOVED_AURA_IDS)('removes obsolete aura %s from selection', (id) => {
    expect(getAvatarAuraById(id)).toBeUndefined();
    expect(normalizeAvatarAuraId(id)).toBeUndefined();
  });

  it('preserves retired ownership records and keeps truly removed auras hidden', () => {
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
    expect(AVATAR_AURAS.some((aura) => aura.id === 'aura-aurora')).toBe(true);
    expect(AVATAR_AURAS.some((aura) => aura.id === 'aura-flame-51')).toBe(false);
  });

  it('excludes retired auras from client-side reward grant paths', () => {
    const levelGiftSource = fs.readFileSync(path.join(__dirname, '../app/level_gift_system.ts'), 'utf8');
    const leagueChestSource = fs.readFileSync(path.join(__dirname, '../app/services/league_chest_rewards.ts'), 'utf8');
    expect(levelGiftSource.match(/!aura\.retiredFromShop/g)).toHaveLength(2);
    expect(leagueChestSource).toContain('!item.retiredFromShop');
  });

  it('refreshes server sale availability when customization regains focus', () => {
    const selectorSource = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');
    expect(selectorSource).toContain("import { hydrateCosmeticAssetCatalog } from './cosmetic_asset_archive';");
    expect(selectorSource).toContain('hydrateCosmeticAssetCatalog(true)');
    expect(selectorSource).toContain('REVALIDATE_TTL_MS');
  });
});

describe('AvatarAura compact renderer contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/AvatarAura.tsx'), 'utf8');

  it('uses compact independently animated soft-edge and rotating halo layers', () => {
    expect(source).toContain('const outer = size + 8;');
    expect(source).toContain("outputRange: ['0deg', '360deg']");
    expect(source).toContain('outputRange: [0.98, 1.04, 0.98]');
    expect(source).toContain('duration: 7200');
    expect(source.match(/<Animated\.View/g)).toHaveLength(3);
  });

  it('renders Pro satin texture inside the same compact layered halo', () => {
    expect(source).toContain("aura.material === 'satin'");
    expect(source).toContain('satinColors');
    expect(source).toContain('satinLocations');
    expect(source.match(/<Animated\.View/g)).toHaveLength(3);
  });

  it('contains no decorative SVG, symbols, particles, or extra aura rings', () => {
    expect(source).not.toContain('react-native-svg');
    expect(source).not.toMatch(/<(Svg|Circle|Polygon|Polyline)\b/);
    expect(source).not.toMatch(/spark|orb|orbit|bolt|glint/i);
    expect(source).not.toContain('borderWidth:');
  });

  it('keeps infinite animation gated by focus, AppState, and the animate prop', () => {
    expect(source).toContain('const reduceMotion = useReduceMotion();');
    expect(source).toContain('const runtimeActive = isFocused && (ownerActive ?? true);');
    expect(source).toContain('animate && runtimeActive && !reduceMotion');
    expect(source).toContain("AppState.currentState === 'active'");
    expect(source).toContain("AppState.addEventListener('change'");
  });
});
