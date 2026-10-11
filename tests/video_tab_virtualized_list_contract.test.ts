import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 01.10, FINAL_PHASE п.4): в каталоге уже 61 ролик. Пока вкладка «Видео»
// рисовала их .map внутри ScrollView, все карточки с обложками и блоками фраз монтировались
// разом — тяжёлый первый кадр и прокрутка. Сторож держит виртуальный список.
const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lingman_videos.tsx'), 'utf8');

describe('вкладка «Видео»: каталог роликов виртуализирован', () => {
  test('ролики идут через FlashList, а не .map в ScrollView', () => {
    expect(source).toContain('data={homeListVideos}');
    expect(source).toContain('renderItem={renderHomeVideo}');
    expect(source).toContain('ref={homeListRef}');
    expect(source).not.toMatch(/\b(allVideos|savedVideos|videos)\.map\(\(video\) => \(\s*<View key=\{video\.id\}/);
    expect(source).not.toContain('const videosList = ');
    expect(source).not.toContain('<ScrollView ref={homeScrollRef}');
  });

  test('ролики идут сеткой в две колонки (владелец 11.10, video-redesign #c1)', () => {
    expect(source).toContain('numColumns={2}');
    expect(source).toContain('<YoutubeVideoGridCard');
    expect(source).toContain("index % 2 === 0 ? styles.gridCellLeft : styles.gridCellRight");
  });

  test('шапка (премьера, «Сохранённые видео») — в ListHeaderComponent; «Наборы» — отдельная вкладка', () => {
    const start = source.indexOf('ListHeaderComponent={<>');
    expect(start).toBeGreaterThan(0);
    const header = source.slice(start, source.indexOf('ListEmptyComponent=', start));
    expect(header).toContain('<YoutubePremiereHero');
    expect(header).toContain('savedRow');
    expect(header).not.toContain('packsRow');
    expect(source).toContain("tab === 'packs'");
    expect(source).toContain('<FlashcardsVideoPacksScreen embedded');
  });

  test('вид карточек обновляется при смене открытого ролика, избранного и фраз', () => {
    expect(source).toContain('extraData={homeListExtra}');
    expect(source).toMatch(/homeListExtra = useMemo\(\(\) => \(\{ activeVideoId, expandedPhraseVideoId, saved: favorites\.savedIds/);
  });

  test('переход из «Из видео» прокручивает к ролику по индексу списка', () => {
    expect(source).toContain('homeListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 })');
  });
});
