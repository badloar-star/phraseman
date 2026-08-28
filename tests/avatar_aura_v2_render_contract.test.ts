import fs from 'fs';
import path from 'path';

const avatarAura = fs.readFileSync(path.join(__dirname, '../components/AvatarAura.tsx'), 'utf8');
const layeredRing = fs.readFileSync(path.join(__dirname, '../components/SeasonAuraRing.tsx'), 'utf8');
const registry = fs.readFileSync(path.join(__dirname, '../app/avatar_aura_assets.ts'), 'utf8');
const catalogCard = fs.readFileSync(path.join(__dirname, '../components/customization/CustomizationCatalogCard.tsx'), 'utf8');
const avatarView = fs.readFileSync(path.join(__dirname, '../components/AvatarView.tsx'), 'utf8');

describe('approved avatar aura layered renderer contract', () => {
  it('routes approved aura IDs through the shared square three-layer renderer before fallback art', () => {
    expect(avatarAura).toContain("import { getApprovedAvatarAuraAsset } from '../app/avatar_aura_assets';");
    expect(avatarAura).toContain('getApprovedAvatarAuraAsset(aura?.id)');
    expect(avatarAura).toContain('<SeasonAuraRing');
    expect(avatarAura).toContain('Math.round(size * ringScale)');
  });

  it('uses the owner-approved midpoint scale while keeping generated art outside the hex', () => {
    expect(avatarAura).toContain('const APPROVED_AURA_RING_SCALE = 2.05;');
    expect(avatarAura).toContain('const ringScale = approvedAsset ? APPROVED_AURA_RING_SCALE : SEASON_AURA_RING_SCALE;');
  });

  it('leaves enough card room for the enlarged aura instead of clipping it at the tile edge', () => {
    expect(catalogCard).toContain('const AURA_CATALOG_PREVIEW_SIZE = 52;');
    expect(catalogCard).toContain('const AVATAR_CATALOG_PREVIEW_SIZE = 88;');
    expect(catalogCard).toContain("size={item.kind === 'aura' ? AURA_CATALOG_PREVIEW_SIZE : AVATAR_CATALOG_PREVIEW_SIZE}");
  });

  it('normalizes every catalog aura to 91 pt without shrinking the tile', () => {
    expect(catalogCard).toContain('const AURA_CATALOG_VISUAL_SIZE = 91;');
    expect(catalogCard).toContain("auraVisualSize={item.kind === 'aura' ? AURA_CATALOG_VISUAL_SIZE : undefined}");
    expect(avatarView).toContain('auraVisualSize?: number;');
    expect(avatarView).toContain('visualSize={auraVisualSize}');
    expect(avatarAura).toContain('visualSize?: number;');
    expect(avatarAura).toContain('const requestedVisualSize = visualSize === undefined ? undefined : Math.round(visualSize);');
    expect(avatarAura).toContain('const ringSize = requestedVisualSize ?? Math.round(size * ringScale);');
    expect(avatarAura).toContain('width: ringSize,');
    expect(avatarAura).toContain('const softOuterSize = requestedVisualSize ?? outer + 18;');
  });

  it('keeps every layer square and rotates around its center without elliptical translation', () => {
    expect(layeredRing).toContain("outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg']");
    expect(layeredRing).toContain("const layerStyle = { position: 'absolute' as const, width: size, height: size };");
    expect(layeredRing).not.toMatch(/translate[XY]/);
    expect(registry).not.toMatch(/translate[XY]/);
  });

  it('pauses loops for reduced motion, backgrounded apps, unfocused screens, and inactive owners', () => {
    expect(layeredRing).toContain('const shouldAnimate = active && isFocused && !reduceMotion;');
    expect(layeredRing).toContain("AppState.currentState === 'active'");
    expect(layeredRing).toContain("AppState.addEventListener('change'");
    expect(avatarAura).toContain('const runtimeActive = isFocused && (ownerActive ?? true);');
    expect(avatarAura).toContain('active={animate && runtimeActive}');
  });
});
