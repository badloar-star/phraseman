import { Platform } from 'react-native';

import {
  buildControlRecognitionOptions,
  buildSpeakingStartOptions,
} from '../app/speaking_recognition_options';

describe('control (unbiased) recognition options', () => {
  it('never leaks the target into the control pass — no biasing, no hints', () => {
    const opts = buildControlRecognitionOptions({
      lang: 'en-US',
      uri: 'file:///cache/recording_1.wav',
    });
    expect(opts.contextualStrings).toBeUndefined();
    expect(opts.iosTaskHint).toBeUndefined();
    expect(opts.recordingOptions).toBeUndefined();
    expect(opts.volumeChangeEventOptions).toBeUndefined();
  });

  it('recognizes from the persisted attempt file with final results only', () => {
    const opts = buildControlRecognitionOptions({
      lang: 'en-GB',
      uri: 'file:///cache/recording_2.wav',
    });
    expect(opts.lang).toBe('en-GB');
    expect(opts.audioSource).toEqual({ uri: 'file:///cache/recording_2.wav' });
    expect(opts.interimResults).toBe(false);
    expect(opts.continuous).toBe(false);
    expect(opts.maxAlternatives).toBe(5);
  });
});

describe('attempt audio persistence (replay + control pass source)', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalOS;
  });

  it('persists the attempt recording on iOS', () => {
    (Platform as any).OS = 'ios';
    const opts = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi there' });
    expect(opts.recordingOptions).toEqual({ persist: true });
  });

  it('persists the attempt recording on Android too', () => {
    (Platform as any).OS = 'android';
    const opts = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi there' });
    expect(opts.recordingOptions).toEqual({ persist: true });
  });
});
