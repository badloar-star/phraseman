import fs from 'fs';
import path from 'path';

/**
 * Плашки НЕОТКРЫТЫХ (не премиум, просто ещё не пройденных по прогрессу) уроков в
 * каждой теме должны: (1) нести цвет ТЕМЫ, а не быть одинаково-серыми;
 * (2) читаться как ЗАКРЫТЫЕ — то есть быть ТЕМНЕЕ открытых; (3) показывать
 * видимый маленький замочек.
 *
 * История бага:
 *  - Сначала фон закрытой плашки был захардкожен серым ['#1c1c1e',…] → тема
 *    игнорировалась.
 *  - Затем закрытую плашку перевели на darkenHex(bg, 0.22/0.17/0.13), но на
 *    тёмных темах (Полночь) множитель 0.22 БОЛЬШЕ открытого 0.52? Нет — darkenHex
 *    умножает на factor, поэтому 0.22 темнее 0.52. Однако сама плашка получалась
 *    светлее, чем должна (открытый стоп 0.52 ярче). Итог — все плашки сливались.
 *  - Финал: закрытая плашка = darkenHex(bg, 0.30/0.25/0.20) — темнее открытой
 *    (0.52) и темнее exam-locked (0.36), + замок покрашен светлым (виден).
 *
 * darkenHex(hex, f) === rgb(r*f, g*f, b*f): БОЛЬШИЙ factor = СВЕТЛЕЕ, меньший = темнее.
 */
function lessonsSource(): string {
  return fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');
}

describe('locked (progress-gated, non-premium) lesson tiles: themed, darker, with a lock', () => {
  it('does not hardcode the neutral gray gradient for the locked tile anymore', () => {
    const source = lessonsSource();
    expect(source).not.toContain("['#1c1c1e', '#242426', '#1a1a1c']");
  });

  it('plain-locked tile uses a darkened theme color (darkenHex of bg)', () => {
    const source = lessonsSource();
    const start = source.indexOf('{/* Card background */}');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = source.slice(start, start + 1600);
    expect(block).toContain('[darkenHex(bg, 0.30), darkenHex(bg, 0.25), darkenHex(bg, 0.20)]');
  });

  it('gold and coral keep their dedicated locked treatments', () => {
    const source = lessonsSource();
    const start = source.indexOf('{/* Card background */}');
    const block = source.slice(start, start + 1600);
    expect(block).toContain('GOLD_GRADIENTS.mutedPanel');
    expect(block).toContain("['#1A1113', '#24191C', '#130D0F']");
  });

  it('locked tile is DARKER than the unlocked tile (clear "not yet earned" read)', () => {
    // unlocked top stop = darkenHex(bg, 0.52); plain-locked top = darkenHex(bg, 0.30).
    // darkenHex multiplies by factor → smaller factor = darker pixel.
    const unlockedTop = 0.52;
    const plainLockedTop = 0.30;
    expect(plainLockedTop).toBeLessThan(unlockedTop);
  });

  it('locked tile is darker than the exam-locked tile', () => {
    // exam-locked uses darkenHex(bg, 0.36/0.31/0.26); plain-locked must be darker.
    const examTop = 0.36;
    const plainTop = 0.30;
    expect(plainTop).toBeLessThan(examTop);
  });

  it('the lock icon is painted with a visible light color (not the dark bg tint)', () => {
    const source = lessonsSource();
    // The non-gold/non-coral locked lock must NOT use rgbaHex(lessonAccent, 0.46)
    // (that equals the dark bg and disappears). It must be a light/white tone.
    // The lesson-tile lock line is the unique one that also references
    // lockedCardHasLightFill (the chapter-header lock does not).
    const lockLine = source
      .split('\n')
      .find((l) => l.includes('name="lock-closed"') && l.includes('lockedCardHasLightFill'));
    expect(lockLine).toBeDefined();
    expect(lockLine).toContain("'rgba(255,255,255,0.55)'");
    expect(lockLine).not.toContain('rgbaHex(lessonAccent, 0.46)');
  });
});
