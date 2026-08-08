import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('lesson card contrast contract', () => {
  it('keeps lesson meta labels dark only on light or bright filled lesson cards', () => {
    const source = read('app/(tabs)/lessons.tsx');

    expect(source).toContain('const LESSON_CARD_FILLED_META_TEXT = \'#07110A\';');
    expect(source).toContain('const LESSON_CARD_OPEN_META_TEXT = LESSON_CARD_FILLED_META_TEXT;');
    expect(source).toContain('const useDarkMetaText = isSagePorcelainCard || useFilledMetaText;');
    expect(source).toContain('const useFilledMetaText = isComplete && showLessonProgressFill && bgLuminance > 0.45;');
    expect(source).toContain('color: useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor');
    expect(source).toContain('...(useDarkMetaText ? {} : LESSON_CARD_ACCENT_TEXT_SHADOW)');

    const metaStart = source.indexOf('const lessonMetaColor = isSagePorcelainTheme');
    const metaEnd = source.indexOf('return (<LessonCard key={`l-${num}`}', metaStart);
    expect(metaStart).toBeGreaterThanOrEqual(0);
    expect(metaEnd).toBeGreaterThan(metaStart);

    const metaBlock = source.slice(metaStart, metaEnd);
    expect(metaBlock).toContain(": 'rgba(255,255,255,0.97)';");
    expect(metaBlock).not.toContain(': rgbaHexCached(lessonAccent, 0.82);');
  });

  it('does not overlay an accent strip across rounded lesson-card corners', () => {
    const source = read('app/(tabs)/lessons.tsx');

    expect(source).not.toContain('LESSON_CARD_ACCENT_EDGE_SHADOW');
  });

});
