// зачем (координатор 18.10, первый запуск): новичок при системной ТЁМНОЙ теме — с первого готового кадра без чужой темы.
// ЗАМОК ВЛАДЕЛЬЦА 24.10: «из онбординга убрать тёмную тему, стандартная тема только одна — светлая» — на тёмном телефоне новичок
// получает светлые «Сумерки», тёмного кадра нет вовсе.
// Отдельный файл: модульные флаги провайдера живут на процесс (см. theme_boot_new_user_light.test.tsx).
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { pickSystemDefaultTheme } from '../app/theme_first_run_default';
import { THEME_SLIDERS_V1_ENABLED } from '../constants/theme_sliders_flag';
import { THEME_TUNE_STANDARD, themeTuneId } from '../constants/theme_tune';
// зачем (координатор 05.11 ~21:30, ползунки включены): именных тем нет — новичок видит «Стандартный» tune:250:35 (светлое оформление и насыщенность пары прежние, замок 24.10)
const SHOWN_DEFAULT = (pairThemeId: string): string => (THEME_SLIDERS_V1_ENABLED ? themeTuneId(THEME_TUNE_STANDARD) : pairThemeId);


const mockScheme: 'light' | 'dark' = 'dark';
const mockStorageDelayMs = 25;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => mockScheme,
  Appearance: { getColorScheme: () => mockScheme },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn((keys: string[]) => new Promise((resolve) => setTimeout(() => resolve(keys.map((key) => [key, null])), mockStorageDelayMs))),
    setItem: jest.fn(async () => undefined),
    multiSet: jest.fn(async () => undefined),
  },
}));
jest.mock('../app/config', () => ({ DEV_MODE: false, ENABLE_DEV_TOOLS: false }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: async () => false }));
jest.mock('../components/PremiumContext', () => ({ useFeatureAccess: () => true }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('../app/oskolok', () => ({ setOskolokThemeMode: jest.fn() }));

type Frame = Readonly<{ themeId: string; appearance: string; ready: boolean }>;
const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('первый запуск: новичок, тёмная система', () => {
  it('первый кадр с готовым выбором — светлые «Сумерки»; готового кадра с тёмной или чужой темой нет', async () => {
    const frames: Frame[] = [];
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = await renderHook(() => {
      const t = useTheme();
      frames.push({ themeId: t.liquidGlassThemeId, appearance: t.liquidGlassAppearance, ready: t.liquidGlassChoiceReady });
      return t;
    }, { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    const system = pickSystemDefaultTheme(mockScheme);
    const firstReady = frames.find((f) => f.ready);
    expect(firstReady).toBeDefined();
    expect(system).toEqual({ themeId: 'ink', appearance: 'light', intensity: 1 });
    expect(firstReady!.appearance).toBe('light');
    expect(firstReady!.themeId).toBe(SHOWN_DEFAULT('ink'));
    expect(frames.filter((f) => f.ready && (f.appearance !== 'light' || f.themeId !== SHOWN_DEFAULT('ink')))).toEqual([]);
    const lines = log.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.startsWith('[THEME-BOOT] hydrate') && l.includes('new_user'))).toBe(true);
    log.mockRestore();
  });
});
