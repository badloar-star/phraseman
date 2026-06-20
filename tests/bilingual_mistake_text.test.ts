import { segmentBilingual } from '../app/bilingual_segments';

// Английский (ключевой язык) и родной язык должны попадать в РАЗНЫЕ сегменты,
// чтобы рендериться разными цветами и не сливаться.

describe('segmentBilingual', () => {
  it('splits English words from Russian into separate segments', () => {
    const segs = segmentBilingual('Нужно сказать I am, а не I is.');
    const english = segs.filter((s) => s.english).map((s) => s.text).join('|');
    const native = segs.filter((s) => !s.english).map((s) => s.text).join('');
    expect(english).toContain('I am');
    expect(english).toContain('I is');
    expect(native).toContain('Нужно сказать');
    expect(native).toContain('а не');
  });

  it('marks a pure-English run as english and pure-native as not', () => {
    const segs = segmentBilingual('go out');
    expect(segs.length).toBe(1);
    expect(segs[0].english).toBe(true);

    const ru = segmentBilingual('Привет мир');
    expect(ru.every((s) => !s.english)).toBe(true);
  });

  it('keeps punctuation/spaces with their neighbour, no empty fragments', () => {
    const segs = segmentBilingual('Слово "have" значит «иметь».');
    expect(segs.every((s) => s.text.length > 0)).toBe(true);
    // reconstruct original exactly (no characters lost)
    expect(segs.map((s) => s.text).join('')).toBe('Слово "have" значит «иметь».');
    expect(segs.some((s) => s.english && s.text.includes('have'))).toBe(true);
  });

  it('treats a token with mixed scripts as native (not english)', () => {
    // "Iам" — латиница + кириллица слиплись: НЕ английский (есть не-латинская буква)
    const segs = segmentBilingual('Iам');
    expect(segs.length).toBe(1);
    expect(segs[0].english).toBe(false);
  });

  it('handles empty and whitespace input safely', () => {
    expect(segmentBilingual('')).toEqual([]);
    const sp = segmentBilingual('   ');
    expect(sp.map((s) => s.text).join('')).toBe('   ');
  });

  it('preserves the full text across a long mixed explanation', () => {
    const input = 'Ты выбрал "goes", но подлежащее they — нужна форма go без -s.';
    const segs = segmentBilingual(input);
    expect(segs.map((s) => s.text).join('')).toBe(input);
    // оба английских куска выделены
    const eng = segs.filter((s) => s.english).map((s) => s.text).join(' ');
    expect(eng).toContain('goes');
    expect(eng).toContain('they');
    expect(eng).toContain('go');
  });
});
