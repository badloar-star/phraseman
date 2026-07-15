import fs from 'fs';
import path from 'path';

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
const optionsStart = lessonSource.indexOf('{wordOptionItems.map(');
const optionsEnd = lessonSource.indexOf('{/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}', optionsStart);
const optionsBlock = lessonSource.slice(optionsStart, optionsEnd);

describe('lesson word press accuracy', () => {
  it('disables the visible word bank while an accepted tap is awaiting dispatch', () => {
    expect(lessonSource).toContain('const [wordDispatchPending, setWordDispatchPending] = useState(false)');
    expect(optionsBlock).toContain('setWordDispatchPending(true)');
    expect(optionsBlock).toContain('setWordDispatchPending(false)');
    expect(optionsBlock).toContain('disabled={wordDispatchPending}');
  });

  it('keeps delayed flash feedback attached to the exact option and phrase step', () => {
    expect(lessonSource).toContain('const optionKey = `${phraseEnterKey}:${phraseWordIdx}:${i}:${word}`');
    expect(optionsBlock).toContain('const isFlashing = flashWord?.optionKey === optionKey');
    expect(optionsBlock).toContain('triggerWordFlash(optionKey, isCorrectOption)');
  });
});
