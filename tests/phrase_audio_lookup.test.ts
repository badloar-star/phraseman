import { getPhraseAudioUrl } from '../app/phrase_audio_url_map.generated';
import { getPlayablePhraseAudioUrl } from '../modules/audio/phrase_audio_lookup';

describe('phrase audio lookup', () => {
  it('keeps exact lookups unchanged', () => {
    expect(getPlayablePhraseAudioUrl('A long shot')).toBe(
      getPhraseAudioUrl('A long shot'),
    );
  });

  it('reuses an unambiguous clip when display cleanup removed punctuation', () => {
    const recorded = 'If you do not save this, you will lose it';
    const displayed = 'If you do not save this you will lose it';

    expect(getPhraseAudioUrl(displayed)).toBeUndefined();
    expect(getPlayablePhraseAudioUrl(displayed)).toBe(getPhraseAudioUrl(recorded));
  });

  it.each([
    ["I'm ready", 'I am ready'],
    ['It’s cheap', 'It is cheap'],
    ["We're friends", 'We are friends'],
    ["They're happy", 'They are happy'],
    ["Don't call him", 'Do not call him'],
    ["He won't help them next week", 'He will not help them next week'],
    ["She'll help us next week", 'She will help us next week'],
    ["You're late", 'You are late'],
  ])(
    'reuses the canonical lesson clip for accepted contraction %s',
    (accepted, canonical) => {
      expect(getPhraseAudioUrl(accepted)).toBeUndefined();
      expect(getPlayablePhraseAudioUrl(accepted)).toBe(
        getPhraseAudioUrl(canonical),
      );
    },
  );

  it('does not guess when one accepted form matches different recordings', () => {
    const ambiguous = 'After finishing, call me!';

    expect(getPhraseAudioUrl(ambiguous)).toBeUndefined();
    expect(getPlayablePhraseAudioUrl(ambiguous)).toBeUndefined();
  });
});
