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
    // 22.10 (закон владельца «назад везде в одном месте»): «назад» заготовки — общая ScreenBackButton экрана коллекции (работает сразу),
    // в строке заготовки — её место
    expect(skeleton).toContain('<PackTopBarRow left={<ScreenBackSlot />} />');
    expect(screen).toContain('<ScreenBackButton screen="flashcards_collection"');
    expect(skeleton).not.toMatch(/cardCount|cards\.length|\{count\}/);
    expect(skeleton).toContain("export const COMMUNITY_PACK_PREVIEW_SKELETON_TEST_ID = 'pack-preview-resolving';");
  });

  it('начальный каталог берёт набор из тёплого каталога сообщества, если выбранной плитки нет', () => {
    const data = read('app/flashcards/useCollectionData.ts');
    expect(data).toContain('peekPublishedCommunityMarketPacks(studyTarget)?.find((pack) => pack.id === opts.deeplinkPackId)');
    expect(data).toContain('peekPublishedCommunityMarketPacks,');
  });
});

describe('просмотр по прямой ссылке: карточки грузятся сразу, одним запросом на набор', () => {
  const data = read('app/flashcards/useCollectionData.ts');

  it('эффект ссылки стартует загрузку по id из ссылки (startCommunityPackOpen) только для просмотра этого набора', () => {
    expect(data).toContain("import { peekCommunityPackOpen, startCommunityPackOpen } from '../community_packs/stage_with_retry';");
    expect(data).toContain('previewPackIdRef.current === deeplinkPackId');
    expect(data).toContain("startCommunityPackOpen(deeplinkPackId, studyTarget, undefined, 'deeplink')");
  });

  it('loadAll не запускает второй такой же запрос: память сессии → идущая загрузка → только потом свой запрос', () => {
    expect(data).toContain('Promise.all(previewIdsToLoad.map((id) => fetchPreviewPackCardsOnce(id, studyTarget)))');
    const helper = data.slice(data.indexOf('async function fetchPreviewPackCardsOnce'), data.indexOf('export function useCollectionData('));
    expect(helper.indexOf('peekStagedCommunityPackCards')).toBeLessThan(helper.indexOf('peekCommunityPackOpen'));
    expect(helper.indexOf('peekCommunityPackOpen')).toBeLessThan(helper.indexOf('fetchCommunityPackCards('));
  });

  it('журнал [PACK-OPEN] cards_fetch: start / reuse / done с источником и мс', () => {
    for (const marker of ["stage: 'start', source: 'deeplink_parallel'", "stage: 'reuse', source: 'memo'", "stage: 'reuse', source: 'inflight'", "stage: 'start', source: 'loadAll'", "source: 'deeplink_effect'"]) {
      expect(data).toContain(marker);
    }
    expect(data).toContain('ms: Date.now() - parallelStartedAt');
  });
});
