import {
  buildContextualStrings,
  buildSpeakingStartOptions,
  iosTaskHintForTarget,
} from '../app/speaking_recognition_options';
import { Platform } from 'react-native';

describe('speaking recognition start options', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalOS;
  });

  it('includes the full phrase plus unique word tokens as contextualStrings', () => {
    const ctx = buildContextualStrings('I would like a coffee');
    expect(ctx[0]).toBe('I would like a coffee');
    expect(ctx).toEqual(expect.arrayContaining(['I', 'would', 'like', 'a', 'coffee']));
  });

  it('de-duplicates repeated word tokens case-insensitively', () => {
    const ctx = buildContextualStrings('the cat the dog');
    const lower = ctx.map((s) => s.toLowerCase());
    // "the" must appear once among the tokens (the full phrase is a separate entry).
    const theCount = lower.filter((s) => s === 'the').length;
    expect(theCount).toBe(1);
  });

  it('caps contextualStrings at 100 entries', () => {
    const long = Array.from({ length: 200 }, (_, i) => `w${i}`).join(' ');
    expect(buildContextualStrings(long).length).toBeLessThanOrEqual(100);
  });

  it('uses confirmation hint for short prompts and dictation for sentences', () => {
    expect(iosTaskHintForTarget('hello')).toBe('confirmation');
    expect(iosTaskHintForTarget('good morning')).toBe('confirmation');
    expect(iosTaskHintForTarget('I would like a coffee please')).toBe('dictation');
  });

  it('always sets the accuracy-critical options', () => {
    const opts = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'good morning' });
    expect(opts.lang).toBe('en-US');
    expect(opts.maxAlternatives).toBe(5);
    expect(opts.addsPunctuation).toBe(true);
    expect(Array.isArray(opts.contextualStrings)).toBe(true);
    expect(opts.continuous).toBe(false);
  });

  it('overrides the iOS session mode away from "measurement" so the mic keeps system gain', () => {
    (Platform as any).OS = 'ios';

    const opts = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    const category = opts.iosCategory as { category: string; categoryOptions: string[]; mode?: string };
    // Дефолт библиотеки — mode 'measurement': отключает системную обработку входа
    // (AGC) → «слышит только если орать», и выход тоже тихий. Контракт: наш режим.
    expect(category.category).toBe('playAndRecord');
    expect(category.categoryOptions).toEqual(expect.arrayContaining(['defaultToSpeaker', 'allowBluetooth']));
    expect(category.mode).toBe('default');
  });

  it('lets surfaces without replay opt out of persisting the recording', () => {
    (Platform as any).OS = 'ios';

    // Дефолт — писать (нужно SpeakingPanel: «Моя запись» + контрольный прогон).
    const on = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(on.recordingOptions).toEqual({ persist: true });
    // План и ИИ-диалог файл не читают — выключают запись, чтобы не копить wav.
    const off = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', persistRecording: false });
    expect(off.recordingOptions).toBeUndefined();
  });

  it('omits requiresOnDeviceRecognition unless onDevice is true', () => {
    const off = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(off.requiresOnDeviceRecognition).toBeUndefined();
    const on = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', onDevice: true });
    expect(on.requiresOnDeviceRecognition).toBe(true);
  });

  it('does not force a specific Android speech service when on-device support is reported', () => {
    (Platform as any).OS = 'android';

    const opts = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', onDevice: true });

    expect(opts.requiresOnDeviceRecognition).toBeUndefined();
    expect(opts.androidRecognitionServicePackage).toBeUndefined();
    expect(opts.androidIntentOptions).toEqual({
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 800,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
    });
  });

  it('respects the volume meter toggle and cadence', () => {
    const withMeter = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(withMeter.volumeChangeEventOptions).toEqual({ enabled: true, intervalMillis: 250 });
    const noMeter = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', volumeMeter: false });
    expect(noMeter.volumeChangeEventOptions).toBeUndefined();
  });

  // ===== holdToTalk (разговорный режим ИИ-диалогов) =====
  // Конец речи задаёт палец (onPressOut → stop()), а НЕ OEM-endpointer. Поэтому
  // continuous:true + растянутые таймеры тишины держат движок открытым, пока
  // зажата кнопка — иначе на Android агрессивный endpointer рвёт реплику на паузе
  // («микрофон закрывается сам»).

  it('holdToTalk opens a continuous session so the finger, not the endpointer, ends speech', () => {
    const hold = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', holdToTalk: true });
    expect(hold.continuous).toBe(true);
    // Default / omitted stays single-shot (pronunciation scoring relies on the endpointer).
    const tap = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', holdToTalk: false });
    expect(tap.continuous).toBe(false);
    const omitted = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(omitted.continuous).toBe(false);
  });

  it('holdToTalk stretches the Android silence timers so a pause inside a reply does not cut it off', () => {
    (Platform as any).OS = 'android';

    const hold = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', holdToTalk: true });
    expect(hold.androidIntentOptions).toEqual({
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 600,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 60000,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 60000,
    });
  });

  it('REGRESSION: pronunciation scoring (no holdToTalk) keeps the tight endpointer timers', () => {
    (Platform as any).OS = 'android';

    // Оценка произношения НЕ передаёт holdToTalk → штатный endpointer 1500/3000мс,
    // continuous:false. Разговорный режим не должен «протечь» в скоринг.
    const scoring = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(scoring.continuous).toBe(false);
    expect(scoring.androidIntentOptions).toEqual({
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 800,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
    });
  });

  it('does not add the Android silence timers on iOS regardless of holdToTalk', () => {
    (Platform as any).OS = 'ios';
    const hold = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', holdToTalk: true });
    expect(hold.androidIntentOptions).toBeUndefined();
    // Hold-to-talk must stay open until the finger releases on iOS too.
    expect(hold.continuous).toBe(true);
  });

  it('uses dictation for free speech so a short scenario title cannot end the mic early', () => {
    (Platform as any).OS = 'ios';
    const opts = buildSpeakingStartOptions({
      lang: 'en-US',
      targetText: 'hi',
      holdToTalk: true,
      freeSpeech: true,
    });
    expect(opts.iosTaskHint).toBe('dictation');
  });
});
