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
jest.mock('../app/paywall_a', () => ({ PaywallAView: function PaywallAMock() { return React.createElement('PaywallA'); } }));
jest.mock('../app/paywall_b', () => ({ PaywallBView: function PaywallBMock() { return React.createElement('PaywallB'); } }));
jest.mock('../app/paywall_c', () => ({ PaywallCView: function PaywallCMock(props: { entry?: unknown }) {
  mockPaywallCEntry = props.entry ?? null;
  return React.createElement('PaywallC');
} }));
jest.mock('../app/paywall_d', () => ({ PaywallDView: function PaywallDMock() { return React.createElement('PaywallD'); } }));
jest.mock('../app/paywall_e', () => ({ PaywallEView: function PaywallEMock() { return React.createElement('PaywallE'); } }));
jest.mock('../app/paywall_f', () => ({ PaywallFView: function PaywallFMock() { return React.createElement('PaywallF'); } }));
jest.mock('../app/paywall_g', () => ({ PaywallGView: function PaywallGMock() { return React.createElement('PaywallG'); } }));
jest.mock('../app/paywall_navigation', () => ({
  openPremiumPaywall: jest.fn(),
  resolveCurrentPaywallRoute: () => '/paywall_c',
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
  expect(JSON.stringify(view.toJSON())).not.toContain('PaywallC');
  expect(JSON.stringify(view.toJSON())).toContain('LinearGradient');
  expect(mockDismiss).not.toHaveBeenCalled();

  mockAccessResolved = true;
  await view.rerender(React.createElement(PremiumModalDispatcher));
  await act(async () => Promise.resolve());
  expect(JSON.stringify(view.toJSON())).toContain('PaywallC');
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
  expect(JSON.stringify(view.toJSON())).not.toContain('PaywallC');
  act(() => jest.runAllTimers());
  expect(mockDismiss).toHaveBeenCalledTimes(1);
});
