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
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, null])),
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

jest.mock('../app/services/league_chest_rewards', () => ({
  hasLeagueGoldThemeReward: jest.fn(async () => false),
}));

jest.mock('../app/oskolok', () => ({
  setOskolokThemeMode: jest.fn(),
}));

describe('runtime theme selection', () => {
  beforeEach(() => {
    mockThemesFeatureAccess = true;
    mockGetVerifiedPremiumStatus.mockReset();
    mockGetVerifiedPremiumStatus.mockResolvedValue(false);
  });

  it('applies a Plus theme when the live themes feature gate grants access', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => expect(mockGetVerifiedPremiumStatus).toHaveBeenCalled());

    await act(() => result.current.setThemeMode('ember'));

    expect(result.current.appliedThemeMode).toBe('ember');
  });

  it('mounts the premium access source above the theme provider', () => {
    const layoutSource = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const premiumProvider = layoutSource.indexOf('<PremiumProvider>');
    const themeProvider = layoutSource.indexOf('<ThemeProvider>');

    expect(premiumProvider).toBeGreaterThan(-1);
    expect(themeProvider).toBeGreaterThan(premiumProvider);
  });

  it('does not let delayed startup hydration overwrite a newer theme choice', async () => {
    let resolvePremium!: (value: boolean) => void;
    mockThemesFeatureAccess = false;
    mockGetVerifiedPremiumStatus.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      resolvePremium = resolve;
    }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(mockGetVerifiedPremiumStatus).toHaveBeenCalled());

    await act(() => result.current.setThemeMode('sagePorcelain'));
    expect(result.current.appliedThemeMode).toBe('sagePorcelain');

    await act(async () => resolvePremium(false));

    expect(result.current.appliedThemeMode).toBe('sagePorcelain');
  });
});
