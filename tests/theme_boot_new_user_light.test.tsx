// зачем (координатор 18.10, «первый запуск: первый экран, онбординг и первая Главная получают правильную тему с первого кадра, без вспышки другой темы»):
// сценарий «новичок» на эмуляторе снять нельзя (нужен pm clear), поэтому закрываем по коду. Контракт: ПОКА выбор не готов (liquidGlassChoiceReady=false) стартовая
// заставка закрывает экран; ПЕРВЫЙ кадр с готовым выбором уже идёт с системной парой темы и оформления — ни одного «готового» кадра с темой по умолчанию.
// Модульные флаги провайдера (peek, следование системе, «выбор прочитан») живут на процесс — поэтому каждый сценарий в отдельном файле.
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { pickSystemDefaultTheme } from '../app/theme_first_run_default';

const mockScheme: 'light' | 'dark' = 'light';
const mockStorageDelayMs = 25;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => mockScheme,
  Appearance: { getColorScheme: () => mockScheme },
}));

// новичок: в хранилище нет ни темы, ни onboarding_done — решение new_user
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

describe('первый запуск: новичок, светлая система', () => {
  it('первый кадр с готовым выбором — системная светлая пара; готового кадра с чужой темой нет', async () => {
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
    expect(firstReady!.appearance).toBe('light');
    expect(firstReady!.themeId).toBe(system.themeId);
    // заставка снята не раньше готовности: ни один «готовый» кадр не показывает чужую тему
    expect(frames.filter((f) => f.ready && (f.appearance !== 'light' || f.themeId !== system.themeId))).toEqual([]);
    // лог причин: кадры и разбор хранилища
    const lines = log.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.startsWith('[THEME-BOOT] frame'))).toBe(true);
    expect(lines.some((l) => l.startsWith('[THEME-BOOT] hydrate') && l.includes('new_user'))).toBe(true);
    log.mockRestore();
  });
});
