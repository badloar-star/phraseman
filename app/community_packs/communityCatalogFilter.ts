/**
 * Фильтр каталога наборов сообщества (замечание владельца после теста на iPhone:
 * «не просто список — добавь фильтрацию»).
 *
 * Чистый модуль без React/Firestore: поиск по названию во всех локалях каталога
 * и ДВЕ понятные сортировки — «Популярные / Новые».
 *
 * 2026-08-13 (владелец, после теста на iPhone): фильтр «Больше карточек» убран
 * полностью — он ничего не решал и только занимал место в шапке.
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { packMatchesLanguageFilter, type PackLanguage } from '../flashcards/pack_languages';
import { sortPacksBySocial } from './packSocial';

/** Сортировка каталога сообщества (§ фильтр, замечание владельца). */
export type CommunityPacksSort = 'popular' | 'new';

export const COMMUNITY_SORTS: readonly CommunityPacksSort[] = ['popular', 'new'];

export function filterPacksByLanguage(
  packs: readonly FlashcardMarketPack[],
  language: PackLanguage,
): FlashcardMarketPack[] {
  // зачем (D127): набор «без языка» не привязан к изучаемому языку — виден при любом фильтре.
  return packs.filter((pack) => packMatchesLanguageFilter(pack.packLanguage ?? pack.studyTarget, language));
}

/**
 * Наборы, собранные из роликов YouTube (есть `videoId`).
 *
 * зачем ЗДЕСЬ, а рядом с остальными фильтрами каталога: источник наборов в
 * приложении ОДИН, и раздел «Из видео» — это отбор из него, а не вторая база.
 * Свой отдельный загрузчик уже приводил к тому, что набор был в базе, но не
 * показывался (`project_own_pack_missing_in_deck_picker`: источников три,
 * список собирался из двух).
 */
export function filterVideoPacks(packs: readonly FlashcardMarketPack[]): FlashcardMarketPack[] {
  return packs.filter((pack) => !!pack.videoId);
}

/**
 * Лента Сообщества — только то, что публикуют люди: без наборов из роликов (есть `videoId`).
 *
 * зачем (владелец 18.10: «Наборы из видео НЕ должны отображаться в Сообществе. Там только то, что публикуют люди»):
 * видео-наборы лежат в той же коллекции community_packs, и лента показывала их вперемешку. Общий каталог НЕ режем —
 * из него тренировка, поиск и ссылки берут наборы, которыми человек владеет; режем только то, что видит лента и её счётчик.
 */
export function excludeVideoPacks(packs: readonly FlashcardMarketPack[]): FlashcardMarketPack[] {
  return packs.filter((pack) => !pack.videoId);
}

export function communitySortLabel(sort: CommunityPacksSort, lang: Lang): string {
  if (sort === 'new') {
    return triLang(lang, {
      ru: 'Новые', uk: 'Нові', en: 'New', es: 'Nuevos',
      'pt-BR': 'Novos', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
    });
  }
  return triLang(lang, {
    ru: 'Популярные', uk: 'Популярні', en: 'Popular', es: 'Populares',
    'pt-BR': 'Populares', vi: 'Phổ biến', id: 'Populer', tr: 'Popüler', pl: 'Popularne',
  });
}

/**
 * Иконка сортировки для круглых кнопок в шапке каталога (подписей на кнопках нет —
 * название уходит в `accessibilityLabel`). Имена — из набора Ionicons.
 */
export function communitySortIonicon(sort: CommunityPacksSort, active: boolean): string {
  if (sort === 'new') return active ? 'sparkles' : 'sparkles-outline';
  return active ? 'flame' : 'flame-outline';
}

/** Совпадение по названию набора во всех локалях каталога и по имени автора. */
export function communityPackMatchesQuery(pack: FlashcardMarketPack, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    pack.titleRu, pack.titleUk, pack.titleEs, pack.titlePtBr,
    pack.titleVi, pack.titleId, pack.titleTr, pack.titlePl, pack.codeName,
    // зачем (cards-v2 catalog(): капсула поиска «Наборы и авторы»): ищем и по имени автора из документа набора.
    pack.authorName,
  ];
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
}

/** Чистая функция каталога: поиск по названию + выбранная сортировка. */
export function applyCommunityPacksFilter(
  packs: FlashcardMarketPack[],
  query: string,
  sort: CommunityPacksSort,
  language?: PackLanguage,
): FlashcardMarketPack[] {
  const languagePacks = language ? filterPacksByLanguage(packs, language) : packs;
  const found = languagePacks.filter((p) => communityPackMatchesQuery(p, query));
  if (sort === 'new') {
    return [...found].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.id.localeCompare(b.id),
    );
  }
  return sortPacksBySocial(found);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
