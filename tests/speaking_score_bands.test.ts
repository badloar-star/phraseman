import {
  buildSpeakingHint,
  speakingBand,
  speakingBandLabel,
  speakingHintText,
} from '../app/speaking_score_bands';
import type { SpokenWordEntry } from '../app/speaking_word_report';

const clean = (target: string): SpokenWordEntry => ({ target, status: 'clean' });
const fuzzy = (target: string): SpokenWordEntry => ({ target, status: 'fuzzy' });
const missed = (target: string): SpokenWordEntry => ({ target, status: 'missed' });

const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('speaking score bands', () => {
  it('maps score to band around the pass threshold', () => {
    expect(speakingBand(97, 75)).toBe('excellent');
    expect(speakingBand(90, 75)).toBe('excellent');
    expect(speakingBand(89, 75)).toBe('good');
    expect(speakingBand(75, 75)).toBe('good');
    expect(speakingBand(74, 75)).toBe('almost');
    expect(speakingBand(50, 75)).toBe('almost');
    expect(speakingBand(49, 75)).toBe('rough');
  });

  it('has a non-empty label for every band in every UI language', () => {
    for (const band of ['excellent', 'good', 'almost', 'rough'] as const) {
      for (const lang of LANGS) {
        expect(speakingBandLabel(band, lang).length).toBeGreaterThan(0);
      }
    }
    // Unknown language falls back to Russian.
    expect(speakingBandLabel('good', 'xx')).toBe(speakingBandLabel('good', 'ru'));
  });

});

describe('speaking hint priority', () => {
  const base = { honestyFlagged: false, stress: 'unknown' as const };

  it('honesty flag beats everything', () => {
    const hint = buildSpeakingHint({
      ...base,
      honestyFlagged: true,
      report: [missed('think'), fuzzy('so')],
    });
    expect(hint.kind).toBe('say_clearer');
  });

  it('missed words beat fuzzy words and come out MASKED (anti-cheat)', () => {
    const hint = buildSpeakingHint({
      ...base,
      report: [clean('I'), missed('think'), fuzzy('so')],
    });
    // Missed-слова не сливаются текстом — первая буква + «_» по буквам.
    expect(hint).toEqual({ kind: 'missed_words', words: ['t____'] });
  });

  it('fuzzy words stay UNMASKED — the user already said them, no leak', () => {
    const hint = buildSpeakingHint({
      ...base,
      report: [clean('I'), fuzzy('think')],
    });
    expect(hint).toEqual({ kind: 'fuzzy_words', words: ['think'] });
  });

  it('fuzzy words beat completeness and prosody', () => {
    const hint = buildSpeakingHint({
      ...base,
      stress: 'monotone',
      completeness: 50,
      report: [clean('I'), fuzzy('think')],
    });
    expect(hint).toEqual({ kind: 'fuzzy_words', words: ['think'] });
  });

  it('caps listed words at three', () => {
    const hint = buildSpeakingHint({
      ...base,
      report: [missed('a'), missed('b'), missed('c'), missed('d')],
    });
    expect(hint.kind).toBe('missed_words');
    if (hint.kind === 'missed_words') expect(hint.words).toEqual(['a', 'b', 'c']);
  });

  it('falls through completeness → monotone → stress → none', () => {
    const cleanReport = [clean('hello'), clean('there')];
    expect(buildSpeakingHint({ ...base, report: cleanReport, completeness: 60 }).kind).toBe('incomplete');
    expect(buildSpeakingHint({ ...base, report: cleanReport, stress: 'monotone' }).kind).toBe('monotone');
    expect(buildSpeakingHint({ ...base, report: cleanReport, stress: 'too_late' }).kind).toBe('stress');
    expect(buildSpeakingHint({ ...base, report: cleanReport }).kind).toBe('none');
  });
});

describe('speaking hint text', () => {
  it('renders word lists into the localized template', () => {
    const text = speakingHintText({ kind: 'missed_words', words: ['think', 'so'] }, 'ru');
    expect(text).toContain('think, so');
  });

  it('returns null for the none hint', () => {
    expect(speakingHintText({ kind: 'none' }, 'ru')).toBeNull();
  });

  it('has a non-empty text for every hint kind in every UI language', () => {
    const kinds = [
      { kind: 'say_clearer' as const },
      { kind: 'missed_words' as const, words: ['x'] },
      { kind: 'fuzzy_words' as const, words: ['x'] },
      { kind: 'incomplete' as const },
      { kind: 'monotone' as const },
      { kind: 'stress' as const },
    ];
    for (const hint of kinds) {
      for (const lang of LANGS) {
        const text = speakingHintText(hint, lang);
        expect(text && text.length).toBeGreaterThan(0);
        expect(text).not.toContain('{words}');
      }
    }
  });
});
