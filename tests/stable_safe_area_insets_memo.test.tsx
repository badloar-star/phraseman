// зачем (координатор 15.10, замер каскада вкладок cfe9e5cc2): useStableSafeAreaInsets отдавал НОВЫЙ объект на каждый рендер, и у 145
// потребителей это ломало memo/useMemo-зависимости и множило перерисовки. Сторож: при тех же числах — та же ссылка; при новых числах — новый
// объект с новыми значениями; «стабилизация» верха и низа (не меньше стартовых метрик) сохранена.
import React from 'react';
import { act, render } from '@testing-library/react-native';

// tests/__mocks__/react-native.js — заглушка для логических тестов; рендеру нужен настоящий модуль (как в friend_list_row).
jest.unmock('react-native');

const mockSafe = { insets: { top: 10, bottom: 0, left: 0, right: 0 } };
jest.mock('react-native-safe-area-context', () => ({
  initialWindowMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, bottom: 16, left: 0, right: 0 } },
  // худший случай: провайдер без мемоизации отдаёт новый объект на каждый вызов
  useSafeAreaInsets: () => ({ ...mockSafe.insets }),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { statusBarHeight: 24 } }));

import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

const seen: ReturnType<typeof useStableSafeAreaInsets>[] = [];
function Probe({ tick }: { tick: number }) {
  seen.push(useStableSafeAreaInsets());
  return tick >= 0 ? null : null;
}

beforeEach(() => {
  seen.length = 0;
  mockSafe.insets = { top: 10, bottom: 0, left: 0, right: 0 };
});

describe('useStableSafeAreaInsets keeps one reference while the numbers are the same', () => {
  it('re-render with the same insets returns the very same object', async () => {
    const view = await render(<Probe tick={0} />);
    await act(async () => { view.rerender(<Probe tick={1} />); });
    await act(async () => { view.rerender(<Probe tick={2} />); });
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).toBe(seen[0]);
  });

  it('new numbers give a new object with the new values', async () => {
    const view = await render(<Probe tick={0} />);
    mockSafe.insets = { top: 10, bottom: 0, left: 5, right: 7 };
    await act(async () => { view.rerender(<Probe tick={1} />); });
    const last = seen[seen.length - 1];
    expect(last).not.toBe(seen[0]);
    expect(last).toEqual({ top: 24, right: 7, bottom: 16, left: 5 });
  });

  it('keeps the stabilisation: top and bottom never below the start metrics, larger native values win', async () => {
    const view = await render(<Probe tick={0} />);
    expect(seen[0]).toEqual({ top: 24, right: 0, bottom: 16, left: 0 });
    mockSafe.insets = { top: 48, bottom: 34, left: 0, right: 0 };
    await act(async () => { view.rerender(<Probe tick={1} />); });
    expect(seen[seen.length - 1]).toEqual({ top: 48, right: 0, bottom: 34, left: 0 });
  });
});
