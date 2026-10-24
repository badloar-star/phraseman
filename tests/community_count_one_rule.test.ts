// зачем (владелец 24.10, баг T3: «Сообщество показывает то, чего там нет»): плитка «Сообщество» в хабе Карточек писала 2,
// а экран «Сообщество» на языке ES — «На этом языке пока нет наборов». Плитка считала все наборы людей, список отсекал
// скрытые на телефоне и чужой язык. Сторож: число и список — ОДНО правило communityFeedPacks.
import fs from 'node:fs';
import path from 'node:path';
import { applyCommunityPacksFilter, communityFeedPacks } from '../app/community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const pack = (id: string, packLanguage: string | undefined, extra: Partial<FlashcardMarketPack> = {}) =>
  ({ id, packLanguage, isCommunityUgc: true, updatedAt: '2026-10-20T10:00:00Z', ...extra }) as unknown as FlashcardMarketPack;
const isLocal = (id: string) => id.startsWith('local_pack_');

test('сценарий владельца: два английских набора, выбран ES — плитка 0, список пуст', () => {
  const catalog = [pack('en-1', 'en'), pack('en-2', 'en')];
  const feed = communityFeedPacks(catalog, { hiddenIds: new Set(), language: 'es', isLocalPack: isLocal });
  expect(feed.packs).toEqual([]);
  expect(feed.dropped.language).toBe(2);
  // список «Новые» строится поверх того же результата
  expect(applyCommunityPacksFilter(feed.packs, '', 'new')).toEqual([]);
});

test('правило отсекает видео, свои неопубликованные, скрытые и чужой язык; «без языка» видно всегда', () => {
  const catalog = [
    pack('es-1', 'es'),
    pack('video-1', 'es', { videoId: 'abc' }),
    pack('local_pack_1', 'es'),
    pack('es-hidden', 'es'),
    pack('fr-1', 'fr'),
    pack('none-1', 'none'),
  ];
  const feed = communityFeedPacks(catalog, { hiddenIds: new Set(['es-hidden']), language: 'es', isLocalPack: isLocal });
  expect(feed.packs.map((p) => p.id)).toEqual(['es-1', 'none-1']);
  expect(feed.dropped).toEqual({ video: 1, local: 1, hidden: 1, language: 1 });
});

test('сортировка «Новые» / «Популярные» не меняет число — только порядок', () => {
  const feed = communityFeedPacks([pack('a', 'es'), pack('b', 'es')], { hiddenIds: new Set(), language: 'es', isLocalPack: isLocal });
  expect(applyCommunityPacksFilter(feed.packs, '', 'new')).toHaveLength(feed.packs.length);
  expect(applyCommunityPacksFilter(feed.packs, '', 'popular')).toHaveLength(feed.packs.length);
});

test('плитка хаба и экран «Сообщество» считают одной функцией и пишут [COMMUNITY-COUNT]', () => {
  const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
  expect(hub).toContain('communityFeedPacks(ugc, { hiddenIds: hiddenCommunityIds, language: feedPackLanguage, isLocalPack: isLocalAuthorPackId })');
  expect(hub).toContain("loadHiddenCommunityPackIds(studyTarget)");
  expect(hub).toContain("'community_pack_hidden_changed'");
  expect(hub).toContain('subscribePackLanguage(setFeedPackLanguage)');
  expect(hub).toContain("'[COMMUNITY-COUNT] tile'");
  const list = read('app/flashcards/FlashcardsCategoryHub.tsx');
  expect(list).toContain('communityFeedPacks(communityPacks, { hiddenIds: hiddenCommunityPackIds, language: packLanguage, isLocalPack: isLocalAuthorPackId })');
  expect(list).toContain('applyCommunityPacksFilter(feed.packs, communityQuery, communitySort)');
  expect(list).toContain("'[COMMUNITY-COUNT] list'");
});
