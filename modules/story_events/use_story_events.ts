// use_story_events.ts — интерфейс «историй» для Дизайна (D192): кольцо у аватарки на Главной.
// useStoryEvents() → { unseenCount, stories, markSeen }. Первый кадр — из памяти процесса (синхронно), диск догружает фоном.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
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
  // зачем: кольцо гаснет мгновенно (память), запись на диск идёт фоном — без ожидания и без спиннера.
  const markSeen = useCallback((id: string) => { void markStorySeenInStore(id); }, []);
  const playback = useMemo(() => storyPlaybackQueue(snapshot.stories), [snapshot.stories]);
  const recent = useMemo(() => storyRecentQueue(snapshot.stories), [snapshot.stories]);
  return { enabled: snapshot.enabled, unseenCount: snapshot.unseenCount, stories: snapshot.stories, playback, recent, markSeen };
}
