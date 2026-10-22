// зачем (скорость, координатор 22.10): ThemeContext не должен будить подписчиков без смены темы. Закрепляем бюджет:
//  — пустой рендер родителя (тот же элемент-ребёнок) не перерисовывает подписчика и не меняет identity значения;
//  — одна смена темы — не больше двух рендеров подписчика (state + синхронная подгонка), значение меняется один раз;
//  — повторный выбор той же темы — ноль рендеров.
// Числа печатаются строкой [THEME-PERF] для отчёта.
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../components/ThemeContext';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => 'dark',
  Appearance: { getColorScheme: () => 'dark' },
  View: 'View',
  Text: 'Text',
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

type Ctx = ReturnType<typeof useTheme>;

describe('ThemeContext: бюджет перерисовок', () => {
  it('пустой рендер родителя не будит подписчика, смена темы — не больше двух рендеров, повтор — ноль', async () => {
    let renders = 0;
    let latest: Ctx | null = null;
    const values = new Set<Ctx>();
    function Probe() {
      renders += 1;
      latest = useTheme();
      values.add(latest);
      return null;
    }
    const probeElement = <Probe />;
    let tick: () => void = () => undefined;
    function Parent() {
      const [, setN] = React.useState(0);
      tick = () => setN((n) => n + 1);
      return <ThemeProvider>{probeElement}</ThemeProvider>;
    }
    await render(<Parent />);
    await waitFor(() => expect(latest?.liquidGlassChoiceReady).toBe(true));

    const settledRenders = renders;
    const settledValues = values.size;
    await act(async () => { tick(); });
    await act(async () => { tick(); });
    const afterEmpty = renders - settledRenders;
    const valuesAfterEmpty = values.size - settledValues;

    const before = renders;
    await act(async () => { latest!.setLiquidGlassThemeId('rose'); });
    const afterChange = renders - before;
    expect(latest!.liquidGlassThemeId).toBe('rose');

    const beforeSame = renders;
    await act(async () => { latest!.setLiquidGlassThemeId('rose'); });
    const afterSame = renders - beforeSame;

    console.log(`[THEME-PERF] бюджет ${JSON.stringify({ emptyParentRenders: afterEmpty, emptyParentNewValues: valuesAfterEmpty, themeChangeRenders: afterChange, sameThemeRenders: afterSame })}`); // guard-ok: цифры для отчёта
    expect(afterEmpty).toBe(0);
    expect(valuesAfterEmpty).toBe(0);
    expect(afterChange).toBeLessThanOrEqual(2);
    expect(afterSame).toBe(0);
  });
});
