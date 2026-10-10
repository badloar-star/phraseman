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

  // зачем (11.10): «Карточки 2.0» (a8e939f24) заменили вечный цикл подсказки на одноразовый: только первая
  // строка, 2 повтора, флаг «уже видел». Слушателя AppState в строке больше нет. Сторож держит ту же цель —
  // фоновая анимация не размножается по списку и не живёт вечно.
  test('only the first flashcard row runs a finite, one-time nudge and no row owns an AppState listener', () => {
    const source = read('app/flashcards/FlashcardListItem.tsx');
    expect(source).toContain("if (!hasDetails || detailsExpanded || itemIdx !== 0) return;");
    expect(source).toMatch(/Animated\.loop\([\s\S]{0,600}\{ iterations: 2 \}/);
    expect(source).toContain("getHintFlag('chevron_nudge')");
    expect(source).not.toContain('AppState.addEventListener');
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
