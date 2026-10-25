/**
 * [THEME-MOTION] Сторож решения владельца 25.10 «Выключить, включим из Пульта»: WebGL-фон премиум-тем («Аметист» дал ANR при
 * бросках Главной) по умолчанию НЕ монтируется — удалённый флаг premium_theme_webgl_motion_enabled = false. CSS-движение
 * («Керамика» и др.) монтируется как прежде. Флаг true — WebGL снова на месте.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockFlags: { webgl: boolean } = { webgl: false };

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('react-native-webview', () => {
  const ReactMock = jest.requireActual('react') as typeof import('react');
  return { __esModule: true, default: ReactMock.forwardRef((props: { testID?: string }, _ref) => ReactMock.createElement('View', { testID: props.testID })) };
});
jest.mock('expo-file-system', () => ({ File: class { base64() { return Promise.resolve(''); } } }));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
jest.mock('../app/premium_theme_pack_cache', () => ({
  premiumThemePackRevision: () => 0,
  resolveActivePremiumThemeArt: () => null,
  subscribePremiumThemePackCache: () => () => undefined,
}));
jest.mock('../app/remote_flags', () => ({
  getRemoteBool: (key: string) => (key === 'premium_theme_webgl_motion_enabled' ? mockFlags.webgl : false),
}));
jest.mock('../app/events', () => ({ onAppEvent: () => ({ remove: () => undefined }) }));
jest.mock('../app/runtime_app_state_store', () => ({ useAppRuntimeActive: () => true }));
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => true }));

import { PremiumThemeMotion } from '../components/home/v2/scene/PremiumThemeMotion';

// зачем: react-native подменён строковыми элементами — testID ищем в дереве рендера (поиск RNTL по хост-элементам их не видит)
const tree = (screen: { toJSON: () => unknown }): string => JSON.stringify(screen.toJSON() ?? null);

// зачем: unmount в этой версии RNTL асинхронный — без await следующий рендер накладывается (overlapping act) и дерево пустое
beforeEach(() => { mockFlags.webgl = false; });

describe('PremiumThemeMotion · удалённый флаг WebGL', () => {
  it('по умолчанию (флаг false) «Аметист» без WebView — фон статичный', async () => {
    const screen = await render(<PremiumThemeMotion themeId={'grad_full_ref_storm_violet' as never} isLight={false} width={390} height={420} />);
    expect(tree(screen)).not.toContain('premium-theme-motion-webgl-storm');
    expect(tree(screen)).not.toContain('premium-theme-motion-storm');
    await screen.unmount();
  });

  it('по умолчанию «Обсидиан» и «Сингулярность» тоже без WebView', async () => {
    for (const [id, kind] of [['grad_full_ref_signal_lime', 'signal'], ['grad_full_ref_gravity_blue', 'gravity']] as const) {
      const screen = await render(<PremiumThemeMotion themeId={id as never} isLight={false} width={390} height={420} />);
      expect(tree(screen)).not.toContain(`premium-theme-motion-webgl-${kind}`);
      await screen.unmount();
    }
  });

  it('CSS-движение («Керамика» / olive) флаг не трогает — WebView на месте', async () => {
    const screen = await render(<PremiumThemeMotion themeId={'grad_full_olive' as never} isLight={false} width={390} height={420} />);
    expect(tree(screen)).toContain('premium-theme-motion-webgl-olive');
    await screen.unmount();
  });

  it('флаг true в «Пульте» — WebGL-фон возвращается', async () => {
    mockFlags.webgl = true;
    const screen = await render(<PremiumThemeMotion themeId={'grad_full_ref_storm_violet' as never} isLight={false} width={390} height={420} />);
    expect(tree(screen)).toContain('premium-theme-motion-webgl-storm');
    await screen.unmount();
  });
});
