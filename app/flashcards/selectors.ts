// Pure derived-logic for card lists and filter structures.
import type { Lang } from '../../constants/i18n';
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

export function applyCardFilter(
  cards: CardItem[],
  activeFilter: string,
  /**
   * зачем (макет B1 `.fchips`): фильтр по статусу изучения — «Учу»,
   * «Повторить», «Освоены», «Слабые». Карта статусов приходит извне
   * (её читает экран из локального хранилища), чтобы селектор остался
   * чистой функцией и тестировался без моков хранилища.
   */
  statuses?: Record<string, string>,
): CardItem[] {
  const list = cards ?? [];
  if (activeFilter === 'all') return list;
  if (activeFilter.startsWith('status:')) {
    // Статусы ещё не загрузились — не прячем список, показываем как есть.
    if (!statuses) return list;
    const want = activeFilter.slice(7);
    // Карточки без записи прогресса считаются новыми (та же логика, что у точек).
    return list.filter((c) => (statuses[c.id] ?? 'new') === want);
  }
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
  lang: Lang,
): FilterGroup[] {
  if (activeCat !== 'saved' && activeCat !== 'custom') return [];
  const list = cards ?? [];
  const sourceLabels: Record<string, string> = {
    word: FILTER_SOURCE_LABELS[lang].word,
    verb: FILTER_SOURCE_LABELS[lang].verb,
    dialog: FILTER_SOURCE_LABELS[lang].dialog,
    quiz: FILTER_SOURCE_LABELS[lang].quiz,
    daily_phrase: FILTER_SOURCE_LABELS[lang].daily_phrase,
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
        label: `${FILTER_LESSON_LABELS[lang]} ${id}`,
      }));
    groups.push({
      groupKey: 'lessons',
      groupLabel: FILTER_LESSONS_GROUP_LABELS[lang],
      items: lessonItems,
    });
  }
  if (others.size > 0) {
    const otherItems = Array.from(others.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label }));
    groups.push({
      groupKey: 'other',
      groupLabel: FILTER_OTHER_GROUP_LABELS[lang],
      items: otherItems,
    });
  }
  return groups;
}

export function buildFilterOptions(
  filterGroups: FilterGroup[],
  lang: Lang,
): { key: string; label: string }[] {
  const all = { key: 'all', label: FILTER_ALL_LABELS[lang] };
  return [all, ...filterGroups.flatMap(g => g.items)];
}

const FILTER_SOURCE_LABELS: Record<Lang, Record<'word' | 'verb' | 'dialog' | 'quiz' | 'daily_phrase', string>> = {
  ru: { word: 'Слова', verb: 'Глаголы', dialog: 'Диалоги', quiz: 'Вызовы', daily_phrase: 'Фраза дня' },
  uk: { word: 'Слова', verb: 'Дієслова', dialog: 'Діалоги', quiz: 'Квізи', daily_phrase: 'Фраза дня' },
  es: { word: 'Palabras', verb: 'Verbos', dialog: 'Diálogos', quiz: 'Cuestionarios', daily_phrase: 'Frase del día' },
  'pt-BR': { word: 'Palavras', verb: 'Verbos', dialog: 'Diálogos', quiz: 'Quizzes', daily_phrase: 'Frase do dia' },
  vi: { word: 'Từ', verb: 'Động từ', dialog: 'Hội thoại', quiz: 'Quiz', daily_phrase: 'Cụm từ hôm nay' },
  id: { word: 'Kata', verb: 'Verba', dialog: 'Dialog', quiz: 'Kuis', daily_phrase: 'Frasa harian' },
  tr: { word: 'Kelimeler', verb: 'Fiiller', dialog: 'Diyaloglar', quiz: 'Quizler', daily_phrase: 'Günün ifadesi' },
  pl: { word: 'Słowa', verb: 'Czasowniki', dialog: 'Dialogi', quiz: 'Quizy', daily_phrase: 'Fraza dnia' },
};

const FILTER_LESSON_LABELS: Record<Lang, string> = {
  ru: 'Урок',
  uk: 'Урок',
  es: 'Lección',
  'pt-BR': 'Aula',
  vi: 'Bài',
  id: 'Pelajaran',
  tr: 'Ders',
  pl: 'Lekcja',
};

const FILTER_LESSONS_GROUP_LABELS: Record<Lang, string> = {
  ru: 'Уроки',
  uk: 'Уроки',
  es: 'Lecciones',
  'pt-BR': 'Aulas',
  vi: 'Bài học',
  id: 'Pelajaran',
  tr: 'Dersler',
  pl: 'Lekcje',
};

const FILTER_OTHER_GROUP_LABELS: Record<Lang, string> = {
  ru: 'Прочее',
  uk: 'Інше',
  es: 'Otros',
  'pt-BR': 'Outros',
  vi: 'Khác',
  id: 'Lainnya',
  tr: 'Diğer',
  pl: 'Inne',
};

const FILTER_ALL_LABELS: Record<Lang, string> = {
  ru: 'Все',
  uk: 'Всі',
  es: 'Todas',
  'pt-BR': 'Todas',
  vi: 'Tất cả',
  id: 'Semua',
  tr: 'Tümü',
  pl: 'Wszystkie',
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
