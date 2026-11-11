// use_story_ignore_nudge.ts — «истории игнорируют два дня захода» для кольца аватара: показывать ли волны (владелец 11.11, выбор «Волны»).
// Первый кадр — из памяти процесса: факты ещё не прочитаны → волн нет; чтение диска идёт фоном, сети нет.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useActiveAccountOwner } from '../../hooks/use_active_account_owner';
import { shouldShowStoryIgnoreNudge, storyIgnoreDayKey } from './story_ignore_nudge';
import { noteStoryViewed, noteStoryVisit, peekStoryIgnoreFacts, subscribeStoryIgnoreFacts } from './story_ignore_nudge_store';

export type UseStoryIgnoreNudgeResult = Readonly<{
  /** true — кольцо было два завершённых дня захода подряд, а историю не открыли: усилить сигнал. */
  waves: boolean;
  /** Человек открыл историю — счёт игнора обнуляется сразу. */
  markViewed: () => void;
}>;

export function useStoryIgnoreNudge(hasUnseen: boolean): UseStoryIgnoreNudgeResult {
  const owner = useActiveAccountOwner();
  const peek = useCallback(() => peekStoryIgnoreFacts(owner), [owner]);
  const facts = useSyncExternalStore(subscribeStoryIgnoreFacts, peek, peek);
  // зачем: день захода засчитывается при входе на Главную и когда кольцо появилось позже (истории догрузились с диска) — пометка дня липкая
  useEffect(() => {
    void noteStoryVisit(owner, hasUnseen);
  }, [owner, hasUnseen]);
  const markViewed = useCallback(() => { void noteStoryViewed(owner); }, [owner]);
  const waves = facts !== null && shouldShowStoryIgnoreNudge(facts, { today: storyIgnoreDayKey(Date.now()), hasUnseen });
  return { waves, markViewed };
}
