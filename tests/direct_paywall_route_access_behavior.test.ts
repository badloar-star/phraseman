import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';

import DirectPaywallRoute from '../app/direct_paywall_route';

const mockDismiss = jest.fn();
let mockAccessResolved = false;
let mockHasPremiumAccess = false;
let mockParams: Record<string, string> = { context: 'generic', source: 'direct' };

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    },
  },
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'direct-paywall-impression' }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRootNavigationState: () => ({ key: 'root-ready' }),
  useRouter: () => ({ dismiss: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/PremiumContext', () => ({
  usePremium: () => ({ accessResolved: mockAccessResolved, hasPremiumAccess: mockHasPremiumAccess }),
}));
jest.mock('../app/navigation_back', () => ({
  dismissPaywallModal: (...args: unknown[]) => mockDismiss(...args),
}));
jest.mock('../app/paywall_navigation', () => ({
  scheduleAfterRootNavigationReady: (callback: () => void) => {
    const timer = setTimeout(callback, 0);
    return { cancel: () => clearTimeout(timer) };
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockAccessResolved = false;
  mockHasPremiumAccess = false;
  mockParams = { context: 'generic', source: 'direct' };
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

test('direct A–G boundary waits unresolved, renders typed Free entry, and dismisses paid without a flash', async () => {
  const renderEntry = jest.fn((entry) => React.createElement('PaywallView', { entry }));
  const view = await render(React.createElement(DirectPaywallRoute, { render: renderEntry }));

  expect(renderEntry).not.toHaveBeenCalled();
  expect(JSON.stringify(view.toJSON())).toContain('LinearGradient');
  expect(mockDismiss).not.toHaveBeenCalled();

  mockAccessResolved = true;
  await view.rerender(React.createElement(DirectPaywallRoute, { render: renderEntry }));
  expect(renderEntry).toHaveBeenCalledWith({
    context: 'generic',
    source: 'direct',
    creativeRevision: 'revenue-vnext-2026-09-12-r1',
    impressionId: 'direct-paywall-impression',
    entitlementState: 'free',
  });
  expect(JSON.stringify(view.toJSON())).toContain('PaywallView');

  renderEntry.mockClear();
  mockHasPremiumAccess = true;
  await view.rerender(React.createElement(DirectPaywallRoute, { render: renderEntry }));
  expect(renderEntry).not.toHaveBeenCalled();
  expect(JSON.stringify(view.toJSON())).not.toContain('PaywallView');
  act(() => jest.runAllTimers());
  expect(mockDismiss).toHaveBeenCalledTimes(1);
});
