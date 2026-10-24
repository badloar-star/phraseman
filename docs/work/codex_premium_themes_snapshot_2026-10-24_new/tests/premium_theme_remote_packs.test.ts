import fs from 'node:fs';
import path from 'node:path';

import { PREMIUM_THEME_CATALOG, PREMIUM_THEME_IDS } from '../app/premium_theme_catalog';
import { __premiumThemeEntitlementTestHooks } from '../app/premium_theme_entitlements';
import { __premiumThemePackTestHooks } from '../app/premium_theme_pack_cache';
import { storyEventKey } from '../modules/story_events/story_events_core';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('premium achievement themes', () => {
  it('keeps exactly the six owner-approved themes and distinct conditions', () => {
    expect(PREMIUM_THEME_IDS).toHaveLength(6);
    expect(new Set(PREMIUM_THEME_CATALOG.map((entry) => entry.id)).size).toBe(6);
    expect(new Set(PREMIUM_THEME_CATALOG.map((entry) => entry.condition)).size).toBe(6);
    for (const entry of PREMIUM_THEME_CATALOG) {
      if (entry.prefetchAt !== null && entry.unlockAt !== null) expect(entry.prefetchAt).toBeLessThan(entry.unlockAt);
    }
  });

  it('records a stable story key for the red avatar ring event', () => {
    expect(storyEventKey('theme_unlock', { themeId: 'grad_full_horizon' })).toBe('theme_unlock:grad_full_horizon');
  });

  it('keeps remote art out of the native source tree', () => {
    const registry = read('components/theme/themed_art_registry.ts');
    const cache = read('app/premium_theme_pack_cache.ts');
    expect(registry).toContain('resolveActivePremiumThemeArt');
    expect(cache).toContain('File.downloadFileAsync');
    expect(cache).toContain('CryptoDigestAlgorithm.SHA256');
    expect(cache).toMatch(/allowLockedDevPreview = __DEV__ && devPreview/);
    const bundledPremiumFiles = fs.readdirSync(path.join(root, 'assets'), { recursive: true })
      .map(String)
      .filter((name) => /premium-theme-packs|home-assets-v2/i.test(name) && /\.(?:png|webp)$/i.test(name));
    expect(bundledPremiumFiles).toEqual([]);
    expect(cache).toContain("const PACK_VERSION = 2");
    expect(cache).toContain("const ROOT_NAME = 'premium-theme-packs-v2'");
    expect(cache).toContain("row.width !== 1254 || row.height !== 1254");
  });

  it('treats the development override as the pack root without duplicating its storage prefix', () => {
    const previous = process.env.EXPO_PUBLIC_PREMIUM_THEME_PACK_BASE_URL;
    process.env.EXPO_PUBLIC_PREMIUM_THEME_PACK_BASE_URL = 'http://127.0.0.1:8818/premium-theme-packs/v2';
    try {
      expect(__premiumThemePackTestHooks.objectUrl('premium-theme-packs/v2/olive/cards.png'))
        .toBe('http://127.0.0.1:8818/premium-theme-packs/v2/olive/cards.png');
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_PREMIUM_THEME_PACK_BASE_URL;
      else process.env.EXPO_PUBLIC_PREMIUM_THEME_PACK_BASE_URL = previous;
    }
  });

  it('re-resolves mounted home art after a remote pack finishes downloading', () => {
    const context = read('components/ThemeContext.tsx');
    const scene = read('components/home/v2/scene/HomeScene.tsx');
    const themedArt = read('components/theme/ThemedArt.tsx');
    expect(context).toContain('premiumThemePackRev');
    expect(scene).toMatch(/premiumArtRevision[\s\S]*resolveHomeSceneArt[\s\S]*premiumArtRevision, liquidGlassThemeId/);
    expect(themedArt).toMatch(/premiumArtRevision[\s\S]*resolveThemedArt[\s\S]*premiumArtRevision, liquidGlassThemeId/);
    expect(context).toContain('loadSelectedPack(attempt + 1)');
  });

  it('keeps Storage public-read-only and the entitlement/counter server-only', () => {
    const storage = read('storage.rules');
    const firestore = read('firestore.rules');
    expect(storage).toMatch(/match \/premium-theme-packs\/v2\/\{allPaths=\*\*\}[\s\S]*allow get: if true;[\s\S]*allow write: if false;/);
    expect(firestore).toContain("'premium_theme_entitlements_v1'");
    expect(firestore).toMatch(/match \/premium_theme_video_watch\/\{userId\}[\s\S]*allow read, write: if false;/);
  });

  it('accepts only bounded integer server progress rows', () => {
    expect(__premiumThemeEntitlementTestHooks.parseProgressByCondition({
      streak_365: { current: 364, target: 365, unit: 'days' },
      video_200_hours: { current: 201, target: 200, unit: 'hours' },
      evil: { current: 1, target: 1, unit: 'purchase' },
    })).toEqual({ streak_365: { current: 364, target: 365, unit: 'days' } });
  });
});
