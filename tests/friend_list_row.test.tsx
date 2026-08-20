import fs from 'fs';
import path from 'path';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import FriendListRow from '../components/friends_together/FriendListRow';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgSurface: '#ffffff',
      textPrimary: '#111111',
      textSecond: '#555555',
      textMuted: '#777777',
    },
  }),
}));

jest.mock('../components/LangContext', () => ({
  useLang: () => ({ lang: 'ru' }),
}));

jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));

jest.mock('../components/AvatarView', () => {
  const mockReact = jest.requireActual('react');
  return function MockAvatarView() {
    return mockReact.createElement('View', { testID: 'friend-avatar' });
  };
});

jest.mock('../components/text-integrity', () => {
  const mockReact = jest.requireActual('react');
  return {
    FlowText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const mockReact = jest.requireActual('react');
  return function MockIonicon(props: any) {
    return mockReact.createElement('View', props);
  };
});

describe('FriendListRow', () => {
  const props = {
    friendUid: 'friend-1',
    friendName: 'Очень длинное имя друга, которое должно переноситься без обрезания',
    avatar: '1',
    totalXp: 2400,
    auraId: 'aura-1',
    daysTogether: 14,
    onOpenProfile: jest.fn(),
    onOpenDetails: jest.fn(),
  };

  beforeEach(() => {
    props.onOpenProfile.mockClear();
    props.onOpenDetails.mockClear();
  });

  it('keeps profile and details controls independent while showing only the minimal friend identity', async () => {
    const screen = await render(<FriendListRow {...props} />);
    const avatarTarget = screen.getByTestId('friend-row-avatar-friend-1');
    const bodyTarget = screen.getByTestId('friend-row-body-friend-1');

    await fireEvent.press(avatarTarget);
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);
    expect(props.onOpenDetails).not.toHaveBeenCalled();

    await fireEvent.press(bodyTarget);
    expect(props.onOpenDetails).toHaveBeenCalledTimes(1);
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);

    expect(screen.getByText(props.friendName)).toBeTruthy();
    expect(screen.getByText('14 дней вместе')).toBeTruthy();
    expect(screen.queryByTestId('friend-row-actions-friend-1')).toBeNull();
    expect(avatarTarget.props.accessibilityRole).toBe('button');
    expect(bodyTarget.props.accessibilityRole).toBe('button');
  });

  it('preserves reflow and keeps action controls out of the source', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'friends_together', 'FriendListRow.tsx'),
      'utf8',
    );

    expect(source).not.toContain('numberOfLines');
    expect(source).toContain('minWidth: 0');
    expect(source).not.toContain('friend-row-actions-');
  });
});
