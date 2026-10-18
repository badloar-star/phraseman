// зачем (координатор 18.10, первый запуск: «ceiling 400 мс — отдельным тестом с медленным хранилищем»): если хранилище отвечает медленнее потолка (400 мс),
// заставка всё равно снимается — но с ТЕМОЙ ПО УМОЛЧАНИЮ (тёмной), и потом пара перекрашивается в системную. Это единственный путь «вспышки» по коду; тест фиксирует
// его как известное поведение и проверяет, что причина попадает в журнал [THEME-BOOT] ceiling. Модульные флаги провайдера живут на процесс — отдельный файл.
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { pickSystemDefaultTheme } from '../app/theme_first_run_default';

const mockScheme: 'light' | 'dark' = 'light';
const mockStorageDelayMs = 900;

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
    // зачем: DebugLogger.error на потолке ходит в app_health, а тот читает/пишет троттлинг через getItem/setItem
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    multiSet: jest.fn(async () => undefined),
  },
}));
jest.mock('../app/config', () => ({ DEV_MODE: false, ENABLE_DEV_TOOLS: false }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: async () => false }));
jest.mock('../components/PremiumContext', () => ({ useFeatureAccess: () => true }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('../app/oskolok', () => ({ setOskolokThemeMode: jest.fn() }));

type Frame = Readonly<{ themeId: string; appearance: string; ready: boolean; at: number }>;
const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('первый запуск: медленное хранилище (потолок 400 мс)', () => {
  it('заставка снимается по потолку, не раньше; причина в журнале; поздние данные ставят системную пару', async () => {
    const frames: Frame[] = [];
    const t0 = Date.now();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result } = await renderHook(() => {
      const t = useTheme();
      frames.push({ themeId: t.liquidGlassThemeId, appearance: t.liquidGlassAppearance, ready: t.liquidGlassChoiceReady, at: Date.now() - t0 });
      return t;
    }, { wrapper });
    expect(result.current.liquidGlassChoiceReady).toBe(false);
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true), { timeout: 1500 });
    const firstReady = frames.find((f) => f.ready)!;
    // по потолку: заметно раньше ответа хранилища (900 мс) и не раньше самого потолка (с допуском таймеров)
    expect(firstReady.at).toBeGreaterThanOrEqual(350);
    expect(firstReady.at).toBeLessThan(900);
    // известное следствие потолка: этот кадр идёт с темой по умолчанию (тёмной), хотя система светлая — его и ловит [THEME-BOOT] ceiling
    expect(firstReady.appearance).toBe('dark');
    expect(warn.mock.calls.some((c) => String(c[0]).startsWith('[THEME-BOOT] ceiling'))).toBe(true);
    // поздние данные хранилища приводят пару к системной светлой
    await waitFor(() => expect(result.current.liquidGlassAppearance).toBe('light'), { timeout: 2000 });
    expect(result.current.liquidGlassThemeId).toBe(pickSystemDefaultTheme(mockScheme).themeId);
    warn.mockRestore();
    log.mockRestore();
  });
});
