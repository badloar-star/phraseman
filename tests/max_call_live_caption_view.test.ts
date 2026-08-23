import React from 'react';
import { render } from '@testing-library/react-native';

import { MaxCallLiveCaptionView } from '../app/max_call_live_caption_view';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
  StyleSheet: {
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { accent: '#8EEA63', textPrimary: '#F0F7F2' },
    f: { bodyLg: 18, label: 12 },
  }),
}));
jest.mock('../components/text-integrity/FlowText', () => ({
  FlowText: ({ children, ...props }: { children?: React.ReactNode }) => jest.requireActual<typeof import('react')>('react').createElement('Text', props, children),
}));

describe('MaxCallLiveCaptionView accessibility', () => {
  it('renders a noninteractive MAX-only caption without a competing live region', async () => {
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: 'Where would you like to go?',
      completedAssistantText: 'Where would you like to go?',
      lang: 'ru',
    }));
    const rail = view.getByTestId('max-call-live-caption');
    expect(rail.props.accessibilityLiveRegion).toBeUndefined();
    expect(view.queryByTestId('max-call-caption-announcement')).toBeNull();
    expect(rail.props.accessibilityRole).toBeUndefined();
    expect(rail.props.style).toMatchObject({ minHeight: 132 });
    expect(view.queryByText(/Ты:/)).toBeNull();
  });

  it('показывает реплику целиком и подсвечивает уже сказанное', async () => {
    // Владелец 2026-08-23: «реплики так быстро скроллятся, что не успеть ничего».
    // Теперь видна вся фраза, а акцентом выделено то, что MAX произносит сейчас.
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: 'Where would you',
      fullAssistantText: 'Where would you like to go on holiday?',
      completedAssistantText: '',
      lang: 'ru',
    }));
    const spoken = view.getByTestId('max-call-caption-spoken');
    expect(spoken.props.children).toBe('Where would you');
    // Хвост реплики виден заранее — глаз держит контекст.
    expect(view.getByText(/like to go on holiday\?/)).toBeTruthy();
  });

  it('очень длинную реплику всё же обрезает — лента не растёт бесконечно', async () => {
    const long = Array.from({ length: 40 }, (_, i) => `w${i + 1}`).join(' ');
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: '',
      fullAssistantText: long,
      completedAssistantText: '',
      lang: 'ru',
    }));
    expect(view.queryByText(/^w1 w2/)).toBeNull();
    expect(view.getByText(/w40$/)).toBeTruthy();
  });

  it('allows the subtitle to scale to 200 percent', async () => {
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: 'A complete response',
      completedAssistantText: '',
      lang: 'ru',
    }));
    // Свойство живёт на самой строке субтитров; подсветка сказанного — вложенный
    // <Text> внутри неё и масштабируется вместе с родителем.
    expect(view.getByTestId('max-call-live-caption-text').props.maxFontSizeMultiplier).toBe(2);
    expect(view.getByTestId('max-call-caption-spoken').props.children).toBe('A complete response');
    expect(view.getByTestId('max-call-live-caption').props.style).toMatchObject({ minHeight: 132 });
  });
});
