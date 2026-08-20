import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, userEvent } from '@testing-library/react-native';

import FriendListRow, { formatFriendRelationship } from '../components/friends_together/FriendListRow';

jest.unmock('react-native');

let mockLang = 'ru';

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgSurface: '#ffffff',
      textPrimary: '#111111',
      textSecond: '#555555',
      textMuted: '#777777',
    },
    f: { body: 15, sub: 13 },
  }),
}));

jest.mock('../components/LangContext', () => ({
  useLang: () => ({ lang: mockLang }),
}));

jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));

jest.mock('../components/AvatarView', () => {
  const mockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => mockReact.createElement(View, { testID: 'friend-avatar' }),
  };
});

jest.mock('../components/text-integrity', () => {
  const mockReact = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    FlowText: ({ children, ...props }: any) => mockReact.createElement(Text, props, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: () => null,
}));

const LOCALES = [
  { lang: 'ru', neutral: 'В друзьях', one: '1 день вместе', few: '2 дня вместе', many: '14 дней вместе', profile: 'Открыть профиль Друг', details: 'Открыть детали дружбы с Друг' },
  { lang: 'uk', neutral: 'У друзях', one: '1 день разом', few: '2 дні разом', many: '14 днів разом', profile: 'Відкрити профіль Друг', details: 'Відкрити деталі дружби з Друг' },
  { lang: 'es', neutral: 'En tus amistades', one: '1 día de amistad', few: '2 días de amistad', many: '14 días de amistad', profile: 'Abrir el perfil de Друг', details: 'Abrir detalles de amistad con Друг' },
  { lang: 'pt-BR', neutral: 'Na sua lista de amizades', one: '1 dia de amizade', few: '2 dias de amizade', many: '14 dias de amizade', profile: 'Abrir o perfil de Друг', details: 'Abrir detalhes da amizade com Друг' },
  { lang: 'vi', neutral: 'Trong danh sách bạn bè', one: '1 ngày cùng nhau', few: '2 ngày cùng nhau', many: '14 ngày cùng nhau', profile: 'Mở hồ sơ của Друг', details: 'Mở chi tiết tình bạn với Друг' },
  { lang: 'id', neutral: 'Dalam daftar teman', one: '1 hari bersama', few: '2 hari bersama', many: '14 hari bersama', profile: 'Buka profil Друг', details: 'Buka detail pertemanan dengan Друг' },
  { lang: 'tr', neutral: 'Arkadaş listende', one: '1 gün birlikte', few: '2 gün birlikte', many: '14 gün birlikte', profile: 'Друг profilini aç', details: 'Друг ile arkadaşlık ayrıntılarını aç' },
  { lang: 'pl', neutral: 'Wśród znajomych', one: '1 dzień razem', few: '2 dni razem', many: '14 dni razem', profile: 'Otwórz profil Друг', details: 'Otwórz szczegóły znajomości z Друг' },
] as const;

function propsFor(daysTogether: number | null) {
  return {
    friendUid: 'friend-1',
    friendName: 'Друг',
    avatar: '1',
    totalXp: 2400,
    auraId: 'aura-1',
    daysTogether,
    onOpenProfile: jest.fn(),
    onOpenDetails: jest.fn(),
  };
}

describe.each(LOCALES)('FriendListRow in $lang', ({ lang, neutral, one, few, many, profile, details }) => {
  beforeEach(() => {
    mockLang = lang;
  });

  it.each([
    [null, neutral],
    [1, one],
    [2, few],
    [14, many],
  ])('formats %s days as %s', (daysTogether, expected) => {
    expect(formatFriendRelationship(lang, daysTogether)).toBe(expected);
  });

  it('keeps profile and details controls independent with localized distinct labels', async () => {
    const props = propsFor(14);
    const user = userEvent.setup();
    const screen = await render(<FriendListRow {...props} />);
    const profileTarget = screen.getByRole('button', { name: profile });
    const detailsTarget = screen.getByRole('button', { name: details });
    const avatarTarget = screen.getByTestId('friend-row-avatar-friend-1');
    const bodyTarget = screen.getByTestId('friend-row-body-friend-1');

    expect(profileTarget).toBe(avatarTarget);
    expect(detailsTarget).toBe(bodyTarget);
    expect(avatarTarget.parent).toBe(bodyTarget.parent);
    expect(avatarTarget.props.accessibilityRole).toBe('button');
    expect(bodyTarget.props.accessibilityRole).toBe('button');
    expect(avatarTarget.props.accessibilityLabel).toBe(profile);
    expect(bodyTarget.props.accessibilityLabel).toBe(details);
    expect(avatarTarget.props.accessibilityLabel).not.toBe(bodyTarget.props.accessibilityLabel);

    await user.press(profileTarget);
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);
    expect(props.onOpenDetails).not.toHaveBeenCalled();

    await user.press(detailsTarget);
    expect(props.onOpenDetails).toHaveBeenCalledTimes(1);
    expect(props.onOpenProfile).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Друг')).toBeTruthy();
    expect(screen.getByText(many)).toBeTruthy();
    expect(screen.queryByTestId('friend-row-actions-friend-1')).toBeNull();
  });
});

describe('FriendListRow source contract', () => {
  it('preserves reflow and keeps action controls out of the source', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'friends_together', 'FriendListRow.tsx'),
      'utf8',
    );

    expect(source).not.toContain('numberOfLines');
    expect(source).toContain('minWidth: 0');
    expect(source).not.toContain('friend-row-actions-');
    expect(source).toContain('Math.max(16, f.body)');
    expect(source).toContain('Math.max(14, f.sub)');
  });
});
