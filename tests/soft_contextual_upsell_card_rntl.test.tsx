import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const ReactForMock = require('react');
  const ModalMock = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => (
    visible ? ReactForMock.createElement('Modal', null, children) : null
  );
  return { __esModule: true, default: ModalMock };
});
jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: { View: 'AnimatedView' },
    cancelAnimation: jest.fn(),
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ f: { body: 17, caption: 14, label: 16 } }) }));

import type SoftContextualUpsellCardType from '../components/SoftContextualUpsellCard';

let SoftContextualUpsellCard: typeof SoftContextualUpsellCardType;
beforeAll(() => {
  SoftContextualUpsellCard = require('../components/SoftContextualUpsellCard').default;
});

const opportunity = {
  trigger: 'weekly_review' as const,
  value: 1,
  studyTarget: 'en' as const,
  context: 'weekly_review' as const,
  destination: 'paywall' as const,
  milestoneId: 'weekly_review:1:en',
};

function card(overrides: Partial<React.ComponentProps<typeof SoftContextualUpsellCard>> = {}) {
  return (
    <SoftContextualUpsellCard
      visible
      presentation="modal"
      proof="ТВОЯ НЕДЕЛЯ В ЦИФРАХ"
      title="Неделя уже показала результат"
      body="Plus построит один понятный персональный маршрут."
      ctaLabel="Открыть мой маршрут"
      dismissLabel="Не сейчас"
      dismissAccessibilityLabel="Не сейчас"
      dismissAccessibilityHint="Закрыть"
      ctaAccessibilityLabel="Открыть мой маршрут"
      ctaAccessibilityHint="Открыть Premium"
      opportunity={opportunity}
      onImpression={jest.fn()}
      onDismiss={jest.fn()}
      onCta={jest.fn()}
      {...overrides}
    />
  );
}

test('renders the result-led modal and emits one impression', async () => {
  const onImpression = jest.fn();
  const screen = await render(card({ onImpression }));
  expect(screen.getByText('Неделя уже показала результат')).toBeTruthy();
  expect(screen.getByText('Открыть мой маршрут')).toBeTruthy();
  await fireEvent(screen.getByTestId('soft-upsell-card'), 'layout', {
    nativeEvent: { layout: { width: 360, height: 480 } },
  });
  await waitFor(() => expect(onImpression).toHaveBeenCalledTimes(1));
});

test('CTA and dismiss actions are independently idempotent', async () => {
  let releaseCta!: (accepted: boolean) => void;
  const onCta = jest.fn(() => new Promise<boolean>((resolve) => { releaseCta = resolve; }));
  const onDismiss = jest.fn();
  const screen = await render(card({ onCta, onDismiss }));
  await fireEvent.press(screen.getByLabelText('Открыть мой маршрут'));
  await fireEvent.press(screen.getByLabelText('Открыть мой маршрут'));
  expect(onCta).toHaveBeenCalledTimes(1);
  await act(async () => { releaseCta(false); await Promise.resolve(); });
  const dismiss = screen.getAllByLabelText('Не сейчас').at(-1)!;
  await fireEvent.press(dismiss);
  await fireEvent.press(dismiss);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
