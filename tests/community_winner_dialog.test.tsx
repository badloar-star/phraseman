import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { CommunityWinnerDialog, type CommunityWinner } from '../components/packs/CommunityWinnerDialog';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Modal: 'Modal', ScrollView: 'ScrollView',
  Platform: { OS: 'android' },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
  AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove: jest.fn() }) },
}));
jest.mock('react-native-reanimated', () => {
  const animation = { delay: () => animation, duration: () => animation };
  return { __esModule: true, default: { View: 'View' }, FadeInDown: animation, Keyframe: class { duration() { return animation; } }, Easing: { out: () => undefined, cubic: undefined } };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/packs/CommunityAwardDecoration', () => ({ CommunityAwardConfetti: () => null, CommunityAwardRays: () => null }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'View' }));
jest.mock('../components/KitTouchable', () => ({ KitTouchable: 'Pressable' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'grad_midnight' }) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));

let mockLanguage = 'ru';
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLanguage }) }));

const winner: CommunityWinner = { monthId: '2026-11', packTitle: 'Полезные слова', place: 1, claimed: false };
afterEach(async () => { await cleanup(); mockLanguage = 'ru'; });

it('preserves the released English reward and action labels', async () => {
  mockLanguage = 'en';
  await render(<CommunityWinnerDialog winner={winner} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText('Plus for 3 months')).toBeTruthy();
  expect(screen.getByText('Congratulations!')).toBeTruthy();
  expect(screen.getByText('Claim prize')).toBeTruthy();
  expect(screen.getByText('Later')).toBeTruthy();
});

it.each([[1, 'Plus на 3 месяца'], [2, '2000 монет'], [3, '1000 монет']] as const)('shows the reward for place %s', async (place, reward) => {
  await render(<CommunityWinnerDialog winner={{ ...winner, place }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(reward)).toBeTruthy();
});

it('allows retry after a failed request and prevents duplicate requests while pending', async () => {
  let complete!: () => void;
  const onClaim = jest.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
  await render(<CommunityWinnerDialog winner={winner} onClaim={onClaim} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByText('Забрать приз'));
  expect(screen.getByText('Приз сохранён. Не удалось получить подтверждение — попробуй ещё раз.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Повторить'));
  await fireEvent.press(screen.getByText('Получаем награду…'));
  expect(onClaim).toHaveBeenCalledTimes(2);
  await act(async () => { complete(); });
  expect(screen.getByText('Забрать приз')).toBeTruthy();
});

it('closes an already claimed reward without requesting it again', async () => {
  const onClaim = jest.fn(); const onClose = jest.fn();
  await render(<CommunityWinnerDialog winner={{ ...winner, claimed: true }} onClaim={onClaim} onClose={onClose} />);
  await fireEvent.press(screen.getByText('Отлично!'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onClaim).not.toHaveBeenCalled();
});
