import {
  buildContextualStrings,
  buildSpeakingStartOptions,
  iosTaskHintForTarget,
} from '../app/speaking_recognition_options';

describe('speaking recognition start options', () => {
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

  it('omits requiresOnDeviceRecognition unless onDevice is true', () => {
    const off = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(off.requiresOnDeviceRecognition).toBeUndefined();
    const on = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', onDevice: true });
    expect(on.requiresOnDeviceRecognition).toBe(true);
  });

  it('respects the volume meter toggle and cadence', () => {
    const withMeter = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi' });
    expect(withMeter.volumeChangeEventOptions).toEqual({ enabled: true, intervalMillis: 250 });
    const noMeter = buildSpeakingStartOptions({ lang: 'en-US', targetText: 'hi', volumeMeter: false });
    expect(noMeter.volumeChangeEventOptions).toBeUndefined();
  });
});
