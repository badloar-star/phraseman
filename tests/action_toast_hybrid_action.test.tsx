// зачем (находка Макетов 7976ddef6, 12.10): гибридная карточка ActionToast — вариант по умолчанию — не рисовала кнопку действия (только classic), и
// «Повторить» у ошибки сохранения карточки / действие в тосте подписки были невидимы. Проверяем: кнопка есть и нажимается; без действия кнопки нет;
// выбор действия в основном компоненте больше не зависит от варианта анимации (кроме сквозной строки top_line).
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Animated: { View: 'AnimatedView', Value: class { setValue() {} }, multiply: () => 0, timing: () => ({ start: () => undefined }), parallel: () => ({ start: () => undefined }), spring: () => ({ start: () => undefined }) },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFillObject: {} },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'ReanimatedView' },
  Easing: { out: () => () => 0, cubic: () => 0, linear: () => 0 },
  cancelAnimation: () => undefined,
  useAnimatedStyle: () => ({}),
  useSharedValue: (v: number) => ({ value: v }),
  withDelay: (_d: number, v: unknown) => v,
  withSequence: (...v: unknown[]) => v[0],
  withSpring: (v: unknown) => v,
  withTiming: (v: unknown) => v,
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../app/events', () => ({ onAppEvent: () => ({ remove: () => undefined }), emitAppEvent: jest.fn() }));
jest.mock('../app/streak_day_toast', () => ({ streakDayToastPayload: () => null }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'x' }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticError: jest.fn(), hapticWarning: jest.fn(), hapticSoftImpact: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../constants/motion', () => ({ MOTION_DURATION: { normal: 1, fast: 1 }, MOTION_SPRING_LEGACY: { toast: { tension: 1, friction: 1 } } }));
jest.mock('../constants/motionHybrid', () => ({ LUM: { settle: {}, contentMs: 1 }, SUITE: { pulse: {} }, TOAST: { enterMs: 1, exitMs: 1, errorSpring: {}, errorShakePx: [0], errorShakeStepMs: 1 } }));
jest.mock('../hooks/use-global-bottom-overlay-offset', () => ({ useGlobalBottomOverlayOffset: () => 0 }));
jest.mock('../components/OverlayArbiter', () => ({ useOverlayActiveKey: () => null, useOverlayVisible: () => true }));
jest.mock('../components/animationScheduling', () => ({ cancelScheduledAnimatedStateUpdates: jest.fn(), scheduleTrackedAnimatedStateUpdate: jest.fn() }));
jest.mock('../constants/themedToastChrome', () => ({ themedToastChrome: () => ({}) }));
jest.mock('../constants/androidGlow', () => ({ noAndroidOutline: {} }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../components/action_toast_copy', () => ({ actionToastToneLabel: () => ({ ru: 'Ошибка' }), resolveActionToastActionLabel: () => 'Повторить', resolveActionToastMessage: () => 'x' }));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => ({}) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { ActionToastHybridCard } from '../components/ActionToast';

const chrome = { cardColors: ['#222', '#222'], radius: 20, shadowColor: '#000', accent: '#0f0', accentSoft: '#0f03', title: '#fff', body: '#ccc', closeBg: '#333' } as never;

describe('ActionToastHybridCard: действие тоста', () => {
  it('рисует кнопку действия, и она нажимается ровно один раз за нажатие', async () => {
    const onActionPress = jest.fn();
    await render(
      <ActionToastHybridCard type="error" toneLabel="Ошибка" message="Не удалось сохранить карточку." icon={'alert-circle' as never} chrome={chrome} actionLabel="Повторить" onActionPress={onActionPress} />,
    );
    const button = screen.getByTestId('action-toast-action');
    expect(button.props.accessibilityLabel).toBe('Повторить');
    expect(button.props.accessibilityRole).toBe('button');
    await fireEvent.press(button);
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('без действия кнопки нет — тост остаётся чисто информационным', async () => {
    await render(<ActionToastHybridCard type="success" toneLabel="Готово" message="Сохранено." icon={'checkmark-circle' as never} chrome={chrome} />);
    expect(screen.queryByTestId('action-toast-action')).toBeNull();
    await render(<ActionToastHybridCard type="success" toneLabel="Готово" message="Сохранено." icon={'checkmark-circle' as never} chrome={chrome} actionLabel={null} onActionPress={jest.fn()} />);
    expect(screen.queryByTestId('action-toast-action')).toBeNull();
  });
});

describe('ActionToast: выбор действия не зависит от варианта анимации', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ActionToast.tsx'), 'utf8');

  it('toastAction берётся из payload для обеих карточек; без кнопки — только сквозная строка top_line', () => {
    expect(source).toMatch(/const toastAction = toast\.layout === 'top_line' \? undefined : toast\.action;/);
    expect(source).not.toMatch(/const toastAction = !isHybrid/);
  });

  it('гибридная карточка получает подпись и обработчик действия', () => {
    expect(source).toMatch(/<ActionToastHybridCard[\s\S]*?actionLabel=\{actionLabel\}[\s\S]*?onActionPress=\{handleActionPress\}[\s\S]*?\/>/);
  });

  it('тост с действием живёт дольше обычного, но не дольше, чем нужно строке top_line (у неё действия нет)', () => {
    expect(source).toMatch(/const AUTO_DISMISS_WITH_ACTION_MS = 5500;/);
    expect(source).toMatch(/payload\.action && payload\.layout !== 'top_line' \? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS/);
  });
});
