import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';

const mockGetVerifiedPremiumStatus = jest.fn(async () => false);
let mockThemesFeatureAccess = true;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  // зачем (владелец 13.10, тема новичка по системному режиму): ThemeContext читает useColorScheme и Appearance.getColorScheme
  useColorScheme: () => 'dark',
  Appearance: { getColorScheme: () => 'dark' },
}));

let mockMultiGet: (keys: string[]) => Promise<[string, string | null][]> = async (keys) => keys.map((key) => [key, key === 'onboarding_done' ? '1' : null]); // зачем (владелец 13.10): «ключей нет» без onboarding_done = новичок с темой по системе; эти тесты про существующего человека
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn((keys: string[]) => mockMultiGet(keys)),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock('../app/config', () => ({
  DEV_MODE: false,
  ENABLE_DEV_TOOLS: false,
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: () => mockGetVerifiedPremiumStatus(),
}));

jest.mock('../components/PremiumContext', () => ({
  useFeatureAccess: (feature: string) => feature === 'themes' && mockThemesFeatureAccess,
}));

jest.mock('../app/events', () => ({
  onAppEvent: jest.fn(() => ({ remove: jest.fn() })),
}));


jest.mock('../app/oskolok', () => ({
  setOskolokThemeMode: jest.fn(),
}));

describe('runtime theme selection', () => {
  beforeEach(() => {
    mockMultiGet = async (keys) => keys.map((key) => [key, key === 'onboarding_done' ? '1' : null]); // зачем (владелец 13.10): «ключей нет» без onboarding_done = новичок с темой по системе; эти тесты про существующего человека
    mockThemesFeatureAccess = true;
    mockGetVerifiedPremiumStatus.mockReset();
    mockGetVerifiedPremiumStatus.mockResolvedValue(false);
  });

  // зачем (координатор §48, 2026-10-01): владелец 30.09 — «ТЕМЫ ВСЕ ФРИ». Гейт Plus и
  // проверка премиума при старте сняты; выбор живёт в Liquid Glass (setLiquidGlassThemeId),
  // старый setThemeMode — совместимый no-op на графите. Сторожим новую суть.
  it('applies any Liquid Glass theme without Plus and without a premium check', async () => {
    mockThemesFeatureAccess = false;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));

    await act(async () => { result.current.setLiquidGlassThemeId('iris'); });

    expect(result.current.liquidGlassThemeId).toBe('iris');
    expect(mockGetVerifiedPremiumStatus).not.toHaveBeenCalled();
  });

  it('mounts the premium access source above the theme provider', () => {
    const layoutSource = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const premiumProvider = layoutSource.indexOf('<PremiumProvider>');
    const themeProvider = layoutSource.indexOf('<ThemeProvider>');

    expect(premiumProvider).toBeGreaterThan(-1);
    expect(themeProvider).toBeGreaterThan(premiumProvider);
  });

  it('does not let delayed startup hydration overwrite a newer theme choice', async () => {
    // Хранилище «отвечает» поздно и приносит старый выбор (marine).
    let releaseStored!: () => void;
    // Задерживаем только чтение выбора Liquid Glass; старые ключи (app_theme) — сразу.
    mockMultiGet = (keys) => (keys.includes('liquid_glass_theme')
      ? new Promise((resolve) => {
        releaseStored = () => resolve(keys.map((key) => [key, key === 'liquid_glass_theme' ? 'marine' : null]));
      })
      : Promise.resolve(keys.map((key) => [key, null] as [string, string | null])));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = await renderHook(() => useTheme(), { wrapper });

    // Человек успел выбрать тему раньше, чем прочиталось хранилище.
    await act(async () => { result.current.setLiquidGlassThemeId('rose'); });
    expect(result.current.liquidGlassThemeId).toBe('rose');

    await act(async () => { releaseStored(); await Promise.resolve(); });

    expect(result.current.liquidGlassThemeId).toBe('rose');
  });
});
