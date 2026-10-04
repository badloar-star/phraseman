// зачем (владелец 2026-10-04): «убираем 3 кнопки (Акцент / Максимум / Спокойно) и вместо этого
// делаем только ползунок». Сторожим:
//   • миграция: прежние «Спокойно / Акцент / Максимум» → 0 / 0.5 / 1 — у людей ничего не прыгает;
//   • на опорных точках палитра байт-в-байт прежняя, между ними — плавное смешивание;
//   • во время перетаскивания на диск НЕ пишется ничего, при отпускании — одна запись.
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import {
  liquidGlassTokens,
  setActiveLiquidGlassVariant,
} from '../constants/liquidGlassThemePalette';
import {
  liquidGlassLevelForIntensity,
  migrateStoredLiquidGlassIntensity,
  mixLiquidGlassColor,
  quantizeLiquidGlassIntensity,
} from '../constants/liquidGlassThemeIntensity';
import { buildLiquidGlassVariant } from '../constants/liquidGlassThemeVariants';
import { createThemeIntensityDragController } from '../components/settings/theme_intensity_drag';

const mockStore = new Map<string, string>();
const mockWrites: string[] = [];

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, mockStore.get(key) ?? null])),
    setItem: jest.fn(async (key: string, value: string) => { mockWrites.push(key); mockStore.set(key, value); }),
    multiSet: jest.fn(async (pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => { mockWrites.push(key); mockStore.set(key, value); });
    }),
  },
}));

