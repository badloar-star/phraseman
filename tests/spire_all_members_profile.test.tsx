import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SpireAllMembers from '../components/spire/SpireAllMembers';
import type { SpireMemberRow } from '../components/spire/spire_room_types';

jest.unmock('react-native');
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../components/spire/SpireRankCoin', () => () => null);
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({}) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('../components/v2/ScreenBackButton', () => ({
  __esModule: true, default: () => null, SCREEN_BACK_RESERVED: 60, SCREEN_BACK_SIZE: 44,
  ScreenOriginReset: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../components/v2/V2Pressable', () => {
  const React = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return ({ scaleTo: _scale, ...props }: Record<string, unknown>) => React.createElement(Pressable, props);
});
jest.mock('../components/spire/scene/SpirePlayerCard', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return ({ player, onClose }: { player: unknown; onClose: () => void }) => player
    ? React.createElement(Pressable, { testID: 'profile-close', onPress: onClose },
      React.createElement(Text, { testID: 'profile-data' }, JSON.stringify(player))) : null;
});

const members: SpireMemberRow[] = [
  { uid: 'other', name: 'Друг', steps: 30, weekCoins: 70, isMe: false, coinRank: 4, isPremium: true },
  { uid: 'me', name: 'Я', steps: 12, weekCoins: 20, isMe: true, coinRank: 2 },
  { uid: 'res_1', name: 'Участник', steps: 0, isMe: false },
];

describe('All participants profile cards', () => {
  it.each(['steps', 'coins'] as const)('opens every row and returns to the list (%s)', async (rankBy) => {
    const onBack = jest.fn();
    const screen = await render(<SpireAllMembers lang="ru" members={members} rankBy={rankBy} onBack={onBack} />);
    for (const member of members) {
      await fireEvent.press(screen.getByTestId(`spire-all-member-${member.uid}`));
      expect(JSON.parse(screen.getByTestId('profile-data').props.children)).toEqual({
        uid: member.uid, name: member.name, isMe: member.isMe,
        points: rankBy === 'coins' ? member.weekCoins ?? 0 : member.steps,
        coinRank: member.coinRank ?? null, isPremium: member.isPremium === true,
      });
      await fireEvent.press(screen.getByTestId('profile-close'));
      expect(screen.queryByTestId('profile-data')).toBeNull();
      expect(screen.getByTestId('spire-all-screen')).toBeTruthy();
    }
    expect(onBack).not.toHaveBeenCalled();
  });
});
