// ЗАМОК ВЛАДЕЛЬЦА 22.10: «темы не переключаются».
// зачем: dev-оверрайды темы/оформления (dev_state, dev-превью) стоят выше сохранённого выбора и жили в памяти до перезапуска —
// выбор человека писался на диск, а на экране тема не менялась. Выбор человека всегда главнее оверрайда: после тапа показанная
// тема и оформление РАВНЫ выбранным. Ослабить сторож можно только по новому слову владельца (docs/work/OWNER_LOCKS.md).
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from '../app/dev_appearance_override';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => 'dark',
  Appearance: { getColorScheme: () => 'dark' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, key === 'onboarding_done' ? '1' : null])),
    setItem: jest.fn(async () => undefined),
    multiSet: jest.fn(async () => undefined),
  },
}));

jest.mock('../app/config', () => ({ DEV_MODE: false, ENABLE_DEV_TOOLS: false }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: async () => false }));
jest.mock('../components/PremiumContext', () => ({ useFeatureAccess: () => true }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('../app/oskolok', () => ({ setOskolokThemeMode: jest.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('смена темы человеком главнее dev-оверрайда', () => {
  afterEach(() => {
    setDevThemeChoice(null);
    setDevAppearance(null);
  });

  it('тап темы снимает dev-оверрайд темы: показанная тема = выбранная', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    await act(async () => { setDevThemeChoice({ themeId: 'marine', intensity: 0.5 }); });
    expect(result.current.liquidGlassThemeId).toBe('marine');

    await act(async () => { result.current.setLiquidGlassThemeId('rose'); });

    expect(getDevThemeChoice()).toBeNull();
    expect(result.current.liquidGlassThemeId).toBe('rose');
  });

  it('смена оформления снимает dev-оверрайд оформления: показанное = выбранное', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    await act(async () => { setDevAppearance('dark'); });
    expect(result.current.liquidGlassAppearance).toBe('dark');

    await act(async () => { result.current.setLiquidGlassAppearance('light'); });

    expect(getDevAppearance()).toBeNull();
    expect(result.current.liquidGlassAppearance).toBe('light');
  });

  it('смена насыщенности тоже снимает оба оверрайда', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.liquidGlassChoiceReady).toBe(true));
    await act(async () => { setDevThemeChoice({ themeId: 'marine', intensity: 0.5 }); setDevAppearance('dark'); });

    await act(async () => { result.current.setLiquidGlassIntensity(1); });

    expect(getDevThemeChoice()).toBeNull();
    expect(getDevAppearance()).toBeNull();
  });
});
