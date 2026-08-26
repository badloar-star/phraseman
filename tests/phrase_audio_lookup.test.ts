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
});
