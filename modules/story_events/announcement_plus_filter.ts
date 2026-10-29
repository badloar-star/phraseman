// ═══════════════════════════════════════════════════════════════════════════
// announcement_plus_filter.ts — какие объявления-истории видит человек: у владельца Plus реклама Plus (design=plus) убрана совсем.
//
// зачем (владелец 29.10, кнопка «Скрывать у Plus» через координатора): у человека с Plus кнопка «Открыть Plus» только закрывала историю —
// объявление plus ему не нужно. Фильтр на клиенте по уже известному статусу Plus (PremiumContext: снимок профиля → живой статус), без
// новых чтений. Скрытое объявление не входит в истории и в счёт непросмотренных — кольцо от него не загорается.
// Без React Native — правило проверяется тестом напрямую.
// ═══════════════════════════════════════════════════════════════════════════
import type { StoryEvent, StoryEventList } from './story_events_core';

/** Дизайны объявлений, которые человек с Plus не видит. */
export const ANNOUNCEMENT_DESIGNS_HIDDEN_FOR_PLUS: ReadonlySet<string> = new Set(['plus']);

export type AnnouncementsForViewer = Readonly<{
  visible: StoryEventList;
  /** Скрытые у владельца Plus — для лога причины. */
  hidden: readonly Readonly<{ id: string; design: string }>[];
  /** Объявления, которые не удалось разобрать (показываются как есть) — для лога. */
  unreadable: readonly string[];
}>;

type DesignRead = Readonly<{ design: string | null; error: string | null }>;

function designOf(event: StoryEvent): DesignRead {
  const raw = event.payload.contentJson;
  if (typeof raw !== 'string') return { design: null, error: 'нет contentJson' };
  try {
    const parsed = JSON.parse(raw) as { design?: unknown };
    return { design: typeof parsed.design === 'string' ? parsed.design : null, error: null };
  } catch (error: unknown) {
    return { design: null, error: `contentJson не JSON: ${String(error).slice(0, 80)}` };
  }
}

/** Объявления-истории для просмотра: при hasPlus без рекламы Plus. Нечитаемое объявление не прячем — его покажет прежний кадр. */
export function announcementsForViewer(stories: StoryEventList, hasPlus: boolean): AnnouncementsForViewer {
  if (!hasPlus) return { visible: stories, hidden: [], unreadable: [] };
  const reads = stories.map((event) => ({ event, read: designOf(event) }));
  const isHidden = (read: DesignRead): boolean => read.design !== null && ANNOUNCEMENT_DESIGNS_HIDDEN_FOR_PLUS.has(read.design);
  return {
    visible: reads.filter(({ read }) => !isHidden(read)).map(({ event }) => event),
    hidden: reads.filter(({ read }) => isHidden(read)).map(({ event, read }) => ({ id: event.id, design: read.design ?? '' })),
    unreadable: reads.filter(({ read }) => read.error !== null).map(({ event, read }) => `${event.id}: ${read.error ?? ''}`),
  };
}
