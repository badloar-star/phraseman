import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';

import PremiumModalDispatcher from '../app/premium_modal';

const mockDismiss = jest.fn();
let mockAccessResolved = false;
let mockHasPremiumAccess = false;
let mockParams: Record<string, string> = { context: 'generic', source: 'direct' };
let mockPaywallCEntry: unknown = null;

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    },
  },
  StyleSheet: { create: (styles: unknown) => styles },
  View: 'View',
  // premium_modal → paywall_close_trace → config читает Platform.OS при загрузке (сьют падал «Cannot read … OS»)
  Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android ?? spec.default },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'pw-test-impression' }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRootNavigationState: () => ({ key: 'root-ready' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../components/SafeLinearGradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('../components/PremiumContext', () => ({
  usePremium: () => ({ accessResolved: mockAccessResolved, hasPremiumAccess: mockHasPremiumAccess }),
}));
jest.mock('../app/navigation_back', () => ({
  dismissPaywallModal: (...args: unknown[]) => mockDismiss(...args),
}));
// 2026-09-30 (D78): пейволы A–G удалены — диспетчер рисует единственный пейвол Plus.
jest.mock('../components/paywall/PaywallPlusScreen', () => ({
  __esModule: true,
  default: function PaywallPlusMock(props: { entry?: unknown }) {
    mockPaywallCEntry = props.entry ?? null;
    return React.createElement('PaywallPlus');
  },
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { bgPrimary: '#000000', bgSurface: '#111111' } }),
}));
jest.mock('../app/paywall_navigation', () => ({
  openPremiumPaywall: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockAccessResolved = false;
  mockHasPremiumAccess = false;
  mockParams = { context: 'generic', source: 'direct' };
  mockPaywallCEntry = null;
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

test('premium modal waits for entitlement, shows only to free, and dismisses Plus without a flash', async () => {
  const view = await render(React.createElement(PremiumModalDispatcher));
  expect(JSON.stringify(view.toJSON())).not.toContain('PaywallPlus');
  // зачем (владелец 11.10, «Шторка»): пока решается доступ, маршрут прозрачный — видно прежний экран, а не сплошной фон.
  expect(JSON.stringify(view.toJSON())).toContain('"type":"View"');
  expect(mockDismiss).not.toHaveBeenCalled();

  mockAccessResolved = true;
  await view.rerender(React.createElement(PremiumModalDispatcher));
  await act(async () => Promise.resolve());
  expect(JSON.stringify(view.toJSON())).toContain('PaywallPlus');
  expect(mockPaywallCEntry).toEqual({
    context: 'generic',
    source: 'direct',
    creativeRevision: 'revenue-vnext-2026-09-12-r1',
    impressionId: 'pw-test-impression',
    entitlementState: 'free',
  });
  expect(mockDismiss).not.toHaveBeenCalled();

  mockHasPremiumAccess = true;
  await view.rerender(React.createElement(PremiumModalDispatcher));
  expect(JSON.stringify(view.toJSON())).not.toContain('PaywallPlus');
  act(() => jest.runAllTimers());
  expect(mockDismiss).toHaveBeenCalledTimes(1);
});
