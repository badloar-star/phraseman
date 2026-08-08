import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const REWARD_KINDS = [
  'battery',
  'league_boost',
  'club_totem',
  'golden_lesson',
  'collection_magnet',
  'turbo_regen',
  'tournament_ticket',
  'time_machine',
  'friend_shield',
  'choice_3',
  'xp_bank',
  'plus_days',
  'frame',
  'nick_color',
  'custom_avatar',
  'card_pack',
] as const;

describe('Season Pass reward art', () => {
  const config = read('app/season_pass_track_config.ts');
  const track = read('app/season_pass.tsx');
  const modal = read('components/SeasonGiftModal.tsx');
  const aura = read('components/SeasonAuraRing.tsx');

  it('wires one unique light and dark asset for every non-system reward kind', () => {
    const matches = [...config.matchAll(/assets\/images\/season\/rewards\/(light|dark)\/([a-z0-9_-]+)\.webp/g)]
      .map((match) => ({ theme: match[1], kind: match[2], relativePath: match[0] }));

    for (const theme of ['light', 'dark'] as const) {
      const themed = matches.filter((entry) => entry.theme === theme);
      expect(themed).toHaveLength(REWARD_KINDS.length);
      expect(new Set(themed.map((entry) => entry.kind))).toEqual(new Set(REWARD_KINDS));
      for (const entry of themed) {
        expect(fs.existsSync(path.join(ROOT, entry.relativePath))).toBe(true);
      }
    }

    expect(config).toContain('export function getSeasonRewardIcon(');
    expect(config).toContain("isLightThemeMode(themeMode) ? 'light' : 'dark'");
  });

  it('ships the redesigned collectible set as compact transparent and non-duplicated WebP art', async () => {
    // The card frame has its own 512×320 geometry; the other rewards share a
    // square slot so their visual scale stays stable on the Season Pass track.
    const redesignedKinds = REWARD_KINDS.filter((kind) => kind !== 'frame');
    const hashes = new Set<string>();

    for (const theme of ['light', 'dark'] as const) {
      for (const kind of redesignedKinds) {
        const relativePath = `assets/images/season/rewards/${theme}/${kind}.webp`;
        const absolutePath = path.join(ROOT, relativePath);
        const file = fs.readFileSync(absolutePath);
        const hash = crypto.createHash('sha256').update(file).digest('hex');
        expect(hashes.has(hash)).toBe(false);
        hashes.add(hash);
        expect(file.byteLength).toBeLessThan(60_000);

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp') as typeof import('sharp');
        const image = sharp(file);
        const metadata = await image.metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(256);
        expect(metadata.height).toBe(256);
        expect(metadata.hasAlpha).toBe(true);

        const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
        expect(alphaAt(0, 0)).toBeLessThanOrEqual(8);
        expect(alphaAt(255, 255)).toBeLessThanOrEqual(8);
      }
    }

    expect(hashes.size).toBe(redesignedKinds.length * 2);
  });

  it('wires three independent light and dark layers for every aura', () => {
    const matches = [...config.matchAll(/assets\/images\/season\/auras\/(light|dark)\/(stage-[1-4]|secret)-(base|flow|particles)\.webp/g)]
      .map((match) => ({ theme: match[1], id: match[2], layer: match[3], relativePath: match[0] }));

    for (const theme of ['light', 'dark'] as const) {
      const themed = matches.filter((entry) => entry.theme === theme);
      expect(themed).toHaveLength(15);
      expect(new Set(themed.map((entry) => entry.id))).toEqual(
        new Set(['stage-1', 'stage-2', 'stage-3', 'stage-4', 'secret']),
      );
      expect(new Set(themed.map((entry) => entry.layer))).toEqual(new Set(['base', 'flow', 'particles']));
      for (const entry of themed) {
        expect(fs.existsSync(path.join(ROOT, entry.relativePath))).toBe(true);
      }
    }

    expect(config).toContain('export function getSeasonAuraStageAsset(');
    expect(config).toContain('export function getSeasonSecretAuraAsset(');
  });

  it('uses theme-aware art on the track, in the hero modal, and in choice rows', () => {
    expect(track).toContain('getSeasonRewardIcon(reward.kind, themeMode)');
    expect(track).toContain('getSeasonAuraStageAsset(');
    expect(track).toContain('getSeasonSecretAuraAsset(themeMode)');
    expect(modal).toContain('getSeasonRewardIcon(reward.kind, themeMode)');
    expect(modal).toContain('getSeasonAuraStageAsset(');
    expect(modal).toContain('getSeasonSecretAuraAsset(themeMode)');
    expect(modal).toContain('pearlIconForTheme(themeMode)');
    expect(modal).toContain("visible && reward.kind === 'season_finale'");
    expect(track).toContain('<SeasonAuraRing');
    expect(track).toContain('asset={asset}');
  });

  it('makes track art prominent without shrinking the tap target', () => {
    const rewardSize = Number(track.match(/export const SEASON_REWARD_ART_SIZE = (\d+);/)?.[1]);
    const auraSize = Number(track.match(/export const SEASON_AURA_ART_SIZE = (\d+);/)?.[1]);
    const rowHeight = Number(track.match(/const ROW_HEIGHT = (\d+);/)?.[1]);

    expect(rewardSize).toBeGreaterThanOrEqual(56);
    expect(auraSize).toBeGreaterThanOrEqual(60);
    expect(rowHeight).toBeGreaterThanOrEqual(104);
    expect(track).toContain("flexDirection: 'column'");
    expect(track).toContain("accessibilityRole: 'button'");
  });

  it('gates infinite aura animation by focus, foreground AppState, and Reduced Motion', () => {
    expect(aura).toContain("import { Animated, AppState, Easing");
    expect(aura).toContain('const isFocused = useIsScreenFocused();');
    expect(aura).toContain('const reduceMotion = useReduceMotion();');
    expect(aura).toContain("AppState.currentState === 'active'");
    expect(aura).toContain("AppState.addEventListener('change'");
    expect(aura).toContain('loops.forEach((loop) => loop.stop())');
    expect(aura).toContain('appSub.remove()');
    expect(aura).toContain('source={asset.baseSource}');
    expect(aura).toContain('source={asset.flowSource}');
    expect(aura).toContain('source={asset.particlesSource}');
    expect(aura).toContain('asset.flowReverse');
    expect(aura).toContain('asset.particlesReverse');
  });
});
