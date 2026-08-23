import React from 'react';
import { render } from '@testing-library/react-native';

import { MaxTutorGoalStrip } from '../components/max/MaxTutorGoalStrip';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));
jest.mock('../constants/i18n', () => ({
  triLang: (_lang: string, copy: Record<string, string>) => copy.ru,
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#8EEA63', accentBg: 'rgba(142,234,99,0.12)', bgSurface: '#17241A',
      border: '#385044', textPrimary: '#F0F7F2', textMuted: '#91A397',
      // Полоса цели рисуется тоном: без этих токенов стаб молча отдал бы
      // undefined и тест перестал бы отражать реальный экран.
      textSecond: '#C7D8CC', textGhost: '#506A5C',
    },
    f: { body: 14, bodyLg: 16, label: 12, sub: 14 },
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const MockIonicon = () => null;
  (MockIonicon as any).glyphMap = {};
  return MockIonicon;
});

describe('MAX tutor context strip', () => {
  it('shows the guided goal and ignores an old free-talk topic', async () => {
    const view = await render(React.createElement(MaxTutorGoalStrip, {
      mode: 'guided',
      title: 'Вежливо предложить другое время',
      currentTopic: 'Weekend plans',
      sceneTitle: '',
      mastery: 2,
      lang: 'ru',
    }));

    // зачем (владелец 2026-08-23): «плашка цель урока не должна тянуть весь
    // акцент». Карточку с медальоном заменила одна тихая строка «Цель урока ·
    // <название>», поэтому метка теперь живёт внутри строки, а не отдельным
    // заголовком. Проверяем смысл (метка + название рядом), а не старую вёрстку.
    expect(view.getByText(/Цель урока/)).toBeTruthy();
    expect(view.getByText('Вежливо предложить другое время')).toBeTruthy();
    expect(view.queryByText('Weekend plans')).toBeNull();
    expect(view.getByTestId('max-tutor-goal-strip').props.accessibilityLiveRegion).toBe('polite');
  });

  it('replaces the goal with the current free-talk topic inside the same strip', async () => {
    const view = await render(React.createElement(MaxTutorGoalStrip, {
      mode: 'free_talk',
      title: 'hidden goal',
      currentTopic: 'Weekend plans',
      sceneTitle: 'hidden scene',
      mastery: 0,
      lang: 'ru',
    }));

    expect(view.getByText(/Свободный разговор/)).toBeTruthy();
    expect(view.getByText('Weekend plans')).toBeTruthy();
    expect(view.queryByText('hidden goal')).toBeNull();
    expect(view.queryByText('hidden scene')).toBeNull();
  });

  it('uses the active scene as the guided context without adding a header chip', async () => {
    const view = await render(React.createElement(MaxTutorGoalStrip, {
      mode: 'guided',
      title: 'Вежливо предложить другое время',
      currentTopic: '',
      sceneTitle: 'Перенос встречи',
      mastery: 1,
      lang: 'ru',
    }));

    expect(view.getByText(/Сценка/)).toBeTruthy();
    expect(view.getByText('Перенос встречи')).toBeTruthy();
    expect(view.queryByText('Вежливо предложить другое время')).toBeNull();
  });
});
