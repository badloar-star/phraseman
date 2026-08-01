import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('micro runtime hot paths', () => {
  test('phrase download timeout releases only the caller, not single-flight ownership', () => {
    const source = read('hooks/phrase_audio_player.ts');
    expect(source).toContain('let nativeDownload = inFlightDownloads.get(key);');
    expect(source).toContain('return downloadFileWithTimeout(nativeDownload);');
    expect(source).toMatch(/nativeDownload[\s\S]*?\.finally\(\(\) => \{[\s\S]*?inFlightDownloads\.delete\(key\)/);
    expect(source).not.toMatch(/await downloadFileWithTimeout\(url, file\)[\s\S]*?inFlightDownloads\.delete\(key\)/);
  });

  test('only the focused flashcard row owns the nudge loop and AppState listener', () => {
    const source = read('app/flashcards/FlashcardListItem.tsx');
    expect(source).toContain('!isRowInFocus || !isScreenFocused');
    expect(source).toContain('chevronHintDelayMs, isRowInFocus, isScreenFocused');
  });

  test('discarded activity events return before identity storage reads', () => {
    const source = read('app/app_activity.ts');
    const earlyReturn = source.indexOf('if (!LOCAL_ACTIVITY_QUEUE_ENABLED && !canWriteToFirestore) return;');
    expect(earlyReturn).toBeGreaterThan(0);
    expect(earlyReturn).toBeLessThan(source.indexOf('await getCanonicalUserId()'));
    expect(source).toContain("const isErrorTrace = meta.result === 'error';");
    expect(source).toContain('meta.writeToFirestore === true');
  });
});
