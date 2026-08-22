import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MaxTutorGoalStrip } from '../components/max/MaxTutorGoalStrip';
import { MaxTutorLiveBoard } from '../components/max/MaxTutorLiveBoard';
import type { TutorBoardPayload } from '../app/max_tutor_live_board_state';

jest.mock('react-native', () => {
  class MockAnimatedValue {
    private current: number;
    constructor(initial: number) { this.current = initial; }
    setValue(next: number) { this.current = next; }
    interpolate() { return this; }
  }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
    },
    Animated: {
      View: 'AnimatedView',
      Value: MockAnimatedValue,
      timing: () => ({ start: (done?: () => void) => done?.() }),
    },
  };
});

jest.mock('../constants/i18n', () => ({
  triLang: (_lang: string, copy: Record<string, string>) => copy.ru,
}));

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#8EEA63', accentBg: 'rgba(142,234,99,0.12)', correctText: '#07110A',
      bgCard: '#15201A', bgSurface: '#17241A', bgSurface2: '#203028', border: '#385044',
      textPrimary: '#F0F7F2', textSecond: '#CAD8CE', textMuted: '#91A397', textGhost: '#6F8175',
      gold: '#E7BE66', goldBg: 'rgba(231,190,102,0.14)',
    },
    f: { h3: 16, bodyLg: 16, body: 14, caption: 13, label: 12 },
  }),
}));

jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const MockIonicon = () => null;
  (MockIonicon as any).glyphMap = {};
  return MockIonicon;
});

const board: TutorBoardPayload = {
  kind: 'hint',
  targetText: 'Could we move it to Friday?',
  meaning: 'Можем перенести это на пятницу?',
  source: 'learner_request',
  shownAtMs: 1,
  expiresAtMs: 12_001,
};

describe('MAX tutor live components', () => {
  it('shows the planned goal and mastery without turning it into the topic', async () => {
    const view = await render(
      <MaxTutorGoalStrip
        mode="guided"
        title="Вежливо предложить другое время"
        currentTopic="Weekend plans"
        sceneTitle=""
        mastery={2}
        lang="ru"
      />,
    );
    expect(view.getByText('Вежливо предложить другое время')).toBeTruthy();
    expect(view.queryByText('Weekend plans')).toBeNull();
    expect(view.getByLabelText('Прогресс цели: 2 из 3')).toBeTruthy();
    expect(view.getByTestId('max-tutor-goal-strip').props.accessibilityLiveRegion).toBe('polite');
  });

  it('shows the current topic inside the same strip in free-talk mode', async () => {
    const view = await render(
      <MaxTutorGoalStrip
        mode="free_talk"
        title="hidden"
        currentTopic="Weekend plans"
        sceneTitle="hidden scene"
        mastery={0}
        lang="ru"
      />,
    );
    expect(view.getByText('Свободный разговор')).toBeTruthy();
    expect(view.getByText('Weekend plans')).toBeTruthy();
    expect(view.queryByText('hidden')).toBeNull();
    expect(view.queryByText('hidden scene')).toBeNull();
  });

  it('shows the active guided scene in the same strip instead of a header chip', async () => {
    const view = await render(
      <MaxTutorGoalStrip
        mode="guided"
        title="Вежливо предложить другое время"
        currentTopic=""
        sceneTitle="Перенос встречи"
        mastery={1}
        lang="ru"
      />,
    );
    expect(view.getByText('Сценка')).toBeTruthy();
    expect(view.getByText('Перенос встречи')).toBeTruthy();
    expect(view.queryByText('Вежливо предложить другое время')).toBeNull();
  });

  it('offers listen and dismiss actions for one temporary phrase', async () => {
    const onListen = jest.fn();
    const onDismiss = jest.fn();
    const view = await render(<MaxTutorLiveBoard board={board} onListen={onListen} onDismiss={onDismiss} listenState="ready" lang="ru" />);

    expect(view.getByText(board.targetText)).toBeTruthy();
    expect(view.getByText(board.meaning)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Прослушать фразу' }));
    expect(onListen).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByRole('button', { name: 'Скрыть подсказку' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables replay and explains that MAX is still speaking', async () => {
    const onListen = jest.fn();
    const view = await render(
      <MaxTutorLiveBoard
        board={board}
        onListen={onListen}
        onDismiss={jest.fn()}
        listenState="blocked"
        lang="ru"
      />,
    );

    const listen = view.getByRole('button', { name: 'Сначала дослушай Макса' });
    expect(listen.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(listen);
    expect(onListen).not.toHaveBeenCalled();
  });

});
