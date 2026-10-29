// use_story_events.ts — интерфейс «историй» для Дизайна (D192): кольцо у аватарки на Главной.
// useStoryEvents() → { unseenCount, stories, markSeen }. Первый кадр — из памяти процесса (синхронно), диск догружает фоном.
import { useAnnouncementStories } from './use_announcement_stories';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { DebugLogger } from '../../app/debug-logger';
import { usePremium } from '../../components/PremiumContext';
import { announcementsForViewer } from './announcement_plus_filter';
import { storyPlaybackQueue, storyRecentQueue, type StoryEventList } from './story_events_core';
import { markSeen as markStorySeenInStore, peekStoryEventsSnapshot, primeStoryEvents, subscribeStoryEvents } from './story_events_store';

export type UseStoryEventsResult = Readonly<{
  /** false — флаг stories_v1 выключен: кольца нет, историй нет. */
  enabled: boolean;
  unseenCount: number;
  /** Все живые истории (7 дней), новые первыми. */
  stories: StoryEventList;
  /** Тап по аватару (образец s2): непросмотренные по времени события, от старого к новому. */
  playback: StoryEventList;
  /** Тап без кольца (координатор 14.10): все истории за 7 дней по времени; пусто → тап ведёт туда, куда сейчас. */
  recent: StoryEventList;
  markSeen: (id: string) => void;
}>;

export function useStoryEvents(): UseStoryEventsResult {
  const snapshot = useSyncExternalStore(subscribeStoryEvents, peekStoryEventsSnapshot, peekStoryEventsSnapshot);
  useEffect(() => {
    void primeStoryEvents('use_story_events');
  }, []);
  const announcements=useAnnouncementStories(snapshot.enabled);
  const markAnnouncementSeen = announcements.markSeen;
  // зачем (владелец 29.10, «Скрывать у Plus»): человеку с Plus реклама Plus (design=plus) не показывается совсем. Статус — из PremiumContext
  // (сначала снимок профиля, потом живой), новых чтений нет; купил Plus — объявление пропадает из кольца сразу.
  const { hasPremiumAccess } = usePremium();
  const forViewer = useMemo(() => announcementsForViewer(announcements.stories, hasPremiumAccess), [announcements.stories, hasPremiumAccess]);
  const hiddenLog = forViewer.hidden.map((item) => `${item.id} (design=${item.design})`).join(', ');
  const unreadableLog = forViewer.unreadable.join(', ');
  useEffect(() => {
    if (hiddenLog) DebugLogger.info('[STORY-EVENTS]', `объявления скрыты: у человека Plus — ${hiddenLog}`);
    if (unreadableLog) DebugLogger.warn('[STORY-EVENTS]', `объявление не разобрано для фильтра Plus — показываем как есть: ${unreadableLog}`);
  }, [hiddenLog, unreadableLog]);
  const stories=useMemo(()=>[...snapshot.stories,...forViewer.visible],[snapshot.stories,forViewer.visible]);
  // зачем: кольцо гаснет мгновенно (память), запись на диск идёт фоном — без ожидания и без спиннера.
  const markSeen = useCallback((id: string) => { if(id.startsWith('announcement:'))markAnnouncementSeen(id);else void markStorySeenInStore(id); }, [markAnnouncementSeen]);
  const playback = useMemo(() => storyPlaybackQueue(stories), [stories]);
  const recent = useMemo(() => storyRecentQueue(stories), [stories]);
  return { enabled: snapshot.enabled, unseenCount: stories.filter(event=>!event.seen).length, stories, playback, recent, markSeen };
}
