// Governance-ID: TG-2AFE53C8C4CE
import fs from 'fs';
import path from 'path';

// зачем (аудит микрофризов, владелец 11.11): сетка плиток вынесена из экрана урока в
// components/LessonWordTiles.tsx, чтобы вспышка и блокировка двойного тапа перерисовывали только
// плитки. Проверки те же, что и раньше; поменялось только место, куда они смотрят, и добавлен
// запрет держать это состояние в экране урока (иначе тройная перерисовка вернётся).
const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
const tilesSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'LessonWordTiles.tsx'), 'utf8');
const optionsStart = tilesSource.indexOf('{wordOptionItems.map(');
const optionsBlock = tilesSource.slice(optionsStart);

describe('lesson word press accuracy', () => {
  it('applies an accepted tap immediately while briefly locking double taps', () => {
    expect(optionsStart).toBeGreaterThan(0);
    expect(tilesSource).toContain('const [wordDispatchPending, setWordDispatchPending] = useState(false)');
    expect(tilesSource).toContain('const WORD_DISPATCH_LOCK_MS = 90;');
    expect(optionsBlock).toContain('setWordDispatchPending(true)');
    expect(optionsBlock).toContain('setWordDispatchPending(false)');
    expect(optionsBlock).toContain('disabled={wordDispatchPending}');
    expect(optionsBlock.indexOf('}, WORD_DISPATCH_LOCK_MS);'))
      .toBeLessThan(optionsBlock.indexOf('onWordPress(word)'));
    expect(optionsBlock).toMatch(
      /wordDispatchTimerRef\.current = setTimeout\(\(\) => \{\s*wordDispatchTimerRef\.current = null;\s*setWordDispatchPending\(false\);\s*\}, WORD_DISPATCH_LOCK_MS\);\s*onWordPress\(word\);/,
    );
  });

  it('keeps instant flash feedback attached to the exact option and phrase step', () => {
    expect(lessonSource).toContain('const optionKey = `${phraseEnterKey}:${phraseWordIdx}:${i}:${word}`');
    expect(optionsBlock).toContain('const isFlashing = flashWord?.optionKey === optionKey');
    expect(optionsBlock).toContain('triggerWordFlash(optionKey, isCorrectOption)');
  });

  it('lesson screen delegates the tile bank and routes the chosen word into handleWordPress', () => {
    expect(lessonSource).toContain('<LessonWordTiles');
    expect(lessonSource).toContain('wordOptionItems={wordOptionItems}');
    expect(lessonSource).toContain('onWordPress={onTileWordPress}');
    expect(lessonSource).toMatch(
      /tileWordPressLatestRef\.current = \(word: string\) => \{\s*if \(showTapHint\) setShowTapHint\(false\);\s*handleWordPress\(word\);\s*\};/,
    );
  });

  it('keeps flash and double-tap lock state out of the big lesson block', () => {
    // Вернётся сюда — каждый тап снова перерисует весь блок урока три раза.
    expect(lessonSource).not.toContain('setWordDispatchPending');
    expect(lessonSource).not.toContain('setFlashWord');
  });
});
