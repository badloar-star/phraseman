/* eslint-disable import/first */
jest.unmock('react-native');

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, userEvent } from '@testing-library/react-native';

import FriendTogetherSheet, { friendshipLevelName } from '../components/friends_together/FriendTogetherSheet';

let mockLang = 'ru';
const mockPressableProps: Record<string, any> = {};

jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const mockReact = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return ({ visible, children, testID }: any) => visible ? mockReact.createElement(NativeView, { testID }, children) : null;
});

jest.mock('../components/PressableHybrid', () => {
  const mockReact = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, disabled, testID, accessibilityRole, accessibilityLabel, accessibilityState, style, variant }: any) => {
      if (testID) mockPressableProps[testID] = { disabled, testID, accessibilityRole, accessibilityLabel, accessibilityState, style, variant };
      return mockReact.createElement(Pressable, { onPress, disabled, testID, accessibilityRole, accessibilityLabel, accessibilityState, style }, children);
    },
  };
});

jest.mock('../components/AvatarView', () => {
  const mockReact = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return { __esModule: true, default: () => mockReact.createElement(NativeView, { testID: 'friend-sheet-avatar' }) };
});

jest.mock('../components/text-integrity', () => {
  const mockReact = jest.requireActual('react');
  const { Text: NativeText } = jest.requireActual('react-native');
  return { FlowText: ({ children, ...props }: any) => mockReact.createElement(NativeText, props, children) };
});

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { accent: '#C8FF00', accentBg: '#E8FFC0', gold: '#D9A400', goldBg: '#FFF1B0', bgSurface2: '#EFEFEF', textPrimary: '#111111', textSecond: '#555555', textMuted: '#777777', wrongBg: '#FDE2E2', wrong: '#9D1A1A' },
    f: { h3: 20, body: 16, sub: 14 },
  }),
}));

jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLang }) }));
jest.mock('../constants/i18n', () => ({ triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));

function props(overrides: Record<string, unknown> = {}) {
  return {
    visible: true, onClose: jest.fn(), friendName: 'Друг', friendUid: 'friend-1', friendAvatar: 'friend', friendTotalXp: 900, myAvatar: 'me', myTotalXp: 1200,
    weeklyXp: 120, streak: 7, rank: 2, highFived: false,
    together: { days: 14, level: 2, progressPercent: 66, nextLevelName: 'Напарники', nudged: false, learnedToday: false, incomingNudge: true, giftReady: true },
    onNudge: jest.fn(), onGift: jest.fn(), onHighFive: jest.fn(), onDuel: jest.fn(), onDelete: jest.fn(),
    ...overrides,
  };
}

describe('FriendTogetherSheet', () => {
  beforeEach(() => {
    mockLang = 'ru';
    Object.keys(mockPressableProps).forEach((key) => delete mockPressableProps[key]);
  });

  test('renders the complete together surface and invokes every available action', async () => {
    const value = props();
    const user = userEvent.setup();
    const screen = await render(<FriendTogetherSheet {...value} />);

    expect(screen.getByTestId('friend-together-sheet-weekly-xp')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-streak')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-rank')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-status-nudge')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-status-gift')).toBeTruthy();

    for (const id of ['nudge', 'gift', 'high-five', 'duel', 'delete']) {
      const action = screen.getByTestId(`friend-together-sheet-${id}`);
      const actionStyle = StyleSheet.flatten(action.props.style);
      expect(actionStyle.minHeight).toBeGreaterThanOrEqual(52);
      expect(actionStyle.width).toBe('100%');
      await user.press(action);
    }
    expect(mockPressableProps['friend-together-sheet-nudge'].variant).toBe('primary');
    expect(StyleSheet.flatten(mockPressableProps['friend-together-sheet-nudge'].style).backgroundColor).toBe('#C8FF00');
    expect(StyleSheet.flatten(screen.getByTestId('friend-together-sheet-nudge-label').props.style).color).toBe('#07110A');

    expect(value.onNudge).toHaveBeenCalledTimes(1);
    expect(value.onGift).toHaveBeenCalledTimes(1);
    expect(value.onHighFive).toHaveBeenCalledTimes(1);
    expect(value.onDuel).toHaveBeenCalledTimes(1);
    expect(value.onDelete).toHaveBeenCalledTimes(1);
  });

  test('omits together-only content and nudge when no together model exists', async () => {
    const screen = await render(<FriendTogetherSheet {...props({ together: null, onNudge: null, onDuel: null })} />);
    expect(screen.queryByTestId('friend-together-sheet-progress')).toBeNull();
    expect(screen.queryByTestId('friend-together-sheet-nudge')).toBeNull();
    expect(screen.queryByTestId('friend-together-sheet-together-hero')).toBeNull();
    expect(screen.getByTestId('friend-together-sheet-gift')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-high-five')).toBeTruthy();
    expect(screen.getByTestId('friend-together-sheet-delete')).toBeTruthy();
  });

  test('disables nudge with a distinct already-studied-today label', async () => {
    const screen = await render(<FriendTogetherSheet {...props({ together: { days: 14, level: 2, progressPercent: 66, nextLevelName: 'Напарники', nudged: false, learnedToday: true, incomingNudge: false, giftReady: false } })} />);
    const action = screen.getByTestId('friend-together-sheet-nudge');
    expect(action.props.accessibilityState.disabled).toBe(true);
    expect(action.props.accessibilityLabel).toBe('Вы уже занимались сегодня');
    expect(mockPressableProps['friend-together-sheet-nudge'].variant).toBe('secondary');
    expect(StyleSheet.flatten(mockPressableProps['friend-together-sheet-nudge'].style).backgroundColor).toBe('#EFEFEF');
    expect(StyleSheet.flatten(screen.getByTestId('friend-together-sheet-nudge-label').props.style).color).toBe('#555555');
  });

  test('localizes current and next friendship levels without leaking caller copy', async () => {
    mockLang = 'es';
    const screen = await render(<FriendTogetherSheet {...props()} />);
    expect(screen.getByTestId('friend-together-sheet-level')).toHaveTextContent('Compañeros');
    expect(screen.getByTestId('friend-together-sheet-next-level')).toHaveTextContent('Amigos');
    expect(screen.queryByText('Приятели')).toBeNull();
    expect(screen.queryByText('Друзья')).toBeNull();
  });

  test('returns level copy in another locale through the focused helper', () => {
    expect(friendshipLevelName(5, 'pl' as any)).toBe('Najlepsi przyjaciele');
  });
});
