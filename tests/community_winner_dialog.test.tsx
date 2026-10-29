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
  expect(screen.getByText('Pack of the month · November')).toBeTruthy();
});

it('shows the month name instead of the server month key', async () => {
  await render(<CommunityWinnerDialog winner={{ ...winner, monthId: '2026-10' }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText('Набор месяца · октябрь')).toBeTruthy();
  expect(screen.queryByText('Набор месяца · 2026-10')).toBeNull();
});

// Владелец 29.10: места 1/2/3 = Plus на 3/2/1 месяца, монет за места нет.
it.each([[1, 'Plus на 3 месяца'], [2, 'Plus на 2 месяца'], [3, 'Plus на 1 месяц']] as const)('shows the reward for place %s', async (place, reward) => {
  await render(<CommunityWinnerDialog winner={{ ...winner, place }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(reward)).toBeTruthy();
  expect(screen.queryByText(/монет/)).toBeNull();
});

it.each([[1, 'Plus for 3 months'], [2, 'Plus for 2 months'], [3, 'Plus for 1 month']] as const)('English reward for place %s', async (place, reward) => {
  mockLanguage = 'en';
  await render(<CommunityWinnerDialog winner={{ ...winner, place }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(reward)).toBeTruthy();
});

it('lifetime Plus (plusMonths 0 from the server story): no Plus line, the congratulation and the button stay', async () => {
  await render(<CommunityWinnerDialog winner={{ ...winner, place: 2, plusMonths: 0 }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.queryByText(/Plus на/)).toBeNull();
  expect(screen.queryByText(/монет/)).toBeNull();
  expect(screen.getByText('Поздравляем!')).toBeTruthy();
  expect(screen.getByText('Забрать приз')).toBeTruthy();
});

it('the server-granted months win over the place table (story value plusMonths)', async () => {
  await render(<CommunityWinnerDialog winner={{ ...winner, place: 3, plusMonths: 2 }} onClaim={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText('Plus на 2 месяца')).toBeTruthy();
});

it('reward text helper: table by place, server months override, lifetime gives no line', () => {
  // communityWinnerRewardText читает contestPrize; монетная ветка нужна только для квитанций, которых новый contestPrize уже не создаёт
  const { communityWinnerRewardText } = jest.requireActual('../components/packs/CommunityWinnerDialog') as typeof import('../components/packs/CommunityWinnerDialog');
  expect(communityWinnerRewardText({ place: 1 }, 'ru')).toBe('Plus на 3 месяца');
  expect(communityWinnerRewardText({ place: 2, plusMonths: 0 }, 'ru')).toBeNull();
  expect(communityWinnerRewardText({ place: 3, plusMonths: 1 }, 'ru')).toBe('Plus на 1 месяц');
  expect(communityWinnerRewardText({ place: 2, plusMonths: 7 }, 'ru')).toBeNull(); // сроков, которых нет у конкурса, не выдумываем
});

it('every dialog text exists in all 9 languages and no placeholder leaks into the result', () => {
  const { COMMUNITY_WINNER_TEXTS, winnerText } = jest.requireActual('../components/packs/community_winner_strings') as typeof import('../components/packs/community_winner_strings');
  const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  for (const key of Object.keys(COMMUNITY_WINNER_TEXTS) as Array<keyof typeof COMMUNITY_WINNER_TEXTS>) {
    for (const lang of langs) {
      const out = winnerText(lang, key, { n: 2, title: 'Слова' });
      expect([key, lang, out.trim().length > 0]).toEqual([key, lang, true]);
      expect([key, lang, /[{}]/.test(out)]).toEqual([key, lang, false]);
    }
  }
  expect(winnerText('es', 'plus2')).toBe('Plus por 2 meses');
  expect(winnerText('pl', 'claim')).toBe('Odbierz nagrodę');
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
