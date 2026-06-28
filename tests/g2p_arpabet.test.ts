import { wordToArpabet, comparePhonemes } from '../app/g2p_arpabet';

describe('g2p arpabet', () => {
  it('uses the exceptions map for high-frequency irregulars', () => {
    expect(wordToArpabet('the')).toEqual(['DH', 'AH']);
    expect(wordToArpabet('one')).toEqual(['W', 'AH', 'N']);
    expect(wordToArpabet('through')).toEqual(['TH', 'R', 'UW']);
  });

  it('applies digraph rules (th, sh, ch, ng)', () => {
    expect(wordToArpabet('ship')).toEqual(['SH', 'IH', 'P']);
    expect(wordToArpabet('chip')).toEqual(['CH', 'IH', 'P']);
    expect(wordToArpabet('king')).toEqual(['K', 'IH', 'NG']);
  });

  it('drops a silent final e', () => {
    expect(wordToArpabet('make')).toEqual(['M', 'AE', 'K']);
  });

  it('handles soft c and soft g', () => {
    expect(wordToArpabet('city')[0]).toBe('S');
    expect(wordToArpabet('cat')[0]).toBe('K');
    expect(wordToArpabet('gem')[0]).toBe('JH');
    expect(wordToArpabet('go')[0]).toBe('G');
  });

  it('pinpoints the TH→S substitution in the classic think/sink pair', () => {
    const cmp = comparePhonemes('think', 'sink');
    // expected starts TH, said starts S
    expect(cmp.expected[0]).toBe('TH');
    expect(cmp.said[0]).toBe('S');
    const thMiss = cmp.mismatches.find((m) => m.expected === 'TH');
    expect(thMiss).toBeDefined();
    expect(thMiss!.said).toBe('S');
  });

  it('reports a perfect phoneme match as no mismatches, similarity 1', () => {
    const cmp = comparePhonemes('ship', 'ship');
    expect(cmp.mismatches).toEqual([]);
    expect(cmp.similarity).toBe(1);
  });

  it('detects a dropped sound (extra/missing phoneme)', () => {
    const cmp = comparePhonemes('plant', 'pant'); // dropped L
    expect(cmp.similarity).toBeLessThan(1);
    expect(cmp.mismatches.some((m) => m.expected === 'L' && m.said === '')).toBe(true);
  });

  it('returns empty for non-alpha input', () => {
    expect(wordToArpabet('123')).toEqual([]);
    expect(wordToArpabet('')).toEqual([]);
  });
});
