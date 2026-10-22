import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, userEvent } from '@testing-library/react-native';

import FriendListRow, { formatFriendRelationship } from '../components/friends_together/FriendListRow';

jest.unmock('react-native');

let mockLang = 'ru';

// зачем (владелец 2026-09-29): строка друга переведена на Liquid Glass — токены берутся из
// liquidGlassTokens(liquidGlassThemeId), множитель шрифта из FONT_SCALE/uiScale.
jest.mock('../components/ThemeContext', () => ({
  FONT_SCALE: { small: 0.9, medium: 1, large: 1.1 },
  useTheme: () => ({
    theme: {
      wrong: '#ff0000',
      correct: '#00ff00',
      bgSurface: '#ffffff',
      textPrimary: '#111111',
      textSecond: '#555555',
      textMuted: '#777777',
    },
    f: { body: 15, sub: 13 },
    fontSize: 'medium',
    uiScale: 1,
    liquidGlassThemeId: 'graphite',
  }),
}));

jest.mock('../components/LangContext', () => ({
  useLang: () => ({ lang: mockLang }),
}));

jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, string>) => copy[lang] ?? copy.ru,
}));

// Кирпичи Liquid Glass тянут PressableHybrid → звук/хаптик; в строке друга они не нажимаются.
jest.mock('../components/PressableHybrid', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/friends_together/FriendEventMarker', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/SafeLinearGradient', () => ({ __esModule: true, default: () => null, LinearGradient: () => null }));

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

// зачем (21.10): FriendsGlassKit рисует монету через expo-image (R129) — в jest нет нативного модуля, и набор падал до первого теста;
// строке друга картинка монеты не важна
jest.mock('expo-image', () => ({ Image: () => null }));

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
    coinRank: null,
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

describe('FriendListRow «Серия вдвоём» (идея 1, макет friends-full.html)', () => {
  beforeEach(() => {
    mockLang = 'ru';
  });

  const pairView = (state: 'both_today' | 'friend_pending' | 'broken' | 'none', streak: number) => ({ state, streak, best: streak, lostStreak: 0, week: [] });

  it('shows the pair flame and its state line instead of days together', async () => {
    const screen = await render(<FriendListRow {...propsFor(14)} pair={pairView('friend_pending', 7)} callState="idle" onCall={jest.fn()} />);

    // огонь скрыт от диктора как картинка — ищем со скрытыми элементами; серию диктор слышит в подписи зоны «детали»
    expect(screen.getByTestId('friend-row-flame-friend-1', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Сегодня ещё без занятия')).toBeTruthy();
    expect(screen.queryByTestId('friend-row-relationship-friend-1', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('friend-row-body-friend-1').props.accessibilityLabel).toBe('Открыть детали дружбы с Друг. 7 дней подряд вдвоём. Сегодня ещё без занятия');
  });

  it('keeps the old «N days together» line when the pair has no streak', async () => {
    const screen = await render(<FriendListRow {...propsFor(14)} pair={pairView('none', 0)} />);

    expect(screen.getByText('14 дней вместе')).toBeTruthy();
    expect(screen.queryByTestId('friend-row-flame-friend-1', { includeHiddenElements: true })).toBeNull();
  });

  it('without pair props the row is exactly the previous one', async () => {
    const screen = await render(<FriendListRow {...propsFor(2)} />);

    expect(screen.getByText('2 дня вместе')).toBeTruthy();
    expect(screen.queryByTestId('friend-row-flame-friend-1', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('friend-row-body-friend-1').props.accessibilityLabel).toBe('Открыть детали дружбы с Друг');
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
    // Макет community.html#COM-04: имя 16/21, подпись 13/18, зоны нажатия не меньше 44 dp.
    expect(source).toContain('16 * textScale');
    expect(source).toContain('13 * textScale');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('useFriendsGlass');
    expect(source).not.toContain('AvatarView');
  });
});
