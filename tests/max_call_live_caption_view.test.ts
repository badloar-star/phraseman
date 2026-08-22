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

  it('keeps a rolling word window instead of growing into a scrolling transcript', async () => {
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: 'one two three four five six seven eight nine ten eleven twelve',
      completedAssistantText: '',
      lang: 'ru',
    }));
    expect(view.getByText('… three four five six seven eight nine ten eleven twelve')).toBeTruthy();
    expect(view.queryByText(/^one two/)).toBeNull();
  });

  it('allows the subtitle to scale to 200 percent', async () => {
    const view = await render(React.createElement(MaxCallLiveCaptionView, {
      visibleAssistantText: 'A complete response',
      completedAssistantText: '',
      lang: 'ru',
    }));
    expect(view.getByText('A complete response').props.maxFontSizeMultiplier).toBe(2);
    expect(view.getByTestId('max-call-live-caption').props.style).toMatchObject({ minHeight: 132 });
  });
});
