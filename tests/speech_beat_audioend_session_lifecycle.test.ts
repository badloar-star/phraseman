import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import SpeechBeat from '../components/onboarding_aha/SpeechBeat';
import { AHA_SCENARIOS, AHA_STRINGS } from '../components/onboarding_aha/aha_scenes';

type Listener = (payload?: unknown) => void;

let mockRuntimeActive = true;
const mockListeners = new Map<string, Listener[]>();
const mockSpeech = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  supportsOnDeviceRecognition: jest.fn(async () => true),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn((event: string, callback: Listener) => {
    const callbacks = mockListeners.get(event) ?? [];
    callbacks.push(callback);
    mockListeners.set(event, callbacks);
    return { remove: jest.fn() };
  }),
};

jest.mock('react-native', () => {
  class Value {
    setValue() {}
    interpolate() { return 0; }
  }
  const animation = { start: (callback?: () => void) => callback?.(), stop: jest.fn() };
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    StyleSheet: {
      create: (styles: object) => styles,
      flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
    },
    AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Animated: {
      Value,
      View: 'AnimatedView',
      timing: () => animation,
      sequence: () => animation,
      loop: () => animation,
    },
    Easing: { sin: jest.fn(), inOut: (value: unknown) => value },
  };
});
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockRuntimeActive }));
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => true }));
jest.mock('../hooks/use-record-start-cue', () => ({ useRecordStartCue: () => ({ playRecordStart: jest.fn() }) }));
jest.mock('../hooks/use-haptics', () => ({
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
  hapticWarning: jest.fn(),
}));
jest.mock('../app/audio_session_coordinator', () => ({ setManagedAudioMode: jest.fn(async () => undefined) }));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(() => ({ isCurrent: () => true, release: jest.fn() })),
  claimRecordingAudio: jest.fn(() => ({ isCurrent: () => true, release: jest.fn() })),
  whenSpokenAudioReady: jest.fn(async () => true),
  whenRecordingAudioReady: jest.fn(async () => true),
}));
jest.mock('../app/remote_flags', () => ({ isSpeakingEnabled: () => true }));
jest.mock('../app/personal_plan_speech_module', () => ({
  isSpeechRecognitionAvailable: () => true,
  loadPlanSpeechModule: () => mockSpeech,
  requestSpeechPermissionForHold: jest.fn(async () => 'granted'),
}));
jest.mock('../components/onboarding_aha/aha_events', () => ({ trackAhaEvent: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: class MockFile { exists = false; delete() {} } }));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: (props: object) => React.createElement(View, props) };
});
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockIonicons(props: object) {
    return React.createElement(View, props);
  };
});

function latest(event: string): Listener {
  const callbacks = mockListeners.get(event) ?? [];
  const callback = callbacks[callbacks.length - 1];
  if (!callback) throw new Error(`Missing ${event} listener`);
  return callback;
}

describe('SpeechBeat audioend session ownership', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockListeners.clear();
    mockRuntimeActive = true;
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  test('a queued audioend from an older attempt cannot attach its recording to a new attempt', async () => {
    const props = {
      scenario: AHA_SCENARIOS.travel,
      lang: 'ru' as const,
      onDone: jest.fn(),
      playSay: jest.fn(),
    };
    await render(React.createElement(SpeechBeat, props));

    await fireEvent(screen.getByLabelText(AHA_STRINGS.speakHoldIdle.ru), 'pressIn');
    await act(async () => {
      await Promise.resolve();
      latest('start')();
      latest('result')({ results: [{ transcript: props.scenario.say.text }] });
      latest('end')();
      await Promise.resolve();
    });
    const oldAudioEnd = latest('audioend');

    await fireEvent.press(screen.getByText(AHA_STRINGS.retry.ru));

    await fireEvent(screen.getByLabelText(AHA_STRINGS.speakHoldIdle.ru), 'pressIn');
    await act(async () => {
      await Promise.resolve();
      latest('start')();
      oldAudioEnd({ uri: 'file:///stale-attempt.wav' });
      latest('result')({ results: [{ transcript: props.scenario.say.text }] });
      latest('end')();
      await Promise.resolve();
    });

    expect(screen.queryByText(AHA_STRINGS.myRecording.ru)).toBeNull();
  });

  test('scores the final result delivered after the user releases the current press', async () => {
    const props = {
      scenario: AHA_SCENARIOS.travel,
      lang: 'ru' as const,
      onDone: jest.fn(),
      playSay: jest.fn(),
    };
    await render(React.createElement(SpeechBeat, props));

    const hold = screen.getByLabelText(AHA_STRINGS.speakHoldIdle.ru);
    await fireEvent(hold, 'pressIn');
    await act(async () => {
      await Promise.resolve();
      latest('start')();
    });
    await fireEvent(hold, 'pressOut');
    await act(async () => {
      latest('result')({ results: [{ transcript: props.scenario.say.text }], isFinal: true });
      latest('end')();
      await Promise.resolve();
    });

    expect(screen.getByText(AHA_STRINGS.speakSuccess.ru)).toBeTruthy();
  });
});
