// Поведение кнопки удержания микрофона (SpeakHoldButton) — то, что гейт hold-to-talk раньше проверял строкой (координатор 24.10: «гейт должен проверять поведение, а не строку»).
// Нажатие ставит запись на старт (onHoldStart), отпускание — на стоп (onHoldEnd); без устройства речи или без остатка попыток старта нет; стоп без старта не вызывается.
// Дальше по цепочке плеера: onHoldStart = startVoiceHold → setVoiceHoldActive(true) → holdActive у SpeakingPanel (источник проверяет learning_v2_local_hold_to_talk_lifecycle_2026_08_26_gate).
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

let mockSpeechNa = false;
// зачем: общая заглушка react-native в tests/__mocks__ без StyleSheet/Pressable — кнопке нужны хост-компоненты
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
}));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: new Proxy({}, { get: () => '#888888' }) }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../app/speech_device_availability', () => ({
  useSpeechUnavailableOnDevice: () => mockSpeechNa,
  speechUnavailableOnDeviceText: () => 'Speech is not available',
}));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(async () => undefined) }));
jest.mock('../components/VoiceAllowanceBadge', () => 'VoiceAllowanceBadge');
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: number) => v,
    withTiming: (v: number) => v,
  };
});

import SpeakHoldButton from '../app/flashcards/SpeakHoldButton';

const baseProps = (over: Record<string, unknown> = {}) => ({
  accent: '#00aaff',
  listening: false,
  label: 'Hold and speak',
  onHoldStart: jest.fn(),
  onHoldEnd: jest.fn(),
  testID: 'hold',
  ...over,
});

describe('SpeakHoldButton: удержание = запись', () => {
  beforeEach(() => { mockSpeechNa = false; });
  afterEach(() => { cleanup(); });

  it('нажал → старт записи, отпустил → стоп (по одному разу)', async () => {
    const props = baseProps();
    await render(<SpeakHoldButton {...props} />);
    const button = screen.getByTestId('hold');
    await fireEvent(button, 'pressIn');
    expect(props.onHoldStart).toHaveBeenCalledTimes(1);
    expect(props.onHoldEnd).not.toHaveBeenCalled();
    await fireEvent(button, 'pressOut');
    expect(props.onHoldEnd).toHaveBeenCalledTimes(1);
    expect(props.onHoldStart).toHaveBeenCalledTimes(1);
  });

  it('подпись под кнопкой — та, что передал хозяин', async () => {
    await render(<SpeakHoldButton {...baseProps({ label: 'Hold and speak' })} />);
    expect(screen.getByTestId('hold-label').props.children).toBe('Hold and speak');
  });

  it('на устройстве без распознавания старта нет, и стоп без старта не вызывается', async () => {
    mockSpeechNa = true;
    const props = baseProps();
    await render(<SpeakHoldButton {...props} />);
    const button = screen.getByTestId('hold');
    await fireEvent(button, 'pressIn');
    await fireEvent(button, 'pressOut');
    expect(props.onHoldStart).not.toHaveBeenCalled();
    expect(props.onHoldEnd).not.toHaveBeenCalled();
  });

  it('попыток не осталось → нажатие ведёт к покупке, запись не стартует, стоп не вызывается', async () => {
    const onSpentPress = jest.fn();
    const props = baseProps({ allowance: { remaining: 0, onSpentPress, colors: {} } });
    await render(<SpeakHoldButton {...props} />);
    const button = screen.getByTestId('hold');
    await fireEvent(button, 'pressIn');
    await fireEvent(button, 'pressOut');
    expect(onSpentPress).toHaveBeenCalledTimes(1);
    expect(props.onHoldStart).not.toHaveBeenCalled();
    expect(props.onHoldEnd).not.toHaveBeenCalled();
  });

  it('есть остаток попыток → запись стартует как обычно', async () => {
    const props = baseProps({ allowance: { remaining: 3, onSpentPress: jest.fn(), colors: {} } });
    await render(<SpeakHoldButton {...props} />);
    await fireEvent(screen.getByTestId('hold'), 'pressIn');
    expect(props.onHoldStart).toHaveBeenCalledTimes(1);
  });
});
