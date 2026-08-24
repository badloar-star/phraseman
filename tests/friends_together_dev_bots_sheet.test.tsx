import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DevBotsSheet from '../components/friends_together/DevBotsSheet';
import type { DevBotFriend } from '../app/friends_together/dev_bots';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));

jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockHybridSheetShell({ visible, children, testID }: any) {
    return (
    visible ? React.createElement(View, { testID }, children) : null
    );
  };
});

jest.mock('../components/TapScale', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return function MockTapScale({ children, onPress, ...props }: any) {
    return React.createElement(Pressable, { onPress, ...props }, children);
  };
});

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#345', bgSurface: '#eee', textPrimary: '#111', textGhost: '#777',
      textSecond: '#555', wrong: '#900', gold: '#875b00', goldBg: '#fff0bd',
      correct: '#064', correctBg: '#dff7e8', accentBg: '#e6eefc',
    },
    f: { body: 14, caption: 12 },
    ds: { fontFamily: undefined },
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const MockIonicon = () => null;
  (MockIonicon as any).glyphMap = {};
  return MockIonicon;
});

const BOT: DevBotFriend = {
  uid: 'devbot_test_1',
  name: 'Ada',
  colorIdx: 0,
  totalXp: 1000,
  weeklyXp: 500,
  streak: 3,
  days: 3,
  learnedToday: false,
  giftReady: false,
  incomingNudge: false,
  nudgedByMe: false,
  createdAtMs: 1,
};

function Harness() {
  const [bots, setBots] = useState<DevBotFriend[]>([]);
  return (
    <DevBotsSheet
      visible
      onClose={() => undefined}
      bots={bots}
      onAddBots={() => setBots([BOT])}
      onAdvanceAll={() => setBots((current) => current.map((bot) => ({ ...bot, learnedToday: true })))}
      onAdvanceOne={(uid) => setBots((current) => current.map((bot) => bot.uid === uid ? { ...bot, days: bot.days + 1, learnedToday: true } : bot))}
      onChestTier={() => undefined}
      onIncomingNudge={(uid) => setBots((current) => current.map((bot) => bot.uid === uid ? { ...bot, incomingNudge: true } : bot))}
      onGiftReady={(uid) => setBots((current) => current.map((bot) => bot.uid === uid ? { ...bot, giftReady: true } : bot))}
      onResetChest={() => undefined}
      onReset={() => setBots([])}
    />
  );
}

describe('DevBotsSheet interaction', () => {
  it('adds a bot and exposes visible state changes for every per-bot scenario', async () => {
    const screen = await render(<Harness />);

    await fireEvent.press(screen.getByTestId('dev-bots-add-3'));
    expect(screen.getByTestId('dev-bot-card-devbot_test_1')).toBeTruthy();
    expect(screen.getByText('Ada · 3d · 500 XP')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ada: +1 day'));
    expect(screen.getByTestId('dev-bot-today-devbot_test_1')).toBeTruthy();
    expect(screen.getByText('Ada · 4d · 500 XP')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ada: nudges me'));
    expect(screen.getByTestId('dev-bot-incoming-devbot_test_1')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ada: gift ready'));
    expect(screen.getByTestId('dev-bot-gift-devbot_test_1')).toBeTruthy();
  });

  it('offers a dedicated explicit chest reset', async () => {
    const screen = await render(<Harness />);
    expect(screen.getByTestId('dev-bots-chest-reset')).toBeTruthy();
    expect(screen.getByText('Сбросить сундук')).toBeTruthy();
  });
});
