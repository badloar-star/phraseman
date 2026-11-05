// «Наборы» rev8 часть 1: сегмент «Топ / Новые» — публичный API {value, onChange, lang}, мгновенный выбор, 9 языков.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { TopNewSwitch, topNewLabel } from '../components/packs/TopNewSwitch';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Animated: {
    Value: class { constructor(public v: number) {} setValue(v: number) { this.v = v; } interpolate() { return 0; } },
    View: 'View', spring: () => ({ start: jest.fn() }),
  },
  Platform: { OS: 'android' },
}));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'graphite' }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));

describe('TopNewSwitch', () => {
  afterEach(() => { cleanup(); });
  it('подписи: «Топ» и «Новые» на русском, все 9 языков непустые', () => {
    expect(topNewLabel('ru', 'top')).toBe('Топ');
    expect(topNewLabel('ru', 'new')).toBe('Новые');
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(topNewLabel(lang, 'top').length).toBeGreaterThan(1);
      expect(topNewLabel(lang, 'new').length).toBeGreaterThan(1);
    }
  });
  it('тап по другому сегменту зовёт onChange один раз, по выбранному — молчит', async () => {
    const onChange = jest.fn();
    await render(<TopNewSwitch value="top" onChange={onChange} lang="ru" />);
    fireEvent.press(screen.getByTestId('top-new-switch-top'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('top-new-switch-new'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('new');
  });
  it('выбранный сегмент помечен accessibilityState.selected', async () => {
    await render(<TopNewSwitch value="new" onChange={() => undefined} lang="en" />);
    expect((await screen.findByTestId('top-new-switch-new')).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('top-new-switch-top').props.accessibilityState).toEqual({ selected: false });
  });
});