jest.mock('../app/oskolok', () => ({ setOskolokThemeMode: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(ThemeProvider, null, children);
const intensityWrites = () => mockWrites.filter((k) => k === 'liquid_glass_intensity').length;

beforeEach(() => {
  mockStore.clear();
  mockWrites.length = 0;
  setActiveLiquidGlassVariant({ level: 'calm', appearance: 'dark', intensity: 0 });
});

describe('migration of the three old levels', () => {
  it.each([
    ['calm', 0],
    ['accent', 0.5],
    ['max', 1],
  ] as const)('stored level %s becomes intensity %s and asks for one write', (level, expected) => {
    expect(migrateStoredLiquidGlassIntensity(null, level)).toEqual({ intensity: expected, source: 'legacy_level', needsWrite: true });
  });

  it('a stored intensity wins over the legacy level and is snapped to the 0.05 grid', () => {
    expect(migrateStoredLiquidGlassIntensity('0.33', 'max')).toEqual({ intensity: 0.35, source: 'intensity', needsWrite: false });
  });

  it('junk falls back to 0 (calm) without writing', () => {
    expect(migrateStoredLiquidGlassIntensity('abc', 'sepia')).toEqual({ intensity: 0, source: 'default', needsWrite: false });
    expect(migrateStoredLiquidGlassIntensity(null, null)).toEqual({ intensity: 0, source: 'default', needsWrite: false });
  });

  it('the provider restores an old "max" as 1 and writes the new key once', async () => {
    mockStore.set('liquid_glass_color_level', 'max');
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassIntensity).toBe(1));
    expect(result.current.liquidGlassColorLevel).toBe('max');
    expect(mockStore.get('liquid_glass_intensity')).toBe('1');
    expect(intensityWrites()).toBe(1);
  });
});

describe('palette along the slider', () => {
  it.each([
    ['calm', 0],
    ['accent', 0.5],
    ['max', 1],
  ] as const)('anchor %s is byte-for-byte the approved palette', (level, intensity) => {
    for (const appearance of ['dark', 'light'] as const) {
      const viaSlider = liquidGlassTokens('marine', { level: 'calm', appearance, intensity });
      const viaLevel = liquidGlassTokens('marine', { level, appearance });
      expect(viaSlider).toBe(viaLevel);
    }
  });

  it('the old three-level formula is unchanged at the anchors', () => {
    const calmDark = liquidGlassTokens('sage', { level: 'calm', appearance: 'dark', intensity: 0 });
    const accent = liquidGlassTokens('sage', { level: 'accent', appearance: 'dark' });
    const max = liquidGlassTokens('sage', { level: 'max', appearance: 'dark' });
    const { intensity: _a, ...accentNoI } = accent;
    const { intensity: _m, ...maxNoI } = max;
    void _a; void _m;
    const calmBase = { ...calmDark } as Record<string, unknown>;
    delete calmBase.intensity;
    expect(accentNoI).toEqual(buildLiquidGlassVariant('sage', calmBase as never, { level: 'accent', appearance: 'dark' }));
    expect(maxNoI).toEqual(buildLiquidGlassVariant('sage', calmBase as never, { level: 'max', appearance: 'dark' }));
  });

  it('between anchors the main button colour moves smoothly, not in a jump', () => {
    const a = liquidGlassTokens('marine', { level: 'calm', appearance: 'dark', intensity: 0 }).accent;
    const b = liquidGlassTokens('marine', { level: 'calm', appearance: 'dark', intensity: 0.5 }).accent;
    const mid = liquidGlassTokens('marine', { level: 'calm', appearance: 'dark', intensity: 0.25 }).accent;
    expect(mid).toBe(mixLiquidGlassColor(a, b, 0.5));
    expect(mid).not.toBe(a);
    expect(mid).not.toBe(b);
  });

  it('six-digit colours stay six-digit (screens append their own alpha suffix)', () => {
    const t = liquidGlassTokens('rose', { level: 'calm', appearance: 'dark', intensity: 0.35 });
    expect(t.accentCap).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('level bucket: 0 calm, colour accent, top quarter max', () => {
    expect(liquidGlassLevelForIntensity(0)).toBe('calm');
    expect(liquidGlassLevelForIntensity(0.05)).toBe('accent');
    expect(liquidGlassLevelForIntensity(0.7)).toBe('accent');
    expect(liquidGlassLevelForIntensity(0.75)).toBe('max');
    expect(quantizeLiquidGlassIntensity(0.35000001)).toBe(0.35);
  });
});

describe('saving only on release', () => {
  it('controller: steps preview, release commits exactly once', () => {
    const preview: (number | null)[] = [];
    const commits: number[] = [];
    const detents: number[] = [];
    const c = createThemeIntensityDragController({
      onPreview: (i) => preview.push(i),
      onCommit: (i) => commits.push(i),
      onDetent: (i) => detents.push(i),
    });
    c.begin(0.1);
    c.step(0.12); // тот же шаг 0.1 — ничего
    c.step(0.2);
    c.step(0.26); // 0.25 — опорная точка
    c.step(0.31);
    expect(commits).toEqual([]);
    expect(preview).toEqual([0.1, 0.2, 0.25, 0.3]);
    expect(detents).toEqual([0.25]);
    c.end();
    c.end(); // повторное отпускание не пишет второй раз
    expect(commits).toEqual([0.3]);
    c.step(0.9); // после отпускания шаги игнорируются
    expect(preview).toEqual([0.1, 0.2, 0.25, 0.3]);
  });

  it('provider: preview never touches disk, commit writes once', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    mockWrites.length = 0;
    await act(async () => {
      result.current.setPreviewLiquidGlassIntensity(0.3);
      result.current.setPreviewLiquidGlassIntensity(0.45);
      result.current.setPreviewLiquidGlassIntensity(0.6);
    });
    expect(result.current.liquidGlassIntensity).toBe(0.6);
    expect(result.current.theme.accent).toBe(liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark', intensity: 0.6 }).accent);
    expect(mockWrites).toEqual([]);
    await act(async () => { result.current.setLiquidGlassIntensity(0.6); });
    expect(intensityWrites()).toBe(1);
    expect(mockStore.get('liquid_glass_intensity')).toBe('0.6');
    expect(mockStore.get('liquid_glass_color_level')).toBe('accent');
  });

  it('leaving mid-drag drops the preview and keeps the saved value', async () => {
    mockStore.set('liquid_glass_intensity', '0.2');
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassIntensity).toBe(0.2));
    await act(async () => { result.current.setPreviewLiquidGlassIntensity(0.9); });
    expect(result.current.liquidGlassIntensity).toBe(0.9);
    await act(async () => { result.current.setPreviewLiquidGlassIntensity(null); });
    expect(result.current.liquidGlassIntensity).toBe(0.2);
  });
});
