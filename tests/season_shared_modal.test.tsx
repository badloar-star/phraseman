import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SeasonExpandedCard, { type SeasonExpandedCardProps } from '../components/learning-v2/season/SeasonExpandedCard';
import LearningV2CourseScreen from '../app/learning-v2/course';

jest.unmock('react-native');

const mockDismissTo = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissTo: mockDismissTo, replace: mockReplace }),
  useLocalSearchParams: () => ({ result: 'l1:s1', stars: '3' }),
  // перепин 28.10 (b9773b2ca): экран курса ждёт готовности корневой навигации — в тесте она готова сразу
  useRootNavigationState: () => ({ key: 'root' }),
}));
// перепин 28.10 (b9773b2ca): переход откладывается до конца взаимодействий — здесь проверяем КУДА, а не когда
jest.mock('../app/paywall_navigation', () => ({
  scheduleAfterRootNavigationReady: (navigate: () => void) => {
    navigate();
    return { cancel: () => undefined };
  },
}));
jest.mock('../app/navigation_back', () => ({
  dismissToTabRoute: (router: { dismissTo: (route: string) => void }, route: string) => router.dismissTo(route),
}));
jest.mock('../app/learning_v2_visibility_switch', () => ({
  isLearningV2Hidden: () => false,
}));

jest.mock('../components/LearningV2SessionOutcomeSheet', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  return { __esModule: true, default: (p: React.ComponentProps<typeof import('../components/LearningV2SessionOutcomeSheet').default>) => (
    <View testID="shared-sheet" {...p}>
      <Pressable testID="primary" onPress={p.onPrimaryPress}><Text>{p.primaryLabel}</Text></Pressable>
      {p.secondaryLabel ? <Pressable testID="secondary" onPress={p.onSecondaryPress}><Text>{p.secondaryLabel}</Text></Pressable> : null}
      <Pressable testID="close" onPress={p.onClose} />
    </View>
  ) };
});

function props(): SeasonExpandedCardProps {
  return {
    kind: 'exam', dark: true, art: {} as SeasonExpandedCardProps['art'], glyph: 'trophy',
    chipLabel: 'Exam', rightLabel: null, phrase: 'Chapter exam', translation: 'Description',
    title: null, words: [], primary: { label: 'Start', onPress: jest.fn() },
    secondary: { label: 'Later', onPress: jest.fn() }, closeLabel: 'Close', onClose: jest.fn(),
    reducedMotion: true, exam: { facts: ['12 questions'], energyBadge: true, plusLine: null },
  };
}

it('available exam uses shared sheet, preserves price, facts and each action', async () => {
  const p = props();
  await render(<SeasonExpandedCard {...p} />);
  const sheet = screen.getByTestId('shared-sheet').props;
  expect(sheet.icon).toBe('trophy');
  expect(sheet.message).toBe('Description\n12 questions');
  expect(sheet.primaryLabel).toContain('1');
  await fireEvent.press(screen.getByTestId('primary'));
  expect(p.primary!.onPress).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('secondary'));
  expect(p.secondary!.onPress).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('close'));
  expect(p.onClose).toHaveBeenCalledTimes(1);
});

it.each(['checkmark', 'time-outline'] as const)('passed/cooldown icon %s and close-only action remain usable', async (sealIcon) => {
  const p = { ...props(), primary: null, exam: null, sealIcon };
  await render(<SeasonExpandedCard {...p} />);
  expect(screen.getByTestId('shared-sheet').props.icon).toBe(sealIcon);
  expect(screen.queryByTestId('secondary')).toBeNull();
  await fireEvent.press(screen.getByTestId('primary'));
  expect(p.secondary!.onPress).toHaveBeenCalledTimes(1);
});

it('course link dismisses the duplicate hub to the lessons tab and preserves result parameters', async () => {
  await render(<LearningV2CourseScreen />);
  expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/lessons?result=l1%3As1&stars=3&courseEntry=v2');
  expect(mockReplace).not.toHaveBeenCalled();
});
