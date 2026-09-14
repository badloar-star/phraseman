import React, { act } from 'react';
import { createRoot, type Root } from 'test-renderer';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({ View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: (x: unknown) => x } }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { View: 'AnimatedView' }, Easing: { out: (x: unknown) => x, cubic: 'cubic' },
  cancelAnimation: jest.fn(), useAnimatedStyle: (f: () => unknown) => f(), useSharedValue: (value: number) => ({ value }),
  withDelay: (_: number, x: unknown) => x, withSpring: (x: unknown) => x, withTiming: (x: unknown) => x,
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { accent: '#ccff00', correctText: '#07110A' }, f: { body: 16, bodyLg: 18, h1: 24, h3: 20 } }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../components/feature_intro/FeatureIntroStage', () => 'FeatureIntroStage');
jest.mock('../components/DuoPressable', () => 'PrimaryButton');
jest.mock('../components/PressableHybrid', () => 'SecondaryButton');

const mockRequestDismiss = jest.fn();
jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const React = require('react');
  return function Shell(props: any) {
    return React.createElement('Shell', props, props.children({ requestDismiss: mockRequestDismiss }));
  };
});
import FeatureIntroModal from '../components/FeatureIntroModal';

describe('FeatureIntroModal dismissal contract', () => {
  let tree: Root;
  const done = jest.fn(), later = jest.fn(), rules = jest.fn(), dismissed = jest.fn();
  const props = { visible: true, icon: 'albums' as const, family: 'orbit' as const, title: 'Cards', body: 'Swipe', ctaLabel: 'Try', laterLabel: 'Close', secondaryLabel: 'Rules', onDone: done, onLater: later, onSecondary: rules, onDismissed: dismissed };
  beforeEach(async () => { jest.clearAllMocks(); tree = createRoot(); await act(() => { tree.render(React.createElement(FeatureIntroModal, props)); }); });
  afterEach(async () => { await act(() => tree.unmount()); });
  const shell = () => tree.container.queryAll(n => n.type === 'Shell')[0];
  const press = (name: string) => act(() => tree.container.queryAll(n => n.type === name)[0].props.onPress());

  it('keeps the first CTA through exit and invokes it only when the shell closes', async () => {
    await press('PrimaryButton'); await press('SecondaryButton');
    expect(mockRequestDismiss).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();
    await act(() => shell().props.onClose());
    expect(done).toHaveBeenCalledTimes(1); expect(rules).not.toHaveBeenCalled(); expect(later).not.toHaveBeenCalled();
  });
  it('does not turn a swipe/backdrop dismissal into CTA acceptance', async () => {
    await act(() => shell().props.onDismissRequested());
    await press('PrimaryButton');
    await act(() => shell().props.onClose());
    expect(done).not.toHaveBeenCalled(); expect(later).toHaveBeenCalledTimes(1);
  });
  it('keeps the rules action separate from native dismissal completion', async () => {
    await press('SecondaryButton');
    await act(() => shell().props.onClose());
    expect(rules).toHaveBeenCalledTimes(1); expect(dismissed).not.toHaveBeenCalled();
    await act(() => shell().props.onDismissed());
    expect(dismissed).toHaveBeenCalledTimes(1);
  });
  it('allows a new action after closing and reopening', async () => {
    await press('PrimaryButton'); await act(() => shell().props.onClose());
    await act(() => tree.render(React.createElement(FeatureIntroModal, { ...props, visible: false })));
    await act(() => tree.render(React.createElement(FeatureIntroModal, props)));
    await press('SecondaryButton'); await act(() => shell().props.onClose());
    expect(done).toHaveBeenCalledTimes(1); expect(rules).toHaveBeenCalledTimes(1);
  });
  it('manual guide may omit its duplicate close action without losing the shell close', async () => {
    await act(() => tree.render(React.createElement(FeatureIntroModal, { ...props, hideSecondary: true })));
    expect(tree.container.queryAll(n => n.type === 'SecondaryButton')).toHaveLength(0);
    await act(() => shell().props.onClose()); expect(later).toHaveBeenCalledTimes(1);
  });
});
