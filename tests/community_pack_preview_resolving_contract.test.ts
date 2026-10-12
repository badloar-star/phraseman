// зачем (координатор 12.10, аудит скорости R1, cards-v2-015): просмотр набора сообщества по прямой ссылке первые ~1,7 с показывал «0 карточек» (экран СВОЕГО набора с пустой
// сеткой), потом перескакивал на настоящий просмотр. Пока метаданных набора нет и каталог не ответил — заготовки той же геометрии без чисел; тёплый каталог в памяти,
// если знает набор, отдаёт шапку с первого кадра.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('просмотр набора сообщества: нет ложного нуля', () => {
  const screen = read('app/flashcards_collection.tsx');
  const skeleton = read('app/flashcards/CommunityPackPreviewSkeleton.tsx');

  it('экран показывает заготовки, пока набора нет в каталоге и каталог ещё не ответил', () => {
    expect(screen).toContain('const previewResolving = previewMode && !!packDeeplink && !currentMarketPack && !videoMomentPack && !collectionDataReady;');
    expect(screen).toContain('&& !currentMarketPack?.videoId && !previewResolving;');
    expect(screen).toContain('<CommunityPackPreviewSkeleton lang={lang} onBack={handleCollectionBack} />');
    // ветка заготовок стоит ДО экрана просмотра и до экрана своего набора
    expect(screen.indexOf('previewResolving ? (')).toBeLessThan(screen.indexOf('previewMode && currentMarketPack ? ('));
  });

  it('заготовки: «назад» работает сразу, чисел и названий нет, геометрия просмотра (плитка 118, боковой отступ 20)', () => {
    expect(skeleton).toContain('const SIDE = 20;');
    expect(skeleton).toContain('const SKELETON_ROW_H = 118;');
    expect(skeleton).toContain('<PackBackBare g={g} testID="pack-preview-back" label={backLabel} onPress={onBack} />');
    expect(skeleton).not.toMatch(/cardCount|cards\.length|\{count\}/);
    expect(skeleton).toContain("export const COMMUNITY_PACK_PREVIEW_SKELETON_TEST_ID = 'pack-preview-resolving';");
  });

  it('начальный каталог берёт набор из тёплого каталога сообщества, если выбранной плитки нет', () => {
    const data = read('app/flashcards/useCollectionData.ts');
    expect(data).toContain('peekPublishedCommunityMarketPacks(studyTarget)?.find((pack) => pack.id === opts.deeplinkPackId)');
    expect(data).toContain('peekPublishedCommunityMarketPacks,');
  });
});
