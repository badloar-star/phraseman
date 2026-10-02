import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

// §70 (2026-10-02): сверка без пробелов/переносов и с одинаковыми кавычками —
// prettier перевёл lessons.tsx на двойные кавычки и разложил выражения по строкам.
const compact = (s: string): string => s.replace(/\s+/g, '').replace(/'/g, '"');

describe('lesson card contrast contract', () => {
  it('keeps lesson meta labels dark only on light or bright filled lesson cards', () => {
    const source = compact(read('app/(tabs)/lessons.tsx'));
    const has = (snippet: string) => expect(source).toContain(compact(snippet));

    has('const LESSON_CARD_FILLED_META_TEXT = "#07110A";');
    has('const LESSON_CARD_OPEN_META_TEXT = LESSON_CARD_FILLED_META_TEXT;');
    has('const useDarkMetaText = isSagePorcelainCard || useFilledMetaText;');
    has('const useFilledMetaText = isComplete && showLessonProgressFill && bgLuminance > 0.45;');
    has('color: useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor');
    has('...(useDarkMetaText ? {} : LESSON_CARD_ACCENT_TEXT_SHADOW)');

    const metaStart = source.indexOf(compact('const lessonMetaColor = isSagePorcelainTheme'));
    const metaEnd = source.indexOf(compact('return (<LessonCard key={`l-${num}`}'), metaStart);
    expect(metaStart).toBeGreaterThanOrEqual(0);
    expect(metaEnd).toBeGreaterThan(metaStart);

    // Незалитая открытая карточка всегда тёмная → подпись светлая (контраст ≥ 4.5).
    const metaBlock = source.slice(metaStart, metaEnd);
    expect(metaBlock).toContain('"rgba(255,255,255,0.97)";');
    expect(metaBlock).not.toContain(compact(': rgbaHexCached(lessonAccent, 0.82);'));
  });

  it('does not overlay an accent strip across rounded lesson-card corners', () => {
    const source = read('app/(tabs)/lessons.tsx');

    expect(source).not.toContain('LESSON_CARD_ACCENT_EDGE_SHADOW');
  });

});
