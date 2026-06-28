import {
  buildLetterBank,
  assembledWord,
  isAssemblyCorrect,
} from '../app/verb_letter_bank';

// Детерминированный псевдослучайный генератор для воспроизводимых тестов.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('buildLetterBank', () => {
  test('contains every letter of the target word', () => {
    const tiles = buildLetterBank('broke', mulberry32(1));
    const chars = tiles.map(t => t.char).sort();
    for (const ch of 'broke'.split('').sort()) {
      expect(chars).toContain(ch);
    }
  });

  test('adds decoy letters not present in the word (longer = more decoys)', () => {
    const tiles = buildLetterBank('understood', mulberry32(2));
    // 10 letters → 3 decoys
    expect(tiles.length).toBe('understood'.length + 3);
  });

  test('short word gets at most one decoy', () => {
    const tiles = buildLetterBank('was', mulberry32(3));
    expect(tiles.length).toBe('was'.length + 1);
  });

  test('tiles have unique ids', () => {
    const tiles = buildLetterBank('written', mulberry32(4));
    const ids = tiles.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('target can always be reassembled from the bank', () => {
    const tiles = buildLetterBank('bought', mulberry32(5));
    const pool = [...tiles];
    let ok = true;
    for (const ch of 'bought') {
      const idx = pool.findIndex(t => t.char === ch);
      if (idx === -1) { ok = false; break; }
      pool.splice(idx, 1);
    }
    expect(ok).toBe(true);
  });
});

describe('isAssemblyCorrect', () => {
  test('matches canonical form', () => {
    expect(isAssemblyCorrect('broke', ['broke'])).toBe(true);
  });

  test('matches variant form (was|were)', () => {
    expect(isAssemblyCorrect('were', ['was', 'were'])).toBe(true);
  });

  test('case and whitespace insensitive', () => {
    expect(isAssemblyCorrect(' Broke ', ['broke'])).toBe(true);
  });

  test('rejects wrong assembly', () => {
    expect(isAssemblyCorrect('breaked', ['broke'])).toBe(false);
  });

  test('empty is never correct', () => {
    expect(isAssemblyCorrect('', ['broke'])).toBe(false);
  });
});

describe('assembledWord', () => {
  test('joins selected tile chars in order', () => {
    expect(assembledWord([
      { id: 'a', char: 'b' },
      { id: 'b', char: 'r' },
      { id: 'c', char: 'o' },
    ])).toBe('bro');
  });
});
