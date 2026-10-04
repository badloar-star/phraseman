import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('lesson words option layout contract', () => {
  it('keeps distractor cards stable under large text settings', () => {
    const source = read('app/lesson_words.tsx');
    const start = source.indexOf('{current.options.map((opt, i) => {');
    const block = source.slice(start, source.indexOf('{current && (', start));

    expect(start).toBeGreaterThanOrEqual(0);
    // зачем: карточки ответов переведены на Liquid Glass — теперь <Pressable> с width 48%/100%, minHeight 56 и
    // переносом слов; устойчивость к крупному тексту держат minWidth:0 + maxFontSizeMultiplier, а не обрезка.
    // 04.10 (redesign-round-1 «Словарь» A, владелец): сетка 2 в ряд для всех раундов, ширина колонки из onLayout
    // ряда (зазор 10), высота варианта 76.
    expect(block).toContain('width: optionsRowWidth > 0 ? Math.floor((optionsRowWidth - 10) / 2)');
    expect(block).toContain('minHeight: 76');
    expect(block).toContain('minWidth:0');
    expect(block).toContain('flexShrink:1');
    expect(block).toContain('maxFontSizeMultiplier={1.2}');
  });

  it('does not use heavy wrong-answer haptics for option cards', () => {
    const source = read('app/lesson_words.tsx');
    const start = source.indexOf('{current.options.map((opt, i) => {');
    const block = source.slice(start, source.indexOf('{current && (', start));

    // зачем: у плиток ответа вибрации нет вовсе (правило владельца: хаптик только на управляющих кнопках).
    expect(block).not.toMatch(/haptic/i);
    expect(source).toContain('hapticTap()');
    expect(block).not.toMatch(/haptic(Error|Heavy|Impact|Notification)/);
  });
});
