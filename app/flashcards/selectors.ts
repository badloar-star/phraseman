// Pure derived-logic for card lists and filter structures.
import { CardItem, CategoryId } from './types';

export type FilterGroup = {
  groupKey: string;
  groupLabel: string;
  items: { key: string; label: string }[];
};

export function getCardsForCategory(
  activeCat: CategoryId,
  savedCards: CardItem[],
  customCards: CardItem[],
  systemCards: CardItem[],
): CardItem[] {
  if (activeCat === 'saved') return savedCards ?? [];
  if (activeCat === 'custom') return customCards ?? [];
  return (systemCards ?? []).filter(c => c.categoryId === activeCat);
}

export function applyCardFilter(cards: CardItem[], activeFilter: string): CardItem[] {
  const list = cards ?? [];
  if (activeFilter === 'all') return list;
  return list.filter(c => {
    if (activeFilter.startsWith('lesson:')) {
      return c.source === 'lesson' && c.sourceId === activeFilter.slice(7);
    }
    return c.source === activeFilter;
  });
}

export function buildFilterGroups(
  cards: CardItem[],
  activeCat: CategoryId,
  lang: 'ru' | 'uk' | 'es',
): FilterGroup[] {
  if (activeCat !== 'saved' && activeCat !== 'custom') return [];
  const list = cards ?? [];
  const sourceLabels: Record<string, string> = {
    word: lang === 'uk' ? 'Слова' : lang === 'es' ? 'Palabras' : 'Слова',
    verb: lang === 'uk' ? 'Дієслова' : lang === 'es' ? 'Verbos' : 'Глаголы',
    dialog: lang === 'uk' ? 'Діалоги' : lang === 'es' ? 'Diálogos' : 'Диалоги',
    quiz: lang === 'uk' ? 'Квізи' : lang === 'es' ? 'Cuestionarios' : 'Квизы',
    daily_phrase: lang === 'uk' ? 'Фраза дня' : lang === 'es' ? 'Frase del día' : 'Фраза дня',
  };

  const lessons = new Map<string, number>();
  const others = new Map<string, string>();
  for (const c of list) {
    if (c.source === 'lesson' && c.sourceId) {
      const n = parseInt(c.sourceId, 10);
      if (!isNaN(n)) lessons.set(c.sourceId, n);
    } else if (c.source && !others.has(c.source)) {
      others.set(c.source, sourceLabels[c.source] ?? c.source);
    }
  }
  if (lessons.size === 0 && others.size === 0) return [];

  const groups: FilterGroup[] = [];
  if (lessons.size > 0) {
    const lessonItems = Array.from(lessons.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => ({
        key: `lesson:${id}`,
        label: `${lang === 'es' ? 'Lección' : 'Урок'} ${id}`,
      }));
    groups.push({
      groupKey: 'lessons',
      groupLabel: lang === 'es' ? 'Lecciones' : 'Уроки',
      items: lessonItems,
    });
  }
  if (others.size > 0) {
    const otherItems = Array.from(others.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label }));
    groups.push({
      groupKey: 'other',
      groupLabel: lang === 'uk' ? 'Інше' : lang === 'es' ? 'Otros' : 'Прочее',
      items: otherItems,
    });
  }
  return groups;
}

export function buildFilterOptions(
  filterGroups: FilterGroup[],
  lang: 'ru' | 'uk' | 'es',
): { key: string; label: string }[] {
  const all = { key: 'all', label: lang === 'uk' ? 'Всі' : lang === 'es' ? 'Todas' : 'Все' };
  return [all, ...filterGroups.flatMap(g => g.items)];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
