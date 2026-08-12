import fs from 'fs';
import path from 'path';

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
const optionsStart = lessonSource.indexOf('{wordOptionItems.map(');
const optionsEnd = lessonSource.indexOf('{/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}', optionsStart);
const optionsBlock = lessonSource.slice(optionsStart, optionsEnd);

describe('lesson word press accuracy', () => {
  it('applies an accepted tap immediately while briefly locking double taps', () => {
    expect(lessonSource).toContain('const [wordDispatchPending, setWordDispatchPending] = useState(false)');
    expect(lessonSource).toContain('const WORD_DISPATCH_LOCK_MS = 90;');
    expect(optionsBlock).toContain('setWordDispatchPending(true)');
    expect(optionsBlock).toContain('setWordDispatchPending(false)');
    expect(optionsBlock).toContain('disabled={wordDispatchPending}');
    expect(optionsBlock.indexOf('}, WORD_DISPATCH_LOCK_MS);'))
      .toBeLessThan(optionsBlock.indexOf('handleWordPress(word)'));
    expect(optionsBlock).toMatch(
      /wordDispatchTimerRef\.current = setTimeout\(\(\) => \{\s*wordDispatchTimerRef\.current = null;\s*setWordDispatchPending\(false\);\s*\}, WORD_DISPATCH_LOCK_MS\);\s*handleWordPress\(word\);/,
    );
  });

  it('keeps instant flash feedback attached to the exact option and phrase step', () => {
    expect(lessonSource).toContain('const optionKey = `${phraseEnterKey}:${phraseWordIdx}:${i}:${word}`');
    expect(optionsBlock).toContain('const isFlashing = flashWord?.optionKey === optionKey');
    expect(optionsBlock).toContain('triggerWordFlash(optionKey, isCorrectOption)');
  });
});
