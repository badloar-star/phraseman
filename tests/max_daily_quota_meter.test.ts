import React from 'react';
import { render } from '@testing-library/react-native';

import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter';

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
      accent: '#8EEA63', bgSurface2: '#203028', textPrimary: '#F0F7F2',
      textMuted: '#91A397', wrong: '#FF6B6B', gold: '#E7BE66',
    },
    f: { numMd: 24, sub: 14, label: 12 },
  }),
}));

describe('MaxDailyQuotaMeter', () => {
  it('names remaining and total daily minutes without percentages', async () => {
    const view = await render(React.createElement(MaxDailyQuotaMeter, {
      startRemainingSec: 14_160,
      maxSec: 14_400,
      runningSinceMs: null,
      variant: 'hero',
      lang: 'ru',
    }));

    expect(view.getByText('236 мин')).toBeTruthy();
    expect(view.getByLabelText('Осталось 236 минут MAX сегодня из 240')).toBeTruthy();
    expect(view.queryByText(/%/)).toBeNull();
  });
});
