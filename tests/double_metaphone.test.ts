import { doubleMetaphone, soundsAlike } from '../app/double_metaphone';

describe('double metaphone', () => {
  it('returns empty keys for empty / non-alpha input', () => {
    expect(doubleMetaphone('')).toEqual(['', '']);
    expect(doubleMetaphone('123')).toEqual(['', '']);
  });

  it('handles silent leading clusters (knight, gnome, write)', () => {
    // KN/GN/WR drop the silent first letter → N.../R...
    expect(doubleMetaphone('knight')[0]).toBe(doubleMetaphone('night')[0]);
    expect(doubleMetaphone('write')[0]).toBe(doubleMetaphone('right')[0]);
  });

  it('soundsAlike is true for same-sounding different spellings', () => {
    // Pairs Double Metaphone collapses on its own. (Pairs that diverge only
    // because of a silent H — hour/our, whole/hole — are intentionally handled
    // by the explicit HOMOPHONE_GROUPS table in the scorer, not by metaphone.)
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['write', 'right'],
      ['knight', 'night'],
      ['knew', 'new'],
      ['center', 'centre'],
      ['color', 'colour'],
      ['flower', 'flour'],
      ['whether', 'weather'],
      ['no', 'know'],
    ];
    for (const [a, b] of pairs) {
      expect({ pair: `${a}/${b}`, alike: soundsAlike(a, b) }).toEqual({ pair: `${a}/${b}`, alike: true });
    }
  });

  it('soundsAlike is false for clearly different words', () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['cat', 'dog'],
      ['hello', 'goodbye'],
      ['coffee', 'water'],
      ['morning', 'evening'],
    ];
    for (const [a, b] of pairs) {
      expect({ pair: `${a}/${b}`, alike: soundsAlike(a, b) }).toEqual({ pair: `${a}/${b}`, alike: false });
    }
  });

  it('is case-insensitive and trims', () => {
    expect(soundsAlike('  Knight ', 'NIGHT')).toBe(true);
  });

  it('returns at most 4-character keys', () => {
    const [p, s] = doubleMetaphone('encyclopedia');
    expect(p.length).toBeLessThanOrEqual(4);
    expect(s.length).toBeLessThanOrEqual(4);
  });
});
