// зачем (приказ координатора 15.10): плитки Главной и карточка «Сегодня/Продолжить» рисуют слой .accent (tintColor = accentBright) поверх основы,
// но только когда он есть: с accent — два слоя, без — один; accent берётся из того же resolveThemedArt (второго разрешения нет).
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ liquidGlassThemeId: 'graphite', liquidGlassAppearance: 'dark', liquidGlassIntensity: 0 }),
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('react-native', () => ({ StyleSheet: { absoluteFill: { position: 'absolute' } }, View: 'View' })); // зачем: проверяем структуру слоёв, а не нативный рендер

import { ThemedArtLayers } from '../components/theme/ThemedArtLayers';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');
// memo(Impl) → .type — сама функция; useTheme замокан без хуков, поэтому вызов вне рендера безопасен.
const render = (props: Record<string, unknown>): ReactElement => (ThemedArtLayers as unknown as { type: (p: unknown) => ReactElement }).type(props);
const layers = (el: ReactElement): ReactElement[] => {
  const children = (el.props as { children?: unknown }).children;
  return (Array.isArray(children) ? children : [children]).filter(Boolean) as ReactElement[];
};

describe('слой .accent на Главной', () => {
  it('без accent — один слой (основа)', () => {
    const out = layers(render({ source: 1, accent: null }));
    expect(out).toHaveLength(1);
    expect((out[0]!.props as { source: number }).source).toBe(1);
    expect((out[0]!.props as { tintColor?: string }).tintColor).toBeUndefined();
  });

  it('с accent — два слоя: основа и accent с tintColor = accentBright, transition 0', () => {
    const out = layers(render({ source: 1, accent: 2 }));
    expect(out).toHaveLength(2);
    const expected = liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark', intensity: 0 }).accentBright;
    expect((out[1]!.props as { source: number }).source).toBe(2);
    expect((out[1]!.props as { tintColor: string }).tintColor).toBe(expected);
    for (const layer of out) expect((layer.props as { transition: number }).transition).toBe(0);
  });

  it('плитки и карточка рисуют арт через ThemedArtLayers и получают accent из того же resolve', () => {
    const tiles = read('components', 'home', 'v2', 'HomeV2FeatureTiles.tsx');
    const card = read('components', 'home', 'v2', 'HomeV2ContinueCard.tsx');
    const home = read('app', '(tabs)', 'home.tsx');
    expect(tiles).toContain('<ThemedArtLayers source={tile.art} accent={tile.artAccent}');
    expect(card).toContain('<ThemedArtLayers source={art} accent={artAccent}');
    expect(home).toContain('artAccent={priorityCardArt.accent}');
    // каждая плитка идёт через tileArt (основа + accent из одного resolveThemedArt), прямых `art: resolveThemedArt` не осталось
    expect(home).not.toMatch(/art: resolveThemedArt\(/);
    expect((home.match(/\.\.\.tileArt\(/g) ?? []).length).toBe(7);
  });
});
