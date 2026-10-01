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

  test('шапка (премьера, плашки, заголовок) — в ListHeaderComponent, вид прежний', () => {
    const start = source.indexOf('ListHeaderComponent={<>');
    expect(start).toBeGreaterThan(0);
    const header = source.slice(start, source.indexOf('ListEmptyComponent=', start));
    expect(header).toContain('<YoutubePremiereHero');
    expect(header).toContain('packsRow');
    expect(header).toContain('savedRow');
    expect(header).toContain('copy.recent');
  });

  test('вид карточек обновляется при смене открытого ролика, избранного и фраз', () => {
    expect(source).toContain('extraData={homeListExtra}');
    expect(source).toMatch(/homeListExtra = useMemo\(\(\) => \(\{ activeVideoId, expandedPhraseVideoId, saved: favorites\.savedIds/);
  });

  test('переход из «Из видео» прокручивает к ролику по индексу списка', () => {
    expect(source).toContain('homeListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 })');
  });
});
