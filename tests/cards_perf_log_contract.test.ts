// зачем (координатор 12.10, «оптимизация всегда»): журнал [CARDS-PERF] должен жить только в dev и стоять в галерее, «Сохранённых» и каталоге.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[CARDS-PERF]', () => {
  it('модуль журнала работает только в dev', () => {
    const src = read('components/cards-grid/cardsPerfLog.ts');
    expect(src).toContain("const DEV = typeof __DEV__ !== 'undefined' && __DEV__;");
    expect(src.match(/if \(!DEV\) return;/g)?.length).toBe(3);
    expect(src).toContain('[CARDS-PERF]');
  });

  it('счётчики стоят в плитке галереи, в «Сохранённых» и в строке каталога', () => {
    expect(read('components/cards-grid/CardsGallery.tsx')).toContain("cardsPerfCount('tile-render')");
    const saved = read('app/flashcards/CollectionGalleryView.tsx');
    expect(saved).toContain("cardsPerfCount('scroll-event')");
    expect(saved).toContain("cardsPerfCount('window-step')");
    expect(saved).toContain("cardsPerfFlush('saved', 'first-frame'");
    expect(saved).toContain("cardsPerfFlush('saved', 'scroll-end'");
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).toContain("cardsPerfCount('catalog-row-render')");
    expect(hub).toContain("cardsPerfFlush('catalog', 'first-frame'");
    // зависимости эффекта не должны ссылаться на const, объявленный ниже по файлу (ReferenceError в рендере)
    expect(hub).toContain('menuPackId: ugcReportHintPackId ?? null');
  });
});
