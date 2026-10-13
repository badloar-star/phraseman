// зачем (владелец 2026-09-30, темы 2.0): уровень цвета и светлое оформление — выбор
// пользователя. Сторожим: по умолчанию «Спокойно» + тёмное (как было), выбор применяется
// мгновенно, пишется локально и читается при старте, запоздалое чтение не затирает выбор.
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { getActiveLiquidGlassVariant, liquidGlassTokens, setActiveLiquidGlassVariant } from '../constants/liquidGlassThemePalette';

const mockStore = new Map<string, string>();
let mockMultiGetGate: Promise<void> | null = null;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  // зачем (владелец 13.10, тема новичка по системному режиму): ThemeContext читает useColorScheme и Appearance.getColorScheme
  useColorScheme: () => 'dark',
  Appearance: { getColorScheme: () => 'dark' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(async (keys: string[]) => {
      if (mockMultiGetGate) await mockMultiGetGate;
      return keys.map((key) => [key, mockStore.get(key) ?? (key === 'onboarding_done' ? '1' : null)]);
    }),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    // зачем (ползунок 2026-10-04): интенсивность и совместимый уровень пишутся одной multiSet.
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([key, value]) => mockStore.set(key, value)); }),
  },
}));

jest.mock('../app/oskolok', () => ({ setOskolokThemeMode: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(ThemeProvider, null, children);

describe('theme colour level and appearance', () => {
  beforeEach(() => {
    mockStore.clear();
    mockMultiGetGate = null;
    setActiveLiquidGlassVariant({ level: 'calm', appearance: 'dark' });
  });

  it('defaults to calm + dark with the approved thin tokens', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassColorLevel).toBe('calm'));
    expect(result.current.liquidGlassAppearance).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.theme.bgPrimary).toBe(liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark' }).bg);
  });

  it('applies a level and light appearance instantly and persists them locally', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await act(async () => {
      result.current.setLiquidGlassThemeId('marine');
      result.current.setLiquidGlassColorLevel('accent');
      result.current.setLiquidGlassAppearance('light');
    });
    const expected = liquidGlassTokens('marine', { level: 'accent', appearance: 'light' });
    expect(result.current.liquidGlassColorLevel).toBe('accent');
    expect(result.current.isDark).toBe(false);
    expect(result.current.statusBarLight).toBe(false);
    expect(result.current.theme.bgPrimary).toBe(expected.bg);
    expect(result.current.theme.accent).toBe(expected.accent);
    expect(getActiveLiquidGlassVariant()).toEqual({ level: 'accent', appearance: 'light', intensity: 0.5 });
    expect(mockStore.get('liquid_glass_color_level')).toBe('accent');
    expect(mockStore.get('liquid_glass_appearance')).toBe('light');
    expect(mockStore.get('liquid_glass_theme')).toBe('marine');
  });

  it('restores the stored choice at start and ignores junk values', async () => {
    mockStore.set('liquid_glass_theme', 'slate');
    mockStore.set('liquid_glass_color_level', 'max');
    mockStore.set('liquid_glass_appearance', 'sepia');
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassColorLevel).toBe('max'));
    expect(result.current.appliedLiquidGlassThemeId).toBe('slate');
    expect(result.current.liquidGlassAppearance).toBe('dark');
  });

  it('a late startup read never overwrites a newer choice', async () => {
    mockStore.set('liquid_glass_color_level', 'max');
    mockStore.set('liquid_glass_appearance', 'light');
    let release!: () => void;
    mockMultiGetGate = new Promise<void>((resolve) => { release = resolve; });
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await act(async () => {
      result.current.setLiquidGlassColorLevel('accent');
      result.current.setLiquidGlassAppearance('dark');
    });
    await act(async () => { release(); });
    expect(result.current.liquidGlassColorLevel).toBe('accent');
    expect(result.current.liquidGlassAppearance).toBe('dark');
  });

  // зачем: сплеш ждёт liquidGlassChoiceReady — у выбравших светлое не должно быть тёмного первого кадра.
  it('reports the choice as ready only after the stored read (process peek afterwards)', async () => {
    mockStore.set('liquid_glass_appearance', 'light');
    let release!: () => void;
    mockMultiGetGate = new Promise<void>((resolve) => { release = resolve; });
    const { result } = await renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.liquidGlassChoiceReady).toBe('boolean');
    await act(async () => { release(); });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    expect(result.current.liquidGlassAppearance).toBe('light');
    expect(result.current.isDark).toBe(false);
  });
});
