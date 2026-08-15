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
import { sortPacksBySocial } from './packSocial';

/** Сортировка каталога сообщества (§ фильтр, замечание владельца). */
export type CommunityPacksSort = 'popular' | 'new';

export const COMMUNITY_SORTS: readonly CommunityPacksSort[] = ['popular', 'new'];

export function communitySortLabel(sort: CommunityPacksSort, lang: Lang): string {
  if (sort === 'new') {
    return triLang(lang, {
      ru: 'Новые', uk: 'Нові', es: 'Nuevos',
      'pt-BR': 'Novos', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
    });
  }
  return triLang(lang, {
    ru: 'Популярные', uk: 'Популярні', es: 'Populares',
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

/** Совпадение по названию набора во всех локалях каталога. */
export function communityPackMatchesQuery(pack: FlashcardMarketPack, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    pack.titleRu, pack.titleUk, pack.titleEs, pack.titlePtBr,
    pack.titleVi, pack.titleId, pack.titleTr, pack.titlePl, pack.codeName,
  ];
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
}

/** Чистая функция каталога: поиск по названию + выбранная сортировка. */
export function applyCommunityPacksFilter(
  packs: FlashcardMarketPack[],
  query: string,
  sort: CommunityPacksSort,
): FlashcardMarketPack[] {
  const found = packs.filter((p) => communityPackMatchesQuery(p, query));
  if (sort === 'new') {
    return [...found].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.id.localeCompare(b.id),
    );
  }
  return sortPacksBySocial(found);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
