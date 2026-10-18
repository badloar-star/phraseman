// зачем (владелец 18.10: «Наборы из видео НЕ должны отображаться в Сообществе. Там только то, что публикуют люди»):
// видео-наборы лежат в той же коллекции community_packs. Сторож: лента Сообщества и счётчик её плитки без них,
// а раздел «Из видео» — только они.
import fs from 'node:fs';
import path from 'node:path';
import { excludeVideoPacks, filterVideoPacks } from '../app/community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const pack = (id: string, videoId?: string) => ({ id, videoId, isCommunityUgc: true }) as unknown as FlashcardMarketPack;

test('фильтр: Сообщество без видео-наборов, «Из видео» — только они', () => {
  const all = [pack('ugc-1'), pack('video-1', 'dQw4w9WgXcQ'), pack('ugc-2')];
  expect(excludeVideoPacks(all).map((p) => p.id)).toEqual(['ugc-1', 'ugc-2']);
  expect(filterVideoPacks(all).map((p) => p.id)).toEqual(['video-1']);
});

test('экран Сообщества кладёт в ленту только наборы людей — и из тёплого кэша, и после загрузки', () => {
  const screen = read('app/flashcards_packs.tsx');
  expect(screen).toContain('excludeVideoPacks(peekPublishedCommunityMarketPacks(studyTarget) ?? [])');
  expect(screen).toContain('const visible = excludeVideoPacks(dedup);');
  expect(screen).toContain('setCommunityPacks(visible);');
  expect(screen).not.toContain('setCommunityPacks(dedup);');
  expect(screen).toContain("'[COMMUNITY-SOURCE]'");
});

test('плитка «Сообщество» на хабе не считает видео-наборы', () => {
  const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
  expect(hub).toContain('pack.isCommunityUgc && !isLocalAuthorPackId(pack.id) && !pack.videoId');
});
