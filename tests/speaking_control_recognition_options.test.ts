import fs from 'fs';
import path from 'path';

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

describe('SpeakingPanel honest-assessment integration contract', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'components', 'SpeakingPanel.tsx'),
    'utf8',
  );

  it('captures the persisted attempt uri from the audioend event', () => {
    expect(source).toContain("addListener('audioend'");
    expect(source).toContain('recordingUriRef.current = uri');
  });

  it('runs the unbiased control pass and applies the honesty cap to the score', () => {
    expect(source).toContain('buildControlRecognitionOptions(');
    expect(source).toContain('applyControlScore(');
    // Пропуск/ошибка контрольного прогона не должны штрафовать говорящего:
    // поправка применяется к null-контролю без изменений (см. honesty-check).
    expect(source).toContain('let control: number | null = null');
  });

  it('prefers the on-device neural judge and falls back to the system engine', () => {
    // Судья пробуется ПЕРВЫМ внутри контрольного прогона; его недоступность
    // (нет пакета/модели/таймаут) откатывает на системное файловое распознавание.
    const judgeAt = source.indexOf('judgeWithNeuralEngine({');
    const systemAt = source.indexOf('buildControlRecognitionOptions(');
    expect(judgeAt).toBeGreaterThanOrEqual(0);
    expect(systemAt).toBeGreaterThanOrEqual(0);
    expect(judgeAt).toBeLessThan(systemAt);
    // Модель греется в фоне при открытии панели, только когда пакет в бинаре.
    expect(source).toContain('isNeuralJudgeSupported()');
    // Тёплый прогрев модели (аргумент — локаль для реестра моделей по языку).
    expect(source).toContain('ensureNeuralModel(');
  });

  it('shows the per-word map, band verdict and one concrete hint after every attempt', () => {
    expect(source).toContain('buildSpokenWordReport(');
    expect(source).toContain('speakingBandLabel(');
    expect(source).toContain('buildSpeakingHint(');
    expect(source).toContain('speakingHintText(');
  });

  it('offers the «my recording ↔ reference» ear-comparison after an attempt', () => {
    expect(source).toContain('playMyRecording');
    expect(source).toContain('playReference');
    expect(source).toContain('createAudioPlayer(recordingUri)');
    expect(source).toContain('Speech.speak(targetText');
  });
});
